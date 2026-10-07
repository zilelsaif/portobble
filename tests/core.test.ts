import { describe, expect, it } from 'vitest';
import { LEVELS, getLevel } from '../src/data/levels';
import type { FerryState, Placement } from '../src/models/game';
import { BalanceSystem } from '../src/systems/BalanceSystem';
import { ExitSystem } from '../src/systems/ExitSystem';
import { LevelSolver } from '../src/systems/LevelSolver';
import { LevelValidator } from '../src/systems/LevelValidator';
import { PlacementSystem } from '../src/systems/PlacementSystem';
import { ScoreSystem } from '../src/systems/ScoreSystem';

describe('PlacementSystem', () => {
  const level = getLevel(2);

  it('accepts valid placements', () => {
    expect(PlacementSystem.validate(level, { placements: [] }, { vehicleId: 'car-2', lane: 0, startCell: 0 })).toEqual({ valid: true });
  });

  it('rejects overlaps', () => {
    const state: FerryState = { placements: [{ vehicleId: 'car-2', lane: 0, startCell: 0 }] };
    expect(PlacementSystem.validate(level, state, { vehicleId: 'car-3', lane: 0, startCell: 1 })).toMatchObject({ valid: false, reason: 'OVERLAP' });
  });

  it('rejects insufficient space and out-of-bounds placement', () => {
    expect(PlacementSystem.validate(level, { placements: [] }, { vehicleId: 'car-2', lane: 0, startCell: 4 })).toMatchObject({ valid: false, reason: 'OUT_OF_BOUNDS' });
    expect(PlacementSystem.validate(level, { placements: [] }, { vehicleId: 'motorcycle-1', lane: 0, startCell: -1 })).toMatchObject({ valid: false, reason: 'OUT_OF_BOUNDS' });
  });
});

describe('BalanceSystem', () => {
  const level = getLevel(4);
  const balance = (placements: Placement[]) => BalanceSystem.calculate(level, { placements });

  it('accepts a balanced arrangement', () => {
    expect(balance([
      { vehicleId: 'car-1', lane: 0, startCell: 0 },
      { vehicleId: 'car-2', lane: 1, startCell: 0 },
    ])).toMatchObject({ value: 0, valid: true });
  });

  it('rejects excessive port and starboard load', () => {
    expect(balance([
      { vehicleId: 'car-1', lane: 0, startCell: 0 },
      { vehicleId: 'van-4', lane: 0, startCell: 2 },
    ])).toMatchObject({ value: -5, valid: false });
    expect(balance([
      { vehicleId: 'car-1', lane: 1, startCell: 0 },
      { vehicleId: 'van-4', lane: 1, startCell: 2 },
    ])).toMatchObject({ value: 5, valid: false });
  });

  it('honours the tolerance boundary', () => {
    expect(balance([{ vehicleId: 'motorcycle-3', lane: 1, startCell: 0 }])).toMatchObject({ value: 1, valid: true });
    expect(balance([{ vehicleId: 'car-1', lane: 1, startCell: 0 }])).toMatchObject({ value: 2, valid: false });
  });
});

describe('ScoreSystem balance thresholds', () => {
  const level = {
    ...getLevel(4),
    ferry: {
      ...getLevel(4).ferry,
      balanceTolerance: 5,
      goodBalanceThreshold: 3,
      perfectBalanceThreshold: 1,
    },
  };

  const state = (...placements: Placement[]): FerryState => ({ placements });

  it('awards 3 stars at the non-zero perfect threshold', () => {
    expect(ScoreSystem.stars(level, state(
      { vehicleId: 'motorcycle-3', lane: 1, startCell: 0 },
    ))).toBe(3);
  });

  it('awards 2 stars immediately outside perfect and at the good threshold', () => {
    expect(ScoreSystem.stars(level, state(
      { vehicleId: 'car-1', lane: 1, startCell: 0 },
    ))).toBe(2);
    expect(ScoreSystem.stars(level, state(
      { vehicleId: 'van-4', lane: 1, startCell: 0 },
    ))).toBe(2);
  });

  it('awards 1 star outside good through the completion tolerance boundary', () => {
    expect(ScoreSystem.stars(level, state(
      { vehicleId: 'car-1', lane: 1, startCell: 0 },
      { vehicleId: 'car-2', lane: 1, startCell: 2 },
    ))).toBe(1);
    const toleranceBoundary = state(
      { vehicleId: 'car-1', lane: 1, startCell: 0 },
      { vehicleId: 'van-4', lane: 1, startCell: 2 },
    );
    expect(BalanceSystem.calculate(level, toleranceBoundary)).toMatchObject({ absolute: 5, valid: true });
    expect(ScoreSystem.stars(level, toleranceBoundary)).toBe(1);
  });

  it('rejects balance immediately outside the completion tolerance', () => {
    const outsideTolerance = state(
      { vehicleId: 'car-1', lane: 1, startCell: 0 },
      { vehicleId: 'motorcycle-3', lane: 1, startCell: 2 },
      { vehicleId: 'van-4', lane: 1, startCell: 3 },
    );
    expect(BalanceSystem.calculate(level, outsideTolerance)).toMatchObject({ absolute: 6, valid: false });
  });
});

describe('ExitSystem', () => {
  const level = getLevel(6);

  it('accepts a priority vehicle nearest its lane exit', () => {
    const result = ExitSystem.validateExitOrder(level, { placements: [
      { vehicleId: 'truck-2', lane: 0, startCell: 0 },
      { vehicleId: 'ambulance-1', lane: 0, startCell: 3 },
    ] });
    expect(result.valid).toBe(true);
  });

  it('rejects a blocked priority vehicle and identifies its blocker', () => {
    const result = ExitSystem.validateExitOrder(level, { placements: [
      { vehicleId: 'ambulance-1', lane: 0, startCell: 0 },
      { vehicleId: 'truck-2', lane: 0, startCell: 2 },
    ] });
    expect(result).toMatchObject({
      valid: false,
      issues: [{ blockedVehicleId: 'ambulance-1', blockerVehicleId: 'truck-2' }],
    });
  });
});

describe('LevelValidator', () => {
  const level = getLevel(6);

  it('rejects an incomplete ferry', () => {
    expect(LevelValidator.validate(level, { placements: [] }).code).toBe('VEHICLE_STILL_WAITING');
  });

  it('rejects invalid balance', () => {
    const level4 = getLevel(4);
    const state: FerryState = { placements: [
      { vehicleId: 'car-1', lane: 0, startCell: 0 },
      { vehicleId: 'car-2', lane: 0, startCell: 2 },
      { vehicleId: 'motorcycle-3', lane: 0, startCell: 4 },
      { vehicleId: 'van-4', lane: 1, startCell: 0 },
    ] };
    expect(LevelValidator.validate(level4, state).code).toBe('UNBALANCED');
  });

  it('rejects a blocked priority vehicle', () => {
    const state: FerryState = { placements: [
      { vehicleId: 'truck-2', lane: 0, startCell: 0 },
      { vehicleId: 'ambulance-1', lane: 1, startCell: 0 },
      { vehicleId: 'car-3', lane: 1, startCell: 2 },
    ] };
    expect(LevelValidator.validate(level, state).code).toBe('PRIORITY_BLOCKED');
  });

  it('accepts a valid complete arrangement', () => {
    const solution = LevelSolver.solve(level);
    expect(solution).not.toBeNull();
    expect(LevelValidator.validate(level, solution!).valid).toBe(true);
  });
});

describe('handcrafted levels', () => {
  it('contains exactly Levels 1–10', () => {
    expect(LEVELS.map((level) => level.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('uses ordered, independently configurable balance thresholds', () => {
    for (const level of LEVELS) {
      expect(level.ferry.perfectBalanceThreshold).toBeLessThanOrEqual(level.ferry.goodBalanceThreshold);
      expect(level.ferry.goodBalanceThreshold).toBeLessThanOrEqual(level.ferry.balanceTolerance);
    }
    expect(getLevel(10).ferry.perfectBalanceThreshold).toBe(1);
  });

  it.each(LEVELS)('Level $id has a solver-verified valid solution', (level) => {
    const solution = LevelSolver.solve(level);
    expect(solution, `Level ${level.id} should be solvable`).not.toBeNull();
    expect(LevelValidator.validate(level, solution!).valid).toBe(true);
  });
});
