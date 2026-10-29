/** 可持有遗物：V3 A01–A12 + V2 全套 24 */
export type RelicId =
  | 'A01' | 'A02' | 'A03' | 'A04' | 'A05' | 'A06' | 'A07' | 'A08' | 'A09' | 'A10' | 'A11' | 'A12'
  | 'C01' | 'C02' | 'C03' | 'C04' | 'C05' | 'C06' | 'C07' | 'C08' | 'C09' | 'C10' | 'C11' | 'C12'
  | 'R01' | 'R02' | 'R03' | 'R04' | 'R05' | 'R06' | 'R07' | 'R08'
  | 'K01' | 'K02' | 'K03' | 'K04';
export type RelicRarity = 'common' | 'rare' | 'costly';

export interface RelicDef {
  id: RelicId;
  name: string;
  rarity: RelicRarity;
  desc: string;
  unlockLevel: number;
  implemented: boolean;
}

export const MAX_RELICS = 3;

export const V3_RELICS: Record<RelicId, RelicDef> = {
  A01: { id: 'A01', name: '港口靴', rarity: 'common', unlockLevel: 21, implemented: true, desc: '每场前两次敌人开始蓄力时获得6护盾。' },
  A02: { id: 'A02', name: '盐雾砥石', rarity: 'common', unlockLevel: 21, implemented: true, desc: '对有护盾的敌人直接伤害+12%。' },
  A03: { id: 'A03', name: '镜砂标签', rarity: 'common', unlockLevel: 26, implemented: true, desc: '同一敌人每5次常规命中附毒+2。' },
  A04: { id: 'A04', name: '余温护环', rarity: 'common', unlockLevel: 26, implemented: true, desc: '药水治疗后最长冷却武器-0.3秒。' },
  A05: { id: 'A05', name: '空袋节俭', rarity: 'common', unlockLevel: 21, implemented: true, desc: '放弃战利品（回收）时额外+2金币。' },
  A06: { id: 'A06', name: '修补线', rarity: 'common', unlockLevel: 21, implemented: true, desc: '营地休息额外恢复5生命。' },
  A07: { id: 'A07', name: '破绽猎手', rarity: 'rare', unlockLevel: 26, implemented: true, desc: '命中护甲为0的敌人时直接伤害+18%。' },
  A08: { id: 'A08', name: '分担之盾', rarity: 'rare', unlockLevel: 31, implemented: true, desc: '受>20%最大生命非致死伤害后+8盾。' },
  A09: { id: 'A09', name: '潮汐瓶', rarity: 'rare', unlockLevel: 31, implemented: true, desc: '冰晶减速到期时目标护甲-2持续2秒。' },
  A10: { id: 'A10', name: '封账签', rarity: 'rare', unlockLevel: 36, implemented: true, desc: '回响追加攻击伤害-25%。' },
  A11: { id: 'A11', name: '火种契约', rarity: 'costly', unlockLevel: 36, implemented: true, desc: '前10秒直接伤害+25%，盾牌生成-15%。' },
  A12: { id: 'A12', name: '轻装契约', rarity: 'costly', unlockLevel: 21, implemented: true, desc: '占格≤20时直接伤害+20%，最大生命-10。' },
  C01: { id: 'C01', name: '连击齿轮', rarity: 'common', unlockLevel: 1, implemented: true, desc: '每6次常规武器触发，追加8点直接伤害。' },
  C02: { id: 'C02', name: '磨刀石', rarity: 'common', unlockLevel: 1, implemented: true, desc: '所有武器直接伤害+10%。' },
  C03: { id: 'C03', name: '润滑油', rarity: 'common', unlockLevel: 1, implemented: true, desc: '所有武器攻击间隔缩短8%。' },
  C04: { id: 'C04', name: '宝石匣', rarity: 'common', unlockLevel: 1, implemented: true, desc: '红宝石加成提高25%（仍受总上限）。' },
  C05: { id: 'C05', name: '铁皮徽章', rarity: 'common', unlockLevel: 1, implemented: true, desc: '盾牌生成护盾+20%。' },
  C06: { id: 'C06', name: '应急吊坠', rarity: 'common', unlockLevel: 1, implemented: true, desc: '药水实际治疗后额外+6护盾。' },
  C07: { id: 'C07', name: '备用绷带', rarity: 'common', unlockLevel: 1, implemented: true, desc: '每场首次承伤后生命≤30%时恢复12。' },
  C08: { id: 'C08', name: '守财印章', rarity: 'common', unlockLevel: 1, implemented: true, desc: '钱袋收益+30%。' },
  C09: { id: 'C09', name: '商人算盘', rarity: 'common', unlockLevel: 1, implemented: true, desc: '商店装备价格-10%。' },
  C10: { id: 'C10', name: '旅行水壶', rarity: 'common', unlockLevel: 5, implemented: true, desc: '胜利后额外恢复8点生命。' },
  C11: { id: 'C11', name: '宽口药瓶', rarity: 'common', unlockLevel: 1, implemented: true, desc: '药水治疗量+20%。' },
  C12: { id: 'C12', name: '远行火种', rarity: 'common', unlockLevel: 1, implemented: true, desc: '开战获得8点护盾。' },
  R01: { id: 'R01', name: '反击徽章', rarity: 'rare', unlockLevel: 5, implemented: true, desc: '每吸收18点护盾伤害，反击12点。' },
  R02: { id: 'R02', name: '重刃磨石', rarity: 'rare', unlockLevel: 5, implemented: true, desc: '大剑/战锤伤害+35%，间隔×1.15。' },
  R03: { id: 'R03', name: '剧毒种子', rarity: 'rare', unlockLevel: 10, implemented: true, desc: '每2次毒结算才减1层。' },
  R04: { id: 'R04', name: '碎片棱镜', rarity: 'rare', unlockLevel: 6, implemented: true, desc: '连弩第二箭+35%；链锤溅射75%。' },
  R05: { id: 'R05', name: '双生刃', rarity: 'rare', unlockLevel: 5, implemented: true, desc: '每3次常规武器触发追加30%直接伤害。' },
  R06: { id: 'R06', name: '战地药箱', rarity: 'rare', unlockLevel: 5, implemented: true, desc: '药水治疗后武器伤害+8%，最多3层。' },
  R07: { id: 'R07', name: '孤勇战旗', rarity: 'rare', unlockLevel: 5, implemented: true, desc: '背包武器≤2时直接伤害+25%。' },
  R08: { id: 'R08', name: '精密夹具', rarity: 'rare', unlockLevel: 5, implemented: true, desc: '空格≥8时武器间隔缩短12%。' },
  K01: { id: 'K01', name: '贪财契约', rarity: 'costly', unlockLevel: 10, implemented: true, desc: '钱袋+50%，最大生命-15%。' },
  K02: { id: 'K02', name: '嗜战契约', rarity: 'costly', unlockLevel: 10, implemented: true, desc: '武器伤害+25%；胜利自动回血变为0。' },
  K03: { id: 'K03', name: '沉重金冠', rarity: 'costly', unlockLevel: 15, implemented: true, desc: '开战金币≥80时伤害+30%；商店价+20%。' },
  K04: { id: 'K04', name: '脆弱水晶', rarity: 'costly', unlockLevel: 10, implemented: true, desc: '武器伤害+30%，受到伤害×1.20。' },
};

export const V3_RELIC_IDS = Object.keys(V3_RELICS) as RelicId[];

export function pickRelicCandidates(rngNext: () => number, owned: string[], level: number, count = 3): RelicId[] {
  const pool = V3_RELIC_IDS.filter(id => !owned.includes(id) && V3_RELICS[id].unlockLevel <= level);
  const arr = pool.length ? [...pool] : V3_RELIC_IDS.filter(id => !owned.includes(id));
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rngNext() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, count);
}
