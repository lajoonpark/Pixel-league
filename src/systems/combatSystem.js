// Combat system applies simple nearest-target auto attacks for minions.
import { distanceSquared } from '../utils.js';

function isLivingMinion(entity) {
  return entity?.type === 'minion' && entity.alive && entity.health > 0;
}

function isLivingTower(entity) {
  return entity?.type === 'tower' && entity.alive && entity.health > 0;
}

function isCombatAttacker(entity) {
  return isLivingMinion(entity) || isLivingTower(entity);
}

function isValidTarget(attacker, target) {
  return isLivingMinion(target) && target.team !== attacker.team;
}

function getAttackCooldown(attacker) {
  return attacker.attackCooldown ?? attacker.attackCooldownMs ?? 0;
}

export function combatSystem(entities, nowMs) {
  for (const attacker of entities) {
    if (!isCombatAttacker(attacker)) {
      continue;
    }

    const attackRangeSq = attacker.attackRange * attacker.attackRange;
    const currentTargetInRange = (
      isValidTarget(attacker, attacker.target)
      && distanceSquared(attacker, attacker.target) <= attackRangeSq
    );

    let nearestTarget = currentTargetInRange ? attacker.target : null;
    let nearestDistanceSq = currentTargetInRange
      ? distanceSquared(attacker, attacker.target)
      : Infinity;

    for (const candidate of entities) {
      if (!isValidTarget(attacker, candidate)) {
        continue;
      }
      if (candidate === attacker.target && currentTargetInRange) {
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

    if (nowMs - attacker.lastAttackAt < getAttackCooldown(attacker)) {
      continue;
    }

    attacker.target.health = Math.max(0, attacker.target.health - attacker.attackDamage);
    if (attacker.target.health <= 0 && typeof attacker.target.alive === 'boolean') {
      attacker.target.alive = false;
    }
    attacker.lastAttackAt = nowMs;
  }
}
