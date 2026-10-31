# V4 需求矩阵（3.7.0）

状态：已实现 = 代码在；已验证 = 本次 `npm test` 覆盖到行为。未跑浏览器长流程的标为未验证。

| 需求 | 代码 | 状态 |
|---|---|---|
| 主手、护甲、备用箱 | `src/systems/game.ts` 的 equip / reserve；`itemPlace` | 已验证：主手只有一个演员，备用不进战斗，护甲穿上才有抗性 |
| 6×6 硬顶 | `ECONOMY.expansions` | 保持 3.6.5 规则，未按规格 §15 放大 |
| 元素表、60% 转换 | `src/config/v4/elements.ts` | 已验证公式例子 |
| 火抗与火输出分开 | 护甲只写 `playerResist`，武器只写 `element` | 已实现。没有角色倾向惩罚 |
| 寻装 | `src/systems/gearTrial.ts`，`startGearTrial` / `settleGearTrial` | 已验证：不改主线生命和金币 |
| 熔炉循环 | `furnaceCycle`，第 35 关去掉旧 overheat | 已验证：第三次普攻后出现预警；散热时护甲为 0 |
| 战术防御 | `activateGuard` | 已实现。自动在重击剩余 ≤1 秒时开。浏览器手点未做完整记录 |
| 十个 Boss 抗性 | `src/config/v4/bosses.ts`，`getLevel` 挂上 | 已实现。5、10 关没有元素考核 |
| 第 11 关旅行衬甲 | `maybeGrantV4Lesson` | 已实现，由准备界面触发，不在无界面的开战里塞进临时区 |
| 两套整备方案 | `saveLoadout` / `applyLoadout` | 已验证：卖掉引用后提示失效，不生成替身 |
| 不同元素合成选择 | 详情拖放确认，默认留下主装备 | 已验证：成功留下所选元素；赌输时主装备元素不变 |
| 1–3 级衬甲进商店 | `rollShop` 用独立随机流加一格，等级不超过 3 | 已验证。四五级不进这格 |
| 商店 60/8 元素词条 | 无 | 未实现 |
| 100 种子五种策略 | 无 | 未跑，不写到达率 |
