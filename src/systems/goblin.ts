import type { LevelDef } from '../config/levels';
import { isBossLevel } from '../config/v3/campaign';
import { getLevel } from '../config/v3/levels';
import { ITEM_KINDS, ITEMS, itemUnlockLevel } from '../config/items';
import {
  GOBLIN_BANDS, GOBLIN_DROP_LEVEL, GOBLIN_LV4_CHANCE, GOBLIN_NAME, GOBLIN_SECONDS,
  goblinBandForLevel, goblinHp, type GoblinBandId,
} from '../config/v4/goblin';
import type { GameState, ItemKind, Level } from '../models/types';
import { Rng } from './rng';

export interface GoblinSpawn {
  band: GoblinBandId;
  /** 0 表示这段已经错过，不再出现。 */
  level: number;
  done: boolean;
}

export function goblinChoices(bandId: GoblinBandId, minLevel: number): number[] {
  const band = GOBLIN_BANDS.find(b => b.id === bandId)!;
  const all: number[] = [];
  for (let lv = Math.max(band.from, minLevel); lv <= band.to; lv++) {
    if (lv >= 50) continue;
    all.push(lv);
  }
  const normals = all.filter(lv => !isBossLevel(lv));
  return normals.length ? normals : all;
}

/** 每段只抽一次。已经写进存档的不重抽。随机流不碰主线 rng。 */
export function ensureGoblinSpawns(s: GameState) {
  if (!s.goblinSpawns) s.goblinSpawns = [];
  if (typeof s.goblinRng !== 'number') s.goblinRng = (((s.rng ?? 1) ^ 0x6b1d0b11) >>> 0) || 1;
  const r = new Rng(s.goblinRng);
  let used = false;
  for (const band of GOBLIN_BANDS) {
    if (s.goblinSpawns.some(g => g.band === band.id)) continue;
    used = true;
    if (s.level > band.to) {
      s.goblinSpawns.push({ band: band.id, level: 0, done: true });
      continue;
    }
    const choices = goblinChoices(band.id, Math.max(band.from, s.level));
    if (!choices.length) {
      s.goblinSpawns.push({ band: band.id, level: 0, done: true });
      continue;
    }
    s.goblinSpawns.push({ band: band.id, level: choices[r.int(choices.length)], done: false });
  }
  if (used) s.goblinRng = r.state;
}

export function activeGoblin(s: GameState): GoblinSpawn | null {
  if (s.gearFight) return null;
  ensureGoblinSpawns(s);
  return s.goblinSpawns?.find(g => !g.done && g.level === s.level) ?? null;
}

export function goblinLevel(levelNo: number): LevelDef {
  const stage = getLevel(levelNo);
  const band = goblinBandForLevel(levelNo) ?? '10-20';
  return {
    monster: 'loot_goblin',
    title: GOBLIN_NAME,
    level: levelNo,
    hp: goblinHp(band),
    atk: 0,
    interval: 99,
    boss: false,
    chapter: stage.chapter,
    mechSummary: `${GOBLIN_SECONDS}秒内打倒才掉装备。它不还手。超时逃走，不扣生命、不扣金币。`,
  };
}

/** 当前关已解锁的武器和可用装备。护甲从第 11 关起可进池。不要负担物。 */
export function goblinDropPool(level: number): ItemKind[] {
  return ITEM_KINDS.filter(k => {
    if (k === 'burden') return false;
    if (ITEMS[k].category === 'armor') return level >= 11;
    return itemUnlockLevel(k) <= level;
  });
}

export function rollGoblinDrop(rng: Rng, level: number): { kind: ItemKind; level: Level } {
  const lv: Level = rng.next() < GOBLIN_LV4_CHANCE ? 4 : GOBLIN_DROP_LEVEL;
  const pool = goblinDropPool(level);
  const kind = pool[rng.int(pool.length)] ?? 'dagger';
  return { kind, level: lv };
}
