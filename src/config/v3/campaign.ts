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
  phase2Shield: 55,
  phase3Shield: 55,
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
 * 3.2.1 分段地狱略放松（玩家反馈 3.2.0 略难）：
 * 段形不变——1–10 逐步；10–20 明显；20–30 巨大；30–40 约翻倍感；40–50 再翻倍感。
 * HP 步长约降 10%，Boss 进度地板 1.28。叠在 LATE_TUNE 之上；无难度选择。
 */
export const HARD_TUNE_VERSION = '3.2.1-band-hell-eased' as const;

/** 段定义：from 级之后每升 1 关叠加的步长（HP倍率步 / 伤害加算步 / 攻速减秒步 / 金币倍率） */
export const HARD_BANDS = [
  /** 1–10：每关可感加压（步长温和；L1 仍可开局） */
  { from: 1, to: 10, hpStep: 0.032, dmgStep: 0.30, cutStep: 0.012, gold: 0.65 },
  /** 10–20：明显一关比一关难 */
  { from: 10, to: 20, hpStep: 0.058, dmgStep: 0.60, cutStep: 0.018, gold: 0.56 },
  /** 20–30：巨大难度跳 */
  { from: 20, to: 30, hpStep: 0.130, dmgStep: 1.25, cutStep: 0.028, gold: 0.46 },
  /** 30–40：约翻倍感（相对上一段步长） */
  { from: 30, to: 40, hpStep: 0.200, dmgStep: 1.55, cutStep: 0.028, gold: 0.48 },
  /** 40–50：再翻倍感 */
  { from: 40, to: 50, hpStep: 0.270, dmgStep: 1.70, cutStep: 0.022, gold: 0.50 },
] as const;

const HARD_HP0 = 1.55;
const HARD_DMG0 = 2.5;
const HARD_CUT0 = 0.18;
/** Boss 相对普通关 HP 略低，逼技能/蓄力而不是纯海绵 */
const HARD_BOSS_HP_SCALE = 0.88;
/** 伤害加算上限，避免后期一击必杀无脑 */
const HARD_DMG_ADD_CAP = 46;

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

export const V3_STAGES: StageBudget[] = applyProgressFloor(
  V3_STAGES_BASE.map(applyLateTune).map(applyHardTune),
);
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
