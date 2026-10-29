# V3 美术状态（四态）

更新 2026-10-29 01:45 Asia/Shanghai

四态：未制作 / 已制作未接入 / 已接入待检查 / 已检查（只有在实际游戏截图里看到才算已检查；截图见 `art/screenshots/art_consistency_after_L*.png`）。

画风基准：三职业原图（`art/refs/*-9grid.png`）。本轮全部敌人/NPC/背景 ch2–4、ch8/装备图标已按基准重做（绿幕生成→`art/tools/key_green.py` 抠图→1024 画布脚底 y=928 + 512 版）。旧图在 `art/_deprecated/`。

## 敌人（44）
| 资产 | 名称 | 状态 | 证据/备注 |
|---|---|---|---|
| B05_mimic | 黄金宝箱怪 | 已检查 | L05 截图 |
| B10_iron_warden | 铸铁看守 | 已接入待检查 | BattleScene：MONSTER_ART / CHAPTER_VARIANT_ART / ELITE_LEVEL_ART |
| B15_spider_queen | 孵化蛛后 | 已接入待检查 | BattleScene：MONSTER_ART / CHAPTER_VARIANT_ART / ELITE_LEVEL_ART |
| B20_tax_lord | 税金领主 | 已接入待检查 | BattleScene：MONSTER_ART / CHAPTER_VARIANT_ART / ELITE_LEVEL_ART |
| B25_salt_captain | 盐雾船长 | 已检查 | L25 截图 |
| B30_mirror_auditor | 镜砂审计官 | 已接入待检查 | BattleScene：MONSTER_ART / CHAPTER_VARIANT_ART / ELITE_LEVEL_ART |
| B35_furnace_colossus | 熔炉巨像 | 已检查 | L35 截图 |
| B40_silent_warden | 缄默典狱长 | 已接入待检查 | BattleScene：MONSTER_ART / CHAPTER_VARIANT_ART / ELITE_LEVEL_ART |
| B45_debt_regent | 债契摄政王 | 已接入待检查 | BattleScene：MONSTER_ART / CHAPTER_VARIANT_ART / ELITE_LEVEL_ART |
| B50_golden_heart | 黄金心脏 | 已检查 | L50 截图 |
| E03_foreman | 矿洞监工 | 已检查 | L03 截图 |
| E08_dual_guard | 铁甲双卫 | 已接入待检查 | BattleScene：MONSTER_ART / CHAPTER_VARIANT_ART / ELITE_LEVEL_ART |
| E13_brood | 剧毒育母 | 已检查 | L13 截图 |
| E18_executioner | 王库执刑官 | 已接入待检查 | BattleScene：MONSTER_ART / CHAPTER_VARIANT_ART / ELITE_LEVEL_ART |
| E23_smuggler_deacon | 走私执事 | 已接入待检查 | BattleScene：MONSTER_ART / CHAPTER_VARIANT_ART / ELITE_LEVEL_ART |
| E28_twin_auditors | 双面稽核者 | 已检查 | L28 截图 |
| E33_forge_overseer | 锻债监造 | 已检查 | L33 截图 |
| E38_sealing_friar | 封账修士 | 已检查 | L38 截图 |
| E43_debt_knight | 王庭追债骑士 | 已检查 | L43 截图 |
| E48_last_auditor | 最后审计官 | 已检查 | L48 截图 |
| N01_slime | 遗落的矿灯（史莱姆） | 已检查 | L01 截图 |
| N02_bat | 洞穴蝙蝠 | 已接入待检查 | BattleScene：MONSTER_ART / CHAPTER_VARIANT_ART / ELITE_LEVEL_ART |
| N03_skeleton | 骷髅卫士 | 已接入待检查 | BattleScene：MONSTER_ART / CHAPTER_VARIANT_ART / ELITE_LEVEL_ART |
| N04_brute | 地牢蛮兵 | 已接入待检查 | BattleScene：MONSTER_ART / CHAPTER_VARIANT_ART / ELITE_LEVEL_ART |
| N05_rats | 双生鼠群 | 已接入待检查 | L4 rats + dualUnits；MONSTER_ART |
| N06_beetle | 结晶甲虫 | 已接入待检查 | BattleScene：MONSTER_ART / CHAPTER_VARIANT_ART / ELITE_LEVEL_ART |
| N07_archer | 蓄力弓手 | 已接入待检查 | BattleScene：MONSTER_ART / CHAPTER_VARIANT_ART / ELITE_LEVEL_ART |
| N08_priest | 补给祭司 | 已接入待检查 | BattleScene：MONSTER_ART / CHAPTER_VARIANT_ART / ELITE_LEVEL_ART |
| N09_spider | 孵化幼蛛 | 已接入待检查 | BattleScene：MONSTER_ART / CHAPTER_VARIANT_ART / ELITE_LEVEL_ART |
| N10_miner | 狂热矿工 | 已接入待检查 | BattleScene：MONSTER_ART / CHAPTER_VARIANT_ART / ELITE_LEVEL_ART |
| N11_vault_guard | 王库守卫 | 已接入待检查 | BattleScene：MONSTER_ART / CHAPTER_VARIANT_ART / ELITE_LEVEL_ART |
| N12_hound | 黄金猎犬 | 已接入待检查 | BattleScene：MONSTER_ART / CHAPTER_VARIANT_ART / ELITE_LEVEL_ART |
| N13_harbor_patrol | 港口巡丁 | 已接入待检查 | MONSTER_ART.harbor_patrol（第21关） |
| N14_tide_crab | 潮甲蟹 | 已检查 | L22 截图 |
| N15_smuggler_xbow | 走私弩手 | 已接入待检查 | BattleScene：MONSTER_ART / CHAPTER_VARIANT_ART / ELITE_LEVEL_ART |
| N16_mirror_sentinel | 镜砂哨兵 | 已接入待检查 | BattleScene：MONSTER_ART / CHAPTER_VARIANT_ART / ELITE_LEVEL_ART |
| N17_sandmirror_xbow | 砂镜弩手 | 已接入待检查 | BattleScene：MONSTER_ART / CHAPTER_VARIANT_ART / ELITE_LEVEL_ART |
| N18_ash_sapper | 灰烬工兵 | 已接入待检查 | BattleScene：MONSTER_ART / CHAPTER_VARIANT_ART / ELITE_LEVEL_ART |
| N19_furnace_guard | 炉甲守卫 | 已接入待检查 | BattleScene：MONSTER_ART / CHAPTER_VARIANT_ART / ELITE_LEVEL_ART |
| N20_chanter | 祝祷者 | 已接入待检查 | BattleScene：MONSTER_ART / CHAPTER_VARIANT_ART / ELITE_LEVEL_ART |
| N21_amulet_attendant | 护符侍从 | 已接入待检查 | BattleScene：MONSTER_ART / CHAPTER_VARIANT_ART / ELITE_LEVEL_ART |
| N22_echo_guard | 王庭回响卫 | 已接入待检查 | BattleScene：MONSTER_ART / CHAPTER_VARIANT_ART / ELITE_LEVEL_ART |
| N23_core_soldier | 核心铸兵 | 已接入待检查 | BattleScene：MONSTER_ART / CHAPTER_VARIANT_ART / ELITE_LEVEL_ART |
| N24_lamp_priest | 执灯祭司 | 已接入待检查 | BattleScene：MONSTER_ART / CHAPTER_VARIANT_ART / ELITE_LEVEL_ART |

## NPC（半身立绘）
| 资产 | 状态 | 备注 |
|---|---|---|
| lumi | 已接入待检查 | 露米：铜红短发+护目镜+灯，年轻领路人；剧情弹窗按正文首个出现的 NPC 名显示头像（`src/art/npcArt.ts`），尚未截图到弹窗 |
| old_rivet | 已接入待检查 | 老铆：光头灰须+焊接护目镜+右臂铆钉护臂/旧伤绷带；剧情弹窗按正文首个出现的 NPC 名显示头像（`src/art/npcArt.ts`），尚未截图到弹窗 |
| mr_crow | 已接入待检查 | 乌先生：乌鸦喙面具+黑燕尾+账本算盘；剧情弹窗按正文首个出现的 NPC 名显示头像（`src/art/npcArt.ts`），尚未截图到弹窗 |
| eve | 已接入待检查 | 伊芙：深棕侧辫、无帽、绿白医师服+红十字袖标+背药箱；剧情弹窗按正文首个出现的 NPC 名显示头像（`src/art/npcArt.ts`），尚未截图到弹窗 |

## 背景
| 章 | 状态 | 备注 |
|---|---|---|
| ch1 mine | 已检查 | 原有，作为背景基准 |
| ch2 prison | 已检查 | 重做（旧图为几何占位） L03/L05 截图 |
| ch3 nest | 已检查 | 重做（旧图为几何占位） L13 截图 |
| ch4 vault | 已接入待检查 | 重做（旧图为几何占位）；截图未覆盖 16–20 关 |
| ch5 harbor | 已检查 | 保留 L22/L25 |
| ch6 mirrorsand | 已检查 | 保留 L28 |
| ch7 ashforge | 已检查 | 保留 L33/L35 |
| ch8 sanctum | 已检查 | 重做为灰白旧金（旧图偏青） L38 |
| ch9 court | 已检查 | 保留 L43 |
| ch10 heart | 已检查 | 保留 L48/L50 |

## 装备图标（18）
统一手绘 PNG `public/art/items/<kind>.png`（128px），`src/ui/icons.ts` 的 `iconSvg()` 改为输出 `<img>`，旧 SVG 仅作回退。
| kind | 状态 |
|---|---|
| dagger | 已检查（商店/背包截图可见） |
| greatsword | 已接入待检查 |
| shield | 已检查（商店/背包截图可见） |
| potion | 已接入待检查 |
| ruby | 已检查（商店/背包截图可见） |
| moneybag | 已接入待检查 |
| spear | 已接入待检查 |
| compass | 已接入待检查 |
| firework_crossbow | 已接入待检查 |
| fold_wall | 已接入待检查 |
| travel_lamp | 已接入待检查 |
| emergency_ledger | 已接入待检查 |
| poison_needle | 已接入待检查 |
| crossbow | 已接入待检查 |
| chain_hammer | 已接入待检查 |
| warhammer | 已接入待检查 |
| ice_crystal | 已接入待检查 |
| war_banner | 已接入待检查 |

## 遗物图标
未制作（本轮未做）。

## 已知不一致/未做
- N05_rats / N15–N24：**已接入真实 kind 与机制**（`monsters.ts` + `v3/levels.ts` + combat 双体/回响/过热/祝祷/再生）；立绘走 `MONSTER_ART` / `CHAPTER_VARIANT_ART`。
- 精英 E08/E28：**真实双单位**；E38：**主攻+祝祷者 25%**。立绘：`pickEnemyArt(..., { eliteActive })`，**仅已选精英路线**才用 `ELITE_LEVEL_ART`。
- E18 执刑官的脸与 B20 税金领主相似（同一生成参考带入），可后续重做。
- E18 执刑官的脸与 B20 税金领主相似（同一生成参考带入），可后续重做。
- 截图脚本注入 heroClass 后主角仍显示商旅（app 内职业状态可能不从存档读取），守卫/游侠同屏比较只在对比图里做，未在游戏截图里做。
- 第 45 关截图被终局选择弹窗遮挡。
