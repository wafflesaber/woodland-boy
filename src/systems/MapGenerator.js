import { WORLD_WIDTH, WORLD_HEIGHT, TILE_SIZE } from '../config.js';

export default class MapGenerator {
  constructor(scene) {
    this.scene = scene;
    this.cols = Math.floor(WORLD_WIDTH / TILE_SIZE);   // 50
    this.rows = Math.floor(WORLD_HEIGHT / TILE_SIZE);   // 37 (rounded down from 37.5)
  }

  generate() {
    // Static physics group for trees, rocks, and river barriers
    this.obstacles = this.scene.physics.add.staticGroup();

    // Track occupied cells to prevent overlap: grid[row][col] = true if blocked
    this.occupied = Array.from({ length: this.rows }, () => Array(this.cols).fill(false));

    // 1. River path (compute first so we can place the bridge)
    const riverCells = this.generateRiverPath();

    // 2. Clearings
    const clearings = this.generateClearings();

    // 3. Bridge across the river
    const bridgeCells = this.placeBridge(riverCells);

    // 4. Grass base + river + sand banks + bridge
    this.layTerrain(riverCells, clearings, bridgeCells);

    // 5. Dirt in clearings
    this.layClearing(clearings);

    // 6. Trees
    const trees = this.placeTrees(clearings, riverCells);

    // 6. Bushes (some are berry bushes)
    const { berryPositions } = this.placeBushes(clearings, riverCells, trees);

    // 7. Rocks
    const rockPositions = this.placeRocks(clearings, riverCells, trees);

    // 8. Flowers (decorative only)
    this.placeFlowers(clearings, riverCells, trees);

    // 9. Compute spawn points for collectible items
    const itemSpawnPoints = this.computeItemSpawnPoints(
      berryPositions, trees, riverCells, clearings, rockPositions
    );

    // 10. Compute animal spawn zones
    const animalSpawnZones = this.computeAnimalSpawnZones(clearings, riverCells, trees);

    // House plot = first clearing
    const housePlot = clearings[0];
    const housePlotPosition = {
      x: housePlot.cx,
      y: housePlot.cy,
    };

    return {
      housePlotPosition,
      itemSpawnPoints,
      animalSpawnZones,
      obstacles: this.obstacles,
      clearings,
    };
  }

  // ─── Helpers ───

  cellToWorld(col, row) {
    return { x: col * TILE_SIZE + TILE_SIZE / 2, y: row * TILE_SIZE + TILE_SIZE / 2 };
  }

  isInClearing(col, row, clearings) {
    for (const c of clearings) {
      if (col >= c.left && col <= c.right && row >= c.top && row <= c.bottom) return true;
    }
    return false;
  }

  isInRiver(col, row, riverCells) {
    return riverCells.has(`${col},${row}`);
  }

  dist(x1, y1, x2, y2) {
    return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
  }

  // ─── 1. Clearings ───

  generateClearings() {
    const clearings = [];
    const placements = [
      // House plot — center-ish area
      { preferCol: Math.floor(this.cols * 0.3), preferRow: Math.floor(this.rows * 0.5) },
      // Second clearing — upper right
      { preferCol: Math.floor(this.cols * 0.7), preferRow: Math.floor(this.rows * 0.25) },
      // Third clearing — lower area
      { preferCol: Math.floor(this.cols * 0.5), preferRow: Math.floor(this.rows * 0.8) },
    ];

    for (const { preferCol, preferRow } of placements) {
      const w = 5 + Math.floor(Math.random() * 2); // 5-6 tiles wide
      const h = 5 + Math.floor(Math.random() * 2); // 5-6 tiles tall
      const left = Math.max(1, Math.min(preferCol - Math.floor(w / 2), this.cols - w - 1));
      const top = Math.max(1, Math.min(preferRow - Math.floor(h / 2), this.rows - h - 1));
      const right = left + w - 1;
      const bottom = top + h - 1;
      const cx = (left + right) / 2 * TILE_SIZE + TILE_SIZE / 2;
      const cy = (top + bottom) / 2 * TILE_SIZE + TILE_SIZE / 2;

      clearings.push({ left, top, right, bottom, cx, cy, w, h });

      // Mark cells as occupied
      for (let r = top; r <= bottom; r++) {
        for (let c = left; c <= right; c++) {
          if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) {
            this.occupied[r][c] = true;
          }
        }
      }
    }

    return clearings;
  }

  // ─── 2. River ───

  generateRiverPath() {
    const riverCells = new Set();
    const riverWidth = 3; // tiles wide

    // Start somewhere in the middle third
    let rx = this.cols * 0.4 + Math.random() * this.cols * 0.2;
    const amplitude = 4 + Math.random() * 3;
    const frequency = 0.06 + Math.random() * 0.03;
    const phase = Math.random() * Math.PI * 2;

    for (let row = 0; row < this.rows; row++) {
      // Gentle sinusoidal wander
      rx += Math.sin(row * frequency + phase) * 0.6;
      rx = Math.max(3, Math.min(rx, this.cols - 4));

      const centerCol = Math.round(rx);
      for (let w = -Math.floor(riverWidth / 2); w <= Math.floor(riverWidth / 2); w++) {
        const col = centerCol + w;
        if (col >= 0 && col < this.cols) {
          riverCells.add(`${col},${row}`);
          if (row >= 0 && row < this.rows) {
            this.occupied[row][col] = true;
          }
        }
      }
    }

    return riverCells;
  }

  // ─── 3. Bridge ───

  placeBridge(riverCells) {
    const bridgeCells = new Set();

    // Pick a row in the middle third of the map
    const minRow = Math.floor(this.rows * 0.3);
    const maxRow = Math.floor(this.rows * 0.7);

    // Find a row that has river cells (try center first, then scan outward)
    let bestRow = Math.floor((minRow + maxRow) / 2);
    for (let offset = 0; offset < maxRow - minRow; offset++) {
      const tryRow = bestRow + (offset % 2 === 0 ? offset / 2 : -Math.ceil(offset / 2));
      if (tryRow < minRow || tryRow > maxRow) continue;

      let hasRiver = false;
      for (let col = 0; col < this.cols; col++) {
        if (riverCells.has(`${col},${tryRow}`)) { hasRiver = true; break; }
      }
      if (hasRiver) { bestRow = tryRow; break; }
    }

    // Collect all river cells at bestRow and one row above/below for a 3-tile-wide bridge
    for (let dr = -1; dr <= 1; dr++) {
      const row = bestRow + dr;
      if (row < 0 || row >= this.rows) continue;
      for (let col = 0; col < this.cols; col++) {
        if (riverCells.has(`${col},${row}`)) {
          bridgeCells.add(`${col},${row}`);
        }
      }
    }

    return bridgeCells;
  }

  // ─── 4. Lay terrain tiles ───

  layTerrain(riverCells, clearings, bridgeCells) {
    // Build a set of sand bank cells (adjacent to river but not in river)
    const sandCells = new Set();
    for (const key of riverCells) {
      const [col, row] = key.split(',').map(Number);
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nk = `${col + dc},${row + dr}`;
          if (!riverCells.has(nk)) {
            sandCells.add(nk);
          }
        }
      }
    }

    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const wx = col * TILE_SIZE + TILE_SIZE / 2;
        const wy = row * TILE_SIZE + TILE_SIZE / 2;
        const key = `${col},${row}`;

        let texKey;
        if (bridgeCells.has(key)) {
          // Bridge tile — walkable plank over water
          texKey = 'terrain-bridge';
        } else if (riverCells.has(key)) {
          texKey = `terrain-water-${Math.floor(Math.random() * 3)}`;
        } else if (sandCells.has(key)) {
          texKey = 'terrain-sand';
        } else {
          texKey = `terrain-grass-${Math.floor(Math.random() * 3)}`;
        }

        this.scene.add.image(wx, wy, texKey).setDepth(-1);
      }
    }

    // River collision: block water tiles, but NOT bridge cells
    for (const key of riverCells) {
      if (bridgeCells.has(key)) continue;
      const [col, row] = key.split(',').map(Number);
      const wx = col * TILE_SIZE + TILE_SIZE / 2;
      const wy = row * TILE_SIZE + TILE_SIZE / 2;
      const blocker = this.scene.add.zone(wx, wy, TILE_SIZE, TILE_SIZE);
      this.obstacles.add(blocker);
    }
  }

  // ─── 4. Clearing dirt ───

  layClearing(clearings) {
    for (const c of clearings) {
      for (let row = c.top; row <= c.bottom; row++) {
        for (let col = c.left; col <= c.right; col++) {
          const wx = col * TILE_SIZE + TILE_SIZE / 2;
          const wy = row * TILE_SIZE + TILE_SIZE / 2;
          this.scene.add.image(wx, wy, 'terrain-dirt').setDepth(-0.5);
        }
      }
    }
  }

  // ─── 5. Trees ───

  placeTrees(clearings, riverCells) {
    const trees = []; // { x, y } world positions
    const targetCount = 80;
    const minDist = 80; // min distance between trees

    for (let attempt = 0; attempt < targetCount * 5; attempt++) {
      if (trees.length >= targetCount) break;

      const col = 1 + Math.floor(Math.random() * (this.cols - 2));
      const row = 1 + Math.floor(Math.random() * (this.rows - 2));

      // Skip clearings and river
      if (this.isInClearing(col, row, clearings)) continue;
      if (this.isInRiver(col, row, riverCells)) continue;

      const wx = col * TILE_SIZE + TILE_SIZE / 2;
      const wy = row * TILE_SIZE + TILE_SIZE / 2;

      // Min distance check against existing trees
      let tooClose = false;
      for (const t of trees) {
        if (this.dist(wx, wy, t.x, t.y) < minDist) {
          tooClose = true;
          break;
        }
      }
      if (tooClose) continue;

      // Place tree: trunk + canopy
      const canopyVariant = Math.random() < 0.5 ? 'tree-canopy-1' : 'tree-canopy-2';

      // Trunk — lower part of the tree, gets a physics body
      const trunk = this.scene.add.image(wx, wy + 8, 'tree-trunk');
      trunk.setDepth(wy + 8); // Y-sort: base of trunk

      // Canopy — higher depth so player walks "behind" trees
      const canopy = this.scene.add.image(wx, wy - 16, canopyVariant);
      canopy.setDepth(wy - 16 + 10000); // Canopy layer: always above ground entities

      // Physics body on trunk area
      const body = this.scene.add.zone(wx, wy + 12, 16, 16);
      this.obstacles.add(body);

      trees.push({ x: wx, y: wy });
    }

    return trees;
  }

  // ─── 6. Bushes ───

  placeBushes(clearings, riverCells, trees) {
    const berryPositions = [];
    const targetCount = 40;
    const placed = [];

    for (let attempt = 0; attempt < targetCount * 4; attempt++) {
      if (placed.length >= targetCount) break;

      const col = 1 + Math.floor(Math.random() * (this.cols - 2));
      const row = 1 + Math.floor(Math.random() * (this.rows - 2));

      if (this.isInClearing(col, row, clearings)) continue;
      if (this.isInRiver(col, row, riverCells)) continue;

      const wx = col * TILE_SIZE + TILE_SIZE / 2;
      const wy = row * TILE_SIZE + TILE_SIZE / 2;

      // Don't overlap trees
      let nearTree = false;
      for (const t of trees) {
        if (this.dist(wx, wy, t.x, t.y) < 50) {
          nearTree = true;
          break;
        }
      }
      // Bushes prefer being near trees but not on top of them
      // Skip if ON a tree, but allow if within moderate distance

      // Don't overlap other bushes
      let tooClose = false;
      for (const b of placed) {
        if (this.dist(wx, wy, b.x, b.y) < 40) {
          tooClose = true;
          break;
        }
      }
      if (tooClose || nearTree) continue;

      // ~30% chance of being a berry bush
      const isBerry = Math.random() < 0.3;
      const tex = isBerry ? 'bush-berry' : 'bush';
      const bush = this.scene.add.image(wx, wy, tex);
      bush.setDepth(wy);

      placed.push({ x: wx, y: wy });

      if (isBerry) {
        berryPositions.push({ x: wx, y: wy - 10 }); // spawn berries slightly above bush
      }
    }

    return { berryPositions };
  }

  // ─── 7. Rocks ───

  placeRocks(clearings, riverCells, trees) {
    const positions = [];
    const targetCount = 20;

    for (let attempt = 0; attempt < targetCount * 4; attempt++) {
      if (positions.length >= targetCount) break;

      const col = 1 + Math.floor(Math.random() * (this.cols - 2));
      const row = 1 + Math.floor(Math.random() * (this.rows - 2));

      if (this.isInClearing(col, row, clearings)) continue;
      if (this.isInRiver(col, row, riverCells)) continue;

      const wx = col * TILE_SIZE + TILE_SIZE / 2;
      const wy = row * TILE_SIZE + TILE_SIZE / 2;

      // Don't overlap trees
      let tooClose = false;
      for (const t of trees) {
        if (this.dist(wx, wy, t.x, t.y) < 50) { tooClose = true; break; }
      }
      for (const r of positions) {
        if (this.dist(wx, wy, r.x, r.y) < 50) { tooClose = true; break; }
      }
      if (tooClose) continue;

      const rock = this.scene.add.image(wx, wy, 'rock');
      rock.setDepth(wy);

      // Small collision body
      const body = this.scene.add.zone(wx, wy, 20, 16);
      this.obstacles.add(body);

      positions.push({ x: wx, y: wy });
    }

    return positions;
  }

  // ─── 8. Flowers ───

  placeFlowers(clearings, riverCells, trees) {
    const variants = ['flower-red', 'flower-yellow', 'flower-purple'];
    const count = 50;

    for (let i = 0; i < count; i++) {
      // Random position with some pixel-level offset within tiles
      const wx = 40 + Math.random() * (WORLD_WIDTH - 80);
      const wy = 40 + Math.random() * (WORLD_HEIGHT - 80);
      const col = Math.floor(wx / TILE_SIZE);
      const row = Math.floor(wy / TILE_SIZE);

      if (this.isInClearing(col, row, clearings)) continue;
      if (this.isInRiver(col, row, riverCells)) continue;

      const tex = variants[Math.floor(Math.random() * variants.length)];
      const flower = this.scene.add.image(wx, wy, tex);
      flower.setDepth(0); // flat on ground
    }
  }

  // ─── 9. Item spawn points ───

  computeItemSpawnPoints(berryPositions, trees, riverCells, clearings, rockPositions) {
    const points = {
      berries: [...berryPositions],
      mushrooms: [],
      acorns: [],
      fish: [],
      planks: [],
      stones: [],
      straw: [],
    };

    // Mushrooms: at base of some trees
    const shuffledTrees = [...trees].sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(12, shuffledTrees.length); i++) {
      points.mushrooms.push({
        x: shuffledTrees[i].x + (Math.random() * 30 - 15),
        y: shuffledTrees[i].y + 20,
      });
    }

    // Acorns: under different trees
    for (let i = 12; i < Math.min(24, shuffledTrees.length); i++) {
      points.acorns.push({
        x: shuffledTrees[i].x + (Math.random() * 30 - 15),
        y: shuffledTrees[i].y + 20,
      });
    }

    // Fish: along riverbanks
    for (let row = 2; row < this.rows - 2; row += 3) {
      for (let col = 0; col < this.cols; col++) {
        const key = `${col},${row}`;
        if (!riverCells.has(key)) continue;
        // Is this a bank cell? (has a non-river neighbor)
        const hasLand = !riverCells.has(`${col - 1},${row}`) || !riverCells.has(`${col + 1},${row}`);
        if (hasLand) {
          const wx = col * TILE_SIZE + TILE_SIZE / 2;
          const wy = row * TILE_SIZE + TILE_SIZE / 2;
          points.fish.push({ x: wx, y: wy });
          break; // one per row-group
        }
      }
    }

    // Planks: in clearings and near map edges
    for (const c of clearings) {
      for (let i = 0; i < 3; i++) {
        points.planks.push({
          x: c.cx + (Math.random() * 80 - 40),
          y: c.cy + (Math.random() * 80 - 40),
        });
      }
    }
    // A few more near map edges
    for (let i = 0; i < 4; i++) {
      const edge = Math.floor(Math.random() * 4);
      let wx, wy;
      if (edge === 0) { wx = 80 + Math.random() * 200; wy = Math.random() * WORLD_HEIGHT; }
      else if (edge === 1) { wx = WORLD_WIDTH - 80 - Math.random() * 200; wy = Math.random() * WORLD_HEIGHT; }
      else if (edge === 2) { wx = Math.random() * WORLD_WIDTH; wy = 80 + Math.random() * 200; }
      else { wx = Math.random() * WORLD_WIDTH; wy = WORLD_HEIGHT - 80 - Math.random() * 200; }
      points.planks.push({ x: wx, y: wy });
    }

    // Stones: near rock clusters
    for (const r of rockPositions) {
      points.stones.push({
        x: r.x + (Math.random() * 40 - 20),
        y: r.y + (Math.random() * 40 - 20),
      });
    }

    // Straw: in clearings and random grassy areas
    for (const c of clearings) {
      points.straw.push({
        x: c.cx + (Math.random() * 60 - 30),
        y: c.cy + (Math.random() * 60 - 30),
      });
    }
    for (let i = 0; i < 8; i++) {
      points.straw.push({
        x: 100 + Math.random() * (WORLD_WIDTH - 200),
        y: 100 + Math.random() * (WORLD_HEIGHT - 200),
      });
    }

    return points;
  }

  // ─── 10. Animal spawn zones ───

  computeAnimalSpawnZones(clearings, riverCells, trees) {
    const zones = {};
    const cx = WORLD_WIDTH / 2;
    const cy = WORLD_HEIGHT / 2;

    // Bears: deep forest (far from clearings)
    zones.bear = this.pickSpawnPoints(4, trees, clearings, (x, y) => {
      // Prefer points far from all clearings
      let minDist = Infinity;
      for (const c of clearings) {
        minDist = Math.min(minDist, this.dist(x, y, c.cx, c.cy));
      }
      return minDist > 400;
    });

    // Wolves: forest edges
    zones.wolf = this.pickSpawnPoints(4, trees, clearings, (x, y) => {
      return x < 600 || x > WORLD_WIDTH - 600 || y < 400 || y > WORLD_HEIGHT - 400;
    });

    // Badgers: near rocks and dense tree areas
    zones.badger = this.pickSpawnPoints(4, trees, clearings, (x, y) => {
      let nearbyTrees = 0;
      for (const t of trees) {
        if (this.dist(x, y, t.x, t.y) < 200) nearbyTrees++;
      }
      return nearbyTrees >= 3;
    });

    // Capybaras: near the river
    const riverPoints = [];
    for (const key of riverCells) {
      const [col, row] = key.split(',').map(Number);
      if (row % 6 === 0) { // sample every 6th row
        // Find a bank position (non-river neighbor)
        for (let dc = -2; dc <= 2; dc++) {
          const nk = `${col + dc},${row}`;
          if (!riverCells.has(nk)) {
            riverPoints.push({
              x: (col + dc) * TILE_SIZE + TILE_SIZE / 2,
              y: row * TILE_SIZE + TILE_SIZE / 2,
            });
            break;
          }
        }
      }
    }
    zones.capybara = riverPoints.length >= 4
      ? riverPoints.sort(() => Math.random() - 0.5).slice(0, 4)
      : this.pickSpawnPoints(4, trees, clearings, () => true);

    // Deer: open areas near clearings
    zones.deer = [];
    for (const c of clearings) {
      for (let i = 0; i < 3; i++) {
        zones.deer.push({
          x: c.cx + (Math.random() * 300 - 150),
          y: c.cy + (Math.random() * 300 - 150),
        });
      }
    }

    // Rabbits: everywhere in grass
    zones.rabbit = this.pickSpawnPoints(10, trees, clearings, () => true);

    // Foxes: forest edges
    zones.fox = this.pickSpawnPoints(6, trees, clearings, (x, y) => {
      return x < 800 || x > WORLD_WIDTH - 800 || y < 600 || y > WORLD_HEIGHT - 600;
    });

    // Birds: everywhere
    zones.bird = this.pickSpawnPoints(8, trees, clearings, () => true);

    return zones;
  }

  pickSpawnPoints(count, trees, clearings, filter) {
    const points = [];
    for (let attempt = 0; attempt < count * 20; attempt++) {
      if (points.length >= count) break;

      const x = 100 + Math.random() * (WORLD_WIDTH - 200);
      const y = 100 + Math.random() * (WORLD_HEIGHT - 200);

      // Not in clearings
      const col = Math.floor(x / TILE_SIZE);
      const row = Math.floor(y / TILE_SIZE);
      if (this.isInClearing(col, row, clearings)) continue;

      // Not on trees
      let onTree = false;
      for (const t of trees) {
        if (this.dist(x, y, t.x, t.y) < 50) { onTree = true; break; }
      }
      if (onTree) continue;

      // Not too close to other points
      let tooClose = false;
      for (const p of points) {
        if (this.dist(x, y, p.x, p.y) < 100) { tooClose = true; break; }
      }
      if (tooClose) continue;

      if (filter(x, y)) {
        points.push({ x, y });
      }
    }
    return points;
  }
}
