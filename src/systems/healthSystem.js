// Health system removes entities that have been defeated.
export function healthSystem(entities) {
  for (let i = entities.length - 1; i >= 0; i -= 1) {
    const entity = entities[i];
    if (typeof entity.health === 'number' && entity.health <= 0) {
      entity.health = 0;
      if (typeof entity.alive === 'boolean') {
        entity.alive = false;
      }
      entities.splice(i, 1);
    }
  }
}
