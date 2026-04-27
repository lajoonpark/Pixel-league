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
import { combatSystem } from './systems/combatSystem.js';
import { healthSystem } from './systems/healthSystem.js';
import { EffectSystem } from './systems/effectSystem.js';
import { castAbility, updateAbilityCooldowns } from './systems/abilitySystem.js';
import { updateProjectiles } from './systems/projectileSystem.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.map = createMap(CONFIG);
    this.input = new Input();
    this.camera = new Camera(canvas.width, canvas.height, this.map.width, this.map.height);
    this.renderer = new Renderer(canvas, this.camera, CONFIG);
    this.entities = [];
    this.spawnSystem = createSpawnSystem(CONFIG.waves);
    this.effectSystem = new EffectSystem();
    this.lastFrameAt = 0;
    this.fps = 0;
    this.waveCount = 0;
    this.wasAttackPressed = false;
    // Tracks previous-frame pressed state for each ability key to enable
    // fresh-press detection (cast fires once per key-down, not while held).
    this.wasAbilityPressed = { Q: false, F: false, E: false, R: false };
    // Live hero-fired projectiles (Power Shot).  Kept separate from entities.
    this.projectiles = [];
    this.state = GAME_STATES.menu;
    this.resultMessage = '';

    this.menu = new Menu(canvas, () => this._startGame());
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
    this.input.attach();
    this.camera.follow(this.hero);
  }

  resetMatch() {
    this.entities = [];
    this.state = GAME_STATES.playing;
    this.resultMessage = '';
    this.spawnSystem.reset();
    this.waveCount = 0;
    this.effectSystem.effects = [];
    this.projectiles = [];
    this.setupWorld();
    this.input.keys.clear();
    this.wasAttackPressed = false;
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
    if (this.state === GAME_STATES.menu) {
      return;
    }

    if (this.state === GAME_STATES.gameOver) {
      if (this.input.isPressed('KeyR')) {
        this.resetMatch();
      }
      return;
    }

    const dtSeconds = dtMs / 1000;
    this.fps = dtMs > 0 ? (1000 / dtMs) : 0;
    this.updateHeroVelocity();
    const attackPressed = this.input.isAttackPressed();
    if (this.hero.alive && attackPressed && !this.wasAttackPressed) {
      this.hero.isAttackRequested = true;
      // Start the diagonal sword animation.
      this.hero.attackAnimPhase = 'windUp';
      this.hero.attackAnimStartMs = nowMs;
    }
    this.wasAttackPressed = attackPressed;

    // Show the hero's attack-range circle while Space is held.
    this.hero.showRangeCircle = this.hero.alive && attackPressed;

    // Tick ability cooldowns every frame (even while dead so they drain naturally).
    updateAbilityCooldowns(this.hero, dtSeconds);

    // Detect fresh ability key presses and attempt to cast.  Each key is only
    // triggered on the frame the key transitions from up → down so holding a
    // key never re-fires the ability.
    const ABILITY_KEY_CODES = [
      ['Q', 'KeyQ'],
      ['F', 'KeyF'],
      ['E', 'KeyE'],
      ['R', 'KeyR'],
    ];
    for (const [key, code] of ABILITY_KEY_CODES) {
      const pressed = this.input.isPressed(code);
      if (pressed && !this.wasAbilityPressed[key]) {
        castAbility(this.hero, key, this.entities, this.projectiles);
      }
      this.wasAbilityPressed[key] = pressed;
    }

    this.spawnSystem.update(this, dtMs);
    this.waveCount = this.spawnSystem.getWaveCount();
    combatSystem(this.entities, nowMs);
    // Advance hero-fired projectiles and resolve their collisions with entities.
    updateProjectiles(this.projectiles, this.entities, dtSeconds);
    // Spawn the hit spark immediately when the hero's attack lands, regardless
    // of animation phase, so spamming space never drops the visual feedback.
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
      this.effectSystem.spawn('energyBlast', entity.x, entity.y, nowMs, {
        durationMs,
        toX: tgt.x,
        toY: tgt.y,
        team: entity.team,
      });
    }
    this._advanceHeroAttackAnim(nowMs);
    this.effectSystem.update(nowMs);
    movementSystem(this.entities, this.map, dtSeconds);
    collisionSystem(this.entities, this.map);
    healthSystem(this.entities, nowMs);
    this.updateHeroRespawn(nowMs);
    this.applyBaseProximityHeal();
    this.checkWinCondition();
    this.camera.follow(this.hero);
  }

  updateHeroVelocity() {
    if (!this.hero.alive) {
      this.hero.vx = 0;
      this.hero.vy = 0;
      this.hero.isAttackRequested = false;
      return;
    }

    const speed = this.hero.moveSpeed ?? CONFIG.hero.moveSpeed;
    const move = this.input.getMoveIntent();
    const magnitude = Math.hypot(move.x, move.y);
    if (magnitude === 0) {
      this.hero.vx = 0;
      this.hero.vy = 0;
      return;
    }

    const normalX = move.x / magnitude;
    const normalY = move.y / magnitude;
    this.hero.vx = normalX * speed;
    this.hero.vy = normalY * speed;
    // Persist direction so Dash and Power Shot can reference it even when idle.
    this.hero.lastMoveDir = { x: normalX, y: normalY };
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
    this.hero.isAttackRequested = false;
    this.hero.respawnAtMs = 0;
    this.hero.attackAnimPhase = 'idle';
    this.hero.attackAnimStartMs = 0;
    this.hero.pendingHitTarget = null;
    // Clear stale held-key flags so abilities don't auto-fire on respawn.
    this.wasAbilityPressed = { Q: false, F: false, E: false, R: false };
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
      // Spawn slash-arc crescent centred on the hero.
      this.effectSystem.spawn('slashArc', hero.x, hero.y, nowMs, {
        durationMs: anim.slashArcDurationMs,
        arcRadiusStart: anim.arcRadiusStart,
        arcRadiusEnd: anim.arcRadiusEnd,
      });
    } else if (hero.attackAnimPhase === 'followThrough' && elapsed >= followThroughEnd) {
      hero.attackAnimPhase = 'return';
    } else if (hero.attackAnimPhase === 'return' && elapsed >= returnEnd) {
      hero.attackAnimPhase = 'idle';
    }
  }

  render(nowMs) {
    if (this.state === GAME_STATES.menu) {
      this.menu.render();
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

    for (const effect of this.effectSystem.effects) {
      this.renderer.drawEffect(effect);
    }

    // Draw hero-fired projectiles on top of effects but below the HUD.
    this.renderer.drawProjectiles(this.projectiles);

    this.renderer.drawText('Move hero: WASD / Arrow Keys', 12, 24);
    this.renderer.drawText('Attack: Space', 12, 40);
    this.renderer.drawText('Abilities: Q / F / E / R', 12, 56);
    this.renderer.drawText('Restart: R (after match ends)', 12, 72);
    this.renderer.drawText(`Entities: ${this.entities.length}`, 12, 88);
    this.renderer.drawText(
      `Hero: ${this.hero.x.toFixed(1)}, ${this.hero.y.toFixed(1)}  FPS: ${this.fps.toFixed(0)}`,
      12,
      104,
      { font: CONFIG.ui.smallFont, color: CONFIG.ui.secondaryColor }
    );
    if (!this.hero.alive) {
      const remainingRespawnMs = Math.max(0, this.hero.respawnAtMs - this.lastFrameAt);
      this.renderer.drawText(
        `Hero Respawn: ${(remainingRespawnMs / 1000).toFixed(1)}s`,
        12,
        120,
        { font: CONFIG.ui.smallFont, color: CONFIG.ui.warningColor }
      );
    }

    // Ability HUD drawn last so it sits on top of everything.
    this.renderer.drawAbilityHUD(this.hero);

    if (this.state === GAME_STATES.gameOver) {
      this.renderer.drawCenteredOverlay(this.resultMessage, 'Press R to restart');
    }
  }
}
