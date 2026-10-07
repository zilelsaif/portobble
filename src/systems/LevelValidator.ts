import { getVehicleDefinition } from '../data/vehicles';
import { portFullName } from '../data/ports';
import type { FerryState, LevelDefinition, LevelValidationResult } from '../models/game';
import { BalanceSystem } from './BalanceSystem';
import { ExitSystem } from './ExitSystem';
import { PlacementSystem } from './PlacementSystem';
import { RouteSystem } from './RouteSystem';

export class LevelValidator {
  static validate(level: LevelDefinition, state: FerryState): LevelValidationResult {
    const balance = BalanceSystem.calculate(level, state);
    if (level.rules.requireAllVehicles && state.placements.length !== level.vehicles.length) {
      return { valid: false, code: 'VEHICLE_STILL_WAITING', message: 'VEHICLE STILL WAITING', balance: balance.value };
    }
    if (!PlacementSystem.validateState(level, state)) {
      return { valid: false, code: 'INVALID_PLACEMENT', message: 'INVALID DECK PLACEMENT', balance: balance.value };
    }
    if (BalanceSystem.totalWeight(level, state) > level.ferry.maxWeight) {
      return { valid: false, code: 'OVERWEIGHT', message: 'FERRY OVERWEIGHT', balance: balance.value };
    }
    if (!balance.valid) {
      return { valid: false, code: 'UNBALANCED', message: 'FERRY UNBALANCED', balance: balance.value };
    }
    const exit = ExitSystem.validateExitOrder(level, state);
    if (!exit.valid) {
      const issue = exit.issues[0];
      const blocked = level.vehicles.find((item) => item.id === issue?.blockedVehicleId);
      const blocker = level.vehicles.find((item) => item.id === issue?.blockerVehicleId);
      return {
        valid: false,
        code: 'PRIORITY_BLOCKED',
        message: `${blocked ? getVehicleDefinition(blocked.type).displayName.toUpperCase() : 'PRIORITY VEHICLE'} BLOCKED${blocker ? ` BY ${getVehicleDefinition(blocker.type).displayName.toUpperCase()}` : ''}`,
        balance: balance.value,
        blockedVehicleId: issue?.blockedVehicleId,
        blockerVehicleId: issue?.blockerVehicleId,
      };
    }
    const route = RouteSystem.simulate(level, state);
    if (!route.valid && route.tideFailure) {
      const failure = route.tideFailure;
      return {
        valid: false,
        code: 'TIDE_UNSAFE',
        message: `TOO DEEP FOR ${failure.leg.tide.toUpperCase()} TIDE • ${portFullName(failure.leg.from).toUpperCase()} → ${portFullName(failure.leg.to).toUpperCase()}`,
        balance: balance.value,
        tideFailure: failure,
      };
    }
    if (!route.valid && route.issue) {
      const blocked = level.vehicles.find((item) => item.id === route.issue?.blockedVehicleId);
      const blocker = level.vehicles.find((item) => item.id === route.issue?.blockerVehicleId);
      return {
        valid: false,
        code: route.issue.code,
        message: route.issue.code === 'PRIORITY_BLOCKED'
          ? `${blocked ? getVehicleDefinition(blocked.type).displayName.toUpperCase() : 'PRIORITY VEHICLE'} FOR ${portFullName(route.issue.port).toUpperCase()} BLOCKED${blocker ? ` BY ${getVehicleDefinition(blocker.type).displayName.toUpperCase()}` : ''}`
          : `${blocked ? getVehicleDefinition(blocked.type).displayName.toUpperCase() : 'VEHICLE'} FOR ${portFullName(route.issue.port).toUpperCase()} BLOCKED${blocker ? ` BY ${getVehicleDefinition(blocker.type).displayName.toUpperCase()}` : ''}`,
        balance: balance.value,
        blockedVehicleId: route.issue.blockedVehicleId,
        blockerVehicleId: route.issue.blockerVehicleId,
      };
    }
    return { valid: true, code: 'VALID', message: 'READY TO SAIL', balance: balance.value };
  }
}
