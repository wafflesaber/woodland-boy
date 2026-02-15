import { WORLD_WIDTH, WORLD_HEIGHT, TILE_SIZE, ITEM_SPAWN_COUNTS, ITEM_RESPAWN_TIME, INTERACTION_RANGE, ANIMALS, PORTAL_STAGES, PORTAL_ACTIVATION_RANGE } from '../config.js';
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

    // ─── Portal plot (player chooses which clearing) ───
    this.portalPlotChosen = false;
    this.portalPlotPosition = null;
    this.portalSprite = null;
    this.portalManager = null;
    this.pendingPortalTarget = false;
    this.portalSwirlTimer = 0;
    this.portalSwirlFrame = 0;
    this.portalSparkleTimer = 0;
    this.portalSparkles = [];

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
      this.executePortalBuild();
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
      this.pendingPortalTarget = false;

      // Check if the player tapped inside a clearing to place their portal
      if (!this.portalPlotChosen) {
        const clearing = this.getTappedClearing(worldX, worldY);
        if (clearing) {
          this.placePortalPlot(clearing);
          return;
        }
      }

      // Check if the player tapped on a collectible (BEFORE portal check
      // so items near the portal plot can still be picked up)
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

      // Check if tapped the portal plot (for building)
      if (this.portalPlotChosen && this.portalSprite && this.portalManager && !this.portalManager.isComplete()) {
        const distToPortal = Phaser.Math.Distance.Between(worldX, worldY, this.portalPlotPosition.x, this.portalPlotPosition.y);
        if (distToPortal < 100) {
          const distPlayer = Phaser.Math.Distance.Between(
            this.player.x, this.player.y, this.portalPlotPosition.x, this.portalPlotPosition.y
          );
          if (distPlayer <= INTERACTION_RANGE) {
            this.openPortalMenu();
          } else {
            this.pendingPortalTarget = true;
            this.player.moveTo(this.portalPlotPosition.x, this.portalPlotPosition.y);
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
      for (const p of this.ambientParticles) {
        if (p && p.active) p.destroy();
      }
      this.ambientParticles = [];
      for (const p of this.portalSparkles) {
        if (p && p.active) p.destroy();
      }
      this.portalSparkles = [];
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
    this.waterShimmerTimer += delta;
    if (this.waterShimmerTimer > 50 && this.waterTiles.length > 0) {
      this.waterShimmerTimer = 0;
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

    // ─── Portal swirl animation (when complete) ───
    if (this.portalManager && this.portalManager.isComplete() && this.portalSprite) {
      this.portalSwirlTimer += delta;
      if (this.portalSwirlTimer > 200) {
        this.portalSwirlTimer = 0;
        this.portalSwirlFrame = (this.portalSwirlFrame + 1) % 3;
        const textures = ['portal-stage-3', 'portal-active-1', 'portal-active-2'];
        this.portalSprite.setTexture(textures[this.portalSwirlFrame]);
      }

      // Portal sparkles
      this.portalSparkleTimer += delta;
      if (this.portalSparkleTimer > 400) {
        this.portalSparkleTimer = 0;
        this.spawnPortalSparkle();
      }

      // Check if player walks into completed portal
      const distToPortal = Phaser.Math.Distance.Between(
        this.player.x, this.player.y, this.portalPlotPosition.x, this.portalPlotPosition.y
      );
      if (distToPortal <= PORTAL_ACTIVATION_RANGE) {
        this.enterPortal();
      }
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

    // Check pending portal target
    if (this.pendingPortalTarget && this.portalPlotPosition) {
      const dist = Phaser.Math.Distance.Between(
        this.player.x, this.player.y, this.portalPlotPosition.x, this.portalPlotPosition.y
      );
      if (dist <= INTERACTION_RANGE) {
        this.pendingPortalTarget = false;
        this.player.target = null;
        this.player.body.setVelocity(0, 0);
        this.openPortalMenu();
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
    this.inventory.consumeSelected();

    this.tamingManager.initAnimal(animal.animalId, animal.config.requiredFeedings);

    animal.enterFeeding(1500);

    this.player.target = null;
    this.player.body.setVelocity(0, 0);

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

    this.spawnHeartParticle(animal.x, animal.y - 20);

    const result = this.tamingManager.feed(animal.animalId);
    const progress = this.tamingManager.getProgress(animal.animalId);

    EventBus.emit('taming-progress', {
      animalId: animal.animalId,
      worldX: animal.x,
      worldY: animal.y,
      current: progress.current,
      max: progress.max,
    });

    if (result === 'tamed') {
      this.time.delayedCall(1500, () => {
        this.tameAnimal(animal);
      });
    }
  }

  tameAnimal(animal) {
    const index = this.tamedCount;
    this.tamedCount++;

    animal.setTamed(index);

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
    // Don't spawn on top of the portal plot
    if (this.portalPlotPosition) {
      const dist = Phaser.Math.Distance.Between(x, y, this.portalPlotPosition.x, this.portalPlotPosition.y);
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

    const offsetX = (Math.random() - 0.5) * 60;
    const offsetY = 20 + Math.random() * 20;
    const dropX = this.player.x + offsetX;
    const dropY = this.player.y + offsetY;

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

  placePortalPlot(clearing) {
    this.portalPlotChosen = true;
    this.portalPlotPosition = { x: clearing.cx, y: clearing.cy };

    this.portalScale = 3.5;

    this.portalSprite = this.add.image(clearing.cx, clearing.cy, 'portal-stage-0');
    this.portalSprite.setDepth(clearing.cy - 24);

    this.portalSprite.setScale(0);
    this.tweens.add({
      targets: this.portalSprite,
      scaleX: this.portalScale,
      scaleY: this.portalScale,
      duration: 400,
      ease: 'Back.easeOut',
    });

    // Remove any collectibles overlapping the portal plot
    for (const item of this.collectiblesGroup.getChildren()) {
      if (!item.active) continue;
      const dist = Phaser.Math.Distance.Between(clearing.cx, clearing.cy, item.x, item.y);
      if (dist < 90) {
        item.destroy();
      }
    }

    // Create building manager now that we know the position
    this.portalManager = new BuildingManager(this, clearing.cx, clearing.cy);
    this.portalManager.portalSprite = this.portalSprite;
  }

  // ─── Portal Building ───

  openPortalMenu() {
    if (!this.portalManager || this.portalManager.isComplete()) return;

    const next = this.portalManager.getNextStageCost();
    if (!next) return;

    const materials = {};
    for (const [itemType, needed] of Object.entries(next.cost)) {
      materials[itemType] = { have: this.inventory.countOf(itemType), need: needed };
    }

    const canBuild = this.portalManager.canBuild(this.inventory);

    EventBus.emit('show-build-menu', {
      stageName: next.name,
      stageNumber: this.portalManager.stage + 1,
      totalStages: PORTAL_STAGES.length,
      materials,
      canBuild,
    });
  }

  executePortalBuild() {
    if (!this.portalManager || this.portalManager.isComplete()) return;
    if (!this.portalManager.canBuild(this.inventory)) return;

    const newStage = this.portalManager.build(this.inventory);
    if (newStage === -1) return;

    // Bounce tween on portal sprite
    const s = this.portalScale || 3.5;
    this.tweens.add({
      targets: this.portalSprite,
      scaleX: s * 1.15,
      scaleY: s * 1.15,
      duration: 150,
      yoyo: true,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.portalSprite.setScale(s);
      },
    });

    this.portalSprite.setDepth(this.portalPlotPosition.y - 24);

    // Star/sparkle particles
    this.spawnBuildParticles(this.portalPlotPosition.x, this.portalPlotPosition.y);

    if (this.game.audioManager) {
      if (this.portalManager.isComplete()) {
        this.game.audioManager.playPortalActivate();
      } else {
        this.game.audioManager.playBuild();
      }
    }

    // Extra celebration for final stage (portal activation)
    if (this.portalManager.isComplete()) {
      this.time.delayedCall(200, () => {
        this.spawnBuildParticles(this.portalPlotPosition.x, this.portalPlotPosition.y, true);
      });
    }

    EventBus.emit('close-build-menu');
  }

  // ─── Portal enter (Phase 8 placeholder) ───

  enterPortal() {
    // Prevent re-entry
    if (this._portalEntered) return;
    this._portalEntered = true;

    // Stop player
    this.player.target = null;
    this.player.body.setVelocity(0, 0);

    if (this.game.audioManager) {
      this.game.audioManager.playPortalEnter();
    }

    // Big celebration burst
    this.spawnBuildParticles(this.portalPlotPosition.x, this.portalPlotPosition.y, true);
    this.time.delayedCall(300, () => {
      this.spawnBuildParticles(this.portalPlotPosition.x, this.portalPlotPosition.y, true);
    });

    // TODO Phase 9: fade camera, serialize tamed animals, switch biome, restart scene
  }

  // ─── Portal sparkles (around completed portal) ───

  spawnPortalSparkle() {
    this.portalSparkles = this.portalSparkles.filter(p => p && p.active);
    if (this.portalSparkles.length >= 6) return;
    if (!this.portalPlotPosition) return;

    const angle = Math.random() * Math.PI * 2;
    const radius = 30 + Math.random() * 40;
    const x = this.portalPlotPosition.x + Math.cos(angle) * radius;
    const y = this.portalPlotPosition.y + Math.sin(angle) * radius;

    const sparkle = this.add.image(x, y, 'particle-sparkle');
    sparkle.setDepth(10000);
    sparkle.setScale(0.4 + Math.random() * 0.3);
    sparkle.setAlpha(0.7);
    sparkle.setTint(0xBB66FF); // purple tint

    this.portalSparkles.push(sparkle);

    this.tweens.add({
      targets: sparkle,
      y: sparkle.y - 25,
      alpha: 0,
      scaleX: 0.1,
      scaleY: 0.1,
      duration: 600 + Math.random() * 400,
      ease: 'Power2',
      onComplete: () => sparkle.destroy(),
    });
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
    this.ambientParticles = this.ambientParticles.filter(p => p && p.active);
    if (this.ambientParticles.length >= 4) return;

    const cam = this.cameras.main;
    const startX = cam.scrollX + 1024 + 20;
    const startY = cam.scrollY + 100 + Math.random() * 500;
    const endX = cam.scrollX - 40;
    const endY = startY + (Math.random() - 0.3) * 200;

    const tex = Math.random() > 0.5 ? 'particle-sparkle' : 'particle-star';
    const particle = this.add.image(startX, startY, tex);
    particle.setDepth(9000);
    particle.setAlpha(0.6);
    particle.setScale(0.5 + Math.random() * 0.4);
    if (Math.random() > 0.5) {
      particle.setTint(0x88CC44);
    } else {
      particle.setTint(Phaser.Display.Color.GetColor(
        200 + Math.floor(Math.random() * 55),
        100 + Math.floor(Math.random() * 100),
        180 + Math.floor(Math.random() * 75)
      ));
    }

    this.ambientParticles.push(particle);

    const phaseOffset = Math.random() * Math.PI * 2;

    this.tweens.add({
      targets: particle,
      x: endX,
      y: endY,
      alpha: 0,
      duration: 6000 + Math.random() * 3000,
      ease: 'Sine.easeInOut',
      onUpdate: (tween) => {
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
