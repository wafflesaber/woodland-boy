import Phaser from 'phaser';
import { PLAYER_SPEED } from '../config.js';

export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'player-down-1');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Physics body — smaller than sprite for forgiving collisions
    // Texture is 64x64 (32x32 asset scaled 2x), character occupies center
    this.body.setSize(24, 24);
    this.body.setOffset(20, 32);
    this.setCollideWorldBounds(true);

    // Shadow
    this.shadow = scene.add.image(x, y + 20, 'shadow');
    this.shadow.setScale(1.5);
    this.shadow.setAlpha(0.4);
    this.shadow.setDepth(0);

    // Movement target (null when idle)
    this.target = null;

    // Track facing direction for idle frame
    this.facing = 'down';

    // Create walk animations
    this.createAnimations(scene);
  }

  createAnimations(scene) {
    const dirs = ['down', 'up', 'left', 'right'];

    for (const dir of dirs) {
      const key = `player-walk-${dir}`;
      // Skip if already created (in case of scene restart)
      if (scene.anims.exists(key)) continue;

      // Each "animation" alternates between frame 1 and frame 2
      // Since we use separate texture keys (not a spritesheet), we create
      // the animation by generating frames from texture keys
      scene.anims.create({
        key,
        frames: [
          { key: `player-${dir}-1` },
          { key: `player-${dir}-2` },
        ],
        frameRate: 6,
        repeat: -1,
      });
    }
  }

  moveTo(worldX, worldY) {
    this.target = { x: worldX, y: worldY };
  }

  update() {
    if (!this.target) {
      // Idle — show standing frame
      this.setTexture(`player-${this.facing}-1`);
      this.anims.stop();
      this.body.setVelocity(0, 0);
      this.updateShadow();
      return;
    }

    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Arrived at target
    if (dist < 8) {
      this.target = null;
      this.body.setVelocity(0, 0);
      this.setTexture(`player-${this.facing}-1`);
      this.anims.stop();
      this.updateShadow();
      return;
    }

    // Move toward target
    this.scene.physics.moveTo(this, this.target.x, this.target.y, PLAYER_SPEED);

    // Determine facing direction based on velocity angle
    const angle = Math.atan2(dy, dx);
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (absDx > absDy) {
      this.facing = dx > 0 ? 'right' : 'left';
    } else {
      this.facing = dy > 0 ? 'down' : 'up';
    }

    // Play walk animation
    const animKey = `player-walk-${this.facing}`;
    if (!this.anims.isPlaying || this.anims.currentAnim?.key !== animKey) {
      this.play(animKey);
    }

    // Y-sort depth
    this.setDepth(this.y);
    this.updateShadow();
  }

  updateShadow() {
    this.shadow.setPosition(this.x, this.y + 20);
    this.shadow.setDepth(this.y - 1);
  }
}
