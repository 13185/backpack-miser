# 《背包守财奴》V3.2.0 分段地狱压交付

# 《背包守财奴》V3 最终交付说明

更新：2026-10-29 Asia/Shanghai（UTC+8）

**不宣称已平衡。未 push 到 Pages。未重做 PNG。**

相关文档：
- 完成度：`art/docs/COMPLETION_TABLE.md`
- 已知问题：`art/docs/KNOWN_ISSUES.md`
- 测试报告：`art/docs/TEST_REPORT.md`
- 素材：`art/docs/ASSET_LIST.md`、`art/docs/ART_STATUS_V3.md`
- 长测：`art/docs/BALANCE_LONG.md`、`art/docs/BALANCE_REPORT.md`
- 跑局：`art/docs/RUN_LOGS/`

---

## 如何运行

```bash
npm install
npm run dev          # http://localhost:5173 （V3 主线 50 关）
npm test             # Vitest（现行 124+）
npm run build        # tsc --noEmit + vite build → dist/
npm run preview      # 预览生产构建
npm run sim          # 短平衡模拟（bot 构筑）
npx vite-node sim/v3_campaign.ts   # 弱策略整局摘要
npx vite-node sim/v3_long.ts 50    # 长战役（见 BALANCE_LONG）
npx vite-node sim/run_logs.ts      # 重生成三类 RUN_LOGS
```

浏览器冒烟（可选）：

```bash
npm run build && npm run preview -- --port 5173 --host 127.0.0.1
node scripts/browser_smoke.mjs
# 截图 → art/screenshots/browser_smoke_*.png
```

---

## 素材清单

| 文档 | 内容 |
|---|---|
| `art/docs/ASSET_LIST.md` | 敌人/NPC/背景/角色 PNG 路径清单 |
| `art/docs/ART_STATUS_V3.md` | 四态接入状态（未制作 / 已制作未接入 / 已接入待检查 / 已检查） |
| `public/art/enemies/` 等 | 实际资源；**本轮未重做 PNG** |

立绘显示层：`src/art/enemyArt.ts`（精英皮仅当 `eliteActive`）。战斗 kind：`src/config/monsters.ts` + `src/config/v3/levels.ts`。

---

## 已经实际验证（有证据）

1. `npm test`：**124 passed**（含真实敌人、双体、精英立绘跟随路线）。
2. `npm run build`：tsc + vite **绿**。
3. `tests/flow_nodes.test.ts`：同一局真实动作连续推进 1→50（营地/符文/专精/结局/整备）。
4. `tests/v3_mech.test.ts`：回响/过热/祝祷/心脏；N05/N15–N24 kind；E08/E28 双体、E38 祝祷 25%；**未选精英不返回精英皮**。
5. `tests/boss_spec` / `campaign` / `story` / `v3_content` / `v3_systems`：Boss、关卡、剧情、装备遗物等。
6. Playwright headless 冒烟：`art/screenshots/browser_smoke_01_title.png` … `_04_battle.png`。
7. 三类 RUN_LOGS（种子 1）均 **通关第 50 关 / pure**：`shield`、`adjacency`、`poison_econ`（见 `art/docs/RUN_LOGS/`）。
8. LATE_TUNE **pass4** 长测见 `BALANCE_LONG.md`（每策略 50 局 × 两组种子）。
9. 存档/重试：`flow_nodes` 深比较；章节检查点回滚。
10. 精英路线 / 事件 / 负担：Game API + UI 接线；sim/driver 与 bot 自动处理以免卡关。

---

## 已实现但未验证（浏览器未手点等）

1. 事件 EV01–36 **逐项人工点选**（选项代价、负担背包满、升级弹窗）。
2. 精英路线 **全 10 个精英关** 人工选精英并看立绘/多单位战斗。
3. 营地「移除负担 15 金」人工流程（有单元路径与 UI 按钮，无截图）。
4. 铁人模式完整人工一局。
5. 援助重试整备交换 UI 长路径。
6. 三结局分支全文 + NPC 头像弹窗全截图。
7. 手机布局 / 触摸拖放长测。
8. Pages 线上部署验收（**未 push**）。
9. 章 6–10 新 kind 立绘「已检查」态（需游戏内截图升格）。
10. 经济流囤金是否在人类游玩中可消化（仅有机器人数据）。

---

## 尚未完成

1. **独立地图节点图**（非线性能选商店/事件/精英节点的大地图）。
2. **V3 独立掉落品质表**（仍沿用既有掉落逻辑）。
3. **宣称平衡 / 定稿数值**（明确不做本轮结论）。
4. **PNG 重做**（E18≈B20 脸相等；本轮禁止重做）。
5. **遗物图标绘制**（ART_STATUS：未制作）。
6. **GitHub Pages 发布**（需作者明确要求；本轮未 push）。
7. **完整人工 50 关长测报告**（非机器人）。

---

## 完整战役结果摘要

### 三类 RUN_LOGS（种子 1，真实 Game 驱动）

| 策略 | 职业 | 结果 | 重试 | 终局 |
|---|---|---|---|---|
| `shield` 护盾/恢复 | 守卫 | 通关 50 / pure | 0 | 断契 |
| `adjacency` 武器邻接 | 游侠 | 通关 50 / pure | 0 | 公账 |
| `poison_econ` 毒/经济 | 商旅 | 通关 50 / pure | 0 | 公账 |

复现：`npx vite-node sim/run_logs.ts`

### LATE_TUNE pass4 通关率（`BALANCE_LONG.md`）

种子组 A（1..N，每策略 50 局）/ B（10001..）：

| 策略 | A 通关 | B 通关 |
|---|---:|---:|
| 武器邻接（游侠） | 68% | 74% |
| 护盾/恢复（守卫） | 100% | 100% |
| 毒/经济（商旅） | 64% | 74% |
| 重刃宝石（守卫） | 76% | 88% |
| 弱策略对照（商旅） | 80% | 96% |

**以上均为机器人规则层模拟，不代表已平衡。**

---

## 已知问题摘要

详见 `KNOWN_ISSUES.md`。要点：

- 不宣称平衡（守卫偏易、经济囤金、匕首仍强）。
- 无独立地图 UI；事件不阻塞主线信息。
- 冒烟未覆盖事件/精英全路径；未 push Pages。
- 显示/工程边角：E18 脸相似、偶发回标题、favicon 缓存等。

---

## 声明

1. **不宣称平衡。**
2. **未 push Pages / 未执行 git push。**
3. **未重做任何敌人/NPC/背景 PNG。**
4. 交付以本仓库 `art/docs/` 与 `npm test` / `npm run build` 绿为准。


---

## 3.1.0 地狱压（2026-10-29）

- 版本：`package.json` → **3.1.0**
- 难度：唯一地狱（`HARD_TUNE` + `LATE_TUNE pass4`），无 Normal/Hard 选择
- 安装包：`release/desktop/BackpackMiser-Setup-3.1.0.exe`（见同目录 `parts-3.1.0/`）
- 长测：`art/docs/BALANCE_LONG.md`（不宣称已平衡）
- 测试：`npm test` 须全绿


---

## 3.2.0 分段地狱压（2026-10-29）

- 版本：`package.json` → **3.2.0**
- 难度：唯一分段地狱（`HARD_TUNE 3.2.0-band-hell` + `LATE_TUNE pass4`），无 Normal/Hard 选择
- 分段：1–10 逐步 / 10–20 明显 / 20–30 巨大 / 30–40 翻倍感 / 40–50 再翻倍感
- 安装包：`release/desktop/BackpackMiser-Setup-3.2.0.exe`（见同目录 `parts-3.2.0/`）
- 长测：`art/docs/BALANCE_LONG.md`（不宣称已平衡；机器人通关≈0%）
- 测试：`npm test` 须全绿（125）
