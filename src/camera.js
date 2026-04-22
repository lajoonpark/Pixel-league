// Camera handles world-to-screen translation for the renderer.
import { clamp } from './utils.js';

export class Camera {
  constructor(viewWidth, viewHeight, worldWidth, worldHeight) {
    this.viewWidth = viewWidth;
    this.viewHeight = viewHeight;
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.x = 0;
    this.y = 0;
  }

  follow(target) {
    const halfW = this.viewWidth / 2;
    const halfH = this.viewHeight / 2;
    this.x = clamp(target.x - halfW, 0, Math.max(0, this.worldWidth - this.viewWidth));
    this.y = clamp(target.y - halfH, 0, Math.max(0, this.worldHeight - this.viewHeight));
  }

  worldToScreen(x, y) {
    return { x: x - this.x, y: y - this.y };
  }
}
