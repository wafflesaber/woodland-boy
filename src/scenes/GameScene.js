export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    // Placeholder — will be built out in Phase 2
    this.cameras.main.setBackgroundColor('#228B22');
    this.cameras.main.fadeIn(400, 0, 0, 0);

    this.add.text(512, 384, 'Game World\n(Phase 2)', {
      fontSize: '32px',
      color: '#FFFFFF',
      fontFamily: 'Arial, sans-serif',
      align: 'center',
    }).setOrigin(0.5);
  }
}
