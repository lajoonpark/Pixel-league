// Central configuration file for easy tuning of game values.
export const CONFIG = {
  canvas: {
    width: 960,
    height: 540,
  },
  world: {
    width: 2000,
    height: 1200,
    laneInset: 120,
    laneHeight: 96,
  },
  gameplay: {
    minionWaveIntervalMs: 10000,
    minionWaveInitialDelayMs: 1000,
    minionsPerWavePerTeam: 3,
    minionWaveSpawnStaggerMs: 250,
    minionWaveSpawnOffsetX: 24,
    heroSpawnLaneOffsetX: 60,
    defaultHeroMoveSpeed: 220,
    minionSpeed: 90,
    attackRange: 28,
    attackDamage: 10,
    attackCooldownMs: 800,
  },
};
