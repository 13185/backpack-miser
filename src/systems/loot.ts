import { ECONOMY } from '../config/economy';
import { ITEM_KINDS } from '../config/items';
import type { ItemKind, Level } from '../models/types';
import { Rng } from './rng';
/** 生成n件尽量不重复种类的装备候选 */
export function rollItems(rng: Rng, level: number, n: number): { kind: ItemKind; level: Level }[] {
  const pool = [...ITEM_KINDS];
  const out: { kind: ItemKind; level: Level }[] = [];
  for (let i = 0; i < n; i++) {
    if (pool.length === 0) pool.push(...ITEM_KINDS);
    const kind = pool.splice(rng.int(pool.length), 1)[0];
    const lv: Level = rng.next() < ECONOMY.lvl2Chance(level) ? 2 : 1;
    out.push({ kind, level: lv });
  }
  return out;
}
