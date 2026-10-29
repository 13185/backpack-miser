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
  it('前两次仍用金币，第 6 列不能空付，献祭后停在 6×6', () => {
    const { g } = ready(8, 0);
    g.s.rows = 4;
    expect(g.expand().ok).toBe(true);
    expect(g.s.rows).toBe(5);
    expect(g.s.gold).toBe(500 - 28);
    expect(g.expand().ok).toBe(true);
    expect(g.s.rows).toBe(6);
    expect(g.s.cols).toBe(5);
    expect(g.s.gold).toBe(500 - 28 - 42);
    g.s.level = 18;
    const refused = g.expand();
    expect(refused.ok).toBe(false);
    expect(g.s.cols).toBe(5);
    expect(g.s.gold).toBe(500 - 28 - 42);
    const items = [0, 1, 2, 3].map(i => mk('dagger', 3, i, 0));
    g.s.items = items;
    expect(g.expand(items.map(i => i.id)).ok).toBe(true);
    expect(g.s.cols).toBe(6);
    expect(g.s.rows).toBe(6);
    expect(g.expand().ok).toBe(false);
    expect(g.s.rows).toBe(6);
    expect(g.s.cols).toBe(6);
  });

  it('4 件 Lv3、2 件 Lv4、1 件 Lv5 都能换成第 6 列，不够就拒绝', () => {
    const cases: { level: Level; count: number; cols: number; rows: number; nextLevel: number; nextExp: number }[] = [
      { level: 3, count: 4, cols: 6, rows: 6, nextLevel: 18, nextExp: 2 },
      { level: 4, count: 2, cols: 6, rows: 6, nextLevel: 18, nextExp: 2 },
      { level: 5, count: 1, cols: 6, rows: 6, nextLevel: 18, nextExp: 2 },
    ];
    for (const c of cases) {
      const { g, store } = ready(c.nextLevel, c.nextExp);
      g.s.cols = 5;
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

  it('临时区不算；旧的 7×8 读档收成 6×6，界外装备进临时区', () => {
    const { g } = ready(18, 2);
    g.s.cols = 5;
    g.s.rows = 6;
    const temp = [mk('ruby', 3, null, null), mk('ruby', 3, null, null), mk('ruby', 3, null, null), mk('ruby', 3, null, null)];
    g.s.items = temp;
    expect(g.expand(temp.map(i => i.id)).ok).toBe(false);
    expect(g.s.rows).toBe(6);
    expect(g.s.cols).toBe(5);
    expect(g.s.items).toHaveLength(4);

    const big = new Game(newGameState(9));
    big.s.level = 40;
    big.s.rows = 8;
    big.s.cols = 7;
    big.s.expansions = 6;
    big.s.items = [
      mk('dagger', 1, 0, 0),
      mk('shield', 1, 5, 0),
      mk('potion', 1, 0, 6),
      mk('ruby', 3, null, null),
    ];
    const keepId = big.s.items[0].id;
    const shieldId = big.s.items[1].id;
    const lowId = big.s.items[2].id;
    const tempId = big.s.items[3].id;
    const store = mem();
    saveGame(store, big.s);
    const loaded = loadGame(store);
    expect(loaded.status).toBe('ok');
    if (loaded.status !== 'ok') return;
    expect(loaded.state.cols).toBe(6);
    expect(loaded.state.rows).toBe(6);
    expect(loaded.state.expansions).toBe(3);
    const byId = Object.fromEntries(loaded.state.items.map(i => [i.id, i]));
    expect(byId[keepId].x).toBe(0);
    expect(byId[keepId].y).toBe(0);
    expect(byId[shieldId].x).toBeNull();
    expect(byId[lowId].x).toBeNull();
    expect(byId[tempId].x).toBeNull();
    expect(loaded.state.items).toHaveLength(4);
    const again = new Game(loaded.state);
    expect(again.expand().ok).toBe(false);
    expect(again.s.cols).toBe(6);
    expect(again.s.rows).toBe(6);
  });
});
