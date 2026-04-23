// Programmatic pixel-art sprite factory.
// Creates all game sprites as offscreen <canvas> elements so the renderer can
// use them with drawImage just like loaded image assets.  Each sprite is drawn
// once at startup and reused every frame.

function makeCanvas(w, h, drawFn) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  drawFn(c.getContext('2d'), w, h);
  return c;
}

// ─── colour palettes ──────────────────────────────────────────────────────────
const SKIN = '#d4a070';
const METAL = '#b8b8b8';
const METAL_L = '#d8d8d8';
const METAL_D = '#888';
const WOOD = '#6a4c2a';
const WOOD_L = '#8a6a3a';
const STONE = '#8a7f6e';
const STONE_D = '#6a5f4e';
const STONE_L = '#aaa090';
const GOLD = '#c8a040';

const BLUE = '#3366cc';
const BLUE_D = '#1a3388';
const BLUE_L = '#5588ee';
const RED = '#cc3333';
const RED_D = '#881111';
const RED_L = '#ee5555';

// ─── helpers ─────────────────────────────────────────────────────────────────
function r(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

// ─── hero (32 × 32, side-view blue knight) ───────────────────────────────────
function drawHero(ctx) {
  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(7, 28, 18, 4);

  // boots
  r(ctx, 9, 24, 6, 7, BLUE_D);
  r(ctx, 17, 24, 6, 7, BLUE_D);
  r(ctx, 9, 29, 6, 2, METAL_D);
  r(ctx, 17, 29, 6, 2, METAL_D);

  // legs
  r(ctx, 10, 17, 5, 8, BLUE);
  r(ctx, 17, 17, 5, 8, BLUE);
  r(ctx, 14, 17, 3, 8, BLUE_D);

  // belt
  r(ctx, 8, 16, 16, 2, WOOD);
  r(ctx, 14, 16, 4, 2, GOLD);

  // body
  r(ctx, 7, 8, 18, 9, BLUE);
  r(ctx, 11, 9, 10, 6, BLUE_L);
  r(ctx, 13, 10, 6, 4, METAL);
  r(ctx, 5, 8, 4, 6, BLUE_D);   // left shoulder
  r(ctx, 23, 8, 4, 6, BLUE_D);  // right shoulder

  // helmet
  r(ctx, 10, 2, 12, 8, BLUE);
  r(ctx, 10, 2, 12, 2, BLUE_D);
  r(ctx, 12, 5, 8, 3, '#1a2244'); // visor
  r(ctx, 12, 7, 8, 2, SKIN);      // face strip
  // crest
  r(ctx, 14, 0, 4, 3, '#dd2222');

  // shield (left arm)
  r(ctx, 3, 10, 5, 8, METAL);
  r(ctx, 4, 11, 3, 6, BLUE);
  r(ctx, 5, 13, 1, 2, METAL_L);

  // sword (right arm)
  r(ctx, 24, 5, 2, 14, METAL);
  r(ctx, 22, 10, 6, 2, GOLD);   // guard
  r(ctx, 24, 12, 2, 5, WOOD);   // grip
}

// ─── minion (24 × 24, side-view warrior) ─────────────────────────────────────
function drawMinion(ctx, team) {
  const B = team === 'blue' ? BLUE : RED;
  const BD = team === 'blue' ? BLUE_D : RED_D;
  const BL = team === 'blue' ? BLUE_L : RED_L;
  const visor = team === 'blue' ? '#1a2244' : '#441a1a';

  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(5, 21, 14, 3);

  // boots
  r(ctx, 6, 18, 4, 5, BD);
  r(ctx, 14, 18, 4, 5, BD);

  // legs
  r(ctx, 7, 13, 3, 6, B);
  r(ctx, 14, 13, 3, 6, B);
  r(ctx, 10, 13, 4, 6, BD);

  // belt
  r(ctx, 6, 12, 12, 2, WOOD);

  // body
  r(ctx, 5, 6, 14, 7, B);
  r(ctx, 8, 7, 8, 4, BL);
  r(ctx, 3, 6, 3, 5, BD);   // left shoulder
  r(ctx, 18, 6, 3, 5, BD);  // right shoulder

  // head / helmet
  r(ctx, 7, 1, 10, 6, B);
  r(ctx, 7, 1, 10, 2, BD);
  r(ctx, 9, 3, 6, 2, visor);
  r(ctx, 9, 5, 6, 2, SKIN);

  // small shield
  r(ctx, 1, 8, 4, 6, METAL);
  r(ctx, 2, 9, 2, 4, B);

  // spear shaft + tip
  r(ctx, 19, 2, 2, 18, WOOD_L);
  r(ctx, 19, 0, 2, 4, METAL);
}

// ─── tower (40 × 40, stone tower with gem) ───────────────────────────────────
function drawTower(ctx, team) {
  const GEM = team === 'blue' ? '#4499ff' : '#ff4444';
  const GEML = team === 'blue' ? '#88ccff' : '#ff8888';
  const GEMD = team === 'blue' ? '#1155aa' : '#aa1111';

  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.ellipse(20, 39, 13, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // base platform
  r(ctx, 4, 30, 32, 10, STONE_D);
  r(ctx, 4, 30, 32, 7, STONE);
  for (let x = 4; x < 36; x += 7) { r(ctx, x, 30, 1, 7, STONE_D); }

  // tower body
  r(ctx, 8, 13, 24, 18, STONE);
  // brick rows
  for (let y = 13; y < 31; y += 6) {
    r(ctx, 8, y, 24, 1, STONE_D);
    for (let x = 8; x < 32; x += 9) { r(ctx, x, y, 1, 6, STONE_D); }
  }

  // battlements
  for (const bx of [6, 13, 20, 27]) { r(ctx, bx, 9, 5, 5, STONE_L); }
  r(ctx, 6, 9, 28, 2, STONE_D);

  // arrow slits
  r(ctx, 14, 18, 5, 9, '#1a1410');
  r(ctx, 21, 18, 5, 9, '#1a1410');

  // gem / crystal
  r(ctx, 16, 1, 8, 10, GEMD);
  r(ctx, 17, 0, 6, 10, GEM);
  r(ctx, 18, 1, 3, 4, GEML);
  r(ctx, 16, 5, 2, 6, GEMD);
  r(ctx, 22, 5, 2, 6, GEMD);
}

// ─── base / castle (88 × 64) ─────────────────────────────────────────────────
function drawBase(ctx, team, w, h) {
  const ROOF = team === 'blue' ? BLUE : RED;
  const ROOFL = team === 'blue' ? BLUE_L : RED_L;
  const ROOFD = team === 'blue' ? BLUE_D : RED_D;

  // shadow
  r(ctx, 6, h - 4, w - 12, 4, 'rgba(0,0,0,0.22)');

  // main wall
  r(ctx, 10, 22, w - 20, h - 26, STONE);
  for (let y = 22; y < h - 4; y += 8) {
    r(ctx, 10, y, w - 20, 1, STONE_D);
    for (let x = 10; x < w - 10; x += 11) {
      r(ctx, x + (Math.floor(y / 8) % 2) * 5, y, 1, 8, STONE_D);
    }
  }

  // corner towers
  for (const cx of [0, w - 14]) {
    r(ctx, cx, 16, 14, h - 20, STONE_L);
    for (let y = 16; y < h - 4; y += 8) { r(ctx, cx, y, 14, 1, STONE_D); }
    for (const bx of [cx, cx + 5, cx + 10]) { r(ctx, bx, 12, 4, 5, STONE_L); }
  }

  // roof (triangle approximated with rects)
  const halfW = Math.floor(w / 2);
  for (let i = 0; i < 20; i += 1) {
    const rowW = Math.max(2, Math.round((i / 20) * (w - 20)));
    const rx = halfW - Math.floor(rowW / 2);
    r(ctx, rx, 2 + i, rowW, 1, ROOF);
    // lighter left half
    r(ctx, rx, 2 + i, Math.floor(rowW / 2), 1, ROOFL);
  }
  r(ctx, halfW - 1, 2, 2, 20, ROOFD); // ridge

  // flag
  r(ctx, halfW - 1, 0, 2, 10, WOOD);
  r(ctx, halfW + 1, 0, 8, 5, ROOFL);

  // gate arch (rect approximation)
  r(ctx, halfW - 8, h - 20, 16, 20, '#1a1410');
  r(ctx, halfW - 7, h - 26, 14, 6, '#1a1410');

  // windows
  for (const wx of [16, w - 24]) {
    r(ctx, wx, 32, 8, 10, '#1a2244');
    r(ctx, wx + 1, 33, 6, 8, team === 'blue' ? 'rgba(100,180,255,0.5)' : 'rgba(255,100,100,0.5)');
  }
}

// ─── grass tile (32 × 32) ─────────────────────────────────────────────────────
function drawGrassTile(ctx) {
  r(ctx, 0, 0, 32, 32, '#3a7d30');
  const patches = [
    { x: 2, y: 3, w: 6, h: 4, c: '#4a9040' },
    { x: 14, y: 1, w: 8, h: 5, c: '#328028' },
    { x: 24, y: 8, w: 6, h: 4, c: '#4a9040' },
    { x: 1, y: 18, w: 5, h: 6, c: '#328028' },
    { x: 18, y: 22, w: 7, h: 5, c: '#4a9040' },
    { x: 8, y: 26, w: 6, h: 4, c: '#328028' },
    { x: 0, y: 0, w: 3, h: 2, c: '#5aa848' },
    { x: 28, y: 28, w: 4, h: 4, c: '#5aa848' },
  ];
  for (const p of patches) { r(ctx, p.x, p.y, p.w, p.h, p.c); }
  ctx.fillStyle = '#5aa848';
  [[5,7],[11,14],[20,6],[26,20],[4,25],[16,29]].forEach(([x,y]) => ctx.fillRect(x,y,1,3));
}

// ─── lane / dirt tile (32 × 32) ───────────────────────────────────────────────
function drawLaneTile(ctx) {
  r(ctx, 0, 0, 32, 32, '#9a7a50');
  const patches = [
    { x: 0, y: 0, w: 8, h: 5, c: '#aa8a60' },
    { x: 12, y: 8, w: 10, h: 6, c: '#8a6a40' },
    { x: 24, y: 2, w: 8, h: 7, c: '#aa8a60' },
    { x: 2, y: 18, w: 6, h: 5, c: '#8a6a40' },
    { x: 18, y: 24, w: 8, h: 6, c: '#aa8a60' },
    { x: 6, y: 26, w: 7, h: 6, c: '#8a6a40' },
  ];
  for (const p of patches) { r(ctx, p.x, p.y, p.w, p.h, p.c); }
  ctx.fillStyle = '#7a6050';
  [[4,4],[18,10],[28,18],[10,22],[22,28]].forEach(([x,y]) => ctx.fillRect(x,y,2,2));
}

// ─── tree decoration (28 × 38) ────────────────────────────────────────────────
function drawTree(ctx) {
  // trunk
  r(ctx, 11, 28, 6, 10, WOOD);
  r(ctx, 12, 28, 4, 10, WOOD_L);

  // foliage layers (bottom to top, widening down)
  const layers = [
    { y: 18, w: 22, c: '#1a4010' },
    { y: 10, w: 16, c: '#1a4010' },
    { y:  3, w: 10, c: '#1a4010' },
  ];
  for (const l of layers) {
    r(ctx, Math.floor((28 - l.w) / 2), l.y, l.w, 12, l.c);
  }
  // lighter highlight on top-left
  const hl = [
    { y: 19, w: 18, c: '#2a6020' },
    { y: 11, w: 12, c: '#2a6020' },
    { y:  4, w:  7, c: '#2a6020' },
  ];
  for (const l of hl) {
    r(ctx, Math.floor((28 - l.w) / 2), l.y, l.w, 8, l.c);
  }
  // bright tip
  r(ctx, 11, 4, 6, 5, '#3a8030');
}

// ─── public API ───────────────────────────────────────────────────────────────

/**
 * Builds the full sprite registry used by Renderer.
 * Returns an object whose keys are sprite IDs and whose values are
 * { image: HTMLCanvasElement }.
 *
 * @param {object} config  The global CONFIG object (used for base dimensions).
 */
export function createSpriteRegistry(config) {
  const bw = config.base.width;
  const bh = config.base.height;

  return {
    hero:       { image: makeCanvas(32, 32, (ctx) => drawHero(ctx)) },
    'minion-blue': { image: makeCanvas(24, 24, (ctx) => drawMinion(ctx, 'blue')) },
    'minion-red':  { image: makeCanvas(24, 24, (ctx) => drawMinion(ctx, 'red')) },
    'tower-blue':  { image: makeCanvas(40, 40, (ctx) => drawTower(ctx, 'blue')) },
    'tower-red':   { image: makeCanvas(40, 40, (ctx) => drawTower(ctx, 'red')) },
    'base-blue':   { image: makeCanvas(bw, bh, (ctx) => drawBase(ctx, 'blue', bw, bh)) },
    'base-red':    { image: makeCanvas(bw, bh, (ctx) => drawBase(ctx, 'red', bw, bh)) },
    'tile-grass':  { image: makeCanvas(32, 32, (ctx) => drawGrassTile(ctx)) },
    'tile-lane':   { image: makeCanvas(32, 32, (ctx) => drawLaneTile(ctx)) },
    tree:          { image: makeCanvas(28, 38, (ctx) => drawTree(ctx)) },
  };
}
