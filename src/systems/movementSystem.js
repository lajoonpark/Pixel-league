// Movement system updates entity positions based on velocity.
export function movementSystem(entities, dtSeconds) {
  for (const entity of entities) {
    if (entity.vx || entity.vy) {
      entity.x += entity.vx * dtSeconds;
      entity.y += entity.vy * dtSeconds;
    }
  }
}
