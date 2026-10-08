import type { AttemptMetrics, FerryState, LevelDefinition, MasteryObjective } from '../models/game';
import { BalanceSystem } from './BalanceSystem';

export type MasteryAction = 'undo' | 'reset' | 'restart' | 'invalidDrop' | 'placement' | 'reposition' | 'return';

export class MasterySystem {
  static initialMetrics(): AttemptMetrics {
    return { undoCount: 0, resetCount: 0, restartCount: 0, invalidDropCount: 0, moveCount: 0, repositionCount: 0 };
  }

  static track(metrics: AttemptMetrics, action: MasteryAction): AttemptMetrics {
    const next = { ...metrics };
    if (action === 'undo') next.undoCount += 1;
    if (action === 'reset') next.resetCount += 1;
    if (action === 'restart') next.restartCount += 1;
    if (action === 'invalidDrop') next.invalidDropCount += 1;
    if (action === 'placement' || action === 'reposition' || action === 'return') next.moveCount += 1;
    if (action === 'reposition') next.repositionCount += 1;
    return next;
  }

  static evaluate(objective: MasteryObjective | undefined, metrics: AttemptMetrics, level?: LevelDefinition, scoringState?: FerryState): boolean {
    if (!objective) return false;
    switch (objective.type) {
      case 'noUndo': return metrics.undoCount === 0;
      case 'noReset': return metrics.resetCount === 0 && metrics.restartCount === 0;
      case 'cleanDeck': return metrics.invalidDropCount === 0;
      case 'firstPlan': return metrics.repositionCount === 0;
      case 'limitedMoves': return metrics.moveCount <= (objective.value ?? 0);
      case 'perfectBalance': return Boolean(level && scoringState && BalanceSystem.calculate(level, scoringState).absolute <= level.ferry.perfectBalanceThreshold);
    }
  }

  static description(objective: MasteryObjective): string {
    switch (objective.type) {
      case 'noUndo': return 'Finish without Undo';
      case 'noReset': return 'Finish without Reset or Restart';
      case 'cleanDeck': return 'Make no rejected placement';
      case 'firstPlan': return 'Do not reposition loaded vehicles';
      case 'perfectBalance': return 'Finish within perfect balance';
      case 'limitedMoves': return `Complete in ${objective.value ?? 0} moves`;
    }
  }

  static failureReason(objective: MasteryObjective, metrics: AttemptMetrics): string | undefined {
    if (objective.type === 'noUndo' && metrics.undoCount > 0) return 'Undo used';
    if (objective.type === 'noReset' && (metrics.resetCount > 0 || metrics.restartCount > 0)) return metrics.restartCount > 0 ? 'Route restarted' : 'Reset used';
    if (objective.type === 'cleanDeck' && metrics.invalidDropCount > 0) return 'Rejected placement made';
    if (objective.type === 'firstPlan' && metrics.repositionCount > 0) return 'Loaded vehicle moved';
    if (objective.type === 'limitedMoves' && metrics.moveCount > (objective.value ?? 0)) return `Move limit exceeded (${metrics.moveCount}/${objective.value ?? 0})`;
    return undefined;
  }
}
