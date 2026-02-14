import { WORLD_WIDTH, WORLD_HEIGHT } from '../config.js';
import MapGenerator from '../systems/MapGenerator.js';
import Player from '../entities/Player.js';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    // Generate the world
    const mapGen = new MapGenerator(this);
    this.mapData = mapGen.generate();

    // Set world bounds
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    // Create player near the house plot (slightly north of it)
    const hp = this.mapData.housePlotPosition;
    this.player = new Player(this, hp.x, hp.y - 100);

    // Place house plot marker (dirt patch — stage 0)
    this.housePlot = this.add.image(hp.x, hp.y, 'house-stage-0');
    this.housePlot.setDepth(hp.y - 24); // base of the house sprite

    // Collisions: player vs obstacles (trees, rocks, river)
    this.physics.add.collider(this.player, this.mapData.obstacles);

    // Camera follows player
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.fadeIn(400, 0, 0, 0);

    // Touch/click input — tap to move
    this.input.on('pointerdown', (pointer) => {
      this.player.moveTo(pointer.worldX, pointer.worldY);
    });

    // Store map data for future phases
    // (itemSpawnPoints, animalSpawnZones, etc. will be used in Phases 3-4)
  }

  update(time, delta) {
    if (this.player) {
      this.player.update(time, delta);
    }
  }
}
