// Health system removes entities that have been defeated.
export function healthSystem(entities, nowMs) {
  for (let i = entities.length - 1; i >= 0; i -= 1) {
    const entity = entities[i];
    if (typeof entity.health === 'number' && entity.health <= 0) {
      if (entity.type === 'base') {
        entity.health = 0;
        entity.alive = false;
        continue;
      }
      if (entity.type === 'hero') {
        entity.health = 0;
        if (entity.alive) {
          entity.alive = false;
          entity.deathAtMs = nowMs;
        }
        continue;
      }
      entities.splice(i, 1);
    }
  }
}
