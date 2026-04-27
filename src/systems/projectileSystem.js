// Projectile system: moves hero-fired projectiles and resolves entity collisions.
// Projectile objects are kept in a separate array (game.projectiles) so they
// remain independent from the entity pipeline.

// True when two axis-aligned rectangles (centre-anchored) overlap.
function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return (
    ax - aw / 2 < bx + bw / 2
    && ax + aw / 2 > bx - bw / 2
    && ay - ah / 2 < by + bh / 2
    && ay + ah / 2 > by - bh / 2
  );
}

// True when entity is a living enemy that a projectile from `team` can hit.
function isHittableEnemy(team, entity) {
  return entity.team !== team
    && entity.alive !== false
    && entity.health > 0
    && (entity.type === 'minion' || entity.type === 'tower' || entity.type === 'base');
}

// Advance all live projectiles by dtSeconds, apply collision damage, and
// compact the array by removing any projectile that has expired or hit a target.
// The array is mutated in-place so the reference held by game.js stays valid.
export function updateProjectiles(projectiles, entities, dtSeconds) {
  for (const proj of projectiles) {
    if (!proj.alive) { continue; }

    const stepX = proj.vx * dtSeconds;
    const stepY = proj.vy * dtSeconds;
    proj.x += stepX;
    proj.y += stepY;
    proj.traveledDistance += Math.hypot(stepX, stepY);

    // Expire when the projectile has travelled its maximum distance.
    if (proj.traveledDistance >= proj.maxTravelDistance) {
      proj.alive = false;
      continue;
    }

    // Check for a hit against every hittable enemy entity.  The projectile is
    // consumed on the first hit so it cannot chain through multiple targets.
    for (const entity of entities) {
      if (!isHittableEnemy(proj.team, entity)) { continue; }
      if (rectsOverlap(proj.x, proj.y, proj.width, proj.height, entity.x, entity.y, entity.width, entity.height)) {
        entity.health = Math.max(0, entity.health - proj.damage);
        if (entity.health <= 0 && typeof entity.alive === 'boolean') {
          entity.alive = false;
        }
        proj.alive = false;
        break;
      }
    }
  }

  // Remove dead projectiles from the back to avoid index shifting.
  for (let i = projectiles.length - 1; i >= 0; i--) {
    if (!projectiles[i].alive) {
      projectiles.splice(i, 1);
    }
  }
}
