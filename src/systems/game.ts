import { BALANCE_VERSION, ECONOMY, FORGE_LEGEND_UNLOCK, FORGE_RISK_UNLOCK, FORGE_SAFE_COST, FORGE_VOUCHER_LEVELS, winHealAmount } from '../config/economy';
import { ITEMS, ITEM_KINDS, itemUnlockLevel } from '../config/items';
import {
  CAMPAIGN_LENGTH, CAMPAIGN_VERSION, V3_CHAPTERS, campAfterBoss, chapterOf,
  getLevel, isBossLevel, isFinalVictory, isMidAct, winGoldFor,
} from '../config/v3';
import { MAX_RUNES, pickRuneCandidates, runeLegalForItem, RUNES, type RuneId } from '../config/v3/runes';
import { pickDoctrineCandidates, type DoctrineId } from '../config/v3/doctrines';
import { CHAPTER_INTROS, ENDING_CHOICES, MID_ACT_STORY, type EndingId } from '../config/v3/story';
import { MAX_RELICS, pickRelicCandidates, V3_RELICS, type RelicId } from '../config/v3/relics';
import { CHOICE_BY_LEVEL, PUBLIC_LEDGER_EVIDENCE, QUEST_CHOICES, evidenceOf, rescueOf, type ChoiceId } from '../config/v3/quests';
import { EVENTS, ELITE_LEVELS, ELITE_HP_MULT, ELITE_GOLD_MULT, pickEvent, type EventEffect } from '../config/v3/events';
import { applyEliteOverlay } from '../config/v3/levels';
import { stageOf } from '../config/v3/campaign';
import { V2_CLASSES } from '../config/v2/classes';
import type { ChapterCheckpoint, GameState, HeroClass, ItemInstance, ItemKind, LastBattle, Level, RuneInstance } from '../models/types';
import { createCombat, computeBagGold, computeLedgerBonus, type CombatState } from './combat';
import { buyPrice, canAfford, expansionOffer, refreshCost, resolveCharmOffer, sellPrice } from './economy';
import { rollItems } from './loot';
import { canMerge, mergeItems } from './merge';
import { canPlace, findSpot, inBag } from './placement';
import { LV4_GAMBLE, LV5_GAMBLE, gambleOutcome } from '../config/gamble';
import { nextRandom, Rng } from './rng';
import { SAVE_VERSION } from './save';

export type Result = { ok: true; msg?: string } | { ok: false; msg: string };
const OK: Result = { ok: true };
const fail = (msg: string): Result => ({ ok: false, msg });

/** 营地价格（V2 §21）：1→2 免费，2→3 付20 */
export const CAMP_FORGE_COST: Record<1 | 2, number> = { 1: 0, 2: 45 }; // pass4：抬高锻造金汇
/** 营地休息：最大生命30%（V2 §21） */
export const CAMP_REST_RATE = 0.3;

function emptyCampaignFields(): Omit<GameState,
  'version' | 'phase' | 'level' | 'hp' | 'maxHp' | 'gold' | 'rows' | 'cols' | 'expansions' | 'items' | 'nextId' | 'rng' |
  'loot' | 'shop' | 'battleToken' | 'settledToken' | 'stats' | 'last'> {
  return {
    campaignLength: CAMPAIGN_LENGTH,
    campaignVersion: CAMPAIGN_VERSION,
    mode: 'story',
    currentChapter: 1,
    attemptId: 1,
    assistanceUsed: false,
    retryCount: 0,
    storyFlags: {},
    questStates: {},
    npcStates: {},
    endingChoice: null,
    runes: [],
    doctrine: null,
    seenDialogue: [],
    chapterCheckpoint: null,
    pendingRuneChoices: null,
    pendingDoctrineChoices: null,
    pendingStoryId: null,
    relics: [],
    pendingRelicChoices: null,
    campServiceUsed: false,
    pendingCheckpointAfterCamp: false,
    heroClass: 'merchant',
    campKind: null,
    pendingChoice: null,
    doctrineRerollChoices: null,
    assist: null,
    completion: null,
    storyLog: [],
    eliteActive: false,
    pendingRoute: false,
    pendingEventId: null,
    seenEvents: [],
    pendingUpgrade: null,
    fixedMaxHpBonus: 0,
  };
}

export interface NewGameOpts { heroClass?: HeroClass; mode?: 'story' | 'ironman' }

export function newGameState(seed: number, opts: NewGameOpts = {}): GameState {
  const cls = V2_CLASSES.find(c => c.id === (opts.heroClass ?? 'merchant'))!;
  const s: GameState = {
    version: SAVE_VERSION, phase: 'prep', level: 1, hp: cls.maxHp, maxHp: cls.maxHp, gold: cls.gold,
    rows: ECONOMY.startRows, cols: ECONOMY.startCols, expansions: 0, items: [], nextId: 1, rng: seed >>> 0,
    forgeRng: (seed ^ 0x9e3779b9) >>> 0, forgeVouchers: 0, forgeVoucherGranted: [], bossPrep: [], a10Compensated: false,
    loot: null, shop: { level: 1, slots: [], refreshes: 0 }, battleToken: 0, settledToken: 0,
    stats: { kills: 0, goldEarned: 0, contribution: {} }, last: null,
    ...emptyCampaignFields(),
  };
  s.heroClass = cls.id as HeroClass;
  s.mode = opts.mode ?? 'story';
  for (const st of cls.starter) {
    const spot = findSpot(s.items, s.cols, s.rows, st.kind)!;
    s.items.push({ id: 'i' + s.nextId++, kind: st.kind, level: 1, x: spot.x, y: spot.y, rotated: spot.rotated });
  }
  rollShop(s);
  // 第1章检查点：选好职业与起手后创建（V3 §03）
  s.chapterCheckpoint = snapshotCheckpoint(s);
  maybeOfferSystems(s);
  return s;
}
function highestCharmLevel(s: GameState): number {
  let best = 0;
  for (const it of s.items) if (it.kind === 'luck_charm') best = Math.max(best, it.level);
  return best;
}
function rollShop(s: GameState) {
  const r = new Rng(s.rng);
  const held = highestCharmLevel(s);
  const slots = rollItems(r, s.level, 3).map(o => {
    if (o.kind !== 'luck_charm') return o;
    const level = resolveCharmOffer(held, o.level);
    if (level == null) {
      const alt = rollItems(r, s.level, 4).find(x => x.kind !== 'luck_charm');
      return alt ?? { kind: 'potion' as const, level: 1 as const };
    }
    return { kind: 'luck_charm' as const, level };
  });
  s.shop.slots = slots.map(o => ({ ...o, bought: false }));
  s.rng = r.state;
}

/** 完整状态快照（不含检查点自身），恢复以此为准，避免遗漏字段 */
function snapshotCheckpoint(s: GameState): ChapterCheckpoint {
  const { chapterCheckpoint: _cp, ...rest } = s;
  void _cp;
  const clone = JSON.parse(JSON.stringify(rest));
  return {
    level: s.level, chapter: s.currentChapter, hp: s.hp, maxHp: s.maxHp, gold: s.gold,
    rows: s.rows, cols: s.cols, expansions: s.expansions,
    items: clone.items, nextId: s.nextId, rng: s.rng, shop: clone.shop, stats: clone.stats,
    storyFlags: { ...s.storyFlags }, questStates: { ...s.questStates }, npcStates: { ...s.npcStates },
    runes: clone.runes, doctrine: s.doctrine, seenDialogue: [...s.seenDialogue],
    pendingRuneChoices: clone.pendingRuneChoices, pendingDoctrineChoices: clone.pendingDoctrineChoices,
    endingChoice: s.endingChoice, relics: [...s.relics], pendingRelicChoices: clone.pendingRelicChoices,
    campServiceUsed: s.campServiceUsed, pendingCheckpointAfterCamp: false,
    battleToken: s.battleToken, settledToken: s.settledToken,
    state: JSON.stringify(rest),
  };
}

function logStory(s: GameState, id: string) {
  if (!s.storyLog.includes(id)) s.storyLog.push(id);
}
function queueStoryOnce(s: GameState, id: string) {
  logStory(s, id);
  if (s.seenDialogue.includes(id)) return;
  s.pendingStoryId = id;
}

/** 进入关卡准备阶段时的必经系统/剧情节点 */
function maybeOfferSystems(s: GameState) {
  const r = new Rng(s.rng);
  const owned = s.items.map(i => i.kind);
  const ownedIds = s.runes.map(x => x.runeId as RuneId);
  if (s.level === 21 && !s.storyFlags.runeTutorialDone && !s.pendingRuneChoices) {
    s.pendingRuneChoices = pickRuneCandidates(() => r.next(), owned, ownedIds, 3);
  }
  if (s.level === 31 && !s.storyFlags.runeSlot2Done && s.runes.length < MAX_RUNES && !s.pendingRuneChoices) {
    s.pendingRuneChoices = pickRuneCandidates(() => r.next(), owned, ownedIds, 3);
  }
  if (s.level === 36 && !s.doctrine && !s.pendingDoctrineChoices) {
    s.pendingDoctrineChoices = pickDoctrineCandidates(() => r.next());
  }
  if (s.level === 45 && !s.endingChoice && !s.storyFlags.endingChoicePending) {
    s.storyFlags = { ...s.storyFlags, endingChoicePending: true };
  }
  if (s.level >= 21 && s.level % 5 === 1 && s.relics.length < MAX_RELICS && !s.pendingRelicChoices) {
    s.pendingRelicChoices = pickRelicCandidates(() => r.next(), s.relics, s.level, 3);
  }
  // 支线必经选择
  const cid = CHOICE_BY_LEVEL[s.level];
  if (cid && !s.questStates[`choice_${cid}`] && !s.pendingChoice) {
    s.pendingChoice = { id: cid, options: QUEST_CHOICES[cid].options.map(o => o.id) };
  }
  // 章节开场
  const intro = CHAPTER_INTROS[s.currentChapter];
  if (intro && (s.level - 1) % 5 === 0) queueStoryOnce(s, intro.id);
  // Boss 战前
  if (s.level % 5 === 0) queueStoryOnce(s, `boss_pre_${s.currentChapter}`);
  // 第41关起讲清结局条件
  if (s.level === 41) queueStoryOnce(s, 'ending_brief_45');
  // 精英层：进入准备时若尚未选择路线
  if ((ELITE_LEVELS as readonly number[]).includes(s.level) && !s.storyFlags[`route_${s.level}`]) {
    s.pendingRoute = true;
    s.eliteActive = false;
  }
  s.rng = r.state;
}

/** 胜利后的支线固定回收（必经关，不依赖随机） */
function questOnWin(s: GameState, lv: number) {
  const q = s.questStates;
  if (lv === 9) q.ledger = q.ledger ?? 'anomaly';
  if (lv === 10) { q.rescue = q.rescue ?? 'lumi_saved'; s.npcStates.lumi = 'joined'; }
  if (lv === 15) q.forge = q.forge ?? 'sample';
  if (lv === 25 && rescueOf(q) === 'protected') s.npcStates.lumi = 'convoy_safe';
  if (lv === 30 && evidenceOf(q) >= 1 && !s.storyFlags.ledgerVerified30) {
    q.ledgerEvidence = String(evidenceOf(q) + 1);
    s.storyFlags = { ...s.storyFlags, ledgerVerified30: true };
    s.npcStates.wu = 'trusted';
  }
  if (lv === 35) {
    if (q.forge === 'helped' && !s.storyFlags.forgeHeal35) {
      s.hp = Math.min(s.maxHp, s.hp + 10);
      s.storyFlags = { ...s.storyFlags, forgeHeal35: true };
      q.forge = 'stopped_clean';
      s.npcStates.rivet = 'workshop_saved';
    } else if (q.forge !== 'stopped_clean') { q.forge = 'stopped_rough'; s.npcStates.rivet = 'workshop_damaged'; }
  }
  if (lv === 38 && (rescueOf(q) === 'protected' || rescueOf(q) === 'saved_late') && !s.storyFlags.rescueHeal38) {
    s.hp = Math.min(s.maxHp, s.hp + 10);
    s.storyFlags = { ...s.storyFlags, rescueHeal38: true };
    s.npcStates.eve = 'list_delivered';
  }
  if (lv === 42 && (rescueOf(q) === 'protected' || rescueOf(q) === 'saved_late') && !s.storyFlags.rescuePaid42) {
    s.gold += 12; s.stats.goldEarned += 12;
    s.storyFlags = { ...s.storyFlags, rescuePaid42: true };
  }
}

function grantForgeVoucher(s: GameState, milestone: number) {
  const got = s.forgeVoucherGranted ?? [];
  if (got.includes(milestone)) return;
  s.forgeVoucherGranted = [...got, milestone];
  s.forgeVouchers = (s.forgeVouchers ?? 0) + 1;
}

/** 首领关第一次进入准备：生命低于 40% 则补到 40%。嗜战契约不触发。 */
export function applyBossPrep(s: GameState) {
  if (s.phase !== 'prep' || !isBossLevel(s.level)) return;
  const done = s.bossPrep ?? [];
  if (done.includes(s.level)) return;
  s.bossPrep = [...done, s.level];
  if (s.relics.includes('K02')) return;
  const floorHp = Math.floor(s.maxHp * 0.40);
  if (s.hp < floorHp) s.hp = floorHp;
}

function countWeapons(items: { kind: ItemKind; id: string }[], remove: string[]): number {
  return items.filter(i => !remove.includes(i.id) && (ITEMS[i.kind].category === 'weapon' || ITEMS[i.kind].category === 'needle')).length;
}

function advanceAfterLoot(s: GameState, cleared: number) {
  s.level++;
  s.currentChapter = chapterOf(s.level);
  s.shop = { level: s.level, slots: [], refreshes: 0 }; rollShop(s);
  if ([3, 7, 12, 17, 24, 32].includes(cleared)) s.pendingBagToast = cleared;
  if ((FORGE_VOUCHER_LEVELS as readonly number[]).includes(cleared)) grantForgeVoucher(s, cleared);
  if (campAfterBoss(cleared) && isBossLevel(cleared)) {
    // 章节营地：检查点延后到营地结束
    s.phase = 'camp'; s.campKind = 'chapter';
    s.campServiceUsed = false;
    s.pendingCheckpointAfterCamp = true;
    // 第40关后营地：专精免费重选一次（候选预生成）
    if (cleared === 40 && s.doctrine && !s.storyFlags.doctrineRerollUsed && !s.doctrineRerollChoices) {
      const r = new Rng(s.rng);
      s.doctrineRerollChoices = pickDoctrineCandidates(() => r.next()).filter(id => id !== s.doctrine).slice(0, 3);
      s.rng = r.state;
    }
  } else if (cleared === 49) {
    // 第49关后：最终整备站（一次服务；商店照常在第50关准备阶段）
    s.phase = 'camp'; s.campKind = 'final';
    s.campServiceUsed = false;
    s.pendingCheckpointAfterCamp = false;
  } else {
    s.phase = 'prep'; s.campKind = null;
    applyBossPrep(s);
    // 非 Boss 清关后：尝试抽一则本章未见表事件（可跳过）
    if (!isBossLevel(cleared) && !s.pendingEventId) {
      const r2 = new Rng(s.rng);
      // 约 55% 触发，保证有事件可测；已见表则跳过
      if (r2.next() < 0.55) {
        const id = pickEvent(() => r2.next(), chapterOf(cleared), s.seenEvents);
        if (id) s.pendingEventId = id;
      }
      s.rng = r2.state;
    }
    s.eliteActive = false;
    maybeOfferSystems(s);
  }
}

export const itemLabel = (i: { kind: ItemKind; level: Level }) => `${ITEMS[i.kind].name} Lv${i.level}`;

export function endingAvailability(s: GameState): Record<EndingId, { ok: boolean; reason?: string }> {
  const ev = evidenceOf(s.questStates);
  return {
    break_bond: { ok: true },
    public_ledger: ev >= PUBLIC_LEDGER_EVIDENCE
      ? { ok: true }
      : { ok: false, reason: `公账需要至少${PUBLIC_LEDGER_EVIDENCE}份证据，当前${ev}份（第19关账页、第23关清单、第30关验证、第39关签名）。` },
    takeover: { ok: true },
  };
}

export class Game {
  constructor(public s: GameState, private onChange: (s: GameState) => void = () => {}) {}
  private commit(r: Result = OK): Result { if (r.ok) this.onChange(this.s); return r; }
  private prepOnly(): Result | null { return this.s.phase === 'prep' ? null : fail('战斗中无法整理背包。'); }
  get bagItems() { return this.s.items.filter(inBag); }
  get tempItems() { return this.s.items.filter(i => !inBag(i)); }
  find(id: string) { return this.s.items.find(i => i.id === id); }
  getLevelDef() { return getLevel(this.s.level); }
  chapterName() {
    const ch = V3_CHAPTERS.find(c => c.id === this.s.currentChapter);
    return ch?.name ?? `第${this.s.currentChapter}章`;
  }

  move(id: string, x: number, y: number, rotated: boolean): Result {
    const g = this.prepOnly(); if (g) return g;
    const it = this.find(id); if (!it) return fail('找不到装备。');
    const rot = ITEMS[it.kind].rotatable ? rotated : false;
    if (!canPlace(this.s.items, this.s.cols, this.s.rows, it.kind, x, y, rot, id)) return fail('这里放不下。');
    it.x = x; it.y = y; it.rotated = rot;
    return this.commit();
  }
  toTemp(id: string): Result {
    const g = this.prepOnly(); if (g) return g;
    const it = this.find(id); if (!it) return fail('找不到装备。');
    if (it.kind === 'burden') return fail('负担物必须留在背包中（营地可花15金移除）。');
    it.x = null; it.y = null; return this.commit();
  }
  rotate(id: string): Result {
    const g = this.prepOnly(); if (g) return g;
    const it = this.find(id); if (!it) return fail('找不到装备。');
    if (!ITEMS[it.kind].rotatable) return fail('这件装备无需旋转。');
    if (!inBag(it)) { it.rotated = !it.rotated; return this.commit(); }
    if (!canPlace(this.s.items, this.s.cols, this.s.rows, it.kind, it.x!, it.y!, !it.rotated, id)) return fail('这里放不下，无法原地旋转。');
    it.rotated = !it.rotated; return this.commit();
  }
  merge(sourceId: string, targetId: string): Result {
    const g = this.prepOnly(); if (g) return g;
    const a = this.find(sourceId), b = this.find(targetId);
    if (a?.kind === 'burden' || b?.kind === 'burden') return fail('负担物不可合成。');
    if (a && b && a.kind === b.kind && a.level === b.level && (a.level === 3 || a.level === 4)) {
      return fail(a.level === 4 ? '两件 Lv4 要先确认再赌。' : '两件 Lv3 要先确认再赌。');
    }
    const r = mergeItems(this.s.items, sourceId, targetId);
    if (r.error) return fail(r.error);
    this.s.items = r.items;
    this.s.runes = this.s.runes.map(rn => rn.itemId === sourceId ? { ...rn, itemId: null } : rn);
    return this.commit({ ok: true, msg: `合成成功：${itemLabel(r.result!)}` });
  }
  /** Lv3→Lv4 或 Lv4→Lv5。先改 rng 再改物品，立刻存档。 */
  gambleMerge(sourceId: string, targetId: string): Result {
    const g = this.prepOnly(); if (g) return g;
    const a = this.find(sourceId), b = this.find(targetId);
    if (!a || !b) return fail('找不到装备。');
    if (a.kind === 'burden' || b.kind === 'burden') return fail('负担物不可合成。');
    const check = canMerge(a, b);
    if (!check.ok || !check.gamble) return fail(check.ok ? '这不是对赌合成。' : check.reason);
    if (a.level === 3 && this.s.level <= FORGE_RISK_UNLOCK) return fail(`通关第${FORGE_RISK_UNLOCK}关后才能冒险锻造。`);
    if (a.level === 4 && this.s.level <= FORGE_LEGEND_UNLOCK) return fail(`通关第${FORGE_LEGEND_UNLOCK}关后才能传说锻造。`);
    const worst = a.level === 4 ? [sourceId, targetId] : [sourceId];
    if (countWeapons(this.s.items, worst) < 1 && (ITEMS[a.kind].category === 'weapon' || ITEMS[a.kind].category === 'needle')) {
      return fail('最坏结果会让你没有武器。先留一把备用武器。');
    }
    const odds = a.level === 4 ? LV5_GAMBLE : LV4_GAMBLE;
    const stream = this.s.forgeRng ?? this.s.rng;
    const [roll, next] = nextRandom(stream);
    this.s.forgeRng = next;
    const name = ITEMS[a.kind].name;
    const outcome = gambleOutcome(roll, odds);
    if (outcome === 'loseBoth') {
      this.s.items = this.s.items.filter(i => i.id !== sourceId && i.id !== targetId);
      this.s.runes = this.s.runes.map(rn => (rn.itemId === sourceId || rn.itemId === targetId) ? { ...rn, itemId: null } : rn);
      return this.commit({ ok: true, msg: `赌输了：两件${name}都消失了` });
    }
    this.s.items = this.s.items.filter(i => i.id !== sourceId);
    this.s.runes = this.s.runes.map(rn => rn.itemId === sourceId ? { ...rn, itemId: null } : rn);
    if (outcome === 'success') {
      b.level = (a.level + 1) as Level;
      return this.commit({ ok: true, msg: `赌成了：${name} Lv${b.level}` });
    }
    return this.commit({ ok: true, msg: `赌输了：一件${name}消失了，另一件 Lv${b.level} 还在` });
  }
  /** 两件 Lv3 + 60 金，或一张锻造券。100% 得到 Lv4。 */
  safeForge(sourceId: string, targetId: string): Result {
    const g = this.prepOnly(); if (g) return g;
    const a = this.find(sourceId), b = this.find(targetId);
    if (!a || !b) return fail('找不到装备。');
    const check = canMerge(a, b);
    if (!check.ok || !check.gamble || a.level !== 3) return fail(check.ok ? '稳妥锻造只接受两件 Lv3。' : check.reason);
    if (this.s.level <= FORGE_RISK_UNLOCK) return fail(`通关第${FORGE_RISK_UNLOCK}关后才能稳妥锻造。`);
    const vouchers = this.s.forgeVouchers ?? 0;
    if (vouchers <= 0 && !canAfford(this.s.gold, FORGE_SAFE_COST)) return fail(`稳妥锻造需要 ${FORGE_SAFE_COST} 金币或一张锻造券。`);
    if (vouchers > 0) this.s.forgeVouchers = vouchers - 1;
    else this.s.gold -= FORGE_SAFE_COST;
    this.s.items = this.s.items.filter(i => i.id !== sourceId);
    this.s.runes = this.s.runes.map(rn => rn.itemId === sourceId ? { ...rn, itemId: null } : rn);
    b.level = 4;
    const paid = vouchers > 0 ? '用掉锻造券' : `-${FORGE_SAFE_COST}金`;
    return this.commit({ ok: true, msg: `稳妥锻成：${ITEMS[b.kind].name} Lv4（${paid}）` });
  }
  sell(id: string): Result {
    const g = this.prepOnly(); if (g) return g;
    const it = this.find(id); if (!it) return fail('找不到装备。');
    if (it.kind === 'burden') return fail('负担物不可出售，请使用营地「移除负担」或相关事件。');
    this.s.items = this.s.items.filter(i => i.id !== id);
    this.s.runes = this.s.runes.map(rn => rn.itemId === id ? { ...rn, itemId: null } : rn);
    const p = sellPrice(it.kind, it.level); this.s.gold += p;
    return this.commit({ ok: true, msg: `出售获得 ${p} 金币` });
  }
  addTemp(kind: ItemKind, level: Level): ItemInstance {
    const it: ItemInstance = { id: 'i' + this.s.nextId++, kind, level, x: null, y: null, rotated: false };
    this.s.items.push(it); return it;
  }
  buy(slot: number): Result {
    const g = this.prepOnly(); if (g) return g;
    const sl = this.s.shop.slots[slot]; if (!sl) return fail('没有这件商品。');
    if (sl.bought) return fail('本轮已购买过这件商品。');
    let p = buyPrice(sl.kind, sl.level, this.s.heroClass);
    if (this.s.relics.includes('C09')) p = Math.ceil(p * 0.9);
    if (this.s.relics.includes('K03')) p = Math.ceil(p * 1.2);
    const burTax = this.s.items.filter(i => i.kind === 'burden').reduce((a, i) => a + (i.burdenShopPct ?? 0), 0);
    if (burTax) p = Math.max(1, Math.ceil(p * (1 + burTax / 100)));
    if (!canAfford(this.s.gold, p)) return fail('金币不足。');
    this.s.gold -= p; sl.bought = true; this.addTemp(sl.kind, sl.level);
    return this.commit({ ok: true, msg: `购买了${itemLabel(sl)}，已放入临时区` });
  }
  refreshShop(): Result {
    const g = this.prepOnly(); if (g) return g;
    const c = refreshCost(this.s.shop.refreshes, this.s.doctrine, this.s.heroClass, this.s.level);
    if (!canAfford(this.s.gold, c)) return fail('金币不足。');
    this.s.gold -= c; this.s.shop.refreshes++; rollShop(this.s);
    return this.commit();
  }
  expand(sacrificeIds?: string[]): Result {
    const g = this.prepOnly(); if (g) return g;
    const offer = expansionOffer(this.s.expansions);
    if (!offer) return fail('背包已到本局上限。');
    if (this.s.level <= offer.unlockAfterLevel) {
      const what = offer.axis === 'col' ? `第${this.s.cols + 1}列` : `第${this.s.rows + 1}行`;
      return fail(`通关第${offer.unlockAfterLevel}关后可解锁${what}。`);
    }
    const ids = sacrificeIds ?? [];
    if (offer.itemCost) {
      const picked = ids.map(id => this.s.items.find(i => i.id === id));
      if (new Set(ids).size !== ids.length || picked.some(i => !i || !inBag(i) || i.kind === 'burden')) {
        return fail('献祭的装备必须在背包里，且不能重复。');
      }
      const levels = picked.map(i => i!.level);
      const ok = (levels.length === 4 && levels.every(l => l === 3))
        || (levels.length === 2 && levels.every(l => l === 4))
        || (levels.length === 1 && levels[0] === 5);
      if (!ok) return fail('需要 4 件 Lv3，或 2 件 Lv4，或 1 件 Lv5。');
      const drop = new Set(ids);
      this.s.items = this.s.items.filter(i => !drop.has(i.id));
      this.s.runes = this.s.runes.map(rn => (rn.itemId && drop.has(rn.itemId)) ? { ...rn, itemId: null } : rn);
    } else {
      if (ids.length) return fail('这次扩容用金币，不用献祭。');
      if (!canAfford(this.s.gold, offer.cost)) return fail('金币不足。');
      this.s.gold -= offer.cost;
    }
    this.s.expansions++;
    if (offer.axis === 'col') this.s.cols++;
    else this.s.rows++;
    const size = `${this.s.cols}×${this.s.rows}`;
    const paid = offer.itemCost ? '献祭完成' : `${offer.cost}金`;
    const msg = offer.axis === 'col'
      ? `背包扩容！新增第${this.s.cols}列（${size}，${paid}）`
      : `背包扩容！新增第${this.s.rows}行（${size}，${paid}）`;
    return this.commit({ ok: true, msg });
  }

  canStartBattle(): Result {
    if (this.s.phase !== 'prep') return fail('当前不能开始战斗。');
    if (this.tempItems.length > 0) return fail('请先处理临时区装备。');
    if (!this.bagItems.some(i => { const c = ITEMS[i.kind].category; return c === 'weapon' || c === 'needle'; })) return fail('至少装备一把武器才能战斗。');
    if (this.s.pendingRelicChoices?.length) return fail('请先选择遗物。');
    if (this.s.pendingRuneChoices?.length) return fail('请先选择符文。');
    if (this.s.pendingDoctrineChoices?.length) return fail('请先选择战术专精。');
    if (this.s.pendingChoice) return fail('请先做出剧情选择。');
    if (this.s.pendingRoute) return fail('请先选择普通或精英路线。');
    if (this.s.pendingEventId) return fail('请先处理事件（可选择离开）。');
    if (this.s.pendingUpgrade) return fail('请先选择要升级的装备。');
    if (this.s.level === 45 && !this.s.endingChoice) return fail('请先选择最终处置原则。');
    return OK;
  }
  startBattle(): Result {
    const r = this.canStartBattle(); if (!r.ok) return r;
    // 剧情不阻断开战：若仍挂起则记入已读（选择类节点已在 canStartBattle 拦截）
    if (this.s.pendingStoryId) {
      if (!this.s.seenDialogue.includes(this.s.pendingStoryId)) this.s.seenDialogue.push(this.s.pendingStoryId);
      this.s.pendingStoryId = null;
    }
    this.s.phase = 'battle'; this.s.battleToken++;
    return this.commit();
  }
  makeCombat(): CombatState {
    let hp = this.s.hp;
    let maxHp = this.s.maxHp;
    if (this.s.storyFlags.a06Pending) {
      maxHp += 5;
      hp = Math.min(maxHp, hp + 5);
    }
    let lv = { ...getLevel(this.s.level) };
    if (this.s.eliteActive) {
      lv = applyEliteOverlay(lv, this.s.level);
      lv.hp = Math.round(lv.hp * ELITE_HP_MULT);
      lv.mechSummary = (lv.mechSummary ? lv.mechSummary + ' · ' : '') + '精英：生命+25%，胜利金币+40%并额外遗物';
    }
    return createCombat(this.s.items, hp, maxHp, lv, {
      runes: this.s.runes,
      doctrine: this.s.doctrine,
      relics: this.s.relics,
      startGold: this.s.gold,
      heroClass: this.s.heroClass,
    });
  }
  settle(c: CombatState): Result {
    if (this.s.phase !== 'battle' || !c.over) return fail('战斗未结束。');
    if (this.s.settledToken === this.s.battleToken) return fail('已结算。');
    this.s.settledToken = this.s.battleToken;
    const s = this.s; const lv = s.level;
    if (s.storyFlags.a06Pending) s.storyFlags = { ...s.storyFlags, a06Pending: false };
    let bagGold = c.won ? computeBagGold(this.s.items, this.s.runes, this.s.doctrine, this.s.heroClass) : 0;
    if (c.won && bagGold && this.s.relics.includes('C08')) bagGold = Math.floor(bagGold * 1.30);
    if (c.won && bagGold && this.s.relics.includes('K01')) bagGold = Math.floor(bagGold * 1.50);
    const ledgerGold = c.won ? computeLedgerBonus(this.s.items, this.s.gold) : 0;
    let baseGold = c.won ? winGoldFor(lv) + ledgerGold : 0;
    if (c.won && this.s.eliteActive) baseGold = Math.floor(baseGold * ELITE_GOLD_MULT);
    const wd = Object.entries(c.stats.weapon).map(([id, value]) => { const it = this.find(id)!; return { id, label: it ? itemLabel(it) : id === 'poison' ? '毒伤' : id, value }; });
    for (const w of wd) s.stats.contribution[w.label] = (s.stats.contribution[w.label] ?? 0) + w.value;
    if (c.stats.absorbed) s.stats.contribution['盾牌吸收'] = (s.stats.contribution['盾牌吸收'] ?? 0) + c.stats.absorbed;
    if (c.stats.healed) s.stats.contribution['药水治疗'] = (s.stats.contribution['药水治疗'] ?? 0) + c.stats.healed;
    const last: LastBattle = { level: lv, won: c.won, reason: c.reason, time: c.t / 1000, weaponDamage: wd, shieldAbsorb: c.stats.absorbed, potionHeal: c.stats.healed, bagGold, baseGold };
    s.last = last;
    if (!c.won) { s.hp = 0; s.phase = 'defeat'; return this.commit(); }
    s.stats.kills++;
    s.gold += baseGold + bagGold; s.stats.goldEarned += baseGold + bagGold;
    s.hp = Math.min(s.maxHp, c.hp);
    if (s.relics.includes('C10') && !s.relics.includes('K02')) s.hp = Math.min(s.maxHp, s.hp + 8);
    questOnWin(s, lv);
    if (isBossLevel(lv)) queueStoryOnce(s, `boss_post_${chapterOf(lv)}`);
    if (isFinalVictory(lv)) {
      // 终局：先结算，再进结局；只此一次（token 防重）
      s.completion = {
        type: s.mode === 'ironman' ? 'ironman' : s.assistanceUsed ? 'assisted' : 'pure',
        ending: s.endingChoice, retries: s.retryCount, level: lv,
      };
      if (s.endingChoice && ENDING_CHOICES[s.endingChoice as EndingId]) queueStoryOnce(s, `ending_${s.endingChoice}`);
      // finale 文本按支线在 UI 解析；此处只入日志 id
      s.phase = 'victory'; return this.commit();
    }
    if (isMidAct(lv)) {
      s.storyFlags = { ...s.storyFlags, midActSeen: true };
      queueStoryOnce(s, MID_ACT_STORY.id);
    }
    if (!s.relics.includes('K02')) s.hp = Math.min(s.maxHp, s.hp + winHealAmount(s.maxHp, isBossLevel(lv)));
    const r = new Rng(s.rng);
    s.loot = { level: lv, options: rollItems(r, lv + 1, 3), claimed: false };
    // 精英胜利：额外遗物三选一（若未满）
    if (s.eliteActive && s.relics.length < MAX_RELICS && !s.pendingRelicChoices) {
      s.pendingRelicChoices = pickRelicCandidates(() => r.next(), s.relics, s.level, 3);
    }
    s.rng = r.state;
    s.phase = 'loot';
    return this.commit();
  }
  /** 结局只读：重复进入只展示，不改状态、不发奖 */
  viewEnding(): { ending: string | null; completion: GameState['completion'] } {
    return { ending: this.s.endingChoice, completion: this.s.completion };
  }
  claimLoot(idx: number): Result {
    if (this.s.phase !== 'loot' || !this.s.loot || this.s.loot.claimed) return fail('奖励已领取。');
    const o = this.s.loot.options[idx]; if (!o) return fail('无效选择。');
    this.s.loot.claimed = true;
    const it = this.addTemp(o.kind, o.level);
    const cleared = this.s.level;
    advanceAfterLoot(this.s, cleared);
    const midNote = isMidAct(cleared) ? ' 中段折转：王库只是收税站……旅程继续。' : '';
    const campNote = (this.s.phase as string) === 'camp' ? (this.s.campKind === 'final' ? ' 进入最终整备站。' : ' 进入章节营地。') : '';
    return this.commit({ ok: true, msg: `获得${itemLabel(it)}，已放入临时区${midNote}${campNote}` });
  }
  /**
   * 不拿装备：21关前回收2金币；21关后可选“回收4金币”或“休整恢复4生命”（V3 §09），A05 额外+2金币。
   */
  skipLoot(mode: 'recycle' | 'rest' = 'recycle'): Result {
    if (this.s.phase !== 'loot' || !this.s.loot || this.s.loot.claimed) return fail('奖励已领取。');
    this.s.loot.claimed = true;
    const late = this.s.level >= 21;
    let gain = late ? (mode === 'recycle' ? 4 : 0) : 2;
    let heal = late && mode === 'rest' ? 4 : 0;
    if (late && this.s.relics.includes('A05')) gain += 2;
    this.s.gold += gain; this.s.stats.goldEarned += gain;
    if (heal) this.s.hp = Math.min(this.s.maxHp, this.s.hp + heal);
    this.s.stats.contribution['跳过奖励次数'] = (this.s.stats.contribution['跳过奖励次数'] ?? 0) + 1;
    const cleared = this.s.level;
    advanceAfterLoot(this.s, cleared);
    return this.commit({ ok: true, msg: heal ? `休整：恢复${heal}生命${gain ? `，+${gain}金币` : ''}` : `回收物资，获得 ${gain} 金币` });
  }

  /** 选择符文：itemId=null 暂存 */
  chooseRune(runeId: string, itemId: string | null): Result {
    if (!this.s.pendingRuneChoices?.includes(runeId)) return fail('无效符文候选。');
    if (this.s.runes.length >= MAX_RUNES) return fail('符文已满（最多2枚）。');
    if (this.s.runes.some(r => r.runeId === runeId)) return fail('同ID符文不能重复。');
    if (itemId) {
      const it = this.find(itemId);
      if (!it) return fail('找不到装备。');
      if (!runeLegalForItem(runeId as RuneId, it.kind)) return fail('该符文不能附着到此装备。');
      if (this.s.runes.some(r => r.itemId === itemId)) return fail('同一装备最多1枚符文。');
    }
    const inst: RuneInstance = { runeId, itemId };
    this.s.runes.push(inst);
    this.s.pendingRuneChoices = null;
    if (this.s.level === 21) this.s.storyFlags = { ...this.s.storyFlags, runeTutorialDone: true };
    if (this.s.level === 31) this.s.storyFlags = { ...this.s.storyFlags, runeSlot2Done: true };
    const name = RUNES[runeId as RuneId]?.name ?? runeId;
    return this.commit({ ok: true, msg: itemId ? `铭刻【${name}】已附着` : `铭刻【${name}】已暂存（未生效）` });
  }
  /** 准备阶段花5金币把符文转移到另一件合法装备（V3 §11） */
  moveRune(runeId: string, itemId: string | null): Result {
    const g = this.prepOnly(); if (g) return g;
    const rn = this.s.runes.find(r => r.runeId === runeId); if (!rn) return fail('未持有该符文。');
    if (itemId) {
      const it = this.find(itemId); if (!it) return fail('找不到装备。');
      if (!runeLegalForItem(runeId as RuneId, it.kind)) return fail('该符文不能附着到此装备。');
      if (this.s.runes.some(r => r.itemId === itemId && r.runeId !== runeId)) return fail('同一装备最多1枚符文。');
    }
    if (rn.itemId === itemId) return fail('符文已在该装备上。');
    if (!canAfford(this.s.gold, 5)) return fail('金币不足。');
    this.s.gold -= 5; rn.itemId = itemId;
    return this.commit({ ok: true, msg: '符文已转移（-5金）' });
  }

  chooseDoctrine(id: string): Result {
    if (!this.s.pendingDoctrineChoices?.includes(id)) return fail('无效专精候选。');
    if (this.s.doctrine) return fail('已选择战术专精。');
    this.s.doctrine = id as DoctrineId;
    this.s.pendingDoctrineChoices = null;
    return this.commit({ ok: true, msg: `已选定战术专精` });
  }
  /** 第40关后营地：免费重选专精一次（不消耗营地主服务）；id=null 表示保留现有并放弃重选 */
  rerollDoctrine(id: string | null): Result {
    if (this.s.phase !== 'camp' || !this.s.doctrineRerollChoices) return fail('当前没有专精重选机会。');
    if (this.s.storyFlags.doctrineRerollUsed) return fail('专精重选只能使用一次。');
    if (id !== null && !this.s.doctrineRerollChoices.includes(id)) return fail('无效专精候选。');
    if (id) this.s.doctrine = id as DoctrineId;
    this.s.doctrineRerollChoices = null;
    this.s.storyFlags = { ...this.s.storyFlags, doctrineRerollUsed: true };
    return this.commit({ ok: true, msg: id ? '专精已重选' : '保留现有专精' });
  }

  /** 第45关确认终局方案；确认后不可无代价改选 */
  chooseEnding(id: EndingId): Result {
    if (!ENDING_CHOICES[id]) return fail('无效结局选项。');
    if (this.s.endingChoice) return fail('终局方案已确认，不能更改。');
    if (this.s.level !== 45) return fail('终局方案在第45关前确认。');
    const av = endingAvailability(this.s)[id];
    if (!av.ok) return fail(av.reason!);
    this.s.endingChoice = id;
    this.s.storyFlags = { ...this.s.storyFlags, endingChoicePending: false };
    logStory(this.s, `ending_pick_${id}`);
    return this.commit({ ok: true, msg: `已决定：${ENDING_CHOICES[id].title}` });
  }

  /** 支线必经选择 */
  resolveChoice(optionId: string): Result {
    const pc = this.s.pendingChoice; if (!pc) return fail('没有待处理的选择。');
    if (!pc.options.includes(optionId)) return fail('无效选项。');
    const def = QUEST_CHOICES[pc.id as ChoiceId];
    const opt = def.options.find(o => o.id === optionId)!;
    const gold = opt.cost.gold ?? 0, hp = opt.cost.hp ?? 0;
    if (gold && !canAfford(this.s.gold, gold)) return fail('金币不足。');
    if (hp && this.s.hp - hp < 1) return fail('生命不足（支付后须至少剩1）。');
    this.s.gold -= gold; this.s.hp -= hp;
    const q = this.s.questStates;
    const addEv = () => { q.ledgerEvidence = String(evidenceOf(q) + 1); };
    switch (`${pc.id}:${optionId}`) {
      case 'ledger_page:take': addEv(); q.ledger = 'page_taken'; break;
      case 'ledger_page:leave': q.ledger = q.ledger ?? 'anomaly'; break;
      case 'rescue_route:protect': q.rescue = 'protected'; break;
      case 'rescue_route:evidence': q.rescue = 'delayed'; addEv(); break;
      case 'forge_resources:give': q.forge = 'helped'; break;
      case 'forge_resources:keep': q.forge = 'refused'; break;
      case 'evidence_or_rescue:evidence': addEv(); break;
      case 'evidence_or_rescue:rescue': if (rescueOf(q) === 'delayed') q.rescue = 'saved_late'; s_flag(this.s, 'burnedList39'); break;
    }
    q[`choice_${pc.id}`] = optionId;
    this.s.pendingChoice = null;
    logStory(this.s, `choice_${pc.id}_${optionId}`);
    return this.commit({ ok: true, msg: `已选择：${opt.label}` });
  }

  chooseRelic(id: string): Result {
    if (!this.s.pendingRelicChoices?.includes(id)) return fail('无效遗物候选。');
    if (this.s.relics.length >= MAX_RELICS) return fail('遗物已满（最多3件）。');
    if (this.s.relics.includes(id)) return fail('已持有该遗物。');
    this.s.relics.push(id);
    this.s.pendingRelicChoices = null;
    const name = V3_RELICS[id as RelicId]?.name ?? id;
    return this.commit({ ok: true, msg: `获得遗物【${name}】` });
  }
  skipRelic(): Result {
    if (!this.s.pendingRelicChoices?.length) return fail('无遗物可选。');
    this.s.pendingRelicChoices = null;
    return this.commit({ ok: true, msg: '放弃本枚遗物' });
  }

  campRest(): Result {
    if (this.s.phase !== 'camp') return fail('当前不在营地。');
    if (this.s.campServiceUsed) return fail('本次营地主服务已使用。');
    const heal = Math.floor(this.s.maxHp * CAMP_REST_RATE);
    this.s.hp = Math.min(this.s.maxHp, this.s.hp + heal);
    this.s.campServiceUsed = true;
    if (this.s.relics.includes('A06')) this.s.storyFlags = { ...this.s.storyFlags, a06Pending: true };
    const extra = this.s.relics.includes('A06') ? '（修补线：下场+5生命）' : '';
    return this.commit({ ok: true, msg: `休息完毕，恢复${heal}生命。${extra}` });
  }
  forgeCost(itemLevel: number): number {
    if (itemLevel >= 3) return Infinity;
    let c = CAMP_FORGE_COST[itemLevel as 1 | 2];
    // 停炉援助回收：最终整备站锻造免费
    if (this.s.campKind === 'final' && (this.s.questStates.forge === 'stopped_clean')) c = 0;
    return c;
  }
  campForge(itemId: string): Result {
    if (this.s.phase !== 'camp') return fail('当前不在营地。');
    if (this.s.campServiceUsed) return fail('本次营地主服务已使用。');
    const it = this.find(itemId); if (!it) return fail('找不到装备。');
    if (it.level >= 3) return fail('营地最多锻到 Lv3。Lv4 用两件 Lv3 对赌，Lv5 用两件 Lv4 对赌。');
    const cost = this.forgeCost(it.level);
    if (!canAfford(this.s.gold, cost)) return fail('金币不足。');
    this.s.gold -= cost;
    it.level = (it.level + 1) as Level;
    this.s.campServiceUsed = true;
    return this.commit({ ok: true, msg: `锻造完成：${itemLabel(it)}${cost ? `（-${cost}金）` : '（免费）'}` });
  }
  /** 路线：普通 / 精英（仅 eliteChoice 关） */
  chooseRoute(elite: boolean): Result {
    if (!this.s.pendingRoute) return fail('当前无需选择路线。');
    if (!(ELITE_LEVELS as readonly number[]).includes(this.s.level)) return fail('本关无精英分支。');
    this.s.eliteActive = elite;
    this.s.pendingRoute = false;
    this.s.storyFlags = { ...this.s.storyFlags, [`route_${this.s.level}`]: true, [`elite_${this.s.level}`]: elite };
    return this.commit({ ok: true, msg: elite ? '已选择精英路线（生命+25%，金币+40%，额外遗物）' : '已选择普通路线' });
  }

  resolveEvent(optionId: string): Result {
    const id = this.s.pendingEventId; if (!id) return fail('没有待处理的事件。');
    const def = EVENTS[id]; if (!def) return fail('未知事件。');
    const opt = def.options.find(o => o.id === optionId); if (!opt) return fail('无效选项。');
    const gold = opt.cost?.gold ?? 0, hp = opt.cost?.hp ?? 0;
    if (gold && !canAfford(this.s.gold, gold)) return fail('金币不足。');
    if (hp && this.s.hp - hp < 1) return fail('生命不足（支付后须至少剩1）。');
    this.s.gold -= gold; this.s.hp -= hp;
    let msg = `事件【${def.name}】：${opt.label}`;
    for (const ef of opt.effects) {
      const m = this.applyEventEffect(ef);
      if (m.startsWith('!')) return fail(m.slice(1));
      if (m) msg += `；${m}`;
    }
    if (!this.s.seenEvents.includes(id)) this.s.seenEvents.push(id);
    this.s.pendingEventId = null;
    logStory(this.s, `event_${id}_${optionId}`);
    return this.commit({ ok: true, msg });
  }

  private applyEventEffect(ef: EventEffect): string {
    const s = this.s;
    switch (ef.type) {
      case 'noop': return '';
      case 'gold': s.gold += ef.amount; s.stats.goldEarned += ef.amount; return `+${ef.amount}金`;
      case 'heal': {
        const h = Math.min(ef.amount, s.maxHp - s.hp); s.hp += h; return `恢复${h}生命`;
      }
      case 'maxHp': {
        const room = Math.max(0, 20 - s.fixedMaxHpBonus);
        const add = Math.min(ef.amount, room);
        if (!add) return '最大生命已达本局固定增加上限';
        s.fixedMaxHpBonus += add; s.maxHp += add; s.hp += add; return `最大生命+${add}`;
      }
      case 'giveItem': {
        const kind = ef.kind as import('../models/types').ItemKind;
        if (!ITEMS[kind]) return '!无效物品';
        this.addTemp(kind, ef.level ?? 1); return `获得${ITEMS[kind].name}`;
      }
      case 'giveBurden': {
        if (s.items.some(i => i.kind === 'burden')) return '已有负担物，未再添加';
        const spot = findSpot(s.items, s.cols, s.rows, 'burden');
        if (!spot) {
          // 放临时区但标记——规格要求须入背包才算；若放不下则退回
          return '!背包放不下负担物，请先整理';
        }
        const it = { id: 'i' + s.nextId++, kind: 'burden' as const, level: 1 as const, x: spot.x, y: spot.y, rotated: false,
          burdenShopPct: ef.taxShopPct, burdenMaxHpPct: ef.maxHpPct };
        s.items.push(it);
        if (ef.maxHpPct) {
          const cut = Math.max(1, Math.floor(s.maxHp * (1 - ef.maxHpPct / 100)));
          s.maxHp = cut; s.hp = Math.min(s.hp, s.maxHp);
        }
        return '接受负担物';
      }
      case 'removeBurden': {
        const b = s.items.find(i => i.kind === 'burden');
        if (!b) return '没有负担物';
        s.items = s.items.filter(i => i.id !== b.id);
        return '移除负担物';
      }
      case 'upgrade': {
        s.pendingUpgrade = { fromLevel: ef.fromLevel };
        return `请选择一件${ef.fromLevel}级装备升级`;
      }
      case 'flag': {
        s.storyFlags = { ...s.storyFlags, [ef.key]: true };
        if (ef.value !== undefined) s.questStates[ef.key] = ef.value;
        return `标记 ${ef.key}`;
      }
      case 'relicOffer': {
        if (s.relics.length >= MAX_RELICS) return '遗物已满';
        const r = new Rng(s.rng);
        s.pendingRelicChoices = pickRelicCandidates(() => r.next(), s.relics, s.level, 3);
        s.rng = r.state;
        return '打开遗物候选';
      }
      default: return '';
    }
  }

  confirmUpgrade(itemId: string): Result {
    const pu = this.s.pendingUpgrade; if (!pu) return fail('没有待确认的升级。');
    const it = this.find(itemId); if (!it) return fail('找不到装备。');
    if (it.kind === 'burden') return fail('负担物不可升级。');
    if (it.level !== pu.fromLevel) return fail(`请选择${pu.fromLevel}级装备。`);
    if (it.level >= 3) return fail('营地和事件最多升到 Lv3。Lv4 用两件 Lv3 对赌，Lv5 用两件 Lv4 对赌。');
    it.level = (it.level + 1) as Level;
    this.s.pendingUpgrade = null;
    return this.commit({ ok: true, msg: `升级完成：${itemLabel(it)}` });
  }

  skipEvent(): Result {
    if (!this.s.pendingEventId) return fail('没有待处理的事件。');
    return this.resolveEvent('leave');
  }
  skipUpgrade(): Result {
    if (!this.s.pendingUpgrade) return fail('没有待确认的升级。');
    this.s.pendingUpgrade = null;
    return this.commit({ ok: true, msg: '已放弃升级。' });
  }

  campRemoveBurden(): Result {
    if (this.s.phase !== 'camp') return fail('当前不在营地。');
    if (this.s.campServiceUsed) return fail('本次营地主服务已使用。');
    const b = this.s.items.find(i => i.kind === 'burden');
    if (!b) return fail('没有可移除的负担物。');
    const cost = 15;
    if (!canAfford(this.s.gold, cost)) return fail('金币不足（移除负担需15金）。');
    this.s.gold -= cost;
    this.s.items = this.s.items.filter(i => i.id !== b.id);
    this.s.campServiceUsed = true;
    return this.commit({ ok: true, msg: '已支付15金移除负担物。' });
  }
  campLeave(): Result {
    if (this.s.phase !== 'camp') return fail('当前不在营地。');
    const wasFinal = this.s.campKind === 'final';
    if (this.s.doctrineRerollChoices && !this.s.storyFlags.doctrineRerollUsed) {
      // 离开即放弃重选
      this.s.doctrineRerollChoices = null;
      this.s.storyFlags = { ...this.s.storyFlags, doctrineRerollUsed: true };
    }
    this.s.phase = 'prep'; this.s.campKind = null;
    applyBossPrep(this.s);
    if (wasFinal) this.s.storyFlags = { ...this.s.storyFlags, finalPrepDone: true };
    maybeOfferSystems(this.s);
    if (this.s.pendingCheckpointAfterCamp) {
      this.s.pendingCheckpointAfterCamp = false;
      this.s.campServiceUsed = false;
      this.s.assist = null;
      this.s.chapterCheckpoint = snapshotCheckpoint(this.s);
    }
    return this.commit({ ok: true, msg: wasFinal ? '整备完毕，前往黄金心脏。' : '离开营地，继续征途。' });
  }
  dismissStory(): Result {
    const id = this.s.pendingStoryId;
    if (!id) return OK;
    if (!this.s.seenDialogue.includes(id)) this.s.seenDialogue.push(id);
    this.s.pendingStoryId = null;
    return this.commit();
  }

  private restoreFrom(json: string) {
    const keepCp = this.s.chapterCheckpoint;
    const keep = { attemptId: this.s.attemptId, retryCount: this.s.retryCount, assistanceUsed: this.s.assistanceUsed, assist: this.s.assist, seen: this.s.seenDialogue };
    const st = JSON.parse(json) as GameState;
    Object.assign(this.s, st);
    this.s.chapterCheckpoint = keepCp;
    this.s.attemptId = keep.attemptId + 1;
    this.s.retryCount = keep.retryCount + 1;
    this.s.assistanceUsed = keep.assistanceUsed;
    this.s.assist = keep.assist;
    // 剧情已读跨尝试保留（只影响是否弹窗，不影响标记）
    this.s.seenDialogue = Array.from(new Set([...st.seenDialogue, ...keep.seen]));
    this.s.pendingStoryId = null;
    this.s.phase = 'prep';
    this.s.loot = null; this.s.last = null;
  }

  restoreChapterCheckpoint(): Result {
    const s = this.s;
    if (s.mode !== 'story') return fail('单命远征无法回退章节。');
    const cp = s.chapterCheckpoint;
    if (!cp) return fail('尚无章节检查点。');
    if (s.phase !== 'defeat') return fail('仅战败时可回章节起点。');
    if (cp.state) this.restoreFrom(cp.state);
    else {
      // 旧格式检查点（字段式）
      Object.assign(s, {
        level: cp.level, currentChapter: cp.chapter, hp: cp.hp, maxHp: cp.maxHp, gold: cp.gold,
        rows: cp.rows, cols: cp.cols, expansions: cp.expansions, items: JSON.parse(JSON.stringify(cp.items)),
        nextId: cp.nextId, rng: cp.rng, shop: JSON.parse(JSON.stringify(cp.shop)), stats: JSON.parse(JSON.stringify(cp.stats)),
        storyFlags: { ...cp.storyFlags }, questStates: { ...cp.questStates }, npcStates: { ...cp.npcStates },
        runes: JSON.parse(JSON.stringify(cp.runes)), doctrine: cp.doctrine, endingChoice: cp.endingChoice,
        relics: [...(cp.relics ?? [])], pendingRelicChoices: cp.pendingRelicChoices ? [...cp.pendingRelicChoices] : null,
        pendingRuneChoices: cp.pendingRuneChoices ? [...cp.pendingRuneChoices] : null,
        pendingDoctrineChoices: cp.pendingDoctrineChoices ? [...cp.pendingDoctrineChoices] : null,
        campServiceUsed: !!cp.campServiceUsed, pendingCheckpointAfterCamp: false, pendingStoryId: null,
        battleToken: cp.battleToken, settledToken: cp.settledToken, loot: null, last: null, phase: 'prep',
      });
      s.attemptId++; s.retryCount++;
    }
    return this.commit({ ok: true, msg: `已回到第${cp.chapter}章起点（第${cp.level}关）` });
  }

  /**
   * 援助整备（V3 §03）：在检查点原始快照上回满生命 + 一次等价值以内的装备交换（预生成候选，可不换）。
   * 同一检查点的重复援助复用同一援助起点，不叠加。标记 assistanceUsed。
   */
  retryWithAssistance(): Result {
    const s = this.s;
    if (s.mode !== 'story') return fail('单命远征不提供援助。');
    const cp = s.chapterCheckpoint;
    if (!cp?.state) return fail('尚无章节检查点。');
    if (s.phase !== 'defeat') return fail('仅战败时可使用援助整备。');
    if (cp.assistState) {
      this.restoreFrom(cp.assistState);
      // 援助状态（候选/是否已换）随援助起点一起恢复
      const st = JSON.parse(cp.assistState) as GameState;
      s.assist = st.assist ? { ...st.assist } : null;
      s.assistanceUsed = true;
      return this.commit({ ok: true, msg: '已回到援助整备起点（援助不叠加）。' });
    }
    this.restoreFrom(cp.state);
    s.hp = s.maxHp;
    const r = new Rng((cp.rng ^ 0x5a5a5a5a) >>> 0);
    const pool = ITEM_KINDS.filter(k => itemUnlockLevel(k) <= s.level && ITEMS[k].category !== 'bag');
    const options: { kind: ItemKind; level: Level }[] = [];
    while (options.length < 3 && pool.length) options.push({ kind: pool.splice(r.int(pool.length), 1)[0], level: 1 });
    s.assist = { level: s.level, attempt: s.attemptId, options, used: false };
    s.assistanceUsed = true;
    const { chapterCheckpoint: _c, ...rest } = s; void _c;
    cp.assistState = JSON.stringify(rest);
    return this.commit({ ok: true, msg: '援助整备：生命已回满，可进行一次等价值装备交换。' });
  }
  /** 援助交换：用候选替换一件装备，候选基础买价不得高于原装备 */
  assistSwap(itemId: string, optionIdx: number): Result {
    const g = this.prepOnly(); if (g) return g;
    const a = this.s.assist; if (!a || a.used) return fail('没有可用的援助交换。');
    const it = this.find(itemId); if (!it) return fail('找不到装备。');
    const o = a.options[optionIdx]; if (!o) return fail('无效候选。');
    if (buyPrice(o.kind, o.level) > buyPrice(it.kind, it.level)) return fail('候选价值高于原装备，不能交换。');
    const wasIn = inBag(it);
    const x = it.x, y = it.y, rot = it.rotated;
    it.kind = o.kind; it.level = o.level;
    if (wasIn && !canPlace(this.s.items, this.s.cols, this.s.rows, it.kind, x!, y!, rot, it.id)) { it.x = null; it.y = null; }
    // 符文载体不合法 → 暂存，不静默销毁
    for (const rn of this.s.runes) if (rn.itemId === it.id && !runeLegalForItem(rn.runeId as RuneId, it.kind)) rn.itemId = null;
    a.used = true;
    return this.commit({ ok: true, msg: `援助交换：获得${itemLabel(it)}` });
  }

  endCampaign(): Result {
    this.s.phase = 'defeat';
    this.s.chapterCheckpoint = this.s.mode === 'story' ? this.s.chapterCheckpoint : null;
    this.s.storyFlags = { ...this.s.storyFlags, campaignEnded: true };
    return this.commit();
  }
}

function s_flag(s: GameState, k: string) { s.storyFlags = { ...s.storyFlags, [k]: true }; }
