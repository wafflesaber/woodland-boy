import { WORLD_WIDTH, WORLD_HEIGHT, TILE_SIZE } from '../config.js';

export default class MapGenerator {
  /**
   * @param {Phaser.Scene} scene
   * @param {object} biome — biome config object from biomes/*.js
   */
  constructor(scene, biome) {
    this.scene = scene;
    this.biome = biome;
    this.cols = Math.floor(WORLD_WIDTH / TILE_SIZE);   // 50
    this.rows = Math.floor(WORLD_HEIGHT / TILE_SIZE);   // 37
  }

  generate() {
    this.obstacles = this.scene.physics.add.staticGroup();
    this.waterTiles = [];
    this.occupied = Array.from({ length: this.rows }, () => Array(this.cols).fill(false));

    // 1. Water (river or oasis)
    let waterCells;
    let bridgeCells = new Set();
    if (this.biome.terrain.waterType === 'oasis') {
      waterCells = this.generateOases();
    } else {
      waterCells = this.generateRiverPath();
      bridgeCells = this.placeBridge(waterCells);
    }

    // 2. Clearings
    const clearings = this.generateClearings();

    // 3. Terrain tiles
    this.layTerrain(waterCells, clearings, bridgeCells);
    this.layClearing(clearings);

    // 4. Decorations
    const trees = this.placeTrees(clearings, waterCells);
    const { berryPositions } = this.placeBushes(clearings, waterCells, trees);
    const rockPositions = this.placeRocks(clearings, waterCells, trees);
    this.placeFlowers(clearings, waterCells, trees);

    // 5. Item spawn points
    const itemSpawnPoints = this.computeItemSpawnPoints(
      berryPositions, trees, waterCells, clearings, rockPositions
    );

    // 6. Animal spawn zones
    const animalSpawnZones = this.computeAnimalSpawnZones(clearings, waterCells, trees);

    const housePlot = clearings[0];

    return {
      housePlotPosition: { x: housePlot.cx, y: housePlot.cy },
      itemSpawnPoints,
      animalSpawnZones,
      obstacles: this.obstacles,
      clearings,
      waterTiles: this.waterTiles,
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

  isInWater(col, row, waterCells) {
    return waterCells.has(`${col},${row}`);
  }

  dist(x1, y1, x2, y2) {
    return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
  }

  // ─── Clearings ───

  generateClearings() {
    const clearings = [];
    const placements = [
      { preferCol: Math.floor(this.cols * 0.3), preferRow: Math.floor(this.rows * 0.5) },
      { preferCol: Math.floor(this.cols * 0.7), preferRow: Math.floor(this.rows * 0.25) },
      { preferCol: Math.floor(this.cols * 0.5), preferRow: Math.floor(this.rows * 0.8) },
    ];

    for (const { preferCol, preferRow } of placements) {
      const w = 5 + Math.floor(Math.random() * 2);
      const h = 5 + Math.floor(Math.random() * 2);
      const left = Math.max(1, Math.min(preferCol - Math.floor(w / 2), this.cols - w - 1));
      const top = Math.max(1, Math.min(preferRow - Math.floor(h / 2), this.rows - h - 1));
      const right = left + w - 1;
      const bottom = top + h - 1;
      const cx = (left + right) / 2 * TILE_SIZE + TILE_SIZE / 2;
      const cy = (top + bottom) / 2 * TILE_SIZE + TILE_SIZE / 2;

      clearings.push({ left, top, right, bottom, cx, cy, w, h });

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

  // ─── River (woodland water) ───

  generateRiverPath() {
    const riverCells = new Set();
    const riverWidth = 3;

    let rx = this.cols * 0.4 + Math.random() * this.cols * 0.2;
    const amplitude = 4 + Math.random() * 3;
    const frequency = 0.06 + Math.random() * 0.03;
    const phase = Math.random() * Math.PI * 2;

    for (let row = 0; row < this.rows; row++) {
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

  // ─── Oases (desert water) ───

  generateOases() {
    const waterCells = new Set();
    const pondCount = 2 + Math.floor(Math.random() * 2); // 2-3 ponds

    // Pick spread-out positions
    const pondCenters = [];
    for (let attempt = 0; attempt < pondCount * 30; attempt++) {
      if (pondCenters.length >= pondCount) break;

      const col = 5 + Math.floor(Math.random() * (this.cols - 10));
      const row = 5 + Math.floor(Math.random() * (this.rows - 10));

      let tooClose = false;
      for (const p of pondCenters) {
        if (this.dist(col, row, p.col, p.row) < 12) { tooClose = true; break; }
      }
      if (tooClose) continue;

      pondCenters.push({ col, row });
    }

    // Create oval ponds
    for (const { col: cx, row: cy } of pondCenters) {
      const rx = 2 + Math.floor(Math.random() * 2); // radius 2-3
      const ry = 2 + Math.floor(Math.random() * 2);

      for (let r = cy - ry; r <= cy + ry; r++) {
        for (let c = cx - rx; c <= cx + rx; c++) {
          if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) continue;
          // Ellipse check
          const dx = (c - cx) / rx;
          const dy = (r - cy) / ry;
          if (dx * dx + dy * dy <= 1.0) {
            waterCells.add(`${c},${r}`);
            this.occupied[r][c] = true;
          }
        }
      }
    }

    return waterCells;
  }

  // ─── Bridge ───

  placeBridge(riverCells) {
    const bridgeCells = new Set();

    const minRow = Math.floor(this.rows * 0.3);
    const maxRow = Math.floor(this.rows * 0.7);

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

  // ─── Lay terrain tiles ───

  layTerrain(waterCells, clearings, bridgeCells) {
    const t = this.biome.terrain;

    // Sand bank cells (adjacent to water but not in water)
    const bankCells = new Set();
    for (const key of waterCells) {
      const [col, row] = key.split(',').map(Number);
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nk = `${col + dc},${row + dr}`;
          if (!waterCells.has(nk)) {
            bankCells.add(nk);
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
          texKey = 'terrain-bridge';
        } else if (waterCells.has(key)) {
          texKey = `terrain-${t.water}-${Math.floor(Math.random() * t.waterVariants)}`;
        } else if (bankCells.has(key)) {
          texKey = t.bankTile;
        } else {
          texKey = `${t.base}-${Math.floor(Math.random() * t.baseVariants)}`;
        }

        // For terrain tiles that are just a direct key (no variant suffix), use as-is
        // For grass/sand patterns like 'desert-sand-0', they already include the variant
        const tile = this.scene.add.image(wx, wy, texKey).setDepth(-1);

        if (waterCells.has(key) && !bridgeCells.has(key)) {
          this.waterTiles.push(tile);
        }
      }
    }

    // Water collision
    for (const key of waterCells) {
      if (bridgeCells.has(key)) continue;
      const [col, row] = key.split(',').map(Number);
      const wx = col * TILE_SIZE + TILE_SIZE / 2;
      const wy = row * TILE_SIZE + TILE_SIZE / 2;
      const blocker = this.scene.add.zone(wx, wy, TILE_SIZE, TILE_SIZE);
      this.obstacles.add(blocker);
    }
  }

  layClearing(clearings) {
    const clearingTile = this.biome.terrain.clearingTile;
    for (const c of clearings) {
      for (let row = c.top; row <= c.bottom; row++) {
        for (let col = c.left; col <= c.right; col++) {
          const wx = col * TILE_SIZE + TILE_SIZE / 2;
          const wy = row * TILE_SIZE + TILE_SIZE / 2;
          this.scene.add.image(wx, wy, clearingTile).setDepth(-0.5);
        }
      }
    }
  }

  // ─── Trees ───

  placeTrees(clearings, waterCells) {
    const trees = [];
    const cfg = this.biome.decorations.trees;
    const targetCount = cfg.count;
    const minDist = cfg.minDist;

    for (let attempt = 0; attempt < targetCount * 5; attempt++) {
      if (trees.length >= targetCount) break;

      const col = 1 + Math.floor(Math.random() * (this.cols - 2));
      const row = 1 + Math.floor(Math.random() * (this.rows - 2));

      if (this.isInClearing(col, row, clearings)) continue;
      if (this.isInWater(col, row, waterCells)) continue;

      const wx = col * TILE_SIZE + TILE_SIZE / 2;
      const wy = row * TILE_SIZE + TILE_SIZE / 2;

      let tooClose = false;
      for (const t of trees) {
        if (this.dist(wx, wy, t.x, t.y) < minDist) {
          tooClose = true;
          break;
        }
      }
      if (tooClose) continue;

      if (cfg.wholeTrees && cfg.wholeTrees.length > 0) {
        // Single-sprite tree (canopy + trunk baked in)
        const treeKey = cfg.wholeTrees[Math.floor(Math.random() * cfg.wholeTrees.length)];
        const tree = this.scene.add.image(wx, wy, treeKey);
        tree.setOrigin(0.5, 0.85); // anchor near bottom so trunk sits on ground
        // High depth so canopy renders above entities walking behind
        tree.setDepth(wy + 10000);
      } else {
        // Legacy two-sprite tree (trunk + canopy)
        const canopyVariant = cfg.canopies[Math.floor(Math.random() * cfg.canopies.length)];
        const trunk = this.scene.add.image(wx, wy + 8, cfg.trunk);
        trunk.setDepth(wy + 8);
        const canopy = this.scene.add.image(wx, wy - 16, canopyVariant);
        canopy.setDepth(wy - 16 + 10000);
      }

      const body = this.scene.add.zone(wx, wy + 12, 16, 16);
      this.obstacles.add(body);

      trees.push({ x: wx, y: wy });
    }

    return trees;
  }

  // ─── Bushes ───

  placeBushes(clearings, waterCells, trees) {
    const berryPositions = [];
    const cfg = this.biome.decorations.bushes;
    const targetCount = cfg.count;
    const placed = [];

    for (let attempt = 0; attempt < targetCount * 4; attempt++) {
      if (placed.length >= targetCount) break;

      const col = 1 + Math.floor(Math.random() * (this.cols - 2));
      const row = 1 + Math.floor(Math.random() * (this.rows - 2));

      if (this.isInClearing(col, row, clearings)) continue;
      if (this.isInWater(col, row, waterCells)) continue;

      const wx = col * TILE_SIZE + TILE_SIZE / 2;
      const wy = row * TILE_SIZE + TILE_SIZE / 2;

      let nearTree = false;
      for (const t of trees) {
        if (this.dist(wx, wy, t.x, t.y) < 50) {
          nearTree = true;
          break;
        }
      }

      let tooClose = false;
      for (const b of placed) {
        if (this.dist(wx, wy, b.x, b.y) < 40) {
          tooClose = true;
          break;
        }
      }
      if (tooClose || nearTree) continue;

      const isBerry = Math.random() < cfg.berryChance;
      const tex = isBerry ? cfg.berry : cfg.plain;
      const bush = this.scene.add.image(wx, wy, tex);
      bush.setDepth(wy);

      placed.push({ x: wx, y: wy });

      if (isBerry) {
        berryPositions.push({ x: wx, y: wy - 10 });
      }
    }

    return { berryPositions };
  }

  // ─── Rocks ───

  placeRocks(clearings, waterCells, trees) {
    const positions = [];
    const cfg = this.biome.decorations.rocks;
    const targetCount = cfg.count;

    for (let attempt = 0; attempt < targetCount * 4; attempt++) {
      if (positions.length >= targetCount) break;

      const col = 1 + Math.floor(Math.random() * (this.cols - 2));
      const row = 1 + Math.floor(Math.random() * (this.rows - 2));

      if (this.isInClearing(col, row, clearings)) continue;
      if (this.isInWater(col, row, waterCells)) continue;

      const wx = col * TILE_SIZE + TILE_SIZE / 2;
      const wy = row * TILE_SIZE + TILE_SIZE / 2;

      let tooClose = false;
      for (const t of trees) {
        if (this.dist(wx, wy, t.x, t.y) < 50) { tooClose = true; break; }
      }
      for (const r of positions) {
        if (this.dist(wx, wy, r.x, r.y) < 50) { tooClose = true; break; }
      }
      if (tooClose) continue;

      const rock = this.scene.add.image(wx, wy, cfg.texture);
      rock.setDepth(wy);

      const body = this.scene.add.zone(wx, wy, 20, 16);
      this.obstacles.add(body);

      positions.push({ x: wx, y: wy });
    }

    return positions;
  }

  // ─── Flowers ───

  placeFlowers(clearings, waterCells, trees) {
    const cfg = this.biome.decorations.flowers;
    const count = cfg.count;

    for (let i = 0; i < count; i++) {
      const wx = 40 + Math.random() * (WORLD_WIDTH - 80);
      const wy = 40 + Math.random() * (WORLD_HEIGHT - 80);
      const col = Math.floor(wx / TILE_SIZE);
      const row = Math.floor(wy / TILE_SIZE);

      if (this.isInClearing(col, row, clearings)) continue;
      if (this.isInWater(col, row, waterCells)) continue;

      const tex = cfg.variants[Math.floor(Math.random() * cfg.variants.length)];
      const flower = this.scene.add.image(wx, wy, tex);
      flower.setDepth(0);
    }
  }

  // ─── Item spawn points ───

  computeItemSpawnPoints(berryPositions, trees, waterCells, clearings, rockPositions) {
    const biomeItems = this.biome.itemSpawnCounts;
    const points = {};

    // Initialize all item types with empty arrays
    for (const itemType of Object.keys(biomeItems)) {
      points[itemType] = [];
    }

    // Food items that spawn at berry bushes (fruit-bearing bushes/cacti)
    // The first food item type that corresponds to "berry position" items
    const berryFoodTypes = this.getBerryFoodTypes();
    for (const foodType of berryFoodTypes) {
      if (points[foodType]) {
        points[foodType].push(...berryPositions);
      }
    }

    // Food items near trees
    const treeFoodTypes = this.getTreeFoodTypes();
    const shuffledTrees = [...trees].sort(() => Math.random() - 0.5);
    let treeIdx = 0;
    for (const foodType of treeFoodTypes) {
      if (!points[foodType]) continue;
      const count = Math.min(12, shuffledTrees.length - treeIdx);
      for (let i = 0; i < count && treeIdx < shuffledTrees.length; i++, treeIdx++) {
        points[foodType].push({
          x: shuffledTrees[treeIdx].x + (Math.random() * 30 - 15),
          y: shuffledTrees[treeIdx].y + 20,
        });
      }
    }

    // Food items near water (fish / desert-fish)
    const waterFoodTypes = this.getWaterFoodTypes();
    if (waterFoodTypes.length > 0) {
      const waterSpawnPoints = this.getWaterBankSpawns(waterCells);
      for (const foodType of waterFoodTypes) {
        if (points[foodType]) {
          points[foodType].push(...waterSpawnPoints);
        }
      }
    }

    // Food items near rocks (beetles)
    const rockFoodTypes = this.getRockFoodTypes();
    for (const foodType of rockFoodTypes) {
      if (!points[foodType]) continue;
      for (const r of rockPositions) {
        points[foodType].push({
          x: r.x + (Math.random() * 40 - 20),
          y: r.y + (Math.random() * 40 - 20),
        });
      }
    }

    // Building materials — data-driven from portalStages costs
    const buildMats = this.getBuildingMaterialTypes();
    for (const mat of buildMats) {
      if (!points[mat]) continue;

      // In clearings (skip first — player start)
      for (let ci = 1; ci < clearings.length; ci++) {
        const c = clearings[ci];
        for (let i = 0; i < 3; i++) {
          points[mat].push({ x: c.cx + (Math.random() * 80 - 40), y: c.cy + (Math.random() * 80 - 40) });
        }
      }
      // Near map edges
      for (let i = 0; i < 10; i++) {
        const edge = Math.floor(Math.random() * 4);
        let wx, wy;
        if (edge === 0) { wx = 80 + Math.random() * 200; wy = Math.random() * WORLD_HEIGHT; }
        else if (edge === 1) { wx = WORLD_WIDTH - 80 - Math.random() * 200; wy = Math.random() * WORLD_HEIGHT; }
        else if (edge === 2) { wx = Math.random() * WORLD_WIDTH; wy = 80 + Math.random() * 200; }
        else { wx = Math.random() * WORLD_WIDTH; wy = WORLD_HEIGHT - 80 - Math.random() * 200; }
        points[mat].push({ x: wx, y: wy });
      }
      // Near rocks
      for (const r of rockPositions) {
        points[mat].push({ x: r.x + (Math.random() * 40 - 20), y: r.y + (Math.random() * 40 - 20) });
      }
      // Scattered
      for (let i = 0; i < 6; i++) {
        points[mat].push({ x: 150 + Math.random() * (WORLD_WIDTH - 300), y: 150 + Math.random() * (WORLD_HEIGHT - 300) });
      }
    }

    return points;
  }

  // ─── Item spawn helpers (biome-aware) ───

  getBerryFoodTypes() {
    // Items that spawn near berry/fruit bushes
    const biomeId = this.biome.id;
    if (biomeId === 'woodland') return ['berries'];
    if (biomeId === 'desert') return ['cactus-fruit'];
    return [];
  }

  getTreeFoodTypes() {
    // Items that spawn near trees
    const biomeId = this.biome.id;
    if (biomeId === 'woodland') return ['mushrooms', 'acorns'];
    if (biomeId === 'desert') return ['dates'];
    return [];
  }

  getWaterFoodTypes() {
    const biomeId = this.biome.id;
    if (biomeId === 'woodland') return ['fish'];
    if (biomeId === 'desert') return ['desert-fish'];
    return [];
  }

  getRockFoodTypes() {
    const biomeId = this.biome.id;
    if (biomeId === 'desert') return ['beetles'];
    return [];
  }

  getBuildingMaterialTypes() {
    // Derive building material types from portalStages cost keys
    const mats = new Set();
    for (const stage of this.biome.portalStages) {
      for (const key of Object.keys(stage.cost)) {
        mats.add(key);
      }
    }
    return [...mats];
  }

  getWaterBankSpawns(waterCells) {
    const points = [];
    if (this.biome.terrain.waterType === 'oasis') {
      // For oases, spawn around the edges
      for (const key of waterCells) {
        const [col, row] = key.split(',').map(Number);
        // Check if this is an edge cell (has non-water neighbor)
        for (let dc = -1; dc <= 1; dc++) {
          for (let dr = -1; dr <= 1; dr++) {
            if (dc === 0 && dr === 0) continue;
            const nk = `${col + dc},${row + dr}`;
            if (!waterCells.has(nk)) {
              const wx = (col + dc) * TILE_SIZE + TILE_SIZE / 2;
              const wy = (row + dr) * TILE_SIZE + TILE_SIZE / 2;
              points.push({ x: wx, y: wy });
              break; // one per water cell
            }
          }
          if (points.length > 0 && points[points.length - 1].x === ((col + dc) * TILE_SIZE + TILE_SIZE / 2)) break;
        }
      }
    } else {
      // River: sample bank positions
      for (let row = 2; row < this.rows - 2; row += 3) {
        for (let col = 0; col < this.cols; col++) {
          const key = `${col},${row}`;
          if (!waterCells.has(key)) continue;
          const hasLand = !waterCells.has(`${col - 1},${row}`) || !waterCells.has(`${col + 1},${row}`);
          if (hasLand) {
            const wx = col * TILE_SIZE + TILE_SIZE / 2;
            const wy = row * TILE_SIZE + TILE_SIZE / 2;
            points.push({ x: wx, y: wy });
            break;
          }
        }
      }
    }
    return points;
  }

  // ─── Animal spawn zones ───

  computeAnimalSpawnZones(clearings, waterCells, trees) {
    const zones = {};
    const animals = this.biome.animals;

    for (const [animalType, config] of Object.entries(animals)) {
      // Generic spawn logic that works for any biome
      if (!config.shy) {
        // Non-shy: near clearings or water
        zones[animalType] = this.pickSpawnPoints(
          config.count * 2, trees, clearings,
          () => true
        );
      } else {
        // Shy: prefer edges and dense areas
        zones[animalType] = this.pickSpawnPoints(
          config.count * 2, trees, clearings,
          (x, y) => {
            return x < 800 || x > WORLD_WIDTH - 800 || y < 600 || y > WORLD_HEIGHT - 600;
          }
        );
      }
    }

    // Override with biome-specific placement for special animals
    if (this.biome.id === 'woodland') {
      this.computeWoodlandAnimalZones(zones, clearings, waterCells, trees);
    } else if (this.biome.id === 'desert') {
      this.computeDesertAnimalZones(zones, clearings, waterCells, trees);
    }

    return zones;
  }

  computeWoodlandAnimalZones(zones, clearings, waterCells, trees) {
    // Bears: deep forest (far from clearings)
    zones.bear = this.pickSpawnPoints(4, trees, clearings, (x, y) => {
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

    // Badgers: near dense tree areas
    zones.badger = this.pickSpawnPoints(4, trees, clearings, (x, y) => {
      let nearbyTrees = 0;
      for (const t of trees) {
        if (this.dist(x, y, t.x, t.y) < 200) nearbyTrees++;
      }
      return nearbyTrees >= 3;
    });

    // Capybaras: near river
    const riverPoints = [];
    for (const key of waterCells) {
      const [col, row] = key.split(',').map(Number);
      if (row % 6 === 0) {
        for (let dc = -2; dc <= 2; dc++) {
          const nk = `${col + dc},${row}`;
          if (!waterCells.has(nk)) {
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

    // Deer: near clearings
    zones.deer = [];
    for (const c of clearings) {
      for (let i = 0; i < 3; i++) {
        zones.deer.push({ x: c.cx + (Math.random() * 300 - 150), y: c.cy + (Math.random() * 300 - 150) });
      }
    }

    // Rabbits: everywhere
    zones.rabbit = this.pickSpawnPoints(10, trees, clearings, () => true);

    // Foxes: forest edges
    zones.fox = this.pickSpawnPoints(6, trees, clearings, (x, y) => {
      return x < 800 || x > WORLD_WIDTH - 800 || y < 600 || y > WORLD_HEIGHT - 600;
    });

    // Birds: everywhere
    zones.bird = this.pickSpawnPoints(8, trees, clearings, () => true);
  }

  computeDesertAnimalZones(zones, clearings, waterCells, trees) {
    // Camels: open desert, not too close to edges
    zones.camel = this.pickSpawnPoints(4, trees, clearings, (x, y) => {
      return x > 300 && x < WORLD_WIDTH - 300 && y > 300 && y < WORLD_HEIGHT - 300;
    });

    // Crocodiles: near oases
    const oasisPoints = [];
    for (const key of waterCells) {
      const [col, row] = key.split(',').map(Number);
      for (let dc = -2; dc <= 2; dc++) {
        const nk = `${col + dc},${row}`;
        if (!waterCells.has(nk)) {
          oasisPoints.push({
            x: (col + dc) * TILE_SIZE + TILE_SIZE / 2,
            y: row * TILE_SIZE + TILE_SIZE / 2,
          });
          break;
        }
      }
    }
    zones.crocodile = oasisPoints.length >= 4
      ? oasisPoints.sort(() => Math.random() - 0.5).slice(0, 4)
      : this.pickSpawnPoints(4, trees, clearings, () => true);

    // Snakes: near rocks (scattered)
    zones.snake = this.pickSpawnPoints(6, trees, clearings, (x, y) => {
      return x > 200 && x < WORLD_WIDTH - 200;
    });

    // Scorpions: near rocks, desert edges
    zones.scorpion = this.pickSpawnPoints(6, trees, clearings, (x, y) => {
      return x < 600 || x > WORLD_WIDTH - 600 || y > WORLD_HEIGHT - 500;
    });

    // Lizards: everywhere in open sand
    zones.lizard = this.pickSpawnPoints(8, trees, clearings, () => true);

    // Vultures: edges and far from clearings
    zones.vulture = this.pickSpawnPoints(6, trees, clearings, (x, y) => {
      let minDist = Infinity;
      for (const c of clearings) {
        minDist = Math.min(minDist, this.dist(x, y, c.cx, c.cy));
      }
      return minDist > 350;
    });

    // Fennec foxes: scattered, prefer edges
    zones.fennec = this.pickSpawnPoints(8, trees, clearings, (x, y) => {
      return x < 800 || x > WORLD_WIDTH - 800 || y < 600 || y > WORLD_HEIGHT - 600;
    });

    // Roadrunners: everywhere
    zones.roadrunner = this.pickSpawnPoints(8, trees, clearings, () => true);
  }

  pickSpawnPoints(count, trees, clearings, filter) {
    const points = [];
    for (let attempt = 0; attempt < count * 20; attempt++) {
      if (points.length >= count) break;

      const x = 100 + Math.random() * (WORLD_WIDTH - 200);
      const y = 100 + Math.random() * (WORLD_HEIGHT - 200);

      const col = Math.floor(x / TILE_SIZE);
      const row = Math.floor(y / TILE_SIZE);
      if (this.isInClearing(col, row, clearings)) continue;

      let onTree = false;
      for (const t of trees) {
        if (this.dist(x, y, t.x, t.y) < 50) { onTree = true; break; }
      }
      if (onTree) continue;

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
