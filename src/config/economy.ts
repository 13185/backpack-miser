export const BALANCE_VERSION = '3.4.0-think';
export const FORGE_SAFE_COST = 60;
export const FORGE_RISK_UNLOCK = 12;
export const FORGE_LEGEND_UNLOCK = 25;
export const FORGE_VOUCHER_LEVELS = [12, 25, 35] as const;

export function winHealAmount(maxHp: number, boss: boolean): number {
  if (boss) return Math.max(8, Math.floor(maxHp * 0.12));
  return Math.max(6, Math.floor(maxHp * 0.08));
}

export interface BagExpansion {
  cost: number;
  axis: 'row' | 'col';
  /** 击败该关首领后才可购买；0 表示开局即可买 */
  unlockAfterLevel: number;
}

export const ECONOMY = {
  startHp: 100, startGold: 13, startCols: 5, startRows: 4,
  /**
   * 附录 A06。5×4 起，通关后按顺序购买，终点 7×8。解锁不强迫购买。
   */
  expansions: [
    { cost: 20, axis: 'row', unlockAfterLevel: 3 },
    { cost: 30, axis: 'row', unlockAfterLevel: 7 },
    { cost: 45, axis: 'col', unlockAfterLevel: 12 },
    { cost: 60, axis: 'row', unlockAfterLevel: 17 },
    { cost: 80, axis: 'col', unlockAfterLevel: 24 },
    { cost: 100, axis: 'row', unlockAfterLevel: 32 },
  ] as const satisfies readonly BagExpansion[],
  refreshBase: 4, refreshStep: 2,
  lvl2Mult: 2.25, lvl3Mult: 5.2, sellRate: 0.38,
  winGold: (level: number) => 9 + (level - 1) * 2,
  /** 普通胜利 max(6, 8%)；Boss 胜利 max(8, 12%)。够吃下下一关的第一击，补不满。 */
  healAfterWin: 0.08,
  bossHealRate: 0.12,
  bossHealFlat: 8,
  winHealFlat: 6,
  /** 附录 A08：护盾上限 50%（坚守专精 60%） */
  shieldCapRate: 0.5, potionThreshold: 0.4,
  /** 45 秒狂暴，每 5 秒 +10 个百分点，90 秒超时 */
  enrageAt: 45, enrageStep: 5, enrageBonus: 0.10, timeout: 90,
  bossHasteRate: 0.62,
  /** 战利品/商店中二级装备出现概率（按关卡） */
  lvl2Chance: (level: number) => (level <= 2 ? 0 : level <= 5 ? 0.18 : 0.35),
};
