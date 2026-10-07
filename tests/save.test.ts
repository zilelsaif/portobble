import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SaveSystem } from '../src/systems/SaveSystem';

class MemoryStorage implements Storage {
  private values = new Map<string, string>();

  get length(): number { return this.values.size; }
  clear(): void { this.values.clear(); }
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  key(index: number): string | null { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string): void { this.values.delete(key); }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

describe('SaveSystem', () => {
  beforeEach(() => vi.stubGlobal('localStorage', new MemoryStorage()));
  afterEach(() => vi.unstubAllGlobals());

  it('recovers safely from missing or corrupt save data', () => {
    expect(SaveSystem.load()).toEqual({ version: 1, highestUnlockedLevel: 1, stars: {}, muted: false });
    localStorage.setItem('portobble-save-v1', '{broken');
    expect(SaveSystem.load()).toEqual({ version: 1, highestUnlockedLevel: 1, stars: {}, muted: false });
  });

  it('unlocks the next level and preserves the best star result', () => {
    SaveSystem.recordCompletion(1, 2);
    SaveSystem.recordCompletion(1, 1);
    expect(SaveSystem.load()).toMatchObject({ highestUnlockedLevel: 2, stars: { '1': 2 } });
  });

  it('caps progression at Level 10 and can clear the save', () => {
    SaveSystem.recordCompletion(10, 3);
    expect(SaveSystem.load().highestUnlockedLevel).toBe(10);
    SaveSystem.clear();
    expect(SaveSystem.load().highestUnlockedLevel).toBe(1);
  });
});
