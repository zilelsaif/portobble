import Phaser from 'phaser';
import { REDUCED_MOTION } from '../config/gameConfig';
import type { PortId } from '../models/game';
import { VISUAL } from '../ui/visualTokens';
import { HarbourView } from './HarbourView';

export class JourneyPresentation {
  private harbour: HarbourView;
  private activePort: PortId;

  constructor(private scene: Phaser.Scene, initialPort: PortId) {
    this.activePort = initialPort;
    this.harbour = new HarbourView(scene, initialPort);
  }

  get currentPort(): PortId { return this.activePort; }

  travelTo(port: PortId, onArrive: () => void): void {
    const duration = REDUCED_MOTION ? 180 : VISUAL.motion.journey;
    const departureDuration = duration * 0.34;
    const openWaterDuration = duration * 0.18;
    const arrivalDuration = duration * 0.48;
    const marker = this.scene.add.container(430, 250, [
      this.scene.add.ellipse(0, 15, 24, 8, 0x071d27, 0.25),
      this.scene.add.triangle(0, 0, -9, 16, 9, 16, 0, -17, VISUAL.color.amber),
    ]).setDepth(1);

    this.scene.tweens.add({ targets: marker, x: -40, duration, ease: 'Linear' });
    this.scene.tweens.add({
      targets: this.harbour.container,
      x: -430,
      duration: departureDuration,
      ease: 'Sine.in',
      onComplete: () => {
        this.harbour.destroy();
        this.scene.time.delayedCall(openWaterDuration, () => {
          const incoming = new HarbourView(this.scene, port, 430);
          this.scene.tweens.add({
            targets: incoming.container,
            x: 0,
            duration: arrivalDuration,
            ease: 'Sine.out',
            onComplete: () => {
              this.harbour = incoming;
              this.activePort = port;
              marker.destroy();
              onArrive();
            },
          });
        });
      },
    });
  }
}
