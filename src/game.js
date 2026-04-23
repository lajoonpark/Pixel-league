// Game orchestrates state, systems, update loop, and rendering.
import { CONFIG, GAME_STATES } from './config.js';
import { Input } from './input.js';
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

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.map = createMap(CONFIG);
    this.input = new Input();
    this.camera = new Camera(canvas.width, canvas.height, this.map.width, this.map.height);
    this.renderer = new Renderer(canvas, this.camera, CONFIG);
    this.entities = [];
    this.spawnSystem = createSpawnSystem(CONFIG.waves);
    this.lastFrameAt = 0;
    this.fps = 0;
    this.waveCount = 0;
    this.wasAttackPressed = false;
    this.state = GAME_STATES.playing;
    this.resultMessage = '';

    this.setupWorld();
  }

  setupWorld() {
    // First playable scene: one hero and one tower per side on the lane.
    const lane = this.map.lanes[0];
    const { x: spawnX, y: spawnY } = this.getAlliedHeroSpawnPoint();
    this.hero = new Hero(spawnX, spawnY, 'blue');
    this.entities.push(this.hero);

    const alliedTowerSlot = lane.placeholders?.towerSlots?.find((slot) => slot.team === 'blue');
    const enemyTowerSlot = lane.placeholders?.towerSlots?.find((slot) => slot.team === 'red');

    if (alliedTowerSlot) {
      this.entities.push(new Tower(alliedTowerSlot.x, alliedTowerSlot.y, alliedTowerSlot.team));
    }
    if (enemyTowerSlot) {
      this.entities.push(new Tower(enemyTowerSlot.x, enemyTowerSlot.y, enemyTowerSlot.team));
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

  resetMatch() {
    this.hero = null;
    this.alliedBase = null;
    this.enemyBase = null;
    this.entities = [];
    this.state = GAME_STATES.playing;
    this.resultMessage = '';
    this.spawnSystem = createSpawnSystem(CONFIG.waves);
    this.waveCount = 0;
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
      if ('target' in entity) {
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
    this.input.attach();
    requestAnimationFrame((timestamp) => {
      this.lastFrameAt = timestamp;
      this.loop(timestamp);
    });
  }

  loop(timestamp) {
    const dtMs = timestamp - this.lastFrameAt;
    this.lastFrameAt = timestamp;
    this.update(dtMs, timestamp);
    this.render();
    requestAnimationFrame((nextTimestamp) => this.loop(nextTimestamp));
  }

  update(dtMs, nowMs) {
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
    }
    this.wasAttackPressed = attackPressed;
    this.spawnSystem.update(this, dtMs);
    this.waveCount = this.spawnSystem.getWaveCount();
    combatSystem(this.entities, nowMs);
    movementSystem(this.entities, this.map, dtSeconds);
    collisionSystem(this.entities, this.map);
    healthSystem(this.entities, nowMs);
    this.updateHeroRespawn(nowMs);
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

    this.hero.vx = (move.x / magnitude) * speed;
    this.hero.vy = (move.y / magnitude) * speed;
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
  }

  render() {
    this.renderer.clear();
    this.renderer.drawMap(this.map);

    for (const entity of this.entities) {
      this.renderer.drawEntity(entity);
      this.renderer.drawHealthBar(entity);
    }

    this.renderer.drawText('Move hero: WASD / Arrow Keys', 12, 24);
    this.renderer.drawText('Attack: Space', 12, 40);
    this.renderer.drawText('Restart: R (after match ends)', 12, 56);
    this.renderer.drawText(`Entities: ${this.entities.length}`, 12, 72);
    this.renderer.drawText(
      `Hero: ${this.hero.x.toFixed(1)}, ${this.hero.y.toFixed(1)}  FPS: ${this.fps.toFixed(0)}`,
      12,
      88,
      { font: CONFIG.ui.smallFont, color: CONFIG.ui.secondaryColor }
    );
    const attackCooldown = this.hero.attackCooldownMs ?? 0;
    const elapsedSinceLastAttack = this.lastFrameAt - (this.hero.lastAttackMs ?? 0);
    const attackCooldownRemaining = Math.max(0, attackCooldown - elapsedSinceLastAttack);
    this.renderer.drawText(
      `Hero Attack CD: ${(attackCooldownRemaining / 1000).toFixed(2)}s`,
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

    if (this.state === GAME_STATES.gameOver) {
      this.renderer.drawCenteredOverlay(this.resultMessage, 'Press R to restart');
    }
  }
}
