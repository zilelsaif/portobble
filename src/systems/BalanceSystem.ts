import { getVehicleDefinition } from '../data/vehicles';
import type { FerryState, LevelDefinition } from '../models/game';

export type BalanceLabel = 'PERFECT' | 'SAFE' | 'WARNING' | 'UNSAFE';

export interface BalanceResult {
  value: number;
  absolute: number;
  valid: boolean;
  label: BalanceLabel;
}

export class BalanceSystem {
  static calculate(level: LevelDefinition, state: FerryState): BalanceResult {
    let value = 0;
    for (const placement of state.placements) {
      const vehicle = level.vehicles.find((item) => item.id === placement.vehicleId);
      if (!vehicle) continue;
      const weight = getVehicleDefinition(vehicle.type).weight;
      value += placement.lane === 0 ? -weight : weight;
    }
    const absolute = Math.abs(value);
    const valid = absolute <= level.ferry.balanceTolerance;
    const warningLimit = level.ferry.balanceTolerance + 2;
    const label: BalanceLabel = absolute <= level.ferry.perfectBalanceThreshold
      ? 'PERFECT'
      : valid
        ? 'SAFE'
        : absolute <= warningLimit
          ? 'WARNING'
          : 'UNSAFE';
    return { value, absolute, valid, label };
  }

  static totalWeight(level: LevelDefinition, state: FerryState): number {
    return state.placements.reduce((sum, placement) => {
      const vehicle = level.vehicles.find((item) => item.id === placement.vehicleId);
      return sum + (vehicle ? getVehicleDefinition(vehicle.type).weight : 0);
    }, 0);
  }
}
