import { BUILDS, playRun } from './bot';
const N = 200;
for (const b of BUILDS) {
  let wins = 0; const reach: number[] = Array(11).fill(0); let gold = 0;
  for (let s = 1; s <= N; s++) { const r = playRun(b, s * 7919); if (r.won) wins++; reach[r.reached]++; gold += r.gold; }
  const fails = reach.map((n, i) => (i && n ? `L${i}:${n}` : '')).filter(Boolean).join(' ');
  console.log(`${b.name.padEnd(14)} 通关率 ${(wins / N * 100).toFixed(1)}%  平均累计金币 ${(gold / N).toFixed(0)}  结束关卡分布 ${fails}`);
}
console.log('示例日志(匕首+红宝石 seed=7919):', playRun(BUILDS[0], 7919).log.join(' | '));
console.log('示例日志(大剑 seed=7919):', playRun(BUILDS[1], 7919).log.join(' | '));
