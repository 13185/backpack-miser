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
/** 同种武器≥3把时，第3把起伤害×0.85（抑制匕首堆叠） */
export function sameKindPenalty(items: ItemInstance[], weapon: ItemInstance): number {
  if (!inBag(weapon)) return 1;
  const same = items.filter(i => inBag(i) && i.kind === weapon.kind);
  if (same.length < 3) return 1;
  // 按 id 排序，前2把无惩罚，其余×0.85
  const ranked = [...same].sort((a, b) => a.id.localeCompare(b.id));
  const idx = ranked.findIndex(i => i.id === weapon.id);
  return idx >= 2 ? 0.85 : 1;
}
/** 邻接战旗提供的间隔缩短（取最高） */
export function bannerShorten(items: ItemInstance[], weapon: ItemInstance): number {
  if (!inBag(weapon) || ITEMS[weapon.kind].category !== 'weapon') return 0;
  let best = 0;
  for (const b of items) {
    if (b.kind !== 'war_banner' || !inBag(b)) continue;
    if (!isOrthAdjacent(b, weapon)) continue;
    best = Math.max(best, ITEMS.war_banner.values[b.level - 1]);
  }
  return best / 100;
}
export function weaponDamage(items: ItemInstance[], weapon: ItemInstance): number {
  const base = ITEMS[weapon.kind].values[weapon.level - 1];
  const gem = gemBonus(items, weapon).pct / 100;
  return Math.round(base * (1 + gem) * sameKindPenalty(items, weapon));
}
