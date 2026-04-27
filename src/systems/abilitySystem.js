// Ability system: defines hero abilities (Q/W/E/R) and their cast logic.
// Each ability is a plain data object; cast logic is handled by pure functions
// so the system is easy to extend with new hero kits.
import { distanceSquared } from '../utils.js';

// ── Ability definitions ───────────────────────────────────────────────────────

// Returns the initial ability set for a hero.  Each ability carries:
//   id, name, key, cooldown (seconds), currentCooldown, castRange, castType,
//   plus any extra fields required by its castType.
export function createHeroAbilities() {
  return [
    {
      // Q – Slash: short-range directional damage in a hit area at the cast endpoint.
      id: 'slash',
      name: 'Slash',
      key: 'Q',
      cooldown: 5,
      currentCooldown: 0,
      castRange: 80,
      // Radius of the hit-area circle placed at the end of the slash.
      hitRadius: 35,
      castType: 'instant',
      damage: 30,
    },
    {
      // W – Dash: instant movement burst toward the targeted mouse position.
      id: 'dash',
      name: 'Dash',
      key: 'W',
      cooldown: 8,
      currentCooldown: 0,
      castRange: 0,
      castType: 'dash',
      distance: 150,
    },
    {
      // E – Power Shot: rectangular projectile fired toward the targeted mouse position.
      id: 'powerShot',
      name: 'Power Shot',
      key: 'E',
      cooldown: 6,
      currentCooldown: 0,
      castRange: 400,
      castType: 'projectile',
      damage: 35,
    },
    {
      // R – Energy Burst: AoE explosion at the targeted mouse position within cast range.
      id: 'smash',
      name: 'Energy Burst',
      key: 'R',
      cooldown: 12,
      currentCooldown: 0,
      // How far from the hero the AoE center can be placed.
      castRange: 200,
      // Radius of the explosion at the target point.
      aoeRadius: 80,
      castType: 'aoe',
      damage: 60,
    },
  ];
}

// ── Cooldown management ───────────────────────────────────────────────────────

// Tick all ability cooldowns down by dtSeconds.  Safe to call while hero is dead.
export function updateAbilityCooldowns(hero, dtSeconds) {
  for (const ability of hero.abilities) {
    if (ability.currentCooldown > 0) {
      ability.currentCooldown = Math.max(0, ability.currentCooldown - dtSeconds);
    }
  }
}

// ── Targeting helpers ─────────────────────────────────────────────────────────

// True when entity is a living enemy (relative to `attackerTeam`) that hero
// abilities can target.
function isEnemyTarget(attackerTeam, entity) {
  return entity.team !== attackerTeam
    && entity.alive !== false
    && entity.health > 0
    && (entity.type === 'minion' || entity.type === 'tower' || entity.type === 'base');
}

// Returns the nearest enemy within castRange of the hero, or null if none found.
function findNearestEnemy(hero, entities, castRange) {
  const rangeSq = castRange * castRange;
  let nearest = null;
  let nearestDistSq = Infinity;

  for (const entity of entities) {
    if (!isEnemyTarget(hero.team, entity)) { continue; }
    const dSq = distanceSquared(hero, entity);
    if (dSq <= rangeSq && dSq < nearestDistSq) {
      nearestDistSq = dSq;
      nearest = entity;
    }
  }
  return nearest;
}

// Returns all enemies whose centre is within `radius` of world point (cx, cy).
function findEnemiesNearPoint(attackerTeam, entities, cx, cy, radius) {
  const rSq = radius * radius;
  return entities.filter((entity) => {
    if (!isEnemyTarget(attackerTeam, entity)) { return false; }
    const dx = entity.x - cx;
    const dy = entity.y - cy;
    return dx * dx + dy * dy <= rSq;
  });
}

// Returns all enemies whose centre is within castRange of the hero.
function findEnemiesInRange(hero, entities, castRange) {
  const rangeSq = castRange * castRange;
  return entities.filter(
    (entity) => isEnemyTarget(hero.team, entity) && distanceSquared(hero, entity) <= rangeSq
  );
}

// Computes a normalised direction from hero toward targetPoint.
// Falls back to hero.lastMoveDir when targetPoint is null or too close.
function directionToTarget(hero, targetPoint) {
  if (targetPoint) {
    const dx = targetPoint.x - hero.x;
    const dy = targetPoint.y - hero.y;
    const mag = Math.hypot(dx, dy);
    if (mag > 0.001) {
      return { x: dx / mag, y: dy / mag };
    }
  }
  return hero.lastMoveDir ?? { x: 1, y: 0 };
}

// ── Individual cast implementations ──────────────────────────────────────────

// Q – Slash: casts toward the targetPoint direction, damaging enemies within a
// hit-area circle placed at the slash endpoint (castRange pixels away).
// Always succeeds as long as the direction is valid; may deal no damage if the
// area is empty.
function castSlash(hero, ability, entities, targetPoint, vfxCtx) {
  const dir = directionToTarget(hero, targetPoint);

  // Hit-area circle centre at the slash endpoint.
  const hitX = hero.x + dir.x * ability.castRange;
  const hitY = hero.y + dir.y * ability.castRange;
  const hitRadius = ability.hitRadius ?? 35;

  const { vfxSystem, assets, nowMs } = vfxCtx ?? {};
  const f = assets?.frames;

  // Slash arc animation at the hero's position.
  vfxSystem?.spawn('q_slash_arc', hero.x, hero.y, nowMs,
    f?.['q_slash_arc'] ?? null,
    { frameDuration: 60, width: 80, height: 80, color: '#ffffff' }
  );

  const targets = findEnemiesNearPoint(hero.team, entities, hitX, hitY, hitRadius);
  for (const target of targets) {
    target.health = Math.max(0, target.health - ability.damage);
    if (target.health <= 0 && typeof target.alive === 'boolean') {
      target.alive = false;
    }
    // Hit spark at the struck target's position.
    vfxSystem?.spawn('q_slash_spark', target.x, target.y, nowMs,
      f?.['q_slash_spark'] ?? null,
      { frameDuration: 55, width: 48, height: 48, color: '#ffee55' }
    );
  }

  // Update last move direction so subsequent abilities point the same way.
  hero.lastMoveDir = dir;
  return true;
}

// W – Dash: teleports the hero toward targetPoint up to the ability's max distance.
// Returns true if the direction is valid, false if no direction can be derived.
function castDash(hero, ability, targetPoint, vfxCtx) {
  const dir = directionToTarget(hero, targetPoint);
  const mag = Math.hypot(dir.x, dir.y);
  if (mag < 0.001) { return false; }

  const startX = hero.x;
  const startY = hero.y;

  // Clamp actual dash distance to max and in the direction of the mouse.
  let dashDist = ability.distance;
  if (targetPoint) {
    const toTarget = Math.hypot(targetPoint.x - hero.x, targetPoint.y - hero.y);
    dashDist = Math.min(toTarget, ability.distance);
  }

  hero.x += dir.x * dashDist;
  hero.y += dir.y * dashDist;

  const { vfxSystem, assets, nowMs } = vfxCtx ?? {};
  const f = assets?.frames;

  // Dust at dash origin.
  vfxSystem?.spawn('f_dash_start', startX, startY, nowMs,
    f?.['f_dash_start'] ?? null,
    { frameDuration: 60, width: 48, height: 48, color: '#aaddff' }
  );
  // Trail puffs along the dash path (3 intermediate points).
  const trailSteps = 3;
  for (let i = 1; i <= trailSteps; i++) {
    const t = i / (trailSteps + 1);
    vfxSystem?.spawn('f_dash_trail',
      startX + (hero.x - startX) * t,
      startY + (hero.y - startY) * t,
      nowMs,
      f?.['f_dash_trail'] ?? null,
      { frameDuration: 50, width: 40, height: 40, color: '#88ccff' }
    );
  }
  // Dust at dash destination.
  vfxSystem?.spawn('f_dash_end', hero.x, hero.y, nowMs,
    f?.['f_dash_end'] ?? null,
    { frameDuration: 55, width: 48, height: 48, color: '#aaddff' }
  );

  // Update last move direction so future casts point the same way.
  hero.lastMoveDir = dir;
  return true;
}

// E – Power Shot: fires a projectile toward the targetPoint.
// Returns a projectile object to be pushed into game.projectiles, or null if
// no valid direction is available.
function castPowerShot(hero, ability, targetPoint, vfxCtx) {
  const dir = directionToTarget(hero, targetPoint);
  const mag = Math.hypot(dir.x, dir.y);
  if (mag < 0.001) { return null; }

  const PROJECTILE_SPEED = 350; // px / s
  const proj = {
    type: 'projectile',
    x: hero.x,
    y: hero.y,
    vx: dir.x * PROJECTILE_SPEED,
    vy: dir.y * PROJECTILE_SPEED,
    width: 12,
    height: 8,
    damage: ability.damage,
    team: hero.team,
    alive: true,
    maxTravelDistance: ability.castRange,
    traveledDistance: 0,
    color: '#ffdd44',
  };

  const { vfxSystem, assets, nowMs } = vfxCtx ?? {};
  const f = assets?.frames;

  // Charge effect at the hero's cast position.
  vfxSystem?.spawn('e_blast_charge', hero.x, hero.y, nowMs,
    f?.['e_blast_charge'] ?? null,
    { frameDuration: 70, width: 48, height: 48, color: '#44ff88' }
  );
  // Attach looping sprite frames to the projectile for in-flight animation.
  proj.animFrames = f?.['e_blast_projectile'] ?? null;
  proj.animFrameDuration = 80;
  proj.animStartMs = nowMs;
  // On-hit callback spawns the impact explosion VFX.
  if (vfxSystem) {
    proj.onHit = (hitX, hitY, hitNowMs) => {
      vfxSystem.spawn('e_blast_impact', hitX, hitY, hitNowMs,
        f?.['e_blast_impact'] ?? null,
        { frameDuration: 70, width: 64, height: 64, color: '#ff8800' }
      );
    };
  }

  // Update last move direction so future casts point the same way.
  hero.lastMoveDir = dir;
  return proj;
}

// R – Energy Burst: AoE explosion at targetPoint if within castRange of the hero.
// Falls back to hero position when targetPoint is null.
// Returns true if at least one enemy was hit or the cast was valid, false on range miss.
function castSmash(hero, ability, entities, targetPoint, vfxCtx) {
  // Determine AoE center: clamp targetPoint to castRange from hero.
  let aoeX = hero.x;
  let aoeY = hero.y;
  if (targetPoint) {
    const dx = targetPoint.x - hero.x;
    const dy = targetPoint.y - hero.y;
    const dist = Math.hypot(dx, dy);
    if (dist > ability.castRange) {
      // Target out of range – reject cast.
      return false;
    }
    aoeX = targetPoint.x;
    aoeY = targetPoint.y;
  }

  const aoeRadius = ability.aoeRadius ?? ability.castRange;
  const targets = findEnemiesNearPoint(hero.team, entities, aoeX, aoeY, aoeRadius);

  for (const target of targets) {
    target.health = Math.max(0, target.health - ability.damage);
    if (target.health <= 0 && typeof target.alive === 'boolean') {
      target.alive = false;
    }
  }

  const { vfxSystem, assets, nowMs } = vfxCtx ?? {};
  const f = assets?.frames;

  // Charge burst at the hero's position.
  vfxSystem?.spawn('r_burst_charge', hero.x, hero.y, nowMs,
    f?.['r_burst_charge'] ?? null,
    { frameDuration: 75, width: 80, height: 80, color: '#ff44ff' }
  );
  // Explosion on each struck target.
  for (const target of targets) {
    vfxSystem?.spawn('r_burst_explosion', target.x, target.y, nowMs,
      f?.['r_burst_explosion'] ?? null,
      { frameDuration: 70, width: 80, height: 80, color: '#ff4400' }
    );
  }
  // Fading aftershock ground ring at the AoE center.
  vfxSystem?.spawn('r_burst_aftershock', aoeX, aoeY, nowMs,
    f?.['r_burst_aftershock'] ?? null,
    { frameDuration: 90, width: aoeRadius * 2, height: aoeRadius * 2, color: '#ffaa00' }
  );

  return true;
}

// ── Cast dispatcher ───────────────────────────────────────────────────────────

// Attempts to cast the ability bound to `key` (e.g. 'Q').
// `projectiles` is the game-level array; Power Shot appends to it on success.
// `vfxCtx` (optional) carries { vfxSystem, assets, nowMs } for spawning VFX.
// `targetPoint` (optional) is the world-space {x, y} position the player aimed at
//   (e.g. mouse position converted from screen to world coords).  When omitted the
//   ability falls back to hero.lastMoveDir for directional casts.
// Returns true if the ability fired, false if the cast failed (dead hero,
// cooldown active, or invalid target / direction).
export function castAbility(hero, key, entities, projectiles, vfxCtx = null, targetPoint = null) {
  // Abilities cannot be cast while the hero is dead.
  if (!hero.alive) { return false; }

  const ability = hero.abilities?.find((a) => a.key === key);
  if (!ability) { return false; }

  // Respect the cooldown; do not cast if not yet ready.
  if (ability.currentCooldown > 0) { return false; }

  let success = false;

  if (ability.castType === 'instant') {
    success = castSlash(hero, ability, entities, targetPoint, vfxCtx);
  } else if (ability.castType === 'dash') {
    success = castDash(hero, ability, targetPoint, vfxCtx);
  } else if (ability.castType === 'projectile') {
    const projectile = castPowerShot(hero, ability, targetPoint, vfxCtx);
    if (projectile) {
      projectiles.push(projectile);
      success = true;
    }
  } else if (ability.castType === 'aoe') {
    success = castSmash(hero, ability, entities, targetPoint, vfxCtx);
  }

  // Only start the cooldown timer when the cast actually succeeds.
  if (success) {
    ability.currentCooldown = ability.cooldown;
  }

  return success;
}
