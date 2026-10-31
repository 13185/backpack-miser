import { describe, expect, it } from 'vitest';
import { isBossLevel } from '../src/config/v3/campaign';
import { GOBLIN_HP, GOBLIN_LV4_CHANCE, GOBLIN_NAME, GOBLIN_SECONDS, goblinHp } from '../src/config/v4/goblin';
import { ITEMS } from '../src/config/items';
import type { ItemInstance } from '../src/models/types';
import { createCombat, stepCombat } from '../src/systems/combat';
import { Game, newGameState } from '../src/systems/game';
import { activeGoblin, ensureGoblinSpawns, goblinDropPool, goblinLevel, rollGoblinDrop } from '../src/systems/goblin';
import { nextRandom, Rng } from '../src/systems/rng';

function pack(rows: ItemInstance['kind'][], level: ItemInstance['level']): ItemInstance[] {
  return rows.map((kind, i) => ({ id: 'w' + i, kind, level, x: i, y: 0, rotated: false }));
}

describe('罗纹口袋哥布林', () => {
  it('三段各抽一个非首领关，存档里只抽一次', () => {
    const s = newGameState(7);
    const rows = s.goblinSpawns ?? [];
    expect(rows.map(r => r.band)).toEqual(['10-20', '20-30', '40-50']);
    for (const row of rows) {
      expect(row.done).toBe(false);
      expect(row.level).toBeGreaterThanOrEqual(row.band === '10-20' ? 10 : row.band === '20-30' ? 20 : 40);
      expect(row.level).toBeLessThanOrEqual(row.band === '10-20' ? 20 : row.band === '20-30' ? 30 : 49);
      expect(isBossLevel(row.level)).toBe(false);
      expect(row.level).not.toBe(50);
    }
    const before = rows.map(r => r.level);
    ensureGoblinSpawns(s);
    expect(s.goblinSpawns?.map(r => r.level)).toEqual(before);
    const saved = JSON.parse(s.chapterCheckpoint?.state ?? '{}');
    expect(saved.goblinSpawns.map((r: { level: number }) => r.level)).toEqual(before);
  });

  it('段里只剩首领时才落到非终局关，走过的段记成错过', () => {
    const s = newGameState(3);
    s.level = 30;
    s.goblinSpawns = [];
    ensureGoblinSpawns(s);
    const early = s.goblinSpawns?.find(r => r.band === '10-20');
    const mid = s.goblinSpawns?.find(r => r.band === '20-30');
    const late = s.goblinSpawns?.find(r => r.band === '40-50');
    expect(early).toMatchObject({ done: true, level: 0 });
    expect(mid?.level).toBe(30);
    expect(isBossLevel(mid!.level)).toBe(true);
    expect(late && late.level >= 41 && late.level <= 49 && !isBossLevel(late.level)).toBe(true);
  });

  it('三段血量是固定的 6000 / 12000 / 20000，攻击是 0，没有五行括号', () => {
    expect(GOBLIN_SECONDS).toBe(40);
    expect(GOBLIN_HP).toEqual({ '10-20': 6000, '20-30': 12000, '40-50': 20000 });
    expect(goblinHp('10-20')).toBe(6000);
    expect(goblinHp('20-30')).toBe(12000);
    expect(goblinHp('40-50')).toBe(20000);
    const lv = goblinLevel(16);
    expect(lv.title).toBe(GOBLIN_NAME);
    expect(lv.boss).toBe(false);
    expect(lv.atk).toBe(0);
    expect(lv.bossElement).toBeUndefined();
    expect(lv.title.includes('（')).toBe(false);
  });

  it('早段参考武器 40 秒打不完 6000 血，然后逃走，期间怪物不出手', () => {
    const lv = goblinLevel(16);
    const c = createCombat(pack(['dagger', 'greatsword', 'crossbow', 'warhammer'], 2).map((it, i) => (
      i === 3 ? { ...it, level: 1 as const } : it
    )), 80, 80, lv, { encounterKind: 'lootGoblin' });
    expect(c.mMaxHp).toBe(6000);
    const attacks = [];
    while (!c.over) attacks.push(...stepCombat(c, 200));
    expect(c.won).toBe(false);
    expect(c.escaped).toBe(true);
    expect(c.t).toBe(GOBLIN_SECONDS * 1000);
    expect(c.mHp).toBeGreaterThan(4000);
    expect(attacks.some(e => e.type === 'monsterAttack')).toBe(false);
    expect(c.hp).toBe(80);
  });

  it('击杀进待整理且不推进关卡；超时逃走不掉东西、不扣生命金币', () => {
    const g = new Game(newGameState(11));
    const row = g.s.goblinSpawns!.find(r => r.band === '10-20')!;
    g.s.level = row.level;
    g.s.hp = 77;
    g.s.gold = 123;
    expect(activeGoblin(g.s)?.level).toBe(row.level);
    g.startBattle();
    const c = g.makeCombat();
    expect(c.encounterKind).toBe('lootGoblin');
    expect(c.mAtk).toBe(0);
    c.mHp = 0; c.over = true; c.won = true; c.escaped = false;
    const msg = g.settle(c);
    expect(msg.ok).toBe(true);
    expect(g.s.phase).toBe('prep');
    expect(g.s.level).toBe(row.level);
    expect(g.s.hp).toBe(77);
    expect(g.s.gold).toBe(123);
    expect(g.tempItems).toHaveLength(1);
    expect([3, 4]).toContain(g.tempItems[0].level);
    expect(g.tempItems[0].kind).not.toBe('burden');
    expect(row.done).toBe(true);
    g.startBattle();
    expect(g.makeCombat().encounterKind).toBe('main');

    const g2 = new Game(newGameState(12));
    const row2 = g2.s.goblinSpawns!.find(r => r.band === '20-30')!;
    g2.s.level = row2.level;
    g2.s.hp = 50;
    g2.s.gold = 9;
    g2.startBattle();
    const flee = g2.makeCombat();
    while (!flee.over) stepCombat(flee, 500);
    expect(flee.won).toBe(false);
    expect(flee.escaped).toBe(true);
    expect(flee.t).toBe(GOBLIN_SECONDS * 1000);
    expect(g2.settle(flee).msg).toContain('给你机会你中用啊');
    expect(g2.s.phase).toBe('prep');
    expect(g2.s.hp).toBe(50);
    expect(g2.s.gold).toBe(9);
    expect(g2.tempItems).toHaveLength(0);
    expect(g2.s.level).toBe(row2.level);
  });

  it('掉落池含已解锁装备和护甲，不含负担物；4 级只有 5%', () => {
    expect(GOBLIN_LV4_CHANCE).toBe(0.05);
    const early = goblinDropPool(12);
    expect(early).toContain('dagger');
    expect(early).toContain('furnace_lining');
    expect(early).not.toContain('burden');
    expect(early).not.toContain('spear');
    expect(goblinDropPool(8)).not.toContain('furnace_lining');
    expect(goblinDropPool(22)).toContain('spear');
    let low = 0;
    let high = 0;
    for (let s = 1; s < 20000 && (!low || !high); s++) {
      const [v] = nextRandom(s);
      if (!low && v < GOBLIN_LV4_CHANCE) low = s;
      if (!high && v >= GOBLIN_LV4_CHANCE) high = s;
    }
    expect(rollGoblinDrop(new Rng(low), 16).level).toBe(4);
    expect(rollGoblinDrop(new Rng(high), 16).level).toBe(3);
    expect(ITEMS.dagger.values[2]).toBeGreaterThan(0);
  });

  it('寻找套装优先，不把训练战换成哥布林', () => {
    const g = new Game(newGameState(4));
    const row = g.s.goblinSpawns!.find(r => r.band === '10-20')!;
    g.s.level = row.level;
    g.s.currentChapter = 3;
    g.s.gearFight = { trialId: 'c3-guard', hp: 40 };
    g.s.phase = 'battle';
    expect(g.makeCombat().encounterKind).toBe('gearTrial');
    expect(g.makeCombat().mAtk).toBeGreaterThan(0);
  });
});
