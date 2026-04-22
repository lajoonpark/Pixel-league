// Game orchestrates state, systems, update loop, and rendering.
import { CONFIG } from './config.js';
import { Input } from './input.js';
import { Renderer } from './renderer.js';
import { Camera } from './camera.js';
import { Hero } from './entities/Hero.js';
import { createMap } from './world/map.js';
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
    this.lastFrameAt = 0;

    this.setupWorld();
  }

  setupWorld() {
    // First playable scene: one hero starts near the left side of the map.
    const lane = this.map.lanes[0];
    const spawnX = lane.x + CONFIG.gameplay.heroSpawnOffset;
    const spawnY = lane.y + lane.height / 2;
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
    this.updateHeroVelocity();
    movementSystem(this.entities, dtSeconds);
    collisionSystem(this.entities, this.map);
    this.camera.follow(this.hero);
  }

  updateHeroVelocity() {
    const speed = this.hero.moveSpeed;
    const moveX = (this.input.isPressed('KeyD') || this.input.isPressed('ArrowRight') ? 1 : 0)
      - (this.input.isPressed('KeyA') || this.input.isPressed('ArrowLeft') ? 1 : 0);
    const moveY = (this.input.isPressed('KeyS') || this.input.isPressed('ArrowDown') ? 1 : 0)
      - (this.input.isPressed('KeyW') || this.input.isPressed('ArrowUp') ? 1 : 0);

    this.hero.vx = moveX * speed;
    this.hero.vy = moveY * speed;
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
  }
}
