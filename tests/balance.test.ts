import { describe, expect, it } from 'vitest';
import { BUILDS, playRun } from '../sim/bot';
import { createCombat, simulate } from '../src/systems/combat';
import { LEVELS } from '../src/config/levels';
import { newGameState } from '../src/systems/game';
describe('平衡', () => {
  it('初始装备可通过第1、2关', () => {
    const s = newGameState(1);
    const c1 = createCombat(s.items, 100, 100, LEVELS[0]); simulate(c1); expect(c1.won).toBe(true);
    const c2 = createCombat(s.items, Math.min(100, c1.hp + 15), 100, LEVELS[1]); simulate(c2); expect(c2.won).toBe(true);
  });
  it('多种思路可通关，堆盾不能通关', () => {
    const rate = (i: number) => { let w = 0; for (let s = 1; s <= 60; s++) if (playRun(BUILDS[i], s * 31).won) w++; return w / 60; };
    expect(rate(0)).toBeGreaterThan(0.3); expect(rate(1)).toBeGreaterThan(0.3); expect(rate(2)).toBeGreaterThan(0.1);
    expect(rate(3)).toBe(0);
  });
});
