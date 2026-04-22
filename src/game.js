// Game orchestrates state, systems, update loop, and rendering.
import { CONFIG } from './config.js';
import { Input } from './input.js';
import { Renderer } from './renderer.js';
import { Camera } from './camera.js';
import { Hero } from './entities/Hero.js';
import { Tower } from './entities/Tower.js';
import { Base } from './entities/Base.js';
import { createMap } from './world/map.js';
import { movementSystem } from './systems/movementSystem.js';
import { collisionSystem } from './systems/collisionSystem.js';
import { createSpawnSystem } from './systems/spawnSystem.js';
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
    this.lastFrameAt = 0;
    this.spawnSystem = createSpawnSystem(CONFIG.gameplay.minionSpawnIntervalMs);

    this.setupWorld();
  }

  setupWorld() {
    const lane = this.map.lanes[0];
    const left = lane.points[0];
    const right = lane.points[lane.points.length - 1];
    const mid = lane.points[1];

    this.hero = new Hero(mid.x, mid.y, 'blue');
    this.entities.push(this.hero);
    this.entities.push(new Tower(mid.x - 260, mid.y - 70, 'blue'));
    this.entities.push(new Tower(mid.x + 260, mid.y + 70, 'red'));
    this.entities.push(new Base(left.x - 40, left.y, 'blue'));
    this.entities.push(new Base(right.x + 40, right.y, 'red'));
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
    this.updateHeroVelocity();
    this.updateMinionVelocity();
    movementSystem(this.entities, dtSeconds);
    collisionSystem(this.entities, this.map);
    this.spawnSystem(this, dtMs);
    combatSystem(this.entities, timestampSafe(), CONFIG.gameplay.attackRange);
    healthSystem(this.entities);
    this.camera.follow(this.hero);
  }

  updateHeroVelocity() {
    const speed = CONFIG.gameplay.heroSpeed;
    const moveX = (this.input.isPressed('KeyD') || this.input.isPressed('ArrowRight') ? 1 : 0)
      - (this.input.isPressed('KeyA') || this.input.isPressed('ArrowLeft') ? 1 : 0);
    const moveY = (this.input.isPressed('KeyS') || this.input.isPressed('ArrowDown') ? 1 : 0)
      - (this.input.isPressed('KeyW') || this.input.isPressed('ArrowUp') ? 1 : 0);

    this.hero.vx = moveX * speed;
    this.hero.vy = moveY * speed;
  }

  updateMinionVelocity() {
    const lane = this.map.lanes[0];
    const left = lane.points[0];
    const right = lane.points[lane.points.length - 1];
    const speed = CONFIG.gameplay.minionSpeed;

    for (const entity of this.entities) {
      if (entity.type !== 'minion') {
        continue;
      }
      const target = entity.team === 'blue' ? right : left;
      const dx = target.x - entity.x;
      const dy = target.y - entity.y;
      const len = Math.hypot(dx, dy) || 1;
      entity.vx = (dx / len) * speed;
      entity.vy = (dy / len) * speed;
    }
  }

  render() {
    this.renderer.clear();

    for (const lane of this.map.lanes) {
      const start = this.camera.worldToScreen(lane.points[0].x, lane.points[0].y);
      const end = this.camera.worldToScreen(lane.points[lane.points.length - 1].x, lane.points[lane.points.length - 1].y);

      this.renderer.ctx.strokeStyle = '#2d3446';
      this.renderer.ctx.lineWidth = 40;
      this.renderer.ctx.beginPath();
      this.renderer.ctx.moveTo(Math.round(start.x), Math.round(start.y));
      this.renderer.ctx.lineTo(Math.round(end.x), Math.round(end.y));
      this.renderer.ctx.stroke();
    }

    for (const entity of this.entities) {
      this.renderer.drawRect(entity);
      this.renderer.drawHealthBar(entity);
    }

    this.renderer.drawText('Move hero: WASD / Arrow Keys', 12, 24);
    this.renderer.drawText(`Entities: ${this.entities.length}`, 12, 44);
  }
}

function timestampSafe() {
  return performance.now();
}
