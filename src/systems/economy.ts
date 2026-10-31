import { ARMOR_BUY, ARMOR_SELL, isArmorKind } from '../config/v4/armor';
import { ECONOMY, type BagExpansion } from '../config/economy';
import { ITEMS } from '../config/items';
import type { ItemKind, Level } from '../models/types';

export function buyPrice(kind: ItemKind, level: Level, heroClass?: string): number {
  if (isArmorKind(kind)) {
    const base = ARMOR_BUY[level - 1] ?? 16;
    return heroClass === 'merchant' ? Math.max(1, Math.ceil(base * 0.85)) : base;
  }
  let p = ITEMS[kind].price;
  if (level === 2) p = Math.ceil(p * ECONOMY.lvl2Mult);
  else if (level === 3) p = Math.ceil(p * ECONOMY.lvl3Mult);
  else if (level === 4) p = Math.ceil(p * ECONOMY.lvl3Mult * 2);
  else if (level >= 5) p = Math.ceil(p * ECONOMY.lvl3Mult * 4);
  if (heroClass === 'merchant') p = Math.max(1, Math.ceil(p * 0.85));
  return p;
}
export function sellPrice(kind: ItemKind, level: Level): number {
  if (kind === 'luck_charm' && level === 1) return 8;
  if (isArmorKind(kind)) return ARMOR_SELL[level - 1] ?? 6;
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
  if (heroClass === 'merchant') c = Math.max(1, c - 2);
  // pass4：31关后刷新更贵，消化闲置金币
  if (level >= 31) c += 2;
  if (level >= 41) c += 2;
  return c;
}
export function expansionOffer(expansions: number): BagExpansion | null {
  return ECONOMY.expansions[expansions] ?? null;
}
/** 金币价。献祭扩容返回 null，避免被当成 0 金白送。 */
export function expansionCost(expansions: number): number | null {
  const offer = expansionOffer(expansions);
  if (!offer || offer.itemCost) return null;
  return offer.cost;
}
export function expansionUnlocked(level: number, expansions: number): boolean {
  const offer = expansionOffer(expansions);
  return !!offer && level > offer.unlockAfterLevel;
}
/** 按钮文案：当前尺寸、下一格是行还是列、未解锁时写明首领条件 */
export function expansionLabel(level: number, rows: number, cols: number, expansions: number): { text: string; canBuy: boolean; locked: boolean; itemCost: boolean } {
  const offer = expansionOffer(expansions);
  if (!offer) return { text: `背包已到本局上限（${cols}×${rows}）`, canBuy: false, locked: false, itemCost: false };
  const what = offer.axis === 'col' ? `第${cols + 1}列` : `第${rows + 1}行`;
  if (level <= offer.unlockAfterLevel) {
    return { text: `通关第${offer.unlockAfterLevel}关解锁${what}`, canBuy: false, locked: true, itemCost: !!offer.itemCost };
  }
  if (offer.itemCost) {
    return { text: `献祭扩容：新增${what}（${cols}×${rows}） · 4件Lv3 或 2件Lv4 或 1件Lv5`, canBuy: true, locked: false, itemCost: true };
  }
  return { text: `扩容：新增${what}（${cols}×${rows}） · ${offer.cost} 金币`, canBuy: true, locked: false, itemCost: false };
}
export function canAfford(gold: number, cost: number): boolean { return cost >= 0 && gold >= cost; }
