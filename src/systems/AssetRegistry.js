import SpriteFactory from './SpriteFactory.js';

/**
 * AssetRegistry — tracks which texture keys were loaded from assets
 * vs which need procedural fallback via SpriteFactory.
 *
 * Usage:
 *   registry.markLoaded('animal-bear-1');
 *   registry.fillMissing(scene);  // generates anything not loaded
 */
export default class AssetRegistry {
  constructor() {
    this.loaded = new Set();
  }

  markLoaded(key) {
    this.loaded.add(key);
  }

  isLoaded(key) {
    return this.loaded.has(key);
  }

  /**
   * After asset loading, generate procedural textures for anything missing.
   */
  fillMissing(scene) {
    const factory = new SpriteFactory(scene);
    const before = scene.textures.getTextureKeys().length;

    // Generate everything procedurally — SpriteFactory uses addCanvas,
    // which only creates textures if the key doesn't already exist
    // (Phaser warns but doesn't overwrite). We suppress those warnings
    // by checking first.
    const origAddCanvas = scene.textures.addCanvas.bind(scene.textures);
    scene.textures.addCanvas = (key, canvas) => {
      if (this.loaded.has(key) || scene.textures.exists(key)) {
        return; // already loaded from asset — skip
      }
      origAddCanvas(key, canvas);
    };

    factory.generateAll();

    // Restore original method
    scene.textures.addCanvas = origAddCanvas;

    const after = scene.textures.getTextureKeys().length;
    const generated = after - before;
    if (generated > 0) {
      console.log(`AssetRegistry: generated ${generated} fallback textures`);
    }
  }
}
