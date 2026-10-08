export type LaneIndex = 0 | 1;
export type PortId = string;
export type TideLevel = 'high' | 'mid' | 'low';

export interface RouteLegDefinition {
  from: PortId;
  to: PortId;
  tide: TideLevel;
  maxDraft: number;
}

export interface RouteDefinition {
  ports: PortId[];
  startPort: PortId;
  legs?: RouteLegDefinition[];
}

export interface TideRules {
  heelDraftFactor: number;
}

export interface PortPickupDefinition {
  port: PortId;
  vehicles: VehicleInstance[];
}

export type RoutePhase = 'loading' | 'sailing' | 'unloading' | 'pickup' | 'complete';

export interface ManifestState {
  portIndex: number;
  phase: RoutePhase;
  ferry: FerryState;
  waitingVehicleIds: string[];
  lockedVehicleIds: string[];
  deliveredVehicleIds: string[];
}

export interface ManifestSolution {
  stages: Array<{ port: PortId; departureState: FerryState }>;
  finalState: ManifestState;
}

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
  destination?: PortId;
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
  route?: RouteDefinition;
  tideRules?: TideRules;
  pickups?: PortPickupDefinition[];
}

export interface TideValidationResult {
  safe: boolean;
  leg: RouteLegDefinition;
  totalWeight: number;
  balance: number;
  heelDraftPenalty: number;
  effectiveDraft: number;
  maxDraft: number;
}

export interface RouteStopResult {
  port: PortId;
  unloadedVehicleIds: string[];
  remainingState: FerryState;
}

export interface RouteIssue extends ExitIssue {
  port: PortId;
  code: 'DESTINATION_BLOCKED' | 'PRIORITY_BLOCKED';
}

export interface RouteSimulationResult {
  valid: boolean;
  stops: RouteStopResult[];
  finalState: FerryState;
  issue?: RouteIssue;
  tideFailure?: TideValidationResult;
  tideChecks: TideValidationResult[];
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
  | 'PRIORITY_BLOCKED'
  | 'DESTINATION_BLOCKED'
  | 'TIDE_UNSAFE';

export interface LevelValidationResult {
  valid: boolean;
  code: ValidationCode;
  message: string;
  balance: number;
  blockedVehicleId?: string;
  blockerVehicleId?: string;
  tideFailure?: TideValidationResult;
}
