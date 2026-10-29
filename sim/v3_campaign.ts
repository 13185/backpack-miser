/**
 * V3 规则层整局初跑（弱策略机器人）。输出摘要，非平衡结论。
 * 运行：npx vite-node sim/v3_campaign.ts
 */
import { BUILDS, playRun } from './bot';

const seeds = [7, 31, 99, 128, 256, 512, 777, 1024, 2048, 4096];
const lines: string[] = [];
lines.push('# V3 战役机器人初跑报告');
lines.push('');
lines.push(`生成时间：${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })} Asia/Shanghai`);
lines.push('');
lines.push('> **声明**：本报告为固定种子弱策略规则层模拟，**不代表已平衡**，仅作开发进度参考。');
lines.push('');
lines.push('| 构筑 | 种子 | 通关 | 到达关 | 金币 |');
lines.push('|---|---:|:---:|---:|---:|');

let wins = 0;
let reachSum = 0;
const deaths: Record<number, number> = {};
for (const build of BUILDS.slice(0, 3)) {
  for (const seed of seeds) {
    const r = playRun(build, seed);
    if (r.won) wins++;
    reachSum += r.reached;
    deaths[r.reached] = (deaths[r.reached] ?? 0) + 1;
    lines.push(`| ${build.name} | ${seed} | ${r.won ? '是' : '否'} | ${r.reached} | ${r.gold} |`);
  }
}
const n = 3 * seeds.length;
lines.push('');
lines.push('## 摘要');
lines.push(`- 样本数：${n}`);
lines.push(`- 通关率：${((wins / n) * 100).toFixed(1)}%（弱策略，预期偏低）`);
lines.push(`- 平均到达关：${(reachSum / n).toFixed(1)}`);
lines.push('- 到达关分布（关→次数）：' + Object.keys(deaths).map(Number).sort((a,b)=>a-b).map(k => `${k}:${deaths[k]}`).join(', '));
lines.push('- 已知：后段机制/营地/符文会改变曲线，需人工试玩与数值迭代。');
lines.push('');
lines.push('## 本次接线说明（非平衡）');
lines.push('- LATE_TUNE 后期公开预算（见 campaign.ts / BALANCE_REPORT）');
lines.push('- 回响 / 过热 / 祝祷自盾 / 黄金心脏三阶段');
lines.push('- Boss 后营地；检查点在离开营地后写入');
lines.push('- 遗物 A01–A12 + C10 战斗/营地效果已接');

console.log(lines.join('\n'));
