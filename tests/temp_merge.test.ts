import { describe, expect, it } from 'vitest';
import type { ItemInstance, ItemKind, Level } from '../src/models/types';
import { Game, newGameState } from '../src/systems/game';
import { mergeTargetIds } from '../src/systems/merge';
import { loadGame, saveGame } from '../src/systems/save';

let n = 0;
const mk = (kind: ItemKind, x: number | null, y: number | null, level: Level = 1): ItemInstance =>
  ({ id: 'm' + n++, kind, level, x, y, rotated: false });
const mem = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
};

describe('临时区拖到背包合成', () => {
  it('高亮背包里同种同级的目标，不满级，临时区自己不是目标', () => {
    const bag = mk('potion', 1, 1, 2);
    const tmp = mk('potion', null, null, 2);
    const other = mk('potion', 3, 0, 1);
    const loose = mk('potion', null, null, 2);
    const top = mk('potion', 0, 0, 5);
    expect(mergeTargetIds([bag, tmp, other, loose, top], tmp.id)).toEqual([bag.id]);
    expect(mergeTargetIds([bag, tmp], bag.id)).toEqual([]);
  });

  it('合成留在背包那一格，临时区来源消失，存档重载不复制', () => {
    const store = mem();
    const g = new Game(newGameState(7), s => saveGame(store, s));
    const bag = mk('potion', 4, 3, 2);
    const tmp = mk('potion', null, null, 2);
    g.s.items = [bag, tmp];
    const r = g.merge(tmp.id, bag.id);
    expect(r.ok).toBe(true);
    expect(g.s.items).toHaveLength(1);
    expect(g.s.items[0]).toMatchObject({ id: bag.id, kind: 'potion', level: 3, x: 4, y: 3 });
    expect(g.s.items.some(i => i.id === tmp.id)).toBe(false);
    const loaded = loadGame(store);
    expect(loaded.status).toBe('ok');
    if (loaded.status !== 'ok') return;
    expect(loaded.state.items).toHaveLength(1);
    expect(loaded.state.items[0]).toMatchObject({ id: bag.id, level: 3, x: 4, y: 3 });
    expect(loaded.state.items.some(i => i.id === tmp.id)).toBe(false);
  });

  it('对不上、已满级或 Lv3 对赌都不会吃掉临时区那一件', () => {
    const store = mem();
    const g = new Game(newGameState(8), s => saveGame(store, s));
    const bag = mk('dagger', 0, 0, 1);
    const wrong = mk('potion', null, null, 1);
    g.s.items = [bag, wrong];
    expect(g.merge(wrong.id, bag.id).ok).toBe(false);
    expect(g.s.items.map(i => i.id).sort()).toEqual([bag.id, wrong.id].sort());

    const maxed = mk('ruby', 2, 0, 5);
    const maxTmp = mk('ruby', null, null, 5);
    g.s.items = [maxed, maxTmp];
    expect(g.merge(maxTmp.id, maxed.id).ok).toBe(false);
    expect(g.s.items).toHaveLength(2);

    const lv3 = mk('shield', 0, 0, 3);
    const lv3tmp = mk('shield', null, null, 3);
    g.s.items = [lv3, lv3tmp];
    expect(g.move(lv3.id, 0, 0, false).ok).toBe(true);
    expect(mergeTargetIds(g.s.items, lv3tmp.id)).toEqual([lv3.id]);
    const refused = g.merge(lv3tmp.id, lv3.id);
    expect(refused.ok).toBe(false);
    expect(g.s.items).toHaveLength(2);
    expect(g.s.items.find(i => i.id === lv3.id)).toMatchObject({ level: 3, x: 0, y: 0 });
    expect(g.s.items.find(i => i.id === lv3tmp.id)).toMatchObject({ x: null, y: null });
    const loaded = loadGame(store);
    expect(loaded.status).toBe('ok');
    if (loaded.status !== 'ok') return;
    expect(loaded.state.items).toHaveLength(2);
    expect(loaded.state.items.map(i => i.id).sort()).toEqual([lv3.id, lv3tmp.id].sort());
  });
});
