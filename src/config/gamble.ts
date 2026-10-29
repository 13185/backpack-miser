/** 掷骰落在 [0,1)。先比 success，再比 success+loseOne，其余是两件都消失。 */
export interface GambleOdds {
  success: number;
  loseOne: number;
  loseBoth: number;
}

/** 两件相同 Lv3。成功留下一件 Lv4；失败只删拖来的那一件。 */
export const LV4_GAMBLE = { success: 0.5, loseOne: 0.5, loseBoth: 0 } as const satisfies GambleOdds;

/**
 * 两件相同 Lv4 → 一件 Lv5。三项之和为 1。
 * 成功 35%，只丢拖来的那一件 40%，两件都消失 25%。
 */
export const LV5_GAMBLE = { success: 0.35, loseOne: 0.40, loseBoth: 0.25 } as const satisfies GambleOdds;

export type GambleResult = 'success' | 'loseOne' | 'loseBoth';

export function gambleOutcome(roll: number, odds: GambleOdds): GambleResult {
  if (roll < odds.success) return 'success';
  if (roll < odds.success + odds.loseOne) return 'loseOne';
  return 'loseBoth';
}

export function gamblePct(n: number): number {
  return Math.round(n * 100);
}
