// Lane and world layout data for a one-lane MOBA map.
const BASE_INSET_MULTIPLIER = 0.45;
const OUTER_TOWER_INSET_MULTIPLIER = 2.1;

export function createMainLane(world) {
  const centerY = world.height / 2;
  const laneWidth = world.laneHeight;
  const start = { x: 0, y: centerY };
  const end = { x: world.width, y: centerY };
  const centerLine = [start, end];

  const baseInset = world.laneInset * BASE_INSET_MULTIPLIER;
  const towerInset = world.laneInset;

  return {
    id: 'mid',
    start,
    end,
    width: laneWidth,
    centerLine,
    // Keep legacy aliases while spawn/pathing systems are still converging.
    points: centerLine,
    path: centerLine,
    bounds: {
      x: start.x,
      y: centerY - laneWidth / 2,
      width: end.x - start.x,
      height: laneWidth,
    },
    placeholders: {
      baseSlots: [
        {
          id: 'allied-base',
          team: 'blue',
          x: baseInset,
          y: centerY,
          width: 58,
          height: 58,
        },
        {
          id: 'enemy-base',
          team: 'red',
          x: world.width - baseInset,
          y: centerY,
          width: 58,
          height: 58,
        },
      ],
      towerSlots: [
        {
          id: 'allied-outer-tower',
          team: 'blue',
          x: towerInset * OUTER_TOWER_INSET_MULTIPLIER,
          y: centerY,
          width: 32,
          height: 52,
        },
        {
          id: 'allied-inner-tower',
          team: 'blue',
          x: world.width * 0.34,
          y: centerY,
          width: 32,
          height: 52,
        },
        {
          id: 'enemy-inner-tower',
          team: 'red',
          x: world.width * 0.66,
          y: centerY,
          width: 32,
          height: 52,
        },
        {
          id: 'enemy-outer-tower',
          team: 'red',
          x: world.width - towerInset * OUTER_TOWER_INSET_MULTIPLIER,
          y: centerY,
          width: 32,
          height: 52,
        },
      ],
    },
  };
}

export function createWorldLayout(world) {
  const alliedSideWidth = world.laneInset * 2;
  const enemySideWidth = world.laneInset * 2;
  const lane = createMainLane(world);

  return {
    lanes: [lane],
    sides: [
      {
        id: 'allied-side',
        team: 'blue',
        x: 0,
        y: 0,
        width: alliedSideWidth,
        height: world.height,
      },
      {
        id: 'enemy-side',
        team: 'red',
        x: world.width - enemySideWidth,
        y: 0,
        width: enemySideWidth,
        height: world.height,
      },
    ],
  };
}
