# V3 剧情状态说明

更新：2026-10-29 00:54 Asia/Shanghai

存档字段在 `GameState`（`src/models/types.ts`），剧情文案在 `src/config/v3/story.ts`。

## storyFlags（`Record<string, boolean>`）
| 键 | 含义 | 写入时机 |
|---|---|---|
| `midActSeen` | 第20关中段折转已触发 | Boss20 胜利结算 |
| `runeTutorialDone` | 第21关符文教学已完成（选过符文） | `chooseRune` 于 level21 |
| `runeSlot2Done` | 第31关第二符文槽流程完成 | `chooseRune` 于 level31 |
| `endingChoicePending` | 第45关需选结局原则 | 进入45相关 offer；选定后清 false |
| `a06Pending` | 修补线：下场战斗 +5 maxHp/hp | `campRest` 持有 A06；`makeCombat` 消费 |

章节开场不另立 flag：用 `seenDialogue` + `pendingStoryId`（`ch1_intro`…`ch10_intro`）。

## endingChoice
类型：`EndingId | null` = `break_bond` | `public_ledger` | `takeover`  
- 第45关开战前必须选定（`startBattle` 拦截）  
- 终局胜利时排队 `ending_$<built-in function id>` 文案  

## questStates / npcStates
`Record<string, string>` 占位，供支线/NPC 扩展；当前主线未强制写入。检查点快照会一并保存。

## seenDialogue / pendingStoryId
- `pendingStoryId`：UI 待展示的一条剧情 id  
- `seenDialogue`：已看过的 id 列表，防重复排队  
- 中段：`mid_act_20`；结局：`ending_*`

## 检查点
Boss（非50）领奖 → **营地** → `campLeave` 后写入 `chapterCheckpoint`（含 storyFlags / endingChoice / relics / runes 等）。ironman 不可回退章节点。

## 2026-10-29 整合轮（t15u）
支线选择与 flag（定义见 `config/v3/quests.ts`）：
- 第19关 账本页：拿取，扣8血、证据+1；或放弃。
- 第23关 救援路线：护送扣12金；或取证，证据+1、救援推迟。
- 第34关 锻造资源：交出扣15金；或保留。
- 第39关：证据+1；或救援，扣6血。
回报发放（questOnWin）：L9、L10、L15、L25、L30、L35、L38、L42。公开账本需要证据≥2。
storyLog 会写入存档，**没有回看界面**。正式文本（导言 60–120 字、Boss 前后台词、每关一句、职业差异、结局随支线变化）**未完成**。

## 2026-10-29 续作（剧情/Boss/调参/V2内容）
正式文本已写入 `src/config/v3/story.ts`：
- 十章开场/目标/进展/结果；Boss 前后；LEVEL_LINES 1–50。
- 三职业章1开场变体；结局 `resolveEndingFinale(ending+questStates+heroClass)`。
- 第41关队列 `ending_brief_45`；第45关选项展示 conditionHint。
- HUD 📜 剧情日志回看；跳过文字只 dismissStory。
测试：`tests/story.test.ts`。
