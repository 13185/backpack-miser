/** 美术状态机：由战斗/游戏状态驱动，不由动画命中次数驱动伤害 */
export type HeroClassId = 'merchant' | 'guard' | 'ranger';
export type HeroAnimState =
  | 'idle' | 'move' | 'attack' | 'defend' | 'hurt' | 'drink' | 'special' | 'victory' | 'defeat';

export const HERO_ANIM_PRIORITY: Record<HeroAnimState, number> = {
  defeat: 100,
  victory: 90,
  hurt: 80,
  attack: 70,
  special: 65,
  drink: 60,
  defend: 50,
  move: 20,
  idle: 0,
};

/** 关键帧 hold 时长（ms）。真实多帧周期尚未生成，见 ART_BIBLE。 */
export const HERO_ANIM_HOLD_MS: Record<HeroAnimState, number> = {
  idle: 0,       // 循环 hold
  move: 0,
  attack: 520,
  defend: 480,
  hurt: 360,
  drink: 700,
  special: 700,
  victory: 0,
  defeat: 0,
};

export const HERO_FOOT_ORIGIN = { x: 0.5, y: 928 / 1024 }; // (512,928) on 1024 canvas
export const HERO_CLASSES: { id: HeroClassId; name: string; special: string }[] = [
  { id: 'merchant', name: '商旅', special: '拾金' },
  { id: 'guard', name: '守卫', special: '反击' },
  { id: 'ranger', name: '游侠', special: '闪避' },
];
