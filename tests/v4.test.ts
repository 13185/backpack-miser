import { describe, expect, it } from 'vitest';
import { splitDirect, splitIncoming } from '../src/config/v4/elements';
import { getLevel } from '../src/config/v3/levels';
import { Game, RESERVE_CAP, newGameState } from '../src/systems/game';
import { activateGuard, createCombat, simulate, stepCombat } from '../src/systems/combat';
import { ITEMS } from '../src/config/items';
import { weaponDamage } from '../src/systems/adjacency';
import { itemPlace } from '../src/systems/placement';
import { nextRandom } from '../src/systems/rng';
import { isArmorKind } from '../src/config/v4/armor';
import { migrateV3 } from '../src/systems/save';

describe('V4 元素公式', () => {
  it('无属性保持原值，火打高抗变少，水打负抗变多，火打木略增', () => {
    expect(splitDirect(100, null, 60).total).toBe(100);
    expect(splitDirect(100, 'fire', 60).total).toBe(64);
    expect(splitDirect(100, 'water', -20).total).toBe(112);
    expect(splitDirect(100, 'fire', -10).total).toBe(106);
    expect(splitIncoming(100, 'fire', 0.2, 40, false)).toBe(68);
    expect(splitIncoming(100, 'fire', 0.2, 40, true)).toBe(40);
  });
});

describe('V4.1 穿戴引用', () => {
  it('主手留在原格，只生成一个攻击者，邻接仍然计入', () => {
    const g = new Game(newGameState(1, { heroClass: 'ranger' }));
    g.s.items = [
      { id: 'd', kind: 'dagger', level: 1, x: 0, y: 0, rotated: false },
      { id: 'r', kind: 'ruby', level: 1, x: 1, y: 0, rotated: false },
    ];
    const dagger = g.find('d')!;
    const x = dagger.x!;
    const y = dagger.y!;
    const marked = weaponDamage(g.s.items, dagger);
    expect(marked).toBeGreaterThan(ITEMS.dagger.values[0]);
    expect(g.equipHand(dagger.id).ok).toBe(true);
    expect(itemPlace(dagger)).toBe('bag');
    expect(dagger.x).toBe(x);
    expect(dagger.y).toBe(y);
    expect(g.s.mainHandId).toBe(dagger.id);
    const c = g.makeCombat();
    const actors = c.actors.filter(a => a.id === dagger.id);
    expect(actors).toHaveLength(1);
    expect(actors[0].value).toBe(marked);
    expect(g.toReserve(dagger.id).ok).toBe(true);
    expect(g.s.mainHandId).toBeNull();
    expect(g.makeCombat().actors.some(a => a.id === dagger.id)).toBe(false);
    expect(g.unequip(dagger.id).ok).toBe(true);
    expect(itemPlace(dagger)).toBe('temp');
  });

  it('护甲未引用时没有抗性，穿上后仍占格', () => {
    const g = new Game(newGameState(2));
    const it = g.addTemp('furnace_lining', 3);
    expect(createCombat(g.s.items, 100, 100, getLevel(1)).playerResist.fire).toBe(0);
    expect(g.equipArmor(it.id).ok).toBe(true);
    expect(itemPlace(it)).toBe('bag');
    expect(g.s.armorId).toBe(it.id);
    expect(g.makeCombat().playerResist.fire).toBe(40);
    const x = it.x; const y = it.y;
    expect(g.unequip(it.id).ok).toBe(true);
    expect(it.x).toBe(x);
    expect(it.y).toBe(y);
    expect(g.makeCombat().playerResist.fire).toBe(0);
    expect(g.toReserve(it.id).ok).toBe(true);
    expect(g.makeCombat().playerResist.fire).toBe(0);
  });

  it('备用箱只有两件，多出来的不能再塞进去', () => {
    const g = new Game(newGameState(3));
    const a = g.addTemp('dagger', 1);
    const b = g.addTemp('dagger', 1);
    const c = g.addTemp('dagger', 1);
    expect(RESERVE_CAP).toBe(2);
    expect(g.toReserve(a.id).ok).toBe(true);
    expect(g.toReserve(b.id).ok).toBe(true);
    expect(g.toReserve(c.id).ok).toBe(false);
    expect(itemPlace(c)).toBe('temp');
    expect(g.reserveItems).toHaveLength(2);
  });

  it('旧档主手放回格子，超额备用进只取出暂存', () => {
    const s = newGameState(4);
    const dagger = s.items.find(i => i.kind === 'dagger')!;
    dagger.bin = 'hand';
    dagger.x = null;
    dagger.y = null;
    s.items.push(
      { id: 'r1', kind: 'dagger', level: 1, x: null, y: null, rotated: false, bin: 'reserve' },
      { id: 'r2', kind: 'dagger', level: 1, x: null, y: null, rotated: false, bin: 'reserve' },
      { id: 'r3', kind: 'dagger', level: 1, x: null, y: null, rotated: false, bin: 'reserve' },
    );
    migrateV3(s);
    expect(s.mainHandId).toBe(dagger.id);
    expect(itemPlace(dagger)).toBe('bag');
    expect(s.items.filter(i => i.bin === 'reserve')).toHaveLength(2);
    expect(s.items.find(i => i.id === 'r3')?.bin).toBe('legacy');
    const g = new Game(s);
    expect(g.makeCombat().actors.filter(a => a.id === dagger.id)).toHaveLength(1);
    expect(g.toReserve('r3').ok).toBe(false);
    expect(g.unequip('r3').ok).toBe(true);
    expect(itemPlace(g.find('r3')!)).toBe('temp');
    migrateV3(s);
    expect(s.items.filter(i => i.id === dagger.id)).toHaveLength(1);
  });

  it('待整理拖进槽之前，没有格子就拒绝', () => {
    const g = new Game(newGameState(5));
    g.s.cols = 1;
    g.s.rows = 2;
    g.s.items = [{ id: 'd', kind: 'dagger', level: 1, x: 0, y: 0, rotated: false }];
    const extra = g.addTemp('dagger', 1);
    expect(g.equipHand(extra.id).ok).toBe(false);
    expect(g.s.mainHandId ?? null).toBeNull();
    expect(itemPlace(extra)).toBe('temp');
    expect(g.equipHand('d').ok).toBe(true);
    expect(g.find('d')?.x).toBe(0);
  });
});

describe('V4 寻装与熔炉', () => {
  it('寻装不改主线生命和金币', () => {
    const g = new Game(newGameState(3));
    g.s.level = 21;
    g.s.currentChapter = 5;
    g.s.hp = 40;
    g.s.gold = 15;
    g.s.v4LessonGranted = true;
    expect(g.startGearTrial('c5-guard').ok).toBe(true);
    const c = g.makeCombat();
    simulate(c);
    g.settle(c);
    expect(g.s.phase).toBe('prep');
    expect(g.s.hp).toBe(40);
    expect(g.s.gold).toBe(15);
    expect(g.s.level).toBe(21);
  });

  it('熔炉第三次普攻后进入过热预警，而不是再叠一套过热', () => {
    const lv = getLevel(35);
    expect(lv.furnaceCycle).toBe(true);
    const c = createCombat([], 500, 500, { ...lv, atk: 1, interval: 0.5, hp: 5000 });
    const evs = [];
    for (let i = 0; i < 30 && !c.over && c.furnaceWindupUntil === 0; i++) evs.push(...stepCombat(c, 500));
    expect(c.furnaceNormals).toBe(3);
    expect(c.furnaceWindupUntil).toBeGreaterThan(0);
    expect(lv.overheat).toBeUndefined();
  });

  it('预警里的水伤达到阈值就取消重击，火伤不算，取消后没有补打', () => {
    const lv = getLevel(35);
    const water = createCombat([
      { id: 'w', kind: 'greatsword', level: 3, x: 0, y: 0, rotated: false, element: 'water' },
    ], 500, 500, { ...lv, hp: 8000, atk: 1, interval: 1, armor: 4 });
    while (!water.over && water.furnaceWindupUntil === 0 && water.t < 20000) stepCombat(water, 200);
    const actor = water.actors.find(a => a.id === 'w')!;
    actor.value = 900;
    let heavy = 0;
    for (let i = 0; i < 40 && !water.over; i++) {
      const ev = stepCombat(water, 200);
      heavy += ev.filter(e => e.type === 'heavyStrike').length;
      if (water.furnaceBreaks > 0) break;
    }
    expect(water.furnaceBreaks).toBe(1);
    expect(heavy).toBe(0);
    const fire = createCombat([
      { id: 'f', kind: 'greatsword', level: 3, x: 0, y: 0, rotated: false, element: 'fire' },
    ], 500, 500, { ...lv, hp: 8000, atk: 1, interval: 1, armor: 4 });
    while (!fire.over && fire.furnaceWindupUntil === 0 && fire.t < 20000) stepCombat(fire, 200);
    fire.actors.find(a => a.id === 'f')!.value = 900;
    for (let i = 0; i < 15 && !fire.over && fire.furnaceWindupUntil > 0; i++) stepCombat(fire, 200);
    expect(fire.furnaceWater).toBe(0);
    expect(fire.furnaceBreaks).toBe(0);
  });

  it('1 倍和 2 倍步长走到同一逻辑结果', () => {
    const lv = { ...getLevel(35), hp: 300, atk: 0, interval: 1, armor: 0 };
    const run = (dt: number) => {
      const c = createCombat([
        { id: 'd', kind: 'dagger', level: 3, x: 0, y: 0, rotated: false },
      ], 200, 200, lv);
      while (!c.over && c.t < 30000) stepCombat(c, dt);
      return { won: c.won, t: c.t, mHp: c.mHp, hp: c.hp, breaks: c.furnaceBreaks };
    };
    expect(run(100)).toEqual(run(200));
  });
});

describe('V4 方案、合成、商店和防御', () => {
  it('方案只留引用，卖掉后提示失效且不生成新装备', () => {
    const g = new Game(newGameState(4));
    const dagger = g.s.items.find(i => i.kind === 'dagger')!;
    g.equipHand(dagger.id);
    expect(g.saveLoadout(0).ok).toBe(true);
    const before = g.s.items.length;
    g.sell(dagger.id);
    const r = g.applyLoadout(0);
    expect(r.ok).toBe(true);
    expect(r.ok && r.msg).toContain('不在了');
    expect(g.s.items.length).toBe(before - 1);
    expect(g.handItem).toBeUndefined();
  });

  it('不同元素合成默认留下主装备，失败时主装备元素不变', () => {
    const g = new Game(newGameState(5));
    g.s.items.push(
      { id: 'src', kind: 'dagger', level: 1, x: null, y: null, rotated: false, element: 'fire' },
      { id: 'tgt', kind: 'dagger', level: 1, x: 0, y: 2, rotated: false, element: 'water' },
    );
    expect(g.merge('src', 'tgt').ok).toBe(true);
    expect(g.find('tgt')?.element).toBe('water');
    expect(g.find('tgt')?.level).toBe(2);
    expect(g.find('src')).toBeUndefined();

    const h = new Game(newGameState(6));
    h.s.level = 13;
    h.s.items.push(
      { id: 'src', kind: 'dagger', level: 3, x: null, y: null, rotated: false, element: 'fire' },
      { id: 'tgt', kind: 'dagger', level: 3, x: 0, y: 2, rotated: false, element: 'water' },
    );
    let state = 1;
    for (let i = 0; i < 50; i++) {
      const [u, n] = nextRandom(state);
      if (u >= 0.5) { h.s.forgeRng = state; break; }
      state = n;
    }
    const snap = h.find('tgt')!.element;
    expect(h.gambleMerge('src', 'tgt').msg).toContain('还在');
    expect(h.find('tgt')?.element).toBe(snap);
    expect(h.find('tgt')?.level).toBe(3);
  });

  it('11 关后商店有一件 1–3 级衬甲，没有四五级', () => {
    const g = new Game(newGameState(7));
    g.s.level = 20;
    g.s.gold = 50;
    expect(g.refreshShop().ok).toBe(true);
    const armor = g.s.shop.slots.filter(s => isArmorKind(s.kind));
    expect(armor.length).toBe(1);
    expect(armor[0].level).toBeLessThanOrEqual(3);
    expect(armor[0].level).toBeGreaterThanOrEqual(1);
  });

  it('手动防御会减伤，冷却中不能再开；自动会接住临近的重击预警', () => {
    const manual = createCombat([
      { id: 'd', kind: 'dagger', level: 1, x: 0, y: 0, rotated: false },
    ], 100, 100, { monster: 'slime', title: 't', hp: 9999, atk: 10, interval: 1, level: 12 });
    manual.autoGuard = false;
    expect(activateGuard(manual)).toBe(true);
    expect(activateGuard(manual)).toBe(false);
    let loss = 0;
    for (let i = 0; i < 20 && !manual.over; i++) {
      const ev = stepCombat(manual, 200);
      const hit = ev.find(e => e.type === 'monsterAttack');
      if (hit && hit.type === 'monsterAttack') { loss = hit.hpLoss; break; }
    }
    expect(loss).toBe(6);

    const auto = createCombat([
      { id: 'd', kind: 'dagger', level: 1, x: 0, y: 0, rotated: false },
    ], 100, 100, { monster: 'slime', title: 't', hp: 9999, atk: 0, interval: 5, level: 12 });
    auto.autoGuard = true;
    auto.heavyWindupUntil = 600;
    stepCombat(auto, 200);
    expect(auto.guardUses).toBe(1);
  });
});
