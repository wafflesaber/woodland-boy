// Extract whole terrain blobs (dirt patches, water pond) as trimmed stamps.
import sharp from 'sharp';
const A = '/Users/drew/WORKSHOP/Apps/bens-game/ASSETS/pixel 16 woods v2.0/pixel 16 woods v2.0/pixel 16 woods v2/!spring[main]';
const TILESET = `${A}/tileset.png`;
const WATER = `${A}/waterfall & watertiles.png`;
const OUT = '/Users/drew/WORKSHOP/Apps/bens-game/woodland-boy/public/assets/woods';
const S = 4;

async function blob(src, name, left, top, width, height) {
  const meta = await sharp(src).extract({ left, top, width, height })
    .trim({ threshold: 1 })
    .resize({ width: width * S, height: height * S, fit: 'inside', kernel: 'nearest' })
    .png().toFile(`${OUT}/${name}.png`);
  console.log(name, meta.width + 'x' + meta.height);
}

// light tan dirt blob (cols ~1-5, rows ~6-10) — tight crop, excludes side pebbles
await blob(TILESET, 'dirt-blob', 11, 93, 56, 85);
// brown dirt blob (cols ~9-12, rows ~6-10)
await blob(TILESET, 'dirt-blob2', 134, 96, 90, 96);
// pure water pond (tileset, pixels ~x198-282 y282-344)
await blob(TILESET, 'water-blob', 196, 281, 70, 66);
