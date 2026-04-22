// Spawn system periodically adds minions to both teams.
import { Minion } from '../entities/Minion.js';

export function createSpawnSystem({
  waveIntervalMs,
  waveInitialDelayMs = waveIntervalMs,
  minionsPerWavePerTeam,
  spawnStaggerMs,
  spawnOffsetX,
}) {
  let timeUntilNextWaveMs = waveInitialDelayMs;
  const scheduledSpawns = [];

  function scheduleWave(game) {
    const lane = game.map.lanes[0];
    if (!lane) {
      return;
    }
    const laneY = lane.start.y;
    const blueSide = game.map.sides.find((side) => side.team === 'blue');
    const redSide = game.map.sides.find((side) => side.team === 'red');
    if (!blueSide || !redSide) {
      return;
    }

    const blueSpawnX = blueSide.x + blueSide.width - spawnOffsetX;
    const redSpawnX = redSide.x + spawnOffsetX;
    const totalMinions = minionsPerWavePerTeam;

    for (let minionIndex = 0; minionIndex < totalMinions; minionIndex += 1) {
      const delayMs = minionIndex * spawnStaggerMs;
      scheduledSpawns.push({ team: 'blue', x: blueSpawnX, y: laneY, delayMs });
      scheduledSpawns.push({ team: 'red', x: redSpawnX, y: laneY, delayMs });
    }
  }

  function flushScheduledSpawns(game, dtMs) {
    for (let spawnIndex = scheduledSpawns.length - 1; spawnIndex >= 0; spawnIndex -= 1) {
      const scheduled = scheduledSpawns[spawnIndex];
      scheduled.delayMs -= dtMs;
      if (scheduled.delayMs > 0) {
        continue;
      }
      game.entities.push(new Minion(scheduled.x, scheduled.y, scheduled.team));
      scheduledSpawns.splice(spawnIndex, 1);
    }
  }

  const spawnSystem = function spawnSystem(game, dtMs) {
    timeUntilNextWaveMs -= dtMs;
    while (timeUntilNextWaveMs <= 0) {
      scheduleWave(game);
      timeUntilNextWaveMs += waveIntervalMs;
    }
    flushScheduledSpawns(game, dtMs);
  };

  spawnSystem.getDebugState = function getDebugState(entities) {
    const minionCount = entities.reduce(
      (count, entity) => count + (entity.type === 'minion' ? 1 : 0),
      0
    );
    return {
      minionCount,
      nextWaveInMs: Math.max(0, Math.ceil(timeUntilNextWaveMs)),
      pendingSpawnCount: scheduledSpawns.length,
    };
  };

  return spawnSystem;
}
