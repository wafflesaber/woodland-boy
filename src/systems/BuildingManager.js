import { BUILDING_STAGES } from '../config.js';
import EventBus from '../utils/EventBus.js';

export default class BuildingManager {
  constructor(scene, housePlotX, housePlotY) {
    this.scene = scene;
    this.stage = 0; // 0=empty, 1=floor, 2=walls, 3=roof, 4=door, 5=window/complete
    this.x = housePlotX;
    this.y = housePlotY;
    this.houseSprite = null;
  }

  /**
   * Check whether the inventory has enough materials for the next stage.
   * @param {InventoryManager} inventory
   * @returns {boolean}
   */
  canBuild(inventory) {
    const next = this.getNextStageCost();
    if (!next) return false;

    for (const [itemType, count] of Object.entries(next.cost)) {
      if (inventory.countOf(itemType) < count) return false;
    }
    return true;
  }

  /**
   * Return the name + cost of the next stage, or null if house is complete.
   */
  getNextStageCost() {
    if (this.stage >= BUILDING_STAGES.length) return null;
    return BUILDING_STAGES[this.stage];
  }

  /**
   * Consume materials from inventory, advance stage, update sprite.
   * @param {InventoryManager} inventory
   * @returns {number} the new stage number, or -1 if build failed
   */
  build(inventory) {
    const next = this.getNextStageCost();
    if (!next) return -1;

    // Consume materials
    for (const [itemType, count] of Object.entries(next.cost)) {
      const removed = inventory.removeByType(itemType, count);
      if (!removed) return -1; // shouldn't happen if canBuild was checked
    }

    this.stage++;

    // Update house sprite texture
    if (this.houseSprite) {
      this.houseSprite.setTexture(`house-stage-${this.stage}`);
    }

    EventBus.emit('building-stage-changed', {
      stage: this.stage,
      complete: this.isComplete(),
    });

    return this.stage;
  }

  /**
   * Is the house fully built?
   */
  isComplete() {
    return this.stage >= BUILDING_STAGES.length;
  }
}
