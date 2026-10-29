/**
 * 真实动作策略驱动：只调用 Game 公开动作（商店/合成/摆放/领奖/营地/遗物/符文/专精/支线/结局/重试）。
 * 不修改玩家规则、不白送装备。供 sim、跑局记录与节点集成测试共用。
 */
import { EVENTS } from '../src/config/v3/events';
import { ITEMS } from '../src/config/items';
import { V3_RELICS } from '../src/config/v3/relics';
import { runeLegalForItem, type RuneId } from '../src/config/v3/runes';
import type { HeroClass, ItemInstance, ItemKind } from '../src/models/types';
import { simulate } from '../src/systems/combat';
import { FORGE_SAFE_COST } from '../src/config/economy';
import { buyPrice, expansionCost, refreshCost, sellPrice } from '../src/systems/economy';
import { Game, endingAvailability, newGameState } from '../src/systems/game';
import { canMerge } from '../src/systems/merge';
import { canPlace, findSpot, inBag, occupiedCells } from '../src/systems/placement';

export interface Strategy {
  id: string;
  name: string;
  heroClass: HeroClass;
  /** 想要的装备，按优先级 */
  want: ItemKind[];
  /** 21关后追加想要的 */
  wantLate: ItemKind[];
  relicPref: string[];
  runePref: string[];
  doctrinePref: string[];
  /** 支线偏好 */
  choices: Record<string, string>;
  /** 营地：hp 比例低于此值休息，否则锻造 */
  restBelow: number;
  /** 是否用营地/遗物/符文（弱策略对照） */
  smart: boolean;
  /** 每类至少保留几件（不被腾位卖掉，缺则优先买） */
  keep?: Partial<Record<ItemKind, number>>;
}

export const STRATEGIES: Strategy[] = [
  {
    id: 'adjacency', name: '武器邻接流（游侠）', heroClass: 'ranger',
    want: ['dagger', 'ruby', 'shield', 'potion'], wantLate: ['spear', 'ruby', 'dagger'],
    relicPref: ['A07', 'A02', 'C10', 'A01', 'A04', 'A12', 'A11'],
    runePref: ['U01', 'U03', 'U08', 'U02'], doctrinePref: ['T02', 'T01'],
    choices: { ledger_page: 'take', rescue_route: 'evidence', forge_resources: 'give', evidence_or_rescue: 'evidence' },
    restBelow: 0.65, smart: true, keep: { shield: 2, potion: 1 },
  },
  {
    id: 'shield', name: '护盾/恢复流（守卫）', heroClass: 'guard',
    want: ['greatsword', 'shield', 'potion', 'ruby'], wantLate: ['fold_wall', 'travel_lamp', 'shield', 'greatsword'],
    relicPref: ['A08', 'A01', 'A06', 'C10', 'A10', 'A04', 'A02'],
    runePref: ['U04', 'U05', 'U01', 'U02'], doctrinePref: ['T03', 'T04'],
    choices: { ledger_page: 'leave', rescue_route: 'protect', forge_resources: 'give', evidence_or_rescue: 'rescue' },
    restBelow: 0.8, smart: true, keep: { shield: 2, potion: 2, greatsword: 1 },
  },
  {
    id: 'poison_econ', name: '毒/经济流（商旅）', heroClass: 'merchant',
    want: ['moneybag', 'dagger', 'shield', 'ruby', 'potion'], wantLate: ['poison_needle', 'emergency_ledger', 'dagger', 'ruby'],
    relicPref: ['A03', 'A05', 'C10', 'A02', 'A07', 'A10'],
    runePref: ['U06', 'U07', 'U01', 'U03'], doctrinePref: ['T05', 'T06', 'T01'],
    choices: { ledger_page: 'take', rescue_route: 'protect', forge_resources: 'keep', evidence_or_rescue: 'evidence' },
    restBelow: 0.7, smart: true, keep: { shield: 2, potion: 1, poison_needle: 2 },
  },
  {
    id: 'greatsword_gem', name: '重刃宝石（守卫）', heroClass: 'guard',
    want: ['greatsword', 'ruby', 'potion', 'shield'], wantLate: ['firework_crossbow', 'greatsword', 'ruby'],
    relicPref: ['A07', 'A11', 'A02', 'C10', 'A08'],
    runePref: ['U01', 'U02', 'U08', 'U04'], doctrinePref: ['T01', 'T03'],
    choices: { ledger_page: 'take', rescue_route: 'evidence', forge_resources: 'give', evidence_or_rescue: 'evidence' },
    restBelow: 0.7, smart: true, keep: { shield: 1, potion: 1 },
  },
  {
    id: 'naive', name: '弱策略对照（商旅，不用营地/遗物/符文偏好）', heroClass: 'merchant',
    want: ['dagger', 'shield', 'potion', 'greatsword'], wantLate: [],
    relicPref: [], runePref: [], doctrinePref: [],
    choices: {}, restBelow: 0, smart: false,
  },
];

const cat = (k: ItemKind) => ITEMS[k].category;
const isWeapon = (k: ItemKind) => cat(k) === 'weapon' || cat(k) === 'needle';

function mergeAll(g: Game) {
  let did = true;
  while (did) {
    did = false;
    const its = [...g.s.items].sort((a, b) => (inBag(a) ? 0 : 1) - (inBag(b) ? 0 : 1));
    outer: for (const a of its) for (const b of its) if (canMerge(a, b).ok) {
      const tgt = inBag(a) ? a : b, src = tgt === a ? b : a;
      if (g.merge(src.id, tgt.id).ok) { did = true; break outer; }
    }
  }
}
function placeGem(g: Game, id: string): boolean {
  const it = g.find(id)!;
  const weapons = g.bagItems.filter(w => isWeapon(w.kind));
  for (const w of weapons) for (const c of occupiedCells(w.kind, w.x!, w.y!, w.rotated))
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]])
      if (canPlace(g.s.items, g.s.cols, g.s.rows, it.kind, c.x + dx, c.y + dy, false, id)) return g.move(id, c.x + dx, c.y + dy, false).ok;
  return false;
}
function value(it: ItemInstance, want: ItemKind[]): number {
  const w = want.indexOf(it.kind);
  return buyPrice(it.kind, it.level) * (w < 0 ? 0.4 : 1 + (want.length - w) * 0.15);
}
/** 摆放：合成→宝石贴武器→其余找位；放不下时卖掉背包里价值最低的非武器件腾位（只限一次），仍放不下就卖临时件 */
function arrange(g: Game, want: ItemKind[], keep: Partial<Record<ItemKind, number>> = {}) {
  mergeAll(g);
  const temps = [...g.tempItems].sort((a, b) => value(b, want) - value(a, want));
  for (const it of temps) {
    if (!g.find(it.id) || inBag(it)) continue;
    if (it.kind === 'ruby' && placeGem(g, it.id)) continue;
    let sp = findSpot(g.s.items, g.s.cols, g.s.rows, it.kind, it.id);
    if (!sp && value(it, want) > 0) {
      const victims = g.bagItems.filter(b => b.id !== it.id && value(b, want) < value(it, want) && !(isWeapon(b.kind) && g.bagItems.filter(x => isWeapon(x.kind)).length <= 1) && !(keep[b.kind] && g.bagItems.filter(x => x.kind === b.kind).length <= keep[b.kind]! && b.kind !== it.kind))
        .sort((a, b) => value(a, want) - value(b, want));
      for (const v of victims) {
        g.toTemp(v.id);
        sp = findSpot(g.s.items, g.s.cols, g.s.rows, it.kind, it.id);
        if (sp) break;
      }
    }
    if (sp) g.move(it.id, sp.x, sp.y, sp.rotated);
  }
  mergeAll(g);
  for (const it of g.tempItems) { const sp = findSpot(g.s.items, g.s.cols, g.s.rows, it.kind, it.id); if (sp) g.move(it.id, sp.x, sp.y, sp.rotated); }
  for (const it of g.tempItems) g.sell(it.id);
}

/** 专家按职业花钱。商旅留两只钱袋并多刷新；守卫优先锻盾且至少留两面在跳；游侠优先锻匕首，不把盾合成掉。 */
function expertEconomy(g: Game, st: Strategy) {
  const s = g.s;
  const keepBags = st.heroClass === 'merchant' ? 1 : 0;
  if (s.level >= 8) {
    const bags = g.bagItems.filter(i => i.kind === 'moneybag').sort((a, b) => a.level - b.level);
    for (let i = 0; i < bags.length - keepBags; i++) g.sell(bags[i].id);
  }
  if (st.heroClass === 'merchant' && s.gold >= 14 + refreshCost(s.shop.refreshes, s.doctrine, s.heroClass, s.level)) {
    g.refreshShop();
  }
  const held = s.items.reduce((m, it) => it.kind === 'luck_charm' ? Math.max(m, it.level) : m, 0);
  if (g.bagItems.some(i => i.kind === 'shield' || i.kind === 'fold_wall')) {
    const idx = s.shop.slots.findIndex(sl => !sl.bought && sl.kind === 'luck_charm' && sl.level > held);
    if (idx >= 0) {
      const sl = s.shop.slots[idx];
      if (s.gold - buyPrice(sl.kind, sl.level, s.heroClass) >= 8) g.buy(idx);
    }
  }
  arrange(g, st.want, st.keep);
  // 两件同时出手通常比合成一件更赚。只在格子快满时，把职业主装备稳妥合成来腾位。
  const free = s.cols * s.rows - g.bagItems.length;
  if (s.level > 12 && free <= 3) {
    const prefer = st.heroClass === 'guard' ? 'shield' : st.heroClass === 'ranger' ? 'dagger' : 'dagger';
    const pair = g.bagItems.filter(i => i.kind === prefer && i.level === 3);
    if (pair.length >= 3 && ((s.forgeVouchers ?? 0) > 0 || s.gold >= FORGE_SAFE_COST + 8)) {
      g.safeForge(pair[0].id, pair[1].id);
    }
  }
}

export interface ChapterLine { chapter: number; level: number; hp: number; maxHp: number; gold: number; retries: number }
export interface RunRecord {
  strategy: string; strategyName: string; seed: number; heroClass: HeroClass; mode: 'story' | 'ironman';
  starter: string[];
  result: 'victory' | 'defeat';
  reached: number;
  retries: number; deaths: number[]; assistanceUsed: boolean;
  completion: string | null;
  relics: string[]; runes: string[]; doctrine: string | null; doctrineRerolled: boolean;
  camps: string[]; choices: Record<string, string>; ending: string | null;
  chapters: ChapterLine[];
  goldCurve: number[];
  skipLoot21: number; loot21: number;
  buildChanges21: number;
  bossResults: Record<number, { win: number; loss: number }>;
  wallMs: number;
}

export interface RunOpts {
  mode?: 'story' | 'ironman'; maxRetries?: number; assistAfter?: number; untilLevel?: number; game?: Game;
  stopWhen?: (g: Game) => boolean;
  /** 专家：卖掉多余钱袋、补幸运符、有券或金币时稳妥锻造 */
  forge?: boolean;
  onFight?: (info: { won: boolean; level: number; hp: number; maxHp: number }) => void;
}

export function playStrategy(st: Strategy, seed: number, opts: RunOpts = {}): RunRecord {
  const t0 = Date.now();
  const g = opts.game ?? new Game(newGameState(seed, { heroClass: st.heroClass, mode: opts.mode ?? 'story' }));
  const rec: RunRecord = {
    strategy: st.id, strategyName: st.name, seed, heroClass: st.heroClass, mode: g.s.mode,
    starter: g.s.items.map(i => ITEMS[i.kind].name), result: 'defeat', reached: 0, retries: 0, deaths: [],
    assistanceUsed: false, completion: null, relics: [], runes: [], doctrine: null, doctrineRerolled: false,
    camps: [], choices: {}, ending: null, chapters: [], goldCurve: [], skipLoot21: 0, loot21: 0, buildChanges21: 0,
    bossResults: {}, wallMs: 0,
  };
  const maxRetries = opts.maxRetries ?? 15;
  const assistAfter = opts.assistAfter ?? 2;
  let chapterRetries = 0;
  let lastSig = '';
  const sig = () => g.bagItems.map(i => `${i.kind}${i.level}`).sort().join(',') + '|' + g.s.runes.map(r => r.runeId + r.itemId).join(',') + '|' + g.s.doctrine;
  let guard = 0;
  while (g.s.phase !== 'victory' && guard++ < 5000) {
    if (opts.stopWhen?.(g)) break;
    const s = g.s;
    const want = s.level >= 21 && st.wantLate.length ? [...st.wantLate, ...st.want] : st.want;
    if (s.phase === 'defeat') {
      rec.deaths.push(s.last?.level ?? s.level);
      const b = s.last?.level ?? 0;
      if (b && b % 5 === 0) { rec.bossResults[b] ??= { win: 0, loss: 0 }; rec.bossResults[b].loss++; }
      if (s.mode !== 'story' || rec.retries >= maxRetries) break;
      rec.retries++; chapterRetries++;
      const r = chapterRetries > assistAfter ? g.retryWithAssistance() : g.restoreChapterCheckpoint();
      if (!r.ok) break;
      if (g.s.assist && !g.s.assist.used) {
        // 用援助候选替换价值最低且可替换的一件
        const cands = g.bagItems.map(it => ({ it, idx: g.s.assist!.options.findIndex(o => buyPrice(o.kind, o.level) <= buyPrice(it.kind, it.level) && want.includes(o.kind) && !want.includes(it.kind)) })).filter(x => x.idx >= 0);
        if (cands.length) g.assistSwap(cands[0].it.id, cands[0].idx);
      }
      continue;
    }
    if (s.phase === 'prep') {
      if (s.pendingStoryId) g.dismissStory();
      if (s.pendingRoute) g.chooseRoute(false); // 仿真默认普通路线（精英另测）
      if (s.pendingEventId) {
        const def = EVENTS[s.pendingEventId];
        let picked = false;
        if (def) {
          for (const o of def.options) {
            if (o.id === 'leave') continue;
            const needG = o.cost?.gold ?? 0, needH = o.cost?.hp ?? 0;
            if (needG && s.gold < needG) continue;
            if (needH && s.hp - needH < 1) continue;
            // 负担：仿真跳过（避免卡背包）
            if (o.effects.some(e => e.type === 'giveBurden')) continue;
            if (g.resolveEvent(o.id).ok) { picked = true; break; }
          }
        }
        if (!picked && s.pendingEventId) g.skipEvent();
      }
      if (s.pendingUpgrade) {
        const cand = s.items.find(i => i.kind !== 'burden' && i.level === s.pendingUpgrade!.fromLevel);
        if (cand) g.confirmUpgrade(cand.id); else g.skipUpgrade();
      }
      if (s.pendingChoice) {
        const pref = st.choices[s.pendingChoice.id];
        const opts2 = pref ? [pref, ...s.pendingChoice.options] : [...s.pendingChoice.options].reverse();
        for (const o of opts2) if (g.resolveChoice(o).ok) { rec.choices[`L${s.level}:${Object.keys(rec.choices).length}`] = o; break; }
        if (s.pendingChoice) g.resolveChoice(s.pendingChoice.options[s.pendingChoice.options.length - 1]);
      }
      if (s.pendingRelicChoices?.length) {
        const c = s.pendingRelicChoices;
        const pick = st.smart ? st.relicPref.find(id => c.includes(id)) ?? c.find(id => V3_RELICS[id as keyof typeof V3_RELICS]?.implemented) : undefined;
        if (pick) g.chooseRelic(pick); else g.skipRelic();
      }
      if (s.pendingRuneChoices?.length) {
        const c = s.pendingRuneChoices;
        const ordered = [...st.runePref.filter(x => c.includes(x)), ...c];
        let done = false;
        for (const rid of ordered) {
          const targets = [...g.bagItems].filter(i => runeLegalForItem(rid as RuneId, i.kind) && !s.runes.some(r => r.itemId === i.id))
            .sort((a, b) => b.level - a.level || buyPrice(b.kind, 1) - buyPrice(a.kind, 1));
          if (targets.length && g.chooseRune(rid, targets[0].id).ok) { done = true; break; }
        }
        if (!done) g.chooseRune(c[0], null);
      }
      if (s.pendingDoctrineChoices?.length) {
        const c = s.pendingDoctrineChoices;
        g.chooseDoctrine(st.doctrinePref.find(x => c.includes(x)) ?? c[0]);
      }
      if (s.level === 45 && !s.endingChoice) {
        const av = endingAvailability(s);
        g.chooseEnding(av.public_ledger.ok ? 'public_ledger' : st.id === 'adjacency' ? 'takeover' : 'break_bond');
      }
      // 暂存符文：若有合法载体则付5金附着
      for (const rn of s.runes.filter(r => !r.itemId)) {
        const t = g.bagItems.find(i => runeLegalForItem(rn.runeId as RuneId, i.kind) && !s.runes.some(r => r.itemId === i.id));
        if (t && s.gold >= 5) g.moveRune(rn.runeId, t.id);
      }
      // 扩容
      const c = expansionCost(s.expansions);
      if (c !== null && s.gold >= c + 8 && s.level >= 3) g.expand();
      // 商店
      const keepGold = s.level >= 45 ? 0 : 6;
      for (let pass = 0; pass < 3; pass++) {
        s.shop.slots.forEach((sl, i) => {
          const need = (st.keep?.[sl.kind] ?? 0) > s.items.filter(x => x.kind === sl.kind).length;
          if (sl.bought || (!want.includes(sl.kind) && !need)) return;
          if (sl.kind === 'moneybag' && (s.items.filter(x => x.kind === 'moneybag').length >= 3 || s.level >= 30)) return;
          if (s.gold - buyPrice(sl.kind, sl.level, s.heroClass) >= keepGold) g.buy(i);
        });
        arrange(g, want, st.keep);
        if (s.gold >= 20 + refreshCost(s.shop.refreshes, s.doctrine, s.heroClass)) g.refreshShop(); else break;
      }
      arrange(g, want, st.keep);
      if (opts.forge) expertEconomy(g, st);
      // 经济流后期把钱袋换成战力
      if (st.id === 'poison_econ' && s.level >= 36) for (const m of g.bagItems.filter(i => i.kind === 'moneybag' && i.level < 3)) { g.sell(m.id); arrange(g, want, st.keep); }
      const now = sig();
      if (s.level > 21 && lastSig && now !== lastSig) rec.buildChanges21++;
      lastSig = now;
      rec.goldCurve.push(s.gold);
      const r = g.startBattle();
      if (!r.ok) { arrange(g, want, st.keep); if (!g.startBattle().ok) break; }
    } else if (s.phase === 'battle') {
      const c = g.makeCombat(); simulate(c);
      opts.onFight?.({ won: c.won, level: s.level, hp: c.hp, maxHp: c.maxHp });
      g.settle(c);
      const lv = g.s.last!.level;
      rec.reached = Math.max(rec.reached, c.won ? lv : lv - 1);
      if (c.won && lv % 5 === 0) { rec.bossResults[lv] ??= { win: 0, loss: 0 }; rec.bossResults[lv].win++; }
    } else if (s.phase === 'loot') {
      const opts2 = s.loot!.options;
      let idx = -1;
      for (const k of want) { idx = opts2.findIndex(o => o.kind === k); if (idx >= 0) break; }
      if (s.level >= 21) {
        if (idx < 0) { rec.skipLoot21++; g.skipLoot(s.hp < s.maxHp * 0.7 ? 'rest' : 'recycle'); }
        else { rec.loot21++; g.claimLoot(idx); }
      } else g.claimLoot(idx < 0 ? 0 : idx);
    } else if (s.phase === 'camp') {
      const kind = s.campKind;
      if (s.doctrineRerollChoices) {
        const better = st.doctrinePref.find(x => s.doctrineRerollChoices!.includes(x) && st.doctrinePref.indexOf(x) < st.doctrinePref.indexOf(s.doctrine ?? ''));
        g.rerollDoctrine(better ?? null);
        if (better) rec.doctrineRerolled = true;
      }
      let act = 'leave';
      if (st.smart) {
        if (s.items.some(i => i.kind === 'burden') && s.gold >= 15 && !s.campServiceUsed && g.campRemoveBurden().ok) act = 'burden';
        else if (s.hp < s.maxHp * st.restBelow) { if (g.campRest().ok) act = 'rest'; }
        else {
          const cand = g.bagItems.filter(i => i.level < 3 && s.gold >= g.forgeCost(i.level))
            .sort((a, b) => (isWeapon(b.kind) ? 1 : 0) - (isWeapon(a.kind) ? 1 : 0) || a.level - b.level || buyPrice(b.kind, 1) - buyPrice(a.kind, 1));
          if (cand.length && g.campForge(cand[0].id).ok) act = `forge:${ITEMS[cand[0].kind].name}`;
          else if (g.campRest().ok) act = 'rest';
        }
      }
      rec.camps.push(`${kind === 'final' ? 'L49整备' : `L${s.level - 1}营地`}:${act}`);
      g.campLeave();
      chapterRetries = 0;
      rec.chapters.push({ chapter: g.s.currentChapter - (kind === 'final' ? 0 : 1), level: g.s.level - 1, hp: g.s.hp, maxHp: g.s.maxHp, gold: g.s.gold, retries: rec.retries });
    }
    if (opts.untilLevel && g.s.level > opts.untilLevel && g.s.phase === 'prep') break;
  }
  if (g.s.phase === 'victory') {
    rec.result = 'victory'; rec.reached = 50;
    rec.chapters.push({ chapter: 10, level: 50, hp: g.s.hp, maxHp: g.s.maxHp, gold: g.s.gold, retries: rec.retries });
  }
  rec.assistanceUsed = g.s.assistanceUsed;
  rec.completion = g.s.completion?.type ?? null;
  rec.relics = [...g.s.relics]; rec.runes = g.s.runes.map(r => r.runeId + (r.itemId ? '' : '(暂存)'));
  rec.doctrine = g.s.doctrine; rec.ending = g.s.endingChoice;
  rec.wallMs = Date.now() - t0;
  (rec as any).game = g;
  return rec;
}
