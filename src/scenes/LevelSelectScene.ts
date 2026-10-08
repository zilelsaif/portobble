import Phaser from 'phaser';
import { GAME_CONFIG, DEBUG_MODE } from '../config/gameConfig';
import { LEVELS } from '../data/levels';
import { SaveSystem } from '../systems/SaveSystem';
import { ProgressSystem } from '../systems/ProgressSystem';
import { addButton, addPanel, addStars, addWaterBackdrop, textStyle } from '../ui/theme';
import { Sfx } from '../utils/Sfx';

export class LevelSelectScene extends Phaser.Scene {
  private chapter = 0;

  constructor() {
    super('LevelSelect');
  }

  init(data: { chapter?: number }): void {
    this.chapter = Phaser.Math.Clamp(data.chapter ?? this.chapter, 0, 4);
  }

  create(): void {
    addWaterBackdrop(this);
    addPanel(this, 195, 348, 354, 610);
    this.add.text(195, 56, 'HARBOUR ROUTES', textStyle(26)).setOrigin(0.5);
    const chapterName = ['CHAPTER 1 • THE CROSSING', 'CHAPTER 2 • PORT HOPPER', 'CHAPTER 3 • TIDAL PASSAGE', 'CHAPTER 4 • HARBOUR EXCHANGE', 'CHAPTER 5 • MASTER ROUTES'][this.chapter]!;
    this.add.text(195, 82, chapterName, textStyle(11, '#6b7b77')).setOrigin(0.5).setLetterSpacing(1.2);
    const save = SaveSystem.load();
    const chapter = ProgressSystem.chapter(LEVELS, save, this.chapter);
    const overall = ProgressSystem.summarize(LEVELS, save);
    this.add.text(195, 105, `${chapter.completed}/10 LEVELS  •  ${chapter.stars}/30 STARS  •  ${chapter.mastered}/${chapter.masteryTotal} MASTERY`, textStyle(9, '#46685c')).setOrigin(0.5);
    LEVELS.slice(this.chapter * 10, this.chapter * 10 + 10).forEach((level, index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      const x = 110 + column * 170;
      const y = 155 + row * 82;
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
      if (save.mastery[String(level.id)]) this.add.text(x + 53, y + 18, '⚓', textStyle(11, '#ffe09a')).setOrigin(0.5);
    });
    if (ProgressSystem.chapterMastered(LEVELS, save, this.chapter)) this.add.text(195, 576, '⚓ CHAPTER MASTERED', textStyle(10, '#8b6824')).setOrigin(0.5);
    this.add.text(195, 605, `PORTOBBLE • ${overall.completed}/${overall.total} LEVELS • ${overall.stars}/${overall.maximumStars} STARS • ${overall.mastered}/${overall.masteryTotal} MASTERY`, textStyle(8, '#526d67')).setOrigin(0.5);
    addButton(this, 50, 647, 72, 46, 'BACK', () => this.scene.start('Title'), 'secondary');
    if (this.chapter > 0) addButton(this, 140, 647, 86, 46, '← PREV', () => this.scene.restart({ chapter: this.chapter - 1 }), 'secondary');
    if (this.chapter < 4) addButton(this, 238, 647, 86, 46, 'NEXT →', () => this.scene.restart({ chapter: this.chapter + 1 }), 'secondary');
    if (DEBUG_MODE) {
      addButton(this, 342, 647, 82, 46, 'UNLOCK', () => {
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
