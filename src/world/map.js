// Map factory for world dimensions and lane data.
import { createWorldLayout } from './lane.js';

export function createMap(config) {
  const worldLayout = createWorldLayout(config.world);

  return {
    x: 0,
    y: 0,
    width: config.world.width,
    height: config.world.height,
    color: '#1f2533',
    borderColor: '#5b667e',
    borderWidth: 4,
    lanes: worldLayout.lanes,
    sides: worldLayout.sides,
  };
}
