/**
 * 三类构筑 1～50 可复现通关记录（正常经济/奖励规则，真实 Game 动作）。
 * 复现：npx vite-node sim/run_logs.ts
 * 规则：每个策略从种子1起找第一个“纯净通关”（无援助）记录；同时给出该策略前20种子的通关统计，避免挑样本掩盖失败。
 */
import { writeFileSync, mkdirSync } from 'fs';
import { STRATEGIES, playStrategy, type RunRecord } from './driver';
import { V3_RELICS } from '../src/config/v3/relics';
import { RUNES } from '../src/config/v3/runes';
import { DOCTRINES } from '../src/config/v3/doctrines';
import { ENDING_CHOICES } from '../src/config/v3/story';

const OUT = new URL('../art/docs/RUN_LOGS/', import.meta.url);
mkdirSync(OUT, { recursive: true });
const CLASS = { merchant: '商旅', guard: '守卫', ranger: '游侠' } as const;
const picks = ['adjacency', 'shield', 'poison_econ'];
const summary: string[] = ['# 三类构筑 1～50 通关记录索引', '', '复现：`npx vite-node sim/run_logs.ts`（确定性；同版本配置结果一致）', '',
  '| 构筑 | 种子 | 职业 | 结果 | 重试 | 援助 | 终局 | 前20种子通关 |', '|---|---:|---|---|---:|---|---|---|'];

for (const id of picks) {
  const st = STRATEGIES.find(s => s.id === id)!;
  let chosen: RunRecord | null = null;
  let wins = 0; const fails: string[] = [];
  for (let seed = 1; seed <= 20; seed++) {
    const r = playStrategy(st, seed);
    if (r.result === 'victory') wins++; else fails.push(`种子${seed}止于第${r.reached + 1}关`);
    if (!chosen && r.result === 'victory' && !r.assistanceUsed) chosen = r;
  }
  if (!chosen) { summary.push(`| ${st.name} | — | ${CLASS[st.heroClass]} | 前20种子无纯净通关 | | | | ${wins}/20 |`); continue; }
  const r = chosen;
  const g = (r as any).game;
  delete (r as any).game;
  const contrib = Object.entries(g.s.stats.contribution as Record<string, number>).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const md = [
    `# ${st.name} — 种子 ${r.seed}`, '',
    `复现：\`npx vite-node sim/run_logs.ts\`（本文件由脚本生成；策略定义见 \`sim/driver.ts\` 中 \`${st.id}\`）`, '',
    `- 职业：${CLASS[r.heroClass]}；模式：故事战役`,
    `- 起手：${r.starter.join('、')}（职业固定起手，未额外赠送）`,
    `- 结果：**${r.result === 'victory' ? '通关第50关' : '失败'}**；完成类型：${r.completion}`,
    `- 死亡/重试：${r.deaths.length} 次死亡（${r.deaths.map(d => `第${d}关`).join('、') || '无'}），回章节起点 ${r.retries} 次；援助：${r.assistanceUsed ? '用过' : '未用'}`,
    `- 遗物：${r.relics.map(x => `${x} ${V3_RELICS[x as keyof typeof V3_RELICS]?.name ?? ''}`).join('、') || '无'}`,
    `- 符文：${r.runes.map(x => `${x.slice(0, 3)} ${RUNES[x.slice(0, 3) as keyof typeof RUNES]?.name ?? ''}${x.length > 3 ? x.slice(3) : ''}`).join('、')}`,
    `- 专精：${r.doctrine} ${r.doctrine ? DOCTRINES[r.doctrine as keyof typeof DOCTRINES].name : ''}${r.doctrineRerolled ? '（第40关后重选过）' : '（第40关后未改）'}`,
    `- 支线选择：${Object.entries(r.choices).map(([k, v]) => `${k.split(':')[0]}→${v}`).join('，')}`,
    `- 终局方案：${r.ending ? ENDING_CHOICES[r.ending as keyof typeof ENDING_CHOICES].title : '无'}`,
    `- 营地/整备：${r.camps.join('；')}`,
    `- 21关后：领装备 ${r.loot21} 次，跳过(回收/休整) ${r.skipLoot21} 次；构筑变化 ${r.buildChanges21} 次`,
    '', '## 每章结束（营地离开后 / 终局）', '', '| 章 | 关 | 生命 | 金币 | 累计重试 |', '|---:|---:|---:|---:|---:|',
    ...r.chapters.map(c => `| ${c.chapter} | ${c.level} | ${c.hp}/${c.maxHp} | ${c.gold} | ${c.retries} |`),
    '', '## 终局背包', '', g.bagItems.map((i: any) => `${i.kind} Lv${i.level}`).join('、'),
    '', '## 输出构成（全局累计，前8）', '', ...contrib.map(([k, v]) => `- ${k}：${v}`),
    '', `同策略前20种子：通关 ${wins}/20；失败：${fails.join('；') || '无'}（失败含达到重试上限15次）。`, '',
  ].join('\n');
  writeFileSync(new URL(`${st.id}_seed${r.seed}.md`, OUT), md);
  writeFileSync(new URL(`${st.id}_seed${r.seed}.json`, OUT), JSON.stringify(r, null, 2));
  summary.push(`| ${st.name} | ${r.seed} | ${CLASS[r.heroClass]} | 通关 | ${r.retries} | ${r.assistanceUsed ? '是' : '否'} | ${r.ending ? ENDING_CHOICES[r.ending as keyof typeof ENDING_CHOICES].title : '—'} | ${wins}/20 |`);
  console.log(st.id, 'seed', r.seed, 'retries', r.retries, 'wins', wins);
}
writeFileSync(new URL('README.md', OUT), summary.join('\n') + '\n');
console.log(summary.join('\n'));
