// Health system removes entities that have been defeated.
export function healthSystem(entities) {
  for (let i = entities.length - 1; i >= 0; i -= 1) {
    const entity = entities[i];
    if (typeof entity.hp === 'number' && entity.hp <= 0) {
      entities.splice(i, 1);
    }
  }
}
