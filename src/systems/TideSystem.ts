import type { FerryState, LevelDefinition, RouteLegDefinition, TideValidationResult } from '../models/game';
import { BalanceSystem } from './BalanceSystem';

export class TideSystem {
  static evaluateLeg(level: LevelDefinition, state: FerryState, leg: RouteLegDefinition): TideValidationResult {
    const totalWeight = BalanceSystem.totalWeight(level, state);
    const balance = BalanceSystem.calculate(level, state).value;
    const heelDraftPenalty = Math.abs(balance) * (level.tideRules?.heelDraftFactor ?? 1);
    const effectiveDraft = totalWeight + heelDraftPenalty;
    return {
      safe: effectiveDraft <= leg.maxDraft,
      leg,
      totalWeight,
      balance,
      heelDraftPenalty,
      effectiveDraft,
      maxDraft: leg.maxDraft,
    };
  }
}
