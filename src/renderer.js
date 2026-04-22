// Renderer wraps low-level canvas drawing operations.
export class Renderer {
  constructor(canvas, camera) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.camera = camera;
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawMap(map) {
    const topLeft = this.camera.worldToScreen(map.x, map.y);

    this.ctx.fillStyle = map.color;
    this.ctx.fillRect(
      Math.round(topLeft.x),
      Math.round(topLeft.y),
      map.width,
      map.height
    );

    this.ctx.strokeStyle = map.borderColor;
    this.ctx.lineWidth = map.borderWidth;
    this.ctx.strokeRect(
      Math.round(topLeft.x),
      Math.round(topLeft.y),
      map.width,
      map.height
    );

    // Lanes are intentionally simple strips for prototype readability.
    for (const lane of map.lanes) {
      const lanePos = this.camera.worldToScreen(lane.x, lane.y);
      this.ctx.fillStyle = '#2d3446';
      this.ctx.fillRect(
        Math.round(lanePos.x),
        Math.round(lanePos.y),
        lane.width,
        lane.height
      );
    }
  }

  drawRect(entity) {
    const { x, y } = this.camera.worldToScreen(entity.x, entity.y);
    this.ctx.fillStyle = entity.color;
    this.ctx.fillRect(
      Math.round(x - entity.width / 2),
      Math.round(y - entity.height / 2),
      entity.width,
      entity.height
    );
  }

  drawHealthBar(entity) {
    if (typeof entity.health !== 'number' || typeof entity.maxHealth !== 'number') {
      return;
    }
    const { x, y } = this.camera.worldToScreen(entity.x, entity.y);
    const barWidth = entity.width;
    const barHeight = 4;
    const ratio = Math.max(0, entity.health) / entity.maxHealth;

    this.ctx.fillStyle = '#280a0a';
    this.ctx.fillRect(Math.round(x - barWidth / 2), Math.round(y - entity.height / 2 - 10), barWidth, barHeight);
    this.ctx.fillStyle = '#55d66a';
    this.ctx.fillRect(
      Math.round(x - barWidth / 2),
      Math.round(y - entity.height / 2 - 10),
      Math.round(barWidth * ratio),
      barHeight
    );
  }

  drawText(text, x, y) {
    this.ctx.fillStyle = '#d0d7e2';
    this.ctx.font = '14px monospace';
    this.ctx.fillText(text, x, y);
  }
}
