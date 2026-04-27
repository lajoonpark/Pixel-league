// Game orchestrates state, systems, update loop, and rendering.
import { CONFIG, GAME_STATES } from './config.js';
import { Input } from './input.js';
import { Menu } from './menu.js';
import { Renderer } from './renderer.js';
import { Camera } from './camera.js';
import { Hero } from './entities/Hero.js';
import { Tower } from './entities/Tower.js';
import { Base } from './entities/Base.js';
import { createMap } from './world/map.js';
import { createSpawnSystem } from './systems/spawnSystem.js';
import { movementSystem } from './systems/movementSystem.js';
import { collisionSystem } from './systems/collisionSystem.js';
import { combatSystem, findEnemyNearPoint } from './systems/combatSystem.js';
import { healthSystem } from './systems/healthSystem.js';
import { EffectSystem } from './systems/effectSystem.js';
import { VfxSystem } from './systems/vfxSystem.js';
import { castAbility, updateAbilityCooldowns } from './systems/abilitySystem.js';
import { updateProjectiles } from './systems/projectileSystem.js';
import { TargetingSystem, TARGETING_STATE } from './systems/targetingSystem.js';
import { MobileControls } from './systems/mobileControlsSystem.js';
import { MultiplayerService } from './services/multiplayerService.js';
import { RoomScreen } from './ui/roomScreen.js';

// Pixel colors for each player slot.
const PLAYER_COLORS = { 1: '#4aa8ff', 2: '#ff7a7a' };

// Rate-limit for broadcasting own state (milliseconds between sends ≈ 20 Hz).
const MP_TICK_RATE_MS = 50;

export class Game {
  constructor(canvas, assets = { frames: {}, icons: {} }) {
    this.canvas = canvas;
    this.assets = assets;
    this.map = createMap(CONFIG);
    this.input = new Input();
    this.camera = new Camera(canvas.width, canvas.height, this.map.width, this.map.height);
    this.renderer = new Renderer(canvas, this.camera, CONFIG);
    this.entities = [];
    this.spawnSystem = createSpawnSystem(CONFIG.waves);
    this.effectSystem = new EffectSystem();
    this.vfxSystem = new VfxSystem();
    this.targetingSystem = new TargetingSystem();
    this.lastFrameAt = 0;
    this.fps = 0;
    this.waveCount = 0;
    // Tracks previous-frame pressed state for each ability key to enable
    // fresh-press detection (targeting mode entered once per key-down).
    this.wasAbilityPressed = { Q: false, W: false, E: false, R: false };
    this.wasEscapePressed = false;
    this.wasFPressed = false;
    // Live hero-fired projectiles (Power Shot).  Kept separate from entities.
    this.projectiles = [];
    // Deferred VFX spawns: [{spawnAtMs, type, x, y, frames, options}].
    this.pendingVfxSpawns = [];
    this.state = GAME_STATES.menu;
    this.resultMessage = '';
    // Click marker for visual movement feedback { x, y, spawnMs } or null.
    this.clickMarker = null;

    // Mobile touch controls (attached on play start if device supports touch).
    this.mobileControls = new MobileControls(canvas);

    // ── Multiplayer ─────────────────────────────────────────────────────────
    this.multiplayer = new MultiplayerService();
    // Remote hero: plain object rendered from network state (not in entities[]).
    this.remoteHero = null;
    // Interpolation target position received from the last PLAYER_STATE packet.
    this._remoteHeroTarget = { x: 0, y: 0 };
    // Accumulator (ms) for rate-limited state broadcasts.
    this._mpTickAccum = 0;
    this._setupMultiplayerCallbacks();

    // ── Room UI ─────────────────────────────────────────────────────────────
    this.roomScreen = new RoomScreen(canvas, {
      onJoin: (code) => this._onJoinRoomWithCode(code),
      onBack: () => this._returnToMenu(),
      onStartGame: () => this._onHostStartGame(),
      onDisband: () => this._onHostDisband(),
      onLeave: () => this._onClientLeave(),
    });

    // ── Menu ─────────────────────────────────────────────────────────────────
    this.menu = new Menu(
      canvas,
      () => this._startGame(),
      () => this._onCreateRoom(),
      () => this._onJoinRoom()
    );
  }

  setupWorld() {
    // Build the scene from all tower and base slots defined in the lane.
    const lane = this.map.lanes[0];
    const { x: spawnX, y: spawnY } = this.getAlliedHeroSpawnPoint();
    this.hero = new Hero(spawnX, spawnY, 'blue');
    this.entities.push(this.hero);

    // Create every tower slot (blue-outer, blue-inner, red-inner, red-outer).
    for (const slot of lane.placeholders?.towerSlots ?? []) {
      this.entities.push(new Tower(slot.x, slot.y, slot.team));
    }

    const alliedBaseSlot = lane.placeholders?.baseSlots?.find((slot) => slot.team === 'blue');
    const enemyBaseSlot = lane.placeholders?.baseSlots?.find((slot) => slot.team === 'red');
    if (alliedBaseSlot) {
      this.alliedBase = new Base(
        alliedBaseSlot.x,
        alliedBaseSlot.y,
        alliedBaseSlot.team,
        alliedBaseSlot.width,
        alliedBaseSlot.height
      );
      this.entities.push(this.alliedBase);
    }
    if (enemyBaseSlot) {
      this.enemyBase = new Base(
        enemyBaseSlot.x,
        enemyBaseSlot.y,
        enemyBaseSlot.team,
        enemyBaseSlot.width,
        enemyBaseSlot.height
      );
      this.entities.push(this.enemyBase);
    }
  }

  getAlliedHeroSpawnPoint() {
    const lane = this.map.lanes[0];
    return {
      x: lane.start.x + CONFIG.hero.spawnLaneOffsetX,
      y: lane.start.y,
    };
  }

  // Called once by the Menu's Play button – transitions from menu to playing.
  _startGame() {
    this.menu.detach();
    this.setupWorld();
    this.state = GAME_STATES.playing;
    this.input.attach(this.canvas);
    if (this.mobileControls.isMobile) {
      this.mobileControls.attach();
    }
    this.camera.follow(this.hero);
  }

  // ── Multiplayer: callbacks ─────────────────────────────────────────────────

  _setupMultiplayerCallbacks() {
    const mp = this.multiplayer;

    mp.onPresenceChange = (count, players) => {
      if (
        this.state === GAME_STATES.roomLobbyHost
        || this.state === GAME_STATES.roomLobbyClient
      ) {
        this.roomScreen.updateData({ playerCount: count });
      }
    };

    mp.onRoomDisbanded = (reason) => {
      this.multiplayer.leaveRoom().catch(() => {});
      if (
        this.state === GAME_STATES.roomLobbyClient
        || this.state === GAME_STATES.playingMultiplayer
      ) {
        this._returnToMenu(reason);
      }
    };

    mp.onStartGame = () => {
      if (this.state === GAME_STATES.roomLobbyClient) {
        this._startMultiplayerGame();
      }
    };

    mp.onPlayerState = (payload) => {
      this._onRemotePlayerState(payload);
    };

    mp.onAbilityCast = (payload) => {
      this._onRemoteAbilityCast(payload);
    };

    mp.onBasicAttack = (payload) => {
      this._onRemoteBasicAttack(payload);
    };

    mp.onConnectionError = (err) => {
      console.error('[MP]', err);
      if (this.state === GAME_STATES.roomLobbyHost || this.state === GAME_STATES.roomLobbyClient) {
        this.roomScreen.updateData({ errorMessage: `Connection error: ${err.message}` });
      }
    };
  }

  // ── Multiplayer: menu button handlers ─────────────────────────────────────

  async _onCreateRoom() {
    this.menu.detach();
    this.roomScreen.attach();
    this.roomScreen.setMode('lobbyHost', { roomCode: '……', playerCount: 0 });
    this.state = GAME_STATES.roomLobbyHost;

    try {
      const code = await this.multiplayer.createRoom();
      this.roomScreen.setMode('lobbyHost', { roomCode: code, playerCount: 1 });
    } catch (err) {
      this.roomScreen.updateData({ errorMessage: `Could not create room: ${err.message}` });
    }
  }

  _onJoinRoom() {
    this.menu.detach();
    this.roomScreen.attach();
    this.roomScreen.setMode('joinInput');
    this.state = GAME_STATES.joinRoom;
  }

  async _onJoinRoomWithCode(code) {
    this.roomScreen.updateData({ errorMessage: '', statusMessage: 'Connecting…' });

    try {
      await this.multiplayer.joinRoom(code);
      const count = this.multiplayer.getPlayerCount();
      this.roomScreen.setMode('lobbyClient', { roomCode: code, playerCount: count });
      this.state = GAME_STATES.roomLobbyClient;
    } catch (err) {
      this.roomScreen.updateData({ errorMessage: err.message, statusMessage: '' });
    }
  }

  // ── Multiplayer: room action handlers ─────────────────────────────────────

  async _onHostStartGame() {
    if (this.multiplayer.getPlayerCount() < 2) return;
    try {
      await this.multiplayer.broadcastStartGame();
      this._startMultiplayerGame();
    } catch (err) {
      this.roomScreen.updateData({ errorMessage: `Start failed: ${err.message}` });
    }
  }

  async _onHostDisband() {
    try {
      await this.multiplayer.broadcastRoomDisbanded();
    } catch { /* swallow */ }
    await this.multiplayer.leaveRoom();
    this._returnToMenu();
  }

  async _onClientLeave() {
    await this.multiplayer.leaveRoom();
    this._returnToMenu();
  }

  // ── Multiplayer: game start ───────────────────────────────────────────────

  _startMultiplayerGame() {
    this.roomScreen.detach();

    // Reset all game state.
    this.entities = [];
    this.effectSystem.effects = [];
    this.vfxSystem.effects = [];
    this.projectiles = [];
    this.pendingVfxSpawns = [];
    this.clickMarker = null;
    this.spawnSystem.reset();
    this.waveCount = 0;
    this.resultMessage = '';

    this.setupWorld();

    const mp = this.multiplayer;
    const isHost = mp.isHost;
    const localNumber = mp.myPlayerNumber;  // 1 or 2

    // Set local hero color and position based on player slot.
    this.hero.color = PLAYER_COLORS[localNumber];
    this.hero.team = isHost ? 'blue' : 'red';

    if (!isHost) {
      // Player 2 spawns slightly offset so both heroes aren't stacked.
      const sp = this.getAlliedHeroSpawnPoint();
      this.hero.x = sp.x + 40;
      this.hero.y = sp.y + 20;
    }

    // Create the remote hero object (rendered separately, not in entities[]).
    const remoteNumber = isHost ? 2 : 1;
    this.remoteHero = {
      type: 'hero',
      renderType: 'hero',
      spriteId: 'hero',
      team: remoteNumber === 1 ? 'blue' : 'red',
      color: PLAYER_COLORS[remoteNumber],
      x: this.hero.x + 5,
      y: this.hero.y + 5,
      width: CONFIG.hero.width,
      height: CONFIG.hero.height,
      health: CONFIG.hero.health,
      maxHealth: CONFIG.hero.health,
      alive: true,
      showRangeCircle: false,
      attackAnimPhase: 'idle',
      attackAnimStartMs: 0,
      lastMoveDir: { x: 1, y: 0 },
    };
    this._remoteHeroTarget = { x: this.remoteHero.x, y: this.remoteHero.y };
    this._mpTickAccum = 0;

    this.state = GAME_STATES.playingMultiplayer;
    this.input.attach(this.canvas);
    if (this.mobileControls.isMobile) {
      this.mobileControls.attach();
    }
    this.camera.follow(this.hero);

    this.wasAbilityPressed = { Q: false, W: false, E: false, R: false };
    this.wasEscapePressed = false;
    this.wasFPressed = false;
    this.targetingSystem.cancel();
  }

  // ── Multiplayer: network send helpers ─────────────────────────────────────

  _broadcastPlayerState() {
    const h = this.hero;
    this.multiplayer.broadcastPlayerState({
      x: h.x,
      y: h.y,
      health: h.health,
      maxHealth: h.maxHealth,
      alive: h.alive,
      lastMoveDir: h.lastMoveDir,
      attackAnimPhase: h.attackAnimPhase,
    });
  }

  // ── Multiplayer: receive handlers ─────────────────────────────────────────

  _onRemotePlayerState(payload) {
    if (!this.remoteHero) return;
    // Update interpolation target (smooth movement).
    if (typeof payload.x === 'number') this._remoteHeroTarget.x = payload.x;
    if (typeof payload.y === 'number') this._remoteHeroTarget.y = payload.y;
    if (typeof payload.health === 'number') this.remoteHero.health = payload.health;
    if (typeof payload.maxHealth === 'number') this.remoteHero.maxHealth = payload.maxHealth;
    if (typeof payload.alive === 'boolean') this.remoteHero.alive = payload.alive;
    if (payload.lastMoveDir) this.remoteHero.lastMoveDir = payload.lastMoveDir;
    // Sync attack animation phase for visual feedback.
    if (payload.attackAnimPhase && payload.attackAnimPhase !== this.remoteHero.attackAnimPhase) {
      this.remoteHero.attackAnimPhase = payload.attackAnimPhase;
      if (payload.attackAnimPhase === 'windUp') {
        this.remoteHero.attackAnimStartMs = this.lastFrameAt;
      }
    }
  }

  _onRemoteAbilityCast(payload) {
    if (!this.remoteHero) return;
    const nowMs = this.lastFrameAt;
    const vfxCtx = { vfxSystem: this.vfxSystem, assets: this.assets, nowMs };
    const { abilityKey, originX = this.remoteHero.x, originY = this.remoteHero.y, targetX, targetY } = payload;

    // Spawn visual-only VFX for the remote player's ability — no damage applied.
    if (abilityKey === 'Q') {
      const frames = this.assets?.vfxFrames?.q_slash_arc ?? null;
      this.vfxSystem.spawn('q_slash_arc', originX, originY, nowMs, frames, {
        frameDuration: 70, width: 48, height: 48, color: '#ffe18a',
      });
    } else if (abilityKey === 'W') {
      // Teleport the remote hero to the dash destination visually.
      if (typeof targetX === 'number' && typeof targetY === 'number') {
        this._remoteHeroTarget.x = targetX;
        this._remoteHeroTarget.y = targetY;
      }
    } else if (abilityKey === 'E') {
      const frames = this.assets?.vfxFrames?.e_blast_charge ?? null;
      this.vfxSystem.spawn('e_blast_charge', originX, originY, nowMs, frames, {
        frameDuration: 70, width: 48, height: 48, color: '#44ff88',
      });
    } else if (abilityKey === 'R') {
      const frames = this.assets?.vfxFrames?.r_burst_explosion ?? null;
      const cx = typeof targetX === 'number' ? targetX : originX;
      const cy = typeof targetY === 'number' ? targetY : originY;
      this.vfxSystem.spawn('r_burst_explosion', cx, cy, nowMs, frames, {
        frameDuration: 70, width: 80, height: 80, color: '#ff44ff',
      });
    }
  }

  _onRemoteBasicAttack(payload) {
    if (!this.remoteHero) return;
    const nowMs = this.lastFrameAt;
    const { originX = this.remoteHero.x, originY = this.remoteHero.y } = payload;
    // Trigger the attack animation on the remote hero.
    this.remoteHero.attackAnimPhase = 'windUp';
    this.remoteHero.attackAnimStartMs = nowMs;
    const frames = this.assets?.vfxFrames?.basic_windup ?? null;
    this.vfxSystem.spawn('basic_windup', originX, originY, nowMs, frames, {
      frameDuration: 60, width: 32, height: 32, color: '#ffb833',
    });
  }

  // ── Shared: return to main menu ───────────────────────────────────────────

  _returnToMenu(message = '') {
    // Detach any active room screen.
    if (
      this.state === GAME_STATES.roomLobbyHost
      || this.state === GAME_STATES.roomLobbyClient
      || this.state === GAME_STATES.joinRoom
    ) {
      this.roomScreen.detach();
    }

    // Detach game input if we were playing.
    if (
      this.state === GAME_STATES.playingMultiplayer
      || this.state === GAME_STATES.playing
    ) {
      this.input.detach(this.canvas);
      if (this.mobileControls.isMobile) this.mobileControls.detach();
      // Reset game state.
      this.entities = [];
      this.effectSystem.effects = [];
      this.vfxSystem.effects = [];
      this.projectiles = [];
      this.pendingVfxSpawns = [];
      this.clickMarker = null;
      this.spawnSystem.reset();
      this.waveCount = 0;
      this.resultMessage = '';
      this.remoteHero = null;
    }

    this.state = GAME_STATES.menu;
    this.menu.attach();

    if (message) {
      // Surface the message via the menu's notification field.
      this.menu._notification = message;
      setTimeout(() => { this.menu._notification = ''; }, 5000);
    }
  }

  resetMatch() {
    this.entities = [];
    this.state = GAME_STATES.playing;
    this.resultMessage = '';
    this.spawnSystem.reset();
    this.waveCount = 0;
    this.effectSystem.effects = [];
    this.vfxSystem.effects = [];
    this.projectiles = [];
    this.pendingVfxSpawns = [];
    this.clickMarker = null;
    this.setupWorld();
    this.input.keys.clear();
    this.input._rightClickThisFrame = false;
    this.input._leftClickThisFrame = false;
    this.targetingSystem.cancel();
    this.wasAbilityPressed = { Q: false, W: false, E: false, R: false };
    this.wasEscapePressed = false;
    this.wasFPressed = false;
    this.mobileControls.reset();
    this.camera.follow(this.hero);
  }

  setGameOver(message) {
    if (this.state === GAME_STATES.gameOver) {
      return;
    }
    this.state = GAME_STATES.gameOver;
    this.resultMessage = message;
    for (const entity of this.entities) {
      if (typeof entity.vx === 'number') {
        entity.vx = 0;
      }
      if (typeof entity.vy === 'number') {
        entity.vy = 0;
      }
      if ('target' in entity && entity.alive !== false) {
        entity.target = null;
      }
    }
  }

  checkWinCondition() {
    if (this.enemyBase?.health <= 0) {
      this.setGameOver('Victory!');
      return;
    }
    if (this.alliedBase?.health <= 0) {
      this.setGameOver('Defeat!');
    }
  }

  start() {
    this.menu.attach();
    requestAnimationFrame((timestamp) => {
      this.lastFrameAt = timestamp;
      this.loop(timestamp);
    });
  }

  loop(timestamp) {
    const dtMs = timestamp - this.lastFrameAt;
    this.lastFrameAt = timestamp;
    this.update(dtMs, timestamp);
    this.render(timestamp);
    requestAnimationFrame((nextTimestamp) => this.loop(nextTimestamp));
  }

  update(dtMs, nowMs) {
    if (
      this.state === GAME_STATES.menu
      || this.state === GAME_STATES.joinRoom
      || this.state === GAME_STATES.roomLobbyHost
      || this.state === GAME_STATES.roomLobbyClient
    ) {
      return;
    }

    if (this.state === GAME_STATES.gameOver) {
      if (this.input.isPressed('KeyR')) {
        this.resetMatch();
      }
      return;
    }

    const isMultiplayer = this.state === GAME_STATES.playingMultiplayer;

    const dtSeconds = dtMs / 1000;
    this.fps = dtMs > 0 ? (1000 / dtMs) : 0;

    // Convert current mouse screen position to world coordinates.
    const mouseWorldX = this.input.mouseX + this.camera.x;
    const mouseWorldY = this.input.mouseY + this.camera.y;

    // ── Escape / F: cancel targeting mode ───────────────────────────────────
    const escapePressed = this.input.isPressed('Escape');
    if (escapePressed && !this.wasEscapePressed) {
      this.targetingSystem.cancel();
    }
    this.wasEscapePressed = escapePressed;

    const fPressed = this.input.isPressed('KeyF');
    if (fPressed && !this.wasFPressed) {
      this.targetingSystem.cancel();
    }
    this.wasFPressed = fPressed;

    // ── Ability key presses: enter targeting mode ─────────────────────────────
    const ABILITY_KEY_CODES = [
      ['Q', 'KeyQ'],
      ['W', 'KeyW'],
      ['E', 'KeyE'],
      ['R', 'KeyR'],
    ];
    for (const [key, code] of ABILITY_KEY_CODES) {
      const pressed = this.input.isPressed(code);
      if (pressed && !this.wasAbilityPressed[key] && this.hero.alive) {
        this.targetingSystem.selectAbility(key);
      }
      this.wasAbilityPressed[key] = pressed;
    }

    // ── Mobile touch controls ─────────────────────────────────────────────────
    if (this.mobileControls.isMobile && this.hero.alive) {
      // Cancel via cancel-zone gesture.
      if (this.mobileControls.cancelRequested) {
        this.targetingSystem.cancel();
      }

      // Ability button pressed: enter targeting mode for that ability.
      const activatedKey = this.mobileControls.abilityJustActivated;
      if (activatedKey) {
        const ability = this.hero.abilities?.find((a) => a.key === activatedKey);
        if (ability && ability.currentCooldown <= 0) {
          this.targetingSystem.selectAbility(activatedKey);
        }
      }

      // Ability button released: cast at the aimed world position.
      const releasedKey = this.mobileControls.abilityJustReleased;
      if (releasedKey) {
        const selectedKey = this.targetingSystem.getSelectedKey();
        if (selectedKey === releasedKey) {
          const ap = this.mobileControls.aimPosition;
          let targetPoint = null;
          if (ap) {
            targetPoint = { x: ap.x + this.camera.x, y: ap.y + this.camera.y };
          }
          const vfxCtx = { vfxSystem: this.vfxSystem, assets: this.assets, nowMs };
          const castOk = castAbility(this.hero, releasedKey, this.entities, this.projectiles, vfxCtx, targetPoint);
          if (castOk && isMultiplayer) {
            this.multiplayer.broadcastAbilityCast(
              releasedKey,
              this.hero.x, this.hero.y,
              targetPoint?.x ?? this.hero.x, targetPoint?.y ?? this.hero.y
            );
          }
          this.targetingSystem.cancel();
        }
      }

      // Attack button tapped: find nearest enemy within a comfortable radius.
      // The search extends beyond the hero's attack range so the hero will walk
      // to nearby enemies automatically (same behaviour as desktop click-to-attack).
      if (this.mobileControls.attackRequested) {
        const MOBILE_ATTACK_SEARCH_EXTENSION = 120; // world-px buffer added to attack range
        const MOBILE_ATK_SEARCH = this.hero.attackRange + MOBILE_ATTACK_SEARCH_EXTENSION;
        const enemy = findEnemyNearPoint(
          this.entities, this.hero.x, this.hero.y, MOBILE_ATK_SEARCH, this.hero.team
        );
        if (enemy) {
          const dx = enemy.x - this.hero.x;
          const dy = enemy.y - this.hero.y;
          const distSq = dx * dx + dy * dy;
          const rangeSq = this.hero.attackRange * this.hero.attackRange;
          if (distSq <= rangeSq) {
            this._triggerBasicAttack(nowMs);
          } else {
            this.hero.targetPosition = { x: enemy.x, y: enemy.y };
            this.hero.pendingAttackTarget = enemy;
          }
        }
      }
    }

    // ── Right click: move (does NOT cancel ability targeting) ────────────────
    if (this.hero.alive && this.input.consumeRightClick()) {
      const hw = this.hero.width / 2;
      const hh = this.hero.height / 2;
      const clampedX = Math.max(this.map.x + hw, Math.min(this.map.x + this.map.width - hw, mouseWorldX));
      const clampedY = Math.max(this.map.y + hh, Math.min(this.map.y + this.map.height - hh, mouseWorldY));
      this.hero.targetPosition = { x: clampedX, y: clampedY };
      this.hero.pendingAttackTarget = null;
      this.clickMarker = { x: clampedX, y: clampedY, spawnMs: nowMs };
    }

    // ── Left click: cast ability or basic attack ──────────────────────────────
    if (this.hero.alive && this.input.consumeLeftClick()) {
      const selectedKey = this.targetingSystem.getSelectedKey();

      if (selectedKey) {
        // ── Cast selected ability toward mouse position ────────────────────
        const targetPoint = { x: mouseWorldX, y: mouseWorldY };
        const vfxCtx = { vfxSystem: this.vfxSystem, assets: this.assets, nowMs };
        const success = castAbility(this.hero, selectedKey, this.entities, this.projectiles, vfxCtx, targetPoint);
        if (success) {
          // Cancel targeting mode after a successful cast.
          this.targetingSystem.cancel();
          if (isMultiplayer) {
            this.multiplayer.broadcastAbilityCast(
              selectedKey,
              this.hero.x, this.hero.y,
              targetPoint.x, targetPoint.y
            );
          }
        }
        // If cast fails (e.g. cooldown or out of range for R), keep targeting mode active.
      } else {
        // ── Basic attack: find nearest enemy near click point ─────────────
        const CLICK_SEARCH_RADIUS = 32; // world-space pixels to search around click
        const enemy = findEnemyNearPoint(this.entities, mouseWorldX, mouseWorldY, CLICK_SEARCH_RADIUS, this.hero.team);
        if (enemy) {
          const dx = enemy.x - this.hero.x;
          const dy = enemy.y - this.hero.y;
          const distSq = dx * dx + dy * dy;
          const attackRangeSq = this.hero.attackRange * this.hero.attackRange;

          if (distSq <= attackRangeSq) {
            // In range: trigger basic attack immediately.
            this._triggerBasicAttack(nowMs, isMultiplayer);
          } else {
            // Out of range: move toward the enemy and mark as pending attack target.
            this.hero.targetPosition = { x: enemy.x, y: enemy.y };
            this.hero.pendingAttackTarget = enemy;
          }
        }
      }
    }

    this.updateHeroVelocity();

    // ── Pending attack target: attack when hero reaches attack range ──────────
    if (this.hero.alive && this.hero.pendingAttackTarget) {
      const target = this.hero.pendingAttackTarget;
      if (!target.alive || target.health <= 0) {
        this.hero.pendingAttackTarget = null;
      } else {
        const dx = target.x - this.hero.x;
        const dy = target.y - this.hero.y;
        const distSq = dx * dx + dy * dy;
        if (distSq <= this.hero.attackRange * this.hero.attackRange) {
          this.hero.pendingAttackTarget = null;
          this.hero.targetPosition = null;
          this._triggerBasicAttack(nowMs, isMultiplayer);
        }
      }
    }

    // Show the hero's attack-range circle while any targeting mode is active or
    // while the hero has a pending attack target.
    this.hero.showRangeCircle = this.hero.alive
      && (this.targetingSystem.isTargeting() || Boolean(this.hero.pendingAttackTarget));

    // Tick ability cooldowns every frame (even while dead so they drain naturally).
    updateAbilityCooldowns(this.hero, dtSeconds);

    this.spawnSystem.update(this, dtMs);
    this.waveCount = this.spawnSystem.getWaveCount();
    combatSystem(this.entities, nowMs);
    // Advance hero-fired projectiles and resolve their collisions with entities.
    updateProjectiles(this.projectiles, this.entities, dtSeconds, nowMs);
    // Spawn the hit spark immediately when the hero's attack lands.
    if (this.hero.pendingHitTarget) {
      const target = this.hero.pendingHitTarget;
      this.hero.pendingHitTarget = null;
      const anim = CONFIG.attackAnim;
      this.effectSystem.spawn('hitSpark', target.x, target.y, nowMs, {
        durationMs: anim.sparkDurationMs,
        rayCount: anim.sparkRayCount,
        maxRadius: anim.sparkMaxRadius,
        pixelSize: anim.sparkPixelSize,
        colors: anim.sparkColors,
      });
      // Sprite-frame hit spark overlaid on the procedural effect.
      const hitFrames = this.assets?.vfxFrames?.basic_hit ?? null;
      this.vfxSystem.spawn('basic_hit', target.x, target.y, nowMs, hitFrames, {
        frameDuration: 70,
        width: 32,
        height: 32,
        color: '#ffb833',
      });
    }
    // Spawn energy-blast projectiles for towers and bases that just fired.
    const blastCfg = CONFIG.energyBlast;
    for (const entity of this.entities) {
      if (!entity.pendingBlastTarget) { continue; }
      const tgt = entity.pendingBlastTarget;
      entity.pendingBlastTarget = null;
      const dx = tgt.x - entity.x;
      const dy = tgt.y - entity.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 1) { continue; }
      const durationMs = (dist / blastCfg.speedPxPerSec) * 1000;

      // Spawn tower charge VFX at the firing structure.
      const chargeFrames = this.assets?.vfxFrames?.tower_charge ?? null;
      this.vfxSystem.spawn('tower_charge', entity.x, entity.y, nowMs, chargeFrames, {
        frameDuration: 80,
        width: 48,
        height: 48,
        color: '#28d7ff',
      });

      // Procedural comet effect (always shown; acts as fallback for the projectile).
      this.effectSystem.spawn('energyBlast', entity.x, entity.y, nowMs, {
        durationMs,
        toX: tgt.x,
        toY: tgt.y,
        team: entity.team,
      });

      // Visual-only sprite projectile that travels to the target.
      const projFrames = this.assets?.vfxFrames?.tower_projectile ?? null;
      const speed = blastCfg.speedPxPerSec;
      this.projectiles.push({
        alive: true,
        x: entity.x,
        y: entity.y,
        vx: (dx / dist) * speed,
        vy: (dy / dist) * speed,
        team: entity.team,
        damage: 0,
        width: 48,
        height: 48,
        maxTravelDistance: dist,
        traveledDistance: 0,
        skipCollision: true,
        rotation: Math.atan2(dy, dx),
        color: '#28d7ff',
        animFrames: projFrames,
        animFrameDuration: 80,
        animStartMs: nowMs,
        onHit: null,
      });

      // Schedule tower_impact VFX to arrive at the target when the blast lands.
      const impactFrames = this.assets?.vfxFrames?.tower_impact ?? null;
      this.pendingVfxSpawns.push({
        spawnAtMs: nowMs + durationMs,
        type: 'tower_impact',
        x: tgt.x,
        y: tgt.y,
        frames: impactFrames,
        options: { frameDuration: 70, width: 48, height: 48, color: '#28d7ff' },
      });
    }
    this._advanceHeroAttackAnim(nowMs);
    this._processPendingVfx(nowMs);
    this.effectSystem.update(nowMs);
    this.vfxSystem.update(nowMs);
    movementSystem(this.entities, this.map, dtSeconds);
    collisionSystem(this.entities, this.map);
    healthSystem(this.entities, nowMs);
    this.updateHeroRespawn(nowMs);
    this.applyBaseProximityHeal();
    this.checkWinCondition();
    this.camera.follow(this.hero);

    // ── Multiplayer: remote hero interpolation + state broadcast ─────────────
    if (isMultiplayer) {
      // Lerp remote hero toward the last received network position (≈20 Hz).
      if (this.remoteHero) {
        const LERP = 0.15;
        this.remoteHero.x += (this._remoteHeroTarget.x - this.remoteHero.x) * LERP;
        this.remoteHero.y += (this._remoteHeroTarget.y - this.remoteHero.y) * LERP;
      }
      // Rate-limited state broadcast.
      this._mpTickAccum += dtMs;
      if (this._mpTickAccum >= MP_TICK_RATE_MS) {
        this._mpTickAccum -= MP_TICK_RATE_MS;
        this._broadcastPlayerState();
      }
    }
  }

  updateHeroVelocity() {
    if (!this.hero.alive) {
      this.hero.vx = 0;
      this.hero.vy = 0;
      this.hero.targetPosition = null;
      this.hero.isAttackRequested = false;
      this.hero.pendingAttackTarget = null;
      return;
    }

    // ── Mobile joystick movement takes priority over click-to-move ────────────
    const joystickDir = this.mobileControls?.joystickDir;
    if (joystickDir) {
      const speed = this.hero.moveSpeed ?? CONFIG.hero.moveSpeed;
      this.hero.vx = joystickDir.x * speed;
      this.hero.vy = joystickDir.y * speed;
      // Keep lastMoveDir updated so abilities aim in the joystick direction.
      this.hero.lastMoveDir = { x: joystickDir.x, y: joystickDir.y };
      // Clear any pending click-to-move target so they don't conflict.
      this.hero.targetPosition = null;
      return;
    }

    // ── Desktop click-to-move ─────────────────────────────────────────────────
    const target = this.hero.targetPosition;
    if (!target) {
      this.hero.vx = 0;
      this.hero.vy = 0;
      return;
    }

    const dx = target.x - this.hero.x;
    const dy = target.y - this.hero.y;
    const dist = Math.hypot(dx, dy);

    // Stop when close enough to the target.
    if (dist <= 3) {
      this.hero.vx = 0;
      this.hero.vy = 0;
      this.hero.targetPosition = null;
      return;
    }

    const speed = this.hero.moveSpeed ?? CONFIG.hero.moveSpeed;
    const normalX = dx / dist;
    const normalY = dy / dist;
    this.hero.vx = normalX * speed;
    this.hero.vy = normalY * speed;
    // Persist direction so Dash and Power Shot can reference it.
    this.hero.lastMoveDir = { x: normalX, y: normalY };
  }

  // Trigger the hero's basic attack animation and set isAttackRequested.
  // When isMultiplayer is true, also broadcasts the event to the remote player.
  _triggerBasicAttack(nowMs, isMultiplayer = false) {
    const hero = this.hero;
    hero.isAttackRequested = true;
    hero.attackAnimPhase = 'windUp';
    hero.attackAnimStartMs = nowMs;
    const windupFrames = this.assets?.vfxFrames?.basic_windup ?? null;
    this.vfxSystem.spawn('basic_windup', hero.x, hero.y, nowMs, windupFrames, {
      frameDuration: 60,
      width: 32,
      height: 32,
      color: '#ffb833',
    });
    if (isMultiplayer) {
      this.multiplayer.broadcastBasicAttack(
        hero.x, hero.y,
        hero.lastMoveDir?.x ?? 1, hero.lastMoveDir?.y ?? 0
      );
    }
  }

  // Instantly restores the hero to full health when they are standing near the
  // allied base.  Only applies to a living hero with missing health.
  applyBaseProximityHeal() {
    if (
      !this.hero.alive
      || this.hero.health >= this.hero.maxHealth
      || !this.alliedBase?.alive
      || this.alliedBase.health <= 0
    ) {
      return;
    }
    const dx = this.hero.x - this.alliedBase.x;
    const dy = this.hero.y - this.alliedBase.y;
    const healRadius = CONFIG.base.healRadius;
    if (dx * dx + dy * dy <= healRadius * healRadius) {
      this.hero.health = this.hero.maxHealth;
    }
  }

  updateHeroRespawn(nowMs) {
    if (this.hero.alive) {
      return;
    }

    if (!this.hero.respawnAtMs) {
      this.hero.respawnAtMs = nowMs + CONFIG.hero.respawnDelayMs;
      return;
    }

    if (nowMs < this.hero.respawnAtMs) {
      return;
    }

    const spawnPoint = this.getAlliedHeroSpawnPoint();
    this.hero.x = spawnPoint.x;
    this.hero.y = spawnPoint.y;
    this.hero.vx = 0;
    this.hero.vy = 0;
    this.hero.health = this.hero.maxHealth;
    this.hero.alive = true;
    this.hero.target = null;
    this.hero.targetPosition = null;
    this.hero.isAttackRequested = false;
    this.hero.pendingAttackTarget = null;
    this.hero.respawnAtMs = 0;
    this.hero.attackAnimPhase = 'idle';
    this.hero.attackAnimStartMs = 0;
    this.hero.pendingHitTarget = null;
    // Clear stale held-key flags so abilities don't auto-fire on respawn.
    this.wasAbilityPressed = { Q: false, W: false, E: false, R: false };
    this.wasEscapePressed = false;
    this.wasFPressed = false;
    this.targetingSystem.cancel();
  }

  // Advance the hero's attack-animation phase based on elapsed time and spawn
  // the slash-arc crescent + optional hit-spark when the swing connects.
  _advanceHeroAttackAnim(nowMs) {
    const hero = this.hero;
    if (hero.attackAnimPhase === 'idle') { return; }

    const anim = CONFIG.attackAnim;
    const elapsed = nowMs - hero.attackAnimStartMs;
    const windUpEnd = anim.windUpMs;
    const swingEnd = windUpEnd + anim.swingMs;
    const followThroughEnd = swingEnd + anim.followThroughMs;
    const returnEnd = followThroughEnd + anim.returnMs;

    if (hero.attackAnimPhase === 'windUp' && elapsed >= windUpEnd) {
      hero.attackAnimPhase = 'swing';
    } else if (hero.attackAnimPhase === 'swing' && elapsed >= swingEnd) {
      hero.attackAnimPhase = 'followThrough';
      // Spawn procedural slash-arc crescent centred on the hero.
      this.effectSystem.spawn('slashArc', hero.x, hero.y, nowMs, {
        durationMs: anim.slashArcDurationMs,
        arcRadiusStart: anim.arcRadiusStart,
        arcRadiusEnd: anim.arcRadiusEnd,
      });
      // Sprite-frame slash overlaid on the procedural arc.
      const slashFrames = this.assets?.vfxFrames?.basic_slash ?? null;
      const dir = hero.lastMoveDir ?? { x: 1, y: 0 };
      const slashX = hero.x + dir.x * 16;
      const slashY = hero.y + dir.y * 16;
      this.vfxSystem.spawn('basic_slash', slashX, slashY, nowMs, slashFrames, {
        frameDuration: 70,
        width: 48,
        height: 48,
        color: '#ffe18a',
      });
    } else if (hero.attackAnimPhase === 'followThrough' && elapsed >= followThroughEnd) {
      hero.attackAnimPhase = 'return';
    } else if (hero.attackAnimPhase === 'return' && elapsed >= returnEnd) {
      hero.attackAnimPhase = 'idle';
    }
  }

  // Fire any VFX spawns whose scheduled time has arrived.  Spawns are removed
  // after triggering so the array stays compact.
  _processPendingVfx(nowMs) {
    this.pendingVfxSpawns = this.pendingVfxSpawns.filter((pv) => {
      if (nowMs >= pv.spawnAtMs) {
        this.vfxSystem.spawn(pv.type, pv.x, pv.y, nowMs, pv.frames, pv.options);
        return false;
      }
      return true;
    });
  }

  render(nowMs) {
    if (this.state === GAME_STATES.menu) {
      this.menu.render();
      return;
    }

    if (
      this.state === GAME_STATES.joinRoom
      || this.state === GAME_STATES.roomLobbyHost
      || this.state === GAME_STATES.roomLobbyClient
    ) {
      this.roomScreen.render();
      return;
    }

    this.renderer.clear();
    this.renderer.drawMap(this.map);

    // Store nowMs on the renderer so drawEntity/drawHeroSword can read it
    // without changing every call signature.
    this.renderer.nowMs = nowMs;

    for (const entity of this.entities) {
      this.renderer.drawEntity(entity);
      this.renderer.drawHealthBar(entity);
    }

    // Draw remote hero in multiplayer mode (separate from entities[]).
    if (this.state === GAME_STATES.playingMultiplayer && this.remoteHero) {
      this.renderer.drawEntity(this.remoteHero);
      this.renderer.drawHealthBar(this.remoteHero);
    }

    for (const effect of this.effectSystem.effects) {
      this.renderer.drawEffect(effect);
    }

    // Draw sprite-frame VFX ability effects (above world, below projectiles).
    this.renderer.drawVfxEffects(this.vfxSystem.effects);

    // Draw hero-fired projectiles on top of effects but below the HUD.
    this.renderer.drawProjectiles(this.projectiles);

    // Draw targeting range/preview indicators above the world layer.
    // On mobile, use the current aim touch position instead of the mouse.
    if (this.hero.alive) {
      let aimWorldX, aimWorldY;
      const mobileAim = this.mobileControls.isMobile
        ? this.mobileControls.aimPosition
        : null;
      if (mobileAim) {
        aimWorldX = mobileAim.x + this.camera.x;
        aimWorldY = mobileAim.y + this.camera.y;
      } else {
        aimWorldX = this.input.mouseX + this.camera.x;
        aimWorldY = this.input.mouseY + this.camera.y;
      }
      this.renderer.drawTargetingOverlay(
        this.hero,
        this.targetingSystem.state,
        this.hero.abilities,
        aimWorldX,
        aimWorldY
      );
    }

    // Draw click-to-move marker (fades over 500ms).
    if (this.clickMarker) {
      const MARKER_DURATION_MS = 500;
      const elapsed = nowMs - this.clickMarker.spawnMs;
      if (elapsed < MARKER_DURATION_MS) {
        this.renderer.drawClickMarker(
          this.clickMarker.x,
          this.clickMarker.y,
          1 - elapsed / MARKER_DURATION_MS
        );
      } else {
        this.clickMarker = null;
      }
    }

    // ── HUD text (desktop-style controls, hidden on touch devices) ───────────
    const selectedKey = this.targetingSystem.getSelectedKey();
    const isMultiplayer = this.state === GAME_STATES.playingMultiplayer;
    if (!this.mobileControls.isMobile) {
      this.renderer.drawText('Move: Right Click  |  Attack: Left Click  |  Q/W/E/R = Ability  |  F/Esc = Cancel', 12, 24);
      if (selectedKey) {
        this.renderer.drawText(
          `Targeting: ${selectedKey} — Click to cast, F/Esc to cancel  (Right-click moves)`,
          12,
          40,
          { font: CONFIG.ui.font, color: '#ffdc3c' }
        );
      } else {
        this.renderer.drawText('Q / W / E / R = Select ability  |  F / Esc = Cancel ability', 12, 40);
      }
      this.renderer.drawText('Restart: R (after match ends)', 12, 56);
      this.renderer.drawText(`Entities: ${this.entities.length}`, 12, 72);
      this.renderer.drawText(
        `Hero: ${this.hero.x.toFixed(1)}, ${this.hero.y.toFixed(1)}  FPS: ${this.fps.toFixed(0)}`,
        12,
        88,
        { font: CONFIG.ui.smallFont, color: CONFIG.ui.secondaryColor }
      );
      if (isMultiplayer) {
        const slot = this.multiplayer.myPlayerNumber === 1 ? 'P1 (Blue)' : 'P2 (Red)';
        this.renderer.drawText(
          `Multiplayer — ${slot}  |  Room: ${this.multiplayer.roomCode}`,
          12,
          104,
          { font: CONFIG.ui.smallFont, color: '#7dd6a8' }
        );
      }
      if (!this.hero.alive) {
        const remainingRespawnMs = Math.max(0, this.hero.respawnAtMs - this.lastFrameAt);
        this.renderer.drawText(
          `Hero Respawn: ${(remainingRespawnMs / 1000).toFixed(1)}s`,
          12,
          isMultiplayer ? 120 : 104,
          { font: CONFIG.ui.smallFont, color: CONFIG.ui.warningColor }
        );
      }
    } else {
      // On mobile show a minimal respawn timer if the hero is dead.
      if (!this.hero.alive) {
        const remainingRespawnMs = Math.max(0, this.hero.respawnAtMs - this.lastFrameAt);
        this.renderer.drawText(
          `Respawning in ${(remainingRespawnMs / 1000).toFixed(1)}s`,
          this.canvas.width / 2 - 80,
          100,
          { font: CONFIG.ui.font, color: CONFIG.ui.warningColor }
        );
      }
    }

    // Ability HUD: desktop slot-bar on non-mobile; mobile button overlay on touch devices.
    if (this.mobileControls.isMobile) {
      this.renderer.drawMobileHUD(this.mobileControls, this.hero, selectedKey);
    } else {
      this.renderer.drawAbilityHUD(this.hero, this.assets?.icons, selectedKey);
    }

    if (this.state === GAME_STATES.gameOver) {
      this.renderer.drawCenteredOverlay(this.resultMessage, 'Press R to restart');
    }
  }
}
