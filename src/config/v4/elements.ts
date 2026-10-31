/** 金木水火土。无属性不是第六种可刷元素。 */
export type Element = 'metal' | 'wood' | 'water' | 'fire' | 'earth';
export const ELEMENTS: Element[] = ['metal', 'wood', 'water', 'fire', 'earth'];
export const ELEMENT_NAME: Record<Element, string> = {
  metal: '金', wood: '木', water: '水', fire: '火', earth: '土',
};

/** 攻击元素对目标主属性的抗性。正数减伤，负数易伤。木对火额外 -10。 */
export const ELEMENT_MATRIX: Record<Element, Record<Element, number>> = {
  metal: { metal: 60, wood: -20, water: 0, fire: 0, earth: 0 },
  wood: { metal: 0, wood: 60, water: 0, fire: 0, earth: -20 },
  water: { metal: 0, wood: 0, water: 60, fire: -20, earth: 0 },
  fire: { metal: -20, wood: -10, water: 0, fire: 60, earth: 0 },
  earth: { metal: 0, wood: 0, water: -20, fire: 0, earth: 60 },
};

export function clampResist(n: number): number {
  return Math.max(-20, Math.min(60, n));
}

export function resistCoeff(resist: number): number {
  return 1 - clampResist(resist) / 100;
}

/**
 * 抗性前伤害 P 已扣过一次护甲。无属性整段保留。
 * 元素武器是 60% 转换，不是在 P 之外再加 60%。
 * 分量各自不保底，最终非零命中才取整并至少 1。
 */
export function splitDirect(p: number, element: Element | null | undefined, resist: number): { total: number; water: number; plain: number; elem: number } {
  if (p <= 0) return { total: 0, water: 0, plain: 0, elem: 0 };
  if (!element) return { total: p, water: 0, plain: p, elem: 0 };
  const plain = 0.4 * p;
  const elem = 0.6 * p * resistCoeff(resist);
  const total = Math.max(1, Math.round(plain + elem));
  const water = element === 'water' && plain + elem > 0 ? Math.round(total * (elem / (plain + elem))) : 0;
  return { total, water, plain, elem };
}

/** 怪物打玩家：plainShare 是无属性占比，其余是主元素。抗性 0 时合计仍等于 P。 */
export function splitIncoming(p: number, element: Element | null | undefined, plainShare: number, resist: number, guarding: boolean): number {
  if (p <= 0) return 0;
  let total = p;
  if (element) {
    const plain = p * plainShare;
    const elem = p * (1 - plainShare) * resistCoeff(resist);
    total = Math.max(1, Math.round(plain + elem));
  }
  if (guarding) total = Math.max(1, Math.floor(total * 0.6));
  return total;
}

export function emptyResist(): Record<Element, number> {
  return { metal: 0, wood: 0, water: 0, fire: 0, earth: 0 };
}
