// Entry point: bootstrap canvas and start the game loop.
import { CONFIG } from './config.js';
import { Game } from './game.js';
import { createSpriteRegistry } from './sprites.js';
import { loadAbilityAssets } from './assets/assetLoader.js';

const canvas = document.getElementById('game-canvas');
if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error('Expected #game-canvas in index.html');
}

canvas.width = CONFIG.canvas.width;
canvas.height = CONFIG.canvas.height;

// Build programmatic sprites and inject them into the shared config so the
// renderer's sprite registry is populated before the first frame renders.
CONFIG.rendering.sprites = createSpriteRegistry(CONFIG);

// Load ability sprite-frame assets and UI icons.  Missing files resolve to
// null so the game always starts, even if artwork is not yet in place.
const assets = await loadAbilityAssets();

const game = new Game(canvas, assets);
game.start();
