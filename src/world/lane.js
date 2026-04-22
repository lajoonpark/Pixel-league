// Lane definitions for top-down lane-based MOBA movement.
export function createMainLane(world) {
  return {
    id: 'mid',
    points: [
      { x: 160, y: world.height / 2 },
      { x: world.width / 2, y: world.height / 2 },
      { x: world.width - 160, y: world.height / 2 },
    ],
  };
}
