import { ECONOMY } from '../config/economy';
import { ITEMS } from '../config/items';
import { LEVELS } from '../config/levels';
import type { GameState, ItemInstance, ItemKind, LastBattle, Level } from '../models/types';
import { createCombat, type CombatState } from './combat';
import { buyPrice, canAfford, expansionCost, refreshCost, sellPrice } from './economy';
import { rollItems } from './loot';
import { mergeItems } from './merge';
import { canPlace, findSpot, inBag } from './placement';
import { Rng } from './rng';
import { SAVE_VERSION } from './save';

export type Result = { ok: true; msg?: string } | { ok: false; msg: string };
const OK: Result = { ok: true };
const fail = (msg: string): Result => ({ ok: false, msg });

export function newGameState(seed: number): GameState {
  const s: GameState = {
    version: SAVE_VERSION, phase: 'prep', level: 1, hp: ECONOMY.startHp, maxHp: ECONOMY.startHp, gold: ECONOMY.startGold,
    rows: ECONOMY.startRows, cols: ECONOMY.startCols, expansions: 0, items: [], nextId: 1, rng: seed >>> 0,
    loot: null, shop: { level: 1, slots: [], refreshes: 0 }, battleToken: 0, settledToken: 0,
    stats: { kills: 0, goldEarned: 0, contribution: {} }, last: null,
  };
  for (const kind of ['dagger', 'shield', 'moneybag'] as ItemKind[]) {
    const spot = findSpot(s.items, s.cols, s.rows, kind)!;
    s.items.push({ id: 'i' + s.nextId++, kind, level: 1, x: spot.x, y: spot.y, rotated: spot.rotated });
  }
  rollShop(s);
  return s;
}
function rollShop(s: GameState) {
  const r = new Rng(s.rng);
  s.shop.slots = rollItems(r, s.level, 3).map(o => ({ ...o, bought: false }));
  s.rng = r.state;
}
export const itemLabel = (i: { kind: ItemKind; level: Level }) => `${ITEMS[i.kind].name} Lv${i.level}`;

/** 所有玩家操作都通过 Game；每次成功后调用 onChange（保存） */
export class Game {
  constructor(public s: GameState, private onChange: (s: GameState) => void = () => {}) {}
  private commit(r: Result = OK): Result { if (r.ok) this.onChange(this.s); return r; }
  private prepOnly(): Result | null { return this.s.phase === 'prep' ? null : fail('战斗中无法整理背包。'); }
  get bagItems() { return this.s.items.filter(inBag); }
  get tempItems() { return this.s.items.filter(i => !inBag(i)); }
  find(id: string) { return this.s.items.find(i => i.id === id); }

  move(id: string, x: number, y: number, rotated: boolean): Result {
    const g = this.prepOnly(); if (g) return g;
    const it = this.find(id); if (!it) return fail('找不到装备。');
    const rot = ITEMS[it.kind].rotatable ? rotated : false;
    if (!canPlace(this.s.items, this.s.cols, this.s.rows, it.kind, x, y, rot, id)) return fail('这里放不下。');
    it.x = x; it.y = y; it.rotated = rot;
    return this.commit();
  }
  toTemp(id: string): Result {
    const g = this.prepOnly(); if (g) return g;
    const it = this.find(id); if (!it) return fail('找不到装备。');
    it.x = null; it.y = null; return this.commit();
  }
  rotate(id: string): Result {
    const g = this.prepOnly(); if (g) return g;
    const it = this.find(id); if (!it) return fail('找不到装备。');
    if (!ITEMS[it.kind].rotatable) return fail('这件装备无需旋转。');
    if (!inBag(it)) { it.rotated = !it.rotated; return this.commit(); }
    if (!canPlace(this.s.items, this.s.cols, this.s.rows, it.kind, it.x!, it.y!, !it.rotated, id)) return fail('这里放不下，无法原地旋转。');
    it.rotated = !it.rotated; return this.commit();
  }
  merge(sourceId: string, targetId: string): Result {
    const g = this.prepOnly(); if (g) return g;
    const r = mergeItems(this.s.items, sourceId, targetId);
    if (r.error) return fail(r.error);
    this.s.items = r.items;
    return this.commit({ ok: true, msg: `合成成功：${itemLabel(r.result!)}` });
  }
  sell(id: string): Result {
    const g = this.prepOnly(); if (g) return g;
    const it = this.find(id); if (!it) return fail('找不到装备。');
    this.s.items = this.s.items.filter(i => i.id !== id);
    const p = sellPrice(it.kind, it.level); this.s.gold += p;
    return this.commit({ ok: true, msg: `出售获得 ${p} 金币` });
  }
  private addTemp(kind: ItemKind, level: Level): ItemInstance {
    const it: ItemInstance = { id: 'i' + this.s.nextId++, kind, level, x: null, y: null, rotated: false };
    this.s.items.push(it); return it;
  }
  buy(slot: number): Result {
    const g = this.prepOnly(); if (g) return g;
    const sl = this.s.shop.slots[slot]; if (!sl) return fail('没有这件商品。');
    if (sl.bought) return fail('本轮已购买过这件商品。');
    const p = buyPrice(sl.kind, sl.level);
    if (!canAfford(this.s.gold, p)) return fail('金币不足。');
    this.s.gold -= p; sl.bought = true; this.addTemp(sl.kind, sl.level);
    return this.commit({ ok: true, msg: `购买了${itemLabel(sl)}，已放入临时区` });
  }
  refreshShop(): Result {
    const g = this.prepOnly(); if (g) return g;
    const c = refreshCost(this.s.shop.refreshes);
    if (!canAfford(this.s.gold, c)) return fail('金币不足。');
    this.s.gold -= c; this.s.shop.refreshes++; rollShop(this.s);
    return this.commit();
  }
  expand(): Result {
    const g = this.prepOnly(); if (g) return g;
    const c = expansionCost(this.s.expansions);
    if (c === null) return fail('背包已扩容到最大。');
    if (!canAfford(this.s.gold, c)) return fail('金币不足。');
    this.s.gold -= c; this.s.expansions++; this.s.rows++;
    return this.commit({ ok: true, msg: `背包扩容！新增第${this.s.rows}行` });
  }
  canStartBattle(): Result {
    if (this.s.phase !== 'prep') return fail('当前不能开始战斗。');
    if (this.tempItems.length > 0) return fail('请先处理临时区装备。');
    if (!this.bagItems.some(i => ITEMS[i.kind].category === 'weapon')) return fail('至少装备一把武器才能战斗。');
    return OK;
  }
  startBattle(): Result {
    const r = this.canStartBattle(); if (!r.ok) return r;
    this.s.phase = 'battle'; this.s.battleToken++;
    return this.commit();
  }
  /** 根据当前（开战前）状态生成战斗；中途刷新页面也会得到同一场战斗 */
  makeCombat(): CombatState { return createCombat(this.s.items, this.s.hp, this.s.maxHp, LEVELS[this.s.level - 1]); }
  /** 战斗结算：仅对当前 battleToken 结算一次 */
  settle(c: CombatState): Result {
    if (this.s.phase !== 'battle' || !c.over) return fail('战斗未结束。');
    if (this.s.settledToken === this.s.battleToken) return fail('已结算。');
    this.s.settledToken = this.s.battleToken;
    const s = this.s; const lv = s.level;
    const bagGold = c.won ? this.bagItems.filter(i => i.kind === 'moneybag').reduce((a, i) => a + ITEMS.moneybag.values[i.level - 1], 0) : 0;
    const baseGold = c.won ? ECONOMY.winGold(lv) : 0;
    const wd = Object.entries(c.stats.weapon).map(([id, value]) => { const it = this.find(id)!; return { id, label: itemLabel(it), value }; });
    for (const w of wd) s.stats.contribution[w.label] = (s.stats.contribution[w.label] ?? 0) + w.value;
    if (c.stats.absorbed) s.stats.contribution['盾牌吸收'] = (s.stats.contribution['盾牌吸收'] ?? 0) + c.stats.absorbed;
    if (c.stats.healed) s.stats.contribution['药水治疗'] = (s.stats.contribution['药水治疗'] ?? 0) + c.stats.healed;
    const last: LastBattle = { level: lv, won: c.won, reason: c.reason, time: c.t / 1000, weaponDamage: wd, shieldAbsorb: c.stats.absorbed, potionHeal: c.stats.healed, bagGold, baseGold };
    s.last = last;
    if (!c.won) { s.hp = 0; s.phase = 'defeat'; return this.commit(); }
    s.stats.kills++;
    s.gold += baseGold + bagGold; s.stats.goldEarned += baseGold + bagGold;
    s.hp = c.hp;
    if (lv >= LEVELS.length) { s.phase = 'victory'; return this.commit(); }
    s.hp = Math.min(s.maxHp, s.hp + Math.round(s.maxHp * ECONOMY.healAfterWin));
    const r = new Rng(s.rng);
    s.loot = { level: lv, options: rollItems(r, lv + 1, 3), claimed: false };
    s.rng = r.state;
    s.phase = 'loot';
    return this.commit();
  }
  claimLoot(idx: number): Result {
    if (this.s.phase !== 'loot' || !this.s.loot || this.s.loot.claimed) return fail('奖励已领取。');
    const o = this.s.loot.options[idx]; if (!o) return fail('无效选择。');
    this.s.loot.claimed = true;
    const it = this.addTemp(o.kind, o.level);
    // 进入下一关的准备阶段：商店刷新、刷新费用重置
    this.s.level++; this.s.phase = 'prep';
    this.s.shop = { level: this.s.level, slots: [], refreshes: 0 }; rollShop(this.s);
    return this.commit({ ok: true, msg: `获得${itemLabel(it)}，已放入临时区` });
  }
}
