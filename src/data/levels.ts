import type { LevelDefinition, MasteryObjective, VehicleInstance, VehicleType } from '../models/game';

const vehicles = (...types: Array<VehicleType | [VehicleType, number]>): VehicleInstance[] =>
  types.map((entry, index) => {
    const [type, priority] = Array.isArray(entry) ? entry : [entry, undefined];
    return { id: `${type}-${index + 1}`, type, ...(priority ? { priority } : {}) };
  });

const routedVehicles = (...entries: Array<[VehicleType, string, number?]>): VehicleInstance[] =>
  entries.map(([type, destination, priority], index) => ({
    id: `${type}-${index + 1}`,
    type,
    destination,
    ...(priority ? { priority } : {}),
  }));

const manifestVehicles = (prefix: string, ...entries: Array<[VehicleType, string, number?]>): VehicleInstance[] =>
  entries.map(([type, destination, priority], index) => ({
    id: `${prefix}-${type}-${index + 1}`,
    type,
    destination,
    ...(priority ? { priority } : {}),
  }));

const route = (...ports: string[]) => ({ ports, startPort: ports[0]! });

const tidalRoute = (
  ports: string[],
  legs: Array<[string, string, 'high' | 'mid' | 'low', number]>,
) => ({
  ports,
  startPort: ports[0]!,
  legs: legs.map(([from, to, tide, maxDraft]) => ({ from, to, tide, maxDraft })),
});

const tideRules = { heelDraftFactor: 1 };

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

const LEVEL_DEFINITIONS: LevelDefinition[] = [
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
  { id: 11, title: 'Port Labels', hint: 'Badges show where each vehicle must leave.', ferry: ferry(6, 3, 1, 10), route: route('A', 'B', 'C'), vehicles: routedVehicles(['car', 'B'], ['car', 'C'], ['van', 'C']), rules: { requireAllVehicles: true, priorityExit: false } },
  { id: 12, title: 'Seabrook First', hint: 'Keep the Seabrook Harbour car ahead of Marlow Quay cargo.', ferry: ferry(6, 3, 1, 10), route: route('A', 'B', 'C'), vehicles: routedVehicles(['car', 'B'], ['truck', 'C'], ['motorcycle', 'C']), rules: { requireAllVehicles: true, priorityExit: false } },
  { id: 13, title: 'Clear Seabrook', hint: 'Both Seabrook Harbour vehicles must leave before Marlow Quay.', ferry: ferry(5, 3, 1, 12), route: route('A', 'B', 'C'), vehicles: routedVehicles(['car', 'B'], ['van', 'B'], ['truck', 'C'], ['motorcycle', 'C']), rules: { requireAllVehicles: true, priorityExit: false } },
  { id: 14, title: 'Split Manifest', hint: 'Use both lanes and preserve destination order.', ferry: ferry(4, 2, 1, 14), route: route('A', 'B', 'C'), vehicles: routedVehicles(['van', 'B'], ['car', 'C'], ['car', 'B'], ['motorcycle', 'C'], ['van', 'C']), rules: { requireAllVehicles: true, priorityExit: false } },
  { id: 15, title: 'Balanced Route', hint: 'Destination order and balance both matter.', ferry: ferry(2, 1, 1, 15), route: route('A', 'B', 'C'), vehicles: routedVehicles(['truck', 'C'], ['car', 'B'], ['van', 'C'], ['motorcycle', 'B'], ['car', 'C']), rules: { requireAllVehicles: true, priorityExit: false } },
  { id: 16, title: 'Priority Port', hint: 'The Seabrook Harbour ambulance must leave before its car.', ferry: ferry(4, 2, 1, 14), route: route('A', 'B', 'C'), vehicles: routedVehicles(['ambulance', 'B', 1], ['car', 'B'], ['truck', 'C'], ['motorcycle', 'C']), rules: { requireAllVehicles: true, priorityExit: true } },
  { id: 17, title: 'Three Stops', hint: 'Plan B, then C, then D in each lane.', ferry: ferry(3, 2, 1, 15), route: route('A', 'B', 'C', 'D'), vehicles: routedVehicles(['car', 'B'], ['motorcycle', 'B'], ['van', 'C'], ['car', 'C'], ['truck', 'D']), rules: { requireAllVehicles: true, priorityExit: false } },
  { id: 18, title: 'Deep Manifest', hint: 'Mixed lengths make every stop count.', ferry: ferry(2, 1, 1, 15), route: route('A', 'B', 'C', 'D'), vehicles: routedVehicles(['truck', 'D'], ['van', 'C'], ['car', 'B'], ['car', 'C'], ['motorcycle', 'B']), rules: { requireAllVehicles: true, priorityExit: false } },
  { id: 19, title: 'Emergency Route', hint: 'Priority, three destinations, space and balance.', ferry: ferry(2, 1, 1, 16), route: route('A', 'B', 'C', 'D'), vehicles: routedVehicles(['ambulance', 'B', 1], ['car', 'B'], ['van', 'C'], ['truck', 'D'], ['motorcycle', 'C']), rules: { requireAllVehicles: true, priorityExit: true } },
  { id: 20, title: 'Portobble Master', hint: 'Master weight, balance, priority and every destination.', ferry: ferry(1, 1, 1, 15), route: route('A', 'B', 'C', 'D'), vehicles: routedVehicles(['truck', 'D'], ['ambulance', 'B', 1], ['car', 'B'], ['motorcycle', 'C'], ['motorcycle', 'D']), rules: { requireAllVehicles: true, priorityExit: true } },
  { id: 21, title: 'Low Water', hint: 'Balance the cars to cross at low tide.', ferry: ferry(4, 2, 0, 8), route: tidalRoute(['A', 'B', 'C'], [['A', 'B', 'low', 4], ['B', 'C', 'high', 6]]), tideRules, vehicles: routedVehicles(['car', 'B'], ['car', 'C']), rules: { requireAllVehicles: true, priorityExit: false } },
  { id: 22, title: 'Shallow Balance', hint: 'A safe ferry can still sit too deep when it heels.', ferry: ferry(3, 1, 0, 10), route: tidalRoute(['A', 'B', 'C'], [['A', 'B', 'low', 7], ['B', 'C', 'mid', 8]]), tideRules, vehicles: routedVehicles(['car', 'B'], ['van', 'C'], ['motorcycle', 'C']), rules: { requireAllVehicles: true, priorityExit: false } },
  { id: 23, title: 'High Then Low', hint: 'Plan the remaining Marlow load for shallow water.', ferry: ferry(3, 1, 0, 10), route: tidalRoute(['A', 'B', 'C'], [['A', 'B', 'high', 10], ['B', 'C', 'low', 6]]), tideRules, vehicles: routedVehicles(['car', 'B'], ['van', 'C'], ['motorcycle', 'C']), rules: { requireAllVehicles: true, priorityExit: false } },
  { id: 24, title: 'Tidal Manifest', hint: 'Clear Seabrook before the shallow Marlow passage.', ferry: ferry(3, 2, 1, 13), route: tidalRoute(['A', 'B', 'C'], [['A', 'B', 'high', 14], ['B', 'C', 'low', 10]]), tideRules, vehicles: routedVehicles(['van', 'B'], ['car', 'B'], ['truck', 'C'], ['motorcycle', 'C']), rules: { requireAllVehicles: true, priorityExit: false } },
  { id: 25, title: 'Heavy Waterline', hint: 'Distribute the truck load for the low-tide departure.', ferry: ferry(2, 1, 0, 13), route: tidalRoute(['A', 'B', 'C'], [['A', 'B', 'low', 12], ['B', 'C', 'mid', 12]]), tideRules, vehicles: routedVehicles(['truck', 'C'], ['car', 'B'], ['motorcycle', 'C'], ['van', 'C']), rules: { requireAllVehicles: true, priorityExit: false } },
  { id: 26, title: 'Priority Clearance', hint: 'Clear the ambulance and keep enough water beneath the ferry.', ferry: ferry(2, 1, 0, 14), route: tidalRoute(['A', 'B', 'C'], [['A', 'B', 'low', 12], ['B', 'C', 'mid', 11]]), tideRules, vehicles: routedVehicles(['ambulance', 'B', 1], ['car', 'B'], ['truck', 'C'], ['motorcycle', 'C']), rules: { requireAllVehicles: true, priorityExit: true } },
  { id: 27, title: 'Three Tides', hint: 'Plan for high, low and mid tide across the full route.', ferry: ferry(2, 1, 0, 15), route: tidalRoute(['A', 'B', 'C', 'D'], [['A', 'B', 'high', 16], ['B', 'C', 'low', 10], ['C', 'D', 'mid', 10]]), tideRules, vehicles: routedVehicles(['car', 'B'], ['motorcycle', 'B'], ['van', 'C'], ['car', 'C'], ['truck', 'D']), rules: { requireAllVehicles: true, priorityExit: false } },
  { id: 28, title: 'Marlow Channel', hint: 'The channel to Marlow Quay is narrow at low tide.', ferry: ferry(3, 1, 0, 14), route: tidalRoute(['A', 'B', 'C', 'D'], [['A', 'B', 'high', 14], ['B', 'C', 'low', 10], ['C', 'D', 'mid', 10]]), tideRules, vehicles: routedVehicles(['truck', 'D'], ['van', 'C'], ['car', 'B'], ['motorcycle', 'C']), rules: { requireAllVehicles: true, priorityExit: false } },
  { id: 29, title: 'After Seabrook', hint: 'Plan the balance that remains after Seabrook unloads.', ferry: ferry(3, 1, 0, 14), route: tidalRoute(['A', 'B', 'C', 'D'], [['A', 'B', 'high', 14], ['B', 'C', 'low', 10], ['C', 'D', 'mid', 10]]), tideRules, vehicles: routedVehicles(['car', 'B'], ['van', 'C'], ['truck', 'D'], ['motorcycle', 'D']), rules: { requireAllVehicles: true, priorityExit: false } },
  { id: 30, title: 'Tidal Harbour Master', hint: 'Master priority, destinations and every water clearance.', ferry: ferry(2, 1, 0, 15), route: tidalRoute(['A', 'B', 'C', 'D'], [['A', 'B', 'high', 16], ['B', 'C', 'low', 10], ['C', 'D', 'mid', 10]]), tideRules, vehicles: routedVehicles(['ambulance', 'B', 1], ['car', 'B'], ['van', 'C'], ['truck', 'D'], ['motorcycle', 'C']), rules: { requireAllVehicles: true, priorityExit: true } },
  { id: 31, title: 'First Exchange', hint: 'Leave room for a Seabrook pickup.', ferry: ferry(5, 3, 1, 12), route: tidalRoute(['A', 'B', 'C'], [['A', 'B', 'high', 12], ['B', 'C', 'high', 12]]), tideRules, vehicles: manifestVehicles('a', ['car', 'B'], ['van', 'C']), pickups: [{ port: 'B', vehicles: manifestVehicles('b', ['motorcycle', 'C']) }], rules: { requireAllVehicles: true, priorityExit: false } },
  { id: 32, title: 'Save the Space', hint: 'Plan the first load around future cargo.', ferry: ferry(5, 3, 1, 14), route: tidalRoute(['A', 'B', 'C'], [['A', 'B', 'high', 14], ['B', 'C', 'mid', 14]]), tideRules, vehicles: manifestVehicles('a', ['truck', 'C'], ['car', 'B']), pickups: [{ port: 'B', vehicles: manifestVehicles('b', ['van', 'C']) }], rules: { requireAllVehicles: true, priorityExit: false } },
  { id: 33, title: 'Pickup Order', hint: 'Marlow cargo must leave before Ironhaven cargo.', ferry: ferry(5, 3, 1, 15), route: tidalRoute(['A', 'B', 'C', 'D'], [['A', 'B', 'high', 15], ['B', 'C', 'high', 15], ['C', 'D', 'mid', 12]]), tideRules, vehicles: manifestVehicles('a', ['car', 'B'], ['truck', 'D']), pickups: [{ port: 'B', vehicles: manifestVehicles('b', ['car', 'C'], ['motorcycle', 'D']) }], rules: { requireAllVehicles: true, priorityExit: false } },
  { id: 34, title: 'Exchange Balance', hint: 'Use the new cargo to restore balance.', ferry: ferry(3, 2, 1, 15), route: tidalRoute(['A', 'B', 'C'], [['A', 'B', 'high', 15], ['B', 'C', 'mid', 14]]), tideRules, vehicles: manifestVehicles('a', ['van', 'C'], ['car', 'B']), pickups: [{ port: 'B', vehicles: manifestVehicles('b', ['truck', 'C']) }], rules: { requireAllVehicles: true, priorityExit: false } },
  { id: 35, title: 'Shallow Exchange', hint: 'Pickup weight must clear the next low tide.', ferry: ferry(3, 1, 0, 15), route: tidalRoute(['A', 'B', 'C'], [['A', 'B', 'high', 15], ['B', 'C', 'low', 12]]), tideRules, vehicles: manifestVehicles('a', ['truck', 'C'], ['car', 'B']), pickups: [{ port: 'B', vehicles: manifestVehicles('b', ['van', 'C'], ['motorcycle', 'C']) }], rules: { requireAllVehicles: true, priorityExit: false } },
  { id: 36, title: 'Pickup Priority', hint: 'Load the Seabrook ambulance for a clear Marlow exit.', ferry: ferry(4, 2, 1, 16), route: tidalRoute(['A', 'B', 'C', 'D'], [['A', 'B', 'high', 16], ['B', 'C', 'mid', 15], ['C', 'D', 'mid', 12]]), tideRules, vehicles: manifestVehicles('a', ['car', 'B'], ['truck', 'D']), pickups: [{ port: 'B', vehicles: manifestVehicles('b', ['ambulance', 'C', 1], ['motorcycle', 'D']) }], rules: { requireAllVehicles: true, priorityExit: true } },
  { id: 37, title: 'Two Exchanges', hint: 'Plan for pickups at Seabrook and Marlow.', ferry: ferry(5, 3, 1, 16), route: tidalRoute(['A', 'B', 'C', 'D'], [['A', 'B', 'high', 16], ['B', 'C', 'mid', 15], ['C', 'D', 'mid', 14]]), tideRules, vehicles: manifestVehicles('a', ['car', 'B'], ['van', 'D']), pickups: [{ port: 'B', vehicles: manifestVehicles('b', ['car', 'C']) }, { port: 'C', vehicles: manifestVehicles('c', ['motorcycle', 'D']) }], rules: { requireAllVehicles: true, priorityExit: false } },
  { id: 38, title: 'Through Cargo', hint: 'The Ironhaven truck stays locked through every exchange.', ferry: ferry(4, 2, 1, 17), route: tidalRoute(['A', 'B', 'C', 'D'], [['A', 'B', 'high', 17], ['B', 'C', 'mid', 16], ['C', 'D', 'mid', 14]]), tideRules, vehicles: manifestVehicles('a', ['truck', 'D'], ['car', 'B']), pickups: [{ port: 'B', vehicles: manifestVehicles('b', ['van', 'C']) }, { port: 'C', vehicles: manifestVehicles('c', ['motorcycle', 'D']) }], rules: { requireAllVehicles: true, priorityExit: false } },
  { id: 39, title: 'Tidal Exchange', hint: 'Each pickup changes the load for the next passage.', ferry: ferry(3, 2, 1, 17), route: tidalRoute(['A', 'B', 'C', 'D'], [['A', 'B', 'high', 17], ['B', 'C', 'low', 13], ['C', 'D', 'low', 11]]), tideRules, vehicles: manifestVehicles('a', ['van', 'D'], ['car', 'B']), pickups: [{ port: 'B', vehicles: manifestVehicles('b', ['truck', 'C']) }, { port: 'C', vehicles: manifestVehicles('c', ['car', 'D'], ['motorcycle', 'D']) }], rules: { requireAllVehicles: true, priorityExit: false } },
  { id: 40, title: 'Harbour Exchange Master', hint: 'Master locked cargo, pickups, priority and Tide.', ferry: ferry(3, 2, 1, 18), route: tidalRoute(['A', 'B', 'C', 'D'], [['A', 'B', 'high', 18], ['B', 'C', 'low', 14], ['C', 'D', 'mid', 13]]), tideRules, vehicles: manifestVehicles('a', ['truck', 'D'], ['car', 'B']), pickups: [{ port: 'B', vehicles: manifestVehicles('b', ['ambulance', 'C', 1], ['motorcycle', 'D']) }, { port: 'C', vehicles: manifestVehicles('c', ['van', 'D']) }], rules: { requireAllVehicles: true, priorityExit: true } },
  { id: 41, title: 'Balance Masterclass', hint: 'Tight balance and destination order leave no wasted space.', ferry: ferry(2, 1, 1, 16), route: route('A', 'B', 'C', 'D'), vehicles: routedVehicles(['truck', 'D'], ['car', 'B'], ['van', 'C'], ['motorcycle', 'B'], ['car', 'D']), rules: { requireAllVehicles: true, priorityExit: false } },
  { id: 42, title: 'Destination Stack', hint: 'Stack both lanes so each destination clears in sequence.', ferry: ferry(3, 2, 1, 16), route: route('A', 'B', 'C', 'D'), vehicles: routedVehicles(['van', 'B'], ['car', 'B'], ['truck', 'D'], ['car', 'C'], ['motorcycle', 'C']), rules: { requireAllVehicles: true, priorityExit: false } },
  { id: 43, title: 'Tidal Precision', hint: 'Plan each unload for the shallow legs that follow.', ferry: ferry(2, 1, 0, 15), route: tidalRoute(['A', 'B', 'C', 'D'], [['A', 'B', 'high', 16], ['B', 'C', 'low', 10], ['C', 'D', 'low', 10]]), tideRules, vehicles: routedVehicles(['ambulance', 'B', 1], ['car', 'B'], ['van', 'C'], ['truck', 'D'], ['motorcycle', 'C']), rules: { requireAllVehicles: true, priorityExit: true } },
  { id: 44, title: 'Harbour Exchange', hint: 'Transform the deck around locked cargo at Seabrook and Marlow.', ferry: ferry(4, 2, 1, 17), route: tidalRoute(['A', 'B', 'C', 'D'], [['A', 'B', 'high', 17], ['B', 'C', 'mid', 15], ['C', 'D', 'mid', 13]]), tideRules, vehicles: manifestVehicles('a', ['truck', 'D'], ['car', 'B']), pickups: [{ port: 'B', vehicles: manifestVehicles('b', ['van', 'C']) }, { port: 'C', vehicles: manifestVehicles('c', ['car', 'D']) }], rules: { requireAllVehicles: true, priorityExit: false } },
  { id: 45, title: 'Priority Route', hint: 'Protect the ambulance exit across a shallow destination route.', ferry: ferry(3, 2, 1, 16), route: tidalRoute(['A', 'B', 'C', 'D'], [['A', 'B', 'low', 14], ['B', 'C', 'mid', 12], ['C', 'D', 'mid', 10]]), tideRules, vehicles: routedVehicles(['ambulance', 'B', 1], ['car', 'B'], ['truck', 'D'], ['van', 'C'], ['motorcycle', 'D']), rules: { requireAllVehicles: true, priorityExit: true } },
  { id: 46, title: 'Full Manifest', hint: 'Reserve space for two exchanges while through-cargo stays locked.', ferry: ferry(4, 2, 1, 18), route: tidalRoute(['A', 'B', 'C', 'D'], [['A', 'B', 'high', 18], ['B', 'C', 'mid', 16], ['C', 'D', 'mid', 14]]), tideRules, vehicles: manifestVehicles('a', ['truck', 'D'], ['car', 'B']), pickups: [{ port: 'B', vehicles: manifestVehicles('b', ['van', 'C'], ['motorcycle', 'D']) }, { port: 'C', vehicles: manifestVehicles('c', ['car', 'D']) }], rules: { requireAllVehicles: true, priorityExit: false } },
  { id: 47, title: 'Shallow Exchange', hint: 'Rebalance the heavy pickup before the low-water crossing.', ferry: ferry(3, 1, 0, 17), route: tidalRoute(['A', 'B', 'C'], [['A', 'B', 'high', 17], ['B', 'C', 'low', 13]]), tideRules, vehicles: manifestVehicles('a', ['van', 'C'], ['car', 'B']), pickups: [{ port: 'B', vehicles: manifestVehicles('b', ['truck', 'C'], ['motorcycle', 'C']) }], rules: { requireAllVehicles: true, priorityExit: false } },
  { id: 48, title: 'Three-Port Pressure', hint: 'Balance destination groups, Tide and priority over four ports.', ferry: ferry(3, 2, 1, 17), route: tidalRoute(['A', 'B', 'C', 'D'], [['A', 'B', 'high', 17], ['B', 'C', 'low', 12], ['C', 'D', 'mid', 11]]), tideRules, vehicles: routedVehicles(['ambulance', 'B', 1], ['car', 'B'], ['truck', 'D'], ['van', 'C'], ['motorcycle', 'C']), rules: { requireAllVehicles: true, priorityExit: true } },
  { id: 49, title: 'Master Logistics', hint: 'Coordinate priority, Tide and both exchanges without crowding the ramp.', ferry: ferry(3, 2, 1, 18), route: tidalRoute(['A', 'B', 'C', 'D'], [['A', 'B', 'high', 18], ['B', 'C', 'low', 14], ['C', 'D', 'mid', 12]]), tideRules, vehicles: manifestVehicles('a', ['truck', 'D'], ['car', 'B']), pickups: [{ port: 'B', vehicles: manifestVehicles('b', ['ambulance', 'C', 1], ['motorcycle', 'D']) }, { port: 'C', vehicles: manifestVehicles('c', ['car', 'D']) }], rules: { requireAllVehicles: true, priorityExit: true } },
  { id: 50, title: 'Portobble Finale', hint: 'Read the whole route, reserve pickup space and master every constraint.', ferry: ferry(3, 2, 1, 18), route: tidalRoute(['A', 'B', 'C', 'D'], [['A', 'B', 'high', 18], ['B', 'C', 'low', 14], ['C', 'D', 'low', 12]]), tideRules, vehicles: manifestVehicles('a', ['truck', 'D'], ['ambulance', 'B', 1], ['car', 'C']), pickups: [{ port: 'B', vehicles: manifestVehicles('b', ['van', 'C'], ['motorcycle', 'D']) }, { port: 'C', vehicles: manifestVehicles('c', ['car', 'D']) }], rules: { requireAllVehicles: true, priorityExit: true } },
];

const MASTERY_BY_LEVEL: Record<number, MasteryObjective> = {
  1: { type: 'noUndo' }, 2: { type: 'firstPlan' }, 4: { type: 'perfectBalance' }, 6: { type: 'cleanDeck' }, 7: { type: 'noUndo' },
  10: { type: 'perfectBalance' }, 11: { type: 'firstPlan' }, 12: { type: 'cleanDeck' }, 15: { type: 'perfectBalance' }, 16: { type: 'noReset' },
  20: { type: 'cleanDeck' }, 21: { type: 'perfectBalance' }, 23: { type: 'noUndo' }, 25: { type: 'noUndo' }, 26: { type: 'cleanDeck' },
  30: { type: 'noReset' }, 31: { type: 'limitedMoves', value: 3 }, 33: { type: 'limitedMoves', value: 4 }, 35: { type: 'noReset' }, 36: { type: 'cleanDeck' },
  37: { type: 'limitedMoves', value: 4 }, 39: { type: 'noUndo' }, 40: { type: 'noReset' },
  41: { type: 'perfectBalance' }, 42: { type: 'cleanDeck' }, 43: { type: 'noUndo' }, 44: { type: 'limitedMoves', value: 4 }, 45: { type: 'cleanDeck' },
  46: { type: 'noReset' }, 47: { type: 'limitedMoves', value: 4 }, 48: { type: 'firstPlan' }, 49: { type: 'limitedMoves', value: 6 }, 50: { type: 'noUndo' },
};

export const LEVELS: LevelDefinition[] = LEVEL_DEFINITIONS.map((level) => ({ ...level, mastery: MASTERY_BY_LEVEL[level.id] }));

export function getLevel(levelId: number): LevelDefinition {
  const level = LEVELS.find((candidate) => candidate.id === levelId);
  if (!level) throw new Error(`Unknown level ${levelId}`);
  return level;
}
