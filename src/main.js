// Entry point: bootstrap canvas and start the game loop.
import { CONFIG } from './config.js';
import { Game } from './game.js';

const canvas = document.getElementById('game-canvas');
if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error('Expected #game-canvas in index.html');
}

canvas.width = CONFIG.canvas.width;
canvas.height = CONFIG.canvas.height;

const game = new Game(canvas);
game.start();
