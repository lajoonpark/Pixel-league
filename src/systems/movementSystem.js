// Movement system updates entity positions based on velocity.
import { CONFIG } from '../config.js';
import { clamp, distanceSquared } from '../utils.js';

function getLaneForMinion(minion, map) {
  const lanes = map?.lanes ?? [];
  if (lanes.length === 0) {
    return null;
  }

  if (minion.laneId) {
    const byId = lanes.find((lane) => lane.id === minion.laneId);
    if (byId) {
      return byId;
    }
  }

  if (Number.isInteger(minion.laneIndex) && lanes[minion.laneIndex]) {
    return lanes[minion.laneIndex];
  }

  return lanes[0];
}

// Returns the nearest alive enemy tower that a minion must not advance past,
// or null if no such tower exists (all enemy towers destroyed).
function getBlockingTower(minion, entities) {
  const enemyTeam = minion.team === 'blue' ? 'red' : 'blue';
  const towers = entities.filter(
    (e) => e.type === 'tower' && e.team === enemyTeam && e.alive && e.health > 0
  );
  if (towers.length === 0) {
    return null;
  }
  if (minion.team === 'blue') {
    // Blue moves right (+x): blocked by the leftmost red tower.
    return towers.reduce((min, t) => (t.x < min.x ? t : min));
  }
  // Red moves left (-x): blocked by the rightmost blue tower.
  return towers.reduce((max, t) => (t.x > max.x ? t : max));
}

function updateMinionMovement(minion, map, dtSeconds, entities) {
  if (!minion.alive || minion.health <= 0) {
    minion.vx = 0;
    minion.vy = 0;
    return;
  }

  if (minion.target) {
    const targetAlive = minion.target.health > 0;
    const inRange = distanceSquared(minion, minion.target) <= minion.attackRange * minion.attackRange;
    if (!targetAlive || !inRange) {
      minion.target = null;
    }
  }

  if (minion.target) {
    minion.vx = 0;
    minion.vy = 0;
    return;
  }

  const lane = getLaneForMinion(minion, map);
  if (!lane) {
    return;
  }

  // Keep compatibility while lane data still exposes both start/end and point-based aliases.
  const laneCenterY = lane.start?.y ?? lane.points?.[0]?.y ?? lane.path?.[0]?.y;
  if (typeof laneCenterY !== 'number') {
    return;
  }
  const moveDirection = minion.team === 'blue' ? 1 : -1;
  minion.vx = moveDirection * minion.moveSpeed;
  const laneOffsetY = laneCenterY - minion.y;
  const laneCorrectionSpeed = minion.moveSpeed * CONFIG.minion.laneCorrection.speedRatio;
  minion.vy = clamp(
    laneOffsetY * CONFIG.minion.laneCorrection.multiplier,
    -laneCorrectionSpeed,
    laneCorrectionSpeed
  );

  // Tower-gating: a minion may not advance past the nearest alive enemy tower.
  // Once that tower is destroyed, the minion can reach the next objective.
  const blocking = getBlockingTower(minion, entities);
  const newX = minion.x + minion.vx * dtSeconds;
  if (blocking) {
    // The limit is the near face of the tower minus a tiny gap.
    const limit = blocking.x - moveDirection * (blocking.width / 2 + minion.width / 2 + 1);
    minion.x = moveDirection > 0 ? Math.min(newX, limit) : Math.max(newX, limit);
  } else {
    minion.x = newX;
  }
  minion.y += minion.vy * dtSeconds;
}

export function movementSystem(entities, map, dtSeconds) {
  for (const entity of entities) {
    if (entity.type === 'minion') {
      updateMinionMovement(entity, map, dtSeconds, entities);
      continue;
    }

    if (entity.vx || entity.vy) {
      entity.x += entity.vx * dtSeconds;
      entity.y += entity.vy * dtSeconds;
    }
  }
}
