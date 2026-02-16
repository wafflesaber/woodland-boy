#!/usr/bin/env node
/**
 * compose-player.js
 *
 * Merges the Farm RPG Child NPC layers (Body + Eyes + Hair + Clothes)
 * into single composite spritesheets for idle and walk animations.
 *
 * Input:  public/assets/player/{body,eyes,hair,clothes}-{idle,walk}.png
 * Output: public/assets/player/idle.png  (256x32, 8 frames of 32x32)
 *         public/assets/player/walk.png  (512x32, 16 frames of 32x32)
 *
 * Walk frame layout (16 frames in single row):
 *   Frames 0-3:  walk down  (4 frames)
 *   Frames 4-7:  walk left  (4 frames) — flip for right
 *   Frames 8-11: walk right (4 frames) — or same as left, flipped at runtime
 *   Frames 12-15: walk up   (4 frames)
 *
 * Run: node scripts/compose-player.js
 */

import sharp from 'sharp';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLAYER_DIR = join(__dirname, '..', 'public', 'assets', 'player');

async function composeLayers(state, width, height) {
  const layers = ['body', 'eyes', 'clothes', 'hair']; // bottom to top
  const paths = layers.map(l => join(PLAYER_DIR, `${l}-${state}.png`));

  // Load base (body) and composite the rest on top
  let composite = sharp(paths[0]).ensureAlpha();

  const overlays = [];
  for (let i = 1; i < paths.length; i++) {
    overlays.push({ input: await sharp(paths[i]).ensureAlpha().toBuffer() });
  }

  const result = await composite.composite(overlays).png().toBuffer();
  const outPath = join(PLAYER_DIR, `${state}.png`);
  await sharp(result).toFile(outPath);
  console.log(`  ${state}.png (${width}x${height}) written`);
}

async function main() {
  console.log('Compositing player spritesheets...');
  await composeLayers('idle', 256, 32);
  await composeLayers('walk', 512, 32);
  console.log('Done!');
}

main().catch(err => {
  console.error('Compositing failed:', err);
  process.exit(1);
});
