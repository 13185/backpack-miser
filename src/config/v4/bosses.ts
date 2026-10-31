import type { Element } from './elements';

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
