export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create() {
    // Show loading text briefly, then hand off to PreloadScene
    // which loads external assets and fills gaps with SpriteFactory
    this.add.text(512, 384, 'Loading...', {
      fontSize: '32px',
      color: '#FFFFFF',
      fontFamily: 'Arial, sans-serif',
    }).setOrigin(0.5);

    this.time.delayedCall(100, () => {
      this.scene.start('PreloadScene');
    });
  }
}
