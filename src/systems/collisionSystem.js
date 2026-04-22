// Collision system enforces simple world boundary constraints.
import { clamp } from '../utils.js';

// Minimum overlap in pixels before applying separation.
const MIN_OVERLAP_TO_RESOLVE = 1.5;
// Maximum dynamic unit separation applied per frame, in pixels.
const MAX_DYNAMIC_SEPARATION_PER_STEP = 4;
// Maximum placeholder-vs-hero correction applied per frame, in pixels.
const MAX_STATIC_SEPARATION_PER_STEP = 6;
// Relative separation weights (higher = receives more correction movement).
const HERO_COLLISION_WEIGHT = 0.85;
const MINION_COLLISION_WEIGHT = 0.5;

function isActiveEntity(entity) {
  if (!entity || typeof entity.x !== 'number' || typeof entity.y !== 'number') {
    return false;
  }

  if (entity.type !== 'minion') {
    return true;
  }

  return entity.alive && entity.health > 0;
}

function getWeight(entity) {
  // Keep hero collision simple and avoid unrealistic hero shove behavior.
  // The hero yields more than minions during overlap correction.
  return entity.type === 'hero' ? HERO_COLLISION_WEIGHT : MINION_COLLISION_WEIGHT;
}

function resolveDynamicOverlap(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const overlapX = (a.width + b.width) / 2 - Math.abs(dx);
  const overlapY = (a.height + b.height) / 2 - Math.abs(dy);

  if (overlapX <= MIN_OVERLAP_TO_RESOLVE || overlapY <= MIN_OVERLAP_TO_RESOLVE) {
    return;
  }

  const weightA = getWeight(a);
  const weightB = getWeight(b);
  const weightTotal = weightA + weightB;
  const ratioA = weightA / weightTotal;
  const ratioB = weightB / weightTotal;

  if (overlapX < overlapY) {
    const direction = dx >= 0 ? 1 : -1;
    const correction = Math.min(overlapX - MIN_OVERLAP_TO_RESOLVE, MAX_DYNAMIC_SEPARATION_PER_STEP);
    a.x -= direction * correction * ratioA;
    b.x += direction * correction * ratioB;
    return;
  }

  const direction = dy >= 0 ? 1 : -1;
  const correction = Math.min(overlapY - MIN_OVERLAP_TO_RESOLVE, MAX_DYNAMIC_SEPARATION_PER_STEP);
  a.y -= direction * correction * ratioA;
  b.y += direction * correction * ratioB;
}

function resolveStaticOverlap(entity, obstacle) {
  const dx = entity.x - obstacle.x;
  const dy = entity.y - obstacle.y;
  const overlapX = (entity.width + obstacle.width) / 2 - Math.abs(dx);
  const overlapY = (entity.height + obstacle.height) / 2 - Math.abs(dy);

  if (overlapX <= MIN_OVERLAP_TO_RESOLVE || overlapY <= MIN_OVERLAP_TO_RESOLVE) {
    return;
  }

  if (overlapX < overlapY) {
    const correction = Math.min(overlapX - MIN_OVERLAP_TO_RESOLVE, MAX_STATIC_SEPARATION_PER_STEP);
    entity.x += dx >= 0 ? correction : -correction;
    return;
  }

  const correction = Math.min(overlapY - MIN_OVERLAP_TO_RESOLVE, MAX_STATIC_SEPARATION_PER_STEP);
  entity.y += dy >= 0 ? correction : -correction;
}

function getPlaceholderColliders(map) {
  const colliders = [];
  for (const lane of map.lanes ?? []) {
    for (const towerSlot of lane.placeholders?.towerSlots ?? []) {
      colliders.push(towerSlot);
    }
    for (const baseSlot of lane.placeholders?.baseSlots ?? []) {
      colliders.push(baseSlot);
    }
  }
  return colliders;
}

function clampToWorld(entity, map) {
  const minX = map.x + entity.width / 2;
  const maxX = map.x + map.width - entity.width / 2;
  const minY = map.y + entity.height / 2;
  const maxY = map.y + map.height - entity.height / 2;
  entity.x = clamp(entity.x, minX, maxX);
  entity.y = clamp(entity.y, minY, maxY);
}

export function collisionSystem(entities, map) {
  const activeEntities = entities.filter(isActiveEntity);

  for (let i = 0; i < activeEntities.length; i += 1) {
    for (let j = i + 1; j < activeEntities.length; j += 1) {
      resolveDynamicOverlap(activeEntities[i], activeEntities[j]);
    }
  }

  const placeholderColliders = getPlaceholderColliders(map);
  for (const entity of activeEntities) {
    if (entity.type !== 'hero') {
      continue;
    }
    for (const collider of placeholderColliders) {
      resolveStaticOverlap(entity, collider);
    }
  }

  for (const entity of entities) {
    clampToWorld(entity, map);
  }
}
