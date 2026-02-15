import EventBus from '../utils/EventBus.js';

export default class BuildingManager {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} plotX
   * @param {number} plotY
   * @param {Array} portalStages — array of { name, cost } from the biome config
   */
  constructor(scene, plotX, plotY, portalStages) {
    this.scene = scene;
    this.stage = 0;
    this.x = plotX;
    this.y = plotY;
    this.portalSprite = null;
    this.portalStages = portalStages;
  }

  canBuild(inventory) {
    const next = this.getNextStageCost();
    if (!next) return false;

    for (const [itemType, count] of Object.entries(next.cost)) {
      if (inventory.countOf(itemType) < count) return false;
    }
    return true;
  }

  getNextStageCost() {
    if (this.stage >= this.portalStages.length) return null;
    return this.portalStages[this.stage];
  }

  build(inventory) {
    const next = this.getNextStageCost();
    if (!next) return -1;

    for (const [itemType, count] of Object.entries(next.cost)) {
      const removed = inventory.removeByType(itemType, count);
      if (!removed) return -1;
    }

    this.stage++;

    if (this.portalSprite) {
      this.portalSprite.setTexture(`portal-stage-${this.stage}`);
    }

    EventBus.emit('portal-stage-changed', {
      stage: this.stage,
      complete: this.isComplete(),
    });

    return this.stage;
  }

  isComplete() {
    return this.stage >= this.portalStages.length;
  }
}
