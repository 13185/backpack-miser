import type { Element } from './elements';
import type { ItemKind, Level } from '../../models/types';

export const ARMOR_KINDS = [
  'gilded_lining', 'root_lining', 'tide_lining', 'furnace_lining', 'stone_lining', 'travel_lining',
] as const;
export type ArmorKind = typeof ARMOR_KINDS[number];

export function isArmorKind(kind: string): kind is ArmorKind {
  return (ARMOR_KINDS as readonly string[]).includes(kind);
}

const SINGLE: Record<number, number> = { 1: 20, 2: 30, 3: 40, 4: 45, 5: 50 };
const TRAVEL: Record<number, number> = { 1: 8, 2: 12, 3: 16, 4: 18, 5: 20 };

export function armorResist(kind: ArmorKind, level: Level): Record<Element, number> {
  const lv = SINGLE[level] ?? 20;
  const all = TRAVEL[level] ?? 8;
  const zero = { metal: 0, wood: 0, water: 0, fire: 0, earth: 0 };
  if (kind === 'travel_lining') return { metal: all, wood: all, water: all, fire: all, earth: all };
  const map: Record<Exclude<ArmorKind, 'travel_lining'>, Element> = {
    gilded_lining: 'metal', root_lining: 'wood', tide_lining: 'water', furnace_lining: 'fire', stone_lining: 'earth',
  };
  zero[map[kind]] = lv;
  return zero;
}

export const ARMOR_BUY = [16, 32, 64, 105, 150] as const;
export const ARMOR_SELL = [6, 12, 24, 40, 57] as const;
