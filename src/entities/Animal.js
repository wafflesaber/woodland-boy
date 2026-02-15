import Phaser from 'phaser';
import { FLEE_TRIGGER_RANGE, FLEE_STOP_RANGE, WANDER_RANGE, WANDER_HOME_RANGE, WORLD_WIDTH, WORLD_HEIGHT, PLAYER_SPEED } from '../config.js';

const State = {
  IDLE: 'IDLE',
  WANDER: 'WANDER',
  FLEE: 'FLEE',
  FEEDING: 'FEEDING',
  TAMED: 'TAMED',
  FOLLOWING: 'FOLLOWING',
};

export default class Animal extends Phaser.Physics.Arcade.Sprite {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   * @param {object} config - entry from ANIMALS config
   */
  constructor(scene, x, y, config) {
    super(scene, x, y, `${config.texture}-1`);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.config = config;
    this.animalType = config.type;
    this.spawnOrigin = { x, y };

    // Unique ID for TamingManager tracking
    this.animalId = `${config.type}-${Phaser.Math.RND.uuid()}`;

    // Physics body — generous for collisions with obstacles
    this.body.setSize(22, 22);
    this.body.setOffset(5, 8);
    this.setCollideWorldBounds(true);

    // Shadow
    this.shadow = scene.add.image(x, y + 10, 'shadow');
    this.shadow.setAlpha(0.35);
    this.shadow.setDepth(0);

    // Smaller body for small animals (6x6 sprite grid)
    const smallTypes = ['bird', 'snake', 'scorpion', 'lizard', 'vulture', 'roadrunner'];
    if (smallTypes.includes(config.type)) {
      this.body.setSize(16, 16);
      this.body.setOffset(4, 6);
      this.shadow.setScale(0.7);
    }

    // State machine
    this.state = State.IDLE;
    this.idleTimer = this.randomIdleTime();
    this.wanderTarget = null;

    // Taming state
    this.tamed = false;
    this.followerIndex = -1;

    // Feeding pause timer (ms remaining in FEEDING state)
    this.feedingTimer = 0;

    // Walk frame index for manual toggling
    this.walkFrame = 1;
    this.walkFrameTimer = 0;

    // Interactive — generous hit area for kid taps
    this.setInteractive(
      new Phaser.Geom.Circle(16, 16, 40),
      Phaser.Geom.Circle.Contains
    );
  }

  randomIdleTime() {
    return 1000 + Math.random() * 2000; // 1-3 seconds
  }

  update(time, delta) {
    switch (this.state) {
      case State.IDLE:
        this.updateIdle(time, delta);
        break;
      case State.WANDER:
        this.updateWander(time, delta);
        break;
      case State.FLEE:
        this.updateFlee(time, delta);
        break;
      case State.FEEDING:
        this.updateFeeding(time, delta);
        break;
      case State.TAMED:
        this.updateTamed(time, delta);
        break;
      case State.FOLLOWING:
        this.updateFollowing(time, delta);
        break;
    }

    // Animate walk frames when moving
    this.updateWalkFrame(delta);

    // Y-sort depth
    this.setDepth(this.y);
    this.updateShadow();
  }

  // ─── IDLE ───

  updateIdle(time, delta) {
    this.body.setVelocity(0, 0);
    this.setTexture(`${this.config.texture}-1`);

    this.idleTimer -= delta;
    if (this.idleTimer <= 0) {
      this.startWander();
      return;
    }

    if (this.config.shy && !this.tamed) {
      this.checkFlee();
    }
  }

  // ─── WANDER ───

  updateWander(time, delta) {
    if (!this.wanderTarget) {
      this.enterIdle();
      return;
    }

    const dx = this.wanderTarget.x - this.x;
    const dy = this.wanderTarget.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 10) {
      this.enterIdle();
      return;
    }

    this.scene.physics.moveTo(this, this.wanderTarget.x, this.wanderTarget.y, this.config.speed);
    this.updateFacing();

    if (this.config.shy && !this.tamed) {
      this.checkFlee();
    }
  }

  // ─── FLEE ───

  updateFlee(time, delta) {
    const player = this.scene.player;
    if (!player) {
      this.enterIdle();
      return;
    }

    const dx = this.x - player.x;
    const dy = this.y - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > FLEE_STOP_RANGE) {
      this.enterIdle();
      return;
    }

    const angle = Math.atan2(dy, dx);
    const vx = Math.cos(angle) * this.config.fleeSpeed;
    const vy = Math.sin(angle) * this.config.fleeSpeed;
    this.body.setVelocity(vx, vy);
    this.updateFacing();
  }

  // ─── FEEDING ───

  updateFeeding(time, delta) {
    this.body.setVelocity(0, 0);
    this.setTexture(`${this.config.texture}-1`);

    this.feedingTimer -= delta;
    if (this.feedingTimer <= 0) {
      // If tamed during feeding, go to TAMED state
      if (this.tamed) {
        this.state = State.TAMED;
      } else {
        this.enterIdle();
      }
    }
  }

  // ─── TAMED (idle near player) ───

  updateTamed(time, delta) {
    const player = this.scene.player;
    if (!player) return;

    const followOffset = 60 + this.followerIndex * 40;
    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

    if (dist > followOffset + 30) {
      this.state = State.FOLLOWING;
      return;
    }

    // Near player — idle
    this.body.setVelocity(0, 0);
  }

  // ─── FOLLOWING (moving toward player) ───

  updateFollowing(time, delta) {
    const player = this.scene.player;
    if (!player) return;

    const followOffset = 60 + this.followerIndex * 40;
    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

    if (dist <= followOffset) {
      this.state = State.TAMED;
      this.body.setVelocity(0, 0);
      return;
    }

    // Move toward player at 80% of player speed
    const followSpeed = PLAYER_SPEED * 0.8;
    this.scene.physics.moveTo(this, player.x, player.y, followSpeed);
    this.updateFacing();
  }

  // ─── State transitions ───

  enterIdle() {
    this.state = State.IDLE;
    this.idleTimer = this.randomIdleTime();
    this.wanderTarget = null;
    this.body.setVelocity(0, 0);
  }

  startWander() {
    this.state = State.WANDER;

    const distFromHome = Phaser.Math.Distance.Between(
      this.x, this.y, this.spawnOrigin.x, this.spawnOrigin.y
    );

    let targetX, targetY;

    if (distFromHome > WANDER_HOME_RANGE) {
      const angle = Phaser.Math.Angle.Between(
        this.x, this.y, this.spawnOrigin.x, this.spawnOrigin.y
      );
      const wanderDist = 60 + Math.random() * 80;
      targetX = this.x + Math.cos(angle) * wanderDist;
      targetY = this.y + Math.sin(angle) * wanderDist;
    } else {
      const angle = Math.random() * Math.PI * 2;
      const wanderDist = 50 + Math.random() * WANDER_RANGE;
      targetX = this.x + Math.cos(angle) * wanderDist;
      targetY = this.y + Math.sin(angle) * wanderDist;
    }

    const margin = 40;
    targetX = Phaser.Math.Clamp(targetX, margin, WORLD_WIDTH - margin);
    targetY = Phaser.Math.Clamp(targetY, margin, WORLD_HEIGHT - margin);

    this.wanderTarget = { x: targetX, y: targetY };
  }

  /**
   * Enter feeding state — animal stands still for duration ms.
   */
  enterFeeding(duration = 1500) {
    this.state = State.FEEDING;
    this.feedingTimer = duration;
    this.wanderTarget = null;
    this.body.setVelocity(0, 0);
  }

  /**
   * Mark this animal as tamed and assign a follower index.
   */
  setTamed(followerIndex) {
    this.tamed = true;
    this.followerIndex = followerIndex;
    this.state = State.TAMED;
    this.wanderTarget = null;
    this.body.setVelocity(0, 0);
  }

  checkFlee() {
    const player = this.scene.player;
    if (!player) return;

    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    if (dist < FLEE_TRIGGER_RANGE) {
      this.state = State.FLEE;
      this.wanderTarget = null;
    }
  }

  // ─── Visual helpers ───

  updateFacing() {
    const vx = this.body.velocity.x;
    if (Math.abs(vx) > 5) {
      this.setFlipX(vx < 0);
    }
  }

  updateWalkFrame(delta) {
    const speed = this.body.velocity.length();
    if (speed > 5) {
      this.walkFrameTimer += delta;
      if (this.walkFrameTimer > 250) {
        this.walkFrameTimer = 0;
        this.walkFrame = this.walkFrame === 1 ? 2 : 1;
      }
      this.setTexture(`${this.config.texture}-${this.walkFrame}`);
    } else {
      this.walkFrameTimer = 0;
      this.walkFrame = 1;
      this.setTexture(`${this.config.texture}-1`);
    }
  }

  updateShadow() {
    if (this.shadow && this.shadow.active) {
      this.shadow.setPosition(this.x, this.y + 10);
      this.shadow.setDepth(this.y - 1);
    }
  }

  destroy(fromScene) {
    if (this.shadow) {
      this.shadow.destroy();
      this.shadow = null;
    }
    super.destroy(fromScene);
  }
}
