import { ITEMS } from '../config/items';
import type { ItemInstance } from '../models/types';
import { inBag, occupiedCells } from './placement';
export const GEM_CAP = 100;
function isOrthAdjacent(a: ItemInstance, b: ItemInstance): boolean {
  const ca = occupiedCells(a.kind, a.x!, a.y!, a.rotated);
  const cb = new Set(occupiedCells(b.kind, b.x!, b.y!, b.rotated).map(c => c.x + ',' + c.y));
  return ca.some(c => cb.has(c.x + 1 + ',' + c.y) || cb.has(c.x - 1 + ',' + c.y) || cb.has(c.x + ',' + (c.y + 1)) || cb.has(c.x + ',' + (c.y - 1)));
}
/** 某颗宝石实际强化的武器 id 列表（只计背包内） */
export function weaponsBoostedBy(items: ItemInstance[], gem: ItemInstance): string[] {
  if (gem.kind !== 'ruby' || !inBag(gem)) return [];
  return items.filter(w => inBag(w) && ITEMS[w.kind].category === 'weapon' && isOrthAdjacent(gem, w)).map(w => w.id);
}
/** 武器受到的总加成百分比（每颗宝石最多计一次，上限100%） */
export function gemBonus(items: ItemInstance[], weapon: ItemInstance): { pct: number; gems: string[] } {
  if (!inBag(weapon) || ITEMS[weapon.kind].category !== 'weapon') return { pct: 0, gems: [] };
  let pct = 0; const gems: string[] = [];
  for (const g of items) if (g.kind === 'ruby' && inBag(g) && isOrthAdjacent(g, weapon)) { pct += ITEMS.ruby.values[g.level - 1]; gems.push(g.id); }
  return { pct: Math.min(GEM_CAP, pct), gems };
}
export function weaponDamage(items: ItemInstance[], weapon: ItemInstance): number {
  const base = ITEMS[weapon.kind].values[weapon.level - 1];
  return Math.round(base * (1 + gemBonus(items, weapon).pct / 100));
}
