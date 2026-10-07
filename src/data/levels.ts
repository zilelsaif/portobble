import type { LevelDefinition, VehicleInstance, VehicleType } from '../models/game';

const vehicles = (...types: Array<VehicleType | [VehicleType, number]>): VehicleInstance[] =>
  types.map((entry, index) => {
    const [type, priority] = Array.isArray(entry) ? entry : [entry, undefined];
    return { id: `${type}-${index + 1}`, type, ...(priority ? { priority } : {}) };
  });

const ferry = (
  balanceTolerance: number,
  goodBalanceThreshold: number,
  perfectBalanceThreshold: number,
  maxWeight = 18,
) => ({
  lanes: 2 as const,
  cellsPerLane: 5 as const,
  maxWeight,
  balanceTolerance,
  goodBalanceThreshold,
  perfectBalanceThreshold,
});

export const LEVELS: LevelDefinition[] = [
  { id: 1, title: 'First Crossing', hint: 'Drag both cars aboard, then SAIL.', ferry: ferry(4, 2, 0, 6), vehicles: vehicles('car', 'car'), rules: { requireAllVehicles: true, priorityExit: false } },
  { id: 2, title: 'Long & Short', hint: 'Vehicle length decides how many cells it needs.', ferry: ferry(5, 3, 1, 8), vehicles: vehicles('motorcycle', 'car', 'car'), rules: { requireAllVehicles: true, priorityExit: false } },
  { id: 3, title: 'Two Sides', hint: 'Use both lanes to keep the deck tidy.', ferry: ferry(2, 1, 1, 9), vehicles: vehicles('motorcycle', 'car', 'van'), rules: { requireAllVehicles: true, priorityExit: false } },
  { id: 4, title: 'Even Keel', hint: 'Split the weight between PORT and STARBOARD.', ferry: ferry(1, 1, 0, 11), vehicles: vehicles('car', 'car', 'motorcycle', 'van'), rules: { requireAllVehicles: true, priorityExit: false } },
  { id: 5, title: 'Heavy Haul', hint: 'A truck needs weight on the other side.', ferry: ferry(2, 1, 1, 13), vehicles: vehicles('truck', 'car', 'motorcycle', 'van'), rules: { requireAllVehicles: true, priorityExit: false } },
  { id: 6, title: 'Clear the Way', hint: 'AMBULANCE MUST EXIT FIRST. Exits are on the right.', ferry: ferry(4, 2, 1, 12), vehicles: vehicles(['ambulance', 1], 'truck', 'car'), rules: { requireAllVehicles: true, priorityExit: true } },
  { id: 7, title: 'Priority Lane', hint: 'Keep the ambulance path clear while balancing.', ferry: ferry(2, 1, 1, 15), vehicles: vehicles(['ambulance', 1], 'van', 'car', 'car', 'motorcycle'), rules: { requireAllVehicles: true, priorityExit: true } },
  { id: 8, title: 'Full Deck', hint: 'Every cell matters. Balance a completely full ferry.', ferry: ferry(1, 1, 0, 18), vehicles: vehicles('van', 'van', 'car', 'car', 'motorcycle', 'motorcycle'), rules: { requireAllVehicles: true, priorityExit: false } },
  { id: 9, title: 'Tight Passage', hint: 'Heavy cargo and a priority vehicle share limited room.', ferry: ferry(2, 1, 1, 16), vehicles: vehicles('truck', ['ambulance', 1], 'car', 'motorcycle', 'motorcycle'), rules: { requireAllVehicles: true, priorityExit: true } },
  { id: 10, title: 'Harbour Master', hint: 'Fit, balance, and preserve the emergency exit.', ferry: ferry(1, 1, 1, 18), vehicles: vehicles('truck', ['ambulance', 1], 'van', 'motorcycle', 'motorcycle'), rules: { requireAllVehicles: true, priorityExit: true } },
];

export function getLevel(levelId: number): LevelDefinition {
  const level = LEVELS.find((candidate) => candidate.id === levelId);
  if (!level) throw new Error(`Unknown level ${levelId}`);
  return level;
}
