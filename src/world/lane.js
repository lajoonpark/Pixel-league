// Lane and world layout data for a one-lane MOBA map.
export function createMainLane(mapConfig, structuresConfig, baseConfig, towerConfig) {
  const centerY = mapConfig.height / 2;
  const laneHeight = mapConfig.laneHeight;
  const start = { x: 0, y: centerY };
  const end = { x: mapConfig.width, y: centerY };
  const centerLine = [start, end];

  const towerInset = mapConfig.laneInset;

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
      towerSlots: [
        {
          id: 'allied-outer-tower',
          renderType: towerConfig.renderType,
          team: 'blue',
          x: towerInset * structuresConfig.towerOuterInsetRatio,
          y: centerY,
          width: towerConfig.width,
          height: towerConfig.height,
        },
        {
          id: 'enemy-outer-tower',
          renderType: towerConfig.renderType,
          team: 'red',
          x: mapConfig.width - towerInset * structuresConfig.towerOuterInsetRatio,
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
  };
}
