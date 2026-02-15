import { WORLD_WIDTH, WORLD_HEIGHT, TILE_SIZE, ITEM_SPAWN_COUNTS, ITEM_RESPAWN_TIME, INTERACTION_RANGE, ANIMALS, BUILDING_STAGES } from '../config.js';
import MapGenerator from '../systems/MapGenerator.js';
import Player from '../entities/Player.js';
import Collectible from '../entities/Collectible.js';
import Animal from '../entities/Animal.js';
import InventoryManager from '../systems/InventoryManager.js';
import TamingManager from '../systems/TamingManager.js';
import BuildingManager from '../systems/BuildingManager.js';
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
    const startClearing = this.mapData.clearings[0];
    this.player = new Player(this, startClearing.cx, startClearing.cy - 100);

    // ─── House plot (player chooses which clearing) ───
    this.housePlotChosen = false;
    this.housePlotPosition = null;
    this.housePlot = null;
    this.buildingManager = null;
    this.pendingHouseTarget = false;

    // Player vs obstacles
    this.physics.add.collider(this.player, this.mapData.obstacles);

    // ─── Camera ───
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.fadeIn(400, 0, 0, 0);

    // ─── Inventory ───
    this.inventory = new InventoryManager();

    EventBus.on('select-slot', (index) => {
      this.inventory.selectSlot(index);
    });

    EventBus.on('do-build', () => {
      this.executeBuild();
    });

    EventBus.on('drop-item', (index) => {
      this.dropItem(index);
    });

    // ─── Taming ───
    this.tamingManager = new TamingManager();
    this.tamedCount = 0;

    // ─── Collectibles ───
    this.collectiblesGroup = this.physics.add.group();
    this.spawnPointPool = {};
    this.respawnTimers = [];

    this.spawnInitialItems();

    // Pending interaction targets
    this.pendingCollectTarget = null;
    this.pendingAnimalTarget = null;

    // ─── Animals ───
    this.animalsGroup = this.physics.add.group();
    this.animals = [];
    this.spawnAnimals();

    this.physics.add.collider(this.animalsGroup, this.mapData.obstacles);

    // ─── Water shimmer ───
    this.waterTiles = this.mapData.waterTiles || [];
    this.waterShimmerTimer = 0;

    // ─── Ambient particles ───
    this.ambientTimer = 0;
    this.ambientParticles = [];

    // ─── Tamed sparkle timer ───
    this.tamedSparkleTimer = 0;

    // ─── Touch input ───
    this.input.on('pointerdown', (pointer) => {
      const worldX = pointer.worldX;
      const worldY = pointer.worldY;

      // Clear pending targets
      this.pendingCollectTarget = null;
      this.pendingAnimalTarget = null;
      this.pendingHouseTarget = false;

      // Check if the player tapped inside a clearing to place their house
      if (!this.housePlotChosen) {
        const clearing = this.getTappedClearing(worldX, worldY);
        if (clearing) {
          this.placeHousePlot(clearing);
          return;
        }
      }

      // Check if the player tapped on a collectible (BEFORE house check
      // so items near the house plot can still be picked up)
      const tappedItem = this.getTappedCollectible(worldX, worldY);
      if (tappedItem) {
        const dist = Phaser.Math.Distance.Between(
          this.player.x, this.player.y, tappedItem.x, tappedItem.y
        );
        if (dist <= INTERACTION_RANGE) {
          this.collectItem(tappedItem);
          return;
        }
        this.pendingCollectTarget = tappedItem;
        this.player.moveTo(tappedItem.x, tappedItem.y);
        return;
      }

      // Check if the player tapped on an animal
      const tappedAnimal = this.getTappedAnimal(worldX, worldY);
      if (tappedAnimal) {
        const dist = Phaser.Math.Distance.Between(
          this.player.x, this.player.y, tappedAnimal.x, tappedAnimal.y
        );

        if (dist <= INTERACTION_RANGE) {
          this.handleAnimalInteraction(tappedAnimal);
        } else {
          // Show thought bubble hint immediately for tameable animals
          // so the player sees what it wants even if it's shy and flees.
          // Pinned so it stays put instead of chasing a fleeing animal offscreen.
          if (tappedAnimal.config.tameable && !tappedAnimal.tamed) {
            const favoriteFood = tappedAnimal.config.favoriteFood;
            EventBus.emit('show-thought-bubble', {
              animalId: tappedAnimal.animalId,
              worldX: tappedAnimal.x,
              worldY: tappedAnimal.y - 45,
              itemTexture: `item-${favoriteFood}`,
              pinned: true,
            });
          }

          // Walk toward animal, interact on arrival
          this.pendingAnimalTarget = tappedAnimal;
          this.player.moveTo(tappedAnimal.x, tappedAnimal.y);
        }
        return;
      }

      // Check if tapped the house plot (for building)
      if (this.housePlotChosen && this.housePlot && this.buildingManager && !this.buildingManager.isComplete()) {
        const distToHouse = Phaser.Math.Distance.Between(worldX, worldY, this.housePlotPosition.x, this.housePlotPosition.y);
        if (distToHouse < 100) {
          const distPlayer = Phaser.Math.Distance.Between(
            this.player.x, this.player.y, this.housePlotPosition.x, this.housePlotPosition.y
          );
          if (distPlayer <= INTERACTION_RANGE) {
            this.openBuildMenu();
          } else {
            this.pendingHouseTarget = true;
            this.player.moveTo(this.housePlotPosition.x, this.housePlotPosition.y);
          }
          return;
        }
      }

      // Default: tap-to-move
      this.player.moveTo(worldX, worldY);
    });

    // ─── Clean up on shutdown ───
    this.events.on('shutdown', () => {
      EventBus.off('select-slot');
      EventBus.off('do-build');
      EventBus.off('drop-item');
      for (const timer of this.respawnTimers) {
        timer.remove(false);
      }
      // Clean up ambient particles
      for (const p of this.ambientParticles) {
        if (p && p.active) p.destroy();
      }
      this.ambientParticles = [];
      this.waterTiles = [];
    });
  }

  update(time, delta) {
    if (this.player) {
      this.player.update(time, delta);
    }

    for (const animal of this.animals) {
      if (animal.active) {
        animal.update(time, delta);
      }
    }

    // ─── Water shimmer: staggered texture cycling ───
    // Update ~20 tiles per frame spread over time instead of all 100+ at once
    this.waterShimmerTimer += delta;
    if (this.waterShimmerTimer > 50 && this.waterTiles.length > 0) {
      this.waterShimmerTimer = 0;
      // Each frame, randomly retexture a few water tiles
      const count = Math.min(5, this.waterTiles.length);
      for (let i = 0; i < count; i++) {
        const idx = Math.floor(Math.random() * this.waterTiles.length);
        const tile = this.waterTiles[idx];
        if (tile && tile.active) {
          tile.setTexture(`terrain-water-${Math.floor(Math.random() * 3)}`);
        }
      }
    }

    // ─── Ambient particles (butterfly/leaf drift) ───
    this.ambientTimer += delta;
    if (this.ambientTimer > 3000 + Math.random() * 2000) {
      this.ambientTimer = 0;
      this.spawnAmbientParticle();
    }

    // ─── Tamed animal sparkle ───
    this.tamedSparkleTimer += delta;
    if (this.tamedSparkleTimer > 3000 + Math.random() * 2000) {
      this.tamedSparkleTimer = 0;
      this.spawnTamedSparkle();
    }

    // Check pending collect target
    if (this.pendingCollectTarget) {
      const target = this.pendingCollectTarget;
      if (!target.active) {
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

    // Check pending house target
    if (this.pendingHouseTarget && this.housePlotPosition) {
      const dist = Phaser.Math.Distance.Between(
        this.player.x, this.player.y, this.housePlotPosition.x, this.housePlotPosition.y
      );
      if (dist <= INTERACTION_RANGE) {
        this.pendingHouseTarget = false;
        this.player.target = null;
        this.player.body.setVelocity(0, 0);
        this.openBuildMenu();
      }
    }

    // Check pending animal target
    if (this.pendingAnimalTarget) {
      const target = this.pendingAnimalTarget;
      if (!target.active) {
        this.pendingAnimalTarget = null;
      } else {
        const dist = Phaser.Math.Distance.Between(
          this.player.x, this.player.y, target.x, target.y
        );
        if (dist <= INTERACTION_RANGE) {
          this.handleAnimalInteraction(target);
          this.pendingAnimalTarget = null;
          // Stop player from continuing past the animal
          this.player.target = null;
          this.player.body.setVelocity(0, 0);
        }
      }
    }
  }

  // ─── Animal interaction ───

  handleAnimalInteraction(animal) {
    if (!animal.config.tameable) return;
    if (animal.tamed) return;
    if (animal.state === 'FEEDING') return;

    const selectedItem = this.inventory.getSelected();
    const favoriteFood = animal.config.favoriteFood;

    if (!selectedItem || selectedItem !== favoriteFood) {
      // Wrong item or no item — show thought bubble hint
      EventBus.emit('show-thought-bubble', {
        animalId: animal.animalId,
        worldX: animal.x,
        worldY: animal.y - 30,
        itemTexture: `item-${favoriteFood}`,
      });

      if (this.game.audioManager) {
        this.game.audioManager.playError();
      }
      return;
    }

    this.feedAnimal(animal);
  }

  feedAnimal(animal) {
    // Consume item
    this.inventory.consumeSelected();

    // Init taming progress on first feed
    this.tamingManager.initAnimal(animal.animalId, animal.config.requiredFeedings);

    // Animal enters feeding state
    animal.enterFeeding(1500);

    // Stop player movement so tween doesn't fight physics
    this.player.target = null;
    this.player.body.setVelocity(0, 0);

    // Brief scale-based "offering" pulse (visual only, no position change)
    this.tweens.add({
      targets: this.player,
      scaleX: 1.15,
      scaleY: 0.9,
      duration: 120,
      yoyo: true,
      ease: 'Sine.easeInOut',
    });

    if (this.game.audioManager) {
      this.game.audioManager.playFeed();
    }

    // Heart particle rising above animal
    this.spawnHeartParticle(animal.x, animal.y - 20);

    // Increment feeding progress
    const result = this.tamingManager.feed(animal.animalId);
    const progress = this.tamingManager.getProgress(animal.animalId);

    // Tell UIScene about the progress
    EventBus.emit('taming-progress', {
      animalId: animal.animalId,
      worldX: animal.x,
      worldY: animal.y,
      current: progress.current,
      max: progress.max,
    });

    if (result === 'tamed') {
      // Delay celebration until feeding pause ends
      this.time.delayedCall(1500, () => {
        this.tameAnimal(animal);
      });
    }
  }

  tameAnimal(animal) {
    const index = this.tamedCount;
    this.tamedCount++;

    animal.setTamed(index);

    // Burst of heart particles
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      const burstDist = 20 + Math.random() * 20;
      const tx = animal.x + Math.cos(angle) * burstDist;
      const ty = animal.y + Math.sin(angle) * burstDist - 30;
      this.spawnHeartParticle(animal.x, animal.y - 10, tx, ty);
    }

    if (this.game.audioManager) {
      this.game.audioManager.playTameSuccess();
    }

    EventBus.emit('animal-tamed', {
      animalId: animal.animalId,
      animalType: animal.animalType,
    });
  }

  spawnHeartParticle(x, y, targetX, targetY) {
    const heart = this.add.image(x, y, 'particle-heart');
    heart.setDepth(10000);
    heart.setScale(0.8);

    const tx = targetX !== undefined ? targetX : x + (Math.random() - 0.5) * 20;
    const ty = targetY !== undefined ? targetY : y - 40;

    this.tweens.add({
      targets: heart,
      x: tx,
      y: ty,
      alpha: 0,
      scaleX: 0.3,
      scaleY: 0.3,
      duration: 800,
      ease: 'Power2',
      onComplete: () => heart.destroy(),
    });
  }

  // ─── Item spawning ───

  spawnInitialItems() {
    const spawnPoints = this.mapData.itemSpawnPoints;

    for (const [itemType, positions] of Object.entries(spawnPoints)) {
      const shuffled = Phaser.Utils.Array.Shuffle([...positions]);
      const spawnCount = ITEM_SPAWN_COUNTS[itemType] || 6;
      const toSpawn = shuffled.slice(0, spawnCount);
      const remaining = shuffled.slice(spawnCount);

      this.spawnPointPool[itemType] = remaining;

      for (const pos of toSpawn) {
        this.spawnCollectible(pos.x, pos.y, itemType);
      }
    }
  }

  spawnCollectible(x, y, itemType) {
    // Don't spawn on top of the house plot
    if (this.housePlotPosition) {
      const dist = Phaser.Math.Distance.Between(x, y, this.housePlotPosition.x, this.housePlotPosition.y);
      if (dist < 90) return null;
    }
    const item = new Collectible(this, x, y, itemType);
    this.collectiblesGroup.add(item);
    return item;
  }

  dropItem(index) {
    const itemType = this.inventory.slots[index];
    if (!itemType) return;

    this.inventory.remove(index);

    // Spawn a real collectible on the ground near the player
    const offsetX = (Math.random() - 0.5) * 60;
    const offsetY = 20 + Math.random() * 20;
    const dropX = this.player.x + offsetX;
    const dropY = this.player.y + offsetY;

    // Brief toss animation, then spawn the real item
    const tossed = this.add.image(this.player.x, this.player.y - 10, `item-${itemType}`);
    tossed.setDepth(10000);
    tossed.setScale(0.8);
    this.tweens.add({
      targets: tossed,
      x: dropX,
      y: dropY,
      scaleX: 1,
      scaleY: 1,
      duration: 300,
      ease: 'Bounce.easeOut',
      onComplete: () => {
        tossed.destroy();
        this.spawnCollectible(dropX, dropY, itemType);
      },
    });
  }

  collectItem(item) {
    if (!item.active) return;
    if (this.inventory.isFull()) return;

    const added = this.inventory.add(item.itemType);
    if (!added) return;

    const itemType = item.itemType;
    item.collect();

    if (this.game.audioManager) {
      this.game.audioManager.playPickup();
    }

    this.scheduleRespawn(itemType);
  }

  scheduleRespawn(itemType) {
    const delay = ITEM_RESPAWN_TIME + Math.random() * 10000;
    const timer = this.time.delayedCall(delay, () => {
      const pool = this.spawnPointPool[itemType];
      const allPoints = this.mapData.itemSpawnPoints[itemType];
      const source = pool && pool.length > 0 ? pool : allPoints;

      if (!source || source.length === 0) return;

      const idx = Math.floor(Math.random() * source.length);
      const pos = source[idx];
      this.spawnCollectible(pos.x, pos.y, itemType);

      if (pool && pool.length > 0) {
        pool.splice(idx, 1);
      }

      const timerIdx = this.respawnTimers.indexOf(timer);
      if (timerIdx !== -1) this.respawnTimers.splice(timerIdx, 1);
    });

    this.respawnTimers.push(timer);
  }

  // ─── Helpers ───

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

  placeHousePlot(clearing) {
    this.housePlotChosen = true;
    this.housePlotPosition = { x: clearing.cx, y: clearing.cy };

    // House scale: ~half the clearing size (clearing is ~384x320px, house base is 48x48)
    this.houseScale = 3.5;

    this.housePlot = this.add.image(clearing.cx, clearing.cy, 'house-stage-0');
    this.housePlot.setDepth(clearing.cy - 24);

    this.housePlot.setScale(0);
    this.tweens.add({
      targets: this.housePlot,
      scaleX: this.houseScale,
      scaleY: this.houseScale,
      duration: 400,
      ease: 'Back.easeOut',
    });

    // Remove any collectibles overlapping the house plot
    for (const item of this.collectiblesGroup.getChildren()) {
      if (!item.active) continue;
      const dist = Phaser.Math.Distance.Between(clearing.cx, clearing.cy, item.x, item.y);
      if (dist < 90) {
        item.destroy();
      }
    }

    // Create building manager now that we know the position
    this.buildingManager = new BuildingManager(this, clearing.cx, clearing.cy);
    this.buildingManager.houseSprite = this.housePlot;
  }

  // ─── Building ───

  openBuildMenu() {
    if (!this.buildingManager || this.buildingManager.isComplete()) return;

    const next = this.buildingManager.getNextStageCost();
    if (!next) return;

    // Gather current material counts for the UI
    const materials = {};
    for (const [itemType, needed] of Object.entries(next.cost)) {
      materials[itemType] = { have: this.inventory.countOf(itemType), need: needed };
    }

    const canBuild = this.buildingManager.canBuild(this.inventory);

    EventBus.emit('show-build-menu', {
      stageName: next.name,
      stageNumber: this.buildingManager.stage + 1,
      totalStages: BUILDING_STAGES.length,
      materials,
      canBuild,
    });
  }

  executeBuild() {
    if (!this.buildingManager || this.buildingManager.isComplete()) return;
    if (!this.buildingManager.canBuild(this.inventory)) return;

    const newStage = this.buildingManager.build(this.inventory);
    if (newStage === -1) return;

    // Bounce tween on house sprite
    const s = this.houseScale || 3.5;
    this.tweens.add({
      targets: this.housePlot,
      scaleX: s * 1.15,
      scaleY: s * 1.15,
      duration: 150,
      yoyo: true,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.housePlot.setScale(s);
      },
    });

    // Update depth for new sprite size
    this.housePlot.setDepth(this.housePlotPosition.y - 24);

    // Star/sparkle particles
    this.spawnBuildParticles(this.housePlotPosition.x, this.housePlotPosition.y);

    if (this.game.audioManager) {
      if (this.buildingManager.isComplete()) {
        this.game.audioManager.playBuildComplete();
      } else {
        this.game.audioManager.playBuild();
      }
    }

    // Extra celebration for final stage
    if (this.buildingManager.isComplete()) {
      this.time.delayedCall(200, () => {
        this.spawnBuildParticles(this.housePlotPosition.x, this.housePlotPosition.y, true);
      });
    }

    // Close the build menu
    EventBus.emit('close-build-menu');
  }

  spawnBuildParticles(x, y, large) {
    const count = large ? 16 : 8;
    const spread = large ? 50 : 30;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const dist = spread + Math.random() * 20;
      const tx = x + Math.cos(angle) * dist;
      const ty = y + Math.sin(angle) * dist - 20;

      const tex = Math.random() > 0.5 ? 'particle-star' : 'particle-sparkle';
      const star = this.add.image(x, y - 10, tex);
      star.setDepth(10000);
      star.setScale(large ? 1.2 : 0.8);

      this.tweens.add({
        targets: star,
        x: tx,
        y: ty,
        alpha: 0,
        scaleX: 0.2,
        scaleY: 0.2,
        duration: 600 + Math.random() * 300,
        ease: 'Power2',
        onComplete: () => star.destroy(),
      });
    }
  }

  // ─── Ambient particles ───

  spawnAmbientParticle() {
    // Cap active ambient particles to prevent unbounded growth
    this.ambientParticles = this.ambientParticles.filter(p => p && p.active);
    if (this.ambientParticles.length >= 4) return;

    const cam = this.cameras.main;
    // Spawn just off the right side of the viewport
    const startX = cam.scrollX + 1024 + 20;
    const startY = cam.scrollY + 100 + Math.random() * 500;
    const endX = cam.scrollX - 40;
    const endY = startY + (Math.random() - 0.3) * 200;

    // Alternate between leaf and butterfly visuals
    const tex = Math.random() > 0.5 ? 'particle-sparkle' : 'particle-star';
    const particle = this.add.image(startX, startY, tex);
    particle.setDepth(9000);
    particle.setAlpha(0.6);
    particle.setScale(0.5 + Math.random() * 0.4);
    // Tint green for leaf, or pink/yellow for butterfly
    if (Math.random() > 0.5) {
      particle.setTint(0x88CC44); // leaf green
    } else {
      particle.setTint(Phaser.Display.Color.GetColor(
        200 + Math.floor(Math.random() * 55),
        100 + Math.floor(Math.random() * 100),
        180 + Math.floor(Math.random() * 75)
      ));
    }

    // Track for cleanup
    this.ambientParticles.push(particle);

    // Use a random phase offset so oscillation isn't tied to wall-clock time
    const phaseOffset = Math.random() * Math.PI * 2;

    this.tweens.add({
      targets: particle,
      x: endX,
      y: endY,
      alpha: 0,
      duration: 6000 + Math.random() * 3000,
      ease: 'Sine.easeInOut',
      onUpdate: (tween) => {
        // Gentle vertical oscillation for drifting feel
        particle.y += Math.sin(tween.elapsed * 0.003 + phaseOffset) * 0.3;
      },
      onComplete: () => {
        particle.destroy();
      },
    });
  }

  // ─── Tamed animal sparkle ───

  spawnTamedSparkle() {
    const tamed = this.animals.filter(a => a.active && a.tamed);
    if (tamed.length === 0) return;

    const animal = tamed[Math.floor(Math.random() * tamed.length)];
    const offsetX = (Math.random() - 0.5) * 20;
    const offsetY = -10 + (Math.random() - 0.5) * 15;

    const sparkle = this.add.image(animal.x + offsetX, animal.y + offsetY, 'particle-sparkle');
    sparkle.setDepth(10000);
    sparkle.setScale(0.5);
    sparkle.setAlpha(0.8);

    this.tweens.add({
      targets: sparkle,
      y: sparkle.y - 20,
      alpha: 0,
      scaleX: 0.1,
      scaleY: 0.1,
      duration: 600 + Math.random() * 300,
      ease: 'Power2',
      onComplete: () => sparkle.destroy(),
    });
  }

  getTappedCollectible(worldX, worldY) {
    let closest = null;
    let closestDist = 60;

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
        const point = spawnPoints[i % spawnPoints.length];
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
