import { describe, expect, it } from 'vitest';
import { BUILDS, playRun } from '../sim/bot';
import { createCombat, simulate } from '../src/systems/combat';
import { getLevel } from '../src/config/v3';
import { newGameState } from '../src/systems/game';
describe('平衡', () => {
  it('初始装备可过第1关（地狱：第2关起需商店构筑）', () => {
    for (const cls of ['merchant', 'guard', 'ranger'] as const) {
      const s = newGameState(1, { heroClass: cls });
      const c1 = createCombat(s.items, s.hp, s.maxHp, getLevel(1));
      simulate(c1);
      expect(c1.won, cls).toBe(true);
    }
  });
  it('地狱难度：前10关有非零通关样本；纯堆盾不能过第15关Boss', () => {
    const rate = (i: number, until: number) => {
      let w = 0;
      for (let s = 1; s <= 60; s++) if (playRun(BUILDS[i], s * 31, { untilLevel: until }).won) w++;
      return w / 60;
    };
    expect(rate(0, 10) + rate(1, 10)).toBeGreaterThan(0.05);
    expect(rate(3, 15)).toBe(0);
  });
});
