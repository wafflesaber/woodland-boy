import { INVENTORY_SIZE } from '../config.js';
import EventBus from '../utils/EventBus.js';

export default class UIScene extends Phaser.Scene {
  constructor() {
    super('UIScene');
  }

  create() {
    // ─── Inventory Bar ───

    const SLOT_SIZE = 40;   // ui-slot texture is 40x40
    const SLOT_GAP = 6;
    const SLOT_COUNT = INVENTORY_SIZE;
    const barWidth = SLOT_COUNT * SLOT_SIZE + (SLOT_COUNT - 1) * SLOT_GAP;
    const barX = (1024 - barWidth) / 2; // centered horizontally
    const barY = 710;

    // Semi-transparent background strip behind the bar
    this.barBg = this.add.rectangle(
      512, barY + SLOT_SIZE / 2,
      barWidth + 24, SLOT_SIZE + 16,
      0x000000, 0.35
    );
    this.barBg.setOrigin(0.5, 0.5);
    this.barBg.setScrollFactor(0);
    this.barBg.setDepth(0);

    this.slotSprites = [];   // slot background images
    this.itemSprites = [];   // item icons inside slots
    this.highlight = null;

    for (let i = 0; i < SLOT_COUNT; i++) {
      const sx = barX + i * (SLOT_SIZE + SLOT_GAP) + SLOT_SIZE / 2;
      const sy = barY + SLOT_SIZE / 2;

      // Slot background
      const slot = this.add.image(sx, sy, 'ui-slot').setDepth(1);
      slot.setScrollFactor(0);
      slot.setInteractive(
        new Phaser.Geom.Rectangle(0, 0, SLOT_SIZE, SLOT_SIZE),
        Phaser.Geom.Rectangle.Contains
      );
      slot.on('pointerdown', () => {
        EventBus.emit('ui-slot-tap', i);
      });
      this.slotSprites.push(slot);

      // Placeholder for item icon (created on demand)
      this.itemSprites.push(null);
    }

    // Selection highlight
    const initX = barX + SLOT_SIZE / 2;
    const initY = barY + SLOT_SIZE / 2;
    this.highlight = this.add.image(initX, initY, 'ui-select').setDepth(2);
    this.highlight.setScrollFactor(0);

    // ─── EventBus Listeners ───

    EventBus.on('inventory-changed', this.onInventoryChanged, this);
    EventBus.on('slot-selected', this.onSlotSelected, this);

    // When a slot is tapped, tell the InventoryManager (via GameScene)
    EventBus.on('ui-slot-tap', (index) => {
      // GameScene's InventoryManager will handle the selection
      EventBus.emit('select-slot', index);
    });

    // Store layout info for use in handlers
    this.barX = barX;
    this.barY = barY;
    this.SLOT_SIZE = SLOT_SIZE;
    this.SLOT_GAP = SLOT_GAP;

    // Clean up listeners when scene shuts down
    this.events.on('shutdown', () => {
      EventBus.off('inventory-changed', this.onInventoryChanged, this);
      EventBus.off('slot-selected', this.onSlotSelected, this);
    });
  }

  /**
   * Redraw slot contents when inventory changes.
   * @param {Array<string|null>} slots
   */
  onInventoryChanged(slots) {
    for (let i = 0; i < INVENTORY_SIZE; i++) {
      // Destroy old icon if any
      if (this.itemSprites[i]) {
        this.itemSprites[i].destroy();
        this.itemSprites[i] = null;
      }

      if (slots[i]) {
        const sx = this.barX + i * (this.SLOT_SIZE + this.SLOT_GAP) + this.SLOT_SIZE / 2;
        const sy = this.barY + this.SLOT_SIZE / 2;
        const icon = this.add.image(sx, sy, `item-${slots[i]}`).setDepth(3);
        icon.setScrollFactor(0);

        // Brief bounce tween on newly added item
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

  /**
   * Move the highlight to the selected slot.
   * @param {number} index
   */
  onSlotSelected(index) {
    const sx = this.barX + index * (this.SLOT_SIZE + this.SLOT_GAP) + this.SLOT_SIZE / 2;
    const sy = this.barY + this.SLOT_SIZE / 2;
    this.highlight.setPosition(sx, sy);
  }
}
