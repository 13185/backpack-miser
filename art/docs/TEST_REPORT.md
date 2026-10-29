# TEST_REPORT · 2026-10-29 Asia/Shanghai

## 自动测试
- `npm test`：**124 passed**（含精英立绘跟随 `eliteActive`） / 10 files
- `npm run build`：tsc + vite **绿**
- 新增：`tests/v3_mech` 真实 kind / 双体 / E08·E28·E38

## 浏览器冒烟（headless Playwright）
- 命令：`npm run preview -- --port 5173` + `node scripts/browser_smoke.mjs`
- 结果：通过
- 截图：
  - `art/screenshots/browser_smoke_01_title.png`
  - `art/screenshots/browser_smoke_02_prep.png`
  - `art/screenshots/browser_smoke_03_after_modals.png`
  - `art/screenshots/browser_smoke_04_battle.png`

## 本轮实现摘要
1. **真实敌人**：N05 rats、N15–N24、章6–10 不再复用 skeleton/bat/brute 换皮；各有回响/过热/祝祷/再生/双体等机制。
2. **双体精英**：E08/E28=`dualUnits` 主+twin；E38=祝祷者 25%。
3. **事件 EV01–36**、**精英路线**、**负担物**（营地 15 金）：Game + UI + sim 驱动已接。
4. **未做**：独立地图节点图、PNG 重做、宣称平衡、完整 50 关人工长测。

## 未验证
- 事件选项人工点选全覆盖
- 精英全路线通关率
- 负担物经济长测
