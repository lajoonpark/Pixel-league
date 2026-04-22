// Game orchestrates state, systems, update loop, and rendering.
import { CONFIG } from './config.js';
import { Input } from './input.js';
import { Renderer } from './renderer.js';
import { Camera } from './camera.js';
import { Hero } from './entities/Hero.js';
import { createMap } from './world/map.js';
import { createSpawnSystem } from './systems/spawnSystem.js';
import { movementSystem } from './systems/movementSystem.js';
import { collisionSystem } from './systems/collisionSystem.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.map = createMap(CONFIG);
    this.input = new Input();
    this.camera = new Camera(canvas.width, canvas.height, this.map.width, this.map.height);
    this.renderer = new Renderer(canvas, this.camera);
    this.entities = [];
    this.spawnSystem = createSpawnSystem({
      waveIntervalMs: CONFIG.gameplay.minionWaveIntervalMs,
      waveInitialDelayMs: CONFIG.gameplay.minionWaveInitialDelayMs,
      minionsPerWavePerTeam: CONFIG.gameplay.minionsPerWavePerTeam,
      spawnStaggerMs: CONFIG.gameplay.minionWaveSpawnStaggerMs,
      spawnOffsetX: CONFIG.gameplay.minionWaveSpawnOffsetX,
    });
    this.lastFrameAt = 0;
    this.fps = 0;

    this.setupWorld();
  }

  setupWorld() {
    // First playable scene: one hero starts near the left side of the map.
    const lane = this.map.lanes[0];
    const spawnX = lane.start.x + CONFIG.gameplay.heroSpawnLaneOffsetX;
    const spawnY = lane.start.y;
    this.hero = new Hero(spawnX, spawnY, 'blue');
    this.entities.push(this.hero);
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
    this.update(dtMs);
    this.render();
    requestAnimationFrame((nextTimestamp) => this.loop(nextTimestamp));
  }

  update(dtMs) {
    const dtSeconds = dtMs / 1000;
    this.fps = dtMs > 0 ? (1000 / dtMs) : 0;
    this.updateHeroVelocity();
    this.spawnSystem(this, dtMs);
    movementSystem(this.entities, dtSeconds);
    collisionSystem(this.entities, this.map);
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
    const spawnDebug = this.spawnSystem.getDebugState(this.entities);

    this.renderer.clear();
    this.renderer.drawMap(this.map);

    for (const entity of this.entities) {
      this.renderer.drawRect(entity);
      this.renderer.drawHealthBar(entity);
    }

    this.renderer.drawText('Move hero: WASD / Arrow Keys', 12, 24);
    this.renderer.drawText(`Entities: ${this.entities.length}`, 12, 44);
    this.renderer.drawText(
      `Wave: ${(spawnDebug.nextWaveInMs / 1000).toFixed(1)}s  Minions: ${spawnDebug.minionCount}  Pending: ${spawnDebug.pendingSpawnCount}`,
      12,
      60,
      { font: '11px monospace', color: '#b9c5d6' }
    );
    this.renderer.drawText(
      `Hero: ${this.hero.x.toFixed(1)}, ${this.hero.y.toFixed(1)}  FPS: ${this.fps.toFixed(0)}`,
      12,
      76,
      { font: '10px monospace', color: '#b9c5d6' }
    );
  }
}
