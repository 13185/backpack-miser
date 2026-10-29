# DESIGN — 《背包守财奴》V3

作者 Jack · 2026-10-29

## 一句话
带着格子有限的背包闯地牢：整理、合成、自动战斗，打完 **50 场**编号战斗（10 章），第 20 关是剧情转折，第 50 关才是终局。

## 技术
TypeScript · Phaser 3 · Vite · Vitest · localStorage（`SAVE_VERSION=3`）

## 核心循环
选职业 → 准备（背包/商店/扩容）→ 自动战斗 → 结算 → 装备奖励 →（条件）遗物 →（Boss）营地 → 下一关  
第 21/31 关符文教学；第 36 关战术专精；第 45 关终局方案三选一；第 50 关黄金心脏三阶段后结局。

## 配置入口
| 内容 | 路径 |
|---|---|
| 战役长度/章节/预算 | `src/config/v3/campaign.ts` |
| 战斗关卡映射 | `src/config/v3/levels.ts` |
| 符文/专精/剧情 | `src/config/v3/runes.ts` · `doctrines.ts` · `story.ts` |
| 装备/遗物扩展 | `src/config/items.ts` · `src/config/v3/relics.ts` |
| 规则层 | `src/systems/combat.ts` · `game.ts` · `save.ts` |

战役长度、胜利终点、章节数均由配置推导，禁止散落写死 20/50。

## 模式
- **story**（默认）：Boss 后营地；战败可回章节检查点  
- **ironman**：字段已有；战败结束（开局 UI 可再加强）

## 美术
暗黑童话手绘；十章背景与十 Boss、四名关键 NPC 已制作并接入战斗/资源树。规范见根目录旁 `art/` 内 ART_BIBLE（若存在）与 `ART_STATUS_V3.md`。

## 平衡立场
规格数值为初值；后期 `LATE_TUNE` pass3 为公开调参。机器人报告见 `BALANCE_REPORT.md`。**不宣称已平衡。**
