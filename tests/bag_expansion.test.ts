import { describe, expect, it } from 'vitest';
import { ECONOMY } from '../src/config/economy';
import { ITEMS } from '../src/config/items';
import { Game, newGameState } from '../src/systems/game';
import { expansionCost, expansionLabel, expansionUnlocked } from '../src/systems/economy';
import { loadGame, migrateV3, saveGame, SAVE_KEY } from '../src/systems/save';
import { LV5_GAMBLE, gambleOutcome } from '../src/config/gamble';
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
  it('四次扩容到 6×7：前两次金币，后两次献祭', () => {
    expect(ECONOMY.expansions.map(e => e.axis)).toEqual(['row', 'row', 'col', 'row']);
    expect(ECONOMY.expansions.map(e => e.unlockAfterLevel)).toEqual([3, 7, 17, 32]);
    expect(expansionCost(0)).toBe(28);
    expect(expansionCost(1)).toBe(42);
    expect(expansionCost(2)).toBe(75);
    expect(expansionCost(3)).toBeNull();
    expect(expansionCost(4)).toBeNull();
    let rows = 4, cols = 5;
    for (const e of ECONOMY.expansions) { if (e.axis === 'row') rows++; else cols++; }
    expect(cols).toBe(6);
    expect(rows).toBe(7);
  });

  it('未击败首领不能买后续扩容；击败后花钱才变大', () => {
    const g = new Game(newGameState(1));
    g.s.gold = 500;
    g.s.level = 8;
    expect(g.expand().ok).toBe(true);
    expect(g.s.rows).toBe(5);
    expect(g.expand().ok).toBe(true);
    expect(g.s.rows).toBe(6);
    expect(g.s.cols).toBe(5);
    const locked = g.expand();
    expect(locked.ok).toBe(false);
    expect(locked.ok === false && locked.msg).toContain('第17关');
    expect(g.s.cols).toBe(5);
    expect(expansionUnlocked(17, 2)).toBe(false);
    expect(expansionUnlocked(18, 2)).toBe(true);
    g.s.level = 18;
    g.s.gold = 75;
    expect(expansionLabel(18, g.s.rows, g.s.cols, g.s.expansions).text).toContain('第6列');
    expect(g.expand().ok).toBe(true);
    expect(g.s.cols).toBe(6);
    expect(g.s.gold).toBe(0);
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
      g.s.level = 13;
      g.s.rng = rng;
      g.s.forgeRng = rng;
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
    expect(win.s.forgeRng).not.toBe(winSeed);
    expect(ITEMS.greatsword.values[3]).toBeGreaterThan(ITEMS.greatsword.values[2]);
    expect(ITEMS.greatsword.values[4]).toBeGreaterThan(ITEMS.greatsword.values[3]);
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

  it('两件 Lv4 对赌：35% Lv5、40% 留一件、25% 全灭，重载不能重掷', () => {
    expect(LV5_GAMBLE.success + LV5_GAMBLE.loseOne + LV5_GAMBLE.loseBoth).toBeCloseTo(1);
    const buckets = { success: 0, loseOne: 0, loseBoth: 0 };
    const seeds: Record<keyof typeof buckets, number> = { success: 0, loseOne: 0, loseBoth: 0 };
    const samples = 400;
    for (let s = 1; s <= samples; s++) {
      const [roll] = nextRandom(s);
      const outcome = gambleOutcome(roll, LV5_GAMBLE);
      buckets[outcome]++;
      if (!seeds[outcome]) seeds[outcome] = s;
    }
    expect(buckets.success / samples).toBeGreaterThan(0.25);
    expect(buckets.success / samples).toBeLessThan(0.45);
    expect(buckets.loseOne / samples).toBeGreaterThan(0.30);
    expect(buckets.loseOne / samples).toBeLessThan(0.50);
    expect(buckets.loseBoth / samples).toBeGreaterThan(0.15);
    expect(buckets.loseBoth / samples).toBeLessThan(0.35);
    const pair = (rng: number) => {
      const g = new Game(newGameState(1));
      g.s.level = 26;
      g.s.rng = rng;
      g.s.forgeRng = rng;
      g.s.items = [
        { id: 'a', kind: 'greatsword', level: 4, x: 0, y: 0, rotated: false },
        { id: 'b', kind: 'greatsword', level: 4, x: 1, y: 0, rotated: false },
        { id: 'w', kind: 'dagger', level: 1, x: 2, y: 0, rotated: false },
      ];
      return g;
    };
    const win = pair(seeds.success);
    const ok = win.gambleMerge('a', 'b');
    expect(ok.ok && ok.msg).toContain('Lv5');
    expect(win.s.items.find(i => i.id === 'b')).toMatchObject({ level: 5, x: 1 });
    expect(win.s.forgeRng).not.toBe(seeds.success);
    const st = mem();
    saveGame(st, win.s);
    const loaded = loadGame(st);
    expect(loaded.status).toBe('ok');
    if (loaded.status === 'ok') {
      expect(loaded.state.items.find(i => i.id === 'b')?.level).toBe(5);
      expect(loaded.state.rng).toBe(win.s.rng);
    }
    const one = pair(seeds.loseOne);
    const mid = one.gambleMerge('a', 'b');
    expect(mid.ok && mid.msg).toContain('另一件');
    expect(one.s.items.find(i => i.id === 'b')).toMatchObject({ level: 4, x: 1 });
    expect(one.s.items.find(i => i.id === 'a')).toBeUndefined();
    const stMid = mem();
    saveGame(stMid, one.s);
    const loadedMid = loadGame(stMid);
    expect(loadedMid.status).toBe('ok');
    if (loadedMid.status === 'ok') {
      expect(loadedMid.state.items.find(i => i.id === 'b')?.level).toBe(4);
      expect(loadedMid.state.items.find(i => i.id === 'a')).toBeUndefined();
      expect(loadedMid.state.forgeRng).toBe(one.s.forgeRng);
    }
    const both = pair(seeds.loseBoth);
    const bad = both.gambleMerge('a', 'b');
    expect(bad.ok && bad.msg).toContain('都消失');
    expect(both.s.items.map(i => i.id)).toEqual(['w']);
    const stBoth = mem();
    saveGame(stBoth, both.s);
    const loadedBoth = loadGame(stBoth);
    expect(loadedBoth.status).toBe('ok');
    if (loadedBoth.status === 'ok') {
      expect(loadedBoth.state.items.find(i => i.id === 'a' || i.id === 'b')).toBeUndefined();
      expect(loadedBoth.state.forgeRng).toBe(both.s.forgeRng);
    }
    const plain = pair(seeds.success);
    expect(plain.merge('a', 'b').ok).toBe(false);
    expect(plain.s.items).toHaveLength(3);
    expect(plain.s.forgeRng).toBe(seeds.success);
  });

  it('稳妥锻造用 60 金或券得到 Lv4，第12关前不能锻', () => {
    const g = new Game(newGameState(1));
    g.s.items.push(
      { id: 'a', kind: 'ruby', level: 3, x: null, y: null, rotated: false },
      { id: 'b', kind: 'ruby', level: 3, x: 0, y: 0, rotated: false },
    );
    g.s.gold = 100;
    expect(g.safeForge('a', 'b').ok).toBe(false);
    g.s.level = 13;
    expect(g.safeForge('a', 'b').ok).toBe(true);
    expect(g.s.gold).toBe(40);
    expect(g.s.items.find(i => i.id === 'b')?.level).toBe(4);
    expect(g.s.items.find(i => i.id === 'a')).toBeUndefined();
    const g2 = new Game(newGameState(2));
    g2.s.level = 13;
    g2.s.forgeVouchers = 1;
    g2.s.gold = 0;
    g2.s.items.push(
      { id: 'a', kind: 'ruby', level: 3, x: null, y: null, rotated: false },
      { id: 'b', kind: 'ruby', level: 3, x: 0, y: 0, rotated: false },
    );
    expect(g2.safeForge('a', 'b').ok).toBe(true);
    expect(g2.s.gold).toBe(0);
    expect(g2.s.forgeVouchers).toBe(0);
    expect(g2.s.items.find(i => i.id === 'b')?.level).toBe(4);
  });

  it('15–20 关且不超过 30 格的旧档免费补到 6×6 并回满一次', () => {
    const s = newGameState(4);
    s.level = 19;
    s.rows = 6;
    s.cols = 5;
    s.expansions = 2;
    s.hp = 30;
    delete s.a10Compensated;
    const st = mem();
    st.setItem(SAVE_KEY, JSON.stringify(s));
    const loaded = loadGame(st);
    expect(loaded.status).toBe('ok');
    if (loaded.status !== 'ok') return;
    expect(loaded.state.cols).toBe(6);
    expect(loaded.state.rows).toBe(6);
    expect(loaded.state.hp).toBe(loaded.state.maxHp);
    expect(loaded.state.forgeVouchers).toBe(1);
    expect(loaded.state.a10Compensated).toBe(true);
    const again = loadGame(st);
    st.setItem(SAVE_KEY, JSON.stringify(loaded.state));
    const twice = loadGame(st);
    expect(twice.status).toBe('ok');
    if (twice.status === 'ok') expect(twice.state.forgeVouchers).toBe(1);
    void again;
  });
});
