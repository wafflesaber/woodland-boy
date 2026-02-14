import { WORLD_WIDTH, WORLD_HEIGHT, TILE_SIZE, ITEM_SPAWN_COUNTS, ITEM_RESPAWN_TIME, INTERACTION_RANGE, ANIMALS } from '../config.js';
import MapGenerator from '../systems/MapGenerator.js';
import Player from '../entities/Player.js';
import Collectible from '../entities/Collectible.js';
import Animal from '../entities/Animal.js';
import InventoryManager from '../systems/InventoryManager.js';
import EventBus from '../utils/EventBus.js';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    // ─── World generation ───
    const mapGen = new MapGenerator(this);
    this.mapData = mapGen.generate();

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    // ─── Player ───
    // Spawn near the first clearing
    const startClearing = this.mapData.clearings[0];
    this.player = new Player(this, startClearing.cx, startClearing.cy - 100);

    // ─── House plot (player chooses which clearing) ───
    this.housePlotChosen = false;
    this.housePlotPosition = null;
    this.housePlot = null;

    // Player vs obstacles
    this.physics.add.collider(this.player, this.mapData.obstacles);

    // ─── Camera ───
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.fadeIn(400, 0, 0, 0);

    // ─── Inventory ───
    this.inventory = new InventoryManager();

    // Listen for slot selection from UI
    EventBus.on('select-slot', (index) => {
      this.inventory.selectSlot(index);
    });

    // ─── Collectibles ───
    this.collectiblesGroup = this.physics.add.group();
    this.spawnPointPool = {}; // itemType → array of available spawn positions
    this.respawnTimers = [];  // active respawn timers

    this.spawnInitialItems();

    // No auto-collect on overlap — player must tap items intentionally.

    // Pending interaction: when player taps an item that's out of range,
    // walk toward it and collect on arrival.
    this.pendingCollectTarget = null;

    // ─── Animals ───
    this.animalsGroup = this.physics.add.group();
    this.animals = []; // flat array for update loop
    this.spawnAnimals();

    // Animals collide with obstacles (trees, rocks) but not each other
    this.physics.add.collider(this.animalsGroup, this.mapData.obstacles);

    // ─── Touch input ───
    this.input.on('pointerdown', (pointer) => {
      const worldX = pointer.worldX;
      const worldY = pointer.worldY;

      // Clear any pending collect target
      this.pendingCollectTarget = null;

      // Check if the player tapped inside a clearing to place their house
      if (!this.housePlotChosen) {
        const clearing = this.getTappedClearing(worldX, worldY);
        if (clearing) {
          this.placeHousePlot(clearing);
          return;
        }
      }

      // Check if the player tapped on an animal (feeding interaction in Phase 5)
      const tappedAnimal = this.getTappedAnimal(worldX, worldY);
      if (tappedAnimal) {
        // Phase 5 will add feeding logic here.
        // For now, just walk toward the animal.
        this.player.moveTo(tappedAnimal.x, tappedAnimal.y);
        return;
      }

      // Check if the player tapped on a collectible
      const tappedItem = this.getTappedCollectible(worldX, worldY);
      if (tappedItem) {
        const dist = Phaser.Math.Distance.Between(
          this.player.x, this.player.y, tappedItem.x, tappedItem.y
        );
        if (dist <= INTERACTION_RANGE) {
          // Close enough — collect immediately
          this.collectItem(tappedItem);
          return;
        }
        // Too far — walk toward item, collect when player arrives
        this.pendingCollectTarget = tappedItem;
        this.player.moveTo(tappedItem.x, tappedItem.y);
        return;
      }

      // Default: tap-to-move
      this.player.moveTo(worldX, worldY);
    });

    // ─── Clean up on shutdown ───
    this.events.on('shutdown', () => {
      EventBus.off('select-slot');
      for (const timer of this.respawnTimers) {
        timer.remove(false);
      }
    });
  }

  update(time, delta) {
    if (this.player) {
      this.player.update(time, delta);
    }

    // Update all animals
    for (const animal of this.animals) {
      if (animal.active) {
        animal.update(time, delta);
      }
    }

    // Check if player has arrived near a pending collect target
    if (this.pendingCollectTarget) {
      const target = this.pendingCollectTarget;
      if (!target.active) {
        // Item was already collected or destroyed
        this.pendingCollectTarget = null;
      } else {
        const dist = Phaser.Math.Distance.Between(
          this.player.x, this.player.y, target.x, target.y
        );
        if (dist <= INTERACTION_RANGE) {
          this.collectItem(target);
          this.pendingCollectTarget = null;
        }
      }
    }
  }

  // ─── Item spawning ───

  spawnInitialItems() {
    const spawnPoints = this.mapData.itemSpawnPoints;

    for (const [itemType, positions] of Object.entries(spawnPoints)) {
      // Shuffle positions so we pick a random subset
      const shuffled = Phaser.Utils.Array.Shuffle([...positions]);
      const spawnCount = ITEM_SPAWN_COUNTS[itemType] || 6;
      const toSpawn = shuffled.slice(0, spawnCount);
      const remaining = shuffled.slice(spawnCount);

      // Store remaining positions as the available pool for respawning
      this.spawnPointPool[itemType] = remaining;

      for (const pos of toSpawn) {
        this.spawnCollectible(pos.x, pos.y, itemType);
      }
    }
  }

  spawnCollectible(x, y, itemType) {
    const item = new Collectible(this, x, y, itemType);
    this.collectiblesGroup.add(item);
    return item;
  }

  collectItem(item) {
    if (!item.active) return; // already being collected

    if (this.inventory.isFull()) return; // no room

    const added = this.inventory.add(item.itemType);
    if (!added) return;

    const itemType = item.itemType;

    // Play collect animation
    item.collect();

    // TODO: play pickup sound (Phase 7)

    // Schedule respawn
    this.scheduleRespawn(itemType);
  }

  scheduleRespawn(itemType) {
    // Respawn after ITEM_RESPAWN_TIME at a random available spawn point
    const delay = ITEM_RESPAWN_TIME + Math.random() * 10000; // 40-50s
    const timer = this.time.delayedCall(delay, () => {
      // Pick a spawn point from the pool, or from all known points as fallback
      const pool = this.spawnPointPool[itemType];
      const allPoints = this.mapData.itemSpawnPoints[itemType];
      const source = pool && pool.length > 0 ? pool : allPoints;

      if (!source || source.length === 0) return;

      const idx = Math.floor(Math.random() * source.length);
      const pos = source[idx];
      this.spawnCollectible(pos.x, pos.y, itemType);

      // Remove from pool so we cycle through different spots
      if (pool && pool.length > 0) {
        pool.splice(idx, 1);
      }

      // Remove this timer from tracking
      const timerIdx = this.respawnTimers.indexOf(timer);
      if (timerIdx !== -1) this.respawnTimers.splice(timerIdx, 1);
    });

    this.respawnTimers.push(timer);
  }

  // ─── Helpers ───

  /**
   * Check if a world position falls inside any of the 3 clearings.
   * Returns the clearing object or null.
   */
  getTappedClearing(worldX, worldY) {
    for (const c of this.mapData.clearings) {
      const leftPx = c.left * TILE_SIZE;
      const rightPx = (c.right + 1) * TILE_SIZE;
      const topPx = c.top * TILE_SIZE;
      const bottomPx = (c.bottom + 1) * TILE_SIZE;

      if (worldX >= leftPx && worldX <= rightPx && worldY >= topPx && worldY <= bottomPx) {
        return c;
      }
    }
    return null;
  }

  /**
   * Place the house plot marker at the chosen clearing.
   */
  placeHousePlot(clearing) {
    this.housePlotChosen = true;
    this.housePlotPosition = { x: clearing.cx, y: clearing.cy };

    // Place the house-stage-0 sprite
    this.housePlot = this.add.image(clearing.cx, clearing.cy, 'house-stage-0');
    this.housePlot.setDepth(clearing.cy - 24);

    // Satisfying bounce-in tween
    this.housePlot.setScale(0);
    this.tweens.add({
      targets: this.housePlot,
      scaleX: 1,
      scaleY: 1,
      duration: 400,
      ease: 'Back.easeOut',
    });
  }

  /**
   * Check if a world position is on top of a collectible.
   * Uses a generous radius for kid-friendly taps.
   */
  getTappedCollectible(worldX, worldY) {
    let closest = null;
    let closestDist = 60; // generous tap radius in world pixels (kid-friendly)

    for (const item of this.collectiblesGroup.getChildren()) {
      if (!item.active) continue;
      const dist = Phaser.Math.Distance.Between(worldX, worldY, item.x, item.y);
      if (dist < closestDist) {
        closest = item;
        closestDist = dist;
      }
    }

    return closest;
  }

  // ─── Animal spawning ───

  spawnAnimals() {
    const zones = this.mapData.animalSpawnZones;

    for (const [animalType, config] of Object.entries(ANIMALS)) {
      const spawnPoints = zones[animalType];
      if (!spawnPoints || spawnPoints.length === 0) continue;

      const count = config.count;
      for (let i = 0; i < count; i++) {
        // Pick a spawn point, cycling through available ones
        const point = spawnPoints[i % spawnPoints.length];
        // Add slight randomness so animals of the same type don't stack
        const offsetX = (Math.random() - 0.5) * 60;
        const offsetY = (Math.random() - 0.5) * 60;
        const x = Phaser.Math.Clamp(point.x + offsetX, 40, WORLD_WIDTH - 40);
        const y = Phaser.Math.Clamp(point.y + offsetY, 40, WORLD_HEIGHT - 40);

        const animal = new Animal(this, x, y, config);
        this.animalsGroup.add(animal);
        this.animals.push(animal);
      }
    }
  }

  /**
   * Check if a world position is on top of an animal.
   * Uses a generous radius for kid-friendly taps.
   */
  getTappedAnimal(worldX, worldY) {
    let closest = null;
    let closestDist = 60;

    for (const animal of this.animals) {
      if (!animal.active) continue;
      const dist = Phaser.Math.Distance.Between(worldX, worldY, animal.x, animal.y);
      if (dist < closestDist) {
        closest = animal;
        closestDist = dist;
      }
    }

    return closest;
  }
}
