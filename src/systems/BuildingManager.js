import { PORTAL_STAGES } from '../config.js';
import EventBus from '../utils/EventBus.js';

export default class BuildingManager {
  constructor(scene, plotX, plotY) {
    this.scene = scene;
    this.stage = 0; // 0=empty, 1=magic circle, 2=base+arch, 3=runes+active (complete)
    this.x = plotX;
    this.y = plotY;
    this.portalSprite = null;
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
    if (this.stage >= PORTAL_STAGES.length) return null;
    return PORTAL_STAGES[this.stage];
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
    return this.stage >= PORTAL_STAGES.length;
  }
}
