import type { ItemKind } from '../../models/types';

export type RuneId = 'U01' | 'U02' | 'U03' | 'U04' | 'U05' | 'U06' | 'U07' | 'U08';
export type RuneSlot = 'weapon' | 'shield' | 'potion' | 'needle' | 'moneybag';

export interface RuneDef {
  id: RuneId;
  name: string;
  slot: RuneSlot;
  legalKinds: ItemKind[];
  desc: string;
  implemented: boolean;
}

export const MAX_RUNES = 2;
export const RUNE_TRANSFER_COST = 5;
export const RUNE_REPLACE_COST = 20;
export const INTERVAL_SHORTEN_CAP = 0.5;

const WEAPONS: ItemKind[] = ['dagger', 'greatsword', 'spear', 'firework_crossbow', 'crossbow', 'chain_hammer', 'warhammer'];
const SHIELDS: ItemKind[] = ['shield', 'fold_wall'];

export const RUNES: Record<RuneId, RuneDef> = {
  U01: { id: 'U01', name: '锋刃', slot: 'weapon', legalKinds: [...WEAPONS], desc: '直接伤害加成+10%。', implemented: true },
  U02: { id: 'U02', name: '穿甲', slot: 'weapon', legalKinds: [...WEAPONS], desc: '有效护甲再忽略1点。', implemented: true },
  U03: { id: 'U03', name: '疾速', slot: 'weapon', legalKinds: [...WEAPONS], desc: '攻击间隔缩短6%，受总50%上限限制。', implemented: true },
  U04: { id: 'U04', name: '护持', slot: 'shield', legalKinds: [...SHIELDS], desc: '生成护盾+15%，不额外提高上限。', implemented: true },
  U05: { id: 'U05', name: '余药', slot: 'potion', legalKinds: ['potion'], desc: '治疗量+15%，不增加次数。', implemented: true },
  U06: { id: 'U06', name: '烈毒', slot: 'needle', legalKinds: ['poison_needle'], desc: '毒针常规触发附毒再+1层。', implemented: true },
  U07: { id: 'U07', name: '聚财', slot: 'moneybag', legalKinds: ['moneybag'], desc: '本件每场基础金币收益+2。', implemented: true },
  U08: { id: 'U08', name: '破绽', slot: 'weapon', legalKinds: [...WEAPONS], desc: '对蓄力/狂暴/潮汐高潮中的敌人直接伤害+15%。', implemented: true },
};

export const RUNE_IDS = Object.keys(RUNES) as RuneId[];

export function runeLegalForItem(runeId: RuneId, kind: ItemKind): boolean {
  return RUNES[runeId].legalKinds.includes(kind);
}

export function pickRuneCandidates(
  rngNext: () => number,
  ownedKinds: ItemKind[],
  excludeIds: RuneId[],
  count = 3,
): RuneId[] {
  const adaptable = RUNE_IDS.filter(id => {
    if (excludeIds.includes(id)) return false;
    const legal = RUNES[id].legalKinds;
    if (legal.length === 0) return false;
    return ownedKinds.some(k => legal.includes(k));
  });
  const rest = RUNE_IDS.filter(id => !excludeIds.includes(id) && !adaptable.includes(id) && RUNES[id].legalKinds.length > 0);
  const pool = [...adaptable];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rngNext() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const out: RuneId[] = [];
  if (pool.length) out.push(pool[0]);
  const filler = [...pool.slice(1), ...rest.filter(id => !out.includes(id))];
  for (let i = filler.length - 1; i > 0; i--) {
    const j = Math.floor(rngNext() * (i + 1));
    [filler[i], filler[j]] = [filler[j], filler[i]];
  }
  for (const id of filler) {
    if (out.length >= count) break;
    if (!out.includes(id)) out.push(id);
  }
  for (const id of RUNE_IDS) {
    if (out.length >= count) break;
    if (!excludeIds.includes(id) && !out.includes(id) && RUNES[id].legalKinds.length > 0) out.push(id);
  }
  return out.slice(0, count);
}
