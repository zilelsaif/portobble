import type { FerryState, LevelDefinition } from '../models/game';
import { BalanceSystem } from './BalanceSystem';

export class ScoreSystem {
  static stars(level: LevelDefinition, state: FerryState): 1 | 2 | 3 {
    const balance = BalanceSystem.calculate(level, state);
    if (balance.absolute <= level.ferry.perfectBalanceThreshold) return 3;
    if (balance.absolute <= level.ferry.goodBalanceThreshold) return 2;
    return 1;
  }
}
