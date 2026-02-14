import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import TitleScene from './scenes/TitleScene.js';
import GameScene from './scenes/GameScene.js';
import UIScene from './scenes/UIScene.js';
import AudioManager from './systems/AudioManager.js';

const config = {
  type: Phaser.AUTO,
  width: 1024,
  height: 768,
  parent: 'game-container',
  backgroundColor: '#87CEEB',

  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },

  render: {
    pixelArt: true,
    roundPixels: true,
    antialias: false,
  },

  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },

  scene: [BootScene, TitleScene, GameScene, UIScene],
};

const game = new Phaser.Game(config);
game.audioManager = new AudioManager();
window.__GAME__ = game;
