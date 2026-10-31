import type { Element } from '../config/v4/elements';
import { bossElements } from '../config/v4/bosses';
import type { GameState } from '../models/types';

export interface GearTrialDef {
  id: string;
  kind: 'guard' | 'counter' | 'special';
  claimed: boolean;
  ready: boolean;
}

const BOSS_LEVEL: Record<number, number> = { 3: 15, 4: 20, 5: 25, 6: 30, 7: 35, 8: 40, 9: 45, 10: 50 };

export function chapterBossElement(chapter: number): { element: Element; weakness: Element } | null {
  const profile = bossElements(BOSS_LEVEL[chapter] ?? 0);
  if (!profile?.element) return null;
  const weak = (Object.entries(profile.resist) as [Element, number][])
    .filter(([, n]) => n < 0)
    .sort((a, b) => a[1] - b[1])[0];
  return { element: profile.element, weakness: weak?.[0] ?? 'water' };
}

export function ensureGearTrials(s: GameState) {
  const ch = s.currentChapter;
  if (ch < 3 || ch > 10) return;
  if (s.gearTrials?.chapter === ch) return;
  s.gearTrials = {
    chapter: ch,
    trials: (['guard', 'counter', 'special'] as const).map(kind => ({
      id: `c${ch}-${kind}`, kind, claimed: false, ready: false,
    })),
  };
}

/** 寻装敌人：本章普通预算的大约 65% 生命、55% 攻击，抗性不超过 20。 */
export function trialEnemy(levelHp: number, levelAtk: number, element: Element | null) {
  const cap = (n: number) => Math.max(-20, Math.min(20, n));
  const resist: Partial<Record<Element, number>> = {};
  if (element) resist[element] = cap(40);
  return {
    hp: Math.max(20, Math.floor(levelHp * 0.65)),
    atk: Math.max(1, Math.floor(levelAtk * 0.55)),
    resist,
    element,
  };
}
