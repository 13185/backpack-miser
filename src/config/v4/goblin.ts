import { ITEMS } from '../items';
import type { ItemKind, Level } from '../../models/types';

/** 限时打宝的秒数。击倒窗口和逃走都用这一条。 */
export const GOBLIN_SECONDS = 40;
/** 相对「参考火力打满 40 秒」的血量倍数。三段一起乘。 */
export const GOBLIN_HP_MULT = 2;
export const GOBLIN_NAME = '罗纹口袋哥布林';
export const GOBLIN_TAUNT = '哈哈哈，给你机会你中用啊，傻瓜。';
export const GOBLIN_VOICE = 'audio/voice/goblin_taunt';
/** 击杀掉落默认等级。 */
export const GOBLIN_DROP_LEVEL: Level = 3;
/** 非常小的概率改成 4 级。 */
export const GOBLIN_LV4_CHANCE = 0.05;

export const GOBLIN_BANDS = [
  { id: '10-20', from: 10, to: 20 },
  { id: '20-30', from: 20, to: 30 },
  { id: '40-50', from: 40, to: 50 },
] as const;
export type GoblinBandId = typeof GOBLIN_BANDS[number]['id'];

/**
 * 各段用来估血的参考武器。只加物品表里的伤害/间隔。
 * 连弩按两箭。不含宝石邻接、遗物、同种衰减。
 * 10–20：匕首 2、大剑 2、连弩 2、战锤 1。
 * 20–30：再换成匕首 3、战锤 2，加上长矛 1。
 * 40–50：匕首 3、大剑 3、连弩 3、战锤 3、长矛 2、链锤 2。
 * 先算这套武器打满 GOBLIN_SECONDS 的伤害，再乘 GOBLIN_HP_MULT。
 * 护甲是 0。倍数是 2 时，参考火力在 40 秒里大约只打掉一半，时限一到它就逃走。
 * 后段普通怪本身已经很厚，这里不按关卡生命再乘 3 倍。
 */
export const GOBLIN_REFERENCE: Record<GoblinBandId, readonly { kind: ItemKind; level: 1 | 2 | 3; shots?: number }[]> = {
  '10-20': [
    { kind: 'dagger', level: 2 },
    { kind: 'greatsword', level: 2 },
    { kind: 'crossbow', level: 2, shots: 2 },
    { kind: 'warhammer', level: 1 },
  ],
  '20-30': [
    { kind: 'dagger', level: 3 },
    { kind: 'greatsword', level: 2 },
    { kind: 'crossbow', level: 2, shots: 2 },
    { kind: 'warhammer', level: 2 },
    { kind: 'spear', level: 1 },
  ],
  '40-50': [
    { kind: 'dagger', level: 3 },
    { kind: 'greatsword', level: 3 },
    { kind: 'crossbow', level: 3, shots: 2 },
    { kind: 'warhammer', level: 3 },
    { kind: 'spear', level: 2 },
    { kind: 'chain_hammer', level: 2 },
  ],
};

export function goblinReferenceDps(band: GoblinBandId): number {
  let dps = 0;
  for (const w of GOBLIN_REFERENCE[band]) {
    const d = ITEMS[w.kind];
    dps += (d.values[w.level - 1] * (w.shots ?? 1)) / d.interval!;
  }
  return dps;
}

export function goblinHp(band: GoblinBandId): number {
  return Math.floor(goblinReferenceDps(band) * GOBLIN_SECONDS) * GOBLIN_HP_MULT;
}

export function goblinBandForLevel(level: number): GoblinBandId | null {
  return GOBLIN_BANDS.find(b => level >= b.from && level <= b.to)?.id ?? null;
}

/** 四张静止姿态，不是逐帧动画。脚底对齐其他敌人的 1024 画布。 */
export const GOBLIN_POSES = {
  idle: { key: 'enemy_loot_goblin', src: 'art/enemies/G_loot_goblin_idle.png' },
  hit: { key: 'enemy_loot_goblin_hit', src: 'art/enemies/G_loot_goblin_hit.png' },
  escape: { key: 'enemy_loot_goblin_escape', src: 'art/enemies/G_loot_goblin_escape.png' },
  defeat: { key: 'enemy_loot_goblin_defeat', src: 'art/enemies/G_loot_goblin_defeat.png' },
} as const;
