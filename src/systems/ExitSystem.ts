import { getVehicleDefinition } from '../data/vehicles';
import type { ExitValidationResult, FerryState, LevelDefinition, Placement } from '../models/game';
import { allLevelVehicles, findLevelVehicle } from './LevelVehicleCatalog';

export class ExitSystem {
  static validateExitOrder(level: LevelDefinition, state: FerryState): ExitValidationResult {
    if (!level.rules.priorityExit) return { valid: true, issues: [] };
    const issues = [];
    for (const vehicle of allLevelVehicles(level).filter((item) => item.priority !== undefined)) {
      const priorityPlacement = state.placements.find((item) => item.vehicleId === vehicle.id);
      if (!priorityPlacement) continue;
      const priorityEnd = priorityPlacement.startCell + getVehicleDefinition(vehicle.type).length;
      const blockers = state.placements
        .filter((candidate) => candidate.lane === priorityPlacement.lane && candidate.vehicleId !== vehicle.id)
        .filter((candidate) => candidate.startCell >= priorityEnd)
        .sort((a, b) => b.startCell - a.startCell);
      const blocker = blockers[0];
      if (blocker) issues.push({ blockedVehicleId: vehicle.id, blockerVehicleId: blocker.vehicleId });
    }
    return { valid: issues.length === 0, issues };
  }

  static unloadingOrder(level: LevelDefinition, state: FerryState): Placement[] {
    return [...state.placements].sort((a, b) => {
      const vehicleA = findLevelVehicle(level, a.vehicleId);
      const vehicleB = findLevelVehicle(level, b.vehicleId);
      const priorityA = vehicleA?.priority ?? Number.MAX_SAFE_INTEGER;
      const priorityB = vehicleB?.priority ?? Number.MAX_SAFE_INTEGER;
      if (priorityA !== priorityB) return priorityA - priorityB;
      if (a.lane !== b.lane) return a.lane - b.lane;
      return b.startCell - a.startCell;
    });
  }
}
