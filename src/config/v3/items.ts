/** V3 扩展装备配置表；已映射进 ItemKind（spear/compass/…）并进背包池 */
export type V3ItemId = 'W07' | 'S04' | 'W08' | 'D02' | 'H02' | 'E02';

export interface V3ItemDef {
  id: V3ItemId;
  name: string;
  unlockLevel: number;
  w: number;
  h: number;
  interval?: number;
  values: [number, number, number];
  price: number;
  category: 'weapon' | 'passive' | 'shield' | 'heal' | 'economy';
  desc: string;
  bagReady: boolean; // false = 仅配置/图鉴
}

export const V3_ITEMS: Record<V3ItemId, V3ItemDef> = {
  W07: {
    id: 'W07', name: '贯阵长矛', unlockLevel: 21, w: 1, h: 4, interval: 1.8,
    values: [12, 22, 39], price: 15, category: 'weapon',
    desc: '主目标直接伤害；下一存活目标承受35%溅射（不递归）。', bagReady: true,
  },
  S04: {
    id: 'S04', name: '引路罗盘', unlockLevel: 26, w: 1, h: 1,
    values: [1, 2, 3], price: 12, category: 'passive',
    desc: '开战前8秒使当前目标护甲降低1/2/3。', bagReady: true,
  },
  W08: {
    id: 'W08', name: '烟火弩', unlockLevel: 31, w: 2, h: 3, interval: 3.2,
    values: [14, 25, 44], price: 18, category: 'weapon',
    desc: '同时对全部存活敌人造成直接伤害。', bagReady: true,
  },
  D02: {
    id: 'D02', name: '折叠铁壁', unlockLevel: 36, w: 1, h: 3, interval: 4,
    values: [9, 16, 27], price: 12, category: 'shield',
    desc: '生成护盾，每场最多2次。', bagReady: true,
  },
  H02: {
    id: 'H02', name: '旅行灯', unlockLevel: 41, w: 2, h: 2, interval: 8,
    values: [3, 5, 8], price: 14, category: 'heal',
    desc: '恢复生命，每场最多3次；非药水。', bagReady: true,
  },
  E02: {
    id: 'E02', name: '救急账匣', unlockLevel: 46, w: 1, h: 1,
    values: [4, 7, 11], price: 12, category: 'economy',
    desc: '开战金币<30时额外获得金币，否则不生效。', bagReady: true,
  },
};

export const V3_ITEM_IDS = Object.keys(V3_ITEMS) as V3ItemId[];
