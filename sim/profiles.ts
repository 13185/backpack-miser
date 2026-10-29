/**
 * 三种玩家，都只走公开动作，种子固定，一命（战败即停，不回档）。
 * lazy：随机买付得起的东西，合成碰巧相同的，不扩容、不锻造、不贴宝石。
 * mid：只买武器/盾/药，合成，钱多了才扩容，不锻造、不贴宝石。
 * expert：现有聪明策略 + 卖掉多余钱袋、补幸运符、稳妥锻造。
 */
import { EVENTS } from '../src/config/v3/events';
import { ITEMS } from '../src/config/items';
import type { HeroClass, ItemKind } from '../src/models/types';
import { simulate } from '../src/systems/combat';
import { buyPrice, expansionCost } from '../src/systems/economy';
import { Game, newGameState } from '../src/systems/game';
import { canMerge } from '../src/systems/merge';
import { findSpot, inBag } from '../src/systems/placement';
import { STRATEGIES, playStrategy, type Strategy } from './driver';

export interface FightMargin { level: number; ratio: number; won: boolean }
export interface ProfileRun {
  profile: 'lazy' | 'mid' | 'expert';
  cls: HeroClass;
  seed: number;
  /** 战败界面上的关卡；通关为 51 */
  deathLevel: number;
  cleared: number;
  win: boolean;
  gold: number;
  earned: number;
  margins: FightMargin[];
}

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function mergeCasual(g: Game, maxLevel: number) {
  let guard = 0;
  while (guard++ < 40) {
    const its = g.s.items;
    let did = false;
    for (const a of its) for (const b of its) {
      if (a.id === b.id || a.level >= maxLevel) continue;
      const c = canMerge(a, b);
      if (!c.ok || c.gamble) continue;
      const src = inBag(a) ? b : a;
      const tgt = src === a ? b : a;
      if (g.merge(src.id, tgt.id).ok) { did = true; break; }
    }
    if (!did) break;
  }
}

function dumpTemp(g: Game) {
  for (const it of [...g.tempItems]) {
    const sp = findSpot(g.s.items, g.s.cols, g.s.rows, it.kind, it.id);
    if (sp) g.move(it.id, sp.x, sp.y, sp.rotated);
  }
  for (const it of [...g.tempItems]) g.sell(it.id);
}

function drain(g: Game, mode: 'lazy' | 'mid') {
  const s = g.s;
  if (s.pendingStoryId) g.dismissStory();
  if (s.pendingRoute) g.chooseRoute(false);
  if (s.pendingEventId) {
    if (mode === 'mid') {
      const def = EVENTS[s.pendingEventId];
      let picked = false;
      if (def) for (const o of def.options) {
        if (o.id === 'leave') continue;
        if (o.effects.some(e => e.type === 'giveBurden')) continue;
        const needG = o.cost?.gold ?? 0, needH = o.cost?.hp ?? 0;
        if (needG && s.gold < needG) continue;
        if (needH && s.hp - needH < 1) continue;
        if (g.resolveEvent(o.id).ok) { picked = true; break; }
      }
      if (!picked && g.s.pendingEventId) g.skipEvent();
    } else if (g.s.pendingEventId) g.skipEvent();
  }
  if (g.s.pendingUpgrade) {
    const pu = g.s.pendingUpgrade;
    const cand = g.s.items.find(i => i.kind !== 'burden' && i.level === pu.fromLevel);
    if (cand) g.confirmUpgrade(cand.id); else g.skipUpgrade();
  }
  if (g.s.pendingChoice) {
    const opts = g.s.pendingChoice.options;
    g.resolveChoice(opts[opts.length - 1]);
  }
  if (g.s.pendingRelicChoices?.length) {
    if (mode === 'mid') g.chooseRelic(g.s.pendingRelicChoices[0]);
    else g.skipRelic();
  }
  if (g.s.pendingRuneChoices?.length) g.chooseRune(g.s.pendingRuneChoices[0], null);
  if (g.s.pendingDoctrineChoices?.length) g.chooseDoctrine(g.s.pendingDoctrineChoices[0]);
  if (g.s.doctrineRerollChoices) g.rerollDoctrine(null);
}

const MID_WANT: Record<HeroClass, ItemKind[]> = {
  merchant: ['dagger', 'shield', 'potion', 'greatsword'],
  guard: ['greatsword', 'shield', 'potion', 'dagger'],
  ranger: ['dagger', 'shield', 'potion', 'ruby'],
};

function playCasual(profile: 'lazy' | 'mid', cls: HeroClass, seed: number): ProfileRun {
  const g = new Game(newGameState(seed, { heroClass: cls }));
  const roll = rng(seed * 997 + (cls === 'guard' ? 3 : cls === 'ranger' ? 5 : 1));
  const margins: FightMargin[] = [];
  let guard = 0;
  while (g.s.phase !== 'victory' && g.s.phase !== 'defeat' && guard++ < 4000) {
    const s = g.s;
    if (s.phase === 'prep') {
      drain(g, profile);
      if (profile === 'lazy') {
        for (let i = 0; i < g.s.shop.slots.length; i++) {
          const sl = g.s.shop.slots[i];
          if (sl.bought) continue;
          if (roll() > 0.62) continue;
          if (g.s.gold >= buyPrice(sl.kind, sl.level)) g.buy(i);
        }
        mergeCasual(g, 3);
        dumpTemp(g);
      } else {
        const want = MID_WANT[cls];
        for (let i = 0; i < g.s.shop.slots.length; i++) {
          const sl = g.s.shop.slots[i];
          if (sl.bought || !want.includes(sl.kind) || sl.level > 1) continue;
          if (g.s.gold - buyPrice(sl.kind, sl.level) >= 4) g.buy(i);
        }
        mergeCasual(g, 2);
        dumpTemp(g);
        const cost = expansionCost(g.s.expansions);
        if (cost != null && g.s.gold >= cost + 36 && g.s.level > 6) g.expand();
      }
      if (!g.startBattle().ok) {
        dumpTemp(g);
        if (!g.startBattle().ok) break;
      }
    } else if (s.phase === 'battle') {
      const c = g.makeCombat();
      simulate(c);
      margins.push({ level: s.level, ratio: c.maxHp ? c.hp / c.maxHp : 0, won: c.won });
      g.settle(c);
    } else if (s.phase === 'loot') {
      const opts = s.loot!.options;
      let idx = 0;
      if (profile === 'mid') {
        const want = MID_WANT[cls];
        const found = opts.findIndex(o => want.includes(o.kind));
        if (found >= 0) idx = found;
      }
      g.claimLoot(idx);
    } else if (s.phase === 'camp') {
      if (profile === 'mid' && s.hp < s.maxHp * 0.55) g.campRest();
      g.campLeave();
    } else break;
  }
  const win = g.s.phase === 'victory';
  const deathLevel = win ? 51 : (g.s.last?.level ?? g.s.level);
  const cleared = win ? 50 : Math.max(0, deathLevel - 1);
  return {
    profile, cls, seed, deathLevel, cleared, win,
    gold: g.s.gold, earned: g.s.stats.goldEarned, margins,
  };
}

const EXPERT: Record<HeroClass, string> = {
  merchant: 'poison_econ',
  guard: 'shield',
  ranger: 'adjacency',
};

function playExpert(cls: HeroClass, seed: number): ProfileRun {
  const st = STRATEGIES.find(s => s.id === EXPERT[cls])! as Strategy;
  const tuned: Strategy = { ...st, heroClass: cls, want: [...st.want], wantLate: [...st.wantLate], keep: { ...st.keep } };
  if (cls === 'merchant') {
    tuned.want = ['dagger', 'shield', 'potion', 'ruby', 'poison_needle', 'moneybag'];
    tuned.wantLate = ['poison_needle', 'dagger', 'ruby', 'emergency_ledger'];
    tuned.keep = { dagger: 2, shield: 1, potion: 1, moneybag: 1 };
  } else if (cls === 'guard') {
    tuned.want = ['shield', 'potion', 'greatsword', 'fold_wall', 'ruby', 'luck_charm'];
    tuned.wantLate = ['fold_wall', 'shield', 'greatsword', 'potion'];
    tuned.keep = { shield: 2, potion: 2, greatsword: 1 };
  } else {
    tuned.want = ['dagger', 'ruby', 'shield', 'potion', 'spear'];
    tuned.wantLate = ['spear', 'dagger', 'ruby', 'potion'];
    tuned.keep = { dagger: 2, ruby: 1, shield: 1, potion: 1 };
  }
  const margins: FightMargin[] = [];
  const rec = playStrategy(tuned, seed, {
    maxRetries: 0,
    forge: true,
    onFight: info => margins.push({ level: info.level, ratio: info.maxHp ? info.hp / info.maxHp : 0, won: info.won }),
  });
  const game = (rec as { game?: Game }).game;
  const win = rec.result === 'victory';
  return {
    profile: 'expert', cls, seed,
    deathLevel: win ? 51 : (rec.deaths[rec.deaths.length - 1] ?? rec.reached + 1),
    cleared: rec.reached, win,
    gold: game?.s.gold ?? 0,
    earned: game?.s.stats.goldEarned ?? 0,
    margins,
  };
}

export function playProfile(profile: ProfileRun['profile'], cls: HeroClass, seed: number): ProfileRun {
  if (profile === 'expert') return playExpert(cls, seed);
  return playCasual(profile, cls, seed);
}

export const PROFILE_CLASSES: HeroClass[] = ['merchant', 'guard', 'ranger'];
