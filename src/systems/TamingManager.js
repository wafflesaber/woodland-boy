import EventBus from '../utils/EventBus.js';

export default class TamingManager {
  constructor() {
    // animalId → { current: number, max: number }
    this.progress = new Map();
    this.tamedSet = new Set();
  }

  /**
   * Initialize tracking for an animal on first feeding attempt.
   */
  initAnimal(animalId, requiredFeedings) {
    if (!this.progress.has(animalId)) {
      this.progress.set(animalId, { current: 0, max: requiredFeedings });
    }
  }

  /**
   * Increment feeding progress for an animal.
   * @returns {'progress' | 'tamed'}
   */
  feed(animalId) {
    const p = this.progress.get(animalId);
    if (!p) return 'progress';

    p.current = Math.min(p.current + 1, p.max);

    if (p.current >= p.max) {
      this.tamedSet.add(animalId);
      return 'tamed';
    }
    return 'progress';
  }

  /**
   * Get current feeding progress for an animal.
   */
  getProgress(animalId) {
    return this.progress.get(animalId) || null;
  }

  /**
   * Check if an animal is fully tamed.
   */
  isTamed(animalId) {
    return this.tamedSet.has(animalId);
  }
}
