import type { MonsterKind } from './monsters';

/** 机制标签（战斗层读取） */
export interface EchoMech { every: number; delayMs: number; pct: number }
export interface OverheatMech { every: number; mult: number; pauseMs: number }
export interface PrayMech { intervalMs: number; shield: number }
export interface HeartPhasesMech { enabled: true }
/** 每第 N 次攻击为倍率重击；蓄力替代该次普攻 */
export interface HeavyStrikeMech { every: number; mult: number; windupMs: number; armorBreakMs?: number }
/** 生命首次低于阈值时获得护盾（按顺序处理） */
export interface PhaseShieldMech { thresholds: number[]; shield: number }
/** 定时召唤弱单位（占主怪最大生命比例） */
export interface SummonMech { atSec: number[]; hpPct: number; maxAlive: number; name?: string }

export interface LevelDef {
  monster: MonsterKind;
  title: string;
  /** 战役关卡号。缺省时狂暴仍用全局 45 秒。 */
  level?: number;
  hp: number;
  atk: number;
  interval: number;
  armor?: number;
  boss?: boolean;
  chapter?: number;
  tideCycle?: boolean;
  echo?: EchoMech;
  overheat?: OverheatMech;
  pray?: PrayMech;
  heartPhases?: HeartPhasesMech;
  heavyStrike?: HeavyStrikeMech;
  phaseShields?: PhaseShieldMech;
  summons?: SummonMech;
  /** 双体：生命预算对半拆成主目标+twin，须全灭才算胜利 */
  dualUnits?: boolean;
  /** 祝祷者占生命预算比例（默认 boss 0.2 / 普通 0.3） */
  prayShare?: number;
  /** 开场将最大生命的该百分比转为怪物护盾 */
  openMShieldPct?: number;
  /** 周期性自我治疗 */
  regen?: { intervalMs: number; amount: number };
  /** 战前机制摘要（UI） */
  mechSummary?: string;
}

export const LEVELS: LevelDef[] = [
  { monster: 'slime', title: '史莱姆', hp: 60, atk: 5, interval: 1.5, chapter: 1 },
  { monster: 'bat', title: '洞穴蝙蝠', hp: 70, atk: 3, interval: 0.8, chapter: 1 },
  { monster: 'skeleton', title: '骷髅卫士', hp: 160, atk: 8, interval: 1.5, armor: 2, chapter: 1 },
  { monster: 'slime', title: '大史莱姆', hp: 260, atk: 11, interval: 1.6, chapter: 1 },
  { monster: 'brute', title: '地牢蛮兵', hp: 320, atk: 28, interval: 3, chapter: 1 },
  { monster: 'skeleton', title: '骷髅重卫', hp: 420, atk: 14, interval: 1.5, armor: 3, chapter: 2 },
  { monster: 'bat', title: '吸血蝠群', hp: 460, atk: 9, interval: 0.7, chapter: 2 },
  { monster: 'brute', title: '蛮兵队长', hp: 680, atk: 36, interval: 2.8, chapter: 2 },
  { monster: 'skeleton', title: '骷髅将军', hp: 760, atk: 20, interval: 1.4, armor: 4, chapter: 2 },
  { monster: 'mimic', title: '黄金宝箱怪', hp: 1400, atk: 24, interval: 1.5, boss: true, chapter: 1 },
];
