import { describe, expect, it } from 'vitest';
import type { ItemInstance, ItemKind, Level } from '../src/models/types';
import { canPlace, occupiedCells, findSpot } from '../src/systems/placement';
import { canMerge, mergeItems } from '../src/systems/merge';
import { gemBonus, weaponDamage, weaponsBoostedBy } from '../src/systems/adjacency';
import { applyDamageToPlayer, createCombat, damageToMonster, simulate, stepCombat } from '../src/systems/combat';
import { buyPrice, sellPrice, refreshCost } from '../src/systems/economy';
import { Game, newGameState } from '../src/systems/game';
import { loadGame, saveGame, SAVE_KEY } from '../src/systems/save';
import { LEVELS } from '../src/config/levels';

let n = 0;
const mk = (kind: ItemKind, x: number | null, y: number | null, level: Level = 1, rotated = false): ItemInstance => ({ id: 't' + n++, kind, level, x, y, rotated });
const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) }; };
const lv = (o: Partial<(typeof LEVELS)[0]> = {}) => ({ monster: 'slime' as const, title: 't', hp: 100, atk: 5, interval: 1, ...o });

describe('背包放置', () => {
  it('旋转后的占格', () => {
    expect(occupiedCells('dagger', 0, 0, false)).toEqual([{ x: 0, y: 0 }, { x: 0, y: 1 }]);
    expect(occupiedCells('dagger', 0, 0, true)).toEqual([{ x: 0, y: 0 }, { x: 1, y: 0 }]);
    expect(occupiedCells('shield', 0, 0, true).length).toBe(4);
  });
  it('越界检测（拖动与旋转）', () => {
    expect(canPlace([], 5, 4, 'greatsword', 0, 2, false)).toBe(false);
    expect(canPlace([], 5, 4, 'greatsword', 0, 1, false)).toBe(true);
    expect(canPlace([], 5, 4, 'greatsword', 3, 0, true)).toBe(false);
    expect(canPlace([], 5, 4, 'potion', -1, 0, false)).toBe(false);
  });
  it('不能重叠，移动时忽略自身原位', () => {
    const s = mk('shield', 0, 0);
    expect(canPlace([s], 5, 4, 'potion', 1, 1, false)).toBe(false);
    expect(canPlace([s], 5, 4, 'shield', 1, 1, false, s.id)).toBe(true);
    expect(canPlace([s], 5, 4, 'potion', 2, 0, false)).toBe(true);
  });
  it('原位旋转合法性 & 无效操作不改变装备', () => {
    const g = new Game(newGameState(1));
    g.s.items = [mk('dagger', 0, 0), mk('potion', 1, 0)];
    const before = JSON.stringify(g.s.items);
    expect(g.rotate(g.s.items[0].id).ok).toBe(false);
    expect(g.move(g.s.items[0].id, 4, 3, false).ok).toBe(false);
    expect(JSON.stringify(g.s.items)).toBe(before);
    g.s.items[1].x = 3;
    expect(g.rotate(g.s.items[0].id).ok).toBe(true);
  });
  it('扩容后新行可用，最多两次', () => {
    const g = new Game(newGameState(2)); g.s.gold = 200;
    expect(canPlace(g.s.items, 5, g.s.rows, 'potion', 0, 4, false)).toBe(false);
    expect(g.expand().ok).toBe(true); expect(g.s.rows).toBe(5); expect(g.s.gold).toBe(170);
    const p = g.s.items[2]; expect(g.move(p.id, 0, 4, false).ok).toBe(true);
    expect(g.expand().ok).toBe(true); expect(g.s.rows).toBe(6); expect(g.s.gold).toBe(120);
    expect(g.expand().ok).toBe(false); expect(g.s.rows).toBe(6);
  });
  it('初始装备自动合法摆放', () => {
    const s = newGameState(3);
    expect(s.items.map(i => i.kind)).toEqual(['dagger', 'shield', 'moneybag']);
    expect(s.items.every(i => i.x !== null)).toBe(true);
    expect(findSpot(s.items, 5, 4, 'potion')).not.toBeNull();
  });
});

describe('合成', () => {
  it('仅同种同级可合成，3级不能合成', () => {
    expect(canMerge(mk('dagger', 0, 0), mk('dagger', 1, 0)).ok).toBe(true);
    expect(canMerge(mk('dagger', 0, 0), mk('dagger', 1, 0, 2))).toEqual({ ok: false, reason: '需要相同种类和等级才能合成。' });
    expect(canMerge(mk('dagger', 0, 0), mk('potion', 1, 0)).ok).toBe(false);
    expect(canMerge(mk('ruby', 0, 0, 3), mk('ruby', 1, 0, 3))).toEqual({ ok: false, reason: '装备已达到最高等级。' });
  });
  it('结果保留目标位置朝向、数量正确、临时区与背包间无复制', () => {
    const a = mk('dagger', null, null), b = mk('dagger', 2, 1, 1, true), c = mk('potion', 0, 0);
    const r = mergeItems([a, b, c], a.id, b.id);
    expect(r.items.length).toBe(2);
    expect(r.result).toMatchObject({ id: b.id, level: 2, x: 2, y: 1, rotated: true });
    expect(r.items.filter(i => i.kind === 'dagger').length).toBe(1);
  });
  it('无效合成不改变数组；重复合成不复制', () => {
    const a = mk('dagger', null, null), b = mk('dagger', 2, 1);
    const g = new Game(newGameState(1)); g.s.items = [a, b];
    expect(g.merge(a.id, b.id).ok).toBe(true);
    expect(g.merge(a.id, b.id).ok).toBe(false);
    expect(g.s.items.length).toBe(1); expect(g.s.items[0].level).toBe(2);
    const items = [mk('dagger', 0, 0), mk('potion', 1, 0)];
    expect(mergeItems(items, items[0].id, items[1].id).items).toBe(items);
  });
});

describe('宝石邻接', () => {
  it('上下左右生效，对角不生效', () => {
    const w = mk('dagger', 1, 1); // 占 (1,1)(1,2)
    expect(gemBonus([w, mk('ruby', 1, 0)], w).pct).toBe(15);
    expect(gemBonus([w, mk('ruby', 0, 2)], w).pct).toBe(15);
    expect(gemBonus([w, mk('ruby', 1, 3)], w).pct).toBe(15);
    expect(gemBonus([w, mk('ruby', 0, 0)], w).pct).toBe(0);
    expect(gemBonus([w, mk('ruby', 2, 3)], w).pct).toBe(0);
  });
  it('同一宝石接触多格只计一次；上限100%；临时区无效；只强化武器', () => {
    const w = mk('greatsword', 0, 0, 1, true); // 占 (0,0)(1,0)(2,0)
    const g1 = mk('ruby', 1, 1);
    expect(gemBonus([w, g1], w).pct).toBe(15);
    const big = mk('greatsword', 1, 0); // (1,0)(1,1)(1,2)
    const gems = [mk('ruby', 0, 0, 3), mk('ruby', 0, 1, 3), mk('ruby', 2, 0, 3)];
    expect(gemBonus([big, ...gems], big).pct).toBe(100);
    expect(weaponDamage([big, ...gems], big)).toBe(28);
    const tmp = mk('ruby', null, null, 3);
    expect(gemBonus([big, tmp], big).pct).toBe(0);
    const sh = mk('shield', 0, 0), r = mk('ruby', 2, 0);
    expect(weaponsBoostedBy([sh, r], r)).toEqual([]);
  });
  it('移动后加成立即变化', () => {
    const g = new Game(newGameState(1));
    const w = mk('dagger', 0, 0), r = mk('ruby', 1, 0); g.s.items = [w, r];
    expect(gemBonus(g.s.items, w).pct).toBe(15);
    g.move(r.id, 3, 3, false);
    expect(gemBonus(g.s.items, w).pct).toBe(0);
  });
});

describe('战斗', () => {
  it('首次攻击在完整间隔后；同一时间点顺序固定', () => {
    const c = createCombat([mk('dagger', 0, 0)], 100, 100, lv({ interval: 0.8 }));
    expect(stepCombat(c, 799)).toEqual([]);
    const ev = stepCombat(c, 1);
    expect(ev.map(e => e.type)).toEqual(['weapon', 'monsterAttack']);
  });
  it('护盾先于生命扣除', () => {
    expect(applyDamageToPlayer(50, 7, 10)).toEqual({ hp: 47, shield: 0, absorbed: 7, hpLoss: 3 });
    expect(applyDamageToPlayer(50, 20, 10)).toEqual({ hp: 50, shield: 10, absorbed: 10, hpLoss: 0 });
    expect(applyDamageToPlayer(5, 0, 10).hp).toBe(0);
  });
  it('护盾上限50%最大生命、开战从0开始', () => {
    const items = [mk('dagger', 0, 0), mk('shield', 1, 0, 3), mk('shield', 3, 0, 3), mk('shield', 1, 2, 3)];
    const c = createCombat(items, 100, 100, lv({ atk: 0, hp: 100000 }));
    expect(c.shield).toBe(0);
    stepCombat(c, 20000);
    expect(c.shield).toBe(50);
  });
  it('骷髅减伤至少1点', () => { expect(damageToMonster(5, 2)).toBe(3); expect(damageToMonster(2, 4)).toBe(1); });
  it('药水每场一次，按顺序判断并重检阈值', () => {
    const items = [mk('dagger', 0, 0), mk('potion', 1, 0, 3), mk('potion', 2, 0, 3)];
    const c = createCombat(items, 45, 100, lv({ atk: 10, interval: 1, hp: 100000 }));
    const ev = stepCombat(c, 1000);
    const pots = ev.filter(e => e.type === 'potion');
    expect(pots.length).toBe(1); // 35 → 喝一瓶到83，不浪费第二瓶
    expect(c.hp).toBe(83);
    stepCombat(c, 5000); // 降到 33 → 第二瓶
    expect(c.potions.every(p => p.used)).toBe(true);
    const all = simulate(c);
    expect(all.filter(e => e.type === 'potion').length).toBe(0);
  });
  it('致死伤害后不能复活，死亡后无任何事件', () => {
    const items = [mk('dagger', 0, 0), mk('potion', 1, 0, 3)];
    const c = createCombat(items, 10, 100, lv({ atk: 50, interval: 1, hp: 100000 }));
    const ev = simulate(c);
    expect(c.won).toBe(false); expect(c.hp).toBe(0);
    expect(ev.filter(e => e.type === 'potion').length).toBe(0);
    expect(ev[ev.length - 1].type).toBe('end');
    expect(stepCombat(c, 10000)).toEqual([]);
  });
  it('怪物死亡后不再攻击', () => {
    const c = createCombat([mk('dagger', 0, 0, 3)], 100, 100, lv({ hp: 16, interval: 0.8, atk: 99 }));
    const ev = simulate(c);
    expect(c.won).toBe(true); expect(ev.some(e => e.type === 'monsterAttack')).toBe(false);
  });
  it('倍速一致：分步长推进结果相同', () => {
    const items = [mk('dagger', 0, 0, 2), mk('greatsword', 1, 0), mk('shield', 2, 0), mk('ruby', 0, 2), mk('potion', 4, 0)];
    const L = LEVELS[5];
    const a = createCombat(items, 100, 100, L), b = createCombat(items, 100, 100, L), d = createCombat(items, 100, 100, L);
    while (!a.over) stepCombat(a, 16); // 1倍 60fps
    while (!b.over) stepCombat(b, 33); // 2倍
    while (!d.over) stepCombat(d, 100);
    expect([b.t, b.hp, b.mHp]).toEqual([a.t, a.hp, a.mHp]);
    expect([d.t, d.hp, d.mHp]).toEqual([a.t, a.hp, a.mHp]);
  });
  it('暂停（不推进）不产生事件', () => {
    const c = createCombat([mk('dagger', 0, 0)], 100, 100, lv());
    expect(stepCombat(c, 0)).toEqual([]); expect(c.t).toBe(0);
  });
  it('45秒狂暴、每5秒提升、90秒超时失败', () => {
    const items = [mk('dagger', 0, 0), mk('shield', 1, 0, 3), mk('shield', 3, 0, 3), mk('potion', 0, 3)];
    const c = createCombat(items, 100, 100, lv({ hp: 1000000, atk: 1, interval: 1 }));
    const ev = simulate(c);
    const en = ev.filter(e => e.type === 'enrage');
    expect(en[0].t).toBe(45000); expect(en[1].t).toBe(50000);
    expect(c.over).toBe(true); expect(c.won).toBe(false); expect(c.t).toBe(90000);
    expect(c.reason).toContain('90秒');
  });
  it('Boss 低于50%后加速仅一次', () => {
    const c = createCombat([mk('greatsword', 0, 0, 3)], 100, 100, lv({ hp: 200, boss: true, interval: 1.5, atk: 1 }));
    const ev = simulate(c);
    expect(ev.filter(e => e.type === 'bossHaste').length).toBe(1);
    expect(c.mInterval).toBe(1200);
  });
  it('开战快照：战斗中修改摆放不影响当前战斗', () => {
    const items = [mk('dagger', 0, 0)];
    const c = createCombat(items, 100, 100, lv());
    items[0].level = 3; items.push(mk('dagger', 2, 0, 3));
    expect(c.actors.filter(a => a.kind === 'weapon').length).toBe(1);
    expect(c.actors[0].value).toBe(5);
  });
});

describe('经济与流程', () => {
  it('价格公式', () => {
    expect(buyPrice('dagger', 1)).toBe(8); expect(buyPrice('dagger', 2)).toBe(20); expect(buyPrice('dagger', 3)).toBe(44);
    expect(sellPrice('dagger', 1)).toBe(3); expect(sellPrice('greatsword', 2)).toBe(Math.floor(29 * 0.4));
    expect(refreshCost(0)).toBe(3); expect(refreshCost(2)).toBe(7);
  });
  it('金币不足不能购买，金币不为负，重复购买被拒', () => {
    const g = new Game(newGameState(5)); g.s.gold = 0;
    expect(g.buy(0)).toEqual({ ok: false, msg: '金币不足。' }); expect(g.refreshShop().ok).toBe(false); expect(g.s.gold).toBe(0);
    g.s.gold = 1000; expect(g.buy(0).ok).toBe(true); expect(g.buy(0).ok).toBe(false);
    expect(g.tempItems.length).toBe(1);
  });
  it('有临时区装备或无武器时不能开战；开战后不能操作', () => {
    const g = new Game(newGameState(5)); g.s.gold = 100; g.buy(0);
    expect(g.startBattle()).toEqual({ ok: false, msg: '请先处理临时区装备。' });
    g.sell(g.tempItems[0].id);
    g.toTemp(g.s.items[0].id); g.sell(g.s.items[0].id);
    expect(g.startBattle()).toEqual({ ok: false, msg: '至少装备一把武器才能战斗。' });
    const g2 = new Game(newGameState(6)); g2.startBattle();
    expect(g2.move(g2.s.items[2].id, 4, 3, false).ok).toBe(false);
    expect(g2.buy(0).ok).toBe(false); expect(g2.sell(g2.s.items[0].id).ok).toBe(false);
  });
  it('胜利只结算一次；钱袋只按开战时背包计算；奖励只领一次', () => {
    const g = new Game(newGameState(7));
    g.startBattle(); const c = g.makeCombat(); simulate(c);
    const gold0 = g.s.gold;
    expect(g.settle(c).ok).toBe(true);
    expect(g.s.gold).toBe(gold0 + 10 + 4);
    expect(g.settle(c).ok).toBe(false); expect(g.s.gold).toBe(gold0 + 14);
    expect(g.claimLoot(0).ok).toBe(true); expect(g.claimLoot(1).ok).toBe(false);
    expect(g.tempItems.length).toBe(1); expect(g.s.level).toBe(2);
  });
  it('临时区钱袋不生效；失败不给钱袋', () => {
    const g = new Game(newGameState(8));
    g.toTemp(g.s.items[2].id); g.sell(g.s.items[2].id); // 卖掉钱袋
    g.s.items.push(mk('moneybag', null, null)); // 临时区（伪造）
    g.s.phase = 'battle'; g.s.battleToken++;
    const c = g.makeCombat(); simulate(c); const gold0 = g.s.gold; g.settle(c);
    expect(g.s.gold).toBe(gold0 + 10);
    const g2 = new Game(newGameState(9)); g2.s.hp = 1; g2.startBattle();
    const c2 = g2.makeCombat(); simulate(c2); const gg = g2.s.gold; g2.settle(c2);
    expect(c2.won).toBe(false); expect(g2.s.gold).toBe(gg); expect(g2.s.phase).toBe('defeat');
  });
  it('胜利后恢复15%生命', () => {
    const g = new Game(newGameState(7)); g.s.hp = 60; g.startBattle(); const c = g.makeCombat(); simulate(c); g.settle(c);
    expect(g.s.hp).toBe(Math.min(100, c.hp + 15));
  });
});

describe('存档', () => {
  it('保存/读取后商店与奖励不重新随机', () => {
    const st = mem(); const g = new Game(newGameState(11), s => saveGame(st, s)); g.s.gold = 100; g.buy(1);
    const r = loadGame(st); expect(r.status).toBe('ok');
    if (r.status === 'ok') { expect(r.state.shop).toEqual(g.s.shop); expect(r.state.rng).toBe(g.s.rng); }
  });
  it('战斗中存档恢复为同一场开战前快照', () => {
    const st = mem(); const g = new Game(newGameState(12), s => saveGame(st, s)); g.startBattle();
    const r = loadGame(st); if (r.status !== 'ok') throw 0;
    expect(r.state.phase).toBe('battle');
    const g2 = new Game(r.state); const a = g.makeCombat(), b = g2.makeCombat(); simulate(a); simulate(b);
    expect([a.t, a.hp]).toEqual([b.t, b.hp]);
  });
  it('损坏/不兼容存档友好提示', () => {
    const st = mem(); st.setItem(SAVE_KEY, '{oops'); expect(loadGame(st).status).toBe('corrupt');
    st.setItem(SAVE_KEY, JSON.stringify({ version: 999 })); expect(loadGame(st)).toMatchObject({ status: 'corrupt' });
    st.setItem(SAVE_KEY, JSON.stringify({ version: 1, level: 'x' })); expect(loadGame(st).status).toBe('corrupt');
    expect(loadGame(mem()).status).toBe('none');
  });
});
