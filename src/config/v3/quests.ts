/**
 * 三条贯穿支线（V3 §08）：商队救援 / 原始账本 / 停炉援助。
 * 全部挂在必经关节点（不依赖随机事件）。状态写入 questStates / storyFlags，进检查点。
 */
export type ChoiceId = 'ledger_page' | 'rescue_route' | 'forge_resources' | 'evidence_or_rescue';

export interface ChoiceOption {
  id: string;
  label: string;
  /** 明示代价 */
  cost: { gold?: number; hp?: number };
  desc: string;
}
export interface ChoiceDef { id: ChoiceId; level: number; title: string; body: string; options: ChoiceOption[] }

/** 进入该关准备阶段时出现，必须选择后才能开战（可选“不付代价”项） */
export const QUEST_CHOICES: Record<ChoiceId, ChoiceDef> = {
  ledger_page: {
    id: 'ledger_page', level: 19, title: '最后一页账',
    body: '税金领主的账房里压着一页原始账页，抽出它会触动机关。带走它，日后能证明“明天被预售”；放下它，你们能毫发无伤地离开。',
    options: [
      { id: 'take', label: '冒险取走账页（-8生命）', cost: { hp: 8 }, desc: '证据+1。账本线推进。' },
      { id: 'leave', label: '不碰机关', cost: {}, desc: '无代价；账本线仍可在第30/39关补证。' },
    ],
  },
  rescue_route: {
    id: 'rescue_route', level: 23, title: '私掠者的关税',
    body: '被运走的商队就在下一条水道。露米想立刻去救；乌先生提醒，运输清单就在私掠者手里，错过就没了。',
    options: [
      { id: 'protect', label: '支付12金币雇船护送商队', cost: { gold: 12 }, desc: '救援线：商队受保护，第25/38/42关回收。' },
      { id: 'evidence', label: '先抢运输清单', cost: {}, desc: '证据+1；商队延误，救援回收减少。' },
    ],
  },
  forge_resources: {
    id: 'forge_resources', level: 34, title: '熔炉旁的选择',
    body: '老铆说：停炉需要材料，否则熔炉会炸掉半座工坊。你们的钱袋里正好有他要的东西。',
    options: [
      { id: 'give', label: '交出15金币的材料', cost: { gold: 15 }, desc: '停炉援助：第35关后恢复10生命；第49关整备锻造回收。' },
      { id: 'keep', label: '留着钱，硬拆熔炉', cost: {}, desc: '无代价；工坊受损，老铆的结局较苦。' },
    ],
  },
  evidence_or_rescue: {
    id: 'evidence_or_rescue', level: 39, title: '活人的签名',
    body: '保管室里有两样东西：能定罪的原始签名，和一份尚未执行的押送名单。时间只够带走一样。',
    options: [
      { id: 'evidence', label: '保留签名证据', cost: {}, desc: '证据+1（公账结局需要证据≥2）。' },
      { id: 'rescue', label: '烧掉押送名单救人（-6生命）', cost: { hp: 6 }, desc: '救援线升级：延误的商队也被救回。' },
    ],
  },
};

export const CHOICE_BY_LEVEL: Record<number, ChoiceId> = Object.fromEntries(
  Object.values(QUEST_CHOICES).map(c => [c.level, c.id]),
) as Record<number, ChoiceId>;

/** 公账结局所需证据数 */
export const PUBLIC_LEDGER_EVIDENCE = 2;

export function evidenceOf(q: Record<string, string>): number {
  return Number(q.ledgerEvidence ?? '0') || 0;
}
export function rescueOf(q: Record<string, string>): 'none' | 'protected' | 'delayed' | 'saved_late' {
  return (q.rescue as any) ?? 'none';
}
