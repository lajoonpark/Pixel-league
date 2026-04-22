// Map factory for world dimensions and lane data.
import { createMainLane } from './lane.js';

export function createMap(config) {
  return {
    x: 0,
    y: 0,
    width: config.world.width,
    height: config.world.height,
    color: '#1f2533',
    borderColor: '#5b667e',
    borderWidth: 4,
    lanes: [createMainLane(config.world)],
  };
}
