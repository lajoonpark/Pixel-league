// Game orchestrates state, systems, update loop, and rendering.
import { CONFIG } from './config.js';
import { Input } from './input.js';
import { Renderer } from './renderer.js';
import { Camera } from './camera.js';
import { Hero } from './entities/Hero.js';
import { Tower } from './entities/Tower.js';
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
    this.renderer = new Renderer(canvas, this.camera);
    this.entities = [];
    this.spawnSystem = createSpawnSystem(CONFIG.gameplay.minionSpawnIntervalMs);
    this.lastFrameAt = 0;
    this.fps = 0;

    this.setupWorld();
  }

  setupWorld() {
    // First playable scene: one hero and one tower per side on the lane.
    const lane = this.map.lanes[0];
    const spawnX = lane.start.x + CONFIG.gameplay.heroSpawnLaneOffsetX;
    const spawnY = lane.start.y;
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
    const dtSeconds = dtMs / 1000;
    this.fps = dtMs > 0 ? (1000 / dtMs) : 0;
    this.updateHeroVelocity();
    this.spawnSystem(this, dtMs);
    combatSystem(this.entities, nowMs);
    movementSystem(this.entities, this.map, dtSeconds);
    collisionSystem(this.entities, this.map);
    healthSystem(this.entities);
    this.camera.follow(this.hero);
  }

  updateHeroVelocity() {
    const speed = this.hero.moveSpeed ?? CONFIG.gameplay.defaultHeroMoveSpeed;
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

  render() {
    this.renderer.clear();
    this.renderer.drawMap(this.map);

    for (const entity of this.entities) {
      this.renderer.drawRect(entity);
      this.renderer.drawHealthBar(entity);
    }

    this.renderer.drawText('Move hero: WASD / Arrow Keys', 12, 24);
    this.renderer.drawText(`Entities: ${this.entities.length}`, 12, 44);
    this.renderer.drawText(
      `Hero: ${this.hero.x.toFixed(1)}, ${this.hero.y.toFixed(1)}  FPS: ${this.fps.toFixed(0)}`,
      12,
      60,
      { font: '10px monospace', color: '#b9c5d6' }
    );
  }
}
