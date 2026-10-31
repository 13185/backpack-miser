import { describe, expect, it } from 'vitest';
import { getLevel } from '../src/config/v3/levels';
import { CHAPTER_BG, MONSTER_ART, MONSTER_BASE } from '../src/config/monsters';
import { pickEnemyArt, ELITE_LEVEL_ART } from '../src/art/enemyArt';
import { createCombat, simulate, stepCombat } from '../src/systems/combat';
import { Game, newGameState } from '../src/systems/game';
import type { ItemInstance } from '../src/models/types';

const mk = (kind: ItemInstance['kind'], id: string, level: 1 | 2 | 3 = 1): ItemInstance =>
  ({ id, kind, level, x: 0, y: 0, rotated: true });

describe('十章美术与Boss映射', () => {
  it('bg_ch1–10 与主要 Boss 图注册', () => {
    for (let c = 1; c <= 10; c++) expect(CHAPTER_BG[c]?.key).toBe(`bg_ch${c}`);
    expect(getLevel(5).monster).toBe('mimic');
    expect(getLevel(10).monster).toBe('iron_warden');
    expect(getLevel(15).monster).toBe('spider_queen');
    expect(getLevel(20).monster).toBe('tax_lord');
    expect(getLevel(25).monster).toBe('salt_captain');
    expect(getLevel(30).monster).toBe('mirror_auditor');
    expect(getLevel(35).monster).toBe('furnace_colossus');
    expect(getLevel(40).monster).toBe('silence_warden');
    expect(getLevel(45).monster).toBe('debt_regent');
    expect(getLevel(50).monster).toBe('golden_heart');
    expect(MONSTER_ART.furnace_colossus?.src).toContain('B35');
    expect(MONSTER_ART.golden_heart?.src).toContain('B50');
    expect(MONSTER_BASE.golden_heart.ability).toContain('三阶段');
  });
});

describe('回响 / 过热 / 祝祷 / 心脏', () => {
  it('回响：每2次攻击后延迟追加', () => {
    const lv = getLevel(30);
    expect(lv.echo).toBeTruthy();
    const c = createCombat([mk('dagger', 'd', 3)], 100, 100, {
      ...lv, hp: 5000, atk: 10, interval: 1, armor: 0,
    });
    // 推到两次怪物攻击
    let echoes = 0;
    for (let i = 0; i < 50 && !c.over; i++) {
      const ev = stepCombat(c, 200);
      echoes += ev.filter(e => e.type === 'echo').length;
    }
    expect(echoes).toBeGreaterThanOrEqual(1);
  });
  it('熔炉过热预警结束后护甲归零', () => {
    const lv = getLevel(35);
    expect(lv.furnaceCycle).toBe(true);
    const c = createCombat([mk('dagger', 'd', 3)], 500, 500, {
      ...lv, hp: 8000, atk: 5, interval: 0.4, armor: 4,
    });
    let vent = false;
    for (let i = 0; i < 120 && !c.over; i++) {
      stepCombat(c, 200);
      if (c.furnaceVentUntil > c.t && c.armor === 0) { vent = true; break; }
    }
    expect(vent).toBe(true);
  });
  it('祝祷获得自盾', () => {
    const lv = getLevel(40);
    expect(lv.pray).toBeTruthy();
    const c = createCombat([mk('dagger', 'd', 3)], 100, 100, {
      ...lv, hp: 5000, atk: 1, interval: 5,
    });
    stepCombat(c, lv.pray!.intervalMs);
    expect(c.mShield).toBeGreaterThan(0);
  });
  it('黄金心脏三阶段切换', () => {
    const lv = getLevel(50);
    expect(lv.heartPhases).toBeTruthy();
    const c = createCombat([mk('greatsword', 'g', 3)], 100, 100, {
      ...lv, hp: 1000, atk: 0, interval: 10, armor: 0,
    });
    // 打到 phase2 阈值以下（HEART_TUNE.phase2At=0.80）
    while (!c.over && c.mHp / c.mMaxHp > 0.69) stepCombat(c, 500);
    expect(c.heartPhase).toBeGreaterThanOrEqual(2);
    expect(c.echo || c.heartPhase >= 2).toBeTruthy();
    while (!c.over && c.mHp / c.mMaxHp > 0.34) stepCombat(c, 500);
    if (!c.over) expect(c.heartPhase).toBe(3);
  });
});

describe('营地', () => {
  it('Boss 后进营地，离开才写检查点；休息回满', () => {
    const g = new Game(newGameState(1));
    g.s.level = 5; g.s.phase = 'battle'; g.s.battleToken = 1; g.s.hp = 40;
    g.settle({ over: true, won: true, reason: 't', t: 1, hp: 40, maxHp: 100, stats: { weapon: {}, absorbed: 0, healed: 0 } } as any);
    g.claimLoot(0);
    expect(g.s.phase).toBe('camp');
    const before = g.s.hp;
    expect(g.campRest().ok).toBe(true);
    expect(g.s.hp).toBe(Math.min(g.s.maxHp, before + Math.floor(g.s.maxHp * 0.3))); // V2 §21 休息30%
    expect(g.campRest().ok).toBe(false); // 已用
    expect(g.campLeave().ok).toBe(true);
    expect(g.s.chapterCheckpoint).not.toBeNull();
  });
});

describe('遗物 A01/A07/A08/A11/A12', () => {
  it('A07 对0甲加伤；A12 轻装改 maxHp', () => {
    const items = [mk('dagger', 'd', 1)];
    const c0 = createCombat(items, 100, 100, { monster: 'slime', title: 't', hp: 50, atk: 0, interval: 10, armor: 0 }, { relics: [] });
    const c1 = createCombat(items, 100, 100, { monster: 'slime', title: 't', hp: 50, atk: 0, interval: 10, armor: 0 }, { relics: ['A07'] });
    stepCombat(c0, 800); stepCombat(c1, 800);
    expect(c0.stats.weapon['d'] ?? 0).toBeGreaterThan(0);
    expect((c1.stats.weapon['d'] ?? 0)).toBeGreaterThan(c0.stats.weapon['d'] ?? 0);
    const c12 = createCombat(items, 100, 100, { monster: 'slime', title: 't', hp: 50, atk: 0, interval: 10 }, { relics: ['A12'] });
    expect(c12.maxHp).toBe(90);
  });
});


describe('后期调参', () => {
  it('故事战役在 A04 上再乘 3.4 压力，不再叠地狱倍率', async () => {
    const { V3_STAGES, V3_STAGES_BASE, STORY_BOSS_BUDGET, HARD_BANDS, hardParams, applyStoryBudgets, applyPressure, wallEase } = await import('../src/config/v3/campaign');
    const pressed = applyPressure(applyStoryBudgets(V3_STAGES_BASE));
    const cut = (n: number) => Math.floor(n * 2 * 0.7);
    const ease = (n: number) => Math.floor(n * 0.9);
    const wall = (level: number, n: number) => Math.floor(n * wallEase(level, true));
    expect(V3_STAGES[0].hp).toBe(cut(pressed[0].hp));
    expect(V3_STAGES[0].damage).toBe(pressed[0].damage);
    expect(V3_STAGES[0].hp).toBeGreaterThan(V3_STAGES_BASE[0].hp);
    expect(STORY_BOSS_BUDGET[20].hp).toBe(1100);
    expect(V3_STAGES[19].hp).toBe(wall(20, ease(cut(pressed[19].hp))));
    expect(V3_STAGES[19].damage).toBe(wall(20, ease(cut(pressed[19].damage))));
    expect(V3_STAGES[19].hp).not.toBe(1100);
    expect(HARD_BANDS.length).toBe(5);
    expect(hardParams(50).hp).toBeGreaterThan(hardParams(1).hp);
  });
});

describe('遗物 A03/A04/A06/A09/A10', () => {
  it('A03 每5次武器命中+2毒', () => {
    const items = [mk('dagger', 'd', 3)];
    const c = createCombat(items, 100, 100, { monster: 'slime', title: 't', hp: 5000, atk: 0, interval: 10, armor: 0 }, { relics: ['A03'] });
    for (let i = 0; i < 50 && c.weaponHitCount < 5 && !c.over; i++) stepCombat(c, 200);
    expect(c.weaponHitCount).toBeGreaterThanOrEqual(5);
    expect(c.poisonStacks).toBeGreaterThanOrEqual(2);
  });
  it('A04 药水治疗后缩短最长武器冷却', () => {
    const items = [mk('greatsword', 'g', 1), { ...mk('potion', 'p', 1), x: 1, y: 0, rotated: false }];
    // 开局 35HP：挨一下到阈值下并存活，再触发药水
    const c = createCombat(items, 35, 100, { monster: 'slime', title: 't', hp: 5000, atk: 20, interval: 1.0, armor: 0 }, { relics: ['A04'] });
    for (let i = 0; i < 40 && c.a04Procs === 0 && !c.over; i++) stepCombat(c, 200);
    expect(c.a04Procs).toBeGreaterThanOrEqual(1);
  });
  it('A06 休息标记下场+5', () => {
    const g = new Game(newGameState(1));
    g.s.level = 5; g.s.phase = 'battle'; g.s.battleToken = 1; g.s.hp = 40; g.s.relics = ['A06'];
    g.settle({ over: true, won: true, reason: 't', t: 1, hp: 40, maxHp: 100, stats: { weapon: {}, absorbed: 0, healed: 0 } } as any);
    g.claimLoot(0);
    expect(g.s.phase).toBe('camp');
    expect(g.campRest().ok).toBe(true);
    expect(g.s.storyFlags.a06Pending).toBe(true);
    const hp0 = g.s.hp;
    const c = g.makeCombat();
    expect(c.maxHp).toBe(g.s.maxHp + 5);
    expect(c.hp).toBe(Math.min(g.s.maxHp + 5, hp0 + 5));
  });
  it('A10 回响伤害降低25%', () => {
    const lv = getLevel(30);
    const base = createCombat([mk('dagger', 'd', 3)], 500, 500, {
      ...lv, hp: 8000, atk: 40, interval: 1, armor: 0,
    }, { relics: [] });
    const cut = createCombat([mk('dagger', 'd', 3)], 500, 500, {
      ...lv, hp: 8000, atk: 40, interval: 1, armor: 0,
    }, { relics: ['A10'] });
    let e0 = 0, e1 = 0;
    for (let i = 0; i < 40; i++) {
      e0 += stepCombat(base, 200).filter(e => e.type === 'echo').reduce((s, e: any) => s + e.dmg, 0);
      e1 += stepCombat(cut, 200).filter(e => e.type === 'echo').reduce((s, e: any) => s + e.dmg, 0);
    }
    expect(e1).toBeLessThan(e0);
    expect(e1).toBeGreaterThan(0);
  });
  it('A09 罗盘到期后减甲2持续2秒', () => {
    const items = [mk('dagger', 'd', 3), mk('compass', 'c', 1)];
    const c = createCombat(items, 100, 100, { monster: 'slime', title: 't', hp: 5000, atk: 0, interval: 10, armor: 5 }, { relics: ['A09'] });
    expect(c.compassDebuff).toBeGreaterThan(0);
    stepCombat(c, 8000); // 到期
    expect(c.a09Debuff).toBe(2);
    stepCombat(c, 2000);
    expect(c.a09Debuff).toBe(0);
  });
});

describe('真实敌人 kind 与双体', () => {
  it('N05 rats 与 N15–N24 为真实 kind', () => {
    expect(getLevel(4).monster).toBe('rats');
    expect(getLevel(4).dualUnits).toBe(true);
    expect(getLevel(23).monster).toBe('smuggler'); // N15
    expect(getLevel(26).monster).toBe('mirror_sentinel'); // N16
    expect(getLevel(27).monster).toBe('sandmirror_xbow'); // N17
    expect(getLevel(31).monster).toBe('ash_sapper'); // N18
    expect(getLevel(32).monster).toBe('furnace_guard'); // N19
    expect(getLevel(36).monster).toBe('chanter'); // N20
    expect(getLevel(37).monster).toBe('amulet_attendant'); // N21
    expect(getLevel(41).monster).toBe('echo_guard'); // N22
    expect(getLevel(46).monster).toBe('core_soldier'); // N23
    expect(getLevel(47).monster).toBe('lamp_priest'); // N24
    expect(MONSTER_ART.rats?.src).toContain('N05');
    expect(MONSTER_ART.lamp_priest?.src).toContain('N24');
  });
  it('双体须清双目标才胜利', () => {
    const lv = { ...getLevel(4), hp: 40, atk: 0, interval: 10, armor: 0, dualUnits: true as const };
    const c = createCombat([mk('dagger', 'd', 3)], 100, 100, lv);
    expect(c.dualUnits).toBe(true);
    expect(c.adds.some(a => a.id === 'twin')).toBe(true);
    expect(c.mHp + c.adds.find(a => a.id === 'twin')!.maxHp).toBe(40);
    // 打到主目标死、twin 仍活 → 未胜利
    while (!c.over && c.mHp > 0) stepCombat(c, 200);
    expect(c.over).toBe(false);
    expect(c.mHp).toBe(0);
    expect(c.adds.find(a => a.id === 'twin')!.hp).toBeGreaterThan(0);
    while (!c.over) stepCombat(c, 200);
    expect(c.won).toBe(true);
  });
  it('E08/E28 精英为真实双体；E38 为祝祷双单位', () => {
    const g = new Game(newGameState(1));
    g.s.level = 8; g.s.eliteActive = true; g.s.phase = 'prep';
    const c8 = g.makeCombat();
    expect(c8.dualUnits).toBe(true);
    expect(c8.adds.some(a => a.id === 'twin')).toBe(true);
    g.s.level = 28;
    const c28 = g.makeCombat();
    expect(c28.dualUnits).toBe(true);
    expect(c28.echo).toBeTruthy();
    g.s.level = 38;
    const c38 = g.makeCombat();
    expect(c38.dualUnits).toBe(false);
    expect(c38.pray).toBeTruthy();
    expect(c38.adds.some(a => a.id === 'prayer')).toBe(true);
    const prayHp = c38.adds.find(a => a.id === 'prayer')!.maxHp;
    expect(prayHp / (c38.mMaxHp + prayHp)).toBeCloseTo(0.25, 1);
  });
});

describe('精英立绘跟随路线选择', () => {
  it('未选精英时不返回精英皮；选了才返回', () => {
    const kind = getLevel(8).monster;
    const normal = pickEnemyArt(kind, 2, 8, false, undefined, { eliteActive: false });
    const elite = pickEnemyArt(kind, 2, 8, false, undefined, { eliteActive: true });
    expect(ELITE_LEVEL_ART[8]).toBeTruthy();
    expect(elite).toEqual(ELITE_LEVEL_ART[8]);
    expect(normal === ELITE_LEVEL_ART[8]).toBe(false);
    const boss = pickEnemyArt('mimic', 1, 5, true, undefined, { eliteActive: true });
    expect(boss).toBeUndefined();
  });
});
