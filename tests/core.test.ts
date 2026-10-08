import { describe, expect, it } from 'vitest';
import { LEVELS, getLevel } from '../src/data/levels';
import { PORTS, portFullName, portShortName } from '../src/data/ports';
import type { FerryState, Placement } from '../src/models/game';
import { BalanceSystem } from '../src/systems/BalanceSystem';
import { ExitSystem } from '../src/systems/ExitSystem';
import { LevelSolver } from '../src/systems/LevelSolver';
import { LevelValidator } from '../src/systems/LevelValidator';
import { PlacementSystem } from '../src/systems/PlacementSystem';
import { ScoreSystem } from '../src/systems/ScoreSystem';
import { RouteSystem } from '../src/systems/RouteSystem';
import { TideSystem } from '../src/systems/TideSystem';
import { ManifestSystem } from '../src/systems/ManifestSystem';

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

describe('RouteSystem', () => {
  it('accepts a next-port vehicle with a clear exit', () => {
    const level = getLevel(12);
    const result = RouteSystem.simulate(level, { placements: [
      { vehicleId: 'truck-2', lane: 0, startCell: 0 },
      { vehicleId: 'car-1', lane: 0, startCell: 3 },
      { vehicleId: 'motorcycle-3', lane: 1, startCell: 0 },
    ] });
    expect(result.valid).toBe(true);
    expect(result.stops[0]?.unloadedVehicleIds).toEqual(['car-1']);
  });

  it('detects a later-port blocker and reports both identities', () => {
    const result = RouteSystem.simulate(getLevel(12), { placements: [
      { vehicleId: 'car-1', lane: 0, startCell: 0 },
      { vehicleId: 'truck-2', lane: 0, startCell: 2 },
      { vehicleId: 'motorcycle-3', lane: 1, startCell: 0 },
    ] });
    expect(result).toMatchObject({
      valid: false,
      issue: { code: 'DESTINATION_BLOCKED', port: 'B', blockedVehicleId: 'car-1', blockerVehicleId: 'truck-2' },
    });
  });

  it('allows multiple same-destination vehicles to unload before later cargo', () => {
    const solution = LevelSolver.solve(getLevel(13));
    const result = RouteSystem.simulate(getLevel(13), solution!);
    expect(result.valid).toBe(true);
    expect(new Set(result.stops[0]?.unloadedVehicleIds)).toEqual(new Set(['car-1', 'van-2']));
  });

  it('rejects a normal vehicle ahead of priority at the same destination', () => {
    const result = RouteSystem.simulate(getLevel(16), { placements: [
      { vehicleId: 'ambulance-1', lane: 0, startCell: 0 },
      { vehicleId: 'car-2', lane: 0, startCell: 2 },
      { vehicleId: 'truck-3', lane: 1, startCell: 0 },
      { vehicleId: 'motorcycle-4', lane: 1, startCell: 3 },
    ] });
    expect(result).toMatchObject({
      valid: false,
      issue: { code: 'PRIORITY_BLOCKED', port: 'B', blockedVehicleId: 'ambulance-1', blockerVehicleId: 'car-2' },
    });
  });

  it('simulates B, C and D unloading and ends empty', () => {
    const level = getLevel(17);
    const solution = LevelSolver.solve(level);
    const result = RouteSystem.simulate(level, solution!);
    expect(result.valid).toBe(true);
    expect(result.stops.map((stop) => stop.port)).toEqual(['B', 'C', 'D']);
    expect(result.stops[0]?.remainingState.placements.every((placement) => !['car-1', 'motorcycle-2'].includes(placement.vehicleId))).toBe(true);
    expect(result.stops[1]?.remainingState.placements.map((placement) => placement.vehicleId)).toEqual(['truck-5']);
    expect(result.finalState.placements).toEqual([]);
  });
});

describe('port presentation metadata', () => {
  it('maps internal route IDs to fictional full and compact names', () => {
    expect(PORTS).toMatchObject({
      A: { fullName: 'Brindle Bay', shortName: 'BRI' },
      B: { fullName: 'Seabrook Harbour', shortName: 'SEA' },
      C: { fullName: 'Marlow Quay', shortName: 'MAR' },
      D: { fullName: 'Ironhaven Port', shortName: 'IRON' },
    });
    expect(portFullName('B')).toBe('Seabrook Harbour');
    expect(portShortName('D')).toBe('IRON');
  });

  it('uses full harbour names in destination failure messages', () => {
    const result = LevelValidator.validate(getLevel(12), { placements: [
      { vehicleId: 'car-1', lane: 0, startCell: 0 },
      { vehicleId: 'truck-2', lane: 0, startCell: 2 },
      { vehicleId: 'motorcycle-3', lane: 1, startCell: 0 },
    ] });
    expect(result.message).toContain('SEABROOK HARBOUR');
    expect(result.message).not.toContain('PORT B');
  });
});

describe('TideSystem', () => {
  const level = getLevel(22);
  const baseLeg = level.route!.legs![0]!;
  const safeState: FerryState = { placements: [
    { vehicleId: 'van-2', lane: 0, startCell: 0 },
    { vehicleId: 'motorcycle-3', lane: 1, startCell: 0 },
    { vehicleId: 'car-1', lane: 1, startCell: 1 },
  ] };
  const poorState: FerryState = { placements: [
    { vehicleId: 'car-1', lane: 0, startCell: 0 },
    { vehicleId: 'van-2', lane: 1, startCell: 0 },
    { vehicleId: 'motorcycle-3', lane: 1, startCell: 2 },
  ] };

  it('accepts high- and low-tide safe passage', () => {
    expect(TideSystem.evaluateLeg(level, safeState, { ...baseLeg, tide: 'high', maxDraft: 10 }).safe).toBe(true);
    expect(TideSystem.evaluateLeg(level, safeState, baseLeg)).toMatchObject({ safe: true, totalWeight: 6, balance: 0, effectiveDraft: 6 });
  });

  it('accepts the exact maxDraft boundary and rejects one unit above it', () => {
    expect(TideSystem.evaluateLeg(level, poorState, { ...baseLeg, maxDraft: 8 })).toMatchObject({ safe: true, effectiveDraft: 8 });
    expect(TideSystem.evaluateLeg(level, poorState, { ...baseLeg, maxDraft: 7 })).toMatchObject({ safe: false, effectiveDraft: 8 });
  });

  it('uses imbalance as a heel penalty and improved balance restores safety', () => {
    expect(TideSystem.evaluateLeg(level, poorState, baseLeg)).toMatchObject({ safe: false, balance: 2, heelDraftPenalty: 2 });
    expect(TideSystem.evaluateLeg(level, safeState, baseLeg)).toMatchObject({ safe: true, balance: 0, heelDraftPenalty: 0 });
  });

  it('identifies a later failing leg after unload recalculates weight and balance', () => {
    const routeLevel = getLevel(23);
    const failing: FerryState = { placements: [
      { vehicleId: 'van-2', lane: 0, startCell: 0 },
      { vehicleId: 'motorcycle-3', lane: 0, startCell: 2 },
      { vehicleId: 'car-1', lane: 1, startCell: 3 },
    ] };
    const result = RouteSystem.simulate(routeLevel, failing);
    expect(result.tideChecks[0]).toMatchObject({ safe: true, totalWeight: 6 });
    expect(result.tideFailure).toMatchObject({ safe: false, leg: { from: 'B', to: 'C', tide: 'low' }, totalWeight: 4, balance: -4, effectiveDraft: 8, maxDraft: 6 });
  });

  it('lets a different legal arrangement complete the same multi-leg route', () => {
    const routeLevel = getLevel(23);
    const passing: FerryState = { placements: [
      { vehicleId: 'van-2', lane: 0, startCell: 0 },
      { vehicleId: 'motorcycle-3', lane: 1, startCell: 0 },
      { vehicleId: 'car-1', lane: 1, startCell: 1 },
    ] };
    const result = RouteSystem.simulate(routeLevel, passing);
    expect(result.valid).toBe(true);
    expect(result.tideChecks).toHaveLength(2);
    expect(result.tideChecks[1]).toMatchObject({ safe: true, totalWeight: 4, balance: -2, effectiveDraft: 6 });
  });

  it('simulates three tide legs with recalculation after each unload', () => {
    const routeLevel = getLevel(27);
    const solution = LevelSolver.solve(routeLevel)!;
    const result = RouteSystem.simulate(routeLevel, solution);
    expect(result.valid).toBe(true);
    expect(result.tideChecks.map((check) => check.leg.tide)).toEqual(['high', 'low', 'mid']);
    expect(result.tideChecks.map((check) => check.totalWeight)).toEqual([13, 10, 5]);
    expect(result.finalState.placements).toEqual([]);
  });
});

describe('ManifestSystem', () => {
  it('reports no pickup, one pickup and multiple pickups by port', () => {
    expect(ManifestSystem.pickupsAt(getLevel(31), 'A')).toEqual([]);
    expect(ManifestSystem.pickupsAt(getLevel(31), 'B')).toHaveLength(1);
    expect(ManifestSystem.pickupsAt(getLevel(33), 'B')).toHaveLength(2);
  });

  it('requires every scheduled pickup before departure', () => {
    const level = getLevel(31);
    const firstDeparture = LevelSolver.solveManifest(level)!.stages[0]!.departureState;
    const arrival = ManifestSystem.arrive(level, { ...ManifestSystem.initialState(level), ferry: firstDeparture });
    expect(ManifestSystem.validateDeparture(level, arrival)).toMatchObject({ valid: false, code: 'PICKUP_WAITING' });
    const completeStage = LevelSolver.solveManifest(level)!.stages[1]!.departureState;
    expect(ManifestSystem.validateDeparture(level, { ...arrival, ferry: completeStage }).valid).toBe(true);
  });

  it('locks through-cargo while allowing current pickups to move and return', () => {
    const level = getLevel(31);
    const firstDeparture = LevelSolver.solveManifest(level)!.stages[0]!.departureState;
    const arrival = ManifestSystem.arrive(level, { ...ManifestSystem.initialState(level), ferry: firstDeparture });
    const lockedId = arrival.lockedVehicleIds[0]!;
    const lockedPlacement = arrival.ferry.placements.find((placement) => placement.vehicleId === lockedId)!;
    expect(ManifestSystem.withPlacement(arrival, { ...lockedPlacement, lane: lockedPlacement.lane === 0 ? 1 : 0 })).toBe(arrival);
    const pickupId = arrival.waitingVehicleIds[0]!;
    const loaded = ManifestSystem.withPlacement(arrival, { vehicleId: pickupId, lane: 0, startCell: 4 });
    expect(loaded.ferry.placements.some((placement) => placement.vehicleId === pickupId)).toBe(true);
    expect(ManifestSystem.returnToQueue(loaded, pickupId).ferry.placements.some((placement) => placement.vehicleId === pickupId)).toBe(false);
  });

  it('resets only current-port pickups and preserves committed cargo', () => {
    const level = getLevel(31);
    const solution = LevelSolver.solveManifest(level)!;
    const arrival = ManifestSystem.arrive(level, { ...ManifestSystem.initialState(level), ferry: solution.stages[0]!.departureState });
    const loaded = { ...arrival, ferry: solution.stages[1]!.departureState };
    const reset = ManifestSystem.resetPickup(loaded);
    expect(reset.ferry.placements.map((placement) => placement.vehicleId).sort()).toEqual(arrival.lockedVehicleIds.slice().sort());
    expect(reset.lockedVehicleIds).toEqual(arrival.lockedVehicleIds);
    expect(ManifestSystem.initialState(level).portIndex).toBe(0);
  });

  it('enforces valid phase transitions', () => {
    const initial = ManifestSystem.initialState(getLevel(31));
    const sailing = ManifestSystem.transition(initial, 'sailing');
    expect(sailing?.phase).toBe('sailing');
    const unloading = ManifestSystem.transition(sailing!, 'unloading');
    expect(unloading?.phase).toBe('unloading');
    expect(ManifestSystem.transition(unloading!, 'pickup')?.phase).toBe('pickup');
    expect(ManifestSystem.transition(initial, 'pickup')).toBeNull();
    expect(ManifestSystem.transition({ ...initial, phase: 'complete' }, 'sailing')).toBeNull();
  });

  it('rejects invalid pickup destinations and duplicate runtime IDs', () => {
    const level = getLevel(31);
    const invalidDestination = { ...level, pickups: [{ port: 'B', vehicles: [{ id: 'bad', type: 'car' as const, destination: 'A' }] }] };
    expect(ManifestSystem.validateLevelData(invalidDestination)).toContain('Invalid destination for pickup bad');
    const duplicate = { ...level, pickups: [{ port: 'B', vehicles: [{ ...level.vehicles[0]!, destination: 'C' }] }] };
    expect(ManifestSystem.validateLevelData(duplicate).some((error) => error.startsWith('Duplicate vehicle id'))).toBe(true);
  });

  it('solves pickup destination, priority, tide and two-port integration', () => {
    for (const levelId of [33, 35, 36, 37]) {
      const solution = LevelSolver.solveManifest(getLevel(levelId));
      expect(solution, `Level ${levelId} dynamic route`).not.toBeNull();
      expect(solution?.finalState.phase).toBe('complete');
    }
  });
});

describe('handcrafted levels', () => {
  it('contains exactly Levels 1–40', () => {
    expect(LEVELS.map((level) => level.id)).toEqual(Array.from({ length: 40 }, (_, index) => index + 1));
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

  it.each([11, 16, 20])('Level %i has a full-route solver solution', (levelId) => {
    const level = getLevel(levelId);
    const solution = LevelSolver.solve(level);
    expect(solution).not.toBeNull();
    expect(RouteSystem.simulate(level, solution!).valid).toBe(true);
  });

  it.each([21, 23, 26, 29, 30])('Tidal Level %i has a full-route solver solution', (levelId) => {
    const level = getLevel(levelId);
    const solution = LevelSolver.solve(level);
    expect(solution).not.toBeNull();
    const route = RouteSystem.simulate(level, solution!);
    expect(route.valid).toBe(true);
    expect(route.tideChecks.every((check) => check.safe)).toBe(true);
  });

  it.each([31, 32, 36, 37, 39, 40])('Dynamic Manifest Level %i has a complete multi-stage solution', (levelId) => {
    const solution = LevelSolver.solveManifest(getLevel(levelId));
    expect(solution).not.toBeNull();
    expect(solution?.finalState.phase).toBe('complete');
    expect(solution?.finalState.ferry.placements).toEqual([]);
  });
});
