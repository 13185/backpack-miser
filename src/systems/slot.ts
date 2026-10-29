import { ITEM_KINDS, itemUnlockLevel } from '../config/items';
import type { ItemKind, Level } from '../models/types';
import { sellPrice } from './economy';

/**
 * 商店摇奖机。权重合计 1000。
 * 4 级 15/1000 = 1.5%，5 级 5/1000 = 0.5%。其余多数是空或低级货。
 * 售价按卖出金币算长期为负，守财奴不该靠它印钱。
 */
export const SLOT_WEIGHTS = [
  { level: 0 as const, w: 460, label: '空' },
  { level: 1 as const, w: 300, label: '1级' },
  { level: 2 as const, w: 150, label: '2级' },
  { level: 3 as const, w: 70, label: '3级' },
  { level: 4 as const, w: 15, label: '4级' },
  { level: 5 as const, w: 5, label: '5级' },
] as const;

export const SLOT_WEIGHT_TOTAL = 1000;

export type SlotLevel = 0 | Level;

export interface SlotPull {
  level: SlotLevel;
  kind: ItemKind | null;
}

/** 关卡越高越贵，避免后期用闲钱把 5 级刷出来。1 关 18 金，每 10 关 +2。 */
export function slotCost(level: number): number {
  const lv = Math.max(1, Math.floor(level));
  return 18 + Math.floor((lv - 1) / 10) * 2;
}

export function slotPool(level: number): ItemKind[] {
  const pool = ITEM_KINDS.filter(k => k !== 'burden' && itemUnlockLevel(k) <= level);
  return pool.length ? pool : ['dagger', 'shield', 'potion'];
}

export function slotPct(weight: number): string {
  const n = weight / 10;
  return Number.isInteger(n) ? `${n}%` : `${n.toFixed(1)}%`;
}

export function slotOddsText(): string {
  return SLOT_WEIGHTS.map(r => `${r.label} ${slotPct(r.w)}`).join(' · ');
}

/** 界面上必须能看见 4 级和 5 级的概率。 */
export function slotBlurb(): string {
  return `有机会出 4级、5级装。${slotOddsText()}。长期是亏的，摇中的装备放进临时区。`;
}

function prizeLevel(unit: number): SlotLevel {
  const u = unit < 0 ? 0 : unit >= 1 ? 0.999999 : unit;
  let bucket = Math.floor(u * SLOT_WEIGHT_TOTAL);
  if (bucket >= SLOT_WEIGHT_TOTAL) bucket = SLOT_WEIGHT_TOTAL - 1;
  let acc = 0;
  for (const row of SLOT_WEIGHTS) {
    acc += row.w;
    if (bucket < acc) return row.level;
  }
  return 0;
}

/** unit、kindUnit 都在 [0,1)。种类在本关已解锁、且不是负担物的池子里均匀抽。 */
export function rollSlot(unit: number, kindUnit: number, level: number): SlotPull {
  const levelOut = prizeLevel(unit);
  if (levelOut === 0) return { level: 0, kind: null };
  const pool = slotPool(level);
  const ku = kindUnit < 0 ? 0 : kindUnit >= 1 ? 0.999999 : kindUnit;
  const idx = Math.min(pool.length - 1, Math.floor(ku * pool.length));
  return { level: levelOut, kind: pool[idx] };
}

/** 按卖出价算的期望金币。低于 slotCost 才是庄家占优。 */
export function slotExpectedSell(level: number): number {
  const pool = slotPool(level);
  let ev = 0;
  for (const row of SLOT_WEIGHTS) {
    if (row.level === 0) continue;
    const avg = pool.reduce((a, k) => a + sellPrice(k, row.level), 0) / pool.length;
    ev += (row.w / SLOT_WEIGHT_TOTAL) * avg;
  }
  return ev;
}
