# MIGRATION.md — V1/V2 → V3 存档与战役升级

## 现状审计（2026-10-29）

| 位置 | 硬编码 | V3 目标 |
|---|---|---|
| `src/config/levels.ts` | 10 关 V1 战斗表 | 保留作兼容；主战役改读 `v3/stages` |
| `src/config/v2/stages.ts` | 20 关 / chapter 1\|2\|3\|4 | 保留；V3 扩展到 50 / 10 章 |
| `src/systems/save.ts` | `SAVE_VERSION=1`，`level<=10` | 升至 3；`level<=campaignLength` |
| `src/systems/game.ts` | `lv >= LEVELS.length` → victory | `lv >= campaignLength` 且仅最终关通关；第20关继续 |
| `src/ui/app.ts` | `第 x/10 关` | `第 x/{campaignLength} 关` |
| `src/models/types.ts` | level 注释 1..10 | 扩展战役字段 |

## 安全升级原则

1. 战役长度、章节数、Boss 关、奖励终点全部由 `src/config/v3/campaign.ts` 推导。
2. 第20关：`midAct=true`，结算后进第21关，**不**进 `victory`。
3. 第50关：唯一 `finalBoss`，胜利→`RUN_WIN` / `victory`。
4. 旧存档：V1（version1, level≤10）备份到 `backpack-miser-save-v1-backup`；可继续清档开 V3 新局。V2 未完成局同理备份。不把未知节点硬拼进新地图。
5. 旧「通关10关/20关」成就独立记录，不冒充50关通关。

## 新存档字段（SAVE_VERSION=3）

campaignId, campaignVersion, campaignLength=50, mode('story'|'ironman'),
currentChapter, attemptId, chapterCheckpoint, assistanceUsed, retryCount,
storyFlags, questStates, npcStates, endingChoice, runes, doctrine, seenDialogue.


## 阶段进度（2026-10-29）
- 已完成：配置层 V3_LEVELS、存档 v3、settle 20/50 判定、HUD /50、章节检查点最小可用、campaign 测试。
- 主游戏已切换读 V3；`src/config/levels.ts` 仍保留作 V1/单测兼容。
