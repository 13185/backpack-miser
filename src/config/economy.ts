export const ECONOMY = {
  startHp: 100, startGold: 12, startCols: 5, startRows: 4,
  expansions: [32, 52], // 两次扩容价格，各加一行（3.2 加压）
  refreshBase: 4, refreshStep: 2,
  lvl2Mult: 2.25, lvl3Mult: 5.2, sellRate: 0.38,
  winGold: (level: number) => 9 + (level - 1) * 2,
  healAfterWin: 0.05,
  shieldCapRate: 0.35, potionThreshold: 0.4,
  enrageAt: 30, enrageStep: 3, enrageBonus: 0.32, timeout: 72,
  bossHasteRate: 0.62,
  /** 战利品/商店中二级装备出现概率（按关卡） */
  lvl2Chance: (level: number) => (level <= 2 ? 0 : level <= 5 ? 0.18 : 0.35),
};
