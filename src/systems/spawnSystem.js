// Spawn system periodically adds minions to both teams.
import { Minion } from '../entities/Minion.js';

export function createSpawnSystem(waveConfig) {
  const {
    spawnIntervalMs,
    spawnForwardOffset,
    spawnLateralOffsets,
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

      for (const lateralOffset of spawnLateralOffsets) {
        game.entities.push(new Minion(
          start.x + spawnForwardOffset,
          start.y + lateralOffset,
          'blue',
          lane.id,
          0
        ));
        game.entities.push(new Minion(
          end.x - spawnForwardOffset,
          end.y + lateralOffset,
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
