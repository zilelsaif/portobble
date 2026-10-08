import type { LevelDefinition, ManifestState, Placement, PortId, RoutePhase, VehicleInstance } from '../models/game';
import { BalanceSystem } from './BalanceSystem';
import { ExitSystem } from './ExitSystem';
import { allLevelVehicles, findLevelVehicle } from './LevelVehicleCatalog';
import { PlacementSystem } from './PlacementSystem';
import { RouteSystem } from './RouteSystem';
import { TideSystem } from './TideSystem';

export interface ManifestValidationResult {
  valid: boolean;
  code?: 'PICKUP_WAITING' | 'INVALID_PLACEMENT' | 'OVERWEIGHT' | 'UNBALANCED' | 'DESTINATION_BLOCKED' | 'PRIORITY_BLOCKED' | 'TIDE_UNSAFE';
  blockedVehicleId?: string;
  blockerVehicleId?: string;
}

export class ManifestSystem {
  static initialState(level: LevelDefinition): ManifestState {
    return {
      portIndex: 0,
      phase: 'loading',
      ferry: { placements: [] },
      waitingVehicleIds: level.vehicles.map((vehicle) => vehicle.id),
      lockedVehicleIds: [],
      deliveredVehicleIds: [],
    };
  }

  static pickupsAt(level: LevelDefinition, port: PortId): VehicleInstance[] {
    return level.pickups?.find((pickup) => pickup.port === port)?.vehicles ?? [];
  }

  static allVehicles(level: LevelDefinition): VehicleInstance[] {
    return allLevelVehicles(level);
  }

  static validateLevelData(level: LevelDefinition): string[] {
    if (!level.route) return level.pickups?.length ? ['Pickups require a route'] : [];
    const errors: string[] = [];
    const routeIndex = new Map(level.route.ports.map((port, index) => [port, index]));
    const ids = new Set<string>();
    for (const vehicle of allLevelVehicles(level)) {
      if (ids.has(vehicle.id)) errors.push(`Duplicate vehicle id: ${vehicle.id}`);
      ids.add(vehicle.id);
    }
    for (const pickup of level.pickups ?? []) {
      const pickupIndex = routeIndex.get(pickup.port);
      if (pickupIndex === undefined || pickupIndex === level.route.ports.length - 1) errors.push(`Invalid pickup port: ${pickup.port}`);
      for (const vehicle of pickup.vehicles) {
        const destinationIndex = vehicle.destination ? routeIndex.get(vehicle.destination) : undefined;
        if (destinationIndex === undefined || pickupIndex === undefined || destinationIndex <= pickupIndex) errors.push(`Invalid destination for pickup ${vehicle.id}`);
        if (vehicle.priority !== undefined && vehicle.priority < 1) errors.push(`Invalid priority for pickup ${vehicle.id}`);
      }
    }
    return errors;
  }

  static canManipulate(state: ManifestState, vehicleId: string): boolean {
    return state.waitingVehicleIds.includes(vehicleId) || (state.phase !== 'complete' && !state.lockedVehicleIds.includes(vehicleId));
  }

  static withPlacement(state: ManifestState, placement: Placement): ManifestState {
    if (!this.canManipulate(state, placement.vehicleId)) return state;
    return { ...state, ferry: { placements: [...state.ferry.placements.filter((item) => item.vehicleId !== placement.vehicleId), placement] } };
  }

  static returnToQueue(state: ManifestState, vehicleId: string): ManifestState {
    if (!this.canManipulate(state, vehicleId)) return state;
    return { ...state, ferry: { placements: state.ferry.placements.filter((item) => item.vehicleId !== vehicleId) } };
  }

  static resetPickup(state: ManifestState): ManifestState {
    return { ...state, ferry: { placements: state.ferry.placements.filter((item) => state.lockedVehicleIds.includes(item.vehicleId)) } };
  }

  static canFitWaiting(level: LevelDefinition, state: ManifestState): boolean {
    const search = (index: number, placements: Placement[]): boolean => {
      if (index === state.waitingVehicleIds.length) return true;
      const vehicleId = state.waitingVehicleIds[index]!;
      const vehicle = findLevelVehicle(level, vehicleId);
      if (!vehicle) return false;
      const lengths = { motorcycle: 1, car: 2, van: 2, ambulance: 2, truck: 3 } as const;
      for (const lane of [0, 1] as const) {
        for (let startCell = 0; startCell <= level.ferry.cellsPerLane - lengths[vehicle.type]; startCell += 1) {
          const candidate = { vehicleId, lane, startCell };
          if (PlacementSystem.validate(level, { placements }, candidate).valid && search(index + 1, [...placements, candidate])) return true;
        }
      }
      return false;
    };
    return search(0, state.ferry.placements.map((placement) => ({ ...placement })));
  }

  static transition(state: ManifestState, next: RoutePhase): ManifestState | null {
    const allowed: Record<RoutePhase, RoutePhase[]> = {
      loading: ['sailing'], sailing: ['unloading'], unloading: ['pickup', 'complete'], pickup: ['sailing'], complete: [],
    };
    return allowed[state.phase].includes(next) ? { ...state, phase: next } : null;
  }

  static validateDeparture(level: LevelDefinition, state: ManifestState): ManifestValidationResult {
    if (state.waitingVehicleIds.some((id) => !state.ferry.placements.some((placement) => placement.vehicleId === id))) return { valid: false, code: 'PICKUP_WAITING' };
    if (!PlacementSystem.validateState(level, state.ferry)) return { valid: false, code: 'INVALID_PLACEMENT' };
    if (BalanceSystem.totalWeight(level, state.ferry) > level.ferry.maxWeight) return { valid: false, code: 'OVERWEIGHT' };
    if (!BalanceSystem.calculate(level, state.ferry).valid) return { valid: false, code: 'UNBALANCED' };
    const nextPort = level.route?.ports[state.portIndex + 1];
    if (!nextPort) return { valid: false, code: 'INVALID_PLACEMENT' };
    const issue = RouteSystem.validateStop(level, state.ferry, nextPort);
    if (issue) return { valid: false, code: issue.code, blockedVehicleId: issue.blockedVehicleId, blockerVehicleId: issue.blockerVehicleId };
    const exit = ExitSystem.validateExitOrder(level, state.ferry);
    if (!exit.valid) return { valid: false, code: 'PRIORITY_BLOCKED', blockedVehicleId: exit.issues[0]?.blockedVehicleId, blockerVehicleId: exit.issues[0]?.blockerVehicleId };
    const currentPort = level.route?.ports[state.portIndex];
    const leg = level.route?.legs?.find((candidate) => candidate.from === currentPort && candidate.to === nextPort);
    if (leg && !TideSystem.evaluateLeg(level, state.ferry, leg).safe) return { valid: false, code: 'TIDE_UNSAFE' };
    return { valid: true };
  }

  static arrive(level: LevelDefinition, departure: ManifestState): ManifestState {
    const nextIndex = departure.portIndex + 1;
    const port = level.route?.ports[nextIndex];
    if (!port) return { ...departure, phase: 'complete' };
    const delivered = departure.ferry.placements.filter((placement) => findLevelVehicle(level, placement.vehicleId)?.destination === port).map((placement) => placement.vehicleId);
    const remaining = departure.ferry.placements.filter((placement) => !delivered.includes(placement.vehicleId));
    const pickups = this.pickupsAt(level, port).map((vehicle) => vehicle.id);
    const final = nextIndex === (level.route?.ports.length ?? 0) - 1;
    return {
      portIndex: nextIndex,
      phase: final ? 'complete' : 'pickup',
      ferry: { placements: remaining.map((placement) => ({ ...placement })) },
      waitingVehicleIds: pickups,
      lockedVehicleIds: remaining.map((placement) => placement.vehicleId),
      deliveredVehicleIds: [...departure.deliveredVehicleIds, ...delivered],
    };
  }

  static phaseLevel(level: LevelDefinition, state: ManifestState): LevelDefinition {
    const activeIds = new Set([...state.ferry.placements.map((placement) => placement.vehicleId), ...state.waitingVehicleIds]);
    return { ...level, vehicles: allLevelVehicles(level).filter((vehicle) => activeIds.has(vehicle.id)), pickups: undefined };
  }
}
