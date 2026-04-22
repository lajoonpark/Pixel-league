// Movement system updates entity positions based on velocity.
import { distanceSquared } from '../utils.js';

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

function updateMinionMovement(minion, map, dtSeconds) {
  if (!minion.alive || minion.health <= 0) {
    minion.vx = 0;
    minion.vy = 0;
    return;
  }

  if (minion.target) {
    const targetAlive = minion.target.health > 0 && minion.target.alive;
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
  minion.vy = 0;
  minion.x += minion.vx * dtSeconds;
  minion.y = laneCenterY;
}

export function movementSystem(entities, map, dtSeconds) {
  for (const entity of entities) {
    if (entity.type === 'minion') {
      updateMinionMovement(entity, map, dtSeconds);
      continue;
    }

    if (entity.vx || entity.vy) {
      entity.x += entity.vx * dtSeconds;
      entity.y += entity.vy * dtSeconds;
    }
  }
}
