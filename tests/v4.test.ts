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
import { SKILL_RAMP_STEP, bossSkillLine } from '../src/config/v4/bosses';
import { migrateV3 } from '../src/systems/save';
import { gearTrialLevel } from '../src/systems/gearTrial';

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

describe('穿戴离开背包', () => {
  it('主手腾出格子，只打一次，不再吃邻接', () => {
    const g = new Game(newGameState(1, { heroClass: 'ranger' }));
    g.s.items = [
      { id: 'd', kind: 'dagger', level: 1, x: 0, y: 0, rotated: false },
      { id: 'r', kind: 'ruby', level: 1, x: 1, y: 0, rotated: false },
    ];
    const dagger = g.find('d')!;
    const marked = weaponDamage(g.s.items, dagger);
    expect(marked).toBeGreaterThan(ITEMS.dagger.values[0]);
    expect(g.equipHand(dagger.id).ok).toBe(true);
    expect(itemPlace(dagger)).toBe('hand');
    expect(dagger.x).toBeNull();
    expect(g.bagItems.some(i => i.id === dagger.id)).toBe(false);
    expect(g.s.items.filter(i => i.id === dagger.id)).toHaveLength(1);
    const c = g.makeCombat();
    const actors = c.actors.filter(a => a.id === dagger.id);
    expect(actors).toHaveLength(1);
    expect(actors[0].value).toBe(ITEMS.dagger.values[0]);
    expect(g.unequip(dagger.id).ok).toBe(true);
    expect(itemPlace(dagger)).toBe('bag');
    expect(g.s.mainHandId).toBeNull();
  });

  it('护甲穿上后腾格才有抗性，背包满了卸下就进待整理', () => {
    const g = new Game(newGameState(2));
    const it = g.addTemp('furnace_lining', 3);
    expect(createCombat(g.s.items, 100, 100, getLevel(1)).playerResist.fire).toBe(0);
    expect(g.equipArmor(it.id).ok).toBe(true);
    expect(itemPlace(it)).toBe('armor');
    expect(g.bagItems.some(i => i.id === it.id)).toBe(false);
    expect(g.makeCombat().playerResist.fire).toBe(40);
    g.s.items = g.s.items.filter(i => i.id === it.id);
    for (let n = 0; n < g.s.cols * g.s.rows; n++) {
      g.s.items.push({ id: 'fill' + n, kind: 'ruby', level: 1, x: n % g.s.cols, y: Math.floor(n / g.s.cols), rotated: false });
    }
    expect(g.unequip(it.id).ok).toBe(true);
    expect(itemPlace(it)).toBe('temp');
    expect(g.s.items.filter(i => i.id === it.id)).toHaveLength(1);
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

  it('旧档已穿戴的主手保持离包，超额备用进只取出暂存', () => {
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
    expect(itemPlace(dagger)).toBe('hand');
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

  it('背包占满也能把待整理的武器穿上，并腾不出第二件', () => {
    const g = new Game(newGameState(5));
    g.s.cols = 1;
    g.s.rows = 2;
    g.s.items = [{ id: 'd', kind: 'dagger', level: 1, x: 0, y: 0, rotated: false }];
    const extra = g.addTemp('dagger', 1);
    expect(g.equipHand(extra.id).ok).toBe(true);
    expect(itemPlace(extra)).toBe('hand');
    expect(g.find('d')?.x).toBe(0);
    expect(g.s.items.filter(i => i.kind === 'dagger')).toHaveLength(2);
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

  it('挑战委托打的是训练快照，胜利只打开领奖，不推进主线', () => {
    const g = new Game(newGameState(9));
    g.s.level = 11;
    g.s.currentChapter = 3;
    g.s.hp = 40;
    g.s.gold = 15;
    g.s.v4LessonGranted = true;
    const main = getLevel(11);
    expect(g.startGearTrial('c3-guard').ok).toBe(true);
    const c = g.makeCombat();
    const train = gearTrialLevel(3, 11);
    expect(c.encounterKind).toBe('gearTrial');
    expect(c.boss).toBe(false);
    expect(c.mMaxHp).toBe(train.hp);
    expect(c.mMaxHp).not.toBe(main.hp);
    expect(c.mAtk).toBe(train.atk);
    c.mHp = 0;
    c.over = true;
    c.won = true;
    c.reason = '怪物被击败！';
    const r = g.settle(c);
    expect(r.ok).toBe(true);
    expect(g.s.level).toBe(11);
    expect(g.s.gold).toBe(15);
    expect(g.s.hp).toBe(40);
    expect(g.s.phase).toBe('prep');
    expect(g.s.completion ?? null).toBeNull();
    expect(g.s.gearTrials?.trials.find(t => t.id === 'c3-guard')?.ready).toBe(true);
    expect(g.s.gearTrials?.trials.find(t => t.id === 'c3-guard')?.claimed).toBe(false);
    expect(g.claimGearTrial('c3-guard').ok).toBe(true);
    expect(g.s.level).toBe(11);
  });

  it('寻找套装失败不把主线生命打成死档', () => {
    const g = new Game(newGameState(10));
    g.s.level = 11;
    g.s.currentChapter = 3;
    g.s.hp = 40;
    g.s.gold = 15;
    g.s.v4LessonGranted = true;
    expect(g.startGearTrial('c3-counter').ok).toBe(true);
    const c = g.makeCombat();
    c.hp = 0;
    c.over = true;
    c.won = false;
    c.reason = '生命耗尽，冒险失败。';
    g.settle(c);
    expect(g.s.hp).toBe(40);
    expect(g.s.level).toBe(11);
    expect(g.s.phase).toBe('prep');
    expect(g.s.gold).toBe(15);
    expect(g.s.gearTrials?.trials.find(t => t.id === 'c3-counter')?.ready).toBe(false);
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

describe('首领元素技能', () => {
  it('预告用中文技能名，土不另起技能', () => {
    expect(bossSkillLine(15)).toContain('木');
    expect(bossSkillLine(15)).toContain('回血大招');
    expect(bossSkillLine(20)).toContain('金碧辉煌');
    expect(bossSkillLine(25)).toContain('大海无量');
    expect(bossSkillLine(35)).toContain('流星火雨');
    expect(bossSkillLine(30)).toContain('土');
    expect(bossSkillLine(30)).not.toContain('回血');
    expect(bossSkillLine(10)).toBeNull();
    expect(SKILL_RAMP_STEP).toBe(0.05);
  });

  it('木首领回血写进生命，施放后伤害叠乘 1.05', () => {
    const lv = { ...getLevel(15), hp: 1000, atk: 10, interval: 3 };
    const c = createCombat([], 500, 500, lv);
    c.mHp = 100;
    const names: string[] = [];
    while (!c.over && c.t < 13000 && c.skillCasts < 1) {
      for (const e of stepCombat(c, 200)) if (e.type === 'elementSkill') names.push(e.name);
    }
    expect(names).toContain('回血大招');
    expect(c.mHp).toBe(100 + Math.round(1000 * 0.08));
    expect(c.skillRamp).toBeCloseTo(1.05);
  });

  it('火雨被火抗甲压低，土首领不放这四招', () => {
    const lv = { ...getLevel(35), hp: 8000, atk: 100, interval: 3 };
    const bare = createCombat([], 9999, 9999, lv);
    const worn = createCombat([
      { id: 'a', kind: 'furnace_lining', level: 3, x: null, y: null, rotated: false, bin: 'armor' },
    ], 9999, 9999, lv, { armorId: 'a' });
    const take = (c: ReturnType<typeof createCombat>) => {
      const hits: number[] = [];
      while (!c.over && c.t < 13000 && hits.length < 3) {
        for (const e of stepCombat(c, 200)) if (e.type === 'elementSkill' && e.dmg) hits.push(e.dmg);
      }
      return hits;
    };
    const open = take(bare);
    const resisted = take(worn);
    expect(open).toHaveLength(3);
    expect(resisted).toHaveLength(3);
    expect(resisted[0]).toBeLessThan(open[0]);
    const earth = createCombat([], 9999, 9999, { ...getLevel(30), hp: 5000, atk: 10, interval: 3 });
    let named = 0;
    while (!earth.over && earth.t < 13000) {
      named += stepCombat(earth, 500).filter(e => e.type === 'elementSkill').length;
    }
    expect(named).toBe(0);
  });
});
