// Ability system: defines hero abilities (Q/F/E/R) and their cast logic.
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
      // Q – Slash: short-range instant damage to nearest enemy.
      id: 'slash',
      name: 'Slash',
      key: 'Q',
      cooldown: 5,
      currentCooldown: 0,
      castRange: 80,
      castType: 'instant',
      damage: 30,
    },
    {
      // F – Dash: instant movement burst in the hero's last movement direction.
      id: 'dash',
      name: 'Dash',
      key: 'F',
      cooldown: 8,
      currentCooldown: 0,
      castRange: 0,
      castType: 'dash',
      distance: 150,
    },
    {
      // E – Power Shot: rectangular projectile fired in last movement direction.
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
      // R – Smash: strong AoE instant damage to all enemies in a small radius.
      id: 'smash',
      name: 'Smash',
      key: 'R',
      cooldown: 12,
      currentCooldown: 0,
      castRange: 50,
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

// Returns the nearest enemy within castRange, or null if none is found.
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

// Returns all enemies whose centre is within castRange of the hero.
function findEnemiesInRange(hero, entities, castRange) {
  const rangeSq = castRange * castRange;
  return entities.filter(
    (entity) => isEnemyTarget(hero.team, entity) && distanceSquared(hero, entity) <= rangeSq
  );
}

// ── Individual cast implementations ──────────────────────────────────────────

// Q – Slash: deals damage to the nearest enemy in castRange.
// Returns true on a successful hit, false if no valid target is in range.
function castSlash(hero, ability, entities, vfxCtx) {
  const target = findNearestEnemy(hero, entities, ability.castRange);
  if (!target) { return false; }

  const { vfxSystem, assets, nowMs } = vfxCtx ?? {};
  const f = assets?.frames;

  // Slash arc animation at the hero's position.
  vfxSystem?.spawn('q_slash_arc', hero.x, hero.y, nowMs,
    f?.['q_slash_arc'] ?? null,
    { frameDuration: 60, width: 80, height: 80, color: '#ffffff' }
  );

  target.health = Math.max(0, target.health - ability.damage);
  if (target.health <= 0 && typeof target.alive === 'boolean') {
    target.alive = false;
  }

  // Hit spark at the struck target's position.
  vfxSystem?.spawn('q_slash_spark', target.x, target.y, nowMs,
    f?.['q_slash_spark'] ?? null,
    { frameDuration: 55, width: 48, height: 48, color: '#ffee55' }
  );

  return true;
}

// F – Dash: teleports the hero a fixed distance in their last movement direction.
// Returns true if a valid direction exists, false if the hero has never moved.
function castDash(hero, ability, vfxCtx) {
  const dir = hero.lastMoveDir;
  const mag = Math.hypot(dir.x, dir.y);
  if (mag < 0.001) { return false; }

  const startX = hero.x;
  const startY = hero.y;
  hero.x += (dir.x / mag) * ability.distance;
  hero.y += (dir.y / mag) * ability.distance;

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

  return true;
}

// E – Power Shot: creates a rectangular projectile travelling in lastMoveDir.
// Returns a projectile object to be pushed into game.projectiles, or null if
// no valid direction is available.
function castPowerShot(hero, ability, vfxCtx) {
  const dir = hero.lastMoveDir;
  const mag = Math.hypot(dir.x, dir.y);
  if (mag < 0.001) { return null; }

  const PROJECTILE_SPEED = 350; // px / s
  const proj = {
    type: 'projectile',
    x: hero.x,
    y: hero.y,
    vx: (dir.x / mag) * PROJECTILE_SPEED,
    vy: (dir.y / mag) * PROJECTILE_SPEED,
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

  return proj;
}

// R – Smash: deals heavy damage to every enemy within castRange simultaneously.
// Returns true if at least one enemy was hit, false if the area was empty.
function castSmash(hero, ability, entities, vfxCtx) {
  const targets = findEnemiesInRange(hero, entities, ability.castRange);
  if (targets.length === 0) { return false; }

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
  // Fading aftershock ground ring centred on the hero.
  vfxSystem?.spawn('r_burst_aftershock', hero.x, hero.y, nowMs,
    f?.['r_burst_aftershock'] ?? null,
    { frameDuration: 90, width: 120, height: 120, color: '#ffaa00' }
  );

  return true;
}

// ── Cast dispatcher ───────────────────────────────────────────────────────────

// Attempts to cast the ability bound to `key` (e.g. 'Q').
// `projectiles` is the game-level array; Power Shot appends to it on success.
// `vfxCtx` (optional) carries { vfxSystem, assets, nowMs } for spawning VFX.
// Returns true if the ability fired, false if the cast failed (dead hero,
// cooldown active, or no valid target / direction).
export function castAbility(hero, key, entities, projectiles, vfxCtx = null) {
  // Abilities cannot be cast while the hero is dead.
  if (!hero.alive) { return false; }

  const ability = hero.abilities?.find((a) => a.key === key);
  if (!ability) { return false; }

  // Respect the cooldown; do not cast if not yet ready.
  if (ability.currentCooldown > 0) { return false; }

  let success = false;

  if (ability.castType === 'instant') {
    success = castSlash(hero, ability, entities, vfxCtx);
  } else if (ability.castType === 'dash') {
    success = castDash(hero, ability, vfxCtx);
  } else if (ability.castType === 'projectile') {
    const projectile = castPowerShot(hero, ability, vfxCtx);
    if (projectile) {
      projectiles.push(projectile);
      success = true;
    }
  } else if (ability.castType === 'aoe') {
    success = castSmash(hero, ability, entities, vfxCtx);
  }

  // Only start the cooldown timer when the cast actually succeeds.
  if (success) {
    ability.currentCooldown = ability.cooldown;
  }

  return success;
}
