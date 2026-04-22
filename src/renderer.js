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

    for (const side of map.sides ?? []) {
      const sidePos = this.camera.worldToScreen(side.x, side.y);
      this.ctx.fillStyle = side.team === 'blue' ? '#253a64' : '#5a2b2b';
      this.ctx.fillRect(
        Math.round(sidePos.x),
        Math.round(sidePos.y),
        side.width,
        side.height
      );
    }

    for (const lane of map.lanes) {
      const lanePos = this.camera.worldToScreen(lane.bounds.x, lane.bounds.y);
      this.ctx.fillStyle = '#2d3446';
      this.ctx.fillRect(
        Math.round(lanePos.x),
        Math.round(lanePos.y),
        lane.bounds.width,
        lane.bounds.height
      );

      this.ctx.fillStyle = '#7f89a5';
      const centerStart = this.camera.worldToScreen(lane.start.x, lane.start.y - 2);
      this.ctx.fillRect(
        Math.round(centerStart.x),
        Math.round(centerStart.y),
        lane.end.x - lane.start.x,
        4
      );

      for (const towerSlot of lane.placeholders?.towerSlots ?? []) {
        const towerPos = this.camera.worldToScreen(towerSlot.x - towerSlot.width / 2, towerSlot.y - towerSlot.height / 2);
        this.ctx.fillStyle = towerSlot.team === 'blue' ? '#5d82d1' : '#bf6464';
        this.ctx.fillRect(
          Math.round(towerPos.x),
          Math.round(towerPos.y),
          towerSlot.width,
          towerSlot.height
        );
      }

      for (const baseSlot of lane.placeholders?.baseSlots ?? []) {
        const basePos = this.camera.worldToScreen(baseSlot.x - baseSlot.width / 2, baseSlot.y - baseSlot.height / 2);
        this.ctx.fillStyle = baseSlot.team === 'blue' ? '#3f6dce' : '#b55252';
        this.ctx.fillRect(
          Math.round(basePos.x),
          Math.round(basePos.y),
          baseSlot.width,
          baseSlot.height
        );
      }
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

  drawText(text, x, y, options = {}) {
    this.ctx.fillStyle = options.color ?? '#d0d7e2';
    this.ctx.font = options.font ?? '14px monospace';
    this.ctx.fillText(text, x, y);
  }
}
