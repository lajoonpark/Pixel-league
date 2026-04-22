// Spawn system periodically adds minions to both teams.
import { Minion } from '../entities/Minion.js';

export function createSpawnSystem(intervalMs) {
  let elapsedMs = 0;

  return function spawnSystem(game, dtMs) {
    elapsedMs += dtMs;
    if (elapsedMs < intervalMs) {
      return;
    }
    elapsedMs = 0;

    const lane = game.map.lanes[0];
    const start = lane.points[0];
    const end = lane.points[lane.points.length - 1];

    game.entities.push(new Minion(start.x + 24, start.y - 20, 'blue', lane.id, 0));
    game.entities.push(new Minion(start.x + 24, start.y + 20, 'blue', lane.id, 0));
    game.entities.push(new Minion(end.x - 24, end.y - 20, 'red', lane.id, 0));
    game.entities.push(new Minion(end.x - 24, end.y + 20, 'red', lane.id, 0));
  };
}
