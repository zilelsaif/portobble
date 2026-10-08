import Phaser from 'phaser';
import { GAME_CONFIG, REDUCED_MOTION } from '../config/gameConfig';
import { SaveSystem } from '../systems/SaveSystem';
import { LEVELS } from '../data/levels';
import { ProgressSystem } from '../systems/ProgressSystem';
import { addButton, addPanel, addWaterBackdrop, textStyle } from '../ui/theme';
import { Sfx } from '../utils/Sfx';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create(): void {
    const save = SaveSystem.load();
    const progress = ProgressSystem.summarize(LEVELS, save);
    const continueLevel = LEVELS.find((level) => level.id <= save.highestUnlockedLevel && !save.stars[String(level.id)]);
    addWaterBackdrop(this);
    this.drawHarbourVignette();
    this.add.text(195, 238, GAME_CONFIG.title, textStyle(43, '#fff8df')).setOrigin(0.5).setShadow(0, 4, '#0b2732', 6);
    this.add.text(195, 282, GAME_CONFIG.subtitle.toUpperCase(), textStyle(15, '#d8eee8')).setOrigin(0.5).setLetterSpacing(1.8);
    addPanel(this, 195, 405, 278, 166);
    this.add.text(195, 340, progress.completed ? `${progress.completed}/50 LEVELS • ${progress.stars}/150 STARS • ⚓ ${progress.mastered}` : 'HARBOUR DISPATCH', textStyle(10, '#687b79')).setOrigin(0.5).setLetterSpacing(0.7);
    addButton(this, 195, 390, 226, 56, progress.completed ? 'CONTINUE' : 'PLAY', () => {
      Sfx.play('button');
      if (continueLevel) this.scene.start('Game', { levelId: continueLevel.id });
      else this.scene.start('LevelSelect', { chapter: Math.min(4, Math.floor((save.highestUnlockedLevel - 1) / 10)) });
    });
    addButton(this, 195, 455, 168, 42, 'LEVELS', () => this.scene.start('LevelSelect'), 'secondary');
    this.add.text(195, 661, `${GAME_CONFIG.version} • MINIATURE HARBOUR EDITION`, textStyle(11, '#c4ded8')).setOrigin(0.5);
    const sound = addButton(this, 338, 35, 88, 44, save.muted ? 'SOUND ×' : 'SOUND ♪', () => {
      const muted = SaveSystem.toggleMuted();
      const label = sound.list.find((item) => item instanceof Phaser.GameObjects.Text) as Phaser.GameObjects.Text | undefined;
      label?.setText(muted ? 'SOUND ×' : 'SOUND ♪');
      if (!muted) Sfx.play('button');
    }, 'secondary');
  }

  private drawHarbourVignette(): void {
    const shadow = this.add.ellipse(195, 164, 278, 40, 0x0b2732, 0.3);
    const mark = this.add.graphics({ x: 195, y: 136 });
    mark.fillStyle(0x203e4a).fillTriangle(-126, 25, 126, 25, 103, 52).fillTriangle(-126, 25, -104, 52, 103, 52);
    mark.fillStyle(0xf3ead4).fillRoundedRect(-126, -22, 252, 55, 13);
    mark.lineStyle(3, 0x17313a).strokeRoundedRect(-126, -22, 252, 55, 13);
    mark.fillStyle(0xd98245).fillRect(-74, -25, 112, 7);
    mark.fillStyle(0xfffbef).fillRoundedRect(35, -48, 68, 27, 5);
    mark.fillStyle(0x203e4a).fillRect(45, -40, 13, 9).fillRect(63, -40, 13, 9).fillRect(81, -40, 13, 9);
    mark.fillStyle(0x397f87).fillCircle(-70, 22, 7).fillCircle(-23, 22, 7).fillCircle(24, 22, 7).fillCircle(72, 22, 7);
    mark.lineStyle(3, 0xb8ddd4, 0.65).lineBetween(-145, 61, -68, 57).lineBetween(36, 62, 153, 55);
    if (!REDUCED_MOTION) this.tweens.add({ targets: [mark, shadow], y: '+=3', duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  }
}
