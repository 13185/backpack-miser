/** V2 20关预算骨架（HP/伤害为规格初始值，待模拟校准） */
export interface StageBudget {
  level: number;
  chapter: 1 | 2 | 3 | 4;
  hp: number;
  damage: number;
  interval: number;
  gold: number;
  boss?: boolean;
  eliteChoice?: boolean;
}
export const V2_STAGES: StageBudget[] = [
  { level: 1, chapter: 1, hp: 60, damage: 6, interval: 2.5, gold: 10 },
  { level: 2, chapter: 1, hp: 85, damage: 7, interval: 2.5, gold: 12 },
  { level: 3, chapter: 1, hp: 105, damage: 8, interval: 2.5, gold: 14, eliteChoice: true },
  { level: 4, chapter: 1, hp: 130, damage: 9, interval: 2.5, gold: 16 },
  { level: 5, chapter: 1, hp: 200, damage: 11, interval: 2.8, gold: 24, boss: true },
  { level: 6, chapter: 2, hp: 170, damage: 10, interval: 2.5, gold: 18 },
  { level: 7, chapter: 2, hp: 190, damage: 11, interval: 2.5, gold: 20 },
  { level: 8, chapter: 2, hp: 220, damage: 12, interval: 2.5, gold: 22, eliteChoice: true },
  { level: 9, chapter: 2, hp: 245, damage: 13, interval: 2.5, gold: 24 },
  { level: 10, chapter: 2, hp: 380, damage: 15, interval: 2.8, gold: 34, boss: true },
  { level: 11, chapter: 3, hp: 290, damage: 14, interval: 2.5, gold: 26 },
  { level: 12, chapter: 3, hp: 330, damage: 15, interval: 2.5, gold: 28 },
  { level: 13, chapter: 3, hp: 370, damage: 16, interval: 2.5, gold: 30, eliteChoice: true },
  { level: 14, chapter: 3, hp: 410, damage: 17, interval: 2.5, gold: 32 },
  { level: 15, chapter: 3, hp: 650, damage: 19, interval: 2.8, gold: 44, boss: true },
  { level: 16, chapter: 4, hp: 460, damage: 18, interval: 2.5, gold: 34 },
  { level: 17, chapter: 4, hp: 520, damage: 19, interval: 2.5, gold: 36 },
  { level: 18, chapter: 4, hp: 580, damage: 20, interval: 2.5, gold: 38, eliteChoice: true },
  { level: 19, chapter: 4, hp: 650, damage: 22, interval: 2.5, gold: 40 },
  { level: 20, chapter: 4, hp: 1050, damage: 25, interval: 2.8, gold: 60, boss: true },
];
export const V2_CHAPTER_NAMES = ['贪婪矿洞', '铁锈牢城', '幽毒巢穴', '黄金王库'] as const;
