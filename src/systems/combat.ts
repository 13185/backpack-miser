import { ECONOMY } from '../config/economy';
import { ITEMS } from '../config/items';
import type { LevelDef } from '../config/levels';
import type { ItemInstance } from '../models/types';
import { weaponDamage } from './adjacency';
import { inBag } from './placement';

/**
 * 纯逻辑战斗模拟（与动画完全分离）。时间单位：整数毫秒。
 * 同一时间点的事件处理顺序（固定）：
 *   0. 超时判定（90秒）→ 狂暴阶段推进
 *   1. 玩家武器攻击（按背包内从上到下、从左到右）
 *   2. 盾牌获得护盾（同上顺序）
 *   3. 怪物攻击 → 护盾先抵扣 → 扣生命 → 死亡判定 → 药水按顺序检查（每喝一瓶重新检查阈值）
 * 每个事件执行后立即检查胜负；结束后不再产生任何事件。
 */
export type CombatEvent =
  | { t: number; type: 'weapon'; itemId: string; dmg: number; raw: number; heavy: boolean }
  | { t: number; type: 'shield'; itemId: string; amount: number }
  | { t: number; type: 'monsterAttack'; dmg: number; absorbed: number; hpLoss: number }
  | { t: number; type: 'potion'; itemId: string; heal: number }
  | { t: number; type: 'enrage'; stage: number; mult: number }
  | { t: number; type: 'bossHaste' }
  | { t: number; type: 'end'; won: boolean; reason: string };

interface Actor { id: string; kind: 'weapon' | 'shield' | 'monster'; interval: number; nextAt: number; value: number; order: number; }
export interface CombatState {
  t: number; over: boolean; won: boolean; reason: string;
  hp: number; maxHp: number; shield: number;
  mHp: number; mMaxHp: number; mAtk: number; mInterval: number; armor: number; boss: boolean; hasted: boolean;
  enrageStage: number;
  actors: Actor[];
  potions: { id: string; heal: number; used: boolean }[];
  stats: { weapon: Record<string, number>; absorbed: number; healed: number };
}
const ms = (s: number) => Math.round(s * 1000);

export function createCombat(items: ItemInstance[], hp: number, maxHp: number, lv: LevelDef): CombatState {
  // 开战快照：只取背包内装备，按位置排序
  const bag = items.filter(inBag).map(i => ({ ...i })).sort((a, b) => a.y! - b.y! || a.x! - b.x!);
  const actors: Actor[] = [];
  let order = 0;
  for (const it of bag) {
    const d = ITEMS[it.kind];
    if (d.category === 'weapon') actors.push({ id: it.id, kind: 'weapon', interval: ms(d.interval!), nextAt: ms(d.interval!), value: weaponDamage(bag, it), order: order++ });
  }
  for (const it of bag) {
    const d = ITEMS[it.kind];
    if (d.category === 'shield') actors.push({ id: it.id, kind: 'shield', interval: ms(d.interval!), nextAt: ms(d.interval!), value: d.values[it.level - 1], order: 1000 + order++ });
  }
  actors.push({ id: 'monster', kind: 'monster', interval: ms(lv.interval), nextAt: ms(lv.interval), value: lv.atk, order: 100000 });
  return {
    t: 0, over: false, won: false, reason: '', hp, maxHp, shield: 0,
    mHp: lv.hp, mMaxHp: lv.hp, mAtk: lv.atk, mInterval: ms(lv.interval), armor: lv.armor ?? 0, boss: !!lv.boss, hasted: false,
    enrageStage: 0, actors,
    potions: bag.filter(i => i.kind === 'potion').map(i => ({ id: i.id, heal: ITEMS.potion.values[i.level - 1], used: false })),
    stats: { weapon: {}, absorbed: 0, healed: 0 },
  };
}
export function enrageMult(stage: number): number { return 1 + stage * ECONOMY.enrageBonus; }
/** 护盾先抵扣，再扣生命（纯函数） */
export function applyDamageToPlayer(hp: number, shield: number, dmg: number): { hp: number; shield: number; absorbed: number; hpLoss: number } {
  const absorbed = Math.min(shield, dmg);
  const hpLoss = Math.min(hp, dmg - absorbed);
  return { hp: hp - hpLoss, shield: shield - absorbed, absorbed, hpLoss };
}
export function damageToMonster(raw: number, armor: number): number { return Math.max(1, raw - armor); }

function finish(s: CombatState, ev: CombatEvent[], won: boolean, reason: string) {
  s.over = true; s.won = won; s.reason = reason;
  ev.push({ t: s.t, type: 'end', won, reason });
}
function checkPotions(s: CombatState, ev: CombatEvent[]) {
  for (const p of s.potions) {
    if (s.hp <= 0) return; // 致死后不能复活
    if (s.hp > s.maxHp * ECONOMY.potionThreshold) return; // 每喝一瓶后重新检查阈值
    if (p.used) continue;
    p.used = true;
    const heal = Math.min(p.heal, s.maxHp - s.hp);
    s.hp += heal; s.stats.healed += heal;
    ev.push({ t: s.t, type: 'potion', itemId: p.id, heal });
  }
}
function processTimeline(s: CombatState, ev: CombatEvent[]) {
  if (s.t >= ms(ECONOMY.timeout)) { finish(s, ev, false, '战斗超过90秒仍未分出胜负，冒险失败：火力不足，被怪物拖垮了。'); return; }
  const stage = s.t >= ms(ECONOMY.enrageAt) ? 1 + Math.floor((s.t - ms(ECONOMY.enrageAt)) / ms(ECONOMY.enrageStep)) : 0;
  if (stage > s.enrageStage) { s.enrageStage = stage; ev.push({ t: s.t, type: 'enrage', stage, mult: enrageMult(stage) }); }
}
function nextTimelineAt(s: CombatState): number {
  const e = ms(ECONOMY.enrageAt) + s.enrageStage * ms(ECONOMY.enrageStep);
  return Math.min(e, ms(ECONOMY.timeout));
}
function runActor(s: CombatState, a: Actor, ev: CombatEvent[]) {
  if (a.kind === 'weapon') {
    const dmg = damageToMonster(a.value, s.armor);
    const real = Math.min(dmg, s.mHp);
    s.mHp -= real;
    s.stats.weapon[a.id] = (s.stats.weapon[a.id] ?? 0) + real;
    ev.push({ t: s.t, type: 'weapon', itemId: a.id, dmg: real, raw: a.value, heavy: a.value >= 20 });
    if (s.mHp <= 0) { finish(s, ev, true, '怪物被击败！'); return; }
    if (s.boss && !s.hasted && s.mHp < s.mMaxHp * 0.5) {
      s.hasted = true; s.mInterval = Math.round(s.mInterval * ECONOMY.bossHasteRate);
      const m = s.actors.find(x => x.kind === 'monster')!; m.interval = s.mInterval;
      ev.push({ t: s.t, type: 'bossHaste' });
    }
  } else if (a.kind === 'shield') {
    const cap = Math.floor(s.maxHp * ECONOMY.shieldCapRate);
    const amount = Math.max(0, Math.min(a.value, cap - s.shield));
    s.shield += amount;
    ev.push({ t: s.t, type: 'shield', itemId: a.id, amount });
  } else {
    const dmg = Math.round(s.mAtk * enrageMult(s.enrageStage));
    const r = applyDamageToPlayer(s.hp, s.shield, dmg);
    s.hp = r.hp; s.shield = r.shield; s.stats.absorbed += r.absorbed;
    ev.push({ t: s.t, type: 'monsterAttack', dmg, absorbed: r.absorbed, hpLoss: r.hpLoss });
    if (s.hp <= 0) { finish(s, ev, false, '生命耗尽，冒险失败。'); return; }
    checkPotions(s, ev);
  }
}
/** 推进战斗 dtMs 毫秒（倍速由调用方乘到 dt 上，所有逻辑统一受影响） */
export function stepCombat(s: CombatState, dtMs: number): CombatEvent[] {
  const ev: CombatEvent[] = [];
  const target = s.t + Math.max(0, Math.floor(dtMs));
  while (!s.over) {
    const tl = nextTimelineAt(s);
    const nextActor = Math.min(...s.actors.map(a => a.nextAt));
    const next = Math.min(tl, nextActor);
    if (next > target) break;
    s.t = next;
    if (tl === next) { processTimeline(s, ev); if (s.over) break; }
    const due = s.actors.filter(a => a.nextAt === next).sort((a, b) => a.order - b.order);
    for (const a of due) {
      if (s.over) break;
      runActor(s, a, ev);
      a.nextAt = s.t + a.interval;
    }
  }
  if (!s.over) s.t = target;
  return ev;
}
/** 无动画一次性跑完（用于测试/平衡模拟） */
export function simulate(s: CombatState): CombatEvent[] {
  const all: CombatEvent[] = [];
  while (!s.over) all.push(...stepCombat(s, 1000));
  return all;
}
