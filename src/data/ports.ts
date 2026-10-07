import type { PortId } from '../models/game';

export interface PortMetadata {
  id: PortId;
  fullName: string;
  shortName: string;
  badgeColor: number;
  badgeTextColor: number;
}

export const PORTS: Record<string, PortMetadata> = {
  A: { id: 'A', fullName: 'Brindle Bay', shortName: 'BRI', badgeColor: 0x28566b, badgeTextColor: 0xffffff },
  B: { id: 'B', fullName: 'Seabrook Harbour', shortName: 'SEA', badgeColor: 0x397f77, badgeTextColor: 0xffffff },
  C: { id: 'C', fullName: 'Marlow Quay', shortName: 'MAR', badgeColor: 0xc17b32, badgeTextColor: 0x1f292b },
  D: { id: 'D', fullName: 'Ironhaven Port', shortName: 'IRON', badgeColor: 0x8e4037, badgeTextColor: 0xffffff },
};

export function getPortMetadata(id: PortId): PortMetadata {
  return PORTS[id] ?? { id, fullName: id, shortName: id, badgeColor: 0x315965, badgeTextColor: 0xffffff };
}

export function portFullName(id: PortId): string {
  return getPortMetadata(id).fullName;
}

export function portShortName(id: PortId): string {
  return getPortMetadata(id).shortName;
}
