import { getVehicleDefinition } from '../data/vehicles';
import type { FerryState, LevelDefinition, ManifestSolution, ManifestState, Placement } from '../models/game';
import { LevelValidator } from './LevelValidator';
import { PlacementSystem } from './PlacementSystem';
import { ManifestSystem } from './ManifestSystem';
import { findLevelVehicle } from './LevelVehicleCatalog';

export class LevelSolver {
  static solve(level: LevelDefinition): FerryState | null {
    if (level.pickups?.length) return this.solveManifest(level)?.stages[0]?.departureState ?? null;
    const search = (index: number, placements: Placement[]): FerryState | null => {
      if (index === level.vehicles.length) {
        const state = { placements };
        return LevelValidator.validate(level, state).valid ? state : null;
      }
      const vehicle = level.vehicles[index];
      if (!vehicle) return null;
      const length = getVehicleDefinition(vehicle.type).length;
      for (const lane of [0, 1] as const) {
        for (let startCell = 0; startCell <= level.ferry.cellsPerLane - length; startCell += 1) {
          const candidate = { vehicleId: vehicle.id, lane, startCell };
          const state = { placements };
          if (!PlacementSystem.validate(level, state, candidate).valid) continue;
          const result = search(index + 1, [...placements, candidate]);
          if (result) return result;
        }
      }
      return null;
    };
    return search(0, []);
  }

  static solveManifest(level: LevelDefinition): ManifestSolution | null {
    if (!level.route) return null;
    const errors = ManifestSystem.validateLevelData(level);
    if (errors.length) return null;

    const searchStage = (state: ManifestState, stages: ManifestSolution['stages']): ManifestSolution | null => {
      if (state.phase === 'complete') return { stages, finalState: state };
      const waiting = state.waitingVehicleIds;
      const placeWaiting = (index: number, placements: Placement[]): ManifestSolution | null => {
        if (index === waiting.length) {
          const departure = { ...state, ferry: { placements }, phase: state.phase };
          if (!ManifestSystem.validateDeparture(level, departure).valid) return null;
          const port = level.route!.ports[state.portIndex]!;
          const arrived = ManifestSystem.arrive(level, departure);
          return searchStage(arrived, [...stages, { port, departureState: { placements: placements.map((placement) => ({ ...placement })) } }]);
        }
        const vehicleId = waiting[index]!;
        const vehicle = findLevelVehicle(level, vehicleId);
        if (!vehicle) return null;
        const length = getVehicleDefinition(vehicle.type).length;
        for (const lane of [0, 1] as const) {
          for (let startCell = 0; startCell <= level.ferry.cellsPerLane - length; startCell += 1) {
            const candidate = { vehicleId, lane, startCell };
            const partial = { placements };
            if (!PlacementSystem.validate(level, partial, candidate).valid) continue;
            const result = placeWaiting(index + 1, [...placements, candidate]);
            if (result) return result;
          }
        }
        return null;
      };
      return placeWaiting(0, state.ferry.placements.map((placement) => ({ ...placement })));
    };

    return searchStage(ManifestSystem.initialState(level), []);
  }
}
