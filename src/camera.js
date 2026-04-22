// Camera handles world-to-screen translation for the renderer.
import { clamp } from './utils.js';

export class Camera {
  constructor(viewWidth, viewHeight, worldWidth, worldHeight, options = {}) {
    this.viewWidth = viewWidth;
    this.viewHeight = viewHeight;
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.followMode = options.followMode ?? 'direct';
    this.smoothFactor = options.smoothFactor ?? 10;
    this.x = 0;
    this.y = 0;
  }

  follow(target, dtSeconds = 0) {
    const halfW = this.viewWidth / 2;
    const halfH = this.viewHeight / 2;
    const desiredX = target.x - halfW;
    const desiredY = target.y - halfH;
    const maxX = Math.max(0, this.worldWidth - this.viewWidth);
    const maxY = Math.max(0, this.worldHeight - this.viewHeight);

    if (this.followMode === 'smooth' && dtSeconds > 0) {
      const alpha = clamp(this.smoothFactor * dtSeconds, 0, 1);
      this.x += (desiredX - this.x) * alpha;
      this.y += (desiredY - this.y) * alpha;
    } else {
      this.x = desiredX;
      this.y = desiredY;
    }

    this.x = clamp(this.x, 0, maxX);
    this.y = clamp(this.y, 0, maxY);
  }

  worldToScreen(x, y) {
    return { x: x - this.x, y: y - this.y };
  }
}
