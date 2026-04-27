// Renderer wraps low-level canvas drawing operations.
import { MOBILE_LAYOUT } from './systems/mobileControlsSystem.js';

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

  // ── targeting overlays ────────────────────────────────────────────────────────

  // Draw a stroked circle at a world position (no fill or with optional fill alpha).
  _drawWorldCircle(worldX, worldY, radius, color, strokeAlpha = 0.8, fillAlpha = 0.08, lineWidth = 1.5) {
    if (radius <= 0) { return; }
    const { x, y } = this.camera.worldToScreen(worldX, worldY);
    const ctx = this.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.arc(Math.round(x), Math.round(y), radius, 0, Math.PI * 2);
    if (fillAlpha > 0) {
      ctx.fillStyle = color;
      ctx.globalAlpha = fillAlpha;
      ctx.fill();
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.globalAlpha = strokeAlpha;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // Draw a line between two world positions.
  _drawWorldLine(x1, y1, x2, y2, color, alpha = 0.7, lineWidth = 1.5) {
    const s1 = this.camera.worldToScreen(x1, y1);
    const s2 = this.camera.worldToScreen(x2, y2);
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.globalAlpha = alpha;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(Math.round(s1.x), Math.round(s1.y));
    ctx.lineTo(Math.round(s2.x), Math.round(s2.y));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // Draw a small destination diamond/cross marker at a world position.
  _drawDestinationMarker(worldX, worldY, color, alpha = 0.85) {
    const { x, y } = this.camera.worldToScreen(worldX, worldY);
    const sx = Math.round(x);
    const sy = Math.round(y);
    const SIZE = 6;
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx - SIZE, sy);
    ctx.lineTo(sx, sy - SIZE);
    ctx.lineTo(sx + SIZE, sy);
    ctx.lineTo(sx, sy + SIZE);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  // Draw all targeting indicators based on the current targeting state.
  // `targetingState`  – TARGETING_STATE value string.
  // `abilities`       – hero.abilities array.
  // `mouseWorldX/Y`   – current mouse position in world coordinates.
  drawTargetingOverlay(hero, targetingState, abilities, mouseWorldX, mouseWorldY) {
    if (!hero || !hero.alive) { return; }

    const TARGETING_STATE = {
      NONE: 'NONE',
      Q_TARGETING: 'Q_TARGETING',
      W_TARGETING: 'W_TARGETING',
      E_TARGETING: 'E_TARGETING',
      R_TARGETING: 'R_TARGETING',
    };

    if (targetingState === TARGETING_STATE.NONE) { return; }

    const ctx = this.ctx;
    ctx.save();

    if (targetingState === TARGETING_STATE.Q_TARGETING) {
      const ability = abilities?.find((a) => a.key === 'Q');
      const castRange = ability?.castRange ?? 80;
      const hitRadius = ability?.hitRadius ?? 35;

      // Cast-range circle around hero.
      this._drawWorldCircle(hero.x, hero.y, castRange, '#ffffff', 0.5, 0.05);

      // Direction from hero to mouse.
      const dx = mouseWorldX - hero.x;
      const dy = mouseWorldY - hero.y;
      const mag = Math.hypot(dx, dy);
      if (mag > 0.001) {
        const dirX = dx / mag;
        const dirY = dy / mag;
        const hitX = hero.x + dirX * castRange;
        const hitY = hero.y + dirY * castRange;
        // Hit-area circle at slash endpoint.
        this._drawWorldCircle(hitX, hitY, hitRadius, '#ffee55', 0.7, 0.12);
      }
    } else if (targetingState === TARGETING_STATE.W_TARGETING) {
      const ability = abilities?.find((a) => a.key === 'W');
      const maxDist = ability?.distance ?? 150;

      // Dash-range circle around hero.
      this._drawWorldCircle(hero.x, hero.y, maxDist, '#aaddff', 0.5, 0.05);

      // Clamp destination to max dash distance.
      const dx = mouseWorldX - hero.x;
      const dy = mouseWorldY - hero.y;
      const dist = Math.hypot(dx, dy);
      const t = Math.min(dist, maxDist) / (dist || 1);
      const destX = hero.x + dx * t;
      const destY = hero.y + dy * t;

      this._drawWorldLine(hero.x, hero.y, destX, destY, '#aaddff', 0.55);
      this._drawDestinationMarker(destX, destY, '#aaddff');
    } else if (targetingState === TARGETING_STATE.E_TARGETING) {
      const ability = abilities?.find((a) => a.key === 'E');
      const castRange = ability?.castRange ?? 400;

      // Projectile path line from hero toward mouse (clamped to cast range).
      const dx = mouseWorldX - hero.x;
      const dy = mouseWorldY - hero.y;
      const dist = Math.hypot(dx, dy);
      const t = Math.min(dist, castRange) / (dist || 1);
      const endX = hero.x + dx * t;
      const endY = hero.y + dy * t;

      this._drawWorldLine(hero.x, hero.y, endX, endY, '#44ff88', 0.6, 2);
      // Small impact circle at the endpoint.
      this._drawWorldCircle(endX, endY, 12, '#44ff88', 0.7, 0.15, 1.5);
    } else if (targetingState === TARGETING_STATE.R_TARGETING) {
      const ability = abilities?.find((a) => a.key === 'R');
      const castRange = ability?.castRange ?? 200;
      const aoeRadius = ability?.aoeRadius ?? 80;

      // Cast-range circle around hero.
      this._drawWorldCircle(hero.x, hero.y, castRange, '#ff44ff', 0.4, 0.04);

      // Determine whether mouse is in cast range for colour feedback.
      const dx = mouseWorldX - hero.x;
      const dy = mouseWorldY - hero.y;
      const dist = Math.hypot(dx, dy);
      const inRange = dist <= castRange;
      const aoeColor = inRange ? '#ff44ff' : '#ff4444';

      // AoE circle at mouse position (or clamped to range boundary if out).
      this._drawWorldCircle(mouseWorldX, mouseWorldY, aoeRadius, aoeColor, 0.7, 0.12);
    }

    ctx.restore();
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

  // Draw a fading circle marker at a world position to show the movement target.
  drawClickMarker(worldX, worldY, alpha) {
    const { x, y } = this.camera.worldToScreen(worldX, worldY);
    const ctx = this.ctx;
    const sx = Math.round(x);
    const sy = Math.round(y);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = '#44ff88';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.arc(sx, sy, 8, 0, Math.PI * 2);
    ctx.stroke();

    // Small cross in the centre.
    ctx.beginPath();
    ctx.moveTo(sx - 4, sy);
    ctx.lineTo(sx + 4, sy);
    ctx.moveTo(sx, sy - 4);
    ctx.lineTo(sx, sy + 4);
    ctx.stroke();

    ctx.restore();
  }

  // ── Projectiles ───────────────────────────────────────────────────────────────

  // Draw a single hero-fired projectile.  Uses looping sprite-frame animation
  // when the projectile carries animFrames; falls back to a filled rectangle.
  // When projectile.rotation is set (radians) the sprite is rotated around its
  // centre so directional sprites (e.g. tower bolt facing right) always point
  // in the direction of travel.
  drawProjectile(projectile) {
    if (!projectile.alive) { return; }
    const { x, y } = this.camera.worldToScreen(projectile.x, projectile.y);

    if (projectile.animFrames) {
      const elapsed = this.nowMs - (projectile.animStartMs ?? 0);
      const frameDur = projectile.animFrameDuration ?? 80;
      const frameIdx = Math.floor(elapsed / frameDur) % projectile.animFrames.length;
      const frame = projectile.animFrames[frameIdx];

      if (frame) {
        const ctx = this.ctx;
        const hw = projectile.width / 2;
        const hh = projectile.height / 2;
        const sx = Math.round(x);
        const sy = Math.round(y);
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        if (typeof projectile.rotation === 'number' && projectile.rotation !== 0) {
          ctx.translate(sx, sy);
          ctx.rotate(projectile.rotation);
          ctx.drawImage(frame, -hw, -hh, projectile.width, projectile.height);
        } else {
          ctx.drawImage(frame, sx - hw, sy - hh, projectile.width, projectile.height);
        }
        ctx.restore();
        return;
      }
    }

    // Fallback: plain coloured rectangle.
    this.ctx.fillStyle = projectile.color;
    this.ctx.fillRect(
      Math.round(x - projectile.width / 2),
      Math.round(y - projectile.height / 2),
      projectile.width,
      projectile.height
    );
  }

  // Iterate and draw all live projectiles.
  drawProjectiles(projectiles) {
    for (const proj of projectiles) {
      this.drawProjectile(proj);
    }
  }

  // ── VFX effects (sprite-frame animations) ────────────────────────────────────

  // Draw a single sprite-frame VFX effect from the VfxSystem pool.
  // Uses the effect's frames array for animation; falls back to a placeholder
  // coloured rectangle when frames are null or unavailable.
  drawVfxEffect(effect) {
    const nowMs = this.nowMs;
    const elapsed = nowMs - effect.startMs;
    const totalDuration = effect.frameDuration * effect.totalFrames;
    const progress = Math.min(elapsed / totalDuration, 1);

    // Fade out during the final 20% of the animation.
    const FADE_START = 0.8;
    const alpha = progress > FADE_START
      ? 1 - (progress - FADE_START) / (1 - FADE_START)
      : 1;

    const { x, y } = this.camera.worldToScreen(effect.x, effect.y);
    const ctx = this.ctx;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = Math.max(0, alpha);

    if (effect.frames) {
      const rawIdx = Math.floor(elapsed / effect.frameDuration);
      const frameIdx = effect.loop
        ? rawIdx % effect.frames.length
        : Math.min(rawIdx, effect.frames.length - 1);
      const frame = effect.frames[frameIdx];

      if (frame) {
        ctx.drawImage(
          frame,
          Math.round(x - effect.width / 2),
          Math.round(y - effect.height / 2),
          effect.width,
          effect.height
        );
        ctx.restore();
        return;
      }
    }

    // Fallback placeholder: small coloured rectangle.
    ctx.fillStyle = effect.color;
    ctx.fillRect(
      Math.round(x - effect.width / 4),
      Math.round(y - effect.height / 4),
      Math.round(effect.width / 2),
      Math.round(effect.height / 2)
    );
    ctx.restore();
  }

  // Iterate and draw all VFX system effects.
  drawVfxEffects(effects) {
    for (const effect of effects) {
      this.drawVfxEffect(effect);
    }
  }

  // ── Ability HUD ───────────────────────────────────────────────────────────────

  // Draw the Q / W / E / R ability bar centred at the bottom of the screen.
  // When icon images are provided, each slot shows the icon with a cooldown
  // overlay; otherwise it falls back to a text-only layout.
  // icons: { Q: HTMLImageElement|null, W, E, R } from assetLoader (optional).
  // selectedKey: active targeting mode key ('Q'/'W'/'E'/'R') or null.
  drawAbilityHUD(hero, icons = {}, selectedKey = null) {
    if (!hero || !hero.abilities) { return; }

    const abilities = hero.abilities;
    const SLOT_W = 72;
    const SLOT_H = 62;
    const GAP = 8;
    const BOTTOM_MARGIN = 10;
    const ICON_SIZE = 40;
    const totalW = abilities.length * SLOT_W + (abilities.length - 1) * GAP;
    const startX = Math.round((this.canvas.width - totalW) / 2);
    const startY = this.canvas.height - BOTTOM_MARGIN - SLOT_H;
    const ctx = this.ctx;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    for (let i = 0; i < abilities.length; i++) {
      const ability = abilities[i];
      const slotX = startX + i * (SLOT_W + GAP);
      const slotY = startY;
      const isReady = ability.currentCooldown <= 0;
      const isSelected = ability.key === selectedKey;
      const icon = icons?.[ability.key] ?? null;

      // ── Background ────────────────────────────────────────────────────────
      ctx.fillStyle = isSelected ? 'rgba(255, 220, 60, 0.22)' : 'rgba(8, 12, 24, 0.82)';
      ctx.fillRect(slotX, slotY, SLOT_W, SLOT_H);

      if (icon) {
        // ── Icon image ──────────────────────────────────────────────────────
        const iconX = Math.round(slotX + (SLOT_W - ICON_SIZE) / 2);
        const iconY = slotY + 4;
        ctx.drawImage(icon, iconX, iconY, ICON_SIZE, ICON_SIZE);

        // ── Cooldown fill overlay (darkens over icon while on cooldown) ──────
        if (!isReady) {
          const fillFraction = ability.currentCooldown / ability.cooldown;
          ctx.fillStyle = 'rgba(0, 0, 0, 0.60)';
          ctx.fillRect(slotX + 2, slotY + 2, SLOT_W - 4, Math.round((SLOT_H - 4) * fillFraction));
        }

        // ── Key label (small overlay at top-left of slot) ─────────────────
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px monospace';
        ctx.fillText(ability.key, slotX + 4, slotY + 13);
      } else {
        // ── Text-only fallback layout ─────────────────────────────────────

        // Cooldown fill overlay
        if (!isReady) {
          const fillFraction = ability.currentCooldown / ability.cooldown;
          ctx.fillStyle = 'rgba(0, 0, 0, 0.48)';
          ctx.fillRect(slotX + 2, slotY + 2, SLOT_W - 4, Math.round((SLOT_H - 4) * fillFraction));
        }

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px monospace';
        ctx.fillText(ability.key, slotX + 6, slotY + 18);

        ctx.fillStyle = '#b8c8e0';
        ctx.font = '9px monospace';
        ctx.fillText(ability.name, slotX + 6, slotY + 34);
      }

      // ── Border: gold when selected, green when ready, grey on cooldown ────
      if (isSelected) {
        ctx.strokeStyle = '#ffdc3c';
        ctx.lineWidth = 3;
      } else {
        ctx.strokeStyle = isReady ? '#44ff88' : '#445566';
        ctx.lineWidth = 2;
      }
      ctx.strokeRect(slotX + 1, slotY + 1, SLOT_W - 2, SLOT_H - 2);

      // ── Cooldown status text (bottom row) ─────────────────────────────────
      if (isReady) {
        ctx.fillStyle = isSelected ? '#ffdc3c' : '#44ff88';
        ctx.font = '9px monospace';
        ctx.fillText(isSelected ? 'ACTIVE' : 'Ready', slotX + 6, slotY + SLOT_H - 6);
      } else {
        ctx.fillStyle = '#ff9966';
        ctx.font = '9px monospace';
        ctx.fillText(`${ability.currentCooldown.toFixed(1)}s`, slotX + 6, slotY + SLOT_H - 6);
      }
    }

    ctx.restore();
  }

  // ── Mobile HUD ────────────────────────────────────────────────────────────────

  // Draw all mobile touch controls: joystick, ability buttons, attack button,
  // and cancel zone.  All positions are in logical canvas coordinates.
  // mobileControls – MobileControls instance (provides live state for rendering).
  // hero           – hero entity (for ability cooldown information).
  // selectedKey    – active targeting key ('Q'/'W'/'E'/'R') or null.
  drawMobileHUD(mobileControls, hero, selectedKey) {
    const ctx = this.ctx;
    // Use the single-source layout from mobileControlsSystem.js.
    const J = MOBILE_LAYOUT.joystick;
    const ATK = MOBILE_LAYOUT.attack;
    const ABILITIES = MOBILE_LAYOUT.abilities;
    const CANCEL = MOBILE_LAYOUT.cancel;

    const abilities = hero?.abilities ?? [];
    const isAiming = mobileControls.activeMobileAbility !== null;

    ctx.save();

    // ── Cancel zone (shown when an ability is being aimed) ─────────────────────
    if (isAiming) {
      ctx.beginPath();
      ctx.arc(CANCEL.cx, CANCEL.cy, CANCEL.radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(200, 50, 50, 0.25)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 80, 80, 0.75)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#ff6666';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('✕', CANCEL.cx, CANCEL.cy - 8);
      ctx.font = '9px monospace';
      ctx.fillText('CANCEL', CANCEL.cx, CANCEL.cy + 10);
    }

    // ── Joystick base ──────────────────────────────────────────────────────────
    ctx.beginPath();
    ctx.arc(J.cx, J.cy, J.baseRadius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(160, 200, 255, 0.10)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(160, 200, 255, 0.40)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // ── Joystick thumb ────────────────────────────────────────────────────────
    const thumb = mobileControls.joystickThumbPos;
    ctx.beginPath();
    ctx.arc(thumb.x, thumb.y, J.thumbRadius, 0, Math.PI * 2);
    ctx.fillStyle = mobileControls.joystickDir
      ? 'rgba(100, 180, 255, 0.65)'
      : 'rgba(100, 180, 255, 0.30)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(160, 220, 255, 0.75)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // ── Helper: draw a circular button ────────────────────────────────────────
    const drawCircleButton = (cx, cy, radius, label, bgColor, borderColor, cdFraction, isActive) => {
      // Background
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = bgColor;
      ctx.fill();

      // Cooldown arc overlay (drawn as a filled slice from the top, clockwise).
      if (cdFraction > 0) {
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        const startAngle = -Math.PI / 2;
        const endAngle = startAngle + Math.PI * 2 * cdFraction;
        ctx.arc(cx, cy, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.62)';
        ctx.fill();
      }

      // Border
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = isActive ? '#ffdc3c' : borderColor;
      ctx.lineWidth = isActive ? 3 : 2;
      ctx.stroke();

      // Label text
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (cdFraction > 0) {
        // Cooldown countdown number
        const ability = abilities.find((a) => a.key === label);
        if (ability) {
          ctx.fillStyle = '#ffaa66';
          ctx.font = `bold ${Math.round(radius * 0.55)}px monospace`;
          ctx.fillText(ability.currentCooldown.toFixed(1), cx, cy);
        } else {
          ctx.fillStyle = '#ffaa66';
          ctx.font = `bold ${Math.round(radius * 0.55)}px monospace`;
          ctx.fillText(label, cx, cy);
        }
      } else {
        ctx.fillStyle = isActive ? '#ffdc3c' : '#e8f0ff';
        ctx.font = `bold ${Math.round(radius * 0.62)}px monospace`;
        ctx.fillText(label, cx, cy);
      }
    };

    // ── Attack button ─────────────────────────────────────────────────────────
    drawCircleButton(
      ATK.cx, ATK.cy, ATK.radius,
      'ATK',
      'rgba(255, 160, 50, 0.28)',
      'rgba(255, 180, 80, 0.75)',
      0,   // attack has no cooldown display
      false
    );

    // ── Ability buttons ───────────────────────────────────────────────────────
    for (const btn of ABILITIES) {
      const ability = abilities.find((a) => a.key === btn.key);
      const cooldown = ability?.cooldown ?? 1;
      const current = ability?.currentCooldown ?? 0;
      const cdFraction = current > 0 ? current / cooldown : 0;
      const isActive = selectedKey === btn.key;
      const isHeld = mobileControls.activeMobileAbility === btn.key;

      // R button gets a slightly different colour to emphasise it.
      const bgColor = btn.key === 'R'
        ? 'rgba(180, 60, 220, 0.28)'
        : 'rgba(60, 120, 220, 0.28)';
      const borderColor = cdFraction > 0
        ? 'rgba(120, 120, 180, 0.55)'
        : (btn.key === 'R' ? 'rgba(200, 100, 255, 0.80)' : 'rgba(100, 160, 255, 0.80)');

      drawCircleButton(
        btn.cx, btn.cy, btn.radius,
        btn.key,
        bgColor,
        borderColor,
        cdFraction,
        isActive || isHeld
      );
    }

    ctx.restore();
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
