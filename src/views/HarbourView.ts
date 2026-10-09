import Phaser from 'phaser';
import type { PortId } from '../models/game';

export class HarbourView {
  readonly container: Phaser.GameObjects.Container;
  constructor(private scene: Phaser.Scene, readonly port: PortId, x = 0) { this.container = scene.add.container(x, 0).setDepth(0); this.draw(); }
  destroy(): void { this.container.destroy(true); }
  private draw(): void {
    const harbour = this.scene.add.image(195, 116, `harbour-${this.port}`).setDisplaySize(390, 230);
    this.container.add(harbour);
  }
}
