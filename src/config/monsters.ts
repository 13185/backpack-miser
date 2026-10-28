export type MonsterKind = 'slime' | 'bat' | 'skeleton' | 'brute' | 'mimic';
export interface MonsterDef {
  kind: MonsterKind; name: string; hp: number; atk: number; interval: number;
  armor?: number; enrageHalf?: boolean; ability: string;
}
export const MONSTER_BASE: Record<MonsterKind, { name: string; ability: string }> = {
  slime: { name: '史莱姆', ability: '无特殊能力。' },
  bat: { name: '洞穴蝙蝠', ability: '生命较低，但攻击很快。' },
  skeleton: { name: '骷髅卫士', ability: '骨甲：每次受到的伤害减少固定值（至少造成1点）。' },
  brute: { name: '地牢蛮兵', ability: '攻击缓慢，但单次伤害很高。' },
  mimic: { name: '黄金宝箱怪', ability: '首领：生命低于50%时暴怒，攻击间隔缩短20%（仅一次）。' },
};
