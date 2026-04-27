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
function castSlash(hero, ability, entities) {
  const target = findNearestEnemy(hero, entities, ability.castRange);
  if (!target) { return false; }

  target.health = Math.max(0, target.health - ability.damage);
  if (target.health <= 0 && typeof target.alive === 'boolean') {
    target.alive = false;
  }
  return true;
}

// F – Dash: teleports the hero a fixed distance in their last movement direction.
// Returns true if a valid direction exists, false if the hero has never moved.
function castDash(hero, ability) {
  const dir = hero.lastMoveDir;
  const mag = Math.hypot(dir.x, dir.y);
  if (mag < 0.001) { return false; }

  hero.x += (dir.x / mag) * ability.distance;
  hero.y += (dir.y / mag) * ability.distance;
  return true;
}

// E – Power Shot: creates a rectangular projectile travelling in lastMoveDir.
// Returns a projectile object to be pushed into game.projectiles, or null if
// no valid direction is available.
function castPowerShot(hero, ability) {
  const dir = hero.lastMoveDir;
  const mag = Math.hypot(dir.x, dir.y);
  if (mag < 0.001) { return null; }

  const PROJECTILE_SPEED = 350; // px / s
  return {
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
}

// R – Smash: deals heavy damage to every enemy within castRange simultaneously.
// Returns true if at least one enemy was hit, false if the area was empty.
function castSmash(hero, ability, entities) {
  const targets = findEnemiesInRange(hero, entities, ability.castRange);
  if (targets.length === 0) { return false; }

  for (const target of targets) {
    target.health = Math.max(0, target.health - ability.damage);
    if (target.health <= 0 && typeof target.alive === 'boolean') {
      target.alive = false;
    }
  }
  return true;
}

// ── Cast dispatcher ───────────────────────────────────────────────────────────

// Attempts to cast the ability bound to `key` (e.g. 'Q').
// `projectiles` is the game-level array; Power Shot appends to it on success.
// Returns true if the ability fired, false if the cast failed (dead hero,
// cooldown active, or no valid target / direction).
export function castAbility(hero, key, entities, projectiles) {
  // Abilities cannot be cast while the hero is dead.
  if (!hero.alive) { return false; }

  const ability = hero.abilities?.find((a) => a.key === key);
  if (!ability) { return false; }

  // Respect the cooldown; do not cast if not yet ready.
  if (ability.currentCooldown > 0) { return false; }

  let success = false;

  if (ability.castType === 'instant') {
    success = castSlash(hero, ability, entities);
  } else if (ability.castType === 'dash') {
    success = castDash(hero, ability);
  } else if (ability.castType === 'projectile') {
    const projectile = castPowerShot(hero, ability);
    if (projectile) {
      projectiles.push(projectile);
      success = true;
    }
  } else if (ability.castType === 'aoe') {
    success = castSmash(hero, ability, entities);
  }

  // Only start the cooldown timer when the cast actually succeeds.
  if (success) {
    ability.currentCooldown = ability.cooldown;
  }

  return success;
}
