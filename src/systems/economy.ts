import { ECONOMY } from '../config/economy';
import { ITEMS } from '../config/items';
import type { ItemKind, Level } from '../models/types';

export function buyPrice(kind: ItemKind, level: Level): number {
  const p = ITEMS[kind].price;
  return level === 1 ? p : level === 2 ? Math.ceil(p * ECONOMY.lvl2Mult) : Math.ceil(p * ECONOMY.lvl3Mult);
}
export function sellPrice(kind: ItemKind, level: Level): number { return Math.floor(buyPrice(kind, level) * ECONOMY.sellRate); }
/** refreshes: 已刷新次数；doctrineT06: 算计专精再-1 */
export function refreshCost(refreshes: number, doctrine?: string | null, heroClass?: string, level = 1): number {
  let c = ECONOMY.refreshBase + refreshes * ECONOMY.refreshStep;
  if (doctrine === 'T06') c = Math.max(1, c - 1);
  if (heroClass === 'merchant' && refreshes === 0) c = Math.max(1, c - 1);
  // pass4：31关后刷新更贵，消化闲置金币
  if (level >= 31) c += 2;
  if (level >= 41) c += 2;
  return c;
}
export function expansionCost(expansions: number): number | null { return ECONOMY.expansions[expansions] ?? null; }
export function canAfford(gold: number, cost: number): boolean { return cost >= 0 && gold >= cost; }
