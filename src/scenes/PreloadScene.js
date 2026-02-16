import Phaser from 'phaser';
import AssetRegistry from '../systems/AssetRegistry.js';

/**
 * PreloadScene — loads external PNG assets, extracts spritesheet frames
 * into the existing texture key names, then hands off to SpriteFactory
 * (via AssetRegistry.fillMissing) for anything without asset coverage.
 *
 * IMPORTANT sizing notes:
 *  - Procedural player textures are 32x32 (8x8 art * PIXEL_SCALE 4)
 *  - Procedural large animals are 32x32 (8x8 * 4)
 *  - Procedural small animals are 24x24 (6x6 * 4)
 *  - Procedural items are 24x24 (6x6 * 4)
 *  - Procedural terrain tiles are 64x64 (16x16 * 4)
 *  - Asset animal frames are 16x16 native → need 2x scale to match 32x32
 *  - Asset player frames are 32x32 native → need 2x scale (child sprite is small in frame)
 *  - Terrain tiles: keep procedural (Farm RPG tilesets are autotile, not solid fills)
 */
export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  init() {
    this.registry.set('assetRegistry', new AssetRegistry());
  }

  preload() {
    // ── Progress bar ──
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    const progressBox = this.add.rectangle(w / 2, h / 2, 400, 40, 0x333333);
    const progressBar = this.add.rectangle(w / 2 - 190, h / 2, 0, 28, 0x4CAF50);
    progressBar.setOrigin(0, 0.5);

    const loadingText = this.add.text(w / 2, h / 2 - 40, 'Loading assets...', {
      fontSize: '24px', color: '#FFFFFF', fontFamily: 'Arial, sans-serif',
    }).setOrigin(0.5);

    this.load.on('progress', (value) => {
      progressBar.width = 380 * value;
    });

    this.load.on('complete', () => {
      loadingText.setText('Preparing textures...');
    });

    // ── Load spritesheets ──

    // Player (composited child NPC — 32x32 frames)
    this.load.spritesheet('sheet-player-idle', 'assets/player/idle.png',
      { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('sheet-player-walk', 'assets/player/walk.png',
      { frameWidth: 32, frameHeight: 32 });

    // ── Woodland Animals ──
    // Multi-row animals: each animal spans 32px wide × 32px tall (or 48 for bear).
    // The sheets are 128px wide = 4 animal frames per row.
    this.load.spritesheet('sheet-bear-walk', 'assets/animals/woodland/bear-walk.png',
      { frameWidth: 32, frameHeight: 48 });   // 128x144 → 4 cols × 3 rows
    this.load.spritesheet('sheet-fox', 'assets/animals/woodland/fox.png',
      { frameWidth: 32, frameHeight: 32 });   // 128x224 → 4 cols × 7 rows
    this.load.spritesheet('sheet-white-fox', 'assets/animals/woodland/white-fox.png',
      { frameWidth: 32, frameHeight: 32 });   // 128x224 → 4 cols × 7 rows
    this.load.spritesheet('sheet-deer-walk', 'assets/animals/woodland/deer-walk.png',
      { frameWidth: 32, frameHeight: 32 });   // 128x96 → 4 cols × 3 rows
    this.load.spritesheet('sheet-capybara', 'assets/animals/woodland/capybara.png',
      { frameWidth: 32, frameHeight: 32 });   // 128x544 → 4 cols × 17 rows
    // Single-row animals: 16x16 frames are correct
    this.load.spritesheet('sheet-rabbit', 'assets/animals/woodland/rabbit.png',
      { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('sheet-porcupine', 'assets/animals/woodland/porcupine.png',
      { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('sheet-bird-idle', 'assets/animals/woodland/bird-idle.png',
      { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('sheet-bird-walk', 'assets/animals/woodland/bird-walk.png',
      { frameWidth: 16, frameHeight: 16 });

    // ── Desert Animals (16x16 frames) ──
    this.load.spritesheet('sheet-camel', 'assets/animals/desert/camel.png',
      { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('sheet-turtle-walk', 'assets/animals/desert/turtle-walk.png',
      { frameWidth: 32, frameHeight: 32 });   // 128x96 → 4 cols × 3 rows
    this.load.spritesheet('sheet-turtle-idle', 'assets/animals/desert/turtle-idle.png',
      { frameWidth: 32, frameHeight: 32 });   // 64x96 → 2 cols × 3 rows
    this.load.spritesheet('sheet-frog', 'assets/animals/desert/frog.png',
      { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('sheet-crab', 'assets/animals/desert/crab.png',
      { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('sheet-leaping-frog', 'assets/animals/desert/leaping-frog.png',
      { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('sheet-vulture-idle', 'assets/animals/desert/vulture-idle.png',
      { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('sheet-vulture-fly', 'assets/animals/desert/vulture-fly.png',
      { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('sheet-snow-fox', 'assets/animals/desert/snow-fox.png',
      { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('sheet-chicken', 'assets/animals/desert/chicken.png',
      { frameWidth: 16, frameHeight: 16 });

    // ── Items ──
    this.load.spritesheet('sheet-fruits', 'assets/items/fruits.png',
      { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('sheet-mushrooms', 'assets/items/mushrooms.png',
      { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('sheet-wood', 'assets/items/wood.png',
      { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('sheet-stones', 'assets/items/stones.png',
      { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('sheet-fish', 'assets/items/fish.png',
      { frameWidth: 16, frameHeight: 16 });

    // ── Decorations ──
    this.load.spritesheet('sheet-flowers', 'assets/decorations/flowers.png',
      { frameWidth: 16, frameHeight: 16 });
    this.load.image('img-rocks', 'assets/decorations/rocks.png');
    this.load.image('img-cactus1', 'assets/decorations/cacti/cactus1.png');
    this.load.image('img-cactus2', 'assets/decorations/cacti/cactus2.png');

    // Trees (animated sheets — 32x48 frames, 4 cols per row)
    this.load.spritesheet('sheet-maple-tree', 'assets/decorations/maple-tree-anim.png',
      { frameWidth: 32, frameHeight: 48 });
    this.load.spritesheet('sheet-birch-tree', 'assets/decorations/birch-tree-anim.png',
      { frameWidth: 32, frameHeight: 48 });
    this.load.spritesheet('sheet-pine-tree', 'assets/decorations/pine-tree-anim.png',
      { frameWidth: 32, frameHeight: 48 });
  }

  create() {
    const reg = this.registry.get('assetRegistry');

    // Helper: extract a single frame from a spritesheet to a standalone texture
    const extract = (sheetKey, frameIndex, targetKey, scaleUp = 1) => {
      const tex = this.textures.get(sheetKey);
      if (!tex || tex.key === '__MISSING') return false;

      const frame = tex.get(frameIndex);
      if (!frame || frame.name === '__BASE') return false;

      const canvas = document.createElement('canvas');
      canvas.width = Math.round(frame.width * scaleUp);
      canvas.height = Math.round(frame.height * scaleUp);
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(
        frame.source.image,
        frame.cutX, frame.cutY, frame.cutWidth, frame.cutHeight,
        0, 0, canvas.width, canvas.height
      );
      this.textures.addCanvas(targetKey, canvas);
      reg.markLoaded(targetKey);
      return true;
    };

    // Helper: extract a rectangular region from a sheet/image source
    // smooth=true for rendered/painted art that needs anti-aliased downscaling
    const extractRegion = (imgKey, sx, sy, sw, sh, targetKey, targetW, targetH, smooth = false) => {
      const tex = this.textures.get(imgKey);
      if (!tex || tex.key === '__MISSING') return false;
      const source = tex.getSourceImage();
      if (!source) return false;

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = smooth;
      ctx.drawImage(source, sx, sy, sw, sh, 0, 0, targetW, targetH);
      this.textures.addCanvas(targetKey, canvas);
      reg.markLoaded(targetKey);
      return true;
    };

    // ─── Scale constants ───
    // Animals: 16x16 native → 32x32 to match procedural (8x8 * PIXEL_SCALE 4)
    const animalScale = 2;
    // Small animals: 16x16 native → 24x24 to match procedural (6x6 * 4)
    const smallAnimalScale = 1.5;
    // Player: 32x32 native → 64x64 (child sprite is small within frame, needs enlargement)
    const playerScale = 2;
    // Items from 16x16 sheets: → 24x24 to match procedural (6x6 * 4)
    const itemScale16 = 1.5;
    // Items from 32x32 sheets (fruits): scale down slightly to ~24x24
    const itemScale32 = 0.75;

    // ─── PLAYER ───
    // Walk sheet: 16 frames in single row (32x32 each)
    // Layout: frames 0-3 = down, 4-7 = left, 8-11 = right, 12-15 = up
    extract('sheet-player-walk', 0, 'player-down-1', playerScale);
    extract('sheet-player-walk', 1, 'player-down-2', playerScale);
    extract('sheet-player-walk', 4, 'player-left-1', playerScale);
    extract('sheet-player-walk', 5, 'player-left-2', playerScale);
    extract('sheet-player-walk', 8, 'player-right-1', playerScale);
    extract('sheet-player-walk', 9, 'player-right-2', playerScale);
    extract('sheet-player-walk', 12, 'player-up-1', playerScale);
    extract('sheet-player-walk', 13, 'player-up-2', playerScale);

    // ─── WOODLAND ANIMALS ───
    // Multi-row animals: 32x32 native frames, but art is small within the cell.
    // Scale 2x to match the visual size of single-row animals (16x16 * 2 = 32x32).
    // All use extract() with Phaser's frame API (reliable for spritesheets).

    // Bear — 32x48 frames, 4 cols × 3 rows; row 0 = down-facing
    extract('sheet-bear-walk', 0, 'animal-bear-1', animalScale);
    extract('sheet-bear-walk', 1, 'animal-bear-2', animalScale);

    // Wolf — White Fox, 32x32 frames, 4 cols × 7 rows; row 0 = down-facing
    extract('sheet-white-fox', 0, 'animal-wolf-1', animalScale);
    extract('sheet-white-fox', 1, 'animal-wolf-2', animalScale);

    // Badger — Porcupine (64x16 = 4 frames, single row, 16x16)
    extract('sheet-porcupine', 0, 'animal-badger-1', animalScale);
    extract('sheet-porcupine', 2, 'animal-badger-2', animalScale);

    // Capybara — 32x32 frames, 4 cols × 17 rows; row 0 = down-facing
    extract('sheet-capybara', 0, 'animal-capybara-1', animalScale);
    extract('sheet-capybara', 1, 'animal-capybara-2', animalScale);

    // Deer — 32x32 frames, 4 cols × 3 rows; row 0 = down-facing
    extract('sheet-deer-walk', 0, 'animal-deer-1', animalScale);
    extract('sheet-deer-walk', 1, 'animal-deer-2', animalScale);

    // Rabbit — (64x176); single-row 16x16 frames
    extract('sheet-rabbit', 0, 'animal-rabbit-1', animalScale);
    extract('sheet-rabbit', 1, 'animal-rabbit-2', animalScale);

    // Fox — 32x32 frames, 4 cols × 7 rows; row 0 = down-facing
    extract('sheet-fox', 0, 'animal-fox-1', animalScale);
    extract('sheet-fox', 1, 'animal-fox-2', animalScale);

    // Bird — small animal (16x16 → 24x24)
    extract('sheet-bird-idle', 0, 'animal-bird-1', smallAnimalScale);
    extract('sheet-bird-walk', 0, 'animal-bird-2', smallAnimalScale);

    // ─── DESERT ANIMALS ───

    // Camel (64x16 = 4 frames)
    extract('sheet-camel', 0, 'animal-camel-1', animalScale);
    extract('sheet-camel', 1, 'animal-camel-2', animalScale);

    // Crocodile (now turtle) — 32x32 frames, 4 cols × 3 rows; row 0 = down-facing
    extract('sheet-turtle-walk', 0, 'animal-crocodile-1', animalScale);
    extract('sheet-turtle-walk', 1, 'animal-crocodile-2', animalScale);

    // Snake (now frog) — Frogs-Sheet.png (128x96 = 8x6)
    extract('sheet-frog', 0, 'animal-snake-1', smallAnimalScale);
    extract('sheet-frog', 1, 'animal-snake-2', smallAnimalScale);

    // Scorpion (now crab) — CoralCrab.png (64x16 = 4 frames)
    extract('sheet-crab', 0, 'animal-scorpion-1', smallAnimalScale);
    extract('sheet-crab', 1, 'animal-scorpion-2', smallAnimalScale);

    // Lizard (now leaping frog) — LeapingFrog.png (64x16 = 4 frames)
    extract('sheet-leaping-frog', 0, 'animal-lizard-1', smallAnimalScale);
    extract('sheet-leaping-frog', 1, 'animal-lizard-2', smallAnimalScale);

    // Vulture — Black bird idle/fly (small)
    extract('sheet-vulture-idle', 0, 'animal-vulture-1', smallAnimalScale);
    extract('sheet-vulture-fly', 0, 'animal-vulture-2', smallAnimalScale);

    // Fennec (now snow fox) — SnowFox.png (64x16 = 4 frames)
    extract('sheet-snow-fox', 0, 'animal-fennec-1', animalScale);
    extract('sheet-snow-fox', 1, 'animal-fennec-2', animalScale);

    // Roadrunner (now chicken) — CluckingChicken.png (64x16 = 4 frames)
    extract('sheet-chicken', 0, 'animal-roadrunner-1', smallAnimalScale);
    extract('sheet-chicken', 1, 'animal-roadrunner-2', smallAnimalScale);

    // ─── TERRAIN ───
    // Farm RPG tilesets are autotile (edges/transitions), NOT solid fills.
    // Let SpriteFactory generate terrain procedurally — it produces proper
    // solid-fill noise tiles that tile seamlessly.
    // (No terrain extraction here — fallback handles it.)

    // ─── ITEMS ───
    // Fruits.png: 128x96 = 4 cols x 3 rows of 32x32
    // Frame 6 = strawberry (row 1, col 2)
    extract('sheet-fruits', 6, 'item-berries', itemScale32);

    // Mushroom — from fruits.png frame 9 (brown mushroom, 32x32)
    // (mushrooms.png is actually a terrain tileset, not item sprites)
    extract('sheet-fruits', 9, 'item-mushrooms', itemScale32);

    // Wood props: 64x16 = 4 frames of 16x16
    // Frame 1 is cleaner/more uniform than frame 0
    extract('sheet-wood', 1, 'item-planks', itemScale16);

    // Stones: 128x32 = 8 cols x 2 rows of 16x16
    extract('sheet-stones', 0, 'item-stones', itemScale16);

    // Fish: 160x240 = 10 cols x 15 rows of 16x16
    // Frame 1 = blue fish (top row, second from left)
    extract('sheet-fish', 1, 'item-fish', itemScale16);

    // ─── DECORATIONS ───

    // Flowers: 64x64 = 4 cols x 4 rows of 16x16
    // Row 0: colored flowers (white, green, yellow, pink)
    // Row 1: similar variants — frame 4 looks red/pink, frame 5 white, etc.
    // Procedural flowers are 12x12 (3x3 * 4). Asset flowers 16x16 → scale to 12x12
    const flowerScale = 0.75; // 16x16 → 12x12
    extract('sheet-flowers', 3, 'flower-red', flowerScale);      // pink/red flower
    extract('sheet-flowers', 2, 'flower-yellow', flowerScale);   // yellow flower
    extract('sheet-flowers', 0, 'flower-purple', flowerScale);   // white/light flower

    // Rocks: 768x128, 6 rocks each ~128x128 (painted style, use smoothing)
    // Procedural rock is 24x20 (6x5 * PIXEL_SCALE 4)
    extractRegion('img-rocks', 0, 0, 128, 128, 'rock', 24, 20, true);
    // Desert sandstone — use 4th rock (flatter shape at offset 384)
    extractRegion('img-rocks', 384, 0, 128, 128, 'sandstone-rock', 24, 20, true);

    // Cacti: 128x128 individual PNGs (painted style, use smoothing)
    // Procedural cactus is 24x24 (6x6 * 4)
    extractRegion('img-cactus1', 0, 0, 128, 128, 'cactus', 24, 24, true);
    extractRegion('img-cactus2', 0, 0, 128, 128, 'cactus-fruit', 24, 24, true);

    // ─── TREES ───
    // Animated tree sheets: 32x48 frames, 4 cols per row
    // Row 1 (frame 4) = fully grown tree in each sheet
    // Scale 1.5x → 48x72 to be visible at world scale (procedural canopy was 40x32)
    const treeScale = 1.5;
    extract('sheet-maple-tree', 4, 'tree-maple', treeScale);
    extract('sheet-birch-tree', 4, 'tree-birch', treeScale);
    extract('sheet-pine-tree', 4, 'tree-pine', treeScale);

    // ─── Fill missing with procedural fallback ───
    // This generates ALL procedural textures but skips any key already
    // loaded from assets above (terrain, portals, UI, particles, desert
    // terrain, straw, acorns, fish, desert items, etc.)
    reg.fillMissing(this);

    console.log(`PreloadScene: ${reg.loaded.size} textures loaded from assets`);

    // Transition to TitleScene
    this.scene.start('TitleScene');
  }
}
