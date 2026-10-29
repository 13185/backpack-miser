import type { LevelDef } from '../levels';
import type { MonsterKind } from '../monsters';
import { DUAL_UNIT_KINDS } from '../monsters';
import { STORY_BOSS_BUDGET, V3_STAGES, stageOf, type StageBudget } from './campaign';

/** 章节常备普通怪（真实 kind，非换皮） */
const CHAPTER_MONSTERS: Record<number, MonsterKind[]> = {
  1: ['slime', 'bat', 'skeleton', 'rats'],
  2: ['beetle', 'archer', 'brute', 'vault_guard'],
  3: ['spider', 'archer', 'priest', 'spider'],
  4: ['miner', 'vault_guard', 'hound', 'miner'],
  5: ['harbor_patrol', 'tide_crab', 'smuggler', 'tide_crab'],
  6: ['mirror_sentinel', 'sandmirror_xbow', 'mirror_sentinel', 'sandmirror_xbow'],
  7: ['ash_sapper', 'furnace_guard', 'ash_sapper', 'furnace_guard'],
  8: ['chanter', 'amulet_attendant', 'chanter', 'amulet_attendant'],
  9: ['echo_guard', 'amulet_attendant', 'echo_guard', 'echo_guard'],
  10: ['core_soldier', 'lamp_priest', 'core_soldier', 'lamp_priest'],
};

/** 关卡号强制映射（含 N05 rats / N15–N24 / Boss） */
const EXPLICIT: Record<number, MonsterKind> = {
  4: 'rats',
  5: 'mimic',
  10: 'iron_warden',
  15: 'spider_queen',
  20: 'tax_lord',
  21: 'harbor_patrol', 22: 'tide_crab', 23: 'smuggler', 24: 'tide_crab', 25: 'salt_captain',
  26: 'mirror_sentinel', 27: 'sandmirror_xbow', 29: 'mirror_sentinel', 30: 'mirror_auditor',
  31: 'ash_sapper', 32: 'furnace_guard', 34: 'ash_sapper', 35: 'furnace_colossus',
  36: 'chanter', 37: 'amulet_attendant', 39: 'chanter', 40: 'silence_warden',
  41: 'echo_guard', 42: 'amulet_attendant', 44: 'echo_guard', 45: 'debt_regent',
  46: 'core_soldier', 47: 'lamp_priest', 49: 'core_soldier', 50: 'golden_heart',
};

const BOSS_BY_CHAPTER: Partial<Record<number, MonsterKind>> = {
  1: 'mimic', 2: 'iron_warden', 3: 'spider_queen', 4: 'tax_lord', 5: 'salt_captain',
  6: 'mirror_auditor', 7: 'furnace_colossus', 8: 'silence_warden', 9: 'debt_regent', 10: 'golden_heart',
};

/** 精英路线覆盖（真实精英 kind + 机制） */
const ELITE_KIND: Record<number, MonsterKind> = {
  3: 'elite_foreman',
  8: 'elite_dual_guard',
  13: 'elite_brood',
  18: 'elite_executioner',
  23: 'elite_smuggler_deacon',
  28: 'elite_twin_auditors',
  33: 'elite_forge_overseer',
  38: 'elite_sealing_friar',
  43: 'elite_debt_knight',
  48: 'elite_last_auditor',
};

function monsterFor(stage: StageBudget): MonsterKind {
  if (EXPLICIT[stage.level]) return EXPLICIT[stage.level];
  if (stage.boss) return BOSS_BY_CHAPTER[stage.chapter] ?? 'mimic';
  const pool = CHAPTER_MONSTERS[stage.chapter] ?? CHAPTER_MONSTERS[1];
  return pool[(stage.level - 1) % pool.length];
}

function armorFor(stage: StageBudget, kind: MonsterKind): number | undefined {
  const table: Partial<Record<MonsterKind, number>> = {
    beetle: 2, vault_guard: 3, tide_crab: 2, salt_captain: 3,
    iron_warden: 5, furnace_guard: 3, furnace_colossus: 5, core_soldier: 4,
    mirror_auditor: 2, silence_warden: 3, debt_regent: 4, tax_lord: 4, golden_heart: 4,
    echo_guard: 2, elite_dual_guard: 2, elite_forge_overseer: 3, elite_debt_knight: 2,
    elite_smuggler_deacon: 3, elite_sealing_friar: 2, elite_last_auditor: 2,
    skeleton: Math.min(2 + Math.floor((stage.chapter - 1) / 2), 8),
  };
  if (kind in table) return table[kind];
  if (kind === 'skeleton') return Math.min(2 + Math.floor((stage.chapter - 1) / 2), 8);
  return undefined;
}

function mechFor(stage: StageBudget, kind: MonsterKind): Partial<LevelDef> {
  // —— Boss ——
  if (kind === 'mimic' || stage.level === 5) {
    return {
      heavyStrike: { every: 3, mult: 2.2, windupMs: 1800 },
      phaseShields: { thresholds: [0.55], shield: 45 },
      openMShieldPct: 18,
      mechSummary: '噬金：每3击2.2倍撕咬（蓄力1.8秒）；开场18%生命转盾；半血再获45盾。',
    };
  }
  if (kind === 'iron_warden' || stage.level === 10) {
    return {
      heavyStrike: { every: 3, mult: 2.0, windupMs: 2000, armorBreakMs: 2000 },
      mechSummary: '第3击2倍重击（蓄力2秒），重击后2秒护甲归零破绽。',
    };
  }
  if (kind === 'spider_queen' || stage.level === 15) {
    return {
      summons: { atSec: [7, 16, 26], hpPct: 0.16, maxAlive: 2, name: '弱蛛' },
      heavyStrike: { every: 4, mult: 1.7, windupMs: 1600 },
      mechSummary: '第7/16/26秒召唤弱蛛（16%预算，最多2只）；每4击1.7倍蓄力撕咬。',
    };
  }
  if (kind === 'tax_lord' || stage.level === 20) {
    return {
      phaseShields: { thresholds: [0.70, 0.35], shield: 60 },
      heavyStrike: { every: 4, mult: 1.5, windupMs: 3000 },
      mechSummary: '生命首次低于70%和35%时各获得60护盾；每4击1.5倍重击（提前3秒预告）。',
    };
  }
  if (kind === 'salt_captain' || stage.level === 25) {
    return {
      heavyStrike: { every: 2, mult: 2.0, windupMs: 1600 },
      phaseShields: { thresholds: [0.60, 0.30], shield: 90 },
      openMShieldPct: 15,
      mechSummary: '潮汐护甲；开场15%转盾；60%/30%各获90盾；每2击2.0倍重击（蓄力1.6秒）。',
    };
  }
  if (kind === 'mirror_auditor' || stage.level === 30) {
    return {
      echo: { every: 2, delayMs: 1200, pct: 0.70 },
      phaseShields: { thresholds: [0.65, 0.35], shield: 110 },
      heavyStrike: { every: 4, mult: 1.8, windupMs: 1800 },
      mechSummary: '每2击后1.2秒追加70%回响；65%/35%各获110盾；每4击1.8倍蓄力击。',
    };
  }
  if (kind === 'furnace_colossus' || stage.level === 35) {
    return {
      overheat: { every: 2, mult: 2.2, pauseMs: 2200 },
      heavyStrike: { every: 4, mult: 2.0, windupMs: 2000 },
      phaseShields: { thresholds: [0.5], shield: 140 },
      mechSummary: '护甲4；每2次普攻后×2.2过热（停手2.2秒破甲）；半血140盾；每4击2.0倍蓄力。',
    };
  }
  if (kind === 'silence_warden' || stage.level === 40) {
    return {
      pray: { intervalMs: 4500, shield: 58 },
      prayShare: 0.32,
      heavyStrike: { every: 3, mult: 2.1, windupMs: 1600 },
      phaseShields: { thresholds: [0.55, 0.25], shield: 160 },
      mechSummary: '祝祷者占32%预算（4.5秒/58盾）；55%/25%各获160盾；每3击2.1倍蓄力。',
    };
  }
  if (kind === 'debt_regent' || stage.level === 45) {
    return {
      echo: { every: 3, delayMs: 1100, pct: 0.70 },
      phaseShields: { thresholds: [0.70, 0.40, 0.15], shield: 180 },
      heavyStrike: { every: 3, mult: 2.2, windupMs: 1500 },
      mechSummary: '护甲4；每3击后70%回响；70%/40%/15%各获180盾；每3击2.2倍蓄力。',
    };
  }
  if (kind === 'golden_heart' || stage.level === 50) {
    return {
      heartPhases: { enabled: true },
      heavyStrike: { every: 3, mult: 2.3, windupMs: 2200 },
      mechSummary: '三阶段70%/35%：①重击 ②回响 ③过热；换阶段各获90盾；每3击2.3倍蓄力。40关后36秒狂暴。',
    };
  }

  // —— 双体（N05 / E08 / E28）——
  if (DUAL_UNIT_KINDS.includes(kind) || kind === 'rats') {
    const base: Partial<LevelDef> = {
      dualUnits: true,
      mechSummary: '双单位：生命预算对半，须全部击败。',
    };
    if (kind === 'elite_dual_guard') {
      return { ...base, mechSummary: '铁甲双卫：各50%预算、护甲2，须全灭。' };
    }
    if (kind === 'elite_twin_auditors') {
      return {
        ...base,
        echo: { every: 3, delayMs: 1500, pct: 0.4 },
        mechSummary: '双面稽核：各50%预算；共享回响计数（每3击后40%回响）。',
      };
    }
    return base;
  }

  // —— 普通 / 精英 kind 机制 ——
  if (kind === 'archer' || kind === 'smuggler' || kind === 'sandmirror_xbow') {
    const every = kind === 'sandmirror_xbow' ? 4 : 3;
    const echo = kind === 'sandmirror_xbow'
      ? { echo: { every: 4, delayMs: 1000, pct: 0.35 } as const, mechSummary: '每4次攻击后1秒追加35%回响。' }
      : kind === 'smuggler'
        ? { heavyStrike: { every: 3, mult: 1.5, windupMs: 2000 }, mechSummary: '每3击1.5倍重击（蓄力2秒）。' }
        : { heavyStrike: { every: 3, mult: 1.5, windupMs: 2000 }, mechSummary: '每3击1.5倍重击（蓄力2秒）。' };
    if (kind === 'sandmirror_xbow') return echo;
    return { heavyStrike: { every, mult: 1.5, windupMs: 2000 }, mechSummary: echo.mechSummary };
  }
  if (kind === 'mirror_sentinel') {
    return { echo: { every: 3, delayMs: 1500, pct: 0.5 }, mechSummary: '每第3次普通攻击后1.5秒追加50%回响。' };
  }
  if (kind === 'ash_sapper') {
    return { overheat: { every: 3, mult: 1.4, pauseMs: 2000 }, mechSummary: '每3次普攻后下一击×1.4过热，之后停手2秒。' };
  }
  if (kind === 'furnace_guard' || kind === 'core_soldier') {
    return { overheat: { every: 3, mult: 1.5, pauseMs: 2000 }, mechSummary: '每第3次攻击后过热停手2秒且护甲归零。' };
  }
  if (kind === 'priest' || kind === 'chanter') {
    return { pray: { intervalMs: 7000, shield: kind === 'chanter' ? 18 : 12 }, prayShare: 0.3, mechSummary: '祝祷：周期性有限自盾（含祝祷者单位）。' };
  }
  if (kind === 'amulet_attendant') {
    return { openMShieldPct: 10, mechSummary: '开战将自身10%生命转为护盾。' };
  }
  if (kind === 'echo_guard') {
    return { echo: { every: 4, delayMs: 1500, pct: 0.35 }, mechSummary: '护甲2；每第4次攻击后1.5秒产生35%回响。' };
  }
  if (kind === 'lamp_priest') {
    return { regen: { intervalMs: 8000, amount: 18 }, mechSummary: '每8秒自我治疗约预算3%。' };
  }
  if (kind === 'elite_foreman') {
    return { heavyStrike: { every: 4, mult: 1.4, windupMs: 1500 }, mechSummary: '精英监工：轻蓄力每4击1.4倍。' };
  }
  if (kind === 'elite_brood') {
    return { summons: { atSec: [10, 22], hpPct: 0.12, maxAlive: 2, name: '幼蛛' }, mechSummary: '精英育母：周期性召唤幼蛛。' };
  }
  if (kind === 'elite_executioner') {
    return { heavyStrike: { every: 3, mult: 1.6, windupMs: 2000 }, mechSummary: '精英执刑：重击更频。' };
  }
  if (kind === 'elite_smuggler_deacon') {
    return { heavyStrike: { every: 3, mult: 1.5, windupMs: 2000 }, mechSummary: '走私执事：潮甲+重击。' };
  }
  if (kind === 'elite_forge_overseer') {
    return { overheat: { every: 3, mult: 1.6, pauseMs: 3000 }, mechSummary: '锻债监造：过热后3秒护甲归零。' };
  }
  if (kind === 'elite_sealing_friar') {
    return {
      pray: { intervalMs: 7000, shield: 22 },
      prayShare: 0.25,
      heavyStrike: { every: 4, mult: 1.4, windupMs: 2000 },
      mechSummary: '封账修士：主攻+弱祝祷者（25%预算）。',
    };
  }
  if (kind === 'elite_debt_knight') {
    return { echo: { every: 4, delayMs: 1200, pct: 0.35 }, mechSummary: '追债骑士：回响+护甲。' };
  }
  if (kind === 'elite_last_auditor') {
    return {
      heavyStrike: { every: 3, mult: 1.5, windupMs: 2000 },
      phaseShields: { thresholds: [0.5], shield: 40 },
      mechSummary: '最后审计官：蓄力重击+一次阶段护盾。',
    };
  }

  // 章节教学 / 前期压力（地狱：几乎每场有意图）
  if (kind === 'slime') {
    const amt = stage.chapter <= 1 ? 4 : 10;
    return { regen: { intervalMs: 7000, amount: amt }, mechSummary: '凝胶再生：周期性回复少量生命。' };
  }
  if (kind === 'bat') {
    return { heavyStrike: { every: 4, mult: 1.6, windupMs: 900 }, mechSummary: '俯冲：每4击1.6倍俯冲（短蓄力）。' };
  }
  if (kind === 'brute' || kind === 'miner' || kind === 'hound') {
    return { heavyStrike: { every: 3, mult: 1.7, windupMs: 1600 }, mechSummary: '重砸：每3击1.7倍蓄力。' };
  }
  if (kind === 'vault_guard' || kind === 'beetle') {
    return { openMShieldPct: 12, mechSummary: '甲壳开场护盾（12%生命转盾）。' };
  }
  if (kind === 'harbor_patrol') {
    return { heavyStrike: { every: 4, mult: 1.5, windupMs: 1400 }, mechSummary: '巡丁蓄力：每4击1.5倍。' };
  }
  if (kind === 'spider') {
    return { summons: { atSec: [12], hpPct: 0.1, maxAlive: 1, name: '幼蛛' }, mechSummary: '产卵：约第12秒召唤1只幼蛛。' };
  }
  if (stage.chapter === 1 && !stage.boss && stage.level === 3) {
    return { heavyStrike: { every: 4, mult: 1.5, windupMs: 1400 }, mechSummary: '轻蓄力：每4击1.5倍。' };
  }
  return {};
}

function usesTide(kind: MonsterKind): boolean {
  return kind === 'tide_crab' || kind === 'salt_captain' || kind === 'elite_smuggler_deacon';
}

export function stageToLevelDef(stage: StageBudget): LevelDef {
  const monster = monsterFor(stage);
  const storyArmor = STORY_BOSS_BUDGET[stage.level]?.armor;
  const armor = storyArmor === 0 ? undefined : (storyArmor ?? armorFor(stage, monster));
  const mech = mechFor(stage, monster);
  const dual = !!mech.dualUnits || DUAL_UNIT_KINDS.includes(monster) || monster === 'rats';
  const bossLevels = new Set([5, 10, 15, 20, 25, 30, 35, 40, 45, 50]);
  return {
    monster,
    title: stage.name,
    level: stage.level,
    hp: stage.hp,
    atk: stage.damage,
    interval: stage.interval,
    chapter: stage.chapter,
    ...(armor !== undefined ? { armor } : {}),
    ...(stage.boss || bossLevels.has(stage.level) ? { boss: true } : {}),
    ...(usesTide(monster) ? { tideCycle: true } : {}),
    ...(dual ? { dualUnits: true } : {}),
    ...mech,
  };
}

/** 精英路线：替换 kind / 机制并保留预算缩放由 Game 处理 */
export function applyEliteOverlay(lv: LevelDef, levelNo: number): LevelDef {
  const kind = ELITE_KIND[levelNo];
  if (!kind) return lv;
  const fakeStage = stageOf(levelNo);
  const armor = armorFor(fakeStage, kind);
  const mech = mechFor(fakeStage, kind);
  const dual = !!mech.dualUnits || DUAL_UNIT_KINDS.includes(kind);
  return {
    ...lv,
    monster: kind,
    title: lv.title + '（精英）',
    ...(armor !== undefined ? { armor } : {}),
    ...(usesTide(kind) ? { tideCycle: true } : { tideCycle: lv.tideCycle }),
    dualUnits: dual || undefined,
    echo: undefined, overheat: undefined, pray: undefined, prayShare: undefined,
    heavyStrike: undefined, phaseShields: undefined, summons: undefined,
    openMShieldPct: undefined, regen: undefined, heartPhases: undefined,
    ...mech,
  };
}

export const V3_LEVELS: LevelDef[] = V3_STAGES.map(stageToLevelDef);

export function getLevel(level: number): LevelDef {
  const def = V3_LEVELS[level - 1];
  if (!def) throw new Error(`无效关卡 ${level}`);
  return def;
}

export function winGoldFor(level: number): number {
  return stageOf(level).gold;
}

export { ELITE_KIND };
