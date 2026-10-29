# 《背包守财奴》实现矩阵（V3）

作者 Jack · 更新 2026-10-29 00:54 Asia/Shanghai

## 图例
- **done** / **scaffold** / **pending**

## 战役与系统

| 项 | 状态 | 说明 |
|---|---|---|
| 50关主循环 / 存档v3 / 检查点 | done | 检查点在营地离开后 |
| 后期难度 LATE_TUNE pass3 | done | 仅≥21；前20不动；见 BALANCE_REPORT |
| 十章背景 + Boss 图接线 | done | |
| 符文 U01–U08 / 专精 T01–T06 | done | |
| 新装备进背包 | done | |
| 遗物 A01–A12 + C10 | done | 战斗/营地均已接关键路径 |
| 回响 / 过热 / 祝祷 / 心脏三阶段 | done | HEART_TUNE 加压 |
| 章节营地 | done | |
| 剧情骨架 / 结局三选 | done | 见 STORY_STATE |
| 机器人 sim + 报告 | done | **未宣称已平衡**（pass3≈70%） |
| 多目标溅射 | scaffold | |
| 人类试玩平衡 | pending | |

## 测试
vitest **83** · build 绿 · `npx vite-node sim/v3_campaign.ts` · 见 TEST_REPORT

## 2026-10-29 整合轮（t15u）
逐项四列状态以 `COMPLETION_TABLE.md` 为准，本表旧条目如有冲突，以完成度表为准。

## 2026-10-29 续作（剧情/Boss/调参/V2内容）
以 COMPLETION_TABLE 为准。本轮：剧情正式化、Boss 对齐、V2 装备+遗物、pass4 调参、事件骨架。


## 2026-10-29 续：真实敌人 / 双体 / 事件 / 负担
- monsters + v3/levels：N05、N15–N24、E08/E28/E38 机制
- combat：dualUnits / prayShare / regen / openMShieldPct
- events EV01–36 + route UI + camp burden
- vitest 123 · browser_smoke 4 图
