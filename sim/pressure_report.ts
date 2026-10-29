import { PROFILE_CLASSES, playProfile, type ProfileRun } from './profiles';

declare const process: { argv: string[] };
const N = Number(process.argv[2] ?? 8);
const profiles = ['lazy', 'mid', 'expert'] as const;

function summarize(rows: ProfileRun[]) {
  const death = rows.map(r => r.deathLevel).sort((a, b) => a - b);
  const wins = rows.filter(r => r.win).length;
  const avg = death.reduce((a, b) => a + b, 0) / rows.length;
  const hist: Record<number, number> = {};
  for (const d of death) hist[d] = (hist[d] ?? 0) + 1;
  const gold = rows.reduce((a, r) => a + r.gold, 0) / rows.length;
  const earned = rows.reduce((a, r) => a + r.earned, 0) / rows.length;
  return {
    n: rows.length, wins, avgDeath: +avg.toFixed(1),
    min: death[0], med: death[Math.floor((death.length - 1) / 2)], max: death[death.length - 1],
    gold: +gold.toFixed(0), earned: +earned.toFixed(0), hist,
  };
}

function bandRatio(rows: ProfileRun[], from: number, to: number) {
  const xs = rows.flatMap(r => r.margins.filter(m => m.won && m.level >= from && m.level <= to).map(m => m.ratio));
  if (!xs.length) return null;
  const avg = xs.reduce((a, b) => a + b, 0) / xs.length;
  const under30 = xs.filter(x => x < 0.3).length;
  return { n: xs.length, avg: +avg.toFixed(2), under30 };
}

const t0 = Date.now();
const all: ProfileRun[] = [];
for (const profile of profiles) {
  for (const cls of PROFILE_CLASSES) {
    const rows: ProfileRun[] = [];
    for (let seed = 1; seed <= N; seed++) rows.push(playProfile(profile, cls, seed));
    all.push(...rows);
    const sum = summarize(rows);
    const extra = profile === 'expert' ? {
      b1: bandRatio(rows, 1, 10),
      b15: bandRatio(rows, 11, 20),
      b30: bandRatio(rows, 21, 30),
      b40: bandRatio(rows, 31, 40),
      b50: bandRatio(rows, 41, 50),
    } : {};
    console.log(JSON.stringify({ profile, cls, ...sum, ...extra }));
  }
}
console.log('elapsedMs', Date.now() - t0, 'runs', all.length);
