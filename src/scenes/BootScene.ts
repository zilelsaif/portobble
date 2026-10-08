import Phaser from 'phaser';
import { DEBUG_MODE } from '../config/gameConfig';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }
  preload(): void { this.load.image('title-hero', 'assets/branding/portobble-title-hero.png'); }

  create(): void {
    const requestedLevel = Number(new URLSearchParams(window.location.search).get('level'));
    if (DEBUG_MODE && Number.isInteger(requestedLevel) && requestedLevel >= 1 && requestedLevel <= 50) {
      this.scene.start('Game', { levelId: requestedLevel });
    } else this.scene.start('Title');
  }
}
