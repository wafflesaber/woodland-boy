export default class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
  }

  create() {
    // Sky background
    this.cameras.main.setBackgroundColor('#87CEEB');

    // Simple grass strip at bottom
    const grassBar = this.add.rectangle(512, 720, 1024, 96, 0x228B22);

    // Game title
    this.titleText = this.add.text(512, 280, 'Woodland Boy', {
      fontSize: '72px',
      color: '#FFFFFF',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      stroke: '#2E8B57',
      strokeThickness: 8,
    }).setOrigin(0.5);

    // Gentle scale pulse on title
    this.tweens.add({
      targets: this.titleText,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Tap to play
    this.tapText = this.add.text(512, 460, 'Tap to Play!', {
      fontSize: '40px',
      color: '#FFD700',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      stroke: '#8B6914',
      strokeThickness: 4,
    }).setOrigin(0.5);

    // Blink the tap text
    this.tweens.add({
      targets: this.tapText,
      alpha: 0.3,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // A few decorative trees
    if (this.textures.exists('tree-trunk')) {
      this.add.image(150, 640, 'tree-trunk').setScale(1.5);
      this.add.image(150, 590, 'tree-canopy-1').setScale(1.5);
      this.add.image(874, 640, 'tree-trunk').setScale(1.5);
      this.add.image(874, 590, 'tree-canopy-2').setScale(1.5);
    }

    // Handle first tap — unlock audio + start game
    this.input.once('pointerdown', () => {
      // Unlock audio for iOS Safari
      if (this.game.audioManager) {
        this.game.audioManager.unlock();
      }

      // Fade out and start game
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('GameScene');
        this.scene.launch('UIScene');
      });
    });
  }
}
