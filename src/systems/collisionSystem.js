// Collision system enforces simple world boundary constraints.
import { clamp } from '../utils.js';

export function collisionSystem(entities, map) {
  for (const entity of entities) {
    entity.x = clamp(entity.x, entity.width / 2, map.width - entity.width / 2);
    entity.y = clamp(entity.y, entity.height / 2, map.height - entity.height / 2);
  }
}
