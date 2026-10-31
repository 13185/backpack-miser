import type { LevelDef } from '../config/levels';
import { getLevel } from '../config/v3/levels';
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

/**
 * 寻找套装用本章首领预算做一份独立训练，不读取当前主线关的敌人。
 * 生命约为主线首领的 65%，攻击约 55%，抗性不超过 20。
 */
export function gearTrialLevel(chapter: number, levelNo: number): LevelDef {
  const bossLv = BOSS_LEVEL[chapter] ?? 15;
  const boss = getLevel(bossLv);
  const info = chapterBossElement(chapter);
  const enemy = trialEnemy(boss.hp, boss.atk, info?.element ?? null);
  return {
    monster: 'slime',
    title: '寻找套装训练',
    level: levelNo,
    hp: enemy.hp,
    atk: enemy.atk,
    interval: 2.2,
    boss: false,
    chapter,
    resist: enemy.resist,
    bossElement: enemy.element ?? undefined,
    plainShare: 0.6,
    heavyPlainShare: 0.2,
    mechSummary: '训练委托。胜负不推进主线，不发主线金币。',
  };
}

/** 训练敌人：给定预算的大约 65% 生命、55% 攻击，抗性不超过 20。 */
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
