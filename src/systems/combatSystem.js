// Combat system applies simple nearest-target auto attacks for minions.
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

function isCombatAttacker(entity) {
  return isLivingMinion(entity) || isLivingTower(entity) || isLivingHero(entity);
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

function getAttackCooldown(attacker) {
  return attacker.attackCooldown ?? attacker.attackCooldownMs ?? 0;
}

function getLastAttackTime(attacker) {
  return attacker.lastAttackTime ?? attacker.lastAttackAt ?? 0;
}

function setLastAttackTime(attacker, nowMs) {
  if ('lastAttackTime' in attacker) {
    attacker.lastAttackTime = nowMs;
    return;
  }
  attacker.lastAttackAt = nowMs;
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

    if (nowMs - getLastAttackTime(attacker) < getAttackCooldown(attacker)) {
      continue;
    }

    attacker.target.health = Math.max(0, attacker.target.health - attacker.attackDamage);
    if (attacker.target.health <= 0 && typeof attacker.target.alive === 'boolean') {
      attacker.target.alive = false;
    }
    setLastAttackTime(attacker, nowMs);
  }
}
