import { MAX_LEVEL } from '../config/items';
import type { ItemInstance, Level } from '../models/types';
export type MergeCheck = { ok: true; gamble?: boolean } | { ok: false; reason: string };
export function canMerge(a: ItemInstance, b: ItemInstance): MergeCheck {
  if (a.id === b.id) return { ok: false, reason: '不能与自身合成。' };
  if (a.kind !== b.kind || a.level !== b.level) return { ok: false, reason: '需要相同种类和等级才能合成。' };
  if (a.level >= MAX_LEVEL) return { ok: false, reason: '装备已达到最高等级。' };
  if (a.level === 3) return { ok: true, gamble: true };
  return { ok: true };
}
/** 原子合成：返回新物品列表；结果保留目标的id、位置与朝向。失败返回原数组（未修改） */
export function mergeItems(items: ItemInstance[], sourceId: string, targetId: string): { items: ItemInstance[]; result?: ItemInstance; error?: string } {
  const src = items.find(i => i.id === sourceId), tgt = items.find(i => i.id === targetId);
  if (!src || !tgt) return { items, error: '找不到装备。' };
  const c = canMerge(src, tgt);
  if (!c.ok) return { items, error: c.reason };
  if (c.gamble) return { items, error: '两件 Lv3 要赌一把才能合成。' };
  const result: ItemInstance = { ...tgt, level: (tgt.level + 1) as Level };
  const next = items.filter(i => i.id !== sourceId).map(i => (i.id === targetId ? result : i));
  return { items: next, result };
}
