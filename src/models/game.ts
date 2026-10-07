export type LaneIndex = 0 | 1;

export interface VehicleDefinition {
  id: VehicleType;
  displayName: string;
  shortLabel: string;
  length: number;
  weight: number;
  canBePriority?: boolean;
  color: number;
  accent: number;
}

export type VehicleType = 'motorcycle' | 'car' | 'van' | 'ambulance' | 'truck';

export interface VehicleInstance {
  id: string;
  type: VehicleType;
  priority?: number;
}

export interface Placement {
  vehicleId: string;
  lane: LaneIndex;
  startCell: number;
}

export interface FerryState {
  placements: Placement[];
}

export interface FerryDefinition {
  lanes: 2;
  cellsPerLane: 5;
  maxWeight: number;
  balanceTolerance: number;
  goodBalanceThreshold: number;
  perfectBalanceThreshold: number;
}

export interface LevelRules {
  requireAllVehicles: boolean;
  priorityExit: boolean;
}

export interface LevelDefinition {
  id: number;
  title: string;
  hint: string;
  ferry: FerryDefinition;
  vehicles: VehicleInstance[];
  rules: LevelRules;
}

export interface ExitIssue {
  blockedVehicleId: string;
  blockerVehicleId: string;
}

export interface ExitValidationResult {
  valid: boolean;
  issues: ExitIssue[];
}

export type ValidationCode =
  | 'VALID'
  | 'VEHICLE_STILL_WAITING'
  | 'INVALID_PLACEMENT'
  | 'OVERWEIGHT'
  | 'UNBALANCED'
  | 'PRIORITY_BLOCKED';

export interface LevelValidationResult {
  valid: boolean;
  code: ValidationCode;
  message: string;
  balance: number;
  blockedVehicleId?: string;
  blockerVehicleId?: string;
}
