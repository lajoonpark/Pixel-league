// Combat system applies simple nearest-target auto attacks for minions.
import { distanceSquared } from '../utils.js';

function isLivingMinion(entity) {
  return entity?.type === 'minion' && entity.alive && entity.health > 0;
}

function isValidTarget(attacker, target) {
  return isLivingMinion(target) && target.team !== attacker.team;
}

export function combatSystem(entities, nowMs) {
  for (const attacker of entities) {
    if (!isLivingMinion(attacker)) {
      continue;
    }

    if (!isValidTarget(attacker, attacker.target)) {
      attacker.target = null;
    }

    const attackRangeSq = attacker.attackRange * attacker.attackRange;
    let nearestTarget = null;
    let nearestDistanceSq = Infinity;

    for (const candidate of entities) {
      if (!isValidTarget(attacker, candidate)) {
        continue;
      }

      const distSq = distanceSquared(attacker, candidate);
      if (distSq <= attackRangeSq && distSq < nearestDistanceSq) {
        nearestDistanceSq = distSq;
        nearestTarget = candidate;
      }
    }

    attacker.target = nearestTarget;
    if (!attacker.target) {
      continue;
    }

    if (nowMs - attacker.lastAttackAt < attacker.attackCooldownMs) {
      continue;
    }

    attacker.target.health = Math.max(0, attacker.target.health - attacker.attackDamage);
    attacker.lastAttackAt = nowMs;
  }
}
