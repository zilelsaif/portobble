import Phaser from 'phaser';
import { DEBUG_MODE } from '../config/gameConfig';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }
  preload(): void {
    this.load.image('title-hero', 'assets/branding/portobble-title-hero.webp');
    this.load.image('ferry', 'assets/gameplay/ferry.webp');
    for (const vehicle of ['motorcycle', 'car', 'van', 'ambulance', 'truck']) {
      this.load.image(`vehicle-${vehicle}`, `assets/gameplay/vehicle-${vehicle}.webp`);
    }
    this.load.image('harbour-A', 'assets/gameplay/harbour-brindle.webp');
    this.load.image('harbour-B', 'assets/gameplay/harbour-seabrook.webp');
    this.load.image('harbour-C', 'assets/gameplay/harbour-marlow.webp');
    this.load.image('harbour-D', 'assets/gameplay/harbour-ironhaven.webp');
  }

  create(): void {
    const requestedLevel = Number(new URLSearchParams(window.location.search).get('level'));
    if (DEBUG_MODE && Number.isInteger(requestedLevel) && requestedLevel >= 1 && requestedLevel <= 50) {
      this.scene.start('Game', { levelId: requestedLevel });
    } else this.scene.start('Title');
  }
}
