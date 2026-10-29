# 背包守财奴

“背包整理 + 装备合成 + 自动战斗 + 轻度经营”的单人网页小游戏。TypeScript + Phaser 3 + Vite，localStorage 本地存档，无后端。

> **交付入口**：[`art/docs/DELIVERY.md`](art/docs/DELIVERY.md)（如何运行 / 已验证 / 未验证 / 未完成）· [`art/docs/COMPLETION_TABLE.md`](art/docs/COMPLETION_TABLE.md)（完成度诚实表）· [`art/docs/KNOWN_ISSUES.md`](art/docs/KNOWN_ISSUES.md)  
> **不宣称已平衡。未 push Pages。** V3 主线为 **50 关 / 10 章**；立绘与程序绘制回退并存（见 `ART_STATUS_V3.md`）。

## 启动与构建
```bash
npm install
npm run dev          # 开发服务器 http://localhost:5173
npm run build        # 类型检查 + 生产构建到 dist/
npm run preview      # 预览生产构建
npm test             # Vitest 单元测试（规则 + 平衡）
npm run sim          # 平衡模拟（4 套思路 × 200 局）
npm run build:single # 单文件版到 dist-single/index.html（可离线双击打开）
```
`release/背包守财奴.html` 即单文件版，双击即可游玩。

## V3 战役（50 关 / 现行主线）
```bash
npm run dev                              # 游玩 V3（存档 version 3）
npm test                                 # 规则与内容单测（现行 123+）
npx vite-node sim/v3_campaign.ts         # 弱策略整局摘要 → art/docs/BALANCE_REPORT.md
npx vite-node sim/v3_long.ts 50          # 长战役 → art/docs/BALANCE_LONG.md
```
**先读** [`art/docs/DELIVERY.md`](art/docs/DELIVERY.md) 与 [`art/docs/COMPLETION_TABLE.md`](art/docs/COMPLETION_TABLE.md)。  
其余：`ART_STATUS_V3.md`、`ASSET_LIST.md`、`TEST_REPORT.md`、`KNOWN_ISSUES.md`、`BALANCE_LONG.md`、`RUN_LOGS/`、`V3_50关_连贯剧情与美术扩展指令.md`。  
**不宣称已平衡**；后期预算见 `LATE_TUNE`（pass4）。含精英路线、事件 EV01–36、负担物、真实敌人 N05/N15–N24（非换皮）。

## 操作
- 拖动装备（鼠标/触摸）到背包格子；绿色=可放置，红色=不可放置；松手于无效位置自动回原位。
- 旋转：电脑拖动中或选中时按 **R**；手机点「旋转」按钮或详情面板里的「旋转」。
- 合成：把装备拖到**相同种类、相同等级**的另一件装备上，出现“合成预览”后松手。
- 点击装备查看详情（手机为底部弹出面板），可出售（需再次点击确认）、放回临时区/放入背包。
- 临时区装备不生效；有临时区装备时不能开战。
- 战斗中可切换 1 倍 / 2 倍速；切到后台自动暂停。

## 规则要点（V3）
- 主线 **50 关 / 10 章**；第 20 关中段折转，第 50 关最终通关。装备含原 6 种 + 后期解锁（长矛、罗盘、烟火弩、折叠铁壁、旅行灯、救急账匣、毒针等），等级 1–3。
- 红宝石邻接强化武器；符文最多 2 枚；战术专精一项；遗物最多 3 件。
- 护盾默认上限为最大生命 50%（专精「坚守」可改 60%）；药水低生命触发。
- 45 秒狂暴、90 秒超时；潮汐/回响/过热/黄金心脏三阶段见战斗与文档。
- 胜利金币按关卡预算；Boss 后章节营地（休息/锻造/离开）。数值见 `BALANCE_REPORT.md`，**未宣称已平衡**。
- 背包扩容两次：30 金币（5×5）、50 金币（5×6）。

## 战斗事件顺序（确定性）
统一时钟：Phaser `update()` 中把真实帧时间（最多 100ms，乘以倍速）交给纯函数 `stepCombat()`；时间用整数毫秒。
同一毫秒内的处理顺序固定为：
0. 超时判定（90 秒）→ 狂暴阶段推进
1. 玩家武器攻击（按背包位置从上到下、从左到右）
2. 盾牌获得护盾（同上顺序，受上限截断）
3. 怪物攻击 → 护盾先抵扣 → 扣生命 → 死亡判定 → 药水按位置顺序检查（每喝一瓶重新检查阈值）

每个事件执行后立即判定胜负，战斗结束后不再产生任何攻击或治疗。首次攻击发生在一个完整攻击间隔之后。Boss 暴怒从下一次攻击间隔起生效。动画只读取事件列表播放，不参与计算，因此掉帧或重复动画不会造成重复伤害。

## 存档
`localStorage` 键 `backpack-miser-save`（版本号 `version: 1`）保存关卡、阶段、生命、金币、背包尺寸、所有装备（ID/种类/等级/坐标/朝向）、临时区、奖励候选与领取状态、商店商品/已购/刷新次数、随机数状态、战斗编号。设置（音效、引导）存于 `backpack-miser-settings`。
- 战斗中刷新：战斗期间状态不变，恢复后从同一开战前快照重新进行同一场战斗。
- 结算使用 `battleToken/settledToken`，奖励 `claimed` 标记，防止重复领取。
- 损坏/不兼容存档在标题页提示并可开始新冒险。

## 目录
```
src/config   装备、怪物、关卡、经济配置
src/models   类型定义
src/systems  placement 放置/占格 · merge 合成 · adjacency 宝石邻接 · combat 战斗 · economy 价格 · loot 随机候选 · rng · save 存档 · game 状态机/操作
src/scenes   BattleScene（Phaser 战斗表现）、art（程序绘制角色）
src/ui       app（DOM 界面、拖动、面板、引导）、icons（SVG）、audio（WebAudio）、style.css
sim          平衡模拟机器人与报告
tests        Vitest 测试
```

## 桌面客户端（Windows）

**打包**（在 Linux/macOS/Windows 均可，Linux 下无需 wine）：
```bash
npm install
npm run dist:win     # 产物在 release/desktop/
npm run desktop      # 本机直接以 Electron 窗口运行
xvfb-run -a node scripts/desktop_smoke.mjs   # 无头冒烟，截图到 art/screenshots/desktop_*.png
```
产物：
- `BackpackMiser-Setup-3.0.0.exe`：NSIS 安装包，可选安装目录、桌面快捷方式（可勾选）、开始菜单、控制面板卸载。无需管理员权限（默认装到 `%LOCALAPPDATA%\Programs\BackpackMiser`）。
- `BackpackMiser-3.0.0-portable.exe`：免安装单文件，双击即玩（首次启动需解压，稍慢）。
- `BackpackMiser-3.0.0-win-x64.zip`：解压后运行 `背包守财奴.exe`。

**操作**：默认 1280×800 窗口，可缩放；F11 全屏切换；无菜单栏，发行版禁用开发者工具。

**存档位置**：`%APPDATA%\背包守财奴\Partitions\backpack-miser\Local Storage`（Electron localStorage，固定 partition）。关闭重开不丢档；卸载不会删除存档。便携版与安装版共用同一存档。

**SmartScreen 提示**：程序未做代码签名，首次运行 Windows 可能提示「Windows 已保护你的电脑」，点 **更多信息 → 仍要运行** 即可。

技术说明：Electron 45 + electron-builder（portable/zip），安装包由 `scripts/make_nsis.cjs` 调用原生 makensis 生成（`build/installer.nsi`）。网页版/Pages 构建不受影响（`npm run build`）。
