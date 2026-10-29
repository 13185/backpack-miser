export type DoctrineId = 'T01' | 'T02' | 'T03' | 'T04' | 'T05' | 'T06';

export interface DoctrineDef {
  id: DoctrineId;
  name: string;
  desc: string;
  implemented: boolean;
}

export const DOCTRINES: Record<DoctrineId, DoctrineDef> = {
  T01: { id: 'T01', name: '专注', desc: '背包武器实例数≤2时直接伤害+12%，否则+4%。', implemented: true },
  T02: { id: 'T02', name: '轮转', desc: '武器实例数≥3时间隔缩短6%，否则缩短2%。', implemented: true },
  T03: { id: 'T03', name: '坚守', desc: '护盾上限60%，盾牌/铁壁生成护盾+8%。', implemented: true },
  T04: { id: 'T04', name: '调息', desc: '药水治疗+10%，首次实际治疗后额外+4护盾。', implemented: true },
  T05: { id: 'T05', name: '侵蚀', desc: '敌人毒层上限由30改为35。', implemented: true },
  T06: { id: 'T06', name: '算计', desc: '钱袋总收益+15%；每次付费刷新费用再-1（最低1）。', implemented: true },
};

export const DOCTRINE_IDS = Object.keys(DOCTRINES) as DoctrineId[];

export function pickDoctrineCandidates(rngNext: () => number): DoctrineId[] {
  const universal: DoctrineId[] = ['T01', 'T03', 'T04'];
  const pick = (arr: DoctrineId[]) => arr[Math.floor(rngNext() * arr.length)];
  const first = pick(universal);
  const pool = DOCTRINE_IDS.filter(id => id !== first);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rngNext() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return [first, pool[0], pool[1]];
}

export function doctrineT01Mult(weaponCount: number): number {
  return weaponCount <= 2 ? 1.12 : 1.04;
}
