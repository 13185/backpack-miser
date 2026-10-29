import type { ItemKind } from '../models/types';
export interface ItemDef {
  kind: ItemKind; name: string; w: number; h: number; rotatable: boolean;
  category: 'weapon' | 'shield' | 'potion' | 'gem' | 'bag' | 'passive' | 'heal' | 'economy' | 'needle' | 'control' | 'support';
  values: [number, number, number, number, number];
  interval?: number;
  price: number;
  desc: (v: number) => string;
  color: string;
  /** 加入战利品/商店池的最低关卡；默认 1 */
  unlockLevel?: number;
  /** 每场最大触发次数（折叠铁壁/旅行灯） */
  maxTriggers?: number;
}
/**
 * 四级、五级。武器默认 floor(Lv3×1.70) / floor(Lv3×2.40)。
 * 表内数字来自附录 A08；Lv1–3 不动。商店不卖四五级。
 */
function v5(v: [number, number, number], lv4?: number, lv5?: number): [number, number, number, number, number] {
  const a = lv4 ?? (v[2] <= 0 ? 0 : Math.floor(v[2] * 1.70));
  const b = lv5 ?? (v[2] <= 0 ? 0 : Math.floor(v[2] * 2.40));
  return [v[0], v[1], v[2], a, b];
}
export const ITEMS: Record<ItemKind, ItemDef> = {
  dagger: { kind: 'dagger', name: '匕首', w: 1, h: 2, rotatable: true, category: 'weapon', values: v5([5, 7, 11]), interval: 0.8, price: 8, color: '#9fd3ff',
    desc: v => `每0.8秒攻击一次，造成${v}点伤害。出手频繁（同种≥3把时有收益衰减）。` },
  greatsword: { kind: 'greatsword', name: '大剑', w: 1, h: 3, rotatable: true, category: 'weapon', values: v5([15, 27, 48]), interval: 2, price: 12, color: '#ffb36b',
    desc: v => `每2秒重劈一次，造成${v}点伤害。单次伤害高。` },
  shield: { kind: 'shield', name: '盾牌', w: 2, h: 2, rotatable: false, category: 'shield', values: v5([5, 8, 14]), interval: 3.3, price: 10, color: '#8fe3a7',
    desc: v => `每3.3秒获得${v}点护盾。护盾先于生命抵挡伤害，总护盾上限为最大生命的50%。吉利达织造坊出品。` },
  potion: { kind: 'potion', name: '药水', w: 1, h: 1, rotatable: false, category: 'potion', values: v5([13, 22, 34]), price: 8, color: '#ff7fa8',
    desc: v => `生命不高于40%时自动饮用，恢复${v}点生命。每场战斗一次，战后自动充能。` },
  ruby: { kind: 'ruby', name: '红宝石', w: 1, h: 1, rotatable: false, category: 'gem', values: v5([15, 25, 40], 48, 56), price: 10, color: '#ff5d6c',
    desc: v => `让上下左右紧贴的武器伤害+${v}%（对角无效，总加成最高100%）。` },
  moneybag: { kind: 'moneybag', name: '钱袋', w: 1, h: 1, rotatable: false, category: 'bag', values: v5([2, 5, 8], 10, 12), price: 13, color: '#ffd45c',
    desc: v => `开战时在背包中，胜利后额外获得${v}金币。失败无收益。吉利达织造坊出品。` },
  spear: {
    kind: 'spear', name: '贯阵长矛', w: 1, h: 4, rotatable: true, category: 'weapon',
    values: v5([12, 22, 39]), interval: 1.8, price: 15, color: '#c8e6ff', unlockLevel: 21,
    desc: v => `每1.8秒突刺，造成${v}点伤害（单目标；多目标溅射待扩展）。`,
  },
  compass: {
    kind: 'compass', name: '引路罗盘', w: 1, h: 1, rotatable: false, category: 'passive',
    values: v5([1, 2, 3], 4, 5), price: 12, color: '#a8d8ff', unlockLevel: 26,
    desc: v => `开战前8秒，使当前目标护甲降低${v}点（同类取最高）。`,
  },
  firework_crossbow: {
    kind: 'firework_crossbow', name: '烟火弩', w: 2, h: 3, rotatable: true, category: 'weapon',
    values: v5([14, 25, 44]), interval: 3.2, price: 18, color: '#ff9a6b', unlockLevel: 31,
    desc: v => `每3.2秒齐射，对全部存活敌人造成${v}点（当前单目标=全额）。`,
  },
  fold_wall: {
    kind: 'fold_wall', name: '折叠铁壁', w: 1, h: 3, rotatable: true, category: 'shield',
    values: v5([9, 16, 27], 45, 64), interval: 4, price: 12, color: '#9ab0c8', unlockLevel: 36, maxTriggers: 2,
    desc: v => `每4秒生成${v}点护盾，每场最多2次。`,
  },
  travel_lamp: {
    kind: 'travel_lamp', name: '旅行灯', w: 2, h: 2, rotatable: false, category: 'heal',
    values: v5([3, 5, 8], 11, 14), interval: 8, price: 14, color: '#ffe08a', unlockLevel: 41, maxTriggers: 3,
    desc: v => `每8秒恢复${v}点生命，每场最多3次；不属于药水。`,
  },
  emergency_ledger: {
    kind: 'emergency_ledger', name: '救急账匣', w: 1, h: 1, rotatable: false, category: 'economy',
    values: v5([4, 7, 11], 13, 15), price: 12, color: '#e8d4a8', unlockLevel: 46,
    desc: v => `开战金币<30时，胜利额外获得${v}金币；同类仅最高级生效。`,
  },
  crossbow: {
    kind: 'crossbow', name: '连弩', w: 2, h: 2, rotatable: true, category: 'weapon',
    values: v5([4, 7, 12]), interval: 1.6, price: 14, color: '#8ec8ff', unlockLevel: 6,
    desc: v => `每1.6秒连射2箭，每箭${v}点（一轮计1次常规触发）。`,
  },
  chain_hammer: {
    kind: 'chain_hammer', name: '链锤', w: 2, h: 2, rotatable: true, category: 'weapon',
    values: v5([12, 22, 38]), interval: 2.4, price: 14, color: '#c9a06b', unlockLevel: 8,
    desc: v => `每2.4秒砸击，主目标${v}点；对下一存活目标溅射50%。`,
  },
  warhammer: {
    kind: 'warhammer', name: '战锤', w: 2, h: 3, rotatable: true, category: 'weapon',
    values: v5([26, 46, 80]), interval: 3.0, price: 18, color: '#a09080', unlockLevel: 11,
    desc: v => `每3秒猛击${v}点，忽略50%有效护甲。`,
  },
  ice_crystal: {
    kind: 'ice_crystal', name: '冰晶', w: 1, h: 2, rotatable: true, category: 'control',
    values: v5([20, 25, 30], 33, 36), interval: 6.0, price: 12, color: '#a8e8ff', unlockLevel: 9,
    desc: v => `每6秒使敌人攻击间隔延长${v}%（全体），持续3秒；到期可触发潮汐瓶。`,
  },
  war_banner: {
    kind: 'war_banner', name: '战旗', w: 1, h: 2, rotatable: true, category: 'support',
    values: v5([6, 10, 15], 18, 21), price: 12, color: '#e8b060', unlockLevel: 7,
    desc: v => `邻接武器攻击间隔缩短${v}%（受总缩短上限约束）。`,
  },
  burden: {
    kind: 'burden', name: '债契负担', w: 1, h: 1, rotatable: false, category: 'passive',
    values: v5([0, 0, 0]), price: 0, color: '#6a5060', unlockLevel: 99,
    desc: () => '事件负担物：不可出售/合成/丢入临时区；可在营地或特定事件移除。',
  },
  luck_charm: {
    kind: 'luck_charm', name: '吉利达幸运符', w: 1, h: 1, rotatable: false, category: 'support',
    values: v5([6, 6, 6], 6, 6), price: 20, color: '#7af0ff', maxTriggers: 1,
    desc: () => '每场战斗，盾牌或折叠铁壁第一次实际增加护盾时，额外+6点护盾（仍受护盾上限）。不可合成。吉利达织造坊出品。',
  },
  poison_needle: {
    kind: 'poison_needle', name: '毒针', w: 1, h: 2, rotatable: true, category: 'needle',
    values: v5([3, 5, 8]), interval: 1.2, price: 11, color: '#b8e080', unlockLevel: 21,
    desc: v => `每1.2秒刺击造成${v}点伤害并附毒1层（烈毒符文再+1层）。`,
  },
};
export const ITEM_KINDS = Object.keys(ITEMS) as ItemKind[];
export const MAX_LEVEL = 5;
export function itemUnlockLevel(kind: ItemKind): number { return ITEMS[kind].unlockLevel ?? 1; }
