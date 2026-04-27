// Combat system applies auto-attacks with targeting priority rules.
import { distanceSquared } from '../utils.js';

function isLivingMinion(entity) {
  return entity?.type === 'minion' && entity.alive && entity.health > 0;
}

function isLivingTower(entity) {
  return entity?.type === 'tower' && entity.alive && entity.health > 0;
}

function isLivingBase(entity) {
  return entity?.type === 'base' && entity.alive && entity.health > 0;
}

function isLivingHero(entity) {
  return entity?.type === 'hero' && entity.alive && entity.health > 0;
}

// Towers, bases, minions and the hero all participate in combat as attackers.
function isCombatAttacker(entity) {
  return isLivingMinion(entity) || isLivingTower(entity) || isLivingHero(entity) || isLivingBase(entity);
}

function isValidTarget(attacker, target) {
  if (!target || target.team === attacker.team) {
    return false;
  }

  return (
    isLivingMinion(target)
    || isLivingTower(target)
    || isLivingBase(target)
    || isLivingHero(target)
  );
}

// True when enemy towers are still alive (minions may not target the base yet).
function hasAliveEnemyTowers(attacker, entities) {
  const enemyTeam = attacker.team === 'blue' ? 'red' : 'blue';
  return entities.some((e) => isLivingTower(e) && e.team === enemyTeam);
}

function getAttackCooldown(attacker) {
  return attacker.attackCooldownMs ?? attacker.attackCooldown ?? 0;
}

function getLastAttackTime(attacker) {
  return attacker.lastAttackMs ?? attacker.lastAttackTime ?? attacker.lastAttackAt ?? 0;
}

function setLastAttackTime(attacker, nowMs) {
  attacker.lastAttackMs = nowMs;
}

// Returns the nearest enemy to world point (px, py) within searchRadius that
// the hero (identified by attackerTeam) can basic-attack.
// Returns null when no valid target is found.
export function findEnemyNearPoint(entities, px, py, searchRadius, attackerTeam) {
  const rSq = searchRadius * searchRadius;
  let nearest = null;
  let nearestDistSq = Infinity;

  for (const entity of entities) {
    if (entity.team === attackerTeam) { continue; }
    if (
      !isLivingMinion(entity)
      && !isLivingTower(entity)
      && !isLivingBase(entity)
    ) { continue; }

    const dx = entity.x - px;
    const dy = entity.y - py;
    const dSq = dx * dx + dy * dy;
    if (dSq <= rSq && dSq < nearestDistSq) {
      nearestDistSq = dSq;
      nearest = entity;
    }
  }

  return nearest;
}

// Selects the best target for the given attacker within attackRangeSq.
// Towers and bases always prefer the nearest minion; they only fall back to
// the hero when no minion is in range.  Minions may not target the enemy base
// while any enemy tower is still standing.  The hero has no restrictions.
function findBestTarget(attacker, entities, attackRangeSq) {
  const isStructure = attacker.type === 'tower' || attacker.type === 'base';
  const isMinion = attacker.type === 'minion';
  const enemyTowersAlive = isMinion ? hasAliveEnemyTowers(attacker, entities) : false;

  let bestMinion = null;
  let bestMinionDistSq = Infinity;
  let bestOther = null;
  let bestOtherDistSq = Infinity;

  for (const candidate of entities) {
    if (!isValidTarget(attacker, candidate)) {
      continue;
    }

    // Minions cannot target the enemy base until all enemy towers are destroyed.
    if (isMinion && candidate.type === 'base' && enemyTowersAlive) {
      continue;
    }

    const distSq = distanceSquared(attacker, candidate);
    if (distSq > attackRangeSq) {
      continue;
    }

    if (isLivingMinion(candidate)) {
      if (distSq < bestMinionDistSq) {
        bestMinionDistSq = distSq;
        bestMinion = candidate;
      }
    } else {
      if (distSq < bestOtherDistSq) {
        bestOtherDistSq = distSq;
        bestOther = candidate;
      }
    }
  }

  if (isStructure) {
    // Structures always prefer minions over every other target type.
    return bestMinion ?? bestOther;
  }

  // Hero and minions: pick the nearest valid target regardless of type.
  if (bestMinionDistSq <= bestOtherDistSq) {
    return bestMinion;
  }
  return bestOther;
}

export function combatSystem(entities, nowMs) {
  for (const attacker of entities) {
    if (!isCombatAttacker(attacker)) {
      continue;
    }

    if (attacker.type === 'hero') {
      const heroAttackRequested = attacker.isAttackRequested;
      attacker.isAttackRequested = false;
      if (!heroAttackRequested) {
        continue;
      }
    }

    const attackRangeSq = attacker.attackRange * attacker.attackRange;

    // Re-evaluate target every frame so priority rules are always applied.
    attacker.target = findBestTarget(attacker, entities, attackRangeSq);

    if (!attacker.target) {
      continue;
    }

    if (nowMs - getLastAttackTime(attacker) < getAttackCooldown(attacker)) {
      continue;
    }

    attacker.target.health = Math.max(0, attacker.target.health - attacker.attackDamage);
    if (attacker.target.health <= 0 && typeof attacker.target.alive === 'boolean') {
      attacker.target.alive = false;
    }
    setLastAttackTime(attacker, nowMs);
    // Let the hero carry the hit target so game.js can spawn a hit-spark effect.
    if (attacker.type === 'hero') {
      attacker.pendingHitTarget = attacker.target;
    }
    // Tag towers and bases so game.js can spawn the energy-blast projectile effect.
    if ((attacker.type === 'tower' || attacker.type === 'base') && attacker.target) {
      attacker.pendingBlastTarget = { x: attacker.target.x, y: attacker.target.y };
    }
  }
}
