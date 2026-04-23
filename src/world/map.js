// Map factory for world dimensions and lane data.
import { createWorldLayout } from './lane.js';

export function createMap(config) {
  const worldLayout = createWorldLayout(config.map, config.structures, config.base, config.tower);

  return {
    renderType: 'map',
    x: 0,
    y: 0,
    width: config.map.width,
    height: config.map.height,
    laneHeight: config.map.laneHeight,
    color: config.map.colors.background,
    borderColor: config.map.colors.border,
    borderWidth: config.map.borderWidth,
    lanes: worldLayout.lanes,
    sides: worldLayout.sides,
    decorations: worldLayout.decorations,
  };
}
