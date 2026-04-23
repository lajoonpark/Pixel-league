// Lane and world layout data for a one-lane MOBA map.
const OUTER_TOWER_INSET_RATIO = 2.1;
const BASE_WIDTH = 88;
const BASE_HEIGHT = 64;
const BASE_EDGE_PADDING = 14;

export function createMainLane(world) {
  const centerY = world.height / 2;
  const laneWidth = world.laneHeight;
  const start = { x: 0, y: centerY };
  const end = { x: world.width, y: centerY };
  const centerLine = [start, end];

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
          x: BASE_EDGE_PADDING + BASE_WIDTH / 2,
          y: centerY,
          width: BASE_WIDTH,
          height: BASE_HEIGHT,
        },
        {
          id: 'enemy-base',
          team: 'red',
          x: world.width - (BASE_EDGE_PADDING + BASE_WIDTH / 2),
          y: centerY,
          width: BASE_WIDTH,
          height: BASE_HEIGHT,
        },
      ],
      towerSlots: [
        {
          id: 'allied-outer-tower',
          team: 'blue',
          x: towerInset * OUTER_TOWER_INSET_RATIO,
          y: centerY,
          width: 40,
          height: 40,
        },
        {
          id: 'enemy-outer-tower',
          team: 'red',
          x: world.width - towerInset * OUTER_TOWER_INSET_RATIO,
          y: centerY,
          width: 40,
          height: 40,
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
