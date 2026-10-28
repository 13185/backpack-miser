import { ITEMS } from '../src/config/items';
import type { ItemKind } from '../src/models/types';
import { simulate } from '../src/systems/combat';
import { buyPrice, expansionCost } from '../src/systems/economy';
import { Game, newGameState } from '../src/systems/game';
import { canMerge } from '../src/systems/merge';
import { canPlace, findSpot, inBag, occupiedCells } from '../src/systems/placement';

export interface Build { name: string; want: ItemKind[]; expand: boolean; }
export const BUILDS: Build[] = [
  { name: '匕首+红宝石', want: ['dagger', 'ruby', 'shield', 'potion'], expand: true },
  { name: '大剑+盾牌+药水', want: ['greatsword', 'shield', 'potion'], expand: true },
  { name: '钱袋经济流', want: ['moneybag', 'greatsword', 'ruby', 'shield'], expand: true },
  { name: '只堆盾牌(漏洞检测)', want: ['shield'], expand: true },
];
function mergeAll(g: Game) {
  let did = true;
  while (did) {
    did = false;
    const its = [...g.s.items].sort((a, b) => (inBag(a) ? 0 : 1) - (inBag(b) ? 0 : 1));
    outer: for (const a of its) for (const b of its) if (canMerge(a, b).ok) {
      const tgt = inBag(a) ? a : b, src = tgt === a ? b : a;
      if (g.merge(src.id, tgt.id).ok) { did = true; break outer; }
    }
  }
}
/** 尝试把宝石放到武器旁 */
function placeGem(g: Game, id: string): boolean {
  const it = g.find(id)!;
  const weapons = g.bagItems.filter(w => ITEMS[w.kind].category === 'weapon');
  for (const w of weapons) for (const c of occupiedCells(w.kind, w.x!, w.y!, w.rotated))
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]])
      if (canPlace(g.s.items, g.s.cols, g.s.rows, it.kind, c.x + dx, c.y + dy, false, id)) return g.move(id, c.x + dx, c.y + dy, false).ok;
  return false;
}
function arrange(g: Game, b: Build) {
  mergeAll(g);
  for (const it of g.tempItems) {
    if (it.kind === 'ruby' && placeGem(g, it.id)) continue;
    const sp = findSpot(g.s.items, g.s.cols, g.s.rows, it.kind, it.id);
    if (sp) g.move(it.id, sp.x, sp.y, sp.rotated);
  }
  // 背包放不下：卖掉临时区剩余
  for (const it of g.tempItems) g.sell(it.id);
  void b;
}
export function playRun(b: Build, seed: number) {
  const g = new Game(newGameState(seed));
  const log: string[] = [];
  while (g.s.phase !== 'victory' && g.s.phase !== 'defeat') {
    if (g.s.phase === 'prep') {
      if (b.name === '钱袋经济流' && g.s.level >= 6) { b = { ...b, want: ['greatsword', 'ruby', 'shield', 'potion', 'dagger'] }; if (g.s.level >= 8) for (const m of g.s.items.filter(i => i.kind === 'moneybag')) g.sell(m.id); }
      if (b.expand && b.name !== '只堆盾牌(漏洞检测)') { const c = expansionCost(g.s.expansions); if (c !== null && g.s.gold >= c + 6 && g.s.level >= 3) g.expand(); }
      for (let pass = 0; pass < 3; pass++) {
        g.s.shop.slots.forEach((sl, i) => { if (!sl.bought && b.want.includes(sl.kind) && !(sl.kind === 'moneybag' && g.s.items.filter(i => i.kind === 'moneybag').length >= 2) && g.s.gold >= buyPrice(sl.kind, sl.level)) g.buy(i); });
        arrange(g, b);
        if (g.s.gold >= 12 + 3 + g.s.shop.refreshes * 2) g.refreshShop(); else break;
      }
      arrange(g, b);
      if (b.name === '只堆盾牌(漏洞检测)') { for (const it of g.bagItems.filter(i => i.kind !== 'shield' && i.kind !== 'dagger')) g.toTemp(it.id); for (const it of g.tempItems) g.sell(it.id); }
      const r = g.startBattle(); if (!r.ok) { log.push('无法开战:' + r.msg); break; }
    } else if (g.s.phase === 'battle') {
      const c = g.makeCombat(); simulate(c); g.settle(c);
      log.push(`L${g.s.last!.level}${c.won ? '胜' : '负'} ${(c.t / 1000).toFixed(1)}s hp${c.hp}`);
    } else if (g.s.phase === 'loot') {
      const opts = g.s.loot!.options; let idx = opts.findIndex(o => b.want.includes(o.kind)); if (idx < 0) idx = 0; g.claimLoot(idx);
    }
  }
  return { won: g.s.phase === 'victory', reached: g.s.last?.level ?? 0, log, gold: g.s.stats.goldEarned };
}
