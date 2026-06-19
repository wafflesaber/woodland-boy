// Extract Pixel 16 Woods (spring) tiles + decorations into public/assets/woods/.
// Pixel-art friendly: integer nearest-neighbor upscales only.
// Run: node scripts/extract-woods.mjs
import sharp from 'sharp';
import { mkdirSync } from 'fs';

const A = '/Users/drew/WORKSHOP/Apps/bens-game/ASSETS/pixel 16 woods v2.0/pixel 16 woods v2.0/pixel 16 woods v2/!spring[main]';
const TILESET = `${A}/tileset.png`;
const TREES = `${A}/trees & stuff.png`;
const OUT = '/Users/drew/WORKSHOP/Apps/bens-game/woodland-boy/public/assets/woods';
mkdirSync(OUT, { recursive: true });

const T = 16; // native tile px
// helper: crop native rect (in tile units) and upscale by integer factor
async function cut(src, name, cx, cy, cw, ch, scale) {
  const left = cx * T, top = cy * T, w = cw * T, h = ch * T;
  await sharp(src)
    .extract({ left, top, width: w, height: h })
    .resize(w * scale, h * scale, { kernel: 'nearest' })
    .png()
    .toFile(`${OUT}/${name}.png`);
  return { name, w: w * scale, h: h * scale };
}

const jobs = [
  // ── terrain fills (16px → 64px tiles, scale 4) ──
  [TILESET, 'grass-light', 3, 3, 1, 1, 4],
  [TILESET, 'grass-dark', 10, 3, 1, 1, 4],
  [TILESET, 'dirt', 5, 0, 1, 1, 4],
  [TILESET, 'water', 15, 19, 1, 1, 4],

  // ── trees (scale 2) ──
  [TREES, 'tree-broadleaf-a', 0, 0, 4, 5, 2],
  [TREES, 'tree-broadleaf-b', 4, 0, 4, 5, 2],
  [TREES, 'tree-pine-tall', 11, 1, 2, 4, 2],
  [TREES, 'tree-pine-small', 8, 2, 3, 3, 2],
  [TREES, 'tree-medium', 0, 5, 4, 4, 2],
  [TREES, 'tree-old', 2, 9, 4, 5, 2],

  // ── small decor (scale 3) ──
  [TREES, 'bush-1', 9, 6, 1, 1, 3],
  [TREES, 'bush-2', 10, 6, 1, 1, 3],
  [TREES, 'flower-pink', 9, 10, 1, 1, 3],
  [TREES, 'flower-yellow', 10, 10, 1, 1, 3],
  [TREES, 'flower-blue', 11, 10, 1, 1, 3],
  [TREES, 'flower-white', 13, 8, 1, 1, 3],
  [TREES, 'flower-red', 15, 8, 1, 1, 3],
  [TREES, 'mushroom-red', 9, 8, 1, 1, 3],
  [TREES, 'mushroom-tan', 11, 8, 1, 1, 3],
  [TREES, 'stump', 13, 6, 1, 1, 3],
  [TREES, 'log', 16, 5, 1, 1, 3],
  [TREES, 'rock-small', 18, 6, 1, 1, 3],
  [TREES, 'rock-pebbles', 19, 7, 1, 1, 3],
  [TREES, 'rock-cluster', 18, 4, 2, 2, 3],
  [TREES, 'grass-tuft-1', 9, 7, 1, 1, 2],
  [TREES, 'grass-tuft-2', 10, 7, 1, 1, 2],
];

const results = [];
for (const j of jobs) results.push(await cut(...j));

// contact sheet for verification
const pad = 6, cols = 6;
const cellW = 200, cellH = 220;
const rows = Math.ceil(results.length / cols);
const composites = [];
const { default: s } = { default: sharp };
let i = 0;
for (const r of results) {
  const col = i % cols, row = Math.floor(i / cols);
  const buf = await sharp(`${OUT}/${r.name}.png`)
    .resize(Math.min(r.w, cellW - 20), Math.min(r.h, cellH - 40), { fit: 'inside', kernel: 'nearest' })
    .extend({ top: 4, bottom: 4, left: 4, right: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png().toBuffer();
  composites.push({ input: buf, left: col * cellW + pad, top: row * cellH + pad });
  i++;
}
await sharp({ create: { width: cols * cellW, height: rows * cellH, channels: 4, background: { r: 50, g: 50, b: 60, alpha: 1 } } })
  .composite(composites).png().toFile('/tmp/woods-contact.png');

console.log(`extracted ${results.length} assets to ${OUT}`);
console.log('contact sheet: /tmp/woods-contact.png');
console.log(results.map(r => `${r.name} ${r.w}x${r.h}`).join('\n'));
