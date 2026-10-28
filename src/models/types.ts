export type ItemKind = 'dagger' | 'greatsword' | 'shield' | 'potion' | 'ruby' | 'moneybag';
export type Level = 1 | 2 | 3;
/** 装备实例：位于背包时有 x,y；临时区时为 null */
export interface ItemInstance {
  id: string;
  kind: ItemKind;
  level: Level;
  x: number | null;
  y: number | null;
  rotated: boolean;
}
export interface ShopSlot { kind: ItemKind; level: Level; bought: boolean; }
export type Phase = 'prep' | 'battle' | 'loot' | 'victory' | 'defeat';
export interface RunStats {
  kills: number;
  goldEarned: number;
  contribution: Record<string, number>; // 装备名称 -> 累计伤害/吸收/治疗
}
export interface LastBattle {
  level: number;
  won: boolean;
  reason: string;
  time: number;
  weaponDamage: { id: string; label: string; value: number }[];
  shieldAbsorb: number;
  potionHeal: number;
  bagGold: number;
  baseGold: number;
}
export interface GameState {
  version: number;
  phase: Phase;
  level: number; // 1..10，当前/下一场关卡
  hp: number;
  maxHp: number;
  gold: number;
  rows: number;
  cols: number;
  expansions: number;
  items: ItemInstance[];
  nextId: number;
  rng: number;
  loot: { level: number; options: { kind: ItemKind; level: Level }[]; claimed: boolean } | null;
  shop: { level: number; slots: ShopSlot[]; refreshes: number };
  battleToken: number; // 每场战斗唯一编号，用于防重复结算
  settledToken: number;
  stats: RunStats;
  last: LastBattle | null;
}
export interface Settings { sound: boolean; tutorialDone: boolean; }
