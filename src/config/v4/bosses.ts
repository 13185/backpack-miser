import { ELEMENT_NAME, type Element } from './elements';

export interface BossElements {
  element?: Element;
  /** 该 Boss 对各攻击元素的抗性。未写的是 0。 */
  resist: Partial<Record<Element, number>>;
  /** 普攻里无属性占比。元素 Boss 默认 0.6。 */
  plainShare: number;
  heavyPlainShare: number;
  furnaceCycle?: boolean;
  /** 黄金心脏三阶段：金 / 水 / 火。 */
  phases?: { element: Element; resist: Partial<Record<Element, number>> }[];
}

/** 关键技能之后，本场怪物出手伤害再乘一次。叠乘，不改成累加。 */
export const SKILL_RAMP_STEP = 0.05;
/** 第 15 关起，有关键技能的首领每隔这么久施放一次。 */
export const ELEMENT_SKILL_EVERY_MS = 12000;
/** 大海无量对玩家武器下一次出手的推迟。 */
export const WATER_SUPPRESS_MS = 800;

export const ELEMENT_SKILLS = {
  wood: { name: '回血大招', healPct: 0.08 },
  fire: { name: '流星火雨', hits: 3, atkMult: 0.9 },
  water: { name: '大海无量', atkMult: 1.7 },
  metal: { name: '金碧辉煌', atkMult: 2.1 },
} as const;

export function elementSkill(element: Element | null | undefined) {
  if (!element || element === 'earth') return null;
  return { element, ...ELEMENT_SKILLS[element] };
}

/** 战前预告。土只复述既有抗性，不另起一套技能。 */
export function bossSkillLine(level: number): string | null {
  const row = bossElements(level);
  if (!row?.element || level < 15) return null;
  const ramp = `每次施放后，本场怪物伤害再 ×${1 + SKILL_RAMP_STEP}（叠乘）`;
  if (row.phases) return `开场金抗，技能金碧辉煌。阶段会改成大海无量、流星火雨。${ramp}。`;
  if (row.element === 'earth') return '元素：土。土抗沿用既有表，没有额外关键技能。';
  const name = row.element === 'wood' ? '木' : row.element === 'fire' ? '火' : row.element === 'water' ? '水' : '金';
  return `元素：${name}。${name}抗。技能：${ELEMENT_SKILLS[row.element].name}。${ramp}。`;
}

/** 有主属性的首领显示名后缀。第 5、10 关和第 50 关以外的非阶段首领各一个字；黄金心脏三阶段合成一个括号。 */
export function bossElementMark(level: number): string {
  const row = bossElements(level);
  if (!row?.element) return '';
  const chars = row.phases?.length
    ? row.phases.map(p => ELEMENT_NAME[p.element]).join('')
    : ELEMENT_NAME[row.element];
  return `（${chars}）`;
}

/** 只在该关 bossElements 有主属性时追加后缀。非首领、第 5、10 关原样返回。 */
export function withBossElement(level: number, title: string): string {
  const mark = bossElementMark(level);
  if (!mark || title.includes(mark)) return title;
  return title + mark;
}

/** 第 5、10 关不考核元素。15 关起用规格表，不另乘一套抗性。 */
export function bossElements(level: number): BossElements | null {
  switch (level) {
    case 15: return { element: 'wood', resist: { wood: 40, metal: -15, fire: -10 }, plainShare: 0.6, heavyPlainShare: 0.2 };
    case 20: return { element: 'metal', resist: { metal: 40, fire: -15 }, plainShare: 0.6, heavyPlainShare: 0.2 };
    case 25: return { element: 'water', resist: { water: 50, earth: -15 }, plainShare: 0.6, heavyPlainShare: 0.2 };
    case 30: return { element: 'earth', resist: { earth: 50, wood: -15 }, plainShare: 0.6, heavyPlainShare: 0.2 };
    case 35: return { element: 'fire', resist: { fire: 60, water: -20 }, plainShare: 0.6, heavyPlainShare: 0.2, furnaceCycle: true };
    case 40: return { element: 'metal', resist: { metal: 50, fire: -15 }, plainShare: 0.6, heavyPlainShare: 0.2 };
    case 45: return { element: 'wood', resist: { wood: 50, metal: -15, fire: -10 }, plainShare: 0.6, heavyPlainShare: 0.2 };
    case 50: return {
      element: 'metal',
      resist: { metal: 50, fire: -15 },
      plainShare: 0.6,
      heavyPlainShare: 0.2,
      phases: [
        { element: 'metal', resist: { metal: 50, fire: -15 } },
        { element: 'water', resist: { water: 50, earth: -15 } },
        { element: 'fire', resist: { fire: 50, water: -15 } },
      ],
    };
    default: return null;
  }
}
