import { PIXEL_SCALE } from '../config.js';

export default class SpriteFactory {
  constructor(scene) {
    this.scene = scene;
    this.px = PIXEL_SCALE; // each art pixel = 4 screen pixels
  }

  // Core: draw a 2D color grid as a chunky pixel texture
  tex(key, grid, scale) {
    const ps = scale || this.px;
    const h = grid.length;
    const w = grid[0].length;
    const canvas = document.createElement('canvas');
    canvas.width = w * ps;
    canvas.height = h * ps;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const c = grid[y][x];
        if (c) {
          ctx.fillStyle = c;
          ctx.fillRect(x * ps, y * ps, ps, ps);
        }
      }
    }
    this.scene.textures.addCanvas(key, canvas);
  }

  // Noise pattern for terrain tiles
  noise(w, h, colors) {
    const grid = [];
    for (let y = 0; y < h; y++) {
      grid[y] = [];
      for (let x = 0; x < w; x++) {
        grid[y][x] = colors[Math.floor(Math.random() * colors.length)];
      }
    }
    return grid;
  }

  // Mirror a grid horizontally
  mirror(grid) {
    return grid.map(row => [...row].reverse());
  }

  // ─── Generate everything ───

  generateAll() {
    this.generatePlayer();
    this.generateAnimals();
    this.generateItems();
    this.generateTerrain();
    this.generateDecorations();
    this.generateBridge();
    this.generatePortalStages();
    this.generateUI();
    this.generateParticles();
    // Desert biome textures
    this.generateDesertTerrain();
    this.generateDesertDecorations();
    this.generateDesertAnimals();
    this.generateDesertItems();
  }

  // ─── PLAYER (8x8 = 32x32) ───

  generatePlayer() {
    const _ = null;
    const H = '#F5C542'; // hair
    const S = '#FFE5B4'; // skin
    const E = '#333333'; // eyes
    const B = '#4169E1'; // blue shirt
    const P = '#8B6914'; // brown pants
    const O = '#654321'; // shoes
    const A = '#FFE5B4'; // arms (skin)

    // Down frame 1 (facing camera)
    this.tex('player-down-1', [
      [_, _, H, H, H, H, _, _],
      [_, H, H, H, H, H, H, _],
      [_, S, E, S, S, E, S, _],
      [_, S, S, S, S, S, S, _],
      [_, _, B, B, B, B, _, _],
      [_, A, B, B, B, B, A, _],
      [_, _, P, P, P, P, _, _],
      [_, _, O, _, _, O, _, _],
    ]);

    // Down frame 2 (walk)
    this.tex('player-down-2', [
      [_, _, H, H, H, H, _, _],
      [_, H, H, H, H, H, H, _],
      [_, S, E, S, S, E, S, _],
      [_, S, S, S, S, S, S, _],
      [_, _, B, B, B, B, _, _],
      [_, A, B, B, B, B, A, _],
      [_, _, P, P, P, P, _, _],
      [_, O, _, _, _, _, O, _],
    ]);

    // Up frame 1 (back view)
    const Hb = '#D4A830'; // darker hair for back
    this.tex('player-up-1', [
      [_, _, Hb, Hb, Hb, Hb, _, _],
      [_, Hb, Hb, Hb, Hb, Hb, Hb, _],
      [_, Hb, Hb, Hb, Hb, Hb, Hb, _],
      [_, _, Hb, Hb, Hb, Hb, _, _],
      [_, _, B, B, B, B, _, _],
      [_, A, B, B, B, B, A, _],
      [_, _, P, P, P, P, _, _],
      [_, _, O, _, _, O, _, _],
    ]);

    // Up frame 2
    this.tex('player-up-2', [
      [_, _, Hb, Hb, Hb, Hb, _, _],
      [_, Hb, Hb, Hb, Hb, Hb, Hb, _],
      [_, Hb, Hb, Hb, Hb, Hb, Hb, _],
      [_, _, Hb, Hb, Hb, Hb, _, _],
      [_, _, B, B, B, B, _, _],
      [_, A, B, B, B, B, A, _],
      [_, _, P, P, P, P, _, _],
      [_, O, _, _, _, _, O, _],
    ]);

    // Left frame 1 (side view)
    this.tex('player-left-1', [
      [_, _, H, H, H, _, _, _],
      [_, H, H, H, H, H, _, _],
      [_, E, S, S, S, _, _, _],
      [_, S, S, S, _, _, _, _],
      [_, _, B, B, B, _, _, _],
      [_, _, B, B, B, A, _, _],
      [_, _, P, P, P, _, _, _],
      [_, _, O, _, O, _, _, _],
    ]);

    // Left frame 2
    this.tex('player-left-2', [
      [_, _, H, H, H, _, _, _],
      [_, H, H, H, H, H, _, _],
      [_, E, S, S, S, _, _, _],
      [_, S, S, S, _, _, _, _],
      [_, _, B, B, B, _, _, _],
      [_, _, B, B, B, A, _, _],
      [_, _, P, P, P, _, _, _],
      [_, O, _, _, _, O, _, _],
    ]);

    // Right is mirror of left
    this.tex('player-right-1', this.mirror([
      [_, _, H, H, H, _, _, _],
      [_, H, H, H, H, H, _, _],
      [_, E, S, S, S, _, _, _],
      [_, S, S, S, _, _, _, _],
      [_, _, B, B, B, _, _, _],
      [_, _, B, B, B, A, _, _],
      [_, _, P, P, P, _, _, _],
      [_, _, O, _, O, _, _, _],
    ]));

    this.tex('player-right-2', this.mirror([
      [_, _, H, H, H, _, _, _],
      [_, H, H, H, H, H, _, _],
      [_, E, S, S, S, _, _, _],
      [_, S, S, S, _, _, _, _],
      [_, _, B, B, B, _, _, _],
      [_, _, B, B, B, A, _, _],
      [_, _, P, P, P, _, _, _],
      [_, O, _, _, _, O, _, _],
    ]));

    // Shadow
    this.tex('shadow', [
      [_, _, _, _, _, _, _, _],
      [_, _, _, _, _, _, _, _],
      [_, _, _, _, _, _, _, _],
      [_, _, _, _, _, _, _, _],
      [_, _, _, _, _, _, _, _],
      [_, _, _, _, _, _, _, _],
      [_, '#00000040', '#00000060', '#00000060', '#00000060', '#00000060', '#00000040', _],
      ['#00000020', '#00000040', '#00000060', '#00000060', '#00000060', '#00000060', '#00000040', '#00000020'],
    ]);
  }

  // ─── ANIMALS (8x8 = 32x32, except bird 6x6 = 24x24) ───

  generateAnimals() {
    const _ = null;

    // Bear — big, brown, round
    const Br = '#8B4513'; // dark brown
    const Bl = '#D2691E'; // lighter belly
    const Bk = '#333333'; // black
    const Bn = '#2F1B0E'; // nose
    this.tex('animal-bear-1', [
      [_, Br, Br, _, _, Br, Br, _],
      [Br, Br, Br, Br, Br, Br, Br, Br],
      [Br, Bk, Br, Br, Br, Br, Bk, Br],
      [Br, Br, Br, Bn, Bn, Br, Br, Br],
      [_, Br, Bl, Bl, Bl, Bl, Br, _],
      [_, Br, Bl, Bl, Bl, Bl, Br, _],
      [_, Br, Br, _, _, Br, Br, _],
      [_, Bk, Bk, _, _, Bk, Bk, _],
    ]);
    this.tex('animal-bear-2', [
      [_, Br, Br, _, _, Br, Br, _],
      [Br, Br, Br, Br, Br, Br, Br, Br],
      [Br, Bk, Br, Br, Br, Br, Bk, Br],
      [Br, Br, Br, Bn, Bn, Br, Br, Br],
      [_, Br, Bl, Bl, Bl, Bl, Br, _],
      [_, Br, Bl, Bl, Bl, Bl, Br, _],
      [_, Br, _, Br, Br, _, Br, _],
      [_, Bk, _, Bk, Bk, _, Bk, _],
    ]);

    // Wolf — gray, pointed ears
    const Wg = '#808080'; // gray
    const Wl = '#C0C0C0'; // light gray
    const Wy = '#CCCC00'; // yellow eyes
    this.tex('animal-wolf-1', [
      [Wg, Wg, _, _, _, _, Wg, Wg],
      [Wg, Wg, Wg, Wg, Wg, Wg, Wg, Wg],
      [Wg, Wy, Wg, Wg, Wg, Wg, Wy, Wg],
      [_, Wg, Wg, Bk, Bk, Wg, Wg, _],
      [_, Wg, Wl, Wl, Wl, Wl, Wg, _],
      [_, Wg, Wg, Wg, Wg, Wg, Wg, _],
      [_, Wg, Wg, _, _, Wg, Wg, _],
      [_, Bk, Bk, _, _, Bk, Bk, _],
    ]);
    this.tex('animal-wolf-2', [
      [Wg, Wg, _, _, _, _, Wg, Wg],
      [Wg, Wg, Wg, Wg, Wg, Wg, Wg, Wg],
      [Wg, Wy, Wg, Wg, Wg, Wg, Wy, Wg],
      [_, Wg, Wg, Bk, Bk, Wg, Wg, _],
      [_, Wg, Wl, Wl, Wl, Wl, Wg, _],
      [_, Wg, Wg, Wg, Wg, Wg, Wg, _],
      [_, Wg, _, Wg, Wg, _, Wg, _],
      [_, Bk, _, Bk, Bk, _, Bk, _],
    ]);

    // Badger — black/white face stripes, gray body
    const Bg = '#696969'; // gray body
    const Bw = '#FFFFFF'; // white stripe
    this.tex('animal-badger-1', [
      [_, Bk, Bw, Bk, Bk, Bw, Bk, _],
      [Bk, Bw, Bk, Bw, Bw, Bk, Bw, Bk],
      [Bk, Bk, Bk, Bk, Bk, Bk, Bk, Bk],
      [_, Bg, Bg, Bg, Bg, Bg, Bg, _],
      [_, Bg, Bg, Bg, Bg, Bg, Bg, _],
      [_, Bg, Bg, Bg, Bg, Bg, Bg, _],
      [_, Bk, Bk, _, _, Bk, Bk, _],
      [_, Bk, Bk, _, _, Bk, Bk, _],
    ]);
    this.tex('animal-badger-2', [
      [_, Bk, Bw, Bk, Bk, Bw, Bk, _],
      [Bk, Bw, Bk, Bw, Bw, Bk, Bw, Bk],
      [Bk, Bk, Bk, Bk, Bk, Bk, Bk, Bk],
      [_, Bg, Bg, Bg, Bg, Bg, Bg, _],
      [_, Bg, Bg, Bg, Bg, Bg, Bg, _],
      [_, Bg, Bg, Bg, Bg, Bg, Bg, _],
      [_, Bk, _, Bk, Bk, _, Bk, _],
      [_, Bk, _, Bk, Bk, _, Bk, _],
    ]);

    // Capybara — warm brown, round, friendly
    const Cb = '#A0522D'; // brown body
    const Cl = '#C8844A'; // lighter face
    const Ce = '#1A1A1A'; // eyes
    this.tex('animal-capybara-1', [
      [_, _, Cb, Cb, Cb, Cb, _, _],
      [_, Cb, Cl, Cl, Cl, Cl, Cb, _],
      [_, Cb, Ce, Cl, Cl, Ce, Cb, _],
      [_, Cb, Cl, Bk, Bk, Cl, Cb, _],
      [Cb, Cb, Cb, Cb, Cb, Cb, Cb, Cb],
      [Cb, Cb, Cb, Cb, Cb, Cb, Cb, Cb],
      [_, Cb, Cb, _, _, Cb, Cb, _],
      [_, Bk, Bk, _, _, Bk, Bk, _],
    ]);
    this.tex('animal-capybara-2', [
      [_, _, Cb, Cb, Cb, Cb, _, _],
      [_, Cb, Cl, Cl, Cl, Cl, Cb, _],
      [_, Cb, Ce, Cl, Cl, Ce, Cb, _],
      [_, Cb, Cl, Bk, Bk, Cl, Cb, _],
      [Cb, Cb, Cb, Cb, Cb, Cb, Cb, Cb],
      [Cb, Cb, Cb, Cb, Cb, Cb, Cb, Cb],
      [_, Cb, _, Cb, Cb, _, Cb, _],
      [_, Bk, _, Bk, Bk, _, Bk, _],
    ]);

    // Deer — tan, spots, thin legs
    const Dt = '#DEB887'; // tan
    const Ds = '#FFFFFF'; // spots
    const Da = '#B8860B'; // antlers
    this.tex('animal-deer-1', [
      [Da, _, Dt, Dt, Dt, Dt, _, Da],
      [_, Dt, Dt, Dt, Dt, Dt, Dt, _],
      [_, Bk, Dt, Dt, Dt, Dt, Bk, _],
      [_, Dt, Dt, Bk, Dt, Dt, Dt, _],
      [_, Dt, Ds, Dt, Ds, Dt, Dt, _],
      [_, _, Dt, Dt, Dt, Dt, _, _],
      [_, _, Dt, _, _, Dt, _, _],
      [_, _, Bk, _, _, Bk, _, _],
    ]);
    this.tex('animal-deer-2', [
      [Da, _, Dt, Dt, Dt, Dt, _, Da],
      [_, Dt, Dt, Dt, Dt, Dt, Dt, _],
      [_, Bk, Dt, Dt, Dt, Dt, Bk, _],
      [_, Dt, Dt, Bk, Dt, Dt, Dt, _],
      [_, Dt, Ds, Dt, Ds, Dt, Dt, _],
      [_, _, Dt, Dt, Dt, Dt, _, _],
      [_, Dt, _, Dt, Dt, _, Dt, _],
      [_, Bk, _, _, _, _, Bk, _],
    ]);

    // Rabbit — white, long ears, pink inner
    const Rw = '#F5F5F5'; // white
    const Rp = '#FFB6C1'; // pink inner ear
    this.tex('animal-rabbit-1', [
      [_, Rw, Rp, _, _, Rw, Rp, _],
      [_, Rw, Rp, _, _, Rw, Rp, _],
      [_, _, Rw, Rw, Rw, Rw, _, _],
      [_, Rw, Bk, Rw, Rw, Bk, Rw, _],
      [_, Rw, Rw, Rp, Rw, Rw, Rw, _],
      [_, _, Rw, Rw, Rw, Rw, _, _],
      [_, _, Rw, _, _, Rw, _, _],
      [_, _, Rp, _, _, Rp, _, _],
    ]);
    this.tex('animal-rabbit-2', [
      [_, Rw, Rp, _, _, Rw, Rp, _],
      [_, Rw, Rp, _, _, Rw, Rp, _],
      [_, _, Rw, Rw, Rw, Rw, _, _],
      [_, Rw, Bk, Rw, Rw, Bk, Rw, _],
      [_, Rw, Rw, Rp, Rw, Rw, Rw, _],
      [_, _, Rw, Rw, Rw, Rw, _, _],
      [_, Rw, _, Rw, Rw, _, Rw, _],
      [_, Rp, _, _, _, _, Rp, _],
    ]);

    // Fox — orange, white chest, bushy
    const Fo = '#FF8C00'; // orange
    const Fw = '#FFFFFF'; // white
    this.tex('animal-fox-1', [
      [_, Fo, Fo, _, _, Fo, Fo, _],
      [_, Fo, Fo, Fo, Fo, Fo, Fo, _],
      [Fo, Bk, Fo, Fo, Fo, Fo, Bk, Fo],
      [_, Fo, Fo, Bk, Fo, Fo, Fo, _],
      [_, _, Fw, Fw, Fw, Fw, _, _],
      [_, Fo, Fo, Fo, Fo, Fo, Fo, _],
      [_, _, Fo, _, _, Fo, _, _],
      [_, _, Bk, _, _, Bk, _, _],
    ]);
    this.tex('animal-fox-2', [
      [_, Fo, Fo, _, _, Fo, Fo, _],
      [_, Fo, Fo, Fo, Fo, Fo, Fo, _],
      [Fo, Bk, Fo, Fo, Fo, Fo, Bk, Fo],
      [_, Fo, Fo, Bk, Fo, Fo, Fo, _],
      [_, _, Fw, Fw, Fw, Fw, _, _],
      [_, Fo, Fo, Fo, Fo, Fo, Fo, _],
      [_, Fo, _, Fo, Fo, _, Fo, _],
      [_, Bk, _, _, _, _, Bk, _],
    ]);

    // Bird — small (6x6), bright blue, yellow beak
    const Bb = '#4169E1'; // blue
    const By = '#FFD700'; // yellow beak
    this.tex('animal-bird-1', [
      [_, _, Bb, Bb, _, _],
      [_, Bb, Bk, Bb, Bb, _],
      [By, Bb, Bb, Bb, Bb, _],
      [_, Bb, Bb, Bb, Bb, _],
      [_, _, Bb, _, Bb, _],
      [_, _, Bk, _, Bk, _],
    ]);
    this.tex('animal-bird-2', [
      [_, _, Bb, Bb, _, _],
      [_, Bb, Bk, Bb, Bb, _],
      [By, Bb, Bb, Bb, Bb, Bb],
      [_, Bb, Bb, Bb, Bb, _],
      [_, _, Bb, _, Bb, _],
      [_, _, Bk, _, Bk, _],
    ]);
  }

  // ─── ITEMS (6x6 = 24x24) ───

  generateItems() {
    const _ = null;

    // Berries
    const Gr = '#228B22'; // green leaf
    const Rd = '#DC143C'; // red berry
    this.tex('item-berries', [
      [_, _, Gr, Gr, _, _],
      [_, Rd, Gr, _, Rd, _],
      [Rd, Rd, Rd, Rd, Rd, Rd],
      [Rd, '#FF3355', Rd, Rd, '#FF3355', Rd],
      [_, Rd, Rd, Rd, Rd, _],
      [_, _, Rd, Rd, _, _],
    ]);

    // Mushroom
    const Mr = '#FF0000'; // red cap
    const Mw = '#FFFFFF'; // white spots
    const Ms = '#F5DEB3'; // stem
    this.tex('item-mushrooms', [
      [_, Mr, Mr, Mr, Mr, _],
      [Mr, Mw, Mr, Mr, Mw, Mr],
      [Mr, Mr, Mr, Mr, Mr, Mr],
      [_, _, Ms, Ms, _, _],
      [_, _, Ms, Ms, _, _],
      [_, Ms, Ms, Ms, Ms, _],
    ]);

    // Acorn
    const Ac = '#D2B48C'; // cap
    const An = '#8B4513'; // nut
    this.tex('item-acorns', [
      [_, Ac, Ac, Ac, Ac, _],
      [Ac, '#BFA07A', Ac, Ac, '#BFA07A', Ac],
      [_, An, An, An, An, _],
      [_, An, '#A0522D', '#A0522D', An, _],
      [_, _, An, An, _, _],
      [_, _, _, _, _, _],
    ]);

    // Fish
    const Fb = '#4682B4'; // blue body
    const Fl = '#87CEEB'; // light belly
    const Fe = '#333333'; // eye
    this.tex('item-fish', [
      [_, _, _, Fb, _, _],
      [_, Fb, Fb, Fb, Fb, _],
      [Fb, Fb, Fe, Fb, Fl, Fb],
      [_, Fb, Fb, Fl, Fl, _],
      [_, Fb, Fb, Fb, Fb, _],
      [_, _, _, Fb, _, _],
    ]);

    // Planks — darker wood so they stand out against dirt/sand
    const Pw = '#A0714A'; // medium-dark wood
    const Pl = '#B8854C'; // lighter plank highlight
    const Pd = '#7A5230'; // dark grain / gap between boards
    const Pn = '#5C3A1E'; // nail / notch
    this.tex('item-planks', [
      [Pw, Pl, Pw, Pl, Pw, Pl],
      [Pd, Pd, Pd, Pd, Pd, Pd],
      [Pl, Pw, Pn, Pw, Pl, Pw],
      [Pd, Pd, Pd, Pd, Pd, Pd],
      [Pw, Pl, Pw, Pn, Pw, Pl],
      [Pw, Pw, Pl, Pw, Pw, Pw],
    ]);

    // Stones
    const Sg = '#A9A9A9'; // gray
    const Sd = '#808080'; // dark
    const Sl = '#C0C0C0'; // light
    this.tex('item-stones', [
      [_, _, Sg, Sg, _, _],
      [_, Sg, Sl, Sg, Sg, _],
      [Sg, Sl, Sg, Sg, Sd, Sg],
      [Sg, Sg, Sg, Sd, Sg, Sg],
      [_, Sg, Sd, Sg, Sg, _],
      [_, _, Sg, Sg, _, _],
    ]);

    // Straw bundle
    const Sy = '#FFD700'; // yellow
    const Sb = '#DAA520'; // band
    this.tex('item-straw', [
      [_, Sy, _, Sy, _, Sy],
      [_, Sy, Sy, Sy, Sy, _],
      [_, Sb, Sb, Sb, Sb, _],
      [_, Sy, Sy, Sy, Sy, _],
      [_, Sy, Sy, Sy, Sy, _],
      [Sy, _, Sy, Sy, _, Sy],
    ]);
  }

  // ─── TERRAIN (16x16 = 64x64) ───

  generateTerrain() {
    // Grass variants — lighter palette so trees/bushes stand out
    for (let i = 0; i < 3; i++) {
      this.tex(`terrain-grass-${i}`, this.noise(16, 16, ['#5DBB63', '#7EC850', '#6ABF4B', '#8FD460', '#5DBB63']));
    }

    // Water variants
    for (let i = 0; i < 3; i++) {
      this.tex(`terrain-water-${i}`, this.noise(16, 16, ['#1E90FF', '#4169E1', '#6495ED', '#1E90FF']));
    }

    // Dirt
    this.tex('terrain-dirt', this.noise(16, 16, ['#DEB887', '#D2B48C', '#C4A882', '#DEB887']));

    // Sand (riverbank)
    this.tex('terrain-sand', this.noise(16, 16, ['#F4E4C1', '#E8D5A3', '#F0DDB5', '#F4E4C1']));
  }

  // ─── DECORATIONS ───

  generateDecorations() {
    const _ = null;

    // Tree trunk (4x8 grid, scale 4 = 16x32)
    const Tb = '#8B4513';
    const Td = '#6B3410';
    this.tex('tree-trunk', [
      [_, Tb, Tb, _],
      [Tb, Tb, Td, Tb],
      [Tb, Td, Tb, Tb],
      [Tb, Tb, Tb, Td],
      [Tb, Td, Tb, Tb],
      [Tb, Tb, Td, Tb],
      [Tb, Tb, Tb, Tb],
      [Tb, Td, Tb, Tb],
    ]);

    // Tree canopy variants (10x8 grid, scale 4 = 40x32)
    const Lg = '#1A7A2E'; // leaf green — darker than grass
    const Ld = '#0E5C1A'; // dark leaf
    const Ll = '#2D9B3A'; // light leaf highlight
    this.tex('tree-canopy-1', [
      [_, _, _, Lg, Lg, Lg, Lg, _, _, _],
      [_, _, Lg, Lg, Ll, Lg, Lg, Lg, _, _],
      [_, Lg, Lg, Ll, Lg, Ld, Lg, Lg, Lg, _],
      [Lg, Lg, Ld, Lg, Lg, Lg, Ll, Lg, Lg, Lg],
      [Lg, Lg, Lg, Lg, Ll, Lg, Lg, Ld, Lg, Lg],
      [Lg, Ld, Lg, Lg, Lg, Lg, Lg, Lg, Lg, Lg],
      [_, Lg, Lg, Ld, Lg, Lg, Ll, Lg, Lg, _],
      [_, _, Lg, Lg, Lg, Lg, Lg, Lg, _, _],
    ]);

    this.tex('tree-canopy-2', [
      [_, _, _, _, Ld, Lg, _, _, _, _],
      [_, _, Lg, Ld, Lg, Lg, Lg, _, _, _],
      [_, Lg, Lg, Lg, Lg, Ll, Lg, Lg, _, _],
      [Lg, Lg, Ll, Lg, Lg, Lg, Lg, Lg, Lg, _],
      [Lg, Lg, Lg, Lg, Lg, Ld, Lg, Lg, Lg, Lg],
      [_, Lg, Lg, Ld, Lg, Lg, Lg, Ll, Lg, _],
      [_, Lg, Lg, Lg, Lg, Lg, Lg, Lg, _, _],
      [_, _, _, Lg, Lg, Lg, Lg, _, _, _],
    ]);

    // Bush (6x4 grid = 24x16) — olive/yellow-green, distinct from trees
    const Bg = '#4A7C34'; // bush green
    const Bd = '#3A6228'; // bush dark
    const Bl = '#6B9F50'; // bush light
    this.tex('bush', [
      [_, Bg, Bl, Bg, Bg, _],
      [Bg, Bl, Bd, Bg, Bl, Bg],
      [Bg, Bd, Bg, Bl, Bd, Bg],
      [_, Bg, Bg, Bg, Bg, _],
    ]);

    // Berry bush (6x4 grid = 24x16, with red dots)
    const Rb = '#DC143C';
    this.tex('bush-berry', [
      [_, Bg, Bl, Rb, Bg, _],
      [Bg, Rb, Bd, Bg, Bl, Bg],
      [Bg, Bd, Bg, Rb, Bd, Bg],
      [_, Bg, Rb, Bg, Bg, _],
    ]);

    // Rock (6x5 grid = 24x20)
    const Rg = '#A9A9A9';
    const Rs = '#808080';
    const Rl = '#C0C0C0';
    this.tex('rock', [
      [_, _, Rg, Rg, _, _],
      [_, Rg, Rl, Rg, Rg, _],
      [Rg, Rg, Rg, Rs, Rg, Rg],
      [Rg, Rs, Rg, Rg, Rg, Rg],
      [_, Rg, Rg, Rg, Rg, _],
    ]);

    // Flowers (3x3 = 12x12)
    const Fs = '#2E7D32'; // flower stem green
    this.tex('flower-red', [
      [_, '#FF4444', _],
      ['#FF4444', '#FFFF00', '#FF4444'],
      [_, Fs, _],
    ]);
    this.tex('flower-yellow', [
      [_, '#FFD700', _],
      ['#FFD700', '#FFA500', '#FFD700'],
      [_, Fs, _],
    ]);
    this.tex('flower-purple', [
      [_, '#9370DB', _],
      ['#9370DB', '#FFD700', '#9370DB'],
      [_, Fs, _],
    ]);
  }

  // ─── BRIDGE (16x16 = 64x64) ───

  generateBridge() {
    const Pw = '#C4A06A'; // plank wood
    const Pd = '#A68050'; // plank dark grain
    const Pl = '#DEB887'; // plank light
    const Rl = '#8B7355'; // rail
    const Wt = '#4682B4'; // water peek-through
    // Horizontal planks with side rails, water visible at edges
    const grid = [];
    for (let y = 0; y < 16; y++) {
      grid[y] = [];
      for (let x = 0; x < 16; x++) {
        if (x === 0 || x === 15) {
          // Side rails
          grid[y][x] = Rl;
        } else if (y % 4 === 3) {
          // Gap between planks — water shows through
          grid[y][x] = Wt;
        } else {
          // Wood plank with occasional grain
          grid[y][x] = ((x + y) % 5 === 0) ? Pd : ((x * y) % 7 === 0) ? Pl : Pw;
        }
      }
    }
    this.tex('terrain-bridge', grid);
  }

  // ─── PORTAL STAGES (12x12 = 48x48) ───

  generatePortalStages() {
    const _ = null;
    const Dr = '#DEB887'; // dirt
    const Pp = '#7B2FBE'; // portal purple
    const Pl = '#9B59B6'; // portal light purple
    const Pb = '#4A00E0'; // portal blue
    const Sg = '#A9A9A9'; // stone gray
    const Sd = '#808080'; // stone dark
    const Sl = '#C0C0C0'; // stone light
    const Rn = '#E040FB'; // rune glow (magenta)
    const Rb = '#7C4DFF'; // rune blue
    const Pw = '#FFFFFF'; // portal white
    const Pg = '#CE93D8'; // portal glow soft

    // Stage 0: Magic circle — purple/blue glowing dots in a circle on dirt
    this.tex('portal-stage-0', [
      [_, _, _, _, _, _, _, _, _, _, _, _],
      [_, _, _, _, _, _, _, _, _, _, _, _],
      [_, _, _, _, _, _, _, _, _, _, _, _],
      [_, _, _, _, Pp, Pb, Pb, Pp, _, _, _, _],
      [_, _, _, Pb, _, _, _, _, Pb, _, _, _],
      [_, _, _, Pp, _, _, _, _, Pp, _, _, _],
      [_, _, _, Pp, _, _, _, _, Pp, _, _, _],
      [_, _, _, Pb, _, _, _, _, Pb, _, _, _],
      [_, _, _, _, Pp, Pb, Pb, Pp, _, _, _, _],
      [_, _, _, _, _, _, _, _, _, _, _, _],
      [_, _, _, _, _, Pl, Pl, _, _, _, _, _],
      [_, _, _, _, _, _, _, _, _, _, _, _],
    ]);

    // Stage 1: Stone base + arch — pillars with curved top
    this.tex('portal-stage-1', [
      [_, _, _, _, _, Sg, Sg, _, _, _, _, _],
      [_, _, _, _, Sg, Sd, Sd, Sg, _, _, _, _],
      [_, _, _, Sg, Sl, _, _, Sl, Sg, _, _, _],
      [_, _, _, Sg, _, _, _, _, Sg, _, _, _],
      [_, _, _, Sg, _, _, _, _, Sg, _, _, _],
      [_, _, _, Sg, _, _, _, _, Sg, _, _, _],
      [_, _, _, Sd, _, _, _, _, Sd, _, _, _],
      [_, _, _, Sg, _, _, _, _, Sg, _, _, _],
      [_, _, _, Sg, _, _, _, _, Sg, _, _, _],
      [_, _, Sd, Sg, Sd, Dr, Dr, Sd, Sg, Sd, _, _],
      [_, _, Sg, Sg, Sg, Dr, Dr, Sg, Sg, Sg, _, _],
      [_, _, _, _, _, _, _, _, _, _, _, _],
    ]);

    // Stage 2: Runes + arch — arch with glowing purple/blue rune marks
    this.tex('portal-stage-2', [
      [_, _, _, _, _, Rn, Rn, _, _, _, _, _],
      [_, _, _, _, Sg, Rb, Rb, Sg, _, _, _, _],
      [_, _, _, Sg, Rn, _, _, Rn, Sg, _, _, _],
      [_, _, _, Rb, _, _, _, _, Rb, _, _, _],
      [_, _, _, Sg, _, _, _, _, Sg, _, _, _],
      [_, _, _, Rn, _, _, _, _, Rn, _, _, _],
      [_, _, _, Sg, _, _, _, _, Sg, _, _, _],
      [_, _, _, Rb, _, _, _, _, Rb, _, _, _],
      [_, _, _, Sg, _, _, _, _, Sg, _, _, _],
      [_, _, Rn, Sg, Sd, Dr, Dr, Sd, Sg, Rn, _, _],
      [_, _, Sg, Sg, Sg, Dr, Dr, Sg, Sg, Sg, _, _],
      [_, _, _, _, _, _, _, _, _, _, _, _],
    ]);

    // Stage 3: Active portal — doorway filled with swirling purple/blue/white
    this.tex('portal-stage-3', [
      [_, _, _, _, _, Rn, Rn, _, _, _, _, _],
      [_, _, _, _, Sg, Rb, Rb, Sg, _, _, _, _],
      [_, _, _, Sg, Rn, Pb, Pb, Rn, Sg, _, _, _],
      [_, _, _, Rb, Pp, Pg, Pg, Pp, Rb, _, _, _],
      [_, _, _, Sg, Pl, Pw, Pw, Pl, Sg, _, _, _],
      [_, _, _, Rn, Pp, Pg, Pg, Pp, Rn, _, _, _],
      [_, _, _, Sg, Pb, Pl, Pl, Pb, Sg, _, _, _],
      [_, _, _, Rb, Pp, Pg, Pg, Pp, Rb, _, _, _],
      [_, _, _, Sg, Pl, Pw, Pw, Pl, Sg, _, _, _],
      [_, _, Rn, Sg, Sd, Pp, Pp, Sd, Sg, Rn, _, _],
      [_, _, Sg, Sg, Sg, Dr, Dr, Sg, Sg, Sg, _, _],
      [_, _, _, _, _, _, _, _, _, _, _, _],
    ]);

    // Shimmer variants for swirl animation on active portal
    this.tex('portal-active-1', [
      [_, _, _, _, _, Rn, Rn, _, _, _, _, _],
      [_, _, _, _, Sg, Rb, Rb, Sg, _, _, _, _],
      [_, _, _, Sg, Rn, Pg, Pl, Rn, Sg, _, _, _],
      [_, _, _, Rb, Pl, Pw, Pp, Pg, Rb, _, _, _],
      [_, _, _, Sg, Pp, Pg, Pw, Pp, Sg, _, _, _],
      [_, _, _, Rn, Pg, Pw, Pl, Pg, Rn, _, _, _],
      [_, _, _, Sg, Pl, Pp, Pg, Pb, Sg, _, _, _],
      [_, _, _, Rb, Pp, Pl, Pw, Pp, Rb, _, _, _],
      [_, _, _, Sg, Pg, Pw, Pl, Pg, Sg, _, _, _],
      [_, _, Rn, Sg, Sd, Pp, Pp, Sd, Sg, Rn, _, _],
      [_, _, Sg, Sg, Sg, Dr, Dr, Sg, Sg, Sg, _, _],
      [_, _, _, _, _, _, _, _, _, _, _, _],
    ]);

    this.tex('portal-active-2', [
      [_, _, _, _, _, Rn, Rn, _, _, _, _, _],
      [_, _, _, _, Sg, Rb, Rb, Sg, _, _, _, _],
      [_, _, _, Sg, Rn, Pp, Pg, Rn, Sg, _, _, _],
      [_, _, _, Rb, Pg, Pl, Pw, Pp, Rb, _, _, _],
      [_, _, _, Sg, Pw, Pp, Pg, Pl, Sg, _, _, _],
      [_, _, _, Rn, Pl, Pg, Pw, Pp, Rn, _, _, _],
      [_, _, _, Sg, Pp, Pw, Pl, Pg, Sg, _, _, _],
      [_, _, _, Rb, Pg, Pp, Pw, Pl, Rb, _, _, _],
      [_, _, _, Sg, Pw, Pg, Pp, Pw, Sg, _, _, _],
      [_, _, Rn, Sg, Sd, Pp, Pp, Sd, Sg, Rn, _, _],
      [_, _, Sg, Sg, Sg, Dr, Dr, Sg, Sg, Sg, _, _],
      [_, _, _, _, _, _, _, _, _, _, _, _],
    ]);
  }

  // ─── UI ELEMENTS ───

  generateUI() {
    const _ = null;

    // Inventory slot background (10x10 = 40x40)
    const Sb = '#2D2D2D'; // dark bg
    const Se = '#555555'; // edge
    this.tex('ui-slot', [
      [Se, Se, Se, Se, Se, Se, Se, Se, Se, Se],
      [Se, Sb, Sb, Sb, Sb, Sb, Sb, Sb, Sb, Se],
      [Se, Sb, Sb, Sb, Sb, Sb, Sb, Sb, Sb, Se],
      [Se, Sb, Sb, Sb, Sb, Sb, Sb, Sb, Sb, Se],
      [Se, Sb, Sb, Sb, Sb, Sb, Sb, Sb, Sb, Se],
      [Se, Sb, Sb, Sb, Sb, Sb, Sb, Sb, Sb, Se],
      [Se, Sb, Sb, Sb, Sb, Sb, Sb, Sb, Sb, Se],
      [Se, Sb, Sb, Sb, Sb, Sb, Sb, Sb, Sb, Se],
      [Se, Sb, Sb, Sb, Sb, Sb, Sb, Sb, Sb, Se],
      [Se, Se, Se, Se, Se, Se, Se, Se, Se, Se],
    ]);

    // Selection highlight (10x10 = 40x40)
    const Gd = '#FFD700'; // gold
    this.tex('ui-select', [
      [Gd, Gd, Gd, Gd, Gd, Gd, Gd, Gd, Gd, Gd],
      [Gd, _, _, _, _, _, _, _, _, Gd],
      [Gd, _, _, _, _, _, _, _, _, Gd],
      [Gd, _, _, _, _, _, _, _, _, Gd],
      [Gd, _, _, _, _, _, _, _, _, Gd],
      [Gd, _, _, _, _, _, _, _, _, Gd],
      [Gd, _, _, _, _, _, _, _, _, Gd],
      [Gd, _, _, _, _, _, _, _, _, Gd],
      [Gd, _, _, _, _, _, _, _, _, Gd],
      [Gd, Gd, Gd, Gd, Gd, Gd, Gd, Gd, Gd, Gd],
    ]);

    // Heart empty (5x5 = 20x20)
    const He = '#FFB6C1'; // pink outline
    this.tex('heart-empty', [
      [_, He, _, He, _],
      [He, _, He, _, He],
      [He, _, _, _, He],
      [_, He, _, He, _],
      [_, _, He, _, _],
    ]);

    // Heart full (5x5 = 20x20)
    const Hf = '#FF1493'; // deep pink
    const Hl = '#FF69B4'; // highlight
    this.tex('heart-full', [
      [_, Hf, _, Hf, _],
      [Hf, Hl, Hf, Hl, Hf],
      [Hf, Hf, Hf, Hf, Hf],
      [_, Hf, Hf, Hf, _],
      [_, _, Hf, _, _],
    ]);

    // Thought bubble (8x6 = 32x24)
    const Tw = '#FFFFFF';
    const Tg = '#E0E0E0';
    this.tex('thought-bubble', [
      [_, _, Tw, Tw, Tw, Tw, _, _],
      [_, Tw, Tw, Tw, Tw, Tw, Tw, _],
      [Tw, Tw, Tw, Tw, Tw, Tw, Tw, Tw],
      [Tw, Tw, Tw, Tw, Tw, Tw, Tw, Tw],
      [_, Tw, Tw, Tw, Tw, Tw, Tw, _],
      [_, _, _, Tg, Tg, _, _, _],
    ]);

    // Build button (12x4 = 48x16)
    const Bg = '#4CAF50'; // green
    const Bd = '#388E3C'; // dark green
    this.tex('ui-build-btn', [
      [Bd, Bg, Bg, Bg, Bg, Bg, Bg, Bg, Bg, Bg, Bg, Bd],
      [Bg, Bg, Bg, Bg, Bg, Bg, Bg, Bg, Bg, Bg, Bg, Bg],
      [Bg, Bg, Bg, Bg, Bg, Bg, Bg, Bg, Bg, Bg, Bg, Bg],
      [Bd, Bg, Bg, Bg, Bg, Bg, Bg, Bg, Bg, Bg, Bg, Bd],
    ]);

    // Build button disabled
    const Dg = '#888888';
    const Dd = '#666666';
    this.tex('ui-build-btn-off', [
      [Dd, Dg, Dg, Dg, Dg, Dg, Dg, Dg, Dg, Dg, Dg, Dd],
      [Dg, Dg, Dg, Dg, Dg, Dg, Dg, Dg, Dg, Dg, Dg, Dg],
      [Dg, Dg, Dg, Dg, Dg, Dg, Dg, Dg, Dg, Dg, Dg, Dg],
      [Dd, Dg, Dg, Dg, Dg, Dg, Dg, Dg, Dg, Dg, Dg, Dd],
    ]);
  }

  // ─── PARTICLES ───

  generateParticles() {
    const _ = null;

    // Heart particle (4x4 = 16x16)
    const Hp = '#FF1493';
    const Hl = '#FF69B4';
    this.tex('particle-heart', [
      [_, Hp, _, Hp],
      [Hp, Hl, Hp, Hl],
      [Hp, Hp, Hp, Hp],
      [_, Hp, Hp, _],
    ]);

    // Star particle (5x5 = 20x20)
    const Sy = '#FFD700';
    const Sl = '#FFF8DC';
    this.tex('particle-star', [
      [_, _, Sy, _, _],
      [_, Sy, Sl, Sy, _],
      [Sy, Sl, Sl, Sl, Sy],
      [_, Sy, Sl, Sy, _],
      [_, _, Sy, _, _],
    ]);

    // Sparkle (3x3 = 12x12)
    const Sw = '#FFFFFF';
    this.tex('particle-sparkle', [
      [_, Sw, _],
      [Sw, '#FFFFEE', Sw],
      [_, Sw, _],
    ]);
  }

  // ═══════════════════════════════════════════
  // DESERT BIOME TEXTURES
  // ═══════════════════════════════════════════

  // ─── DESERT TERRAIN (16x16 = 64x64) ───

  generateDesertTerrain() {
    // Sand variants — warm tans
    for (let i = 0; i < 3; i++) {
      this.tex(`desert-sand-${i}`, this.noise(16, 16, ['#EDC9AF', '#D4A574', '#E0B88A', '#DEB887', '#C8A06E']));
    }

    // Packed sand for clearings — slightly darker, more uniform
    this.tex('desert-packed', this.noise(16, 16, ['#C8A06E', '#BF9860', '#B89058', '#C49A68']));

    // Oasis bank — green-tinted sand near water
    this.tex('desert-oasis-bank', this.noise(16, 16, ['#A8C070', '#98B060', '#B0C878', '#90A858']));
  }

  // ─── DESERT DECORATIONS ───

  generateDesertDecorations() {
    const _ = null;

    // Palm trunk (4x10 grid, scale 4 = 16x40) — thinner + taller than woodland trees
    const Pt = '#8B7355'; // palm trunk brown
    const Pd = '#6B5B45'; // dark bark
    this.tex('palm-trunk', [
      [_, Pt, Pt, _],
      [_, Pd, Pt, _],
      [_, Pt, Pd, _],
      [_, Pd, Pt, _],
      [_, Pt, Pt, _],
      [_, Pd, Pt, _],
      [_, Pt, Pd, _],
      [_, Pt, Pt, _],
      [_, Pd, Pt, _],
      [_, Pt, Pt, _],
    ]);

    // Palm canopy variant 1 (10x6 grid) — fronds spreading out
    const Fg = '#228B22'; // frond green
    const Fl = '#2E8B40'; // lighter frond
    const Fd = '#1A6B1A'; // darker frond
    this.tex('palm-canopy-1', [
      [_, _, Fg, Fl, _, _, Fl, Fg, _, _],
      [Fg, Fl, Fd, Fg, Fl, Fg, Fd, Fl, Fg, _],
      [_, Fg, Fg, Fl, Fg, Fg, Fl, Fg, Fg, _],
      [_, _, Fg, Fg, Fd, Fd, Fg, Fg, _, _],
      [_, _, _, Fd, Fg, Fg, Fd, _, _, _],
      [_, _, _, _, Fg, Fg, _, _, _, _],
    ]);

    this.tex('palm-canopy-2', [
      [_, Fg, _, Fl, Fg, Fg, Fl, _, Fg, _],
      [_, Fl, Fg, Fd, Fl, Fg, Fd, Fg, Fl, _],
      [_, _, Fg, Fg, Fg, Fg, Fg, Fg, _, _],
      [_, _, _, Fl, Fd, Fd, Fl, _, _, _],
      [_, _, _, Fg, Fg, Fg, Fg, _, _, _],
      [_, _, _, _, Fd, Fd, _, _, _, _],
    ]);

    // Cactus (6x6 grid = 24x24) — green, spiky
    const Cg = '#2E8B57'; // cactus green
    const Cd = '#1E6B3E'; // dark green
    const Cs = '#F0E68C'; // spine/highlight
    this.tex('cactus', [
      [_, _, Cg, Cg, _, _],
      [_, Cs, Cg, Cd, Cs, _],
      [Cg, Cd, Cg, Cg, Cd, Cg],
      [Cg, Cs, Cg, Cg, Cs, Cg],
      [_, _, Cg, Cg, _, _],
      [_, _, Cd, Cd, _, _],
    ]);

    // Fruit cactus (6x6 grid) — cactus with red fruit
    const Cf = '#FF4500'; // cactus fruit
    this.tex('cactus-fruit', [
      [_, _, Cg, Cg, _, _],
      [_, Cf, Cg, Cd, Cf, _],
      [Cg, Cd, Cg, Cg, Cd, Cg],
      [Cg, Cs, Cg, Cg, Cs, Cg],
      [_, _, Cg, Cg, _, _],
      [_, _, Cd, Cd, _, _],
    ]);

    // Sandstone rock (6x5 grid = 24x20) — warmer tones
    const Sr = '#D2A060'; // sandstone
    const Sd = '#B8863C'; // darker
    const Sl = '#E8C080'; // lighter
    this.tex('sandstone-rock', [
      [_, _, Sr, Sr, _, _],
      [_, Sr, Sl, Sr, Sr, _],
      [Sr, Sl, Sr, Sd, Sr, Sr],
      [Sr, Sd, Sr, Sr, Sr, Sr],
      [_, Sr, Sr, Sd, Sr, _],
    ]);

    // Desert flowers (3x3 = 12x12)
    const Ds = '#C8A06E'; // desert stem (sand-colored)
    this.tex('desert-flower-orange', [
      [_, '#FF8C00', _],
      ['#FF8C00', '#FFD700', '#FF8C00'],
      [_, Ds, _],
    ]);
    this.tex('desert-flower-pink', [
      [_, '#FF69B4', _],
      ['#FF69B4', '#FFFF00', '#FF69B4'],
      [_, Ds, _],
    ]);

    // Tumbleweed (4x4 = 16x16) — dry, round
    const Tw = '#C8A06E'; // dry tan
    const Td = '#A08050'; // darker
    this.tex('tumbleweed', [
      [_, Tw, Tw, _],
      [Tw, Td, Tw, Tw],
      [Tw, Tw, Td, Tw],
      [_, Tw, Tw, _],
    ]);
  }

  // ─── DESERT ANIMALS (8x8 or 6x6) ───

  generateDesertAnimals() {
    const _ = null;
    const Bk = '#333333';

    // Camel — warm tan/brown, prominent humps, clear side profile (8x8)
    const Ca = '#D2A060'; // body tan
    const Cl = '#A07840'; // darker shading
    const Ch = '#E8C880'; // hump highlight
    const Cn = '#2A1A0A'; // nose
    this.tex('animal-camel-1', [
      [_, _, _, Ch, Ch, _, _, _],
      [_, Ca, Ch, Ca, Ca, Ch, _, _],
      [Ca, Bk, Ca, Ca, Ca, Ca, Ca, _],
      [Ca, Ca, Cl, Ca, Ca, Cl, Ca, Cn],
      [_, Ca, Ca, Ca, Ca, Ca, Ca, _],
      [_, Ca, _, Ca, Ca, _, Ca, _],
      [_, Ca, _, _, _, _, Ca, _],
      [_, Cl, _, _, _, _, Cl, _],
    ]);
    this.tex('animal-camel-2', [
      [_, _, _, Ch, Ch, _, _, _],
      [_, Ca, Ch, Ca, Ca, Ch, _, _],
      [Ca, Bk, Ca, Ca, Ca, Ca, Ca, _],
      [Ca, Ca, Cl, Ca, Ca, Cl, Ca, Cn],
      [_, Ca, Ca, Ca, Ca, Ca, Ca, _],
      [_, _, Ca, Ca, Ca, Ca, _, _],
      [_, Ca, _, _, _, _, Ca, _],
      [_, Cl, _, _, _, _, Cl, _],
    ]);

    // Crocodile — dark green with yellow jaw, bumpy back, long (8x8)
    const Cg = '#3A6B30'; // dark green body
    const Cd = '#2A4B20'; // ridge bumps
    const Cy = '#CCCC00'; // yellow eye
    const Cj = '#5A8B40'; // lighter jaw
    this.tex('animal-crocodile-1', [
      [_, _, _, _, _, _, _, _],
      [_, _, _, Cd, _, Cd, _, _],
      [Cg, Cg, Cd, Cg, Cd, Cg, Cd, _],
      [Cy, Cg, Cg, Cg, Cg, Cg, Cg, Cg],
      [Cj, Cj, Cg, Cg, Cg, Cg, Cg, Cg],
      [_, _, Cg, _, _, Cg, _, Cg],
      [_, _, Bk, _, _, Bk, _, _],
      [_, _, _, _, _, _, _, _],
    ]);
    this.tex('animal-crocodile-2', [
      [_, _, _, _, _, _, _, _],
      [_, _, _, Cd, _, Cd, _, _],
      [Cg, Cg, Cd, Cg, Cd, Cg, Cd, _],
      [Cy, Cg, Cg, Cg, Cg, Cg, Cg, Cg],
      [Cj, Cj, Cg, Cg, Cg, Cg, Cg, Cg],
      [_, Cg, _, Cg, Cg, _, Cg, _],
      [_, Bk, _, _, _, _, Bk, _],
      [_, _, _, _, _, _, _, _],
    ]);

    // Snake — bright yellow-green with red diamond pattern, coiled (6x6)
    const Sg = '#8BC34A'; // bright yellow-green
    const Sr = '#CC2200'; // red diamond markings
    const Se = '#FF0000'; // red tongue
    const Sy = '#FFFF00'; // yellow eye
    this.tex('animal-snake-1', [
      [_, _, Sg, Sg, _, _],
      [_, Sg, Sr, Sr, Sg, _],
      [Sg, Sy, Sg, Sg, Sr, Sg],
      [Sg, Sg, Sr, Sr, Sg, Se],
      [_, Sg, Sg, Sg, Sg, _],
      [_, _, Sg, Sg, _, _],
    ]);
    this.tex('animal-snake-2', [
      [_, _, Sg, Sg, _, _],
      [_, Sg, Sr, Sr, Sg, _],
      [Sg, Sy, Sg, Sg, Sr, _],
      [Sg, Sg, Sr, Sr, Sg, Se],
      [_, _, Sg, Sg, _, Se],
      [_, _, Sg, Sg, _, _],
    ]);

    // Scorpion — jet black with bright red pincers and curled stinger (6x6)
    const Sc = '#1A1A1A'; // black body
    const St = '#FF2200'; // red stinger
    const Sp = '#FF4400'; // red pincers
    const Ss = '#3A3A3A'; // body highlight
    this.tex('animal-scorpion-1', [
      [_, _, _, _, St, St],
      [Sp, _, _, _, Ss, St],
      [_, Sp, Sc, Sc, Sc, _],
      [_, _, Bk, Ss, Bk, _],
      [_, Sp, Sc, Sc, Sc, _],
      [Sp, _, Sc, _, Sc, _],
    ]);
    this.tex('animal-scorpion-2', [
      [_, _, _, _, _, St],
      [Sp, _, _, _, St, St],
      [_, Sp, Sc, Sc, Sc, _],
      [_, _, Bk, Ss, Bk, _],
      [_, Sp, Sc, Sc, Sc, _],
      [Sp, _, Sc, _, Sc, _],
    ]);

    // Lizard — bright electric blue with yellow belly, distinctive (6x6)
    const Lg = '#1E90FF'; // electric blue
    const Ld = '#0066CC'; // darker blue
    const Ly = '#FFD700'; // yellow belly
    this.tex('animal-lizard-1', [
      [_, _, _, _, _, _],
      [_, Lg, _, _, _, _],
      [_, Bk, Lg, Ld, Lg, Lg],
      [_, Lg, Ly, Ly, Ld, _],
      [_, _, Lg, _, Lg, _],
      [_, _, Ld, _, Ld, _],
    ]);
    this.tex('animal-lizard-2', [
      [_, _, _, _, _, _],
      [_, Lg, _, _, _, _],
      [_, Bk, Lg, Ld, Lg, Lg],
      [_, Lg, Ly, Ly, Ld, _],
      [_, Lg, _, Lg, _, _],
      [_, Ld, _, Ld, _, _],
    ]);

    // Vulture — black with bright white ruff, red bald head (6x6)
    const Vb = '#1A1A1A'; // black body
    const Vw = '#FFFFFF'; // white ruff
    const Vr = '#CC0000'; // red head
    const Vg = '#3A3A3A'; // wing gray
    this.tex('animal-vulture-1', [
      [_, _, Vr, Vr, _, _],
      [_, Vw, Bk, Vw, _, _],
      [Vg, Vb, Vw, Vw, Vb, Vg],
      [_, Vb, Vb, Vb, Vb, _],
      [_, _, Vb, _, Vb, _],
      [_, _, Bk, _, Bk, _],
    ]);
    this.tex('animal-vulture-2', [
      [_, _, Vr, Vr, _, _],
      [_, Vw, Bk, Vw, _, _],
      [_, Vb, Vw, Vw, Vb, Vg],
      [Vg, Vb, Vb, Vb, Vb, _],
      [_, _, Vb, _, Vb, _],
      [_, _, Bk, _, Bk, _],
    ]);

    // Fennec Fox — cream/white with HUGE pink-lined ears, big dark eyes (8x8)
    const Ft = '#FAEBD7'; // cream body (lighter than sand so it pops)
    const Fe = '#FFB6C1'; // pink ear inner
    const Fw = '#FFFFFF'; // white belly
    const Fb = '#1A1A1A'; // big dark eyes
    const Fn = '#333333'; // nose
    this.tex('animal-fennec-1', [
      [Ft, Ft, _, _, _, _, Ft, Ft],
      [Fe, Ft, Ft, _, _, Ft, Ft, Fe],
      [_, Ft, Ft, Ft, Ft, Ft, Ft, _],
      [_, Fb, Ft, Ft, Ft, Ft, Fb, _],
      [_, Ft, Ft, Fn, Ft, Ft, Ft, _],
      [_, _, Fw, Fw, Fw, Fw, _, _],
      [_, _, Ft, _, _, Ft, _, _],
      [_, _, Bk, _, _, Bk, _, _],
    ]);
    this.tex('animal-fennec-2', [
      [Ft, Ft, _, _, _, _, Ft, Ft],
      [Fe, Ft, Ft, _, _, Ft, Ft, Fe],
      [_, Ft, Ft, Ft, Ft, Ft, Ft, _],
      [_, Fb, Ft, Ft, Ft, Ft, Fb, _],
      [_, Ft, Ft, Fn, Ft, Ft, Ft, _],
      [_, _, Fw, Fw, Fw, Fw, _, _],
      [_, Ft, _, Ft, Ft, _, Ft, _],
      [_, Bk, _, _, _, _, Bk, _],
    ]);

    // Roadrunner — blue-black with white chest stripe, orange beak, tall crest (6x6)
    const Rb = '#2E2E5E'; // dark blue-black body
    const Rw = '#FFFFFF'; // white chest stripe
    const Rc = '#4A4A7A'; // blue-purple crest
    const Ro = '#FF8C00'; // orange beak
    this.tex('animal-roadrunner-1', [
      [_, _, Rc, Rc, _, _],
      [_, Rb, Bk, Rb, _, _],
      [Ro, Rb, Rb, Rb, Rb, _],
      [_, Rw, Rb, Rw, Rb, _],
      [_, _, Rb, _, _, _],
      [_, _, '#FF8C00', _, '#FF8C00', _],
    ]);
    this.tex('animal-roadrunner-2', [
      [_, _, Rc, Rc, _, _],
      [_, Rb, Bk, Rb, _, _],
      [Ro, Rb, Rb, Rb, Rb, _],
      [_, Rw, Rb, Rw, Rb, _],
      [_, Rb, _, _, Rb, _],
      [_, '#FF8C00', _, _, '#FF8C00', _],
    ]);
  }

  // ─── DESERT ITEMS (6x6 = 24x24) ───

  generateDesertItems() {
    const _ = null;

    // Dates — cluster of brown dates on a green stem
    const Dd = '#8B4513'; // date brown
    const Dl = '#A0522D'; // lighter date
    const Dg = '#228B22'; // green stem
    this.tex('item-dates', [
      [_, _, Dg, Dg, _, _],
      [_, Dg, _, _, Dg, _],
      [Dd, Dl, Dd, Dl, Dd, Dl],
      [Dl, Dd, Dl, Dd, Dl, Dd],
      [_, Dd, Dl, Dd, Dl, _],
      [_, _, Dd, Dd, _, _],
    ]);

    // Beetles — small dark critter
    const Bb = '#2F1B0E'; // dark brown
    const Bs = '#4A3020'; // shell
    const Bg = '#556B2F'; // green sheen
    this.tex('item-beetles', [
      [_, _, Bb, Bb, _, _],
      [_, Bb, Bg, Bg, Bb, _],
      [Bb, Bs, Bb, Bb, Bs, Bb],
      [_, Bs, Bg, Bg, Bs, _],
      [_, Bb, Bb, Bb, Bb, _],
      [_, _, _, _, _, _],
    ]);

    // Cactus fruit — round red/pink fruit
    const Cf = '#FF4500'; // bright red-orange
    const Cl = '#FF6347'; // lighter
    const Cs = '#228B22'; // green stem bit
    this.tex('item-cactus-fruit', [
      [_, _, Cs, Cs, _, _],
      [_, Cf, Cl, Cf, Cf, _],
      [Cf, Cl, Cf, Cf, Cl, Cf],
      [Cf, Cf, Cf, Cl, Cf, Cf],
      [_, Cf, Cf, Cf, Cf, _],
      [_, _, Cf, Cf, _, _],
    ]);

    // Desert fish — slightly different color from woodland fish (more golden)
    const Df = '#DAA520'; // golden body
    const Dl2 = '#F0D080'; // light belly
    const De = '#333333'; // eye
    this.tex('item-desert-fish', [
      [_, _, _, Df, _, _],
      [_, Df, Df, Df, Df, _],
      [Df, Df, De, Df, Dl2, Df],
      [_, Df, Df, Dl2, Dl2, _],
      [_, Df, Df, Df, Df, _],
      [_, _, _, Df, _, _],
    ]);

    // Urn — terracotta pot with decorative band
    const Ut = '#B8602A'; // terracotta
    const Ud = '#8B4513'; // dark clay
    const Ug = '#DAA520'; // gold band
    const Ui = '#4A2A0A'; // dark interior opening
    this.tex('item-urns', [
      [_, _, Ui, Ui, _, _],
      [_, Ut, Ug, Ug, Ut, _],
      [Ut, Ug, Ut, Ut, Ug, Ut],
      [Ut, Ut, Ud, Ud, Ut, Ut],
      [_, Ut, Ut, Ut, Ut, _],
      [_, _, Ud, Ud, _, _],
    ]);

    // Mummy — wrapped figure with glowing eyes
    const Mw = '#E8DCC8'; // linen wrapping
    const Md = '#C8B8A0'; // darker wrapping
    const Mg = '#00FF88'; // glowing green eyes
    const Ms = '#A09080'; // shadow/gap in wraps
    this.tex('item-mummies', [
      [_, Mw, Md, Md, Mw, _],
      [_, Md, Mg, Ms, Mg, _],
      [_, Mw, Md, Mw, Md, _],
      [_, Ms, Mw, Md, Mw, _],
      [_, Mw, Ms, Mw, Ms, _],
      [_, _, Md, Md, _, _],
    ]);

    // Scepter — ankh-shaped golden staff
    const Ag = '#FFD700'; // gold
    const Ad = '#DAA520'; // darker gold
    const Ab = '#B8860B'; // bronze shadow
    const Aj = '#00BFFF'; // jewel blue
    this.tex('item-scepters', [
      [_, Ad, _, _, Ad, _],
      [Ad, Aj, Ad, Ad, Aj, Ad],
      [_, Ad, Ag, Ag, Ad, _],
      [_, _, Ag, Ag, _, _],
      [_, _, Ad, Ad, _, _],
      [_, _, Ab, Ab, _, _],
    ]);
  }
}
