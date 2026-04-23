// Renderer wraps low-level canvas drawing operations.
export class Renderer {
  constructor(canvas, camera, config) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.camera = camera;
    this.config = config;
    this.spriteRegistry = config.rendering.sprites;
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawMap(map) {
    const topLeft = this.camera.worldToScreen(map.x, map.y);
    const mapColors = this.config.map.colors;

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
      this.ctx.fillStyle = side.team === 'blue'
        ? mapColors.alliedSide
        : mapColors.enemySide;
      this.ctx.fillRect(
        Math.round(sidePos.x),
        Math.round(sidePos.y),
        side.width,
        side.height
      );
    }

    for (const lane of map.lanes) {
      const lanePos = this.camera.worldToScreen(lane.bounds.x, lane.bounds.y);
      this.ctx.fillStyle = mapColors.lane;
      this.ctx.fillRect(
        Math.round(lanePos.x),
        Math.round(lanePos.y),
        lane.bounds.width,
        lane.bounds.height
      );

      this.ctx.fillStyle = mapColors.laneCenterLine;
      const centerStart = this.camera.worldToScreen(
        lane.start.x,
        lane.start.y - this.config.rendering.laneCenterLineHeight / 2
      );
      this.ctx.fillRect(
        Math.round(centerStart.x),
        Math.round(centerStart.y),
        lane.end.x - lane.start.x,
        this.config.rendering.laneCenterLineHeight
      );

      for (const towerSlot of lane.placeholders?.towerSlots ?? []) {
        const towerPos = this.camera.worldToScreen(towerSlot.x - towerSlot.width / 2, towerSlot.y - towerSlot.height / 2);
        this.ctx.fillStyle = towerSlot.team === 'blue'
          ? mapColors.alliedTowerSlot
          : mapColors.enemyTowerSlot;
        this.ctx.fillRect(
          Math.round(towerPos.x),
          Math.round(towerPos.y),
          towerSlot.width,
          towerSlot.height
        );
      }

      for (const baseSlot of lane.placeholders?.baseSlots ?? []) {
        const basePos = this.camera.worldToScreen(baseSlot.x - baseSlot.width / 2, baseSlot.y - baseSlot.height / 2);
        this.ctx.fillStyle = baseSlot.team === 'blue'
          ? mapColors.alliedBaseSlot
          : mapColors.enemyBaseSlot;
        this.ctx.fillRect(
          Math.round(basePos.x),
          Math.round(basePos.y),
          baseSlot.width,
          baseSlot.height
        );
      }
    }
  }

  resolveSpriteId(entity) {
    return entity.spriteId ?? entity.renderType ?? entity.type;
  }

  canRenderSprite(entity) {
    const spriteId = this.resolveSpriteId(entity);
    return Boolean(this.spriteRegistry?.[spriteId]?.image);
  }

  drawSprite(entity) {
    const spriteId = this.resolveSpriteId(entity);
    const sprite = this.spriteRegistry?.[spriteId]?.image;
    if (!sprite) {
      return;
    }

    const { x, y } = this.camera.worldToScreen(entity.x, entity.y);
    this.ctx.drawImage(
      sprite,
      Math.round(x - entity.width / 2),
      Math.round(y - entity.height / 2),
      entity.width,
      entity.height
    );
  }

  drawEntity(entity) {
    if (this.canRenderSprite(entity)) {
      this.drawSprite(entity);
      return;
    }
    this.drawRect(entity);
  }

  getHealthBarColor(entity, healthBarConfig) {
    if (entity.type === 'tower') {
      return entity.team === 'blue'
        ? healthBarConfig.colors.alliedTower
        : healthBarConfig.colors.enemyTower;
    }
    if (entity.type === 'base') {
      return entity.team === 'blue'
        ? healthBarConfig.colors.alliedBase
        : healthBarConfig.colors.enemyBase;
    }
    return healthBarConfig.colors[entity.type];
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
    const healthBarConfig = this.config.rendering.healthBar;

    if (
      (entity.type !== 'hero' && entity.type !== 'minion' && entity.type !== 'tower' && entity.type !== 'base')
      || (typeof entity.alive === 'boolean' && !entity.alive)
      || entity.health <= 0
      || typeof entity.health !== 'number'
      || typeof entity.maxHealth !== 'number'
    ) {
      return;
    }
    const { x, y } = this.camera.worldToScreen(entity.x, entity.y);
    const barWidth = entity.type === 'tower'
      ? Math.max(entity.width, healthBarConfig.towerMinWidth)
      : (entity.type === 'base' ? Math.max(entity.width, healthBarConfig.baseMinWidth) : entity.width);
    const barHeight = healthBarConfig.height;
    const ratio = Math.max(0, entity.health) / entity.maxHealth;
    const barTop = Math.round(y - entity.height / 2 - healthBarConfig.offsetY);
    const barLeft = Math.round(x - barWidth / 2);

    this.ctx.fillStyle = healthBarConfig.backgroundColor;
    this.ctx.fillRect(barLeft, barTop, barWidth, barHeight);
    this.ctx.fillStyle = this.getHealthBarColor(entity, healthBarConfig);
    this.ctx.fillRect(
      barLeft,
      barTop,
      Math.round(barWidth * ratio),
      barHeight
    );
  }

  drawText(text, x, y, options = {}) {
    this.ctx.fillStyle = options.color ?? this.config.ui.color;
    this.ctx.font = options.font ?? this.config.ui.font;
    this.ctx.fillText(text, x, y);
  }

  drawCenteredOverlay(title, subtitle) {
    this.ctx.fillStyle = this.config.ui.overlay.background;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    this.ctx.fillStyle = this.config.ui.overlay.titleColor;
    this.ctx.font = this.config.ui.overlay.titleFont;
    this.ctx.fillText(title, this.canvas.width / 2, this.canvas.height / 2 - 16);

    this.ctx.fillStyle = this.config.ui.overlay.subtitleColor;
    this.ctx.font = this.config.ui.overlay.subtitleFont;
    this.ctx.fillText(subtitle, this.canvas.width / 2, this.canvas.height / 2 + 26);

    this.ctx.textAlign = 'start';
    this.ctx.textBaseline = 'alphabetic';
  }
}
