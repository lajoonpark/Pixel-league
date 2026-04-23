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

  // ── map ──────────────────────────────────────────────────────────────────────

  drawMap(map) {
    this.drawTiledBackground(map);
    this.drawDecorations(map);
    this.drawLaneCenterLines(map);
    this.drawMapBorder(map);
  }

  // Render only the tiles that overlap the current viewport for performance.
  drawTiledBackground(map) {
    const tileSize = 32;
    const camX = this.camera.x;
    const camY = this.camera.y;
    const viewW = this.camera.viewWidth;
    const viewH = this.camera.viewHeight;

    const startTX = Math.floor(camX / tileSize);
    const startTY = Math.floor(camY / tileSize);
    const endTX = Math.ceil((camX + viewW) / tileSize);
    const endTY = Math.ceil((camY + viewH) / tileSize);

    const grassSprite = this.spriteRegistry['tile-grass']?.image;
    const laneSprite = this.spriteRegistry['tile-lane']?.image;

    const laneBounds = map.lanes?.[0]?.bounds;
    const laneMinY = laneBounds ? laneBounds.y : (map.height / 2 - map.laneHeight / 2);
    const laneMaxY = laneBounds ? laneBounds.y + laneBounds.height : (map.height / 2 + map.laneHeight / 2);

    for (let ty = startTY; ty <= endTY; ty += 1) {
      const wy = ty * tileSize;
      if (wy < 0 || wy >= map.height) { continue; }

      for (let tx = startTX; tx <= endTX; tx += 1) {
        const wx = tx * tileSize;
        if (wx < 0 || wx >= map.width) { continue; }

        const { x: sx, y: sy } = this.camera.worldToScreen(wx, wy);
        const inLane = wy < laneMaxY && wy + tileSize > laneMinY;
        const sprite = inLane ? laneSprite : grassSprite;

        if (sprite) {
          this.ctx.drawImage(sprite, Math.round(sx), Math.round(sy), tileSize, tileSize);
        } else {
          this.ctx.fillStyle = inLane ? '#9a7a50' : '#3a7d30';
          this.ctx.fillRect(Math.round(sx), Math.round(sy), tileSize, tileSize);
        }
      }
    }
  }

  // Draw tree decorations from the map's decoration list.
  drawDecorations(map) {
    const treeSprite = this.spriteRegistry['tree']?.image;
    const TW = 28;
    const TH = 38;

    for (const deco of map.decorations ?? []) {
      const { x: sx, y: sy } = this.camera.worldToScreen(deco.x, deco.y);
      // Simple frustum cull.
      if (sx + TW < 0 || sx - TW > this.canvas.width) { continue; }
      if (sy + TH < 0 || sy - TH > this.canvas.height) { continue; }

      if (treeSprite) {
        this.ctx.drawImage(treeSprite, Math.round(sx - TW / 2), Math.round(sy - TH / 2), TW, TH);
      } else {
        this.ctx.fillStyle = '#2a6020';
        this.ctx.fillRect(Math.round(sx - 8), Math.round(sy - 12), 16, 24);
      }
    }
  }

  drawLaneCenterLines(map) {
    const lineH = this.config.rendering.laneCenterLineHeight;
    this.ctx.fillStyle = this.config.map.colors.laneCenterLine;
    for (const lane of map.lanes ?? []) {
      const pos = this.camera.worldToScreen(
        lane.start.x,
        lane.start.y - lineH / 2
      );
      this.ctx.fillRect(
        Math.round(pos.x),
        Math.round(pos.y),
        lane.end.x - lane.start.x,
        lineH
      );
    }
  }

  drawMapBorder(map) {
    const topLeft = this.camera.worldToScreen(map.x, map.y);
    this.ctx.strokeStyle = map.borderColor;
    this.ctx.lineWidth = map.borderWidth;
    this.ctx.strokeRect(
      Math.round(topLeft.x),
      Math.round(topLeft.y),
      map.width,
      map.height
    );
  }

  // ── range circles ────────────────────────────────────────────────────────────

  // Returns the fill colour for an entity's range circle.
  getRangeCircleColor(entity) {
    if (entity.type === 'hero') {
      return this.config.rangeCircle.heroColor;
    }
    // Structures: green while targeting a minion, red otherwise (idle / on hero).
    return entity.target?.type === 'minion'
      ? this.config.rangeCircle.greenColor
      : this.config.rangeCircle.redColor;
  }

  drawRangeCircle(entity) {
    if (typeof entity.attackRange !== 'number') { return; }
    const { x, y } = this.camera.worldToScreen(entity.x, entity.y);
    const rc = this.config.rangeCircle;
    const color = this.getRangeCircleColor(entity);

    this.ctx.beginPath();
    this.ctx.arc(Math.round(x), Math.round(y), entity.attackRange, 0, Math.PI * 2);
    this.ctx.fillStyle = color;
    this.ctx.globalAlpha = rc.alpha;
    this.ctx.fill();
    this.ctx.globalAlpha = 0.6;
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = rc.lineWidth;
    this.ctx.stroke();
    this.ctx.globalAlpha = 1;
  }

  // ── entities ─────────────────────────────────────────────────────────────────

  resolveSpriteId(entity) {
    return entity.spriteId ?? entity.renderType ?? entity.type;
  }

  canRenderSprite(entity) {
    const spriteId = this.resolveSpriteId(entity);
    return Boolean(this.spriteRegistry?.[spriteId]?.image);
  }

  // drawSprite supports both whole-image and sprite-sheet-crop entries.
  // Entry format: { image, sx?, sy?, sw?, sh? }
  drawSprite(entity) {
    const spriteId = this.resolveSpriteId(entity);
    const entry = this.spriteRegistry?.[spriteId];
    if (!entry?.image) { return; }

    const { x, y } = this.camera.worldToScreen(entity.x, entity.y);
    const dx = Math.round(x - entity.width / 2);
    const dy = Math.round(y - entity.height / 2);

    if (entry.sx !== undefined) {
      this.ctx.drawImage(entry.image, entry.sx, entry.sy, entry.sw, entry.sh, dx, dy, entity.width, entity.height);
    } else {
      this.ctx.drawImage(entry.image, dx, dy, entity.width, entity.height);
    }
  }

  drawEntity(entity) {
    if (typeof entity.alive === 'boolean' && !entity.alive) {
      return;
    }

    // Range circles are drawn behind the entity sprite.
    const isAliveStructure = (entity.type === 'tower' || entity.type === 'base')
      && entity.alive && entity.health > 0;

    if (isAliveStructure || entity.showRangeCircle) {
      this.drawRangeCircle(entity);
    }

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
