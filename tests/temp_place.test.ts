import { describe, expect, it } from 'vitest';
import { ITEMS } from '../src/config/items';
import { Game, newGameState } from '../src/systems/game';
import { itemPlace } from '../src/systems/placement';

function fillBag(g: Game, open: { x: number; y: number }[] = []) {
  const skip = new Set(open.map(c => `${c.x},${c.y}`));
  let n = 0;
  for (let y = 0; y < g.s.rows; y++) for (let x = 0; x < g.s.cols; x++) {
    if (skip.has(`${x},${y}`)) continue;
    g.s.items.push({ id: 'fill' + n++, kind: 'ruby', level: 1, x, y, rotated: false });
  }
}

describe('待整理双击入包', () => {
  it('有空位就放进背包，并从待整理消失', () => {
    const g = new Game(newGameState(1));
    const it = g.addTemp('dagger', 1);
    expect(itemPlace(it)).toBe('temp');
    const r = g.placeIntoBag(it.id);
    expect(r.ok).toBe(true);
    expect(r.msg).toContain('已放入背包');
    expect(itemPlace(it)).toBe('bag');
    expect(g.tempItems.some(i => i.id === it.id)).toBe(false);
  });

  it('背包放不下就留在待整理，并说明原因', () => {
    const g = new Game(newGameState(2));
    g.s.items = [];
    fillBag(g);
    const it = g.addTemp('shield', 1);
    const r = g.placeIntoBag(it.id);
    expect(r.ok).toBe(false);
    expect(r.msg).toContain('还留在待整理');
    expect(itemPlace(it)).toBe('temp');
    expect(it.x).toBeNull();
  });

  it('只剩一条横缝时，细长装备转个方向放进去', () => {
    const g = new Game(newGameState(3));
    g.s.items = [];
    expect(ITEMS.greatsword.rotatable).toBe(true);
    expect(ITEMS.greatsword.w).toBe(1);
    expect(ITEMS.greatsword.h).toBe(3);
    fillBag(g, [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }]);
    const it = g.addTemp('greatsword', 1);
    const r = g.placeIntoBag(it.id);
    expect(r.ok).toBe(true);
    expect(itemPlace(it)).toBe('bag');
    expect(it.rotated).toBe(true);
    expect(it.y).toBe(0);
  });

  it('旁边有同种同级也不会合成，只是再占一格', () => {
    const g = new Game(newGameState(4));
    g.s.items = [{ id: 'bag', kind: 'dagger', level: 1, x: 0, y: 0, rotated: false }];
    const extra = g.addTemp('dagger', 1);
    const r = g.placeIntoBag(extra.id);
    expect(r.ok).toBe(true);
    expect(g.s.items.filter(i => i.kind === 'dagger' && i.level === 1)).toHaveLength(2);
    expect(itemPlace(g.find('bag')!)).toBe('bag');
    expect(g.find('bag')!.level).toBe(1);
    expect(itemPlace(extra)).toBe('bag');
  });

  it('穿戴槽和已经在背包里的不接受这条入包', () => {
    const g = new Game(newGameState(5));
    const worn = g.addTemp('dagger', 1);
    expect(g.equipHand(worn.id).ok).toBe(true);
    expect(g.placeIntoBag(worn.id).ok).toBe(false);
    expect(itemPlace(worn)).toBe('hand');
    const bag = g.s.items.find(i => itemPlace(i) === 'bag' && i.kind === 'dagger');
    if (bag) expect(g.placeIntoBag(bag.id).msg).toContain('待整理');
  });
});
