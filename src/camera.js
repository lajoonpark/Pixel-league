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

  getDesiredPosition(target) {
    const halfW = this.viewWidth / 2;
    const halfH = this.viewHeight / 2;
    const maxX = Math.max(0, this.worldWidth - this.viewWidth);
    const maxY = Math.max(0, this.worldHeight - this.viewHeight);
    return {
      x: clamp(target.x - halfW, 0, maxX),
      y: clamp(target.y - halfH, 0, maxY),
    };
  }

  snapTo(target) {
    const desired = this.getDesiredPosition(target);
    this.x = desired.x;
    this.y = desired.y;
  }

  follow(target, dtSeconds) {
    const desired = this.getDesiredPosition(target);

    if (this.followMode === 'smooth' && dtSeconds > 0) {
      const alpha = clamp(this.smoothFactor * dtSeconds, 0, 1);
      this.x += (desired.x - this.x) * alpha;
      this.y += (desired.y - this.y) * alpha;
    } else {
      this.x = desired.x;
      this.y = desired.y;
    }
  }

  worldToScreen(x, y) {
    return { x: x - this.x, y: y - this.y };
  }
}
