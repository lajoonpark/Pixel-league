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

// ─── tower (48 × 48, stone castle tower with gem) ────────────────────────────
function drawTower(ctx, team) {
  const GEM  = team === 'blue' ? '#2299ff' : '#ff4400';
  const GEML = team === 'blue' ? '#88ccff' : '#ffaa44';
  const GEMD = team === 'blue' ? '#0044aa' : '#aa1100';

  // drop shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(24, 46, 18, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // wide stone base platform
  r(ctx, 4, 37, 40, 11, STONE_D);
  r(ctx, 4, 35, 40, 9, STONE);
  r(ctx, 5, 35, 38, 1, STONE_L);                         // top-edge highlight
  for (let x = 4; x < 44; x += 9) { r(ctx, x, 35, 1, 9, STONE_D); } // vertical dividers

  // tower body (x 10-37, y 16-36)
  r(ctx, 10, 16, 28, 21, STONE);
  r(ctx, 10, 16, 2, 21, STONE_D);                        // left-side shading
  r(ctx, 36, 16, 2, 21, STONE_D);                        // right-side shading
  r(ctx, 12, 17, 3, 19, STONE_L);                        // left highlight strip
  // horizontal brick rows + offset vertical dividers
  for (let y = 16; y < 37; y += 6) {
    r(ctx, 10, y, 28, 1, STONE_D);
    const off = (Math.floor((y - 16) / 6) % 2 === 0) ? 0 : 5;
    for (let x = 10 + off; x < 38; x += 10) { r(ctx, x, y, 1, 6, STONE_D); }
  }

  // battlements – 4 merlons with 3 dark crenels
  for (const bx of [10, 17, 24, 31]) { r(ctx, bx, 10, 6, 6, STONE_L); }
  for (const gx of [16, 23, 30])     { r(ctx, gx, 10, 1, 6, '#1a1410'); }
  r(ctx, 10, 15, 28, 2, STONE_D);                        // battlement base

  // dark entrance arch
  r(ctx, 20, 22, 8, 2, '#1a1410');                       // arch top
  r(ctx, 19, 23, 10, 13, '#1a1410');                     // arch body

  // pointed gem / crystal (centred at x 24)
  r(ctx, 23,  0, 2, 1, GEM);   // very tip
  r(ctx, 22,  1, 4, 2, GEM);
  r(ctx, 21,  3, 6, 2, GEM);
  r(ctx, 20,  5, 8, 3, GEM);   // widest band
  r(ctx, 21,  8, 6, 2, GEM);
  r(ctx, 22, 10, 4, 1, GEMD);  // lower taper
  // highlight (upper-left face)
  r(ctx, 22, 1, 2, 2, GEML);
  r(ctx, 21, 3, 3, 2, GEML);
  r(ctx, 20, 5, 3, 2, GEML);
  // dark right-edge shading
  r(ctx, 27, 5, 1, 5, GEMD);
  r(ctx, 26, 8, 2, 2, GEMD);
}

// ─── base / castle (88 × 64) ─────────────────────────────────────────────────
function drawBase(ctx, team, w, h) {
  const ROOF  = team === 'blue' ? BLUE   : RED;
  const ROOFL = team === 'blue' ? BLUE_L : RED_L;
  const ROOFD = team === 'blue' ? BLUE_D : RED_D;

  const halfW = Math.floor(w / 2);
  const TW = 14;   // corner-turret width
  const TY = 22;   // corner-turret top y

  // drop shadow
  r(ctx, 8, h - 4, w - 16, 4, 'rgba(0,0,0,0.22)');

  // ── main building wall ────────────────────────────────────────────────────
  r(ctx, TW, 26, w - TW * 2, h - 26, STONE);
  for (let y = 26; y < h; y += 8) {
    r(ctx, TW, y, w - TW * 2, 1, STONE_D);
    const off = (Math.floor((y - 26) / 8) % 2 === 0) ? 0 : 5;
    for (let x = TW + off; x < w - TW; x += 12) { r(ctx, x, y, 1, 8, STONE_D); }
  }

  // ── corner turrets ────────────────────────────────────────────────────────
  for (const cx of [0, w - TW]) {
    // turret body (slightly lighter stone for contrast)
    r(ctx, cx, TY, TW, h - TY, STONE_L);
    // horizontal mortar lines
    for (let y = TY; y < h; y += 8) { r(ctx, cx, y, TW, 1, STONE_D); }
    // centre vertical divider
    r(ctx, cx + Math.floor(TW / 2), TY, 1, h - TY, STONE_D);
    // merlons (3 per turret)
    for (const bx of [cx, cx + 5, cx + 10]) { r(ctx, bx, TY - 7, 4, 7, STONE_L); }
    // dark crenels between merlons
    for (const gx of [cx + 4, cx + 9]) { r(ctx, gx, TY - 7, 1, 6, '#1a1410'); }
    // turret-top border
    r(ctx, cx, TY, TW, 1, STONE_D);
  }

  // ── roof (triangle built from horizontal rows) ────────────────────────────
  for (let i = 0; i < 22; i++) {
    const rowW = Math.max(2, Math.round((i / 22) * (w - 18)));
    const rx = halfW - Math.floor(rowW / 2);
    r(ctx, rx, 4 + i, rowW, 1, ROOF);
    r(ctx, rx, 4 + i, Math.floor(rowW / 2), 1, ROOFL);  // lighter left face
  }
  r(ctx, halfW - 1, 4, 2, 22, ROOFD);                   // ridge

  // ── flag ──────────────────────────────────────────────────────────────────
  r(ctx, halfW - 1, 0, 2, 10, WOOD);                    // pole
  r(ctx, halfW + 1, 0, 8,  5, ROOFL);                   // banner

  // ── gate arch ─────────────────────────────────────────────────────────────
  r(ctx, halfW - 8, h - 20, 16, 20, '#1a1410');
  r(ctx, halfW - 7, h - 26, 14,  6, '#1a1410');

  // ── windows ───────────────────────────────────────────────────────────────
  const winGlow = team === 'blue' ? 'rgba(100,180,255,0.5)' : 'rgba(255,100,100,0.5)';
  for (const wx of [TW + 3, w - TW - 11]) {
    r(ctx, wx,     32, 8, 10, '#1a1410');
    r(ctx, wx + 1, 33, 6,  8, winGlow);
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
    'tower-blue':  { image: makeCanvas(48, 48, (ctx) => drawTower(ctx, 'blue')) },
    'tower-red':   { image: makeCanvas(48, 48, (ctx) => drawTower(ctx, 'red')) },
    'base-blue':   { image: makeCanvas(bw, bh, (ctx) => drawBase(ctx, 'blue', bw, bh)) },
    'base-red':    { image: makeCanvas(bw, bh, (ctx) => drawBase(ctx, 'red', bw, bh)) },
    'tile-grass':  { image: makeCanvas(32, 32, (ctx) => drawGrassTile(ctx)) },
    'tile-lane':   { image: makeCanvas(32, 32, (ctx) => drawLaneTile(ctx)) },
    tree:          { image: makeCanvas(28, 38, (ctx) => drawTree(ctx)) },
  };
}
