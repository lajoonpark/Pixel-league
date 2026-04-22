// Combat system applies simple nearest-target auto attacks.
import { distanceSquared } from '../utils.js';

export function combatSystem(entities, nowMs, attackRange) {
  const rangeSq = attackRange * attackRange;

  for (const attacker of entities) {
    if (typeof attacker.damage !== 'number' || typeof attacker.attackCooldownMs !== 'number') {
      continue;
    }
    if (nowMs - attacker.lastAttackAt < attacker.attackCooldownMs) {
      continue;
    }

    let target = null;
    let bestDist = Infinity;

    for (const candidate of entities) {
      if (candidate === attacker || candidate.team === attacker.team || candidate.hp <= 0) {
        continue;
      }
      const dist = distanceSquared(attacker, candidate);
      if (dist <= rangeSq && dist < bestDist) {
        bestDist = dist;
        target = candidate;
      }
    }

    if (target) {
      target.hp -= attacker.damage;
      attacker.lastAttackAt = nowMs;
    }
  }
}
