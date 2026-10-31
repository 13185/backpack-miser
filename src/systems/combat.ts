import { ECONOMY } from '../config/economy';
import { ITEMS } from '../config/items';
import type { LevelDef } from '../config/levels';
import { INTERVAL_SHORTEN_CAP } from '../config/v3/runes';
import { doctrineT01Mult } from '../config/v3/doctrines';
import { HEART_TUNE, seasonedMult } from '../config/v3/campaign';
import { emptyResist, splitDirect, splitIncoming, type Element } from '../config/v4/elements';
import { ELEMENT_SKILL_EVERY_MS, ELEMENT_SKILLS, SKILL_RAMP_STEP, WATER_SUPPRESS_MS, elementSkill } from '../config/v4/bosses';
import { armorResist, isArmorKind } from '../config/v4/armor';
import type { ItemInstance, ItemKind, RuneInstance } from '../models/types';
import { weaponDamage, bannerShorten, gemBonus } from './adjacency';
import { inBag, itemPlace } from './placement';

/** 其他首领的大暴击保底，占玩家最大生命。 */
export const BOSS_CRIT_HP_PCT = 0.32;
/** 黄金心脏大暴击保底。3.6.10 是 38%，3.6.11 再 ×0.90。 */
export const HEART_CRIT_HP_PCT = 0.342;
/** 黄金心脏大火。3.6.10 是最大生命的 35%，3.6.11 再 ×0.90。 */
export const HEART_FIRE_HP_PCT = 0.315;

export type CombatEvent =
  | { t: number; type: 'weapon'; itemId: string; dmg: number; raw: number; heavy: boolean }
  | { t: number; type: 'shield'; itemId: string; amount: number }
  | { t: number; type: 'monsterAttack'; dmg: number; absorbed: number; hpLoss: number; crit?: boolean }
  | { t: number; type: 'potion'; itemId: string; heal: number }
  | { t: number; type: 'lamp'; itemId: string; heal: number }
  | { t: number; type: 'poison'; stacks: number; dmg: number }
  | { t: number; type: 'enrage'; stage: number; mult: number }
  | { t: number; type: 'bossHaste' }
  | { t: number; type: 'tide'; phase: 'high' | 'low'; armor: number }
  | { t: number; type: 'compass'; armor: number }
  | { t: number; type: 'echo'; dmg: number }
  | { t: number; type: 'overheat'; kind: 'strike' | 'vent' }
  | { t: number; type: 'pray'; shield: number }
  | { t: number; type: 'heartPhase'; phase: number }
  | { t: number; type: 'invuln'; ms: number }
  | { t: number; type: 'fireWindup' }
  | { t: number; type: 'fireBreath'; dmg: number; hpLoss: number }
  | { t: number; type: 'addHit'; addId: string; dmg: number; hp: number }
  | { t: number; type: 'addDown'; addId: string }
  | { t: number; type: 'heavyWindup' }
  | { t: number; type: 'heavyStrike'; mult: number }
  | { t: number; type: 'phaseShield'; threshold: number; shield: number }
  | { t: number; type: 'summon'; addId: string; hp: number }
  | { t: number; type: 'regen'; amount: number }
  | { t: number; type: 'elementSkill'; element: Element; name: string; heal?: number; dmg?: number; hpLoss?: number; hit?: number }
  | { t: number; type: 'skillRamp'; casts: number; mult: number }
  | { t: number; type: 'end'; won: boolean; reason: string };

type ActorKind = 'weapon' | 'shield' | 'heal' | 'needle' | 'monster' | 'control';
interface Actor {
  id: string; kind: ActorKind; interval: number; nextAt: number; value: number; order: number;
  itemKind?: ItemKind;
  maxUses?: number; uses?: number;
  armorIgnore?: number;
  armorIgnorePct?: number;
  shots?: number;
  splashPct?: number;
  shieldMult?: number;
  element?: Element | null;
}
export interface CombatState {
  t: number; over: boolean; won: boolean; reason: string;
  hp: number; maxHp: number; shield: number;
  mHp: number; mMaxHp: number; mAtk: number; mInterval: number; armor: number; boss: boolean; hasted: boolean;
  enrageStage: number;
  actors: Actor[];
  potions: { id: string; heal: number; used: boolean }[];
  stats: { weapon: Record<string, number>; absorbed: number; healed: number; luckShield?: number; luckClipped?: number };
  /** 背包内最高一级幸运符的额外护盾。0 表示没有生效的符。 */
  luckCharmBonus: number;
  luckCharmUsed: boolean;
  tideCycle: boolean;
  baseArmor: number;
  tidePhase: 'high' | 'low' | null;
  /** 罗盘减甲（前8秒） */
  compassDebuff: number;
  compassUntil: number;
  poisonStacks: number;
  poisonCap: number;
  poisonNextAt: number;
  potionHealMult: number;
  firstPotionBonusShield: number;
  potionHealedOnce: boolean;
  shieldCapRate: number;
  shieldGenMult: number;
  doctrine: string | null;
  runes: RuneInstance[];
  relics: string[];
  /** 开战时玩家金币（账匣） */
  startGold: number;
  /** 怪物临时护盾（祝祷/阶段） */
  mShield: number;
  monAttacks: number;
  echo?: { every: number; delayMs: number; pct: number };
  pendingEcho: { at: number; dmg: number } | null;
  overheat?: { every: number; mult: number; pauseMs: number };
  overheatPausedUntil: number;
  nextHitOverheated: boolean;
  pray?: { intervalMs: number; shield: number };
  prayNextAt: number;
  heartPhases: boolean;
  heartPhase: number; // 1..3
  chargeEvents: number; // A01
  a08CooldownUntil: number;
  relicDmgMult: number; // A11/A12 基础
  a11Until: number;
  a11ShieldPenalty: boolean;
  /** A03：常规武器命中计数 */
  weaponHitCount: number;
  /** A09：罗盘到期后的额外减甲 */
  a09Debuff: number;
  a09Until: number;
  /** A04 已触发次数（信息用） */
  a04Procs: number;
  /** 多单位：支援单位（祝祷者/召唤物）。默认目标策略：先打支援 */
  adds: { id: string; name: string; hp: number; maxHp: number; armor?: number }[];
  /** 双体：主目标与 twin 均需清零才胜利 */
  dualUnits: boolean;
  regen?: { intervalMs: number; amount: number };
  regenNextAt: number;
  heavyStrike?: { every: number; mult: number; windupMs: number; armorBreakMs?: number };
  heavyPending: boolean;
  heavyWindupUntil: number;
  armorBreakUntil: number;
  phaseShields?: { thresholds: number[]; shield: number };
  phaseShieldTriggered: boolean[];
  summons?: { atSec: number[]; hpPct: number; maxAlive: number; name?: string };
  summonsDone: boolean[];
  summonsBudgetHp: number;
  furnaceEnraged: boolean;
  iceSlowUntil: number;
  iceSlowPct: number;
  /** V2 遗物战斗计数 */
  c01Hits: number;
  r01Absorbed: number;
  r05Hits: number;
  r06Stacks: number;
  c07Used: boolean;
  heroClass: string | null;
  guardBonusUsed: boolean;
  enrageAt: number;
  enrageBonus: number;
  levelNo: number;
  invulnUntil: number;
  invulnTriggered: boolean[];
  fireWindupUntil: number;
  fireArmed: boolean;
  /** 游侠武器间隔系数。31 关前 0.75，之后 0.68。其他职业为 1。 */
  rangerGap: number;
  playerResist: Record<Element, number>;
  monsterResist: Record<Element, number>;
  bossElement?: Element;
  plainShare: number;
  heavyPlainShare: number;
  guardUntil: number;
  guardReadyAt: number;
  autoGuard: boolean;
  guardUses: number;
  furnaceCycle: boolean;
  furnaceNormals: number;
  furnaceWindupUntil: number;
  furnaceVentUntil: number;
  furnaceWater: number;
  furnaceBroke: boolean;
  furnaceBreaks: number;
  heartElementPhases?: { element: Element; resist: Partial<Record<Element, number>> }[];
  /** 关键技能叠乘。开场是 1，每次施放后再乘 (1+SKILL_RAMP_STEP)。 */
  skillRamp: number;
  skillCasts: number;
  skillNextAt: number;
}
export interface CombatMods {
  runes?: RuneInstance[];
  doctrine?: string | null;
  relics?: string[];
  startGold?: number;
  heroClass?: string | null;
  autoGuard?: boolean;
  /** 护甲槽。物品已离开背包才计入抗性。 */
  armorId?: string | null;
  /** 主手槽。离开背包后只打一次，不吃邻接。 */
  mainHandId?: string | null;
}

const ms = (s: number) => Math.round(s * 1000);
const TIDE_PERIOD = 8000;
const TIDE_HIGH = 4000;
const POISON_TICK = 1000;
const POISON_DPS = 1; // 每层每秒

function runeOn(runes: RuneInstance[], itemId: string, runeId: string): boolean {
  return runes.some(r => r.runeId === runeId && r.itemId === itemId);
}
function hasRelic(relics: string[], id: string): boolean {
  return relics.includes(id);
}
function applyIntervalShorten(baseMs: number, shortenFrac: number): number {
  const capped = Math.min(shortenFrac, INTERVAL_SHORTEN_CAP);
  return Math.max(1, Math.round(baseMs * (1 - capped)));
}
/** 蓄力/破绽窗口：暴怒后、狂暴中、或潮汐高潮 */
export function isMonsterCharging(s: CombatState): boolean {
  return s.heavyPending || s.hasted || s.enrageStage > 0 || (s.tideCycle && s.tidePhase === 'high');
}
function effectiveArmor(s: CombatState, armorIgnore = 0): number {
  if (s.armorBreakUntil > s.t) return 0;
  const a09 = (s.a09Debuff > 0 && s.t < s.a09Until) ? s.a09Debuff : 0;
  let a = s.armor - s.compassDebuff - a09 - armorIgnore;
  return Math.max(0, a);
}
function syncTideArmor(s: CombatState, ev: CombatEvent[]) {
  if (!s.tideCycle) return;
  const phase: 'high' | 'low' = (s.t % TIDE_PERIOD) < TIDE_HIGH ? 'high' : 'low';
  const armor = phase === 'high' ? s.baseArmor + 2 : s.baseArmor;
  if (phase !== s.tidePhase || armor !== s.armor) {
    s.tidePhase = phase;
    s.armor = armor;
    ev.push({ t: s.t, type: 'tide', phase, armor });
  }
}
function syncCompass(s: CombatState, ev: CombatEvent[]) {
  if (s.compassDebuff > 0 && s.t >= s.compassUntil) {
    s.compassDebuff = 0;
    ev.push({ t: s.t, type: 'compass', armor: 0 });
    // A09：冰晶/罗盘减速自然到期 → 护甲-2 持续2秒（刷新不叠加，仅重置时长）
    if (hasRelic(s.relics, 'A09')) {
      s.a09Debuff = 2;
      s.a09Until = s.t + 2000;
    }
  }
  if (s.a09Debuff > 0 && s.t >= s.a09Until) {
    s.a09Debuff = 0;
  }
}

/** 只看背包内的符。多枚时取最高一级的 values。临时区不计入。 */
function charmBonus(bag: ItemInstance[]): number {
  let best = 0;
  for (const it of bag) if (it.kind === 'luck_charm' && it.level > best) best = it.level;
  return best ? ITEMS.luck_charm.values[best - 1] : 0;
}

export function activateGuard(s: CombatState): boolean {
  if (s.over || (s.levelNo ?? 0) < 11) return false;
  if (s.t < s.guardReadyAt || s.guardUntil > s.t) return false;
  s.guardUntil = s.t + 2000;
  s.guardReadyAt = s.t + 12000;
  s.guardUses++;
  return true;
}

function tryAutoGuard(s: CombatState) {
  if (!s.autoGuard || (s.levelNo ?? 0) < 11) return;
  const until = s.furnaceWindupUntil > s.t ? s.furnaceWindupUntil : s.heavyWindupUntil;
  if (until > s.t && until - s.t <= 1000) activateGuard(s);
}

export function createCombat(items: ItemInstance[], hp: number, maxHp: number, lv: LevelDef, mods: CombatMods = {}): CombatState {
  const bag = items.filter(inBag).map(i => ({ ...i })).sort((a, b) => a.y! - b.y! || a.x! - b.x!);
  const hand = mods.mainHandId ? items.find(i => i.id === mods.mainHandId && itemPlace(i) === 'hand') : undefined;
  const worn = mods.armorId ? items.find(i => i.id === mods.armorId && itemPlace(i) === 'armor' && isArmorKind(i.kind)) : undefined;
  const runes = (mods.runes ?? []).filter(r => r.itemId);
  const relics = mods.relics ?? [];
  const doctrine = mods.doctrine ?? null;
  const handFights = !!hand && (ITEMS[hand.kind].category === 'weapon' || ITEMS[hand.kind].category === 'needle');
  const weaponCount = bag.filter(i => {
    const c = ITEMS[i.kind].category;
    return c === 'weapon' || c === 'needle';
  }).length + (handFights ? 1 : 0);
  const doctrineMult = doctrine === 'T01' ? doctrineT01Mult(weaponCount) : 1;
  let doctrineShorten = 0;
  if (doctrine === 'T02') doctrineShorten = weaponCount >= 3 ? 0.06 : 0.02;

  const shieldCapRate = doctrine === 'T03' ? 0.6 : ECONOMY.shieldCapRate;
  const shieldGenMult = doctrine === 'T03' ? 1.08 : 1;
  let potionHealMult = doctrine === 'T04' ? 1.10 : 1;
  const firstPotionBonusShield = doctrine === 'T04' ? 4 : 0;
  const poisonCap = doctrine === 'T05' ? 35 : 30;

  // 罗盘：同类取最高级减甲
  let compassDebuff = 0;
  for (const it of bag) {
    if (it.kind === 'compass') compassDebuff = Math.max(compassDebuff, ITEMS.compass.values[it.level - 1]);
  }

  const actors: Actor[] = [];
  let order = 0;
  for (const it of bag) {
    const d = ITEMS[it.kind];
    if (d.category === 'weapon' || d.category === 'needle') {
      let value = d.category === 'weapon' ? weaponDamage(bag, it) : d.values[it.level - 1];
      if (d.category === 'weapon' && hasRelic(relics, 'C04')) {
        const g = gemBonus(bag, it).pct;
        if (g > 0) {
          const base = ITEMS[it.kind].values[it.level - 1];
          // 用宝石匣重算：加成×1.25，再乘同种衰减（与 weaponDamage 一致）
          const fromGem = Math.round(base * (1 + (g * 1.25) / 100));
          value = Math.round(fromGem * (value / Math.max(1, Math.round(base * (1 + g / 100)))));
        }
      }
      if (runeOn(runes, it.id, 'U01')) value = Math.round(value * 1.10);
      value = Math.round(value * doctrineMult);
      let interval = ms(d.interval!);
      let shorten = doctrineShorten + bannerShorten(bag, it);
      if (runeOn(runes, it.id, 'U03')) shorten += 0.06;
      // R08 精密夹具：空格≥8 间隔-12%
      if (hasRelic(relics, 'R08')) {
        /* cells computed later — apply in second pass */
      }
      interval = applyIntervalShorten(interval, shorten);
      // R02 重刃：大剑/战锤 +35% 伤害、间隔×1.15
      if (hasRelic(relics, 'R02') && (it.kind === 'greatsword' || it.kind === 'warhammer')) {
        value = Math.round(value * 1.35);
        interval = Math.round(interval * 1.15);
      }
      // C02 磨刀石 +10%
      if (hasRelic(relics, 'C02')) value = Math.round(value * 1.10);
      // C03 润滑油 -8% 间隔
      if (hasRelic(relics, 'C03')) interval = applyIntervalShorten(interval, 0.08);
      // R07 孤勇：武器数≤2 时 +25%
      if (hasRelic(relics, 'R07') && weaponCount <= 2) value = Math.round(value * 1.25);
      let armorIgnore = runeOn(runes, it.id, 'U02') ? 1 : 0;
      if (mods.heroClass === 'ranger') armorIgnore += 4;
      if (mods.heroClass === 'merchant' && bag.some(b => b.kind === 'moneybag')) {
        value = Math.round(value * ((lv.level ?? 0) >= 31 ? 1.20 : 1.12));
      }
      const armorIgnorePct = it.kind === 'warhammer' ? 0.5 : 0;
      const shots = it.kind === 'crossbow' ? 2 : 1;
      let splashPct = it.kind === 'chain_hammer' ? (hasRelic(relics, 'R04') ? 0.75 : 0.5) : 0;
      actors.push({
        id: it.id, kind: d.category === 'needle' ? 'needle' : 'weapon',
        interval, nextAt: interval, value, order: order++, itemKind: it.kind, armorIgnore, armorIgnorePct, shots, splashPct,
        element: it.element ?? null,
      });
    }
  }
  // 冰晶
  for (const it of bag) {
    if (it.kind === 'ice_crystal') {
      const d = ITEMS.ice_crystal;
      actors.push({
        id: it.id, kind: 'control', interval: ms(d.interval!), nextAt: ms(d.interval!),
        value: d.values[it.level - 1], order: 1500 + order++, itemKind: it.kind,
      });
    }
  }
  for (const it of bag) {
    const d = ITEMS[it.kind];
    if (d.category === 'shield') {
      let value = d.values[it.level - 1];
      let shieldMult = shieldGenMult;
      if (runeOn(runes, it.id, 'U04')) shieldMult *= 1.15;
      actors.push({
        id: it.id, kind: 'shield', interval: ms(d.interval!), nextAt: ms(d.interval!),
        value, order: 1000 + order++, itemKind: it.kind, shieldMult,
        maxUses: d.maxTriggers, uses: 0,
      });
    }
  }
  if (mods.heroClass === 'guard') {
    const shields = actors.filter(a => a.kind === 'shield');
    const best = shields.reduce<typeof shields[number] | undefined>((m, a) => (!m || a.value > m.value ? a : m), undefined);
    const guardShield = (lv.level ?? 0) >= 31 ? 1.15 : 1.25;
    if (best) best.shieldMult = (best.shieldMult ?? 1) * guardShield;
  }
  for (const it of bag) {
    const d = ITEMS[it.kind];
    if (d.category === 'heal') {
      actors.push({
        id: it.id, kind: 'heal', interval: ms(d.interval!), nextAt: ms(d.interval!),
        value: d.values[it.level - 1], order: 2000 + order++, itemKind: it.kind,
        maxUses: d.maxTriggers ?? 3, uses: 0,
      });
    }
  }
  if (handFights && hand) {
    const d = ITEMS[hand.kind];
    let value = d.values[hand.level - 1];
    if (runeOn(runes, hand.id, 'U01')) value = Math.round(value * 1.10);
    value = Math.round(value * doctrineMult);
    if (hasRelic(relics, 'C02')) value = Math.round(value * 1.10);
    if (hasRelic(relics, 'R07') && weaponCount <= 2) value = Math.round(value * 1.25);
    if (hasRelic(relics, 'R02') && (hand.kind === 'greatsword' || hand.kind === 'warhammer')) value = Math.round(value * 1.35);
    if (mods.heroClass === 'merchant' && bag.some(b => b.kind === 'moneybag')) {
      value = Math.round(value * ((lv.level ?? 0) >= 31 ? 1.20 : 1.12));
    }
    let interval = ms(d.interval!);
    if (hasRelic(relics, 'R02') && (hand.kind === 'greatsword' || hand.kind === 'warhammer')) interval = Math.round(interval * 1.15);
    if (hasRelic(relics, 'C03')) interval = applyIntervalShorten(interval, 0.08);
    let armorIgnore = mods.heroClass === 'ranger' ? 4 : 0;
    actors.push({
      id: hand.id, kind: d.category === 'needle' ? 'needle' : 'weapon',
      interval, nextAt: interval, value, order: order++, itemKind: hand.kind,
      element: hand.element ?? null, armorIgnore, armorIgnorePct: hand.kind === 'warhammer' ? 0.5 : 0,
      shots: hand.kind === 'crossbow' ? 2 : 1,
      splashPct: hand.kind === 'chain_hammer' ? (hasRelic(relics, 'R04') ? 0.75 : 0.5) : 0,
    });
  }
  actors.push({ id: 'monster', kind: 'monster', interval: ms(lv.interval), nextAt: ms(lv.interval), value: lv.atk, order: 100000 });

  const baseArmor = lv.armor ?? 0;
  const tideCycle = !!lv.tideCycle;
  const startArmor = tideCycle ? baseArmor + 2 : baseArmor;

  const potions = bag.filter(i => i.kind === 'potion').map(i => {
    let heal = ITEMS.potion.values[i.level - 1];
    if (runeOn(runes, i.id, 'U05')) heal = Math.round(heal * 1.15);
    heal = Math.round(heal * potionHealMult);
    return { id: i.id, heal, used: false };
  });

  // A12 轻装：占格≤20 伤害+10% 且 maxHp-10（开战快照）
  let cells = 0;
  for (const it of bag) {
    const d = ITEMS[it.kind];
    const w = it.rotated ? d.h : d.w; const h = it.rotated ? d.w : d.h;
    cells += w * h;
  }
  const bagCells = 5 * 7; // 上限近似；精密夹具按占用估算
  if (hasRelic(relics, 'R08') && (bagCells - cells) >= 8) {
    for (const a of actors) if (a.kind === 'weapon' || a.kind === 'needle') {
      a.interval = applyIntervalShorten(a.interval, 0.12);
      a.nextAt = a.interval;
    }
  }
  // C12 开场护盾
  let openShield = hasRelic(relics, 'C12') ? 8 : 0;
  if (mods.heroClass === 'ranger') openShield += (lv.level ?? 0) >= 31 ? 16 : 10;
  // K04 脆弱水晶：伤害+30%，玩家承伤×1.2 — 在受击处处理
  let relicDmgMult = 1;
  let adjMaxHp = maxHp;
  let adjHp = hp;
  const enteredFull = adjHp >= adjMaxHp;
  if ((lv.level ?? 0) >= 31 && mods.heroClass === 'ranger') adjMaxHp += 20;
  if ((lv.level ?? 0) >= 31 && mods.heroClass === 'merchant') adjMaxHp += 12;
  if (enteredFull) adjHp = adjMaxHp;
  if (hasRelic(relics, 'A12') && cells <= 20) {
    relicDmgMult *= 1.20;
    adjMaxHp = Math.max(1, maxHp - 10);
    adjHp = Math.min(hp, adjMaxHp);
  }
  // A11：前10秒伤害+15%，盾生成-30%
  const a11 = hasRelic(relics, 'A11');
  if (a11) relicDmgMult *= 1.25; // 前10秒内；超时在 hit 时去掉多余部分用 a11Until
  let shieldGenMultFinal = shieldGenMult;
  if (a11) shieldGenMultFinal *= 0.85;
  // 重新应用盾牌 actor 的 shieldMult 基数已含 doctrine；A11 再乘到 gen
  for (const a of actors) if (a.kind === 'shield') a.shieldMult = (a.shieldMult ?? 1) * (a11 ? 0.85 : 1);
  // 武器乘 relicDmgMult（A11 全程先乘，超时后在 hitMonster 补偿较繁，简化：A11 仅前10秒在 hit 判断）
  if (!a11) {
    for (const a of actors) if (a.kind === 'weapon' || a.kind === 'needle') a.value = Math.round(a.value * relicDmgMult);
  } else {
    // A12 only already in relicDmgMult with A11 — apply A12 part only here
    const a12m = (hasRelic(relics, 'A12') && cells <= 20) ? 1.20 : 1;
    for (const a of actors) if (a.kind === 'weapon' || a.kind === 'needle') a.value = Math.round(a.value * a12m);
  }

  // 多单位：祝祷者 / 双体 twin / 开场护盾 / 再生
  const adds: CombatState['adds'] = [];
  let mainHp = lv.hp;
  const dualUnits = !!lv.dualUnits;
  if (dualUnits) {
    const twinHp = Math.max(1, Math.round(lv.hp / 2));
    mainHp = Math.max(1, lv.hp - twinHp);
    adds.push({ id: 'twin', name: '双生体', hp: twinHp, maxHp: twinHp, armor: lv.armor ?? 0 });
  } else if (lv.pray) {
    const share = lv.prayShare ?? (lv.boss ? 0.2 : 0.3);
    const addHp = Math.max(1, Math.round(lv.hp * share));
    mainHp = lv.hp - addHp;
    adds.push({ id: 'prayer', name: '祝祷者', hp: addHp, maxHp: addHp });
  }
  let startMShield = 0;
  let startMainHp = mainHp;
  if (lv.openMShieldPct) {
    startMShield = Math.max(1, Math.round(mainHp * (lv.openMShieldPct / 100)));
    startMainHp = Math.max(1, mainHp - startMShield);
  }
  const rangerGap = mods.heroClass === 'ranger' ? ((lv.level ?? 0) >= 31 ? 0.68 : 0.75) : 1;
  if (rangerGap < 1) for (const a of actors) if (a.kind === 'weapon' || a.kind === 'needle') a.nextAt = Math.round(a.interval * rangerGap);
  // K01/K04/A12 最大生命惩罚已在 A12；K01 另 -15%
  if (hasRelic(relics, 'K01')) {
    adjMaxHp = Math.max(1, Math.floor(adjMaxHp * 0.85));
    adjHp = Math.min(adjHp, adjMaxHp);
  }
  if (hasRelic(relics, 'K04')) {
    for (const a of actors) if (a.kind === 'weapon' || a.kind === 'needle') a.value = Math.round(a.value * 1.30);
  }
  if (hasRelic(relics, 'K03') && (mods.startGold ?? 0) >= 80) {
    for (const a of actors) if (a.kind === 'weapon' || a.kind === 'needle') a.value = Math.round(a.value * 1.30);
  }
  if (hasRelic(relics, 'K02')) {
    for (const a of actors) if (a.kind === 'weapon' || a.kind === 'needle') a.value = Math.round(a.value * 1.25);
  }
  const skill = seasonedMult(lv.level ?? 1);
  if (skill !== 1) {
    for (const a of actors) if (a.kind === 'weapon' || a.kind === 'needle') a.value = Math.max(1, Math.round(a.value * skill));
  }
  if (hasRelic(relics, 'C05')) {
    for (const a of actors) if (a.kind === 'shield') a.shieldMult = (a.shieldMult ?? 1) * 1.20;
  }
  if (hasRelic(relics, 'C11')) {
    for (const p of potions) p.heal = Math.round(p.heal * 1.20);
  }
  const startShield = Math.min(openShield, Math.floor(adjMaxHp * shieldCapRate));
  return {
    t: 0, over: false, won: false, reason: '', hp: adjHp, maxHp: adjMaxHp, shield: startShield,
    mHp: startMainHp, mMaxHp: mainHp, mAtk: lv.atk, mInterval: ms(lv.interval), armor: startArmor, boss: !!lv.boss, hasted: false,
    enrageStage: 0, actors, potions,
    stats: { weapon: {}, absorbed: 0, healed: 0, luckShield: 0, luckClipped: 0 },
    luckCharmBonus: charmBonus(bag),
    luckCharmUsed: false,
    tideCycle, baseArmor, tidePhase: tideCycle ? 'high' : null,
    compassDebuff, compassUntil: compassDebuff > 0 ? 8000 : 0,
    poisonStacks: 0, poisonCap, poisonNextAt: POISON_TICK,
    potionHealMult, firstPotionBonusShield, potionHealedOnce: false,
    shieldCapRate, shieldGenMult: shieldGenMultFinal, doctrine, runes, relics,
    startGold: mods.startGold ?? 0,
    mShield: startMShield, monAttacks: 0,
    echo: lv.echo, pendingEcho: null,
    overheat: lv.overheat, overheatPausedUntil: 0, nextHitOverheated: false,
    pray: lv.pray, prayNextAt: lv.pray ? lv.pray.intervalMs : Number.MAX_SAFE_INTEGER,
    heartPhases: !!lv.heartPhases, heartPhase: 1,
    chargeEvents: 0, a08CooldownUntil: 0,
    relicDmgMult, a11Until: a11 ? 10000 : 0, a11ShieldPenalty: a11,
    weaponHitCount: 0, a09Debuff: 0, a09Until: 0, a04Procs: 0,
    adds, dualUnits,
    regen: lv.regen, regenNextAt: lv.regen ? lv.regen.intervalMs : Number.MAX_SAFE_INTEGER,
    heavyStrike: lv.heavyStrike, heavyPending: false, heavyWindupUntil: 0, armorBreakUntil: 0,
    phaseShields: lv.phaseShields, phaseShieldTriggered: lv.phaseShields ? lv.phaseShields.thresholds.map(() => false) : [],
    summons: lv.summons, summonsDone: lv.summons ? lv.summons.atSec.map(() => false) : [],
    summonsBudgetHp: lv.hp,
    furnaceEnraged: false, iceSlowUntil: 0, iceSlowPct: 0,
    c01Hits: 0, r01Absorbed: 0, r05Hits: 0, r06Stacks: 0, c07Used: false,
    heroClass: mods.heroClass ?? null, guardBonusUsed: false,
    enrageAt: lv.boss && (lv.level ?? 0) >= 40 ? 36 : ECONOMY.enrageAt,
    enrageBonus: lv.boss && (lv.level ?? 0) >= 40 ? 0.14 : ECONOMY.enrageBonus,
    rangerGap,
    invulnUntil: 0, invulnTriggered: [false, false], fireWindupUntil: 0, fireArmed: false,
    levelNo: lv.level ?? 1,
    playerResist: worn && isArmorKind(worn.kind) ? armorResist(worn.kind, worn.level) : emptyResist(),
    monsterResist: { ...emptyResist(), ...(lv.resist ?? {}) },
    bossElement: lv.bossElement,
    plainShare: lv.plainShare ?? 0.6,
    heavyPlainShare: lv.heavyPlainShare ?? 0.2,
    guardUntil: 0, guardReadyAt: 0, autoGuard: mods.autoGuard !== false, guardUses: 0,
    furnaceCycle: !!lv.furnaceCycle, furnaceNormals: 0, furnaceWindupUntil: 0, furnaceVentUntil: 0,
    furnaceWater: 0, furnaceBroke: false, furnaceBreaks: 0,
    heartElementPhases: lv.heartElementPhases,
    skillRamp: 1,
    skillCasts: 0,
    skillNextAt: lv.boss && (lv.level ?? 0) >= 15 && elementSkill(lv.bossElement) ? ELEMENT_SKILL_EVERY_MS : Number.MAX_SAFE_INTEGER,
  };
}

export function enrageMult(stage: number, bonus = ECONOMY.enrageBonus): number { return 1 + stage * bonus; }
export function applyDamageToPlayer(hp: number, shield: number, dmg: number): { hp: number; shield: number; absorbed: number; hpLoss: number } {
  const absorbed = Math.min(shield, dmg);
  const hpLoss = Math.min(hp, dmg - absorbed);
  return { hp: hp - hpLoss, shield: shield - absorbed, absorbed, hpLoss };
}
export function damageToMonster(raw: number, armor: number): number { return Math.max(1, raw - armor); }


function twinStillAlive(s: CombatState): boolean {
  return s.dualUnits && s.adds.some(a => a.id === 'twin' && a.hp > 0);
}
function tryClearWin(s: CombatState, ev: CombatEvent[], reason: string): boolean {
  if (s.mHp > 0) return false;
  if (twinStillAlive(s)) return false;
  finish(s, ev, true, reason);
  return true;
}
function finish(s: CombatState, ev: CombatEvent[], won: boolean, reason: string) {
  s.over = true; s.won = won; s.reason = reason;
  ev.push({ t: s.t, type: 'end', won, reason });
}
function checkPotions(s: CombatState, ev: CombatEvent[]) {
  for (const p of s.potions) {
    if (s.hp <= 0) return;
    if (s.hp > s.maxHp * ECONOMY.potionThreshold) return;
    if (p.used) continue;
    p.used = true;
    const heal = Math.min(p.heal, s.maxHp - s.hp);
    s.hp += heal; s.stats.healed += heal;
    ev.push({ t: s.t, type: 'potion', itemId: p.id, heal });
    if (heal > 0 && hasRelic(s.relics, 'C06')) {
      const cap = Math.floor(s.maxHp * s.shieldCapRate);
      const add = Math.min(6, Math.max(0, cap - s.shield));
      s.shield += add;
      if (add) ev.push({ t: s.t, type: 'shield', itemId: 'relic_C06', amount: add });
    }
    if (heal > 0 && hasRelic(s.relics, 'R06') && s.r06Stacks < 3) {
      s.r06Stacks++;
      for (const w of s.actors) if (w.kind === 'weapon' || w.kind === 'needle') w.value = Math.round(w.value * 1.08);
    }
    if (!s.potionHealedOnce && heal > 0 && s.firstPotionBonusShield > 0) {
      s.potionHealedOnce = true;
      const cap = Math.floor(s.maxHp * s.shieldCapRate);
      const add = Math.min(s.firstPotionBonusShield, Math.max(0, cap - s.shield));
      s.shield += add;
      if (add) ev.push({ t: s.t, type: 'shield', itemId: p.id, amount: add });
    } else if (heal > 0) s.potionHealedOnce = true;
    // A04：药水实际治疗后，剩余冷却最长的武器 -0.3s（至少保留0.1s）
    if (heal > 0 && hasRelic(s.relics, 'A04')) {
      const weapons = s.actors.filter(a => a.kind === 'weapon' || a.kind === 'needle');
      if (weapons.length) {
        let best = weapons[0];
        for (const w of weapons) {
          if (w.nextAt - s.t > best.nextAt - s.t) best = w;
        }
        const minNext = s.t + 100;
        best.nextAt = Math.max(minNext, best.nextAt - 300);
        s.a04Procs++;
      }
    }
  }
}
function tickPoison(s: CombatState, ev: CombatEvent[]) {
  if (s.poisonStacks <= 0 || s.mHp <= 0) return;
  const want = s.poisonStacks * POISON_DPS;
  const real = applyToMonsterHp(s, want);
  s.stats.weapon.poison = (s.stats.weapon.poison ?? 0) + real;
  ev.push({ t: s.t, type: 'poison', stacks: s.poisonStacks, dmg: real });
  // 默认每跳减1层；R03：每2次毒结算才减1层
  if (hasRelic(s.relics, 'R03')) {
    (s as any)._r03Tick = ((s as any)._r03Tick ?? 0) + 1;
    if ((s as any)._r03Tick % 2 === 0) s.poisonStacks = Math.max(0, s.poisonStacks - 1);
  } else {
    s.poisonStacks = Math.max(0, s.poisonStacks - 1);
  }
  if (s.mHp <= 0) { s.pendingEcho = null; tryClearWin(s, ev, '怪物被毒杀！'); }
}
function applyHeartElement(s: CombatState, phase: number) {
  const row = s.heartElementPhases?.[phase - 1];
  if (!row) return;
  s.bossElement = row.element;
  s.monsterResist = { ...emptyResist(), ...row.resist };
}
function processTimeline(s: CombatState, ev: CombatEvent[]) {
  tryAutoGuard(s);
  if (s.t >= ms(ECONOMY.timeout)) { finish(s, ev, false, `战斗超过${ECONOMY.timeout}秒仍未分出胜负，冒险失败：火力不足，被怪物拖垮了。`); return; }
  if (s.fireArmed && s.fireWindupUntil > 0 && s.t >= s.fireWindupUntil && s.mHp > 0 && !s.over) {
    s.fireArmed = false;
    let dmg = Math.max(1, Math.round(s.maxHp * HEART_FIRE_HP_PCT));
    dmg = splitIncoming(dmg, 'fire', 0, s.playerResist.fire ?? 0, s.guardUntil > s.t);
    const r = applyDamageToPlayer(s.hp, s.shield, dmg);
    s.hp = r.hp; s.shield = r.shield; s.stats.absorbed += r.absorbed;
    ev.push({ t: s.t, type: 'fireBreath', dmg, hpLoss: r.hpLoss });
    if (s.hp <= 0) { finish(s, ev, false, '被黄金心脏的大火吞没，冒险失败。'); return; }
  }
  maybeHeartInvuln(s, ev);
  const stage = s.t >= ms(s.enrageAt) ? 1 + Math.floor((s.t - ms(s.enrageAt)) / ms(ECONOMY.enrageStep)) : 0;
  if (stage > s.enrageStage) {
    s.enrageStage = stage; ev.push({ t: s.t, type: 'enrage', stage, mult: enrageMult(stage, s.enrageBonus) });
    if (hasRelic(s.relics, 'A01') && s.chargeEvents < 2) {
      s.chargeEvents++;
      const cap = Math.floor(s.maxHp * s.shieldCapRate);
      const add = Math.min(6, Math.max(0, cap - s.shield));
      s.shield += add;
      if (add) ev.push({ t: s.t, type: 'shield', itemId: 'relic_A01', amount: add });
    }
  }
  syncTideArmor(s, ev);
  syncCompass(s, ev);
  // 过热窗口结束：恢复基础护甲
  if (s.overheat && s.overheatPausedUntil > 0 && s.t >= s.overheatPausedUntil) {
    s.overheatPausedUntil = 0;
    if (!s.tideCycle) s.armor = s.baseArmor;
  }
  // 回响结算
  if (s.pendingEcho && s.t >= s.pendingEcho.at && !s.over) {
    let dmg = s.pendingEcho.dmg; s.pendingEcho = null;
    if (hasRelic(s.relics, 'A10')) dmg = Math.round(dmg * 0.75);
    const r = applyDamageToPlayer(s.hp, s.shield, dmg);
    s.hp = r.hp; s.shield = r.shield; s.stats.absorbed += r.absorbed;
    ev.push({ t: s.t, type: 'echo', dmg });
    ev.push({ t: s.t, type: 'monsterAttack', dmg, absorbed: r.absorbed, hpLoss: r.hpLoss });
    if (s.hp <= 0) { finish(s, ev, false, '生命耗尽，冒险失败。'); return; }
    checkPotions(s, ev);
  }
  // 祝祷
  if (s.pray && s.t >= s.prayNextAt && !s.over) {
    const prayer = s.adds.find(x => x.id === 'prayer' && x.hp > 0);
    if (prayer) {
      const cap = Math.round(s.mMaxHp * 0.2);
      const add = Math.max(0, Math.min(s.pray.shield, cap - s.mShield));
      s.mShield += add;
      ev.push({ t: s.t, type: 'pray', shield: add });
    }
    s.prayNextAt = prayer ? s.t + s.pray.intervalMs : Number.MAX_SAFE_INTEGER;
  }
  // 冰晶减速到期 → A09
  if (s.iceSlowUntil > 0 && s.t >= s.iceSlowUntil) {
    s.iceSlowUntil = 0; s.iceSlowPct = 0;
    const m = s.actors.find(x => x.kind === 'monster');
    if (m) m.interval = s.mInterval;
    if (hasRelic(s.relics, 'A09')) { s.a09Debuff = 2; s.a09Until = s.t + 2000; }
  }
  // 破绽窗口结束恢复护甲
  if (s.armorBreakUntil > 0 && s.t >= s.armorBreakUntil) {
    s.armorBreakUntil = 0;
    if (!s.tideCycle && !(s.overheat && s.overheatPausedUntil > s.t)) s.armor = s.baseArmor;
  }
  // 召唤
  if (s.summons && s.mHp > 0 && !s.over) {
    for (let i = 0; i < s.summons.atSec.length; i++) {
      if (s.summonsDone[i]) continue;
      if (s.t < s.summons.atSec[i] * 1000) continue;
      s.summonsDone[i] = true;
      const alive = s.adds.filter(a => a.hp > 0 && a.id.startsWith('summon_')).length;
      if (alive >= s.summons.maxAlive) continue;
      const hp = Math.max(1, Math.round(s.summonsBudgetHp * s.summons.hpPct));
      const id = `summon_${i}`;
      s.adds.push({ id, name: s.summons.name ?? '召唤物', hp, maxHp: hp });
      ev.push({ t: s.t, type: 'summon', addId: id, hp });
    }
  }
  if (s.regen && s.mHp > 0 && !s.over && s.t >= s.regenNextAt) {
    const heal = Math.min(s.regen.amount, s.mMaxHp - s.mHp);
    s.mHp += heal;
    if (heal > 0) ev.push({ t: s.t, type: 'regen', amount: heal });
    s.regenNextAt = s.t + s.regen.intervalMs;
  }
  if (s.poisonStacks > 0 && s.t >= s.poisonNextAt) {
    tickPoison(s, ev);
    s.poisonNextAt = s.t + POISON_TICK;
  }
  if (s.skillNextAt < Number.MAX_SAFE_INTEGER && s.t >= s.skillNextAt && !s.over && s.mHp > 0) {
    castElementSkill(s, ev);
  }
}
function castElementSkill(s: CombatState, ev: CombatEvent[]) {
  const spec = elementSkill(s.bossElement);
  if (!spec) { s.skillNextAt = Number.MAX_SAFE_INTEGER; return; }
  const pace = enrageMult(s.enrageStage, s.enrageBonus) * s.skillRamp;
  if (spec.element === 'wood') {
    const heal = Math.min(Math.round(s.mMaxHp * ELEMENT_SKILLS.wood.healPct), Math.max(0, s.mMaxHp - s.mHp));
    s.mHp += heal;
    ev.push({ t: s.t, type: 'elementSkill', element: 'wood', name: spec.name, heal });
  } else if (spec.element === 'fire') {
    for (let i = 0; i < ELEMENT_SKILLS.fire.hits; i++) {
      let dmg = Math.round(s.mAtk * ELEMENT_SKILLS.fire.atkMult * pace);
      dmg = splitIncoming(dmg, 'fire', 0, s.playerResist.fire ?? 0, s.guardUntil > s.t);
      const r = applyDamageToPlayer(s.hp, s.shield, dmg);
      s.hp = r.hp; s.shield = r.shield; s.stats.absorbed += r.absorbed;
      ev.push({ t: s.t, type: 'elementSkill', element: 'fire', name: spec.name, dmg, hpLoss: r.hpLoss, hit: i + 1 });
      if (s.hp <= 0) { finish(s, ev, false, '生命耗尽，冒险失败。'); return; }
    }
  } else {
    const atkMult = spec.element === 'water' ? ELEMENT_SKILLS.water.atkMult : ELEMENT_SKILLS.metal.atkMult;
    let dmg = Math.round(s.mAtk * atkMult * pace);
    dmg = splitIncoming(dmg, spec.element, 0, s.playerResist[spec.element] ?? 0, s.guardUntil > s.t);
    const r = applyDamageToPlayer(s.hp, s.shield, dmg);
    s.hp = r.hp; s.shield = r.shield; s.stats.absorbed += r.absorbed;
    ev.push({ t: s.t, type: 'elementSkill', element: spec.element, name: spec.name, dmg, hpLoss: r.hpLoss, hit: 1 });
    if (spec.element === 'water') {
      for (const a of s.actors) if (a.kind === 'weapon' || a.kind === 'needle') a.nextAt += WATER_SUPPRESS_MS;
    }
    if (s.hp <= 0) { finish(s, ev, false, '生命耗尽，冒险失败。'); return; }
  }
  s.skillCasts++;
  s.skillRamp *= 1 + SKILL_RAMP_STEP;
  ev.push({ t: s.t, type: 'skillRamp', casts: s.skillCasts, mult: s.skillRamp });
  s.skillNextAt = s.t + ELEMENT_SKILL_EVERY_MS;
}
function nextTimelineAt(s: CombatState): number {
  const e = ms(s.enrageAt) + s.enrageStage * ms(ECONOMY.enrageStep);
  let next = Math.min(e, ms(ECONOMY.timeout));
  if (s.tideCycle) {
    const mod = s.t % TIDE_PERIOD;
    const toFlip = mod < TIDE_HIGH ? TIDE_HIGH - mod : TIDE_PERIOD - mod;
    if (toFlip > 0) next = Math.min(next, s.t + toFlip);
  }
  if (s.compassDebuff > 0 && s.compassUntil > s.t) next = Math.min(next, s.compassUntil);
  if (s.poisonStacks > 0) next = Math.min(next, s.poisonNextAt);
  if (s.pendingEcho) next = Math.min(next, s.pendingEcho.at);
  if (s.pray && s.prayNextAt < Number.MAX_SAFE_INTEGER) next = Math.min(next, s.prayNextAt);
  if (s.overheatPausedUntil > s.t) next = Math.min(next, s.overheatPausedUntil);
  if (s.armorBreakUntil > s.t) next = Math.min(next, s.armorBreakUntil);
  if (s.summons) {
    for (let i = 0; i < s.summons.atSec.length; i++) {
      if (s.summonsDone[i]) continue;
      const at = s.summons.atSec[i] * 1000;
      if (at > s.t) next = Math.min(next, at);
    }
  }
  if (s.regen && s.regenNextAt < Number.MAX_SAFE_INTEGER && s.mHp > 0) next = Math.min(next, s.regenNextAt);
  if (s.iceSlowUntil > s.t) next = Math.min(next, s.iceSlowUntil);
  if (s.fireArmed && s.fireWindupUntil > s.t) next = Math.min(next, s.fireWindupUntil);
  if (s.invulnUntil > s.t) next = Math.min(next, s.invulnUntil);
  if (s.a09Debuff > 0 && s.a09Until > s.t) next = Math.min(next, s.a09Until);
  if (s.skillNextAt < Number.MAX_SAFE_INTEGER) next = Math.min(next, s.skillNextAt);
  return next;
}
function bossCrit(s: CombatState): boolean {
  if (!s.boss) return false;
  const n = (s.monAttacks * 17 + s.heartPhase * 13) >>> 0;
  const pct = s.heartPhases ? 28 : 20;
  return (n % 100) < pct;
}

function maybeHeartInvuln(s: CombatState, ev: CombatEvent[]) {
  if (!s.heartPhases || s.mHp <= 0 || s.t < s.invulnUntil) return;
  const ratio = s.mHp / s.mMaxHp;
  const marks = [0.66, 0.33];
  for (let i = 0; i < marks.length; i++) {
    if (s.invulnTriggered[i] || ratio > marks[i]) continue;
    s.invulnTriggered[i] = true;
    s.invulnUntil = s.t + 3000;
    s.fireWindupUntil = s.t + 3000 + 2400;
    s.fireArmed = true;
    ev.push({ t: s.t, type: 'invuln', ms: 3000 });
    ev.push({ t: s.t, type: 'fireWindup' });
    return;
  }
}

function applyToMonsterHp(s: CombatState, dmg: number): number {
  if (s.invulnUntil > s.t) return 0;
  let left = dmg;
  if (s.mShield > 0) {
    const abs = Math.min(s.mShield, left);
    s.mShield -= abs; left -= abs;
  }
  const real = Math.min(left, s.mHp);
  s.mHp -= real;
  return real;
}
function hitAdd(s: CombatState, a: Actor, ev: CombatEvent[], add: CombatState['adds'][number], raw: number) {
  const armor = add.armor ?? 0;
  const dmg = damageToMonster(Math.round(raw), armor);
  const real = Math.min(add.hp, dmg);
  add.hp -= real;
  s.stats.weapon[a.id] = (s.stats.weapon[a.id] ?? 0) + real;
  ev.push({ t: s.t, type: 'addHit', addId: add.id, dmg: real, hp: add.hp });
  if (add.hp <= 0) {
    ev.push({ t: s.t, type: 'addDown', addId: add.id });
    if (s.dualUnits && add.id === 'twin' && s.mHp <= 0) tryClearWin(s, ev, '怪物被击败！');
  }
}
function hitMonster(s: CombatState, a: Actor, ev: CombatEvent[], rawIn: number) {
  syncTideArmor(s, ev);
  syncCompass(s, ev);
  // 多目标：祝祷/召唤先打支援；双体 twin 不当支援——先打主目标，主死后才打 twin（溅射/烟火可同时压 twin）
  const support = s.adds.find(x => x.hp > 0 && x.id !== 'twin');
  const twin = s.adds.find(x => x.id === 'twin' && x.hp > 0);
  if (support && (a.kind === 'weapon' || a.kind === 'needle')) {
    const k = a.itemKind;
    if (k === 'firework_crossbow') {
      hitAdd(s, a, ev, support, rawIn);
      // 继续对主目标结算
    } else {
      hitAdd(s, a, ev, support, rawIn);
      if (k === 'spear') { rawIn = Math.round(rawIn * 0.35); }
      else {
        return;
      }
    }
  } else if (s.dualUnits && twin && s.mHp <= 0 && (a.kind === 'weapon' || a.kind === 'needle')) {
    hitAdd(s, a, ev, twin, rawIn);
    return;
  } else if (s.dualUnits && twin && a.itemKind === 'firework_crossbow' && (a.kind === 'weapon' || a.kind === 'needle')) {
    hitAdd(s, a, ev, twin, rawIn);
    // 继续打主目标
  }
  let raw = rawIn;
  if (s.a11Until > 0 && s.t < s.a11Until) raw = Math.round(raw * 1.25);
  if (runeOn(s.runes, a.id, 'U08') && isMonsterCharging(s)) raw = Math.round(raw * 1.15);
  if (hasRelic(s.relics, 'A02') && s.mShield > 0) raw = Math.round(raw * 1.12);
  if (hasRelic(s.relics, 'A07') && effectiveArmor(s, 0) === 0 && s.mShield <= 0) raw = Math.round(raw * 1.18);
  let ign = a.armorIgnore ?? 0;
  if (a.armorIgnorePct) ign += Math.floor(effectiveArmor(s, 0) * a.armorIgnorePct);
  const armor = effectiveArmor(s, ign);
  let dmg = damageToMonster(raw, armor);
  let waterPart = 0;
  if (a.element) {
    const split = splitDirect(dmg, a.element, s.monsterResist[a.element] ?? 0);
    dmg = split.total;
    waterPart = split.water;
  }
  const real = applyToMonsterHp(s, dmg);
  if (s.furnaceCycle && s.furnaceWindupUntil > s.t && waterPart > 0) {
    const credited = Math.min(waterPart, real);
    s.furnaceWater += credited;
    if (!s.furnaceBroke && s.furnaceWater >= Math.ceil(s.mMaxHp * 0.04)) {
      s.furnaceBroke = true;
      s.furnaceBreaks++;
      const mon = s.actors.find(x => x.kind === 'monster');
      if (mon) mon.nextAt = s.t;
      s.furnaceWindupUntil = s.t;
    }
  }
  s.stats.weapon[a.id] = (s.stats.weapon[a.id] ?? 0) + real;
  ev.push({ t: s.t, type: 'weapon', itemId: a.id, dmg: real, raw, heavy: raw >= 20 });
  // A03 / C01 / R05
  if (a.kind === 'weapon' && real > 0) {
    if (hasRelic(s.relics, 'A03')) {
      s.weaponHitCount++;
      if (s.weaponHitCount % 5 === 0) {
        s.poisonStacks = Math.min(s.poisonCap, s.poisonStacks + 2);
        if (s.poisonNextAt < s.t) s.poisonNextAt = s.t + POISON_TICK;
      }
    }
    if (hasRelic(s.relics, 'C01')) {
      s.c01Hits++;
      if (s.c01Hits % 6 === 0) {
        const bonus = applyToMonsterHp(s, damageToMonster(8, effectiveArmor(s, 0)));
        s.stats.weapon[a.id] = (s.stats.weapon[a.id] ?? 0) + bonus;
      }
    }
    if (hasRelic(s.relics, 'R05')) {
      s.r05Hits++;
      if (s.r05Hits % 3 === 0) {
        const bonus = applyToMonsterHp(s, damageToMonster(Math.floor(raw * 0.3), effectiveArmor(s, 0)));
        s.stats.weapon[a.id] = (s.stats.weapon[a.id] ?? 0) + bonus;
      }
    }
  }
  if (s.mHp <= 0) { s.pendingEcho = null; if (tryClearWin(s, ev, '怪物被击败！')) return; return; }
  // 阶段护盾（按阈值从高到低顺序）
  if (s.phaseShields) {
    const ratio = s.mHp / s.mMaxHp;
    for (let i = 0; i < s.phaseShields.thresholds.length; i++) {
      if (s.phaseShieldTriggered[i]) continue;
      if (ratio <= s.phaseShields.thresholds[i]) {
        s.phaseShieldTriggered[i] = true;
        s.mShield = Math.max(s.mShield, s.phaseShields.shield);
        ev.push({ t: s.t, type: 'phaseShield', threshold: s.phaseShields.thresholds[i], shield: s.phaseShields.shield });
      }
    }
  }
  // 黄金心脏阶段（规格：70%/35%；阶段切换暂停上一阶段技能）
  if (s.heartPhases) {
    const ratio = s.mHp / s.mMaxHp;
    if (s.heartPhase === 1 && ratio <= HEART_TUNE.phase2At) {
      s.heartPhase = 2;
      applyHeartElement(s, 2);
      s.heavyStrike = undefined; s.heavyPending = false;
      s.echo = { every: 3, delayMs: 500, pct: 0.35 };
      s.mShield = Math.max(s.mShield, HEART_TUNE.phase2Shield);
      ev.push({ t: s.t, type: 'heartPhase', phase: 2 });
    } else if (s.heartPhase === 2 && ratio <= HEART_TUNE.phase3At) {
      s.heartPhase = 3;
      applyHeartElement(s, 3);
      s.echo = undefined; s.pendingEcho = null;
      s.overheat = { every: 3, mult: 1.8, pauseMs: 2000 };
      s.mShield = Math.max(s.mShield, HEART_TUNE.phase3Shield);
      ev.push({ t: s.t, type: 'heartPhase', phase: 3 });
    }
  }
  maybeHeartInvuln(s, ev);
  // 熔炉巨像残血过热×2.0（一次）
  if (s.overheat && !s.furnaceEnraged && s.mHp / s.mMaxHp <= 0.4 && s.boss) {
    s.furnaceEnraged = true;
    s.overheat = { ...s.overheat, mult: 2.0 };
  }
  if (s.boss && !s.hasted && s.mHp < s.mMaxHp * 0.5 && !s.heartPhases && !s.phaseShields) {
    s.hasted = true; s.mInterval = Math.round(s.mInterval * ECONOMY.bossHasteRate);
    const m = s.actors.find(x => x.kind === 'monster')!; m.interval = s.mInterval;
    ev.push({ t: s.t, type: 'bossHaste' });
    // A01：蓄力/暴怒开始获盾
    if (hasRelic(s.relics, 'A01') && s.chargeEvents < 2) {
      s.chargeEvents++;
      const cap = Math.floor(s.maxHp * s.shieldCapRate);
      const add = Math.min(6, Math.max(0, cap - s.shield));
      s.shield += add;
      if (add) ev.push({ t: s.t, type: 'shield', itemId: 'relic_A01', amount: add });
    }
  }
}
function runActor(s: CombatState, a: Actor, ev: CombatEvent[]) {
  if (a.kind === 'weapon') {
    const shots = a.shots ?? 1;
    for (let i = 0; i < shots && !s.over; i++) {
      let v = a.value;
      if (i > 0 && a.itemKind === 'crossbow' && hasRelic(s.relics, 'R04')) v = Math.round(v * 1.35);
      hitMonster(s, a, ev, v);
    }
    // 链锤溅射：对下一存活 add
    if (!s.over && (a.splashPct ?? 0) > 0) {
      const live = s.adds.filter(x => x.hp > 0);
      if (live.length) hitAdd(s, a, ev, live[0], Math.round(a.value * a.splashPct!));
    }
  } else if (a.kind === 'control') {
    // 冰晶：减速，到期触发 A09
    s.iceSlowPct = a.value;
    if (s.iceSlowUntil > 0 && s.t >= s.iceSlowUntil && hasRelic(s.relics, 'A09')) {
      // 上一层刚到期
    }
    const was = s.iceSlowUntil;
    s.iceSlowUntil = s.t + 3000;
    // 拉长怪物间隔
    const m = s.actors.find(x => x.kind === 'monster');
    if (m) m.interval = Math.round(s.mInterval * (1 + a.value / 100));
    if (was > 0 && was <= s.t && hasRelic(s.relics, 'A09')) {
      s.a09Debuff = 2; s.a09Until = s.t + 2000;
    }
  } else if (a.kind === 'needle') {
    hitMonster(s, a, ev, a.value);
    if (!s.over) {
      let add = 1;
      if (runeOn(s.runes, a.id, 'U06')) add += 1;
      s.poisonStacks = Math.min(s.poisonCap, s.poisonStacks + add);
      if (s.poisonNextAt < s.t) s.poisonNextAt = s.t + POISON_TICK;
    }
  } else if (a.kind === 'shield') {
    if (a.maxUses !== undefined && (a.uses ?? 0) >= a.maxUses) return;
    const cap = Math.floor(s.maxHp * s.shieldCapRate);
    let gen = Math.round(a.value * (a.shieldMult ?? 1));
    if (s.heroClass === 'guard') s.guardBonusUsed = true;
    const amount = Math.max(0, Math.min(gen, cap - s.shield));
    s.shield += amount;
    if (a.maxUses !== undefined) a.uses = (a.uses ?? 0) + 1;
    ev.push({ t: s.t, type: 'shield', itemId: a.id, amount });
    if (amount > 0 && s.luckCharmBonus > 0 && !s.luckCharmUsed) {
      s.luckCharmUsed = true;
      const room = Math.max(0, cap - s.shield);
      const extra = Math.min(s.luckCharmBonus, room);
      s.shield += extra;
      s.stats.luckShield = (s.stats.luckShield ?? 0) + extra;
      s.stats.luckClipped = (s.stats.luckClipped ?? 0) + (s.luckCharmBonus - extra);
      ev.push({ t: s.t, type: 'shield', itemId: 'luck_charm', amount: extra });
    }
  } else if (a.kind === 'heal') {
    if (a.maxUses !== undefined && (a.uses ?? 0) >= a.maxUses) return;
    const heal = Math.min(a.value, s.maxHp - s.hp);
    s.hp += heal; s.stats.healed += heal;
    if (a.maxUses !== undefined) a.uses = (a.uses ?? 0) + 1;
    ev.push({ t: s.t, type: 'lamp', itemId: a.id, heal });
  } else {
    // 过热停火窗口
    if (s.overheatPausedUntil > s.t) return;
    if (s.furnaceCycle && s.furnaceVentUntil > s.t) return;
    if (s.furnaceCycle && s.furnaceWindupUntil > s.t) return;
    if (s.furnaceCycle && s.furnaceWindupUntil > 0 && s.t >= s.furnaceWindupUntil) {
      s.furnaceWindupUntil = 0;
      s.furnaceNormals = 0;
      s.armor = 0;
      s.furnaceVentUntil = s.t + 3000;
      if (s.furnaceBroke) { s.furnaceBroke = false; return; }
      const mult = enrageMult(s.enrageStage, s.enrageBonus) * (s.mHp / s.mMaxHp <= 0.4 ? 2 : 1.8);
      let dmg = Math.round(s.mAtk * mult * s.skillRamp);
      if (s.bossElement) dmg = splitIncoming(dmg, s.bossElement, s.heavyPlainShare, s.playerResist[s.bossElement] ?? 0, s.guardUntil > s.t);
      else if (s.guardUntil > s.t) dmg = Math.max(1, Math.floor(dmg * 0.6));
      const r = applyDamageToPlayer(s.hp, s.shield, dmg);
      s.hp = r.hp; s.shield = r.shield; s.stats.absorbed += r.absorbed;
      ev.push({ t: s.t, type: 'heavyStrike', mult: s.mHp / s.mMaxHp <= 0.4 ? 2 : 1.8 });
      ev.push({ t: s.t, type: 'monsterAttack', dmg, absorbed: r.absorbed, hpLoss: r.hpLoss });
      if (s.hp <= 0) { finish(s, ev, false, '生命耗尽，冒险失败。'); return; }
      return;
    }
    let mult = enrageMult(s.enrageStage, s.enrageBonus);
    let overheated = false;
    let heavy = false;
    if (s.heavyStrike && s.heavyPending) {
      // 同一击：蓄力结束打出倍率，不再递增攻击计数
      mult *= s.heavyStrike.mult;
      heavy = true;
      s.heavyPending = false;
      s.heavyWindupUntil = 0;
      ev.push({ t: s.t, type: 'heavyStrike', mult: s.heavyStrike.mult });
      if (s.heavyStrike.armorBreakMs) {
        s.armorBreakUntil = s.t + s.heavyStrike.armorBreakMs;
        s.armor = 0;
      }
    } else {
      s.monAttacks++;
      if (s.heavyStrike && s.monAttacks % s.heavyStrike.every === 0) {
        s.heavyPending = true;
        s.heavyWindupUntil = s.t + s.heavyStrike.windupMs;
        ev.push({ t: s.t, type: 'heavyWindup' });
        if (hasRelic(s.relics, 'A01') && s.chargeEvents < 2) {
          s.chargeEvents++;
          const cap = Math.floor(s.maxHp * s.shieldCapRate);
          const add = Math.min(6, Math.max(0, cap - s.shield));
          s.shield += add;
          if (add) ev.push({ t: s.t, type: 'shield', itemId: 'relic_A01', amount: add });
        }
        return;
      }
    }
    if (s.overheat) {
      if (s.nextHitOverheated) {
        mult *= s.overheat.mult;
        overheated = true;
        s.nextHitOverheated = false;
      } else if (s.monAttacks % s.overheat.every === 0) {
        s.nextHitOverheated = true; // 下一击过热
      }
    }
    if (s.furnaceCycle && s.furnaceWindupUntil <= s.t) {
      s.furnaceNormals++;
      if (s.furnaceNormals >= 3) {
        s.furnaceWindupUntil = s.t + 3000;
        s.furnaceWater = 0;
        s.furnaceBroke = false;
        ev.push({ t: s.t, type: 'heavyWindup' });
      }
    }
    let dmg = Math.round(s.mAtk * mult * s.skillRamp);
    const crit = bossCrit(s);
    if (crit) dmg = Math.max(dmg, Math.round(s.maxHp * (s.heartPhases ? HEART_CRIT_HP_PCT : BOSS_CRIT_HP_PCT)));
    if (s.bossElement) {
      const plain = heavy ? s.heavyPlainShare : s.plainShare;
      const resist = s.playerResist[s.bossElement] ?? 0;
      dmg = splitIncoming(dmg, s.bossElement, plain, resist, s.guardUntil > s.t);
    } else if (s.guardUntil > s.t) {
      dmg = Math.max(1, Math.floor(dmg * 0.6));
    }
    if (hasRelic(s.relics, 'K04')) dmg = Math.round(dmg * 1.20);
    // 冰晶减速对伤害无影响，仅间隔
    const hpBefore = s.hp;
    const r = applyDamageToPlayer(s.hp, s.shield, dmg);
    s.hp = r.hp; s.shield = r.shield; s.stats.absorbed += r.absorbed;
    ev.push({ t: s.t, type: 'monsterAttack', dmg, absorbed: r.absorbed, hpLoss: r.hpLoss, crit });
    if (hasRelic(s.relics, 'R01') && r.absorbed > 0) {
      s.r01Absorbed += r.absorbed;
      while (s.r01Absorbed >= 18 && !s.over) {
        s.r01Absorbed -= 18;
        applyToMonsterHp(s, damageToMonster(12, effectiveArmor(s, 0)));
        if (s.mHp <= 0) { tryClearWin(s, ev, '怪物被击败！'); return; }
      }
    }
    if (!s.c07Used && hasRelic(s.relics, 'C07') && r.hpLoss > 0 && s.hp > 0 && s.hp <= s.maxHp * 0.3) {
      s.c07Used = true;
      const heal = Math.min(12, s.maxHp - s.hp);
      s.hp += heal; s.stats.healed += heal;
    }
    if (overheated) {
      ev.push({ t: s.t, type: 'overheat', kind: 'strike' });
      s.overheatPausedUntil = s.t + (s.overheat?.pauseMs ?? 2000);
      s.armor = 0; // 护甲归零窗口
      ev.push({ t: s.t, type: 'overheat', kind: 'vent' });
    }
    // 回响排队
    if (s.echo && s.monAttacks % s.echo.every === 0) {
      s.pendingEcho = { at: s.t + s.echo.delayMs, dmg: Math.round(dmg * s.echo.pct) };
    }
    // A08：受到>20%最大生命的非致死生命伤害后+8盾
    if (hasRelic(s.relics, 'A08') && r.hpLoss > s.maxHp * 0.2 && s.hp > 0 && s.t >= s.a08CooldownUntil) {
      s.a08CooldownUntil = s.t + 6000;
      const cap = Math.floor(s.maxHp * s.shieldCapRate);
      const add = Math.min(8, Math.max(0, cap - s.shield));
      s.shield += add;
      if (add) ev.push({ t: s.t, type: 'shield', itemId: 'relic_A08', amount: add });
    }
    void hpBefore;
    if (s.hp <= 0) { finish(s, ev, false, '生命耗尽，冒险失败。'); return; }
    checkPotions(s, ev);
  }
}
export function stepCombat(s: CombatState, dtMs: number): CombatEvent[] {
  const ev: CombatEvent[] = [];
  const target = s.t + Math.max(0, Math.floor(dtMs));
  while (!s.over) {
    const tl = nextTimelineAt(s);
    const nextActor = Math.min(...s.actors.map(a => a.nextAt));
    const next = Math.min(tl, nextActor);
    if (next > target) break;
    s.t = next;
    tryAutoGuard(s);
    if (tl === next) { processTimeline(s, ev); if (s.over) break; }
    const due = s.actors.filter(a => a.nextAt === next).sort((a, b) => a.order - b.order);
    for (const a of due) {
      if (s.over) break;
      // 次数用尽的盾/灯：仍推进 nextAt 但不生效（已在 runActor return）
      runActor(s, a, ev);
      if (a.kind === 'shield' && a.maxUses !== undefined && (a.uses ?? 0) >= a.maxUses) {
        a.nextAt = Number.MAX_SAFE_INTEGER;
      } else if (a.kind === 'heal' && a.maxUses !== undefined && (a.uses ?? 0) >= a.maxUses) {
        a.nextAt = Number.MAX_SAFE_INTEGER;
      } else if (a.kind === 'monster' && s.heavyWindupUntil > s.t) {
        a.nextAt = s.heavyWindupUntil;
      } else if (a.kind === 'monster' && s.furnaceWindupUntil > s.t) {
        a.nextAt = s.furnaceWindupUntil;
      } else if (a.kind === 'monster' && s.furnaceVentUntil > s.t) {
        a.nextAt = s.furnaceVentUntil;
      } else if (a.kind === 'monster' && s.overheatPausedUntil > s.t) {
        a.nextAt = s.overheatPausedUntil;
      } else {
        const fast = s.rangerGap < 1 && (a.kind === 'weapon' || a.kind === 'needle');
        a.nextAt = s.t + (fast ? Math.round(a.interval * s.rangerGap) : a.interval);
      }
    }
  }
  if (!s.over) { s.t = target; tryAutoGuard(s); }
  return ev;
}
export function simulate(s: CombatState): CombatEvent[] {
  const all: CombatEvent[] = [];
  while (!s.over) all.push(...stepCombat(s, 1000));
  return all;
}

export function computeWeaponCombatValue(
  items: ItemInstance[],
  weapon: ItemInstance,
  runes: RuneInstance[],
  doctrine: string | null,
): { value: number; intervalMs: number } {
  const bag = items.filter(inBag);
  const weaponCount = bag.filter(i => {
    const c = ITEMS[i.kind].category;
    return c === 'weapon' || c === 'needle';
  }).length;
  let value = ITEMS[weapon.kind].category === 'weapon' ? weaponDamage(bag, weapon) : ITEMS[weapon.kind].values[weapon.level - 1];
  if (runes.some(r => r.runeId === 'U01' && r.itemId === weapon.id)) value = Math.round(value * 1.10);
  if (doctrine === 'T01') value = Math.round(value * doctrineT01Mult(weaponCount));
  let shorten = 0;
  if (runes.some(r => r.runeId === 'U03' && r.itemId === weapon.id)) shorten += 0.06;
  if (doctrine === 'T02') shorten += weaponCount >= 3 ? 0.06 : 0.02;
  const base = ms(ITEMS[weapon.kind].interval!);
  return { value, intervalMs: applyIntervalShorten(base, shorten) };
}

/** 结算用：钱袋金币（含 U07 / T06） */
export function computeBagGold(items: ItemInstance[], runes: RuneInstance[], doctrine: string | null, heroClass?: string): number {
  const bag = items.filter(inBag).filter(i => i.kind === 'moneybag');
  let total = 0;
  for (const i of bag) {
    let g = ITEMS.moneybag.values[i.level - 1];
    if (runes.some(r => r.runeId === 'U07' && r.itemId === i.id)) g += 2;
    total += g;
  }
  if (doctrine === 'T06') total = Math.round(total * 1.15);
  if (heroClass === 'merchant' && total > 0) total = Math.round(total * 1.35);
  return total;
}

/** 账匣额外金 */
export function computeLedgerBonus(items: ItemInstance[], startGold: number): number {
  if (startGold >= 30) return 0;
  const ledgers = items.filter(inBag).filter(i => i.kind === 'emergency_ledger');
  if (!ledgers.length) return 0;
  const best = ledgers.reduce((a, b) => (a.level >= b.level ? a : b));
  return ITEMS.emergency_ledger.values[best.level - 1];
}
