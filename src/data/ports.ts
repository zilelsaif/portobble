import type { PortId } from '../models/game';

export interface PortMetadata {
  id: PortId;
  fullName: string;
  shortName: string;
}

export const PORTS: Record<string, PortMetadata> = {
  A: { id: 'A', fullName: 'Brindle Bay', shortName: 'BRI' },
  B: { id: 'B', fullName: 'Seabrook Harbour', shortName: 'SEA' },
  C: { id: 'C', fullName: 'Marlow Quay', shortName: 'MAR' },
  D: { id: 'D', fullName: 'Ironhaven Port', shortName: 'IRON' },
};

export function getPortMetadata(id: PortId): PortMetadata {
  return PORTS[id] ?? { id, fullName: id, shortName: id };
}

export function portFullName(id: PortId): string {
  return getPortMetadata(id).fullName;
}

export function portShortName(id: PortId): string {
  return getPortMetadata(id).shortName;
}
