// Renderer wraps low-level canvas drawing operations.
export class Renderer {
  constructor(canvas, camera, config) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.camera = camera;
    this.config = config;
    this.spriteRegistry = config.rendering.sprites;
    // Set by game.js at the start of each render call so draw methods can read it.
    this.nowMs = 0;
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
    } else {
      this.drawRect(entity);
    }

    // Draw the sword overlay on top of the hero body in all animation phases.
    if (entity.type === 'hero') {
      this.drawHeroSword(entity);
    }
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

  // ── attack animation ─────────────────────────────────────────────────────────

  // Draw the hero's sword blade as a short pixel line whose angle changes with
  // the current attackAnimPhase.  Angles are measured clockwise from East
  // (standard canvas convention; y-axis points down).
  drawHeroSword(hero) {
    const nowMs = this.nowMs;
    const anim = this.config.attackAnim;
    const { x: cx, y: cy } = this.camera.worldToScreen(hero.x, hero.y);
    const ctx = this.ctx;

    // Canonical blade angles (radians, clockwise-from-right in screen space).
    const IDLE_ANGLE = -Math.PI / 4;          // upper-right  (−45°)
    const WIND_UP_ANGLE = -Math.PI * 3 / 4;   // upper-left   (−135°)
    const FOLLOW_ANGLE = Math.PI / 4;          // lower-right  (+45°)

    const elapsed = nowMs - hero.attackAnimStartMs;
    let angle = IDLE_ANGLE;

    if (hero.attackAnimPhase === 'windUp') {
      const t = Math.min(elapsed / anim.windUpMs, 1);
      angle = IDLE_ANGLE + (WIND_UP_ANGLE - IDLE_ANGLE) * t;
    } else if (hero.attackAnimPhase === 'swing') {
      const swingElapsed = elapsed - anim.windUpMs;
      const t = Math.min(swingElapsed / anim.swingMs, 1);
      angle = WIND_UP_ANGLE + (FOLLOW_ANGLE - WIND_UP_ANGLE) * t;
    } else if (hero.attackAnimPhase === 'followThrough') {
      angle = FOLLOW_ANGLE;
    } else if (hero.attackAnimPhase === 'return') {
      const returnElapsed = elapsed - anim.windUpMs - anim.swingMs - anim.followThroughMs;
      const t = Math.min(returnElapsed / anim.returnMs, 1);
      angle = FOLLOW_ANGLE + (IDLE_ANGLE - FOLLOW_ANGLE) * t;
    }

    const length = anim.swordLength;
    const hiltOffset = 4;
    const tipX = cx + Math.cos(angle) * length;
    const tipY = cy + Math.sin(angle) * length;
    const hiltX = cx - Math.cos(angle) * hiltOffset;
    const hiltY = cy - Math.sin(angle) * hiltOffset;

    ctx.save();
    // Blade gleams white during the swing; silver otherwise.
    ctx.strokeStyle = hero.attackAnimPhase === 'swing' ? '#ffffff' : '#d0d8e8';
    ctx.lineWidth = anim.swordThickness;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(Math.round(hiltX), Math.round(hiltY));
    ctx.lineTo(Math.round(tipX), Math.round(tipY));
    ctx.stroke();
    // Hilt guard: small dark pixel at the crossguard position.
    ctx.fillStyle = '#5a4a2a';
    ctx.fillRect(Math.round(hiltX) - 1, Math.round(hiltY) - 1, 3, 3);
    ctx.restore();
  }

  // Slash-arc crescent that sweeps diagonally from upper-left to lower-right.
  // Phase 1 (progress 0–0.6): growing arc stroke.
  // Phase 2 (progress 0.6–1.0): arc dissolves into scattered 2×2 pixels.
  drawSlashArc(effect) {
    const nowMs = this.nowMs;
    const elapsed = nowMs - effect.startMs;
    const progress = Math.min(elapsed / effect.durationMs, 1);

    const { x: cx, y: cy } = this.camera.worldToScreen(effect.x, effect.y);
    const ctx = this.ctx;

    // Arc spans 180° from upper-left to lower-right passing through the upper half.
    const ARC_START = -Math.PI * 3 / 4; // upper-left  (−135°)
    const ARC_END = Math.PI / 4;         // lower-right  (+45°)

    const radius = effect.arcRadiusStart
      + (effect.arcRadiusEnd - effect.arcRadiusStart) * Math.min(progress / 0.6, 1);

    ctx.save();

    if (progress <= 0.6) {
      // Growing crescent stroke that reveals itself progressively.
      const sweepEnd = ARC_START + (ARC_END - ARC_START) * (progress / 0.6);
      ctx.globalAlpha = 1 - progress * 0.4;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(Math.round(cx), Math.round(cy), radius, ARC_START, sweepEnd);
      ctx.stroke();
    } else {
      // Dissolve into deterministic 2×2 pixel scatter along the arc edge.
      const fadeProgress = (progress - 0.6) / 0.4;
      ctx.globalAlpha = 1 - fadeProgress;
      ctx.fillStyle = '#c8d0e0';
      const pixelCount = 8;
      for (let i = 0; i < pixelCount; i++) {
        const t = i / (pixelCount - 1);
        const a = ARC_START + (ARC_END - ARC_START) * t;
        // Alternate inner/outer spread for a pixel-art scatter feel.
        const r = radius + (i % 2 === 0 ? 3 : -2);
        ctx.fillRect(Math.round(cx + Math.cos(a) * r) - 1, Math.round(cy + Math.sin(a) * r) - 1, 2, 2);
      }
    }

    ctx.restore();
  }

  // Hit-spark burst centred on the struck target's world position.
  // Phase 1 (progress 0–0.4): bright radiating lines from centre.
  // Phase 2 (progress 0.4–1.0): lines dissolve into drifting pixel dots.
  drawHitSpark(effect) {
    const nowMs = this.nowMs;
    const elapsed = nowMs - effect.startMs;
    const progress = Math.min(elapsed / effect.durationMs, 1);

    const { x: cx, y: cy } = this.camera.worldToScreen(effect.x, effect.y);
    const ctx = this.ctx;
    const { rayCount, maxRadius, pixelSize, colors } = effect;

    ctx.save();

    if (progress <= 0.4) {
      // Bright radiating lines.
      const burstProgress = progress / 0.4;
      ctx.globalAlpha = 1 - burstProgress * 0.3;
      ctx.strokeStyle = colors[0];
      ctx.lineWidth = 2;
      ctx.lineCap = 'square';
      const lineLength = maxRadius * (1 - burstProgress);
      const innerR = lineLength * 0.2;
      for (let i = 0; i < rayCount; i++) {
        const angle = (Math.PI * 2 * i) / rayCount;
        ctx.beginPath();
        ctx.moveTo(
          Math.round(cx + Math.cos(angle) * innerR),
          Math.round(cy + Math.sin(angle) * innerR)
        );
        ctx.lineTo(
          Math.round(cx + Math.cos(angle) * lineLength),
          Math.round(cy + Math.sin(angle) * lineLength)
        );
        ctx.stroke();
      }
      // Bright white centre pixel.
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(Math.round(cx) - 2, Math.round(cy) - 2, 4, 4);
    } else {
      // Dissolving pixel dots that drift outward.
      const fadeProgress = (progress - 0.4) / 0.6;
      ctx.globalAlpha = 1 - fadeProgress;
      const colorIndex = Math.min(Math.floor(fadeProgress * colors.length), colors.length - 1);
      ctx.fillStyle = colors[colorIndex];
      const r = maxRadius * (0.4 + fadeProgress * 0.6);
      for (let i = 0; i < rayCount; i++) {
        // Slowly rotate dots outward using fadeProgress for drift.
        const angle = (Math.PI * 2 * i) / rayCount + fadeProgress * 0.5;
        const px = Math.round(cx + Math.cos(angle) * r);
        const py = Math.round(cy + Math.sin(angle) * r);
        ctx.fillRect(px, py, pixelSize, pixelSize);
      }
    }

    ctx.restore();
  }

  // Energy-blast comet projectile fired by towers and bases.
  // Phase 1 (progress 0–0.85): bright orb + pixel-art comet trail flies from
  //   source to target.
  // Phase 2 (progress 0.85–1.0): orb dissolves into radiating scatter pixels
  //   at the impact point.
  drawEnergyBlast(effect) {
    const nowMs = this.nowMs;
    const elapsed = nowMs - effect.startMs;
    const progress = Math.min(elapsed / effect.durationMs, 1);
    const ctx = this.ctx;
    const blastCfg = this.config.energyBlast;
    const palette = blastCfg.colors[effect.team] ?? blastCfg.colors.blue;

    // World-space head position interpolated along the flight path.
    const worldHeadX = effect.x + (effect.toX - effect.x) * progress;
    const worldHeadY = effect.y + (effect.toY - effect.y) * progress;
    const { x: headX, y: headY } = this.camera.worldToScreen(worldHeadX, worldHeadY);

    // Direction unit vector (screen coords).
    const { x: fromSX, y: fromSY } = this.camera.worldToScreen(effect.x, effect.y);
    const { x: toSX, y: toSY } = this.camera.worldToScreen(effect.toX, effect.toY);
    const totalDX = toSX - fromSX;
    const totalDY = toSY - fromSY;
    const totalLen = Math.hypot(totalDX, totalDY) || 1;
    const dirX = totalDX / totalLen;
    const dirY = totalDY / totalLen;

    const IMPACT_PHASE = 0.85;

    ctx.save();

    if (progress < IMPACT_PHASE) {
      // ── Comet trail (drawn first so the orb sits on top) ──────────────────
      const trailColors = palette.trail;
      const segCount = blastCfg.trailSegments;
      const trailLen = Math.min(blastCfg.trailLengthPx, totalLen * progress);

      for (let i = 0; i < segCount; i++) {
        const t = (i + 1) / segCount;               // 0 = head, 1 = tail tip
        const segX = headX - dirX * trailLen * t;
        const segY = headY - dirY * trailLen * t;
        const alpha = (1 - t) * (1 - progress * 0.2);
        const size = Math.max(1, Math.round((1 - t) * 3));
        const colorIdx = Math.min(Math.floor(t * trailColors.length), trailColors.length - 1);

        ctx.globalAlpha = alpha;
        ctx.fillStyle = trailColors[colorIdx];
        ctx.fillRect(Math.round(segX) - size, Math.round(segY) - size, size * 2, size * 2);

        // Scatter a 1-px accent pixel beside every other segment for pixel-art sparkle.
        if (i % 2 === 0 && alpha > 0.3) {
          ctx.globalAlpha = alpha * 0.5;
          ctx.fillStyle = palette.glow;
          ctx.fillRect(
            Math.round(segX) + (i % 4 === 0 ? 2 : -2),
            Math.round(segY) - 1,
            blastCfg.scatterPixelSize,
            blastCfg.scatterPixelSize
          );
        }
      }

      // ── Outer glow ring ────────────────────────────────────────────────────
      const r = blastCfg.headRadius;
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = palette.glow;
      ctx.beginPath();
      ctx.arc(Math.round(headX), Math.round(headY), r + 3, 0, Math.PI * 2);
      ctx.fill();

      // ── Bright orb core ────────────────────────────────────────────────────
      ctx.globalAlpha = 1;
      ctx.fillStyle = palette.head;
      ctx.beginPath();
      ctx.arc(Math.round(headX), Math.round(headY), r, 0, Math.PI * 2);
      ctx.fill();

      // White centre highlight pixel.
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(Math.round(headX) - 1, Math.round(headY) - 1, 2, 2);
    } else {
      // ── Impact dissolution: scatter pixels radiate from the target ─────────
      const { x: impactX, y: impactY } = this.camera.worldToScreen(effect.toX, effect.toY);
      const fadeProgress = (progress - IMPACT_PHASE) / (1 - IMPACT_PHASE);
      const rayCount = 8;
      const maxR = blastCfg.headRadius * 3 + fadeProgress * 10;
      const trailColors = palette.trail;

      for (let i = 0; i < rayCount; i++) {
        const angle = (Math.PI * 2 * i) / rayCount + fadeProgress * 0.4;
        const r2 = maxR * fadeProgress;
        const px = Math.round(impactX + Math.cos(angle) * r2);
        const py = Math.round(impactY + Math.sin(angle) * r2);
        const colorIdx = Math.min(Math.floor(fadeProgress * trailColors.length), trailColors.length - 1);

        ctx.globalAlpha = (1 - fadeProgress) * 0.9;
        ctx.fillStyle = trailColors[colorIdx];
        ctx.fillRect(px, py, blastCfg.scatterPixelSize, blastCfg.scatterPixelSize);
      }

      // Fading centre flash.
      ctx.globalAlpha = (1 - fadeProgress) * 0.7;
      ctx.fillStyle = palette.glow;
      ctx.beginPath();
      ctx.arc(Math.round(impactX), Math.round(impactY), blastCfg.headRadius * (1 - fadeProgress * 0.6), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // Dispatch table for transient effects.
  drawEffect(effect) {
    if (effect.type === 'slashArc') {
      this.drawSlashArc(effect);
    } else if (effect.type === 'hitSpark') {
      this.drawHitSpark(effect);
    } else if (effect.type === 'energyBlast') {
      this.drawEnergyBlast(effect);
    }
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
