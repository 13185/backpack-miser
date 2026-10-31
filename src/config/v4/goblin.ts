import type { Level } from '../../models/types';

/** 限时打宝的秒数。击倒窗口和逃走都用这一条。 */
export const GOBLIN_SECONDS = 40;
/** 三段固定生命。不按参考火力或关卡预算再乘。 */
export const GOBLIN_HP = {
  '10-20': 6000,
  '20-30': 12000,
  '40-50': 20000,
} as const;
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

export function goblinHp(band: GoblinBandId): number {
  return GOBLIN_HP[band];
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
