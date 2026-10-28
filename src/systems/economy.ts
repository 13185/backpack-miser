import { ECONOMY } from '../config/economy';
import { ITEMS } from '../config/items';
import type { ItemKind, Level } from '../models/types';
export function buyPrice(kind: ItemKind, level: Level): number {
  const p = ITEMS[kind].price;
  return level === 1 ? p : level === 2 ? Math.ceil(p * ECONOMY.lvl2Mult) : Math.ceil(p * ECONOMY.lvl3Mult);
}
export function sellPrice(kind: ItemKind, level: Level): number { return Math.floor(buyPrice(kind, level) * ECONOMY.sellRate); }
export function refreshCost(refreshes: number): number { return ECONOMY.refreshBase + refreshes * ECONOMY.refreshStep; }
export function expansionCost(expansions: number): number | null { return ECONOMY.expansions[expansions] ?? null; }
export function canAfford(gold: number, cost: number): boolean { return cost >= 0 && gold >= cost; }
