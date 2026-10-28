import type { ItemKind } from '../models/types';
export interface ItemDef {
  kind: ItemKind; name: string; w: number; h: number; rotatable: boolean;
  category: 'weapon' | 'shield' | 'potion' | 'gem' | 'bag';
  values: [number, number, number]; // 每级主数值：伤害/护盾/治疗/加成%/金币
  interval?: number; // 秒
  price: number; // 一级价格
  desc: (v: number) => string;
  color: string;
}
export const ITEMS: Record<ItemKind, ItemDef> = {
  dagger: { kind: 'dagger', name: '匕首', w: 1, h: 2, rotatable: true, category: 'weapon', values: [5, 9, 16], interval: 0.8, price: 8, color: '#9fd3ff',
    desc: v => `每0.8秒攻击一次，造成${v}点伤害。出手频繁。` },
  greatsword: { kind: 'greatsword', name: '大剑', w: 1, h: 3, rotatable: true, category: 'weapon', values: [14, 25, 44], interval: 2, price: 12, color: '#ffb36b',
    desc: v => `每2秒重劈一次，造成${v}点伤害。单次伤害高。` },
  shield: { kind: 'shield', name: '盾牌', w: 2, h: 2, rotatable: false, category: 'shield', values: [7, 12, 20], interval: 3, price: 10, color: '#8fe3a7',
    desc: v => `每3秒获得${v}点护盾。护盾先于生命抵挡伤害，总护盾上限为最大生命的50%。` },
  potion: { kind: 'potion', name: '药水', w: 1, h: 1, rotatable: false, category: 'potion', values: [18, 30, 48], price: 7, color: '#ff7fa8',
    desc: v => `生命不高于40%时自动饮用，恢复${v}点生命。每场战斗一次，战后自动充能。` },
  ruby: { kind: 'ruby', name: '红宝石', w: 1, h: 1, rotatable: false, category: 'gem', values: [15, 25, 40], price: 10, color: '#ff5d6c',
    desc: v => `让上下左右紧贴的武器伤害+${v}%（对角无效，总加成最高100%）。` },
  moneybag: { kind: 'moneybag', name: '钱袋', w: 1, h: 1, rotatable: false, category: 'bag', values: [4, 8, 13], price: 12, color: '#ffd45c',
    desc: v => `开战时在背包中，胜利后额外获得${v}金币。失败无收益。` },
};
export const ITEM_KINDS = Object.keys(ITEMS) as ItemKind[];
export const MAX_LEVEL = 3;
