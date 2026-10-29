export const BALANCE_VERSION = '3.6.9-band4346';
export const FORGE_SAFE_COST = 60;
export const FORGE_RISK_UNLOCK = 12;
export const FORGE_LEGEND_UNLOCK = 25;
export const FORGE_VOUCHER_LEVELS = [12, 25, 35] as const;

export function winHealAmount(maxHp: number, boss: boolean): number {
  if (boss) return Math.max(10, Math.floor(maxHp * 0.18));
  return Math.max(8, Math.floor(maxHp * 0.14));
}

/** 后期扩容三选一。种类可以混，必须在背包里。 */
export type ItemSacrifice = { lv3: 4 } | { lv4: 2 } | { lv5: 1 };

export interface BagExpansion {
  /** 金币价。有 itemCost 时为 0，不能用金币买。 */
  cost: number;
  axis: 'row' | 'col';
  /** 击败该关首领后才可购买；0 表示开局即可买 */
  unlockAfterLevel: number;
  /** 玩家从这几档里选一档献祭，不能改用金币。 */
  itemCost?: readonly ItemSacrifice[];
}

export const ITEM_SACRIFICES: readonly ItemSacrifice[] = [
  { lv3: 4 },
  { lv4: 2 },
  { lv5: 1 },
];

/** 背包硬顶。超过的旧档在读档时收成这个尺寸，多出来的装备进临时区，不删。 */
export const BAG_MAX_COLS = 6;
export const BAG_MAX_ROWS = 6;

export const ECONOMY = {
  startHp: 100, startGold: 13, startCols: 5, startRows: 4,
  /**
   * 5×4 起，三次扩容到 6×6，没有第 7 行。
   * 前两次用金币加行：通关 3 → 5×5，通关 7 → 5×6。
   * 通关 17 后，用原先换第 7 行的献祭换第 6 列（4×Lv3 或 2×Lv4 或 1×Lv5）。不能改用金币，也不能再扩。
   */
  expansions: [
    { cost: 28, axis: 'row', unlockAfterLevel: 3 },
    { cost: 42, axis: 'row', unlockAfterLevel: 7 },
    { cost: 0, axis: 'col', unlockAfterLevel: 17, itemCost: ITEM_SACRIFICES },
  ] as const satisfies readonly BagExpansion[],
  refreshBase: 4, refreshStep: 2,
  lvl2Mult: 2.25, lvl3Mult: 5.2, sellRate: 0.38,
  winGold: (level: number) => 9 + (level - 1) * 2,
  /** 普通胜利 max(8, 14%)；Boss 胜利 max(10, 18%)。赢下来的人带得走下一关的第一击，补不满。 */
  healAfterWin: 0.14,
  bossHealRate: 0.18,
  bossHealFlat: 10,
  winHealFlat: 8,
  /** 附录 A08：护盾上限 50%（坚守专精 60%） */
  shieldCapRate: 0.5, potionThreshold: 0.4,
  /** 45 秒狂暴，每 5 秒 +10 个百分点，90 秒超时 */
  enrageAt: 45, enrageStep: 5, enrageBonus: 0.10, timeout: 90,
  bossHasteRate: 0.62,
  /** 战利品/商店中二级装备出现概率（按关卡） */
  lvl2Chance: (level: number) => (level <= 2 ? 0 : level <= 5 ? 0.18 : 0.35),
};
