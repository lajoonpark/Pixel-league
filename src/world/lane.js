// Lane definitions for top-down lane-based MOBA movement.
export function createMainLane(world) {
  const inset = world.laneInset;
  const laneHeight = world.laneHeight;
  return {
    id: 'mid',
    x: inset,
    y: world.height / 2 - laneHeight / 2,
    width: world.width - inset * 2,
    height: laneHeight,
  };
}
