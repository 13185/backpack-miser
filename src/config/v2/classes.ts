import type { HeroClassId } from '../../art/types';

export interface ClassDef {
  id: HeroClassId;
  name: string;
  maxHp: number;
  gold: number;
  /** V1 ItemKind 起手；V2 扩展装备接入前仍用现有六种 */
  starter: { kind: 'dagger' | 'greatsword' | 'shield' | 'potion' | 'ruby' | 'moneybag'; level: 1 }[];
  trait: string;
}

export const V2_CLASSES: ClassDef[] = [
  {
    id: 'merchant', name: '商旅', maxHp: 90, gold: 14,
    starter: [{ kind: 'dagger', level: 1 }, { kind: 'shield', level: 1 }, { kind: 'moneybag', level: 1 }],
    trait: '每次商店首次刷新费用减少1，最低1',
  },
  {
    id: 'guard', name: '守卫', maxHp: 100, gold: 10,
    starter: [{ kind: 'greatsword', level: 1 }, { kind: 'shield', level: 1 }, { kind: 'potion', level: 1 }],
    trait: '每场首次盾牌触发额外生成1点护盾',
  },
  {
    id: 'ranger', name: '游侠', maxHp: 82, gold: 12,
    starter: [{ kind: 'dagger', level: 1 }, { kind: 'dagger', level: 1 }, { kind: 'ruby', level: 1 }],
    trait: '每场前5秒，武器攻击间隔缩短10%',
  },
];
