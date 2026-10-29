export interface BagExpansion {
  cost: number;
  axis: 'row' | 'col';
  /** 击败该关首领后才可购买；0 表示开局即可买 */
  unlockAfterLevel: number;
}

export const ECONOMY = {
  startHp: 100, startGold: 13, startCols: 5, startRows: 4,
  /**
   * 5×4 起。前两次开局就能买（各加一行 → 5×6）。
   * 之后每击败一个章节首领（10/20/30/40）解锁一次购买：列、行、列、行，终点 7×8。
   */
  expansions: [
    { cost: 32, axis: 'row', unlockAfterLevel: 0 },
    { cost: 52, axis: 'row', unlockAfterLevel: 0 },
    { cost: 80, axis: 'col', unlockAfterLevel: 10 },
    { cost: 120, axis: 'row', unlockAfterLevel: 20 },
    { cost: 170, axis: 'col', unlockAfterLevel: 30 },
    { cost: 230, axis: 'row', unlockAfterLevel: 40 },
  ] as const satisfies readonly BagExpansion[],
  refreshBase: 4, refreshStep: 2,
  lvl2Mult: 2.25, lvl3Mult: 5.2, sellRate: 0.38,
  winGold: (level: number) => 9 + (level - 1) * 2,
  healAfterWin: 0.07,
  shieldCapRate: 0.35, potionThreshold: 0.4,
  enrageAt: 33, enrageStep: 3, enrageBonus: 0.32, timeout: 78,
  bossHasteRate: 0.62,
  /** 战利品/商店中二级装备出现概率（按关卡） */
  lvl2Chance: (level: number) => (level <= 2 ? 0 : level <= 5 ? 0.18 : 0.35),
};
