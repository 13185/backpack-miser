import { describe, expect, it } from 'vitest';
import type { ItemInstance, ItemKind, Level } from '../src/models/types';
import { Game, newGameState } from '../src/systems/game';
import { loadGame, saveGame } from '../src/systems/save';

let n = 0;
const mk = (kind: ItemKind, level: Level, x: number | null, y: number | null): ItemInstance =>
  ({ id: 'e' + n++, kind, level, x, y, rotated: false });
const mem = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
};

function ready(level = 25, expansions = 2) {
  const store = mem();
  const g = new Game(newGameState(4), s => saveGame(store, s));
  g.s.level = level;
  g.s.expansions = expansions;
  g.s.rows = 4 + Math.min(expansions, 2);
  g.s.cols = 5;
  g.s.gold = 500;
  return { g, store };
}

describe('后期献祭扩容', () => {
  it('前两次仍用金币，第三次拒绝空付', () => {
    const { g } = ready(8, 0);
    g.s.rows = 4;
    expect(g.expand().ok).toBe(true);
    expect(g.s.rows).toBe(5);
    expect(g.s.gold).toBe(500 - 28);
    expect(g.expand().ok).toBe(true);
    expect(g.s.rows).toBe(6);
    expect(g.s.gold).toBe(500 - 28 - 42);
    g.s.level = 18;
    expect(g.expand().ok).toBe(true);
    expect(g.s.cols).toBe(6);
    expect(g.s.gold).toBe(500 - 28 - 42 - 75);
    g.s.level = 33;
    const refused = g.expand();
    expect(refused.ok).toBe(false);
    expect(g.s.rows).toBe(6);
  });

  it('4 件 Lv3、2 件 Lv4、1 件 Lv5 都能扩，不够就拒绝', () => {
    const cases: { level: Level; count: number; cols: number; rows: number; nextLevel: number; nextExp: number }[] = [
      { level: 3, count: 4, cols: 6, rows: 7, nextLevel: 33, nextExp: 3 },
      { level: 4, count: 2, cols: 6, rows: 7, nextLevel: 33, nextExp: 3 },
      { level: 5, count: 1, cols: 6, rows: 7, nextLevel: 33, nextExp: 3 },
    ];
    for (const c of cases) {
      const { g, store } = ready(c.nextLevel, c.nextExp);
      g.s.cols = 6;
      g.s.rows = 6;
      const items = Array.from({ length: c.count }, (_, i) => mk(i % 2 ? 'potion' : 'dagger', c.level, i, 0));
      const keep = mk('shield', 1, 0, 1);
      g.s.items = [keep, ...items];
      const ids = items.map(i => i.id);
      expect(g.expand(ids.slice(0, Math.max(0, c.count - 1))).ok).toBe(false);
      expect(g.s.items).toHaveLength(c.count + 1);
      expect(g.expand(ids).ok).toBe(true);
      expect(g.s.cols).toBe(c.cols);
      expect(g.s.rows).toBe(c.rows);
      expect(g.s.items.map(i => i.id)).toEqual([keep.id]);
      const loaded = loadGame(store);
      expect(loaded.status).toBe('ok');
      if (loaded.status !== 'ok') continue;
      expect(loaded.state.items.map(i => i.id)).toEqual([keep.id]);
      expect(loaded.state.cols).toBe(c.cols);
      expect(loaded.state.rows).toBe(c.rows);
      expect(loaded.state.items.filter(i => ids.includes(i.id))).toHaveLength(0);
    }
  });

  it('临时区不算，旧的 7×8 留下但不能再扩', () => {
    const { g } = ready(33, 3);
    g.s.cols = 6;
    g.s.rows = 6;
    const temp = [mk('ruby', 3, null, null), mk('ruby', 3, null, null), mk('ruby', 3, null, null), mk('ruby', 3, null, null)];
    g.s.items = temp;
    expect(g.expand(temp.map(i => i.id)).ok).toBe(false);
    expect(g.s.rows).toBe(6);
    expect(g.s.items).toHaveLength(4);

    const big = new Game(newGameState(9));
    big.s.level = 40;
    big.s.rows = 8;
    big.s.cols = 7;
    big.s.expansions = 6;
    expect(big.expand().ok).toBe(false);
    expect(big.s.rows).toBe(8);
    expect(big.s.cols).toBe(7);
  });
});
