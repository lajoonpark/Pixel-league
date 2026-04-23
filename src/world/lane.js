// Lane and world layout data for a one-lane MOBA map.

// Returns an array of tree decoration positions scattered around the lane.
function generateDecorations(mapConfig) {
  const laneCenterY = mapConfig.height / 2;
  const laneHalfH = mapConfig.laneHeight / 2;
  // Keep decorations at least this far from the lane edge.
  const margin = 80;
  const aboveMax = laneCenterY - laneHalfH - margin;
  const belowMin = laneCenterY + laneHalfH + margin;

  // Hand-placed tree positions chosen to mirror the asset-sheet map example.
  const raw = [
    // Above the lane
    { x: 150, y: 180 }, { x: 320, y: 120 }, { x: 500, y: 200 }, { x: 680, y: 100 },
    { x: 880, y: 160 }, { x: 1060, y: 110 }, { x: 1240, y: 190 }, { x: 1420, y: 130 },
    { x: 1600, y: 175 }, { x: 1840, y: 115 },
    { x: 80,  y: 330 }, { x: 260, y: 380 }, { x: 440, y: 310 }, { x: 700, y: 370 },
    { x: 960, y: 340 }, { x: 1150, y: 400 }, { x: 1350, y: 360 }, { x: 1580, y: 410 },
    { x: 1900, y: 350 },
    { x: 210, y: 460 }, { x: 560, y: 440 }, { x: 940, y: 470 }, { x: 1300, y: 450 },
    { x: 1700, y: 460 },
    // Below the lane
    { x: 130, y: 760 }, { x: 370, y: 720 }, { x: 600, y: 800 }, { x: 830, y: 750 },
    { x: 1050, y: 780 }, { x: 1280, y: 730 }, { x: 1510, y: 790 }, { x: 1760, y: 745 },
    { x: 1940, y: 775 },
    { x: 220, y: 910 }, { x: 530, y: 870 }, { x: 810, y: 940 }, { x: 1120, y: 890 },
    { x: 1440, y: 950 }, { x: 1730, y: 905 },
    { x: 100, y: 1040 }, { x: 410, y: 1020 }, { x: 720, y: 1070 }, { x: 1010, y: 1045 },
    { x: 1310, y: 1075 }, { x: 1620, y: 1050 }, { x: 1930, y: 1030 },
  ];

  return raw
    .filter((p) => (p.y <= aboveMax || p.y >= belowMin) && p.x > 0 && p.x < mapConfig.width)
    .map((p) => ({ ...p, type: 'tree' }));
}

export function createMainLane(mapConfig, structuresConfig, baseConfig, towerConfig) {
  const centerY = mapConfig.height / 2;
  const laneHeight = mapConfig.laneHeight;
  const start = { x: 0, y: centerY };
  const end = { x: mapConfig.width, y: centerY };
  const centerLine = [start, end];

  const towerInset = mapConfig.laneInset;
  // Outer towers: near each base.  Inner towers: closer to map centre.
  const outerX = towerInset * structuresConfig.towerOuterInsetRatio;
  const innerX = mapConfig.width * structuresConfig.towerInnerXRatio;

  return {
    id: 'mid',
    renderType: 'lane',
    start,
    end,
    width: laneHeight,
    centerLine,
    // Keep legacy aliases while spawn/pathing systems are still converging.
    points: centerLine,
    path: centerLine,
    bounds: {
      x: start.x,
      y: centerY - laneHeight / 2,
      width: end.x - start.x,
      height: laneHeight,
    },
    placeholders: {
      baseSlots: [
        {
          id: 'allied-base',
          renderType: baseConfig.renderType,
          team: 'blue',
          x: structuresConfig.baseEdgePadding + baseConfig.width / 2,
          y: centerY,
          width: baseConfig.width,
          height: baseConfig.height,
        },
        {
          id: 'enemy-base',
          renderType: baseConfig.renderType,
          team: 'red',
          x: mapConfig.width - (structuresConfig.baseEdgePadding + baseConfig.width / 2),
          y: centerY,
          width: baseConfig.width,
          height: baseConfig.height,
        },
      ],
      // Four towers: two per team.  Inner towers are positioned past the outer
      // ones toward the centre so that minion progression gates through them
      // in order (outer first, then inner, then base).
      towerSlots: [
        {
          id: 'blue-outer-tower',
          renderType: towerConfig.renderType,
          team: 'blue',
          x: outerX,
          y: centerY,
          width: towerConfig.width,
          height: towerConfig.height,
        },
        {
          id: 'blue-inner-tower',
          renderType: towerConfig.renderType,
          team: 'blue',
          x: innerX,
          y: centerY,
          width: towerConfig.width,
          height: towerConfig.height,
        },
        {
          id: 'red-inner-tower',
          renderType: towerConfig.renderType,
          team: 'red',
          x: mapConfig.width - innerX,
          y: centerY,
          width: towerConfig.width,
          height: towerConfig.height,
        },
        {
          id: 'red-outer-tower',
          renderType: towerConfig.renderType,
          team: 'red',
          x: mapConfig.width - outerX,
          y: centerY,
          width: towerConfig.width,
          height: towerConfig.height,
        },
      ],
    },
  };
}

export function createWorldLayout(mapConfig, structuresConfig, baseConfig, towerConfig) {
  const alliedSideWidth = mapConfig.laneInset * mapConfig.sideWidthMultiplier;
  const enemySideWidth = mapConfig.laneInset * mapConfig.sideWidthMultiplier;
  const lane = createMainLane(mapConfig, structuresConfig, baseConfig, towerConfig);

  return {
    lanes: [lane],
    sides: [
      {
        id: 'allied-side',
        renderType: 'map-side',
        team: 'blue',
        x: 0,
        y: 0,
        width: alliedSideWidth,
        height: mapConfig.height,
      },
      {
        id: 'enemy-side',
        renderType: 'map-side',
        team: 'red',
        x: mapConfig.width - enemySideWidth,
        y: 0,
        width: enemySideWidth,
        height: mapConfig.height,
      },
    ],
    decorations: generateDecorations(mapConfig),
  };
}
