import { describe, expect, it } from 'vitest';
import { ECONOMY } from '../src/config/economy';
import { ITEMS } from '../src/config/items';
import { Game, newGameState } from '../src/systems/game';
import { expansionCost, expansionLabel, expansionUnlocked } from '../src/systems/economy';
import { loadGame, migrateV3, saveGame, SAVE_KEY } from '../src/systems/save';
import { nextRandom } from '../src/systems/rng';

const mem = () => {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  };
};

describe('背包扩容 3.3', () => {
  it('开局两次加行，之后按 10/20/30/40 首领交替加列加行，终点 7×8', () => {
    expect(ECONOMY.expansions.map(e => e.axis)).toEqual(['row', 'row', 'col', 'row', 'col', 'row']);
    expect(ECONOMY.expansions.map(e => e.unlockAfterLevel)).toEqual([0, 0, 10, 20, 30, 40]);
    expect(expansionCost(0)).toBe(32);
    expect(expansionCost(2)).toBe(80);
    expect(expansionCost(5)).toBe(230);
    expect(expansionCost(6)).toBeNull();
    let rows = 4, cols = 5;
    for (const e of ECONOMY.expansions) { if (e.axis === 'row') rows++; else cols++; }
    expect(cols).toBe(7);
    expect(rows).toBe(8);
  });

  it('未击败首领不能买后续扩容；击败后花钱才变大', () => {
    const g = new Game(newGameState(1));
    g.s.gold = 500;
    expect(g.expand().ok).toBe(true);
    expect(g.s.rows).toBe(5);
    expect(g.expand().ok).toBe(true);
    expect(g.s.rows).toBe(6);
    expect(g.s.cols).toBe(5);
    const locked = g.expand();
    expect(locked.ok).toBe(false);
    expect(locked.ok === false && locked.msg).toContain('第10关');
    expect(g.s.cols).toBe(5);
    expect(expansionUnlocked(10, 2)).toBe(false);
    expect(expansionUnlocked(11, 2)).toBe(true);
    g.s.level = 11;
    expect(expansionLabel(11, g.s.rows, g.s.cols, g.s.expansions).text).toContain('第6列');
    expect(g.expand().ok).toBe(true);
    expect(g.s.cols).toBe(6);
    expect(g.s.rows).toBe(6);
  });

  it('旧 v3 存档补 expansions，保留原来的行列', () => {
    const s = newGameState(3);
    s.rows = 6;
    s.cols = 5;
    delete (s as { expansions?: number }).expansions;
    const st = mem();
    st.setItem(SAVE_KEY, JSON.stringify(s));
    const loaded = loadGame(st);
    expect(loaded.status).toBe('ok');
    if (loaded.status !== 'ok') return;
    expect(loaded.state.rows).toBe(6);
    expect(loaded.state.cols).toBe(5);
    expect(loaded.state.expansions).toBe(2);
    const fresh: { version: number; rows: number; cols: number; expansions?: number } = { version: 3, rows: 4, cols: 5 };
    migrateV3(fresh);
    expect(fresh.expansions).toBe(0);
    expect(fresh.rows).toBe(4);
    saveGame(st, loaded.state);
  });

  it('两件 Lv3 对赌：种子决定成败，失败只留一件 Lv3，重载不能重掷', () => {
    let wins = 0;
    const samples = 200;
    for (let s = 1; s <= samples; s++) {
      const [roll] = nextRandom(s);
      if (roll < 0.5) wins++;
    }
    expect(wins / samples).toBeGreaterThan(0.4);
    expect(wins / samples).toBeLessThan(0.6);
    let winSeed = 0, failSeed = 0;
    for (let s = 1; s < 80 && (!winSeed || !failSeed); s++) {
      const [roll] = nextRandom(s);
      if (roll < 0.5) winSeed = s; else failSeed = s;
    }
    const pair = (rng: number) => {
      const g = new Game(newGameState(1));
      g.s.rng = rng;
      g.s.items = [
        { id: 'a', kind: 'greatsword', level: 3, x: 0, y: 0, rotated: false },
        { id: 'b', kind: 'greatsword', level: 3, x: 1, y: 0, rotated: false },
      ];
      return g;
    };
    const win = pair(winSeed);
    const ok = win.gambleMerge('a', 'b');
    expect(ok.ok).toBe(true);
    expect(ok.ok && ok.msg).toContain('Lv4');
    expect(win.s.items).toHaveLength(1);
    expect(win.s.items[0].level).toBe(4);
    expect(win.s.items[0].id).toBe('b');
    expect(win.s.rng).not.toBe(winSeed);
    expect(ITEMS.greatsword.values[3]).toBeGreaterThan(ITEMS.greatsword.values[2]);
    const st = mem();
    saveGame(st, win.s);
    const loaded = loadGame(st);
    expect(loaded.status).toBe('ok');
    if (loaded.status === 'ok') {
      expect(loaded.state.items.map(i => i.level)).toEqual([4]);
      expect(loaded.state.rng).toBe(win.s.rng);
    }
    const plain = pair(winSeed);
    const rngBefore = plain.s.rng;
    const itemsBefore = JSON.stringify(plain.s.items);
    expect(plain.merge('a', 'b').ok).toBe(false);
    expect(plain.s.rng).toBe(rngBefore);
    expect(JSON.stringify(plain.s.items)).toBe(itemsBefore);
    const lose = pair(failSeed);
    const bad = lose.gambleMerge('a', 'b');
    expect(bad.ok && bad.msg).toContain('消失');
    expect(lose.s.items).toHaveLength(1);
    expect(lose.s.items[0].id).toBe('b');
    expect(lose.s.items[0].level).toBe(3);
    expect(lose.s.items[0].x).toBe(1);
    const st2 = mem();
    saveGame(st2, lose.s);
    const loaded2 = loadGame(st2);
    expect(loaded2.status).toBe('ok');
    if (loaded2.status === 'ok') {
      expect(loaded2.state.items).toHaveLength(1);
      expect(loaded2.state.items[0].level).toBe(3);
      expect(loaded2.state.items[0].id).toBe('b');
      expect(loaded2.state.rng).toBe(lose.s.rng);
    }
  });
});
