import type { LevelDefinition, VehicleInstance } from '../models/game';

export function allLevelVehicles(level: LevelDefinition): VehicleInstance[] {
  return [...level.vehicles, ...(level.pickups ?? []).flatMap((pickup) => pickup.vehicles)];
}

export function findLevelVehicle(level: LevelDefinition, vehicleId: string): VehicleInstance | undefined {
  return allLevelVehicles(level).find((vehicle) => vehicle.id === vehicleId);
}
