// Central configuration file for gameplay and rendering tuning.
export const GAME_STATES = {
  menu: 'menu',
  playing: 'playing',
  gameOver: 'gameOver',
};

export const CONFIG = {
  canvas: {
    width: 960,
    height: 540,
  },
  map: {
    width: 2000,
    height: 1200,
    laneInset: 120,
    laneHeight: 96,
    sideWidthMultiplier: 2,
    borderWidth: 4,
    colors: {
      background: '#1f2533',
      border: '#5b667e',
      lane: '#2d3446',
      laneCenterLine: '#7f89a5',
      alliedSide: '#253a64',
      enemySide: '#5a2b2b',
      alliedTowerSlot: '#5d82d1',
      enemyTowerSlot: '#bf6464',
      alliedBaseSlot: '#3f6dce',
      enemyBaseSlot: '#b55252',
    },
  },
  structures: {
    towerOuterInsetRatio: 2.1,
    // Inner towers sit at this fraction of map width from each edge (0.375 = 37.5 %).
    towerInnerXRatio: 0.375,
    baseEdgePadding: 14,
  },
  waves: {
    spawnIntervalMs: 15000,
    // Number of minions spawned per team per wave, arranged in a line.
    spawnCount: 9,
    // Gap between consecutive minions along the lane axis.
    spawnLineSpacingX: 18,
    spawnForwardOffset: 24,
  },
  hero: {
    renderType: 'hero',
    width: 24,
    height: 24,
    moveSpeed: 220,
    health: 120,
    attackDamage: 18,
    attackRange: 60,
    attackCooldownMs: 700,
    respawnDelayMs: 3000,
    spawnLaneOffsetX: 60,
    color: '#4aa8ff',
  },
  minion: {
    renderType: 'minion',
    width: 12,
    height: 12,
    moveSpeed: 90,
    health: 45,
    attackDamage: 8,
    attackRange: 28,
    attackCooldownMs: 1300,
    colors: {
      blue: '#7fc5ff',
      red: '#ff8a8a',
    },
    laneCorrection: {
      speedRatio: 0.6,
      multiplier: 5,
    },
  },
  tower: {
    renderType: 'tower',
    width: 40,
    height: 40,
    health: 420,
    attackRange: 180,
    attackDamage: 80,
    attackCooldownMs: 1100,
    colors: {
      blue: '#6d9dff',
      red: '#ff7a7a',
    },
  },
  base: {
    renderType: 'base',
    width: 88,
    height: 64,
    health: 600,
    // Combat stats – base attacks like a tower.
    attackRange: 200,
    attackDamage: 150,
    attackCooldownMs: 1100,
    // Radius within which the allied hero is instantly healed to full.
    healRadius: 120,
    colors: {
      blue: '#2053bf',
      red: '#a92c2c',
    },
  },
  collision: {
    minOverlapToResolve: 1.5,
    maxDynamicSeparationPerStep: 4,
    maxStaticSeparationPerStep: 6,
    heroWeight: 0.85,
    minionWeight: 0.5,
  },
  // Visual style for attack-range circles drawn on entities.
  rangeCircle: {
    heroColor: '#4aa8ff',
    heroAlpha: 0.22,
    // Green when a structure is targeting a minion.
    greenColor: '#44ff88',
    // Red when a structure is idle or targeting the hero.
    redColor: '#ff4444',
    alpha: 0.15,
    lineWidth: 1.5,
  },
  rendering: {
    laneCenterLineHeight: 4,
    healthBar: {
      height: 4,
      offsetY: 10,
      towerMinWidth: 44,
      baseMinWidth: 92,
      backgroundColor: '#1b1f2a',
      colors: {
        hero: '#55d66a',
        minion: '#55d66a',
        alliedTower: '#72d4ff',
        enemyTower: '#ff9d9d',
        alliedBase: '#8ac2ff',
        enemyBase: '#ffaaaa',
      },
    },
    sprites: {},
  },
  ui: {
    color: '#d0d7e2',
    secondaryColor: '#b9c5d6',
    warningColor: '#ffb3b3',
    font: '14px monospace',
    smallFont: '10px monospace',
    overlay: {
      background: 'rgba(12, 16, 26, 0.76)',
      titleColor: '#f0f5ff',
      subtitleColor: '#c9d5e6',
      titleFont: 'bold 42px monospace',
      subtitleFont: '18px monospace',
    },
  },
};
