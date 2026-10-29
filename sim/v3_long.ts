/**
 * 长战役节奏统计（V3 §22/§23）：5 策略 × N 种子（默认100），另一组种子复核。
 * 运行：npx vite-node sim/v3_long.ts [N]   → 输出 Markdown 到控制台与 art/docs/BALANCE_LONG.md
 */
import { writeFileSync } from 'fs';
import { STRATEGIES, playStrategy, type RunRecord } from './driver';
import { V3_LEVELS } from '../src/config/v3';
import { LATE_TUNE_PASS, HARD_TUNE_VERSION } from '../src/config/v3/campaign';

declare const process: { argv: string[] };
const N = Number(process.argv[2] ?? 100);
const sets = [{ name: 'A（种子1..N）', base: 1 }, { name: 'B 复核（种子10001..）', base: 10001 }];
const out: string[] = [`# 长战役统计（LATE_TUNE pass${LATE_TUNE_PASS} + HARD_TUNE ${HARD_TUNE_VERSION} 地狱）`, '', `命令：\`npx vite-node sim/v3_long.ts ${N}\``, '', '> **不宣称已平衡。** 3.2.0 分段地狱压：按关递进（1–10逐步 / 10–20明显 / 20–30巨大 / 30–40翻倍感 / 40–50再翻倍感）；金币更稀、战后回复更少；中后期 Boss 技能加压。', ''];

function pct(a: number, b: number) { return b ? `${((a / b) * 100).toFixed(1)}%` : '—'; }

for (const set of sets) {
  out.push(`## 种子组 ${set.name}，每策略 ${N} 局`, '');
  out.push('| 策略 | 通关 | 纯净通关 | 援助通关 | 平均重试 | 死亡章节分布(首死) | 21+跳过奖励率 | 21+构筑变化/局 | 终局剩余金币中位 | 用时/局 |');
  out.push('|---|---:|---:|---:|---:|---|---:|---:|---:|---:|');
  const bossTable: string[] = [];
  const goldCurves: Record<string, number[]> = {};
  for (const st of STRATEGIES) {
    const recs: RunRecord[] = [];
    for (let i = 0; i < N; i++) { const r = playStrategy(st, set.base + i); delete (r as any).game; recs.push(r); }
    const win = recs.filter(r => r.result === 'victory');
    const pure = win.filter(r => !r.assistanceUsed).length;
    const firstDeathCh: Record<number, number> = {};
    for (const r of recs) if (r.deaths.length) { const ch = Math.ceil(r.deaths[0] / 5); firstDeathCh[ch] = (firstDeathCh[ch] ?? 0) + 1; }
    const skip = recs.reduce((a, r) => a + r.skipLoot21, 0), took = recs.reduce((a, r) => a + r.loot21, 0);
    const changes = recs.reduce((a, r) => a + r.buildChanges21, 0) / N;
    const endGold = win.map(r => r.chapters[r.chapters.length - 1]?.gold ?? 0).sort((a, b) => a - b);
    const med = endGold.length ? endGold[Math.floor(endGold.length / 2)] : 0;
    const ms = recs.reduce((a, r) => a + r.wallMs, 0) / N;
    out.push(`| ${st.name} | ${pct(win.length, N)} | ${pct(pure, N)} | ${pct(win.length - pure, N)} | ${(recs.reduce((a, r) => a + r.retries, 0) / N).toFixed(2)} | ${Object.entries(firstDeathCh).map(([c, n]) => `章${c}:${n}`).join(' ') || '无'} | ${pct(skip, skip + took)} | ${changes.toFixed(1)} | ${med} | ${ms.toFixed(0)}ms |`);
    // Boss 胜率（按尝试）
    const bt: Record<number, { win: number; loss: number }> = {};
    for (const r of recs) for (const [lv, v] of Object.entries(r.bossResults)) { bt[+lv] ??= { win: 0, loss: 0 }; bt[+lv].win += v.win; bt[+lv].loss += v.loss; }
    bossTable.push(`| ${st.name} | ${[5, 10, 15, 20, 25, 30, 35, 40, 45, 50].map(l => bt[l] ? pct(bt[l].win, bt[l].win + bt[l].loss) : '—').join(' | ')} |`);
    // 金币曲线：每章开局金币均值（按 prep 记录顺序近似：取每局 goldCurve 第 (ch-1)*5 项）
    goldCurves[st.name] = Array.from({ length: 10 }, (_, ch) => {
      const v = recs.map(r => r.goldCurve[ch * 5]).filter(x => x !== undefined);
      return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : 0;
    });
  }
  out.push('', '### 各 Boss 单次尝试胜率（含重试尝试）', '', '| 策略 | B5 | B10 | B15 | B20 | B25 | B30 | B35 | B40 | B45 | B50 |', '|---|---|---|---|---|---|---|---|---|---|---|', ...bossTable);
  out.push('', '### 每章首关开战前平均金币（闲置检查）', '', '| 策略 | ' + Array.from({ length: 10 }, (_, i) => `章${i + 1}`).join(' | ') + ' |', '|---|' + '---:|'.repeat(10));
  for (const [k, v] of Object.entries(goldCurves)) out.push(`| ${k} | ${v.join(' | ')} |`);
  out.push('');
}
// 每章机制（是否只是换皮加血）
out.push('## 每章敌人机制（配置读取）', '', '| 章 | 关 | 敌人 | 机制 |', '|---:|---|---|---|');
for (let ch = 1; ch <= 10; ch++) {
  const lvls = V3_LEVELS.filter(l => l.chapter === ch);
  const mons = [...new Set(lvls.map(l => l.monster))].join('、');
  const mech = [...new Set(lvls.map(l => [l.tideCycle && '潮汐护甲', l.echo && '回响', l.overheat && '过热', l.pray && '祝祷(含祝祷者单位)', l.heartPhases && '三阶段', l.armor && `护甲${l.armor}`, l.boss && 'Boss暴怒'].filter(Boolean).join('+')).filter(Boolean))].join('；');
  out.push(`| ${ch} | ${(ch - 1) * 5 + 1}–${ch * 5} | ${mons} | ${mech || '无特殊（仅数值）'} |`);
}
const md = out.join('\n') + '\n';
writeFileSync(new URL('../art/docs/BALANCE_LONG.md', import.meta.url), md);
console.log(md);
