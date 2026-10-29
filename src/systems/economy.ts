import { ECONOMY, type BagExpansion } from '../config/economy';
import { ITEMS } from '../config/items';
import type { ItemKind, Level } from '../models/types';

export function buyPrice(kind: ItemKind, level: Level): number {
  const p = ITEMS[kind].price;
  if (level === 1) return p;
  if (level === 2) return Math.ceil(p * ECONOMY.lvl2Mult);
  if (level === 3) return Math.ceil(p * ECONOMY.lvl3Mult);
  if (level === 4) return Math.ceil(p * ECONOMY.lvl3Mult * 2);
  return Math.ceil(p * ECONOMY.lvl3Mult * 4);
}
export function sellPrice(kind: ItemKind, level: Level): number {
  if (kind === 'luck_charm' && level === 1) return 8;
  return Math.floor(buyPrice(kind, level) * ECONOMY.sellRate);
}
/**
 * 商店里的幸运符。没持有时只卖 1 级（20 金）。
 * 已持有时，不卖不超过背包或临时区里最高级的那一档；更高一级可以留下。
 * 返回 null 表示这个格子不要再出幸运符。
 */
export function resolveCharmOffer(heldLevel: number, rolledLevel: Level): Level | null {
  const level: Level = heldLevel <= 0 ? 1 : rolledLevel;
  if (heldLevel > 0 && level <= heldLevel) return null;
  return level;
}
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
export function expansionOffer(expansions: number): BagExpansion | null {
  return ECONOMY.expansions[expansions] ?? null;
}
export function expansionCost(expansions: number): number | null {
  return expansionOffer(expansions)?.cost ?? null;
}
export function expansionUnlocked(level: number, expansions: number): boolean {
  const offer = expansionOffer(expansions);
  return !!offer && level > offer.unlockAfterLevel;
}
/** 按钮文案：当前尺寸、下一格是行还是列、未解锁时写明首领条件 */
export function expansionLabel(level: number, rows: number, cols: number, expansions: number): { text: string; canBuy: boolean; locked: boolean } {
  const offer = expansionOffer(expansions);
  if (!offer) return { text: `背包已扩容至最大（${cols}×${rows}）`, canBuy: false, locked: false };
  const what = offer.axis === 'col' ? `第${cols + 1}列` : `第${rows + 1}行`;
  if (level <= offer.unlockAfterLevel) {
    return { text: `通关第${offer.unlockAfterLevel}关解锁${what}`, canBuy: false, locked: true };
  }
  return { text: `扩容：新增${what}（${cols}×${rows}） · ${offer.cost} 金币`, canBuy: true, locked: false };
}
export function canAfford(gold: number, cost: number): boolean { return cost >= 0 && gold >= cost; }
