import { describe, expect, it } from 'vitest';
import { nextRandom } from '../src/systems/rng';
import { Game, newGameState } from '../src/systems/game';
import {
  SLOT_WEIGHTS, SLOT_WEIGHT_TOTAL, rollSlot, slotBlurb, slotCost, slotExpectedSell,
} from '../src/systems/slot';

function stateFor(pred: (u: number) => boolean): number {
  let s = 1;
  for (let i = 0; i < 200000; i++) {
    const [u, n] = nextRandom(s);
    if (pred(u)) return s;
    s = n;
  }
  throw new Error('没有找到对应的随机状态');
}

describe('摇奖机', () => {
  it('4级 1.5%、5级 0.5%，权重合计 1000，文案写得出来', () => {
    expect(SLOT_WEIGHTS.reduce((a, r) => a + r.w, 0)).toBe(SLOT_WEIGHT_TOTAL);
    expect(SLOT_WEIGHTS.find(r => r.level === 4)!.w).toBe(15);
    expect(SLOT_WEIGHTS.find(r => r.level === 5)!.w).toBe(5);
    const text = slotBlurb();
    expect(text).toContain('5级神器大奖');
    expect(text).toContain('临时区');
    expect(text).not.toContain('%');
    expect(text).not.toContain('长期是亏的');
    expect(text).not.toMatch(/\d+\.\d/);
    let lv4 = 0, lv5 = 0;
    for (let i = 0; i < SLOT_WEIGHT_TOTAL; i++) {
      const lv = rollSlot(i / SLOT_WEIGHT_TOTAL, 0.2, 1).level;
      if (lv === 4) lv4++;
      if (lv === 5) lv5++;
    }
    expect(lv4).toBe(15);
    expect(lv5).toBe(5);
  });

  it('卖出价期望低于花费', () => {
    for (const lv of [1, 10, 15, 25, 40, 50]) {
      expect(slotCost(lv)).toBeGreaterThan(slotExpectedSell(lv));
    }
    expect(slotCost(1)).toBe(18);
    expect(slotCost(50)).toBe(18 + 8);
  });

  it('金币不够不动档；摇空只扣钱；5级进临时区，卖了就能开战', () => {
    const poor = new Game(newGameState(3));
    poor.s.gold = slotCost(poor.s.level) - 1;
    const gold = poor.s.gold;
    const n = poor.s.items.length;
    expect(poor.pullSlot().ok).toBe(false);
    expect(poor.s.gold).toBe(gold);
    expect(poor.s.items.length).toBe(n);

    const miss = new Game(newGameState(4));
    miss.s.gold = 80;
    miss.s.rng = stateFor(u => u < 0.46);
    const before = miss.s.items.length;
    const r = miss.pullSlot();
    expect(r.ok).toBe(true);
    expect(r.msg).toContain('摇空');
    expect(miss.s.gold).toBe(80 - slotCost(miss.s.level));
    expect(miss.s.items.length).toBe(before);

    const hit = new Game(newGameState(5));
    hit.s.phase = 'prep';
    hit.s.gold = 80;
    hit.s.rng = stateFor(u => u >= 0.995);
    const prize = hit.pullSlot();
    expect(prize.ok).toBe(true);
    expect(prize.msg).toContain('Lv5');
    const added = hit.tempItems.find(i => i.level === 5);
    expect(added).toBeTruthy();
    expect(added!.x).toBeNull();
    expect(hit.sell(added!.id).ok).toBe(true);
    expect(hit.tempItems.some(i => i.id === added!.id)).toBe(false);

    const busy = new Game(newGameState(6));
    busy.s.phase = 'battle';
    busy.s.gold = 80;
    expect(busy.pullSlot().ok).toBe(false);
    expect(busy.s.gold).toBe(80);
  });
});
