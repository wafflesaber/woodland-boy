import { WORLD_WIDTH, WORLD_HEIGHT, ITEM_SPAWN_COUNTS, ITEM_RESPAWN_TIME, INTERACTION_RANGE } from '../config.js';
import MapGenerator from '../systems/MapGenerator.js';
import Player from '../entities/Player.js';
import Collectible from '../entities/Collectible.js';
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
    const hp = this.mapData.housePlotPosition;
    this.player = new Player(this, hp.x, hp.y - 100);

    // House plot marker
    this.housePlot = this.add.image(hp.x, hp.y, 'house-stage-0');
    this.housePlot.setDepth(hp.y - 24);

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

    // ─── Touch input ───
    this.input.on('pointerdown', (pointer) => {
      const worldX = pointer.worldX;
      const worldY = pointer.worldY;

      // Clear any pending collect target
      this.pendingCollectTarget = null;

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
}
