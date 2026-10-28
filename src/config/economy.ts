export const ECONOMY = {
  startHp: 100, startGold: 20, startCols: 5, startRows: 4,
  expansions: [30, 50], // 两次扩容价格，各加一行
  refreshBase: 3, refreshStep: 2,
  lvl2Mult: 2.4, lvl3Mult: 5.5, sellRate: 0.4,
  winGold: (level: number) => 10 + (level - 1) * 2,
  healAfterWin: 0.15,
  shieldCapRate: 0.5, potionThreshold: 0.4,
  enrageAt: 45, enrageStep: 5, enrageBonus: 0.25, timeout: 90,
  bossHasteRate: 0.8,
  /** 战利品/商店中二级装备出现概率（按关卡） */
  lvl2Chance: (level: number) => (level <= 2 ? 0 : level <= 5 ? 0.2 : 0.4),
};
