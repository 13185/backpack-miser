import type { MonsterKind } from './monsters';
export interface LevelDef { monster: MonsterKind; title: string; hp: number; atk: number; interval: number; armor?: number; boss?: boolean; }
/** 固定关卡配置（经 sim/balance.ts 模拟校准） */
export const LEVELS: LevelDef[] = [
  { monster: 'slime', title: '史莱姆', hp: 60, atk: 5, interval: 1.5 },
  { monster: 'bat', title: '洞穴蝙蝠', hp: 70, atk: 3, interval: 0.8 },
  { monster: 'skeleton', title: '骷髅卫士', hp: 160, atk: 8, interval: 1.5, armor: 2 },
  { monster: 'slime', title: '大史莱姆', hp: 260, atk: 11, interval: 1.6 },
  { monster: 'brute', title: '地牢蛮兵', hp: 320, atk: 28, interval: 3 },
  { monster: 'skeleton', title: '骷髅重卫', hp: 420, atk: 14, interval: 1.5, armor: 3 },
  { monster: 'bat', title: '吸血蝠群', hp: 460, atk: 9, interval: 0.7 },
  { monster: 'brute', title: '蛮兵队长', hp: 680, atk: 36, interval: 2.8 },
  { monster: 'skeleton', title: '骷髅将军', hp: 760, atk: 20, interval: 1.4, armor: 4 },
  { monster: 'mimic', title: '黄金宝箱怪', hp: 1400, atk: 24, interval: 1.5, boss: true },
];
