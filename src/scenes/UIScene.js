import { INVENTORY_SIZE } from '../config.js';
import EventBus from '../utils/EventBus.js';

export default class UIScene extends Phaser.Scene {
  constructor() {
    super('UIScene');
  }

  create() {
    // ─── Inventory Bar ───

    const SLOT_SIZE = 40;
    const SLOT_GAP = 6;
    const SLOT_COUNT = INVENTORY_SIZE;
    const barWidth = SLOT_COUNT * SLOT_SIZE + (SLOT_COUNT - 1) * SLOT_GAP;
    const barX = (1024 - barWidth) / 2;
    const barY = 710;

    this.barBg = this.add.rectangle(
      512, barY + SLOT_SIZE / 2,
      barWidth + 24, SLOT_SIZE + 16,
      0x000000, 0.35
    );
    this.barBg.setOrigin(0.5, 0.5);
    this.barBg.setScrollFactor(0);
    this.barBg.setDepth(0);

    this.slotSprites = [];
    this.itemSprites = [];
    this.highlight = null;

    for (let i = 0; i < SLOT_COUNT; i++) {
      const sx = barX + i * (SLOT_SIZE + SLOT_GAP) + SLOT_SIZE / 2;
      const sy = barY + SLOT_SIZE / 2;

      const slot = this.add.image(sx, sy, 'ui-slot').setDepth(1);
      slot.setScrollFactor(0);
      slot.setInteractive(
        new Phaser.Geom.Rectangle(0, 0, SLOT_SIZE, SLOT_SIZE),
        Phaser.Geom.Rectangle.Contains
      );
      slot.on('pointerup', () => {
        EventBus.emit('ui-slot-tap', i);
      });
      this.slotSprites.push(slot);

      this.itemSprites.push(null);
    }

    const initX = barX + SLOT_SIZE / 2;
    const initY = barY + SLOT_SIZE / 2;
    this.highlight = this.add.image(initX, initY, 'ui-select').setDepth(2);
    this.highlight.setScrollFactor(0);

    // ─── Heart meters ───
    // Map of animalId → { sprites: Image[], current, max, lastFeedTime, worldX, worldY }
    this.heartMeters = new Map();

    // ─── Thought bubbles ───
    // Map of animalId → { container, timer }
    this.thoughtBubbles = new Map();

    // ─── Build menu ───
    this.buildMenuVisible = false;
    this.buildMenuElements = [];

    // ─── EventBus Listeners ───

    EventBus.on('inventory-changed', this.onInventoryChanged, this);
    EventBus.on('slot-selected', this.onSlotSelected, this);

    this.lastSlotTap = { index: -1, time: 0 };

    EventBus.on('ui-slot-tap', (index) => {
      const now = Date.now();
      const DOUBLE_TAP_MAX = 400; // max gap between taps
      const DOUBLE_TAP_MIN = 80;  // min gap — filters out touch-bounce duplicates

      const elapsed = now - this.lastSlotTap.time;
      if (this.lastSlotTap.index === index && elapsed >= DOUBLE_TAP_MIN && elapsed < DOUBLE_TAP_MAX) {
        // Double-tap: drop the item
        EventBus.emit('drop-item', index);
        this.lastSlotTap = { index: -1, time: 0 };
        return;
      }

      // Single tap: select slot
      this.lastSlotTap = { index, time: now };
      EventBus.emit('select-slot', index);

      // Play select sound
      if (this.game.audioManager) {
        this.game.audioManager.playSelect();
      }
    });

    EventBus.on('taming-progress', this.onTamingProgress, this);
    EventBus.on('show-thought-bubble', this.onShowThoughtBubble, this);
    EventBus.on('animal-tamed', this.onAnimalTamed, this);
    EventBus.on('show-build-menu', this.onShowBuildMenu, this);
    EventBus.on('close-build-menu', this.onCloseBuildMenu, this);

    // Store layout info
    this.barX = barX;
    this.barY = barY;
    this.SLOT_SIZE = SLOT_SIZE;
    this.SLOT_GAP = SLOT_GAP;

    this.events.on('shutdown', () => {
      EventBus.off('inventory-changed', this.onInventoryChanged, this);
      EventBus.off('slot-selected', this.onSlotSelected, this);
      EventBus.off('taming-progress', this.onTamingProgress, this);
      EventBus.off('show-thought-bubble', this.onShowThoughtBubble, this);
      EventBus.off('animal-tamed', this.onAnimalTamed, this);
      EventBus.off('show-build-menu', this.onShowBuildMenu, this);
      EventBus.off('close-build-menu', this.onCloseBuildMenu, this);
    });
  }

  update(time, delta) {
    // Update heart meter positions (world → screen coords)
    const gameScene = this.scene.get('GameScene');
    if (!gameScene || !gameScene.cameras || !gameScene.cameras.main) return;

    const cam = gameScene.cameras.main;

    // Update heart meters
    for (const [animalId, meter] of this.heartMeters) {
      // Find the animal in GameScene to get current position
      const animal = this.findAnimal(gameScene, animalId);
      if (!animal || !animal.active) {
        this.removeHeartMeter(animalId);
        continue;
      }

      // Convert world position to screen position
      const screenX = animal.x - cam.scrollX;
      const screenY = animal.y - cam.scrollY - 35;

      // Position hearts centered above animal
      const heartSpacing = 22;
      const totalWidth = (meter.max - 1) * heartSpacing;
      const startX = screenX - totalWidth / 2;

      for (let i = 0; i < meter.sprites.length; i++) {
        meter.sprites[i].setPosition(startX + i * heartSpacing, screenY);
        meter.sprites[i].setVisible(true);
      }

      // Keep hearts visible while taming is in progress (current < max).
      // Only fade out once fully tamed (handled by onAnimalTamed) or
      // if somehow no longer relevant.
      if (meter.current >= meter.max) {
        const elapsed = time - meter.lastFeedTime;
        if (elapsed > 3000) {
          const fadeAlpha = Math.max(0, 1 - (elapsed - 3000) / 1000);
          for (const sprite of meter.sprites) {
            sprite.setAlpha(fadeAlpha);
          }
          if (fadeAlpha <= 0) {
            this.removeHeartMeter(animalId);
          }
        }
      }
    }

    // Update thought bubble positions
    for (const [animalId, bubble] of this.thoughtBubbles) {
      let screenX, screenY;

      if (bubble.fixedWorldX !== undefined) {
        // Pinned bubble — stays at the world position where it was spawned
        screenX = bubble.fixedWorldX - cam.scrollX;
        screenY = bubble.fixedWorldY - cam.scrollY;
      } else {
        // Tracking bubble — follows the animal
        const animal = this.findAnimal(gameScene, animalId);
        if (!animal || !animal.active) {
          this.removeThoughtBubble(animalId);
          continue;
        }
        screenX = animal.x - cam.scrollX;
        screenY = animal.y - cam.scrollY - 45;
      }

      bubble.bg.setPosition(screenX, screenY);
      bubble.icon.setPosition(screenX, screenY + 1);
    }
  }

  // ─── Heart meters ───

  onTamingProgress(data) {
    const { animalId, worldX, worldY, current, max } = data;

    // Remove existing meter to rebuild
    this.removeHeartMeter(animalId);

    const sprites = [];
    for (let i = 0; i < max; i++) {
      const tex = i < current ? 'heart-full' : 'heart-empty';
      const heart = this.add.image(0, 0, tex);
      heart.setDepth(100);
      heart.setScrollFactor(0);
      heart.setVisible(false);
      sprites.push(heart);
    }

    this.heartMeters.set(animalId, {
      sprites,
      current,
      max,
      lastFeedTime: this.time.now,
      worldX,
      worldY,
    });
  }

  removeHeartMeter(animalId) {
    const meter = this.heartMeters.get(animalId);
    if (meter) {
      for (const sprite of meter.sprites) {
        sprite.destroy();
      }
      this.heartMeters.delete(animalId);
    }
  }

  onAnimalTamed(data) {
    // Remove heart meter when animal is tamed
    this.removeHeartMeter(data.animalId);
    this.removeThoughtBubble(data.animalId);
  }

  // ─── Thought bubbles ───

  onShowThoughtBubble(data) {
    const { animalId, worldX, worldY, itemTexture, pinned } = data;

    // Remove existing bubble for this animal
    this.removeThoughtBubble(animalId);

    // Create bubble background
    const bg = this.add.image(0, 0, 'thought-bubble');
    bg.setDepth(101);
    bg.setScrollFactor(0);

    // Create item icon inside the bubble
    const icon = this.add.image(0, 0, itemTexture);
    icon.setDepth(102);
    icon.setScrollFactor(0);
    icon.setScale(0.8);

    // Fade in
    bg.setAlpha(0);
    icon.setAlpha(0);

    this.tweens.add({
      targets: [bg, icon],
      alpha: 1,
      duration: 200,
      ease: 'Power2',
    });

    // Auto-remove after 3 seconds (long enough for a kid to see it)
    const timer = this.time.delayedCall(3000, () => {
      this.tweens.add({
        targets: [bg, icon],
        alpha: 0,
        duration: 300,
        ease: 'Power2',
        onComplete: () => {
          this.removeThoughtBubble(animalId);
        },
      });
    });

    const entry = { bg, icon, timer };

    // If pinned, store the world position so the bubble doesn't
    // chase a fleeing animal offscreen
    if (pinned) {
      entry.fixedWorldX = worldX;
      entry.fixedWorldY = worldY;
    }

    this.thoughtBubbles.set(animalId, entry);
  }

  removeThoughtBubble(animalId) {
    const bubble = this.thoughtBubbles.get(animalId);
    if (bubble) {
      if (bubble.timer) bubble.timer.remove(false);
      bubble.bg.destroy();
      bubble.icon.destroy();
      this.thoughtBubbles.delete(animalId);
    }
  }

  // ─── Helper ───

  findAnimal(gameScene, animalId) {
    if (!gameScene.animals) return null;
    return gameScene.animals.find(a => a.active && a.animalId === animalId);
  }

  // ─── Inventory ───

  onInventoryChanged(slots) {
    for (let i = 0; i < INVENTORY_SIZE; i++) {
      if (this.itemSprites[i]) {
        this.itemSprites[i].destroy();
        this.itemSprites[i] = null;
      }

      if (slots[i]) {
        const sx = this.barX + i * (this.SLOT_SIZE + this.SLOT_GAP) + this.SLOT_SIZE / 2;
        const sy = this.barY + this.SLOT_SIZE / 2;
        const icon = this.add.image(sx, sy, `item-${slots[i]}`).setDepth(3);
        icon.setScrollFactor(0);

        icon.setScale(0.5);
        this.tweens.add({
          targets: icon,
          scaleX: 1,
          scaleY: 1,
          duration: 200,
          ease: 'Back.easeOut',
        });

        this.itemSprites[i] = icon;
      }
    }
  }

  onSlotSelected(index) {
    const sx = this.barX + index * (this.SLOT_SIZE + this.SLOT_GAP) + this.SLOT_SIZE / 2;
    const sy = this.barY + this.SLOT_SIZE / 2;
    this.highlight.setPosition(sx, sy);
  }

  // ─── Build menu ───

  onShowBuildMenu(data) {
    // Remove any existing menu first
    this.destroyBuildMenu();

    this.buildMenuVisible = true;
    const { stageName, stageNumber, totalStages, materials, canBuild } = data;

    const cx = 512;
    const cy = 340;
    const panelW = 280;
    const panelH = 220;

    // Dim overlay (tap to close)
    const overlay = this.add.rectangle(512, 384, 1024, 768, 0x000000, 0.4);
    overlay.setDepth(200);
    overlay.setScrollFactor(0);
    overlay.setInteractive();
    overlay.on('pointerdown', () => this.onCloseBuildMenu());
    this.buildMenuElements.push(overlay);

    // Panel background
    const panel = this.add.rectangle(cx, cy, panelW, panelH, 0x2a1a0e, 0.92);
    panel.setDepth(201);
    panel.setScrollFactor(0);
    panel.setStrokeStyle(3, 0x8B6914);
    this.buildMenuElements.push(panel);

    // Title: "Build: Floor (1/5)"
    const title = this.add.text(cx, cy - panelH / 2 + 22, `Build: ${stageName}`, {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#FFD700',
      align: 'center',
    });
    title.setOrigin(0.5, 0.5);
    title.setDepth(202);
    title.setScrollFactor(0);
    this.buildMenuElements.push(title);

    // Stage progress text
    const progress = this.add.text(cx, cy - panelH / 2 + 44, `Stage ${stageNumber} of ${totalStages}`, {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#BBBBBB',
      align: 'center',
    });
    progress.setOrigin(0.5, 0.5);
    progress.setDepth(202);
    progress.setScrollFactor(0);
    this.buildMenuElements.push(progress);

    // Material rows
    const materialEntries = Object.entries(materials);
    const rowStartY = cy - 20;
    const rowSpacing = 36;

    for (let i = 0; i < materialEntries.length; i++) {
      const [itemType, { have, need }] = materialEntries[i];
      const rowY = rowStartY + i * rowSpacing;

      // Item icon
      const icon = this.add.image(cx - 80, rowY, `item-${itemType}`);
      icon.setDepth(202);
      icon.setScrollFactor(0);
      this.buildMenuElements.push(icon);

      // Item name
      const nameLabel = this.add.text(cx - 50, rowY, itemType.charAt(0).toUpperCase() + itemType.slice(1), {
        fontSize: '14px',
        fontFamily: 'monospace',
        color: '#FFFFFF',
      });
      nameLabel.setOrigin(0, 0.5);
      nameLabel.setDepth(202);
      nameLabel.setScrollFactor(0);
      this.buildMenuElements.push(nameLabel);

      // Count: "have / need" — green if enough, red if not
      const enough = have >= need;
      const countText = this.add.text(cx + 80, rowY, `${have} / ${need}`, {
        fontSize: '14px',
        fontFamily: 'monospace',
        color: enough ? '#4CAF50' : '#FF6B6B',
        align: 'right',
      });
      countText.setOrigin(0.5, 0.5);
      countText.setDepth(202);
      countText.setScrollFactor(0);
      this.buildMenuElements.push(countText);
    }

    // Build button
    const btnY = cy + panelH / 2 - 34;
    const btnTex = canBuild ? 'ui-build-btn' : 'ui-build-btn-off';

    const btn = this.add.image(cx, btnY, btnTex);
    btn.setDepth(202);
    btn.setScrollFactor(0);
    this.buildMenuElements.push(btn);

    const btnLabel = this.add.text(cx, btnY, canBuild ? 'Build!' : 'Need more', {
      fontSize: '13px',
      fontFamily: 'monospace',
      color: '#FFFFFF',
      align: 'center',
    });
    btnLabel.setOrigin(0.5, 0.5);
    btnLabel.setDepth(203);
    btnLabel.setScrollFactor(0);
    this.buildMenuElements.push(btnLabel);

    if (canBuild) {
      btn.setInteractive(
        new Phaser.Geom.Rectangle(-24, -8, 48 + 48, 16 + 16),
        Phaser.Geom.Rectangle.Contains
      );
      btn.on('pointerdown', () => {
        EventBus.emit('do-build');
      });
    }

    // Animate in
    for (const el of this.buildMenuElements) {
      if (el !== overlay) {
        el.setAlpha(0);
        this.tweens.add({
          targets: el,
          alpha: el === panel ? 0.92 : 1,
          duration: 150,
          ease: 'Power2',
        });
      }
    }
  }

  onCloseBuildMenu() {
    if (!this.buildMenuVisible) return;
    this.destroyBuildMenu();
  }

  destroyBuildMenu() {
    for (const el of this.buildMenuElements) {
      el.destroy();
    }
    this.buildMenuElements = [];
    this.buildMenuVisible = false;
  }
}
