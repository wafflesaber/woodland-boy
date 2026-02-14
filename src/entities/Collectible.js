import Phaser from 'phaser';

export default class Collectible extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, itemType) {
    super(scene, x, y, `item-${itemType}`);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.itemType = itemType;

    // Physics: no gravity, zero velocity, immovable
    this.body.setAllowGravity(false);
    this.body.setImmovable(true);
    this.body.moves = false; // critical: prevents Arcade from applying any velocity/movement

    // Generous body size for kid-friendly overlap detection
    // Items are 24x24 sprites; body is 36x36 centered
    this.body.setSize(36, 36);
    this.body.setOffset(
      (this.width - 36) / 2,
      (this.height - 36) / 2
    );

    // Generous interactive hit area for tapping (40px radius circle)
    this.setInteractive(
      new Phaser.Geom.Circle(this.width / 2, this.height / 2, 40),
      Phaser.Geom.Circle.Contains
    );

    // Y-sort depth
    this.setDepth(y);

    // Gentle idle bob using a tween — purely visual, doesn't affect physics
    // because body.moves = false keeps the body position locked
    scene.tweens.add({
      targets: this,
      y: y - 2,
      duration: 800 + Math.random() * 400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  collect() {
    // Disable immediately so we can't double-collect
    this.body.enable = false;
    this.removeInteractive();

    // Stop the bob tween
    this.scene.tweens.killTweensOf(this);

    // Tween: scale up then fade out
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.5,
      scaleY: 1.5,
      alpha: 0,
      duration: 300,
      ease: 'Power2',
      onComplete: () => {
        this.destroy();
      },
    });
  }
}
