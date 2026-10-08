import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/gameConfig';
import { SaveSystem } from '../systems/SaveSystem';
import { LEVELS } from '../data/levels';
import { ProgressSystem } from '../systems/ProgressSystem';
import { addButton, addPanel, textStyle } from '../ui/theme';
import { Sfx } from '../utils/Sfx';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create(): void {
    const save = SaveSystem.load();
    const progress = ProgressSystem.summarize(LEVELS, save);
    const continueLevel = LEVELS.find((level) => level.id <= save.highestUnlockedLevel && !save.stars[String(level.id)]);
    this.add.image(195,350,'title-hero').setDisplaySize(467,700); this.add.rectangle(195,350,390,700,0x071d27,.28); this.add.rectangle(195,103,390,206,0x071d27,.48);
    this.add.text(195,76,GAME_CONFIG.title,textStyle(43,'#fff8df')).setOrigin(.5).setShadow(0,4,'#071d27',7).setLetterSpacing(1.5);
    this.add.text(195,119,GAME_CONFIG.subtitle.toUpperCase(),textStyle(12,'#d8eee8')).setOrigin(.5).setLetterSpacing(1.7);
    addPanel(this,195,522,292,178); this.add.text(195,456,progress.completed?`${progress.completed}/50 ROUTES • ${progress.stars}/150 STARS • ${progress.mastered} MASTERED`:'HARBOUR DISPATCH',textStyle(9,'#687b79')).setOrigin(.5);
    addButton(this, 195, 506, 226, 56, progress.completed ? 'CONTINUE' : 'PLAY', () => {
      Sfx.play('button');
      if (continueLevel) this.scene.start('Game', { levelId: continueLevel.id });
      else this.scene.start('LevelSelect', { chapter: Math.min(4, Math.floor((save.highestUnlockedLevel - 1) / 10)) });
    });
    addButton(this,195,571,168,42,'LEVELS',()=>this.scene.start('LevelSelect'),'secondary');
    this.add.text(195, 661, `${GAME_CONFIG.version} • MINIATURE HARBOUR EDITION`, textStyle(11, '#c4ded8')).setOrigin(0.5);
    const sound=addButton(this,338,35,88,44,save.muted?'AUDIO OFF':'AUDIO ON',()=>{
      const muted = SaveSystem.toggleMuted();
      const label = sound.list.find((item) => item instanceof Phaser.GameObjects.Text) as Phaser.GameObjects.Text | undefined;
      label?.setText(muted?'AUDIO OFF':'AUDIO ON');
      if (!muted) Sfx.play('button');
    }, 'secondary');
  }

}
