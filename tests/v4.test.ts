import { describe, expect, it } from 'vitest';
import { splitDirect, splitIncoming } from '../src/config/v4/elements';
import { getLevel } from '../src/config/v3/levels';
import { Game, newGameState } from '../src/systems/game';
import { createCombat, simulate, stepCombat } from '../src/systems/combat';
import { itemPlace } from '../src/systems/placement';

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

describe('V4 归属', () => {
  it('主手只在一处，备用箱不进战斗，卸下进临时区', () => {
    const g = new Game(newGameState(1));
    const dagger = g.s.items.find(i => i.kind === 'dagger')!;
    expect(g.equipHand(dagger.id).ok).toBe(true);
    expect(itemPlace(dagger)).toBe('hand');
    expect(g.bagItems.some(i => i.id === dagger.id)).toBe(false);
    expect(g.tempItems.some(i => i.id === dagger.id)).toBe(false);
    const c = g.makeCombat();
    expect(c.actors.filter(a => a.id === dagger.id)).toHaveLength(1);
    expect(g.toReserve(dagger.id).ok).toBe(true);
    const quiet = g.makeCombat();
    expect(quiet.actors.some(a => a.id === dagger.id)).toBe(false);
    expect(g.unequip(dagger.id).ok).toBe(true);
    expect(itemPlace(dagger)).toBe('temp');
  });

  it('护甲在背包不提供抗性，穿上才有', () => {
    const g = new Game(newGameState(2));
    const it = g.addTemp('furnace_lining', 3);
    const bare = createCombat(g.s.items, 100, 100, getLevel(1));
    expect(bare.playerResist.fire).toBe(0);
    g.equipArmor(it.id);
    const worn = g.makeCombat();
    expect(worn.playerResist.fire).toBe(40);
    g.toReserve(it.id);
    expect(g.makeCombat().playerResist.fire).toBe(0);
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
});
