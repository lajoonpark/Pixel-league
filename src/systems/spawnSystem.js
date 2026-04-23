// Spawn system periodically adds minions to both teams.
import { Minion } from '../entities/Minion.js';

export function createSpawnSystem(waveConfig) {
  const {
    spawnIntervalMs,
    spawnForwardOffset,
    spawnCount,
    spawnLineSpacingX,
  } = waveConfig;

  let elapsedMs = 0;
  let waveCount = 0;
  function reset() {
    elapsedMs = 0;
    waveCount = 0;
  }

  return {
    update(game, dtMs) {
      elapsedMs += dtMs;
      if (elapsedMs < spawnIntervalMs) {
        return;
      }
      elapsedMs = 0;
      waveCount += 1;

      const lane = game.map.lanes[0];
      const start = lane.points[0];
      const end = lane.points[lane.points.length - 1];

      // Spawn spawnCount minions per team in a single-file line along the lane
      // axis.  Index 0 is the rearmost unit; the front of the line reaches the
      // fight first because it has the highest x (blue) / lowest x (red).
      for (let i = 0; i < spawnCount; i += 1) {
        game.entities.push(new Minion(
          start.x + spawnForwardOffset + i * spawnLineSpacingX,
          start.y,
          'blue',
          lane.id,
          0
        ));
        game.entities.push(new Minion(
          end.x - spawnForwardOffset - i * spawnLineSpacingX,
          end.y,
          'red',
          lane.id,
          0
        ));
      }
    },
    getWaveCount() {
      return waveCount;
    },
    reset,
  };
}
