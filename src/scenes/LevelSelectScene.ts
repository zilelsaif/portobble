import Phaser from 'phaser';
import { GAME_CONFIG, DEBUG_MODE } from '../config/gameConfig';
import { LEVELS } from '../data/levels';
import { SaveSystem } from '../systems/SaveSystem';
import { addButton, addPanel, addStars, addWaterBackdrop, textStyle } from '../ui/theme';
import { Sfx } from '../utils/Sfx';

export class LevelSelectScene extends Phaser.Scene {
  private chapter = 0;

  constructor() {
    super('LevelSelect');
  }

  init(data: { chapter?: number }): void {
    this.chapter = data.chapter ?? this.chapter;
  }

  create(): void {
    addWaterBackdrop(this);
    addPanel(this, 195, 348, 354, 610);
    this.add.text(195, 56, 'HARBOUR ROUTES', textStyle(26)).setOrigin(0.5);
    const chapterName = this.chapter === 0 ? 'CHAPTER 1 • THE CROSSING' : 'CHAPTER 2 • PORT HOPPER';
    this.add.text(195, 82, chapterName, textStyle(11, '#6b7b77')).setOrigin(0.5).setLetterSpacing(1.2);
    const save = SaveSystem.load();
    LEVELS.slice(this.chapter * 10, this.chapter * 10 + 10).forEach((level, index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      const x = 110 + column * 170;
      const y = 142 + row * 82;
      const unlocked = level.id <= save.highestUnlockedLevel;
      const stars = save.stars[String(level.id)] ?? 0;
      const completed = stars > 0;
      const fill = !unlocked ? 'locked' : completed ? GAME_CONFIG.colors.green : GAME_CONFIG.colors.navy;
      const button = addButton(this, x, y, 138, 60, unlocked ? `${completed ? '✓ ' : ''}LEVEL ${level.id}` : `◆ LOCKED ${level.id}`, () => {
        if (!unlocked) return;
        Sfx.play('button');
        this.scene.start('Game', { levelId: level.id });
      }, fill);
      if (!unlocked) button.disableInteractive().setAlpha(0.7);
      if (stars > 0) addStars(this, x, y + 18, stars, 11);
      else this.add.text(x, y + 18, unlocked ? level.title : 'Finish prior route', textStyle(9, unlocked ? '#d9eee5' : '#e7e7e2')).setOrigin(0.5);
    });
    addButton(this, 78, 647, 96, 46, 'BACK', () => this.scene.start('Title'), 'secondary');
    addButton(this, 195, 647, 112, 46, this.chapter === 0 ? 'PORT HOPPER →' : '← CROSSING', () => {
      this.scene.restart({ chapter: this.chapter === 0 ? 1 : 0 });
    }, 'secondary');
    if (DEBUG_MODE) {
      addButton(this, 326, 647, 104, 46, 'UNLOCK ALL', () => {
        SaveSystem.unlockAll();
        this.scene.restart();
      }, 0x6b5f87);
      this.input.keyboard?.on('keydown-R', () => {
        SaveSystem.clear();
        this.scene.restart();
      });
    }
  }
}
