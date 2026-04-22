// Map factory for world dimensions and lane data.
import { createMainLane } from './lane.js';

export function createMap(config) {
  return {
    width: config.world.width,
    height: config.world.height,
    lanes: [createMainLane(config.world)],
  };
}
