// Movement system updates entity positions based on velocity.
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
    return;
  }

  const lane = getLaneForMinion(minion, map);
  if (!lane) {
    return;
  }

  const laneCenterY = lane.start.y;
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
