import { INVENTORY_SIZE } from '../config.js';
import EventBus from '../utils/EventBus.js';

export default class InventoryManager {
  constructor() {
    this.slots = new Array(INVENTORY_SIZE).fill(null);
    this.selectedIndex = 0;
  }

  /**
   * Add an item to the first empty slot.
   * @param {string} itemType — e.g. 'berries', 'fish', 'planks'
   * @returns {boolean} true if added, false if inventory full
   */
  add(itemType) {
    const emptyIdx = this.slots.indexOf(null);
    if (emptyIdx === -1) return false;
    this.slots[emptyIdx] = itemType;
    EventBus.emit('inventory-changed', [...this.slots]);
    return true;
  }

  /**
   * Remove the item at a given index.
   */
  remove(index) {
    if (index < 0 || index >= INVENTORY_SIZE) return;
    this.slots[index] = null;
    EventBus.emit('inventory-changed', [...this.slots]);
  }

  /**
   * Get the item type currently selected (may be null).
   */
  getSelected() {
    return this.slots[this.selectedIndex];
  }

  /**
   * Consume (remove) the currently selected item.
   */
  consumeSelected() {
    this.remove(this.selectedIndex);
  }

  /**
   * Select a slot by index.
   */
  selectSlot(index) {
    if (index < 0 || index >= INVENTORY_SIZE) return;
    this.selectedIndex = index;
    EventBus.emit('slot-selected', index);
  }

  /**
   * Is every slot occupied?
   */
  isFull() {
    return this.slots.every(s => s !== null);
  }

  /**
   * Count how many of a given item type are in inventory.
   */
  countOf(itemType) {
    return this.slots.filter(s => s === itemType).length;
  }

  /**
   * Remove N items of a specific type (for building).
   * @returns {boolean} true if enough were found and removed
   */
  removeByType(itemType, count) {
    let remaining = count;
    for (let i = 0; i < INVENTORY_SIZE && remaining > 0; i++) {
      if (this.slots[i] === itemType) {
        this.slots[i] = null;
        remaining--;
      }
    }
    if (remaining > 0) {
      // Should not happen if caller checked first — but be safe
      return false;
    }
    EventBus.emit('inventory-changed', [...this.slots]);
    return true;
  }
}
