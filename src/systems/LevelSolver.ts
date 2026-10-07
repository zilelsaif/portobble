import { getVehicleDefinition } from '../data/vehicles';
import type { FerryState, LevelDefinition, Placement } from '../models/game';
import { LevelValidator } from './LevelValidator';
import { PlacementSystem } from './PlacementSystem';

export class LevelSolver {
  static solve(level: LevelDefinition): FerryState | null {
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
}
