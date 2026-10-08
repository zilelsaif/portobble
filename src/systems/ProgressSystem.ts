import type { LevelDefinition } from '../models/game';
import type { SaveData } from './SaveSystem';

export interface ProgressSummary { completed: number; total: number; stars: number; maximumStars: number; mastered: number; masteryTotal: number }

export class ProgressSystem {
  static summarize(levels: LevelDefinition[], save: SaveData): ProgressSummary {
    const masteryLevels = levels.filter((level) => level.mastery);
    return {
      completed: levels.filter((level) => (save.stars[String(level.id)] ?? 0) > 0).length,
      total: levels.length,
      stars: levels.reduce((sum, level) => sum + (save.stars[String(level.id)] ?? 0), 0),
      maximumStars: levels.length * 3,
      mastered: masteryLevels.filter((level) => save.mastery[String(level.id)] === true).length,
      masteryTotal: masteryLevels.length,
    };
  }

  static chapter(levels: LevelDefinition[], save: SaveData, chapterIndex: number): ProgressSummary {
    return this.summarize(levels.slice(chapterIndex * 10, chapterIndex * 10 + 10), save);
  }

  static chapterComplete(levels: LevelDefinition[], save: SaveData, chapterIndex: number): boolean {
    const summary = this.chapter(levels, save, chapterIndex);
    return summary.total > 0 && summary.completed === summary.total;
  }

  static chapterMastered(levels: LevelDefinition[], save: SaveData, chapterIndex: number): boolean {
    const summary = this.chapter(levels, save, chapterIndex);
    return summary.masteryTotal > 0 && summary.mastered === summary.masteryTotal;
  }
}
