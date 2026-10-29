/**
 * 敌人立绘「显示层」映射（仅影响画面，不影响战斗数值/机制）。
 * 优先级：已选精英路线 → 章节变体 → MONSTER_ART 默认。
 * 所有 PNG：1024 画布，脚底锚点 y≈928（origin 0.5, 0.906），与主角帧一致。
 */
import type { MonsterKind } from '../config/monsters';

export const ENEMY_FOOT_ORIGIN_Y = 928 / 1024;
const p = (f: string) => ({ key: `enemyv_${f}`, src: `art/enemies/${f}.png` });

/** 精英关立绘（仅当本关已选择精英路线时使用） */
export const ELITE_LEVEL_ART: Record<number, { key: string; src: string }> = {
  3: p('E03_foreman'), 8: p('E08_dual_guard'), 13: p('E13_brood'), 18: p('E18_executioner'),
  23: p('E23_smuggler_deacon'), 28: p('E28_twin_auditors'), 33: p('E33_forge_overseer'),
  38: p('E38_sealing_friar'), 43: p('E43_debt_knight'), 48: p('E48_last_auditor'),
};

/**
 * 章节主题变体：兼容旧 kind 回退；新真实 kind 走 MONSTER_ART。
 */
export const CHAPTER_VARIANT_ART: Partial<Record<number, Partial<Record<MonsterKind, { key: string; src: string }>>>> = {
  2: { bat: p('N06_beetle'), skeleton: p('N07_archer'), brute: p('N04_brute') },
  3: { bat: p('N09_spider'), slime: p('N08_priest'), skeleton: p('N07_archer') },
  4: { brute: p('N10_miner'), skeleton: p('N11_vault_guard'), bat: p('N12_hound') },
  5: { smuggler: p('N15_smuggler_xbow') },
  6: {
    skeleton: p('N16_mirror_sentinel'), bat: p('N17_sandmirror_xbow'), brute: p('N16_mirror_sentinel'),
    mirror_sentinel: p('N16_mirror_sentinel'), sandmirror_xbow: p('N17_sandmirror_xbow'),
  },
  7: {
    brute: p('N19_furnace_guard'), skeleton: p('N18_ash_sapper'), bat: p('N18_ash_sapper'),
    ash_sapper: p('N18_ash_sapper'), furnace_guard: p('N19_furnace_guard'),
  },
  8: {
    priest: p('N20_chanter'), skeleton: p('N21_amulet_attendant'), bat: p('N20_chanter'),
    chanter: p('N20_chanter'), amulet_attendant: p('N21_amulet_attendant'),
  },
  9: {
    brute: p('N22_echo_guard'), skeleton: p('N22_echo_guard'), bat: p('N21_amulet_attendant'),
    echo_guard: p('N22_echo_guard'), amulet_attendant: p('N21_amulet_attendant'),
  },
  10: {
    skeleton: p('N23_core_soldier'), brute: p('N23_core_soldier'), bat: p('N24_lamp_priest'),
    core_soldier: p('N23_core_soldier'), lamp_priest: p('N24_lamp_priest'),
  },
};

/** 所有需预加载的变体图（去重） */
export function allVariantArt(): { key: string; src: string }[] {
  const m = new Map<string, { key: string; src: string }>();
  for (const a of Object.values(ELITE_LEVEL_ART)) m.set(a.key, a);
  for (const ch of Object.values(CHAPTER_VARIANT_ART)) for (const a of Object.values(ch ?? {})) if (a) m.set(a.key, a);
  return [...m.values()];
}

export interface PickEnemyArtOpts {
  /** 本关是否已选择精英路线（存档/chooseRoute）；未选则不显示精英皮 */
  eliteActive?: boolean;
}

/**
 * 选立绘。精英皮仅当 eliteActive===true 且非 Boss 关。
 */
export function pickEnemyArt(
  kind: MonsterKind, chapter: number, levelNo: number, boss: boolean,
  fallback?: { key: string; src: string },
  opts: PickEnemyArtOpts = {},
): { key: string; src: string } | undefined {
  if (!boss && opts.eliteActive && ELITE_LEVEL_ART[levelNo]) return ELITE_LEVEL_ART[levelNo];
  if (!boss) { const v = CHAPTER_VARIANT_ART[chapter]?.[kind]; if (v) return v; }
  return fallback;
}
