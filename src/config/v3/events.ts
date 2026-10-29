/**
 * EV01–EV36 事件池（V2 §17 + V3 §18）。
 * 每项均可执行；主线信息不依赖事件（证据/救援/停炉仍走 quests）。
 * 效果由 Game.resolveEvent 解释。
 */
export type EventEffect =
  | { type: 'noop' }
  | { type: 'gold'; amount: number }
  | { type: 'heal'; amount: number }
  | { type: 'maxHp'; amount: number }
  | { type: 'giveItem'; kind: string; level?: 1 | 2 | 3 }
  | { type: 'giveBurden'; taxShopPct?: number; maxHpPct?: number }
  | { type: 'removeBurden' }
  | { type: 'upgrade'; fromLevel: 1 | 2 }
  | { type: 'flag'; key: string; value?: string }
  | { type: 'relicOffer' };

export interface EventOption {
  id: string;
  label: string;
  cost?: { gold?: number; hp?: number };
  effects: EventEffect[];
  desc: string;
}
export interface EventDef {
  id: string;
  name: string;
  chapterMin: number;
  chapterMax: number;
  body: string;
  options: EventOption[];
  mainlineRelated?: boolean;
  implemented: true;
}

const leave: EventOption = { id: 'leave', label: '离开', effects: [{ type: 'noop' }], desc: '无事发生。' };

function E(
  id: string, name: string, cMin: number, cMax: number, body: string,
  options: EventOption[], mainlineRelated = false,
): EventDef {
  const opts = options.some(o => o.id === 'leave') ? options : [...options, leave];
  return { id, name, chapterMin: cMin, chapterMax: cMax, body, options: opts, mainlineRelated, implemented: true };
}

export const EVENTS: Record<string, EventDef> = {
  EV01: E('EV01', '地牢铁匠', 1, 4, '炉火边坐着一名沉默的铁匠，愿意有偿升级装备。', [
    { id: 'up1', label: '支付15金：1级→2级', cost: { gold: 15 }, effects: [{ type: 'upgrade', fromLevel: 1 }], desc: '选一件1级装备升到2级。' },
    { id: 'up2', label: '支付30金：2级→3级', cost: { gold: 30 }, effects: [{ type: 'upgrade', fromLevel: 2 }], desc: '选一件2级装备升到3级。' },
  ]),
  EV02: E('EV02', '上锁钱箱', 1, 3, '一只上锁钱箱。现在砸开，或留着碰运气。', [
    { id: 'now', label: '立刻拿走12金币', effects: [{ type: 'gold', amount: 12 }], desc: '+12金。' },
  ]),
  EV03: E('EV03', '鲜血祭坛', 1, 4, '祭坛渴望鲜血或供奉。', [
    { id: 'blood', label: '支付12生命拿25金', cost: { hp: 12 }, effects: [{ type: 'gold', amount: 25 }], desc: '以血换金。' },
    { id: 'heal', label: '支付8金恢复10生命', cost: { gold: 8 }, effects: [{ type: 'heal', amount: 10 }], desc: '疗伤。' },
  ]),
  EV04: E('EV04', '宝石学徒', 1, 3, '学徒兜售红宝石。', [
    { id: 'buy', label: '支付10金获得一级红宝石', cost: { gold: 10 }, effects: [{ type: 'giveItem', kind: 'ruby', level: 1 }], desc: '获得红宝石。' },
  ]),
  EV05: E('EV05', '落难旅人', 1, 4, '旅人求援，也愿分享零钱。', [
    { id: 'help', label: '支付10金（记一笔人情）', cost: { gold: 10 }, effects: [{ type: 'flag', key: 'helpedTraveler' }, { type: 'heal', amount: 6 }], desc: '恢复6生命并记录人情。' },
    { id: 'rob', label: '拿走5金但付5生命', cost: { hp: 5 }, effects: [{ type: 'gold', amount: 5 }], desc: '+5金。' },
  ]),
  EV06: E('EV06', '旧装备回收站', 2, 5, '回收商高价收货。', [
    { id: 'sellbonus', label: '获得12金币（回收津贴）', effects: [{ type: 'gold', amount: 12 }], desc: '+12金。' },
  ]),
  EV07: E('EV07', '毒师的小摊', 2, 4, '毒师兜售毒针。', [
    { id: 'buy', label: '支付12金获得毒针', cost: { gold: 12 }, effects: [{ type: 'giveItem', kind: 'poison_needle', level: 1 }], desc: '获得毒针。' },
  ]),
  EV08: E('EV08', '安静的泉水', 1, 5, '清泉映出你的脸。', [
    { id: 'drink', label: '恢复15生命', effects: [{ type: 'heal', amount: 15 }], desc: '+15生命。' },
    { id: 'bottle', label: '拿走一级药水', effects: [{ type: 'giveItem', kind: 'potion', level: 1 }], desc: '获得药水。' },
  ]),
  EV09: E('EV09', '失控齿轮', 2, 4, '地上有一张被踩脏的账页残片，与王库笔迹相似。', [
    { id: 'take', label: '拾起（无代价）', effects: [{ type: 'flag', key: 'ev09_scrap' }], desc: '旁证线索（非正式证据）。', },
    { id: 'banner', label: '支付15金获得战旗', cost: { gold: 15 }, effects: [{ type: 'giveItem', kind: 'war_banner', level: 1 }], desc: '获得战旗。' },
  ], true),
  EV10: E('EV10', '赌徒骰盅', 2, 5, '骰盅一响，金币落地。', [
    { id: 'play', label: '支付8金碰碰运气（固定+14）', cost: { gold: 8 }, effects: [{ type: 'gold', amount: 14 }], desc: '净赚6金。' },
  ]),
  EV11: E('EV11', '遗物贩子', 2, 6, '贩子摊开三件蒙尘遗物——先付定金再挑。', [
    { id: 'buy', label: '支付20金打开遗物候选', cost: { gold: 20 }, effects: [{ type: 'relicOffer' }], desc: '进入遗物三选一。' },
  ]),
  EV12: E('EV12', '绷带商人', 1, 4, '干净的绷带，标价清楚。', [
    { id: 'buy', label: '支付6金恢复12生命', cost: { gold: 6 }, effects: [{ type: 'heal', amount: 12 }], desc: '+12生命。' },
  ]),
  EV13: E('EV13', '贪婪契约', 2, 6, '契约上写着：金币先行，命数后付。', [
    { id: 'sign', label: '拿30金并接受负担物', effects: [{ type: 'gold', amount: 30 }, { type: 'giveBurden', maxHpPct: 10 }], desc: '负担：最大生命-10%。' },
    { id: 'heal', label: '支付10金恢复12生命', cost: { gold: 10 }, effects: [{ type: 'heal', amount: 12 }], desc: '疗伤。' },
  ]),
  EV14: E('EV14', '盾牌抛光', 2, 5, '工匠愿打磨你的盾。', [
    { id: 'buy', label: '支付10金获得一级盾牌', cost: { gold: 10 }, effects: [{ type: 'giveItem', kind: 'shield', level: 1 }], desc: '获得盾牌。' },
  ]),
  EV15: E('EV15', '矿灯补给', 1, 2, '矿灯旁堆着给后来者的补给。', [
    { id: 'take', label: '拿走8金与4生命', effects: [{ type: 'gold', amount: 8 }, { type: 'heal', amount: 4 }], desc: '补给。' },
  ]),
  EV16: E('EV16', '隐藏捷径', 3, 8, '墙上裂开一条缝——只通往同编号的另一条合法路，不跳关。', [
    { id: 'mark', label: '记下捷径（无数值）', effects: [{ type: 'flag', key: 'shortcut_seen' }], desc: '剧情标记。' },
  ]),
  EV17: E('EV17', '医师短憩', 3, 6, '伊芙留下的药箱。', [
    { id: 'rest', label: '恢复20生命', effects: [{ type: 'heal', amount: 20 }], desc: '+20生命。' },
  ]),
  EV18: E('EV18', '锈蚀钥匙', 2, 4, '钥匙或许能开牢城侧门。', [
    { id: 'keep', label: '收起（记标记）', effects: [{ type: 'flag', key: 'rust_key' }, { type: 'gold', amount: 5 }], desc: '+5金并记录。' },
  ]),
  EV19: E('EV19', '假账本', 3, 5, '一本假账本，卖给需要的人。', [
    { id: 'sell', label: '卖出得15金', effects: [{ type: 'gold', amount: 15 }], desc: '+15金。' },
  ]),
  EV20: E('EV20', '王库赎回处', 4, 4, '赎回处专管解除负担。', [
    { id: 'clear', label: '支付15金移除负担物', cost: { gold: 15 }, effects: [{ type: 'removeBurden' }], desc: '移除一件负担。' },
    { id: 'scrap', label: '拆装备津贴：+10金并恢复10生命', effects: [{ type: 'gold', amount: 10 }, { type: 'heal', amount: 10 }], desc: '津贴。' },
  ]),
  EV21: E('EV21', '漏水的救生艇', 5, 5, '雾里有人喊救命。', [
    { id: 'save', label: '支付12金救下额外成员', cost: { gold: 12 }, effects: [{ type: 'flag', key: 'sideRescueBoat', value: '1' }], desc: '记录 sideRescueBoat。' },
    { id: 'gear', label: '付8生命拿一级匕首', cost: { hp: 8 }, effects: [{ type: 'giveItem', kind: 'dagger', level: 1 }], desc: '获得匕首。' },
  ], true),
  EV22: E('EV22', '盐封货箱', 5, 5, '盐壳封住的货箱。', [
    { id: 'gold', label: '拿12金币', effects: [{ type: 'gold', amount: 12 }], desc: '+12金。' },
  ], true),
  EV23: E('EV23', '潮水里的货箱', 5, 5, '雾里漂来商队货箱。', [
    { id: 'open', label: '打开（-4生命，+8金）', cost: { hp: 4 }, effects: [{ type: 'gold', amount: 8 }], desc: '+8金。' },
  ], true),
  EV24: E('EV24', '港口旧债', 5, 5, '债主愿用遗物抵债。', [
    { id: 'relic', label: '支付15金打开遗物候选', cost: { gold: 15 }, effects: [{ type: 'relicOffer' }], desc: '遗物三选一。' },
    { id: 'blood', label: '付10生命拿20金', cost: { hp: 10 }, effects: [{ type: 'gold', amount: 20 }], desc: '+20金。' },
  ]),
  EV25: E('EV25', '两面镜', 6, 6, '镜子映出另一件装备的影子。', [
    { id: 'gold', label: '拿6金币', effects: [{ type: 'gold', amount: 6 }], desc: '+6金。' },
  ]),
  EV26: E('EV26', '原稿残页', 6, 6, '残页是旁证，不是主线唯一证据。', [
    { id: 'keep', label: '付8生命保存旁证', cost: { hp: 8 }, effects: [{ type: 'flag', key: 'sideEvidenceCopy', value: '1' }], desc: '记录旁证。' },
    { id: 'sell', label: '拿10金，放弃旁证', effects: [{ type: 'gold', amount: 10 }], desc: '+10金。' },
  ], true),
  EV27: E('EV27', '镜砂工匠', 6, 6, '工匠能把二级打到三级。', [
    { id: 'up', label: '支付20金：2→3', cost: { gold: 20 }, effects: [{ type: 'upgrade', fromLevel: 2 }], desc: '升级一件2级装备。' },
    { id: 'heal', label: '支付8金恢复12生命', cost: { gold: 8 }, effects: [{ type: 'heal', amount: 12 }], desc: '疗伤。' },
  ]),
  EV28: E('EV28', '未寄出的工资', 6, 7, '一袋未寄出的工资，附带一张欠条。', [
    { id: 'take', label: '领15金并接受负担（店价+10%）', effects: [{ type: 'gold', amount: 15 }, { type: 'giveBurden', taxShopPct: 10 }], desc: '负担抬高商店价。' },
    { id: 'heal', label: '恢复8生命', effects: [{ type: 'heal', amount: 8 }], desc: '+8生命。' },
  ]),
  EV29: E('EV29', '熔炉余料', 7, 7, '余料还能再熔一次。', [
    { id: 'recycle', label: '回收津贴+16金', effects: [{ type: 'gold', amount: 16 }], desc: '+16金。' },
    { id: 'cross', label: '支付12金获得烟火弩', cost: { gold: 12 }, effects: [{ type: 'giveItem', kind: 'firework_crossbow', level: 1 }], desc: '获得烟火弩。' },
  ]),
  EV30: E('EV30', '老铆的工具', 7, 7, '老铆需要人手。', [
    { id: 'help', label: '支付15金援助（记 sideForgeHelp）', cost: { gold: 15 }, effects: [{ type: 'flag', key: 'sideForgeHelp', value: '1' }], desc: '与主线停炉援助分开的旁支标记。' },
    { id: 'shield', label: '免费将1级盾升2级', effects: [{ type: 'upgrade', fromLevel: 1 }], desc: '升级1级装备。' },
  ], true),
  EV31: E('EV31', '熄灭的炉心', 7, 7, '炉心余温里埋着遗物。', [
    { id: 'relic', label: '付12生命打开遗物候选', cost: { hp: 12 }, effects: [{ type: 'relicOffer' }], desc: '遗物三选一。' },
    { id: 'gold', label: '拿8金', effects: [{ type: 'gold', amount: 8 }], desc: '+8金。' },
  ]),
  EV32: E('EV32', '医师的抄本', 8, 8, '抄本教你如何续命。', [
    { id: 'heal', label: '支付12金恢复18生命', cost: { gold: 12 }, effects: [{ type: 'heal', amount: 18 }], desc: '+18生命。' },
    { id: 'max', label: '支付20金：最大生命+5（受总+20上限）', cost: { gold: 20 }, effects: [{ type: 'maxHp', amount: 5 }], desc: '永久本局最大生命。' },
  ]),
  EV33: E('EV33', '失声祷告', 8, 8, '祷告无声，只换得片刻安宁。', [
    { id: 'heal', label: '恢复10生命', effects: [{ type: 'heal', amount: 10 }], desc: '+10生命。' },
  ]),
  EV34: E('EV34', '旧王的赦令', 9, 9, '赦令可解除负担，或以血换金。', [
    { id: 'clear', label: '支付15金移除负担', cost: { gold: 15 }, effects: [{ type: 'removeBurden' }], desc: '移除负担。' },
    { id: 'blood', label: '付8生命拿18金', cost: { hp: 8 }, effects: [{ type: 'gold', amount: 18 }], desc: '+18金。' },
  ], true),
  EV35: E('EV35', '抵达的商队', 9, 9, '若救援标记有效，商队愿意答谢。', [
    { id: 'reward_g', label: '若已救援：拿10金', effects: [{ type: 'flag', key: 'ev35_try_gold' }, { type: 'gold', amount: 10 }], desc: '有救援标记时视为答谢；无标记仍给基础谢礼。' },
    { id: 'reward_h', label: '若已救援：恢复12生命', effects: [{ type: 'heal', amount: 12 }], desc: '疗伤。' },
    { id: 'potion', label: '付8金拿药水', cost: { gold: 8 }, effects: [{ type: 'giveItem', kind: 'potion', level: 1 }], desc: '获得药水。' },
  ], true),
  EV36: E('EV36', '最后的磨刀石', 10, 10, '磨刀石还能再用一次。', [
    { id: 'hone', label: '支付15金（记强化标记）', cost: { gold: 15 }, effects: [{ type: 'flag', key: 'finalHone' }, { type: 'heal', amount: 4 }], desc: '本局磨砺标记。' },
    { id: 'heal', label: '恢复8生命', effects: [{ type: 'heal', amount: 8 }], desc: '+8生命。' },
  ]),
};

export const EVENT_IDS = Object.keys(EVENTS) as string[];

export const ELITE_LEVELS = [3, 8, 13, 18, 23, 28, 33, 38, 43, 48] as const;
export const ELITE_HP_MULT = 1.40;
export const ELITE_GOLD_MULT = 1.4;

export function eventsForChapter(chapter: number, seen: string[]): EventDef[] {
  return EVENT_IDS
    .map(id => EVENTS[id])
    .filter(e => e && e.chapterMin <= chapter && chapter <= e.chapterMax && !seen.includes(e.id));
}

export function pickEvent(rngNext: () => number, chapter: number, seen: string[]): string | null {
  const pool = eventsForChapter(chapter, seen);
  if (!pool.length) return null;
  const i = Math.floor(rngNext() * pool.length);
  return pool[Math.min(i, pool.length - 1)].id;
}

export function eventStatus(id: string): 'implemented' | 'missing' {
  return EVENTS[id]?.implemented ? 'implemented' : 'missing';
}
