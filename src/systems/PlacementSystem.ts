import { getVehicleDefinition } from '../data/vehicles';
import type { FerryState, LevelDefinition, Placement } from '../models/game';
import { findLevelVehicle } from './LevelVehicleCatalog';

export interface PlacementResult {
  valid: boolean;
  reason?: 'UNKNOWN_VEHICLE' | 'OUT_OF_BOUNDS' | 'OVERLAP';
}

export class PlacementSystem {
  static validate(level: LevelDefinition, state: FerryState, candidate: Placement): PlacementResult {
    const vehicle = findLevelVehicle(level, candidate.vehicleId);
    if (!vehicle) return { valid: false, reason: 'UNKNOWN_VEHICLE' };
    const definition = getVehicleDefinition(vehicle.type);
    if (candidate.lane < 0 || candidate.lane >= level.ferry.lanes || candidate.startCell < 0 || candidate.startCell + definition.length > level.ferry.cellsPerLane) {
      return { valid: false, reason: 'OUT_OF_BOUNDS' };
    }
    const occupied = new Set<number>();
    for (const placement of state.placements) {
      if (placement.vehicleId === candidate.vehicleId || placement.lane !== candidate.lane) continue;
      const other = findLevelVehicle(level, placement.vehicleId);
      if (!other) continue;
      const otherLength = getVehicleDefinition(other.type).length;
      for (let cell = placement.startCell; cell < placement.startCell + otherLength; cell += 1) occupied.add(cell);
    }
    for (let cell = candidate.startCell; cell < candidate.startCell + definition.length; cell += 1) {
      if (occupied.has(cell)) return { valid: false, reason: 'OVERLAP' };
    }
    return { valid: true };
  }

  static validateState(level: LevelDefinition, state: FerryState): boolean {
    const ids = new Set<string>();
    return state.placements.every((placement) => {
      if (ids.has(placement.vehicleId)) return false;
      ids.add(placement.vehicleId);
      return this.validate(level, state, placement).valid;
    });
  }
}
