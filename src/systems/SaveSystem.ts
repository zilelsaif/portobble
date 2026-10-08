const SAVE_KEY = 'portobble-save-v1';

export interface SaveData {
  version: 1;
  highestUnlockedLevel: number;
  stars: Record<string, number>;
  mastery: Record<string, boolean>;
  muted: boolean;
}

const freshSave = (): SaveData => ({ version: 1, highestUnlockedLevel: 1, stars: {}, mastery: {}, muted: false });

export class SaveSystem {
  static load(): SaveData {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return freshSave();
      const parsed = JSON.parse(raw) as Partial<SaveData>;
      if (parsed.version !== 1 || typeof parsed.highestUnlockedLevel !== 'number' || typeof parsed.stars !== 'object' || parsed.stars === null) return freshSave();
      return {
        version: 1,
        highestUnlockedLevel: Math.max(1, Math.min(50, Math.floor(parsed.highestUnlockedLevel))),
        stars: Object.fromEntries(Object.entries(parsed.stars).filter(([, value]) => typeof value === 'number')),
        mastery: typeof parsed.mastery === 'object' && parsed.mastery !== null
          ? Object.fromEntries(Object.entries(parsed.mastery).filter(([, value]) => value === true))
          : {},
        muted: parsed.muted === true,
      };
    } catch {
      return freshSave();
    }
  }

  static recordCompletion(levelId: number, stars: number): SaveData {
    const save = this.load();
    save.stars[String(levelId)] = Math.max(save.stars[String(levelId)] ?? 0, stars);
    save.highestUnlockedLevel = Math.max(save.highestUnlockedLevel, Math.min(50, levelId + 1));
    this.write(save);
    return save;
  }

  static recordMastery(levelId: number): SaveData {
    const save = this.load();
    save.mastery[String(levelId)] = true;
    this.write(save);
    return save;
  }

  static toggleMuted(): boolean {
    const save = this.load();
    save.muted = !save.muted;
    this.write(save);
    return save.muted;
  }

  static clear(): void {
    localStorage.removeItem(SAVE_KEY);
  }

  static unlockAll(): void {
    const save = this.load();
    save.highestUnlockedLevel = 50;
    this.write(save);
  }

  private static write(save: SaveData): void {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  }
}
