import type { HeroClassId } from '../../art/types';

export interface ClassDef {
  id: HeroClassId;
  name: string;
  maxHp: number;
  gold: number;
  /** V1 ItemKind 起手；V2 扩展装备接入前仍用现有六种 */
  starter: { kind: 'dagger' | 'greatsword' | 'shield' | 'potion' | 'ruby' | 'moneybag'; level: 1 }[];
  trait: string;
  /** 选人界面上的两行说明，和实际被动一致 */
  blurb: [string, string];
}

export const V2_CLASSES: ClassDef[] = [
  {
    id: 'merchant', name: '商旅', maxHp: 90, gold: 15,
    starter: [{ kind: 'dagger', level: 1 }, { kind: 'shield', level: 1 }, { kind: 'moneybag', level: 1 }],
    trait: '买价八五折，刷新少2金，钱袋更赚；带着钱袋时武器伤害+12%，31关后+20%',
    blurb: ['买价八五折，刷新少2金。', '钱袋武器+12%；31关后+20%，生命+12。'],
  },
  {
    id: 'guard', name: '守卫', maxHp: 100, gold: 11,
    starter: [{ kind: 'greatsword', level: 1 }, { kind: 'shield', level: 1 }, { kind: 'potion', level: 1 }],
    trait: '最强的一面盾或铁壁，护盾生成提高25%，31关后为15%',
    blurb: ['最强的一面盾或铁壁', '护盾+25%；31关后这一面盾为+15%。'],
  },
  {
    id: 'ranger', name: '游侠', maxHp: 82, gold: 13,
    starter: [{ kind: 'dagger', level: 1 }, { kind: 'dagger', level: 1 }, { kind: 'ruby', level: 1 }],
    trait: '开场10点护盾，出手快25%（31关后更快），攻击无视4点护甲',
    blurb: ['开场10点护盾，出手快25%。', '无视4甲；31关后生命+20、开场盾16、更快。'],
  },
];
