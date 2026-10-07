import type { VehicleDefinition, VehicleType } from '../models/game';

export const VEHICLE_DEFINITIONS: Record<VehicleType, VehicleDefinition> = {
  motorcycle: {
    id: 'motorcycle', displayName: 'Motorcycle', shortLabel: 'BIKE',
    length: 1, weight: 1, color: 0xf5c451, accent: 0x493d2b,
  },
  car: {
    id: 'car', displayName: 'Car', shortLabel: 'CAR',
    length: 2, weight: 2, color: 0x5cb5d9, accent: 0x173b55,
  },
  van: {
    id: 'van', displayName: 'Van', shortLabel: 'VAN',
    length: 2, weight: 3, color: 0xd59a62, accent: 0x533421,
  },
  ambulance: {
    id: 'ambulance', displayName: 'Ambulance', shortLabel: 'MED',
    length: 2, weight: 3, canBePriority: true, color: 0xf2eee3, accent: 0xd84f4f,
  },
  truck: {
    id: 'truck', displayName: 'Truck', shortLabel: 'TRUCK',
    length: 3, weight: 5, color: 0x7d8f65, accent: 0x2f4030,
  },
};

export function getVehicleDefinition(type: VehicleType): VehicleDefinition {
  return VEHICLE_DEFINITIONS[type];
}
