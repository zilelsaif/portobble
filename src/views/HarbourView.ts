import Phaser from 'phaser';
import type { PortId } from '../models/game';
import { VISUAL } from '../ui/visualTokens';

export class HarbourView {
  readonly container: Phaser.GameObjects.Container;
  constructor(private scene: Phaser.Scene, readonly port: PortId, x = 0) { this.container = scene.add.container(x, 0).setDepth(0); this.draw(); }
  destroy(): void { this.container.destroy(true); }
  private draw(): void {
    const g = this.scene.add.graphics(); const c = VISUAL.color;
    g.fillStyle(c.abyss, 0.16).fillEllipse(195, 252, 430, 55);
    g.fillStyle(0x7d9290, 0.26).fillTriangle(0, 120, 142, 44, 250, 120).fillTriangle(145, 120, 298, 67, 390, 120);
    g.fillStyle(c.concrete).fillRect(0, 205, 390, 25).fillStyle(0x747b76).fillRect(0, 226, 390, 7);
    for (let x = 18; x < 390; x += 58) g.fillStyle(c.amber).fillRoundedRect(x, 198, 9, 15, 3).fillStyle(c.abyss, 0.55).fillEllipse(x + 4, 215, 15, 5);
    if (this.port === 'A') this.drawBrindle(g); else if (this.port === 'B') this.drawSeabrook(g); else if (this.port === 'C') this.drawMarlow(g); else this.drawIronhaven(g);
    this.container.add(g);
  }
  private drawBrindle(g: Phaser.GameObjects.Graphics): void { const c=VISUAL.color; g.fillStyle(c.timber).fillRect(15,128,132,77).fillRect(245,151,94,54).fillStyle(0xd6c7a6).fillTriangle(9,130,80,78,153,130).fillTriangle(237,153,292,112,348,153).fillStyle(0x9a4938).fillRect(45,151,25,54).fillRect(276,170,22,35).lineStyle(3,0xe7d49c,.8).lineBetween(166,198,212,153).lineBetween(212,153,238,198).fillStyle(0xd9bc68).fillCircle(206,151,5); }
  private drawSeabrook(g: Phaser.GameObjects.Graphics): void { g.fillStyle(0xd9d0b9).fillRect(12,117,112,88).fillRect(246,130,126,75).fillStyle(0x4b6770).fillTriangle(5,119,68,76,131,119).fillTriangle(237,132,309,88,381,132).fillStyle(0xb85f48).fillRect(18,174,100,12).fillStyle(0xe2b95a).fillTriangle(18,186,35,186,26,198).fillTriangle(52,186,69,186,60,198).fillTriangle(86,186,103,186,94,198).lineStyle(3,0x344c53).lineBetween(203,124,203,203).fillStyle(0xe2c36d).fillCircle(203,122,7); }
  private drawMarlow(g: Phaser.GameObjects.Graphics): void { const c=VISUAL.color; g.fillStyle(0x7d8583).fillRect(16,110,165,95).fillRect(236,133,137,72).fillStyle(0x4f6065).fillTriangle(8,112,98,69,188,112).fillTriangle(228,135,304,101,381,135).fillStyle(c.rust).fillRect(35,163,53,42).fillStyle(c.steel).fillRect(98,162,62,43).fillStyle(c.amber).fillRect(205,184,28,21).fillRect(238,177,33,28).fillRect(276,187,25,18); }
  private drawIronhaven(g: Phaser.GameObjects.Graphics): void { const c=VISUAL.color; g.fillStyle(0x4b5558).fillRect(12,121,154,84).fillRect(230,104,148,101).fillStyle(0x303c41).fillRect(31,83,15,122).fillRect(320,55,13,150).lineStyle(5,c.steel).lineBetween(326,61,249,117).lineBetween(326,61,366,120).lineBetween(38,88,104,126).lineStyle(3,c.rust).lineBetween(326,61,249,117).lineBetween(38,88,104,126).fillStyle(c.rust).fillRect(251,154,67,51).fillStyle(0x657276).fillRect(75,149,76,56); }
}
