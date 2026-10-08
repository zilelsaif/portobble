import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }
  preload(): void { this.load.image('title-hero', 'assets/branding/portobble-title-hero.png'); }

  create(): void {
    this.scene.start('Title');
  }
}
