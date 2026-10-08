import type { FerryState, LevelDefinition, Placement, PortId, RouteSimulationResult } from '../models/game';
import { TideSystem } from './TideSystem';
import { allLevelVehicles, findLevelVehicle } from './LevelVehicleCatalog';

export class RouteSystem {
  static nextPort(level: LevelDefinition): PortId | undefined {
    if (!level.route) return undefined;
    const startIndex = level.route.ports.indexOf(level.route.startPort);
    return level.route.ports[startIndex + 1];
  }

  static simulate(level: LevelDefinition, initialState: FerryState): RouteSimulationResult {
    if (!level.route) return { valid: true, stops: [], tideChecks: [], finalState: { placements: [...initialState.placements] } };
    const startIndex = level.route.ports.indexOf(level.route.startPort);
    let state: FerryState = { placements: initialState.placements.map((placement) => ({ ...placement })) };
    const stops: RouteSimulationResult['stops'] = [];
    const tideChecks: RouteSimulationResult['tideChecks'] = [];

    for (const port of level.route.ports.slice(startIndex + 1)) {
      const leg = level.route.legs?.find((candidate) => candidate.from === (stops.at(-1)?.port ?? level.route?.startPort) && candidate.to === port);
      if (leg) {
        const tideCheck = TideSystem.evaluateLeg(level, state, leg);
        tideChecks.push(tideCheck);
        if (!tideCheck.safe) return { valid: false, stops, tideChecks, finalState: state, tideFailure: tideCheck };
      }
      const destinationIds = new Set(allLevelVehicles(level).filter((vehicle) => vehicle.destination === port).map((vehicle) => vehicle.id));
      const issue = this.validateStop(level, state, port, destinationIds);
      if (issue) return { valid: false, stops, tideChecks, finalState: state, issue };
      const unloadedVehicleIds = state.placements
        .filter((placement) => destinationIds.has(placement.vehicleId))
        .sort((a, b) => this.exitSort(level, a, b))
        .map((placement) => placement.vehicleId);
      state = { placements: state.placements.filter((placement) => !destinationIds.has(placement.vehicleId)) };
      stops.push({ port, unloadedVehicleIds, remainingState: { placements: state.placements.map((placement) => ({ ...placement })) } });
    }

    return { valid: state.placements.length === 0, stops, tideChecks, finalState: state };
  }

  static validateStop(level: LevelDefinition, state: FerryState, port: PortId, destinationIds = new Set(allLevelVehicles(level).filter((vehicle) => vehicle.destination === port).map((vehicle) => vehicle.id))) {
    for (const lane of [0, 1] as const) {
      const lanePlacements = state.placements.filter((placement) => placement.lane === lane).sort((a, b) => b.startCell - a.startCell);
      for (const target of lanePlacements.filter((placement) => destinationIds.has(placement.vehicleId))) {
        const blocker = lanePlacements.find((placement) => placement.startCell > target.startCell && !destinationIds.has(placement.vehicleId));
        if (blocker) return { port, code: 'DESTINATION_BLOCKED' as const, blockedVehicleId: target.vehicleId, blockerVehicleId: blocker.vehicleId };
      }
      const targetPlacements = lanePlacements.filter((placement) => destinationIds.has(placement.vehicleId));
      for (const priority of targetPlacements.filter((placement) => (findLevelVehicle(level, placement.vehicleId)?.priority ?? 0) > 0)) {
        const priorityValue = findLevelVehicle(level, priority.vehicleId)?.priority ?? Number.MAX_SAFE_INTEGER;
        const blocker = targetPlacements.find((placement) => {
          const value = findLevelVehicle(level, placement.vehicleId)?.priority ?? Number.MAX_SAFE_INTEGER;
          return placement.startCell > priority.startCell && value > priorityValue;
        });
        if (blocker) return { port, code: 'PRIORITY_BLOCKED' as const, blockedVehicleId: priority.vehicleId, blockerVehicleId: blocker.vehicleId };
      }
    }
    return undefined;
  }

  private static exitSort(level: LevelDefinition, a: Placement, b: Placement): number {
    const priorityA = findLevelVehicle(level, a.vehicleId)?.priority ?? Number.MAX_SAFE_INTEGER;
    const priorityB = findLevelVehicle(level, b.vehicleId)?.priority ?? Number.MAX_SAFE_INTEGER;
    if (priorityA !== priorityB) return priorityA - priorityB;
    if (a.lane !== b.lane) return a.lane - b.lane;
    return b.startCell - a.startCell;
  }
}
