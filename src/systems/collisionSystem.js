// Collision system enforces simple world boundary constraints.
import { clamp } from '../utils.js';

export function collisionSystem(entities, map) {
  for (const entity of entities) {
    const minX = map.x + entity.width / 2;
    const maxX = map.x + map.width - entity.width / 2;
    const minY = map.y + entity.height / 2;
    const maxY = map.y + map.height - entity.height / 2;
    entity.x = clamp(entity.x, minX, maxX);
    entity.y = clamp(entity.y, minY, maxY);
  }
}
