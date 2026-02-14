import SpriteFactory from '../systems/SpriteFactory.js';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create() {
    // Show loading text
    const text = this.add.text(512, 384, 'Loading...', {
      fontSize: '32px',
      color: '#FFFFFF',
      fontFamily: 'Arial, sans-serif',
    }).setOrigin(0.5);

    // Generate all textures
    const factory = new SpriteFactory(this);
    factory.generateAll();

    // Brief delay so "Loading..." is visible, then move on
    this.time.delayedCall(200, () => {
      this.scene.start('TitleScene');
    });
  }
}
