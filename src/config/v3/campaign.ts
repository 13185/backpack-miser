/** V3 50关战役配置：长度/章节/胜利终点均由此推导，禁止散落硬编码 */
export const CAMPAIGN_LENGTH = 50 as const;
export const CAMPAIGN_VERSION = 3 as const;
export const MID_ACT_LEVEL = 20 as const; // 剧情转折，非通关
export const FINAL_LEVEL = 50 as const;
export type CampaignMode = 'story' | 'ironman';
export interface StageBudget {
  level: number; chapter: number; name: string;
  hp: number; damage: number; interval: number; gold: number;
  boss?: boolean; eliteChoice?: boolean; midAct?: boolean; finalBoss?: boolean;
  finalPrep?: boolean; // 第49关最终整备站
}
export const V3_CHAPTERS = [
  { id: 1, name: '贪婪矿洞', bossName: '黄金宝箱怪' },
  { id: 2, name: '铁锈牢城', bossName: '铸铁看守' },
  { id: 3, name: '幽毒巢穴', bossName: '孵化蛛后' },
  { id: 4, name: '黄金王库', bossName: '税金领主' },
  { id: 5, name: '沉没商港', bossName: '盐雾船长' },
  { id: 6, name: '镜砂遗迹', bossName: '镜砂审计官' },
  { id: 7, name: '灰烬工坊', bossName: '熔炉巨像' },
  { id: 8, name: '静默圣堂', bossName: '缄默典狱长' },
  { id: 9, name: '逆流王庭', bossName: '债契摄政王' },
  { id: 10, name: '黄金心脏', bossName: '黄金心脏' },
] as const;
/** 后期公开预算调参（仅 level≥21；前20关不变）。倍率按章递增，可复现。 */
/** 调参档位：pass3（pass2≈80%仍偏高，再加压逼近40–75%）。仅改公开预算。 */
export const LATE_TUNE_PASS = 4 as const;
export const LATE_TUNE = {
  /** 普通关 HP 倍率：章5→10 */
  normalHp: [1.28, 1.34, 1.42, 1.50, 1.55, 1.60] as const,
  /** Boss HP 倍率：章5→10（pass4：压低章9/10，避免 B45/B50 个位数） */
  bossHp: [1.35, 1.42, 1.50, 1.58, 1.55, 1.60] as const,
  /** 基础伤害加算：章5→10 */
  damageAdd: [2, 3, 3, 4, 3, 3] as const,
  /** 攻速略加快（秒，从 interval 减去；下限 2.0）章5→10 */
  intervalCut: [0.05, 0.1, 0.12, 0.15, 0.12, 0.12] as const,
} as const;
export const HEART_TUNE = {
  /** 规格 §15：70% / 35%；护盾各 80。pass4 若过难再微调并记入 BALANCE_REPORT */
  phase2At: 0.70,
  phase3At: 0.35,
  phase2Shield: 90,
  phase3Shield: 90,
} as const;
/** 后期 Boss HP 倍率再降一档（章9/10），缓解 B45/B50 个位数通关 */
export const LATE_TUNE_PASS4_BOSS = {
  bossHp: [1.35, 1.42, 1.50, 1.58, 1.55, 1.60] as const,
  damageAdd: [2, 3, 3, 4, 3, 3] as const,
} as const;

export function applyLateTune(s: StageBudget): StageBudget {
  if (s.level < 21) return s;
  const i = Math.min(5, Math.max(0, s.chapter - 5));
  const hpMult = s.boss ? LATE_TUNE.bossHp[i] : LATE_TUNE.normalHp[i];
  const dmgAdd = LATE_TUNE.damageAdd[i];
  const cut = LATE_TUNE.intervalCut[i];
  return {
    ...s,
    hp: Math.round(s.hp * hpMult),
    damage: s.damage + dmgAdd,
    interval: Math.max(2.0, Math.round((s.interval - cut) * 100) / 100),
  };
}

/** 调参前底稿（勿直接改玩法侧引用；导出供报告对照） */
export const V3_STAGES_BASE: StageBudget[] = [
  { level: 1, chapter: 1, name: '遗落的矿灯', hp: 60, damage: 6, interval: 2.5, gold: 10 },
  { level: 2, chapter: 1, name: '碎石岔路', hp: 85, damage: 7, interval: 2.5, gold: 12 },
  { level: 3, chapter: 1, name: '监工的账', hp: 105, damage: 8, interval: 2.5, gold: 14, eliteChoice: true },
  { level: 4, chapter: 1, name: '背包里的命', hp: 130, damage: 9, interval: 2.5, gold: 16 },
  { level: 5, chapter: 1, name: '会咬人的货箱', hp: 200, damage: 11, interval: 2.8, gold: 24, boss: true },
  { level: 6, chapter: 2, name: '锈门之后', hp: 170, damage: 10, interval: 2.5, gold: 18 },
  { level: 7, chapter: 2, name: '箭塔通道', hp: 190, damage: 11, interval: 2.5, gold: 20 },
  { level: 8, chapter: 2, name: '双卫检查站', hp: 220, damage: 12, interval: 2.5, gold: 22, eliteChoice: true },
  { level: 9, chapter: 2, name: '重复的税票', hp: 245, damage: 13, interval: 2.5, gold: 24 },
  { level: 10, chapter: 2, name: '铁门落下', hp: 380, damage: 15, interval: 2.8, gold: 34, boss: true },
  { level: 11, chapter: 3, name: '被改道的药', hp: 290, damage: 14, interval: 2.5, gold: 26 },
  { level: 12, chapter: 3, name: '低语药池', hp: 330, damage: 15, interval: 2.5, gold: 28 },
  { level: 13, chapter: 3, name: '育母的粮仓', hp: 370, damage: 16, interval: 2.5, gold: 30, eliteChoice: true },
  { level: 14, chapter: 3, name: '活着的墨水', hp: 410, damage: 17, interval: 2.5, gold: 32 },
  { level: 15, chapter: 3, name: '巢穴的女王', hp: 650, damage: 19, interval: 2.8, gold: 44, boss: true },
  { level: 16, chapter: 4, name: '王库侧门', hp: 460, damage: 18, interval: 2.5, gold: 34 },
  { level: 17, chapter: 4, name: '钱与刀', hp: 520, damage: 19, interval: 2.5, gold: 36 },
  { level: 18, chapter: 4, name: '执刑走廊', hp: 580, damage: 20, interval: 2.5, gold: 38, eliteChoice: true },
  { level: 19, chapter: 4, name: '最后一页账', hp: 650, damage: 22, interval: 2.5, gold: 40 },
  { level: 20, chapter: 4, name: '金冠背后', hp: 1050, damage: 25, interval: 2.8, gold: 60, boss: true, midAct: true },
  { level: 21, chapter: 5, name: '沉没码头', hp: 600, damage: 19, interval: 2.5, gold: 26 },
  { level: 22, chapter: 5, name: '涨潮仓道', hp: 650, damage: 20, interval: 2.5, gold: 26 },
  { level: 23, chapter: 5, name: '私掠者的关税', hp: 690, damage: 20, interval: 2.5, gold: 28, eliteChoice: true },
  { level: 24, chapter: 5, name: '水线以下', hp: 730, damage: 21, interval: 2.5, gold: 28 },
  { level: 25, chapter: 5, name: '盐雾旗舰', hp: 1250, damage: 23, interval: 2.8, gold: 46, boss: true },
  { level: 26, chapter: 6, name: '会回声的沙', hp: 740, damage: 21, interval: 2.5, gold: 28 },
  { level: 27, chapter: 6, name: '两份相同的账', hp: 780, damage: 22, interval: 2.5, gold: 28 },
  { level: 28, chapter: 6, name: '账房的影子', hp: 830, damage: 22, interval: 2.5, gold: 30, eliteChoice: true },
  { level: 29, chapter: 6, name: '被抹去的名字', hp: 880, damage: 23, interval: 2.5, gold: 30 },
  { level: 30, chapter: 6, name: '审计结束之前', hp: 1450, damage: 25, interval: 2.9, gold: 50, boss: true },
  { level: 31, chapter: 7, name: '不熄的炉火', hp: 900, damage: 23, interval: 2.6, gold: 30 },
  { level: 32, chapter: 7, name: '铸币流水线', hp: 950, damage: 23, interval: 2.6, gold: 30 },
  { level: 33, chapter: 7, name: '断臂的旧订单', hp: 1000, damage: 24, interval: 2.6, gold: 31, eliteChoice: true },
  { level: 34, chapter: 7, name: '熔炉旁的选择', hp: 1080, damage: 24, interval: 2.6, gold: 31 },
  { level: 35, chapter: 7, name: '最后一炉金币', hp: 1650, damage: 26, interval: 3.0, gold: 54, boss: true },
  { level: 36, chapter: 8, name: '无声的誓言', hp: 1100, damage: 24, interval: 2.6, gold: 31 },
  { level: 37, chapter: 8, name: '不准被治好的伤', hp: 1160, damage: 25, interval: 2.6, gold: 31 },
  { level: 38, chapter: 8, name: '债契保管室', hp: 1220, damage: 25, interval: 2.6, gold: 32, eliteChoice: true },
  { level: 39, chapter: 8, name: '活人的签名', hp: 1300, damage: 26, interval: 2.6, gold: 32 },
  { level: 40, chapter: 8, name: '缄默的证人', hp: 1850, damage: 27, interval: 2.9, gold: 58, boss: true },
  { level: 41, chapter: 9, name: '迟到的攻击', hp: 1320, damage: 26, interval: 2.6, gold: 32 },
  { level: 42, chapter: 9, name: '归还的货物', hp: 1400, damage: 26, interval: 2.6, gold: 33 },
  { level: 43, chapter: 9, name: '摄政王的审判', hp: 1480, damage: 27, interval: 2.6, gold: 33, eliteChoice: true },
  { level: 44, chapter: 9, name: '还给谁的明天', hp: 1560, damage: 27, interval: 2.6, gold: 34 },
  { level: 45, chapter: 9, name: '王冠的债主', hp: 2100, damage: 29, interval: 2.9, gold: 62, boss: true },
  { level: 46, chapter: 10, name: '旧矿灯再亮', hp: 1580, damage: 27, interval: 2.6, gold: 34 },
  { level: 47, chapter: 10, name: '铁门向外开', hp: 1660, damage: 28, interval: 2.6, gold: 35 },
  { level: 48, chapter: 10, name: '最后一笔追索', hp: 1740, damage: 28, interval: 2.6, gold: 35, eliteChoice: true },
  { level: 49, chapter: 10, name: '放下与带走', hp: 1820, damage: 29, interval: 2.6, gold: 36, finalPrep: true },
  { level: 50, chapter: 10, name: '黄金心脏', hp: 2400, damage: 30, interval: 2.9, gold: 80, boss: true, finalBoss: true },
];

/**
 * 3.4.0：在故事战役底稿上再压一档。没有难度选择。
 * 五段：1–10 逐步，10–20 每关明显更硬，20–30 大步，30–40 再抬一倍手感，40–50 再翻上去。
 * 挂机应在 8–12 关倒下；随手买武器的人卡在 10–20；每一关都在算的人后期经常剩不到三成血。
 */
export const HARD_TUNE_VERSION = '3.6.3-retune30' as const;

interface Pressure { hp: number; dmg: number; interval: number; gold: number }
const PRESSURE_BANDS = [
  { to: 10, hp0: 1.10, hp1: 1.48, d0: 1.10, d1: 1.50, i0: 1.00, i1: 0.94, g0: 0.62, g1: 0.45 },
  { to: 20, hp0: 1.48, hp1: 1.42, d0: 1.50, d1: 1.32, i0: 0.94, i1: 0.93, g0: 0.45, g1: 0.40 },
  { to: 30, hp0: 1.42, hp1: 1.36, d0: 1.32, d1: 1.24, i0: 0.93, i1: 0.92, g0: 0.40, g1: 0.38 },
  { to: 40, hp0: 1.36, hp1: 1.48, d0: 1.24, d1: 1.36, i0: 0.92, i1: 0.90, g0: 0.38, g1: 0.34 },
  { to: 50, hp0: 1.48, hp1: 1.62, d0: 1.36, d1: 1.50, i0: 0.90, i1: 0.88, g0: 0.34, g1: 0.30 },
] as const;

/** 相对当前故事底稿（普通关=底稿，首领=A04）的倍率。关卡边界两边相接。 */
export function pressureAt(level: number): Pressure {
  const lv = Math.max(1, Math.min(50, Math.floor(level)));
  let prev = 1;
  for (const b of PRESSURE_BANDS) {
    if (lv <= b.to) {
      const span = b.to - prev;
      const t = span <= 0 ? 1 : (lv - prev) / span;
      const lerp = (a: number, c: number) => a + (c - a) * t;
      return {
        hp: Math.round(lerp(b.hp0, b.hp1) * 1000) / 1000,
        dmg: Math.round(lerp(b.d0, b.d1) * 1000) / 1000,
        interval: Math.round(lerp(b.i0, b.i1) * 1000) / 1000,
        gold: Math.round(lerp(b.g0, b.g1) * 1000) / 1000,
      };
    }
    prev = b.to;
  }
  const last = PRESSURE_BANDS[PRESSURE_BANDS.length - 1];
  return { hp: last.hp1, dmg: last.d1, interval: last.i1, gold: last.g1 };
}

export function applyPressure(stages: StageBudget[]): StageBudget[] {
  return stages.map(s => {
    const p = pressureAt(s.level);
    // 首领自带重击和护甲。20 关后不再把基础伤害按普通关的倍率整段抬上去，否则一击就把认真构筑也秒了。
    let hpM = p.hp;
    let dmgM = p.dmg;
    if (!s.boss && s.level >= 20) {
      hpM = Math.min(hpM, 1.38);
      dmgM = Math.min(dmgM, 1.20);
    }
    if (s.boss && s.level >= 40) { hpM *= 0.72; dmgM *= 0.64; }
    else if (s.boss && s.level >= 20) { hpM *= 0.82; dmgM *= 0.74; }
    let hp = Math.max(1, Math.round(s.hp * hpM));
    let damage = Math.max(1, Math.round(s.damage * dmgM));
    let interval = Math.max(1.55, Math.round(s.interval * p.interval * 100) / 100);
    if (s.level >= 31) {
      const spike = lateSpike(s);
      hp = Math.max(1, Math.round(hp * spike.hp));
      damage = Math.max(1, Math.round(damage * spike.dmg));
      interval = Math.max(1.55, Math.round(interval * spike.interval * 100) / 100);
    }
    return {
      ...s,
      hp,
      damage,
      interval,
      gold: Math.max(4, Math.round(s.gold * p.gold)),
    };
  });
}

/** 只加在 31 关之后。1–30 关的倍率不动。首领比同章杂兵抬得更多。 */
function lateSpike(s: StageBudget): { hp: number; dmg: number; interval: number } {
  if (s.boss) {
    if (s.level >= 50) return { hp: 1.52, dmg: 1.06, interval: 0.95 };
    if (s.level >= 45) return { hp: 1.08, dmg: 1.02, interval: 0.98 };
    if (s.level >= 40) return { hp: 1.12, dmg: 1.02, interval: 0.98 };
    if (s.level >= 35) return { hp: 0.96, dmg: 1.00, interval: 1.00 };
    return { hp: 1.08, dmg: 1.04, interval: 0.98 };
  }
  if (s.level <= 34) return { hp: 1.08, dmg: 1.06, interval: 0.97 };
  if (s.level >= 41) return { hp: 1.12, dmg: 1.08, interval: 0.96 };
  return { hp: 1.12, dmg: 1.08, interval: 0.96 };
}

/** 附录 A04：故事战役首领的最终预算，不再叠地狱倍率。 */
export const STORY_BOSS_BUDGET: Record<number, { hp: number; damage: number; interval: number; armor: number }> = {
  5: { hp: 160, damage: 8, interval: 3.0, armor: 0 },
  10: { hp: 340, damage: 12, interval: 3.0, armor: 3 },
  15: { hp: 600, damage: 16, interval: 3.0, armor: 2 },
  20: { hp: 1100, damage: 22, interval: 3.0, armor: 3 },
  25: { hp: 1300, damage: 24, interval: 2.9, armor: 3 },
  30: { hp: 1500, damage: 25, interval: 2.9, armor: 4 },
  35: { hp: 1750, damage: 26, interval: 3.0, armor: 4 },
  40: { hp: 1950, damage: 27, interval: 2.9, armor: 4 },
  45: { hp: 2200, damage: 28, interval: 2.9, armor: 4 },
  50: { hp: 2500, damage: 30, interval: 2.9, armor: 4 },
};

/** 故事战役：底稿普通关 + A04 首领。地狱乘区另存为 HELL_STAGES，不进入默认对局。 */
export function applyStoryBudgets(stages: StageBudget[]): StageBudget[] {
  return stages.map(s => {
    const b = STORY_BOSS_BUDGET[s.level];
    if (!b) return { ...s };
    return { ...s, hp: b.hp, damage: b.damage, interval: b.interval, boss: true };
  });
}

/**
 * 段形仍是五段。1–10 步长不动。10–20 略松，第 6 列买下后 19 关能打完。
 * 20 关以后伤害加算放慢：敌伤要让护盾和药水还起作用。
 * 31 关起再把列出的攻击压一档。熔炉这类首领会把重击和过热叠在同一下，
 * 不压的话 Lv4/Lv5 来不及出手。生命步长仍一档比一档大。
 */
export const HARD_BANDS = [
  { from: 1, to: 10, hpStep: 0.032, dmgStep: 0.30, cutStep: 0.012, gold: 0.65 },
  { from: 10, to: 20, hpStep: 0.044, dmgStep: 0.12, cutStep: 0.012, gold: 0.58 },
  { from: 20, to: 30, hpStep: 0.058, dmgStep: 0.06, cutStep: 0.004, gold: 0.50 },
  { from: 30, to: 40, hpStep: 0.100, dmgStep: 0.08, cutStep: 0.004, gold: 0.50 },
  { from: 40, to: 50, hpStep: 0.120, dmgStep: 0.16, cutStep: 0.004, gold: 0.52 },
] as const;

const HARD_HP0 = 1.55;
const HARD_DMG0 = 2.5;
const HARD_CUT0 = 0.18;
/** Boss 相对普通关 HP 略低，逼技能/蓄力而不是纯海绵 */
const HARD_BOSS_HP_SCALE = 0.88;
/** 伤害加算上限，避免后期一击必杀无脑 */
const HARD_DMG_ADD_CAP = 16;
/**
 * 31 关起的攻击乘数。Lv4/Lv5 要花对赌才拿得到，后期按「有几件、不是满包」来留出手时间。
 * 1–30 不受影响。
 */
const LATE_REACH_DMG_SCALE = 0.62;

export interface HardParams {
  hp: number;
  bossHp: number;
  damageAdd: number;
  intervalCut: number;
  gold: number;
}

/** 按关卡号取分段地狱参数（可复现） */
export function hardParams(level: number): HardParams {
  const lv = Math.max(1, Math.min(50, Math.floor(level)));
  let hp = HARD_HP0;
  let dmg = HARD_DMG0;
  let cut = HARD_CUT0;
  let gold: number = HARD_BANDS[0].gold;
  let cursor = 1;
  for (const b of HARD_BANDS) {
    if (lv <= cursor) {
      gold = b.gold;
      break;
    }
    const steps = Math.min(lv, b.to) - cursor;
    hp += steps * b.hpStep;
    dmg += steps * b.dmgStep;
    cut += steps * b.cutStep;
    gold = b.gold;
    cursor = b.to;
    if (lv <= b.to) break;
  }
  return {
    hp: Math.round(hp * 1000) / 1000,
    bossHp: Math.round(hp * HARD_BOSS_HP_SCALE * 1000) / 1000,
    damageAdd: Math.min(HARD_DMG_ADD_CAP, Math.round(dmg)),
    intervalCut: Math.round(cut * 1000) / 1000,
    gold,
  };
}

/** 章采样（文档/测试）：每章第3关普通 HP 倍率；Boss 用章末 */
export const HARD_TUNE = {
  hp: Array.from({ length: 10 }, (_, i) => hardParams(i * 5 + 3).hp) as unknown as readonly number[],
  bossHp: Array.from({ length: 10 }, (_, i) => hardParams(i * 5 + 5).bossHp) as unknown as readonly number[],
  damageAdd: Array.from({ length: 10 }, (_, i) => hardParams(i * 5 + 3).damageAdd) as unknown as readonly number[],
  intervalCut: Array.from({ length: 10 }, (_, i) => hardParams(i * 5 + 3).intervalCut) as unknown as readonly number[],
  gold: Array.from({ length: 10 }, (_, i) => hardParams(i * 5 + 3).gold) as unknown as readonly number[],
  bands: HARD_BANDS,
} as const;

export function applyHardTune(s: StageBudget): StageBudget {
  const p = hardParams(s.level);
  return {
    ...s,
    hp: Math.round(s.hp * (s.boss ? p.bossHp : p.hp)),
    damage: s.damage + p.damageAdd,
    interval: Math.max(1.45, Math.round((s.interval - p.intervalCut) * 100) / 100),
    gold: Math.max(1, Math.round(s.gold * p.gold)),
  };
}

/** 进度地板之后再压 31 关起的攻击，避免地板把压掉的伤害加回来。 */
function scaleLateReach(stages: StageBudget[]): StageBudget[] {
  return stages.map(s => s.level < 31 ? s : {
    ...s,
    damage: Math.max(1, Math.round(s.damage * LATE_REACH_DMG_SCALE)),
  });
}

/** Boss 相对上一关 HP 的进度地板（3.2.1 由 1.35 略降到 1.28） */
export const HARD_BOSS_PROGRESS_FLOOR = 1.28;

/** 防止章初普通关相对上一关“放暑假”；Boss 相对前关至少 HARD_BOSS_PROGRESS_FLOOR× */
function applyProgressFloor(stages: StageBudget[]): StageBudget[] {
  const out: StageBudget[] = [];
  let prevHp = 0;
  let prevDmg = 0;
  for (const s of stages) {
    const next = { ...s };
    if (prevHp > 0) {
      if (next.boss) {
        next.hp = Math.max(next.hp, Math.round(prevHp * HARD_BOSS_PROGRESS_FLOOR));
        next.damage = Math.max(next.damage, prevDmg + 2);
      } else {
        next.hp = Math.max(next.hp, Math.round(prevHp * 0.85));
        next.damage = Math.max(next.damage, prevDmg);
      }
    }
    prevHp = next.hp;
    prevDmg = next.damage;
    out.push(next);
  }
  return out;
}

export const HELL_STAGES: StageBudget[] = scaleLateReach(applyProgressFloor(
  V3_STAGES_BASE.map(applyLateTune).map(applyHardTune),
));
/**
 * 3.6.2 先把首领生命和攻击、普通关生命都 ×2。
 * 3.6.3 在那一档上再砍 30%：floor(×2 × 0.7) = floor(×1.4)。
 * 普通关攻击不动。精英仍乘自己的 ELITE_HP_MULT，所以精英血量跟着这档走。
 */
export function applyJackDouble(stages: StageBudget[]): StageBudget[] {
  const cut = (n: number) => Math.floor(n * 2 * 0.7);
  return stages.map(s => s.boss
    ? { ...s, hp: cut(s.hp), damage: cut(s.damage) }
    : { ...s, hp: cut(s.hp) });
}

export const V3_STAGES: StageBudget[] = applyJackDouble(applyPressure(applyStoryBudgets(V3_STAGES_BASE)));
export function stageOf(level: number): StageBudget {
  const s = V3_STAGES[level - 1];
  if (!s) throw new Error(`无效关卡 ${level}`);
  return s;
}
export function chapterOf(level: number): number { return stageOf(level).chapter; }
export function isBossLevel(level: number): boolean { return !!stageOf(level).boss; }
export function isFinalVictory(level: number): boolean { return level >= CAMPAIGN_LENGTH; }
export function isMidAct(level: number): boolean { return level === MID_ACT_LEVEL; }
export function campAfterBoss(level: number): boolean {
  return isBossLevel(level) && level < CAMPAIGN_LENGTH;
}
