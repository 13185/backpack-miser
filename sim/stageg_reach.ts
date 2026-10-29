/**
 * Stage G reach probe. Seeds are fixed. Bots buy expansions and camp-forge below level 3.
 * They do not call safeForge or gambleMerge, so these rates do not measure forge risk.
 *
 *   npx vite-node sim/stageg_reach.ts [count] [startSeed]
 */
import { STRATEGIES, playStrategy } from './driver';
import { getLevel } from '../src/config/v3/levels';
import { applyBossPrep, newGameState } from '../src/systems/game';
import { migrateV3, SAVE_VERSION } from '../src/systems/save';
import { createCombat, simulate } from '../src/systems/combat';
import { occupiedCells } from '../src/systems/placement';
import type { ItemInstance, ItemKind, Level } from '../src/models/types';

declare const process: { argv: string[] };
const N = Number(process.argv[2] ?? 20);
const start = Number(process.argv[3] ?? 1);

function summarize(label: string, maxRetries: number) {
  const t0 = Date.now();
  for (const st of STRATEGIES) {
    const reaches: number[] = [];
    let wins = 0;
    let died = 0;
    const terminal: Record<string, number> = {};
    const stalls: Record<string, number> = {};
    for (let seed = start; seed < start + N; seed++) {
      const r = playStrategy(st, seed, { maxRetries });
      if (r.result === 'victory') wins++;
      else if (r.deaths.length) {
        died++;
        const d = String(r.deaths[r.deaths.length - 1]);
        terminal[d] = (terminal[d] ?? 0) + 1;
      } else {
        const g = (r as { game?: { s: { phase: string; level: number } } }).game;
        const key = `${r.reached}@${g?.s.phase ?? '?'}/L${g?.s.level ?? '?'}`;
        stalls[key] = (stalls[key] ?? 0) + 1;
      }
      reaches.push(r.reached);
    }
    const avg = reaches.reduce((a, b) => a + b, 0) / N;
    const ge = (n: number) => reaches.filter(x => x >= n).length;
    const hist: Record<number, number> = {};
    for (const x of reaches) hist[x] = (hist[x] ?? 0) + 1;
    const sorted = [...reaches].sort((a, b) => a - b);
    console.log(JSON.stringify({
      label, id: st.id, start, n: N, maxRetries, wins, died, avg: +avg.toFixed(2),
      min: sorted[0], med: sorted[Math.floor((N - 1) / 2)],
      ge5: ge(5), ge10: ge(10), ge15: ge(15), ge20: ge(20), ge25: ge(25), ge30: ge(30), ge40: ge(40), ge50: ge(50),
      hist, terminal, stalls,
    }));
  }
  console.log(label, 'elapsedMs', Date.now() - t0);
}

if (N > 0) {
  summarize('assist15', 15);
  summarize('firstLife', 0);
}

function layout(spec: { kind: ItemKind; level: Level; x: number; y: number; rotated?: boolean }[]): ItemInstance[] {
  return spec.map((p, i) => ({ id: 'p' + i, kind: p.kind, level: p.level, x: p.x, y: p.y, rotated: !!p.rotated }));
}

function cellsOf(it: ItemInstance) {
  if (it.x == null || it.y == null) return [];
  return occupiedCells(it.kind, it.x, it.y, it.rotated);
}

function audit(label: string, items: ItemInstance[], cols: number, rows: number) {
  const seen = new Map<string, string>();
  let overlap = 0;
  let outside = 0;
  for (const it of items) {
    for (const c of cellsOf(it)) {
      if (c.x < 0 || c.y < 0 || c.x >= cols || c.y >= rows) outside++;
      const k = c.x + ',' + c.y;
      if (seen.has(k)) overlap++;
      seen.set(k, it.id);
    }
  }
  let rubyTouch = 0;
  const weapons = items.filter(it => it.kind === 'greatsword' || it.kind === 'dagger');
  for (const rb of items.filter(it => it.kind === 'ruby')) {
    const near = cellsOf(rb);
    const touch = weapons.some(w => cellsOf(w).some(wc =>
      near.some(rc => Math.abs(wc.x - rc.x) + Math.abs(wc.y - rc.y) === 1)));
    if (touch) rubyTouch++;
  }
  console.log(label, 'items', items.length, 'cells', seen.size, 'overlap', overlap, 'outside', outside, 'rubyTouch', rubyTouch, 'of', items.filter(i => i.kind === 'ruby').length);
}

function fight(label: string, items: ItemInstance[], level: number, hp: number, maxHp: number) {
  const lv = getLevel(level);
  const c = createCombat(items, hp, maxHp, lv);
  simulate(c);
  console.log(label, 'L' + level, 'm' + lv.hp + '/' + lv.atk + '/' + lv.interval + '/a' + (lv.armor ?? 0), c.won ? 'WIN' : 'LOSS', 't' + (c.t / 1000).toFixed(1), 'php' + c.hp, 'mLeft' + c.mHp);
}

/** Full 5×6. One Lv2 greatsword, everything else Lv3. Rubies sit on the bottom edge and do not touch a weapon. */
const crammed = layout([
  { kind: 'greatsword', level: 3, x: 0, y: 0 },
  { kind: 'greatsword', level: 3, x: 1, y: 0 },
  { kind: 'greatsword', level: 3, x: 2, y: 0 },
  { kind: 'greatsword', level: 3, x: 3, y: 0 },
  { kind: 'greatsword', level: 3, x: 4, y: 0 },
  { kind: 'greatsword', level: 2, x: 0, y: 3 },
  { kind: 'dagger', level: 3, x: 1, y: 3 },
  { kind: 'shield', level: 3, x: 2, y: 3 },
  { kind: 'potion', level: 3, x: 4, y: 3 },
  { kind: 'potion', level: 3, x: 4, y: 4 },
  { kind: 'potion', level: 3, x: 1, y: 5 },
  { kind: 'ruby', level: 3, x: 2, y: 5 },
  { kind: 'ruby', level: 3, x: 3, y: 5 },
  { kind: 'ruby', level: 3, x: 4, y: 5 },
]);

/** Same multiset. One greatsword lies on its side so a ruby touches it, and the dagger touches two rubies. */
const adjacent = layout([
  { kind: 'greatsword', level: 3, x: 0, y: 0 },
  { kind: 'greatsword', level: 3, x: 1, y: 0 },
  { kind: 'greatsword', level: 3, x: 2, y: 0 },
  { kind: 'greatsword', level: 3, x: 3, y: 0 },
  { kind: 'greatsword', level: 3, x: 4, y: 0 },
  { kind: 'greatsword', level: 2, x: 0, y: 3, rotated: true },
  { kind: 'ruby', level: 3, x: 3, y: 3 },
  { kind: 'potion', level: 3, x: 4, y: 3 },
  { kind: 'shield', level: 3, x: 0, y: 4 },
  { kind: 'potion', level: 3, x: 2, y: 4 },
  { kind: 'dagger', level: 3, x: 3, y: 4 },
  { kind: 'ruby', level: 3, x: 4, y: 4 },
  { kind: 'potion', level: 3, x: 2, y: 5 },
  { kind: 'ruby', level: 3, x: 4, y: 5 },
]);

if (start === 1) {
audit('crammed', crammed, 5, 6);
audit('adjacent', adjacent, 5, 6);

const lv20 = getLevel(20);
const lv19 = getLevel(19);
console.log('liveL20', lv20.hp, lv20.atk, lv20.interval, lv20.armor, JSON.stringify(lv20.phaseShields), JSON.stringify(lv20.heavyStrike));
console.log('liveL19', lv19.hp, lv19.atk, lv19.interval, lv19.armor);

for (const [name, bag] of [['crammed', crammed], ['adjacent', adjacent]] as const) {
  fight(name + '-L19-hp30', bag, 19, 30, 100);
  fight(name + '-L19-full', bag, 19, 100, 100);
  fight(name + '-L20-hp30', bag, 20, 30, 100);
  fight(name + '-L20-hp60', bag, 20, 60, 100);
  fight(name + '-L20-full', bag, 20, 100, 100);
}

const raw = newGameState(19);
raw.level = 20;
raw.rows = 6;
raw.cols = 5;
raw.expansions = 2;
raw.hp = 30;
raw.maxHp = 100;
raw.gold = 88;
raw.stats.goldEarned = 435;
raw.phase = 'prep';
raw.items = crammed.map(i => ({ ...i }));
raw.a10Compensated = undefined;
migrateV3(raw);
applyBossPrep(raw);
console.log('afterMigrate', raw.cols + 'x' + raw.rows, 'hp', raw.hp + '/' + raw.maxHp, 'gold', raw.gold, 'earned', raw.stats.goldEarned, 'vouchers', raw.forgeVouchers, 'flag', raw.a10Compensated, 'ver', SAVE_VERSION, 'prep', raw.bossPrep);
fight('migrated-prep', raw.items, raw.level, raw.hp, raw.maxHp);

const prepOnly = newGameState(19);
prepOnly.level = 20;
prepOnly.phase = 'prep';
prepOnly.cols = 5;
prepOnly.rows = 6;
prepOnly.hp = 30;
prepOnly.maxHp = 100;
prepOnly.a10Compensated = false;
applyBossPrep(prepOnly);
console.log('prepOnlyHp', prepOnly.hp, 'bossPrep', prepOnly.bossPrep, 'bag', prepOnly.cols + 'x' + prepOnly.rows);
}

