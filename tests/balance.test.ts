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
  it('纯堆盾不能过翻倍后的第15关首领', () => {
    let w = 0;
    for (let s = 1; s <= 20; s++) if (playRun(BUILDS[3], s * 31, { untilLevel: 15 }).won) w++;
    expect(w).toBe(0);
  });
});
