import { BAG_MAX_COLS, BAG_MAX_ROWS, ECONOMY } from '../config/economy';
import { CAMPAIGN_LENGTH, CAMPAIGN_VERSION } from '../config/v3';
import type { GameState, ItemInstance, Settings } from '../models/types';
import { occupiedCells } from './placement';

export const SAVE_VERSION = 3;
export const SAVE_KEY = 'backpack-miser-save';
export const SETTINGS_KEY = 'backpack-miser-settings';
export const SAVE_BACKUP_V1 = 'backpack-miser-save-v1-backup';
export const SAVE_BACKUP_V2 = 'backpack-miser-save-v2-backup';

export interface Storage { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void; }
export type LoadResult =
  | { status: 'none' }
  | { status: 'ok'; state: GameState }
  | { status: 'corrupt'; message: string };

export function validate(s: any): s is GameState {
  return s && typeof s === 'object' && s.version === SAVE_VERSION &&
    typeof s.level === 'number' && s.level >= 1 && s.level <= CAMPAIGN_LENGTH &&
    typeof s.hp === 'number' && typeof s.gold === 'number' && s.gold >= 0 && Array.isArray(s.items) && typeof s.rows === 'number' &&
    ['prep', 'battle', 'loot', 'camp', 'victory', 'defeat'].includes(s.phase) && s.shop && Array.isArray(s.shop.slots) &&
    typeof s.campaignLength === 'number' && s.campaignLength === CAMPAIGN_LENGTH &&
    typeof s.campaignVersion === 'number' &&
    (s.mode === 'story' || s.mode === 'ironman') &&
    s.items.every((i: any) => typeof i.id === 'string' && typeof i.kind === 'string' && [1, 2, 3, 4, 5].includes(i.level));
}

/** 3.3 背包扩容：旧 v3 档补上 expansions，不改玩家当前的 rows/cols。 */
export function migrateV3(s: any) {
  if (!s || typeof s !== 'object' || s.version !== SAVE_VERSION) return;
  if (typeof s.rows !== 'number' || s.rows < 1) s.rows = 4;
  if (typeof s.cols !== 'number' || s.cols < 1) s.cols = 5;
  if (typeof s.expansions !== 'number') {
    s.expansions = Math.max(0, s.rows - 4) + Math.max(0, s.cols - 5);
  }
  if (typeof s.forgeRng !== 'number') s.forgeRng = ((s.rng ?? 1) ^ 0x9e3779b9) >>> 0;
  if (typeof s.forgeVouchers !== 'number') s.forgeVouchers = 0;
  if (!Array.isArray(s.forgeVoucherGranted)) s.forgeVoucherGranted = [];
  if (!Array.isArray(s.bossPrep)) s.bossPrep = [];
  // A10：15–20 关且仍是 30 格及以下，免费补到至少 6×6，回满一次，补发已到的锻造券。
  if (s.a10Compensated === undefined && typeof s.level === 'number' && s.level >= 15 && s.level <= 20 && s.rows * s.cols <= 30) {
    s.cols = Math.max(s.cols, 6);
    s.rows = Math.max(s.rows, 6);
    s.expansions = Math.max(s.expansions, Math.max(0, s.rows - 4) + Math.max(0, s.cols - 5));
    if (typeof s.hp === 'number' && typeof s.maxHp === 'number') s.hp = s.maxHp;
    if (s.level > 12 && !s.forgeVoucherGranted.includes(12)) {
      s.forgeVoucherGranted.push(12);
      s.forgeVouchers += 1;
    }
    s.a10Compensated = true;
  } else if (s.a10Compensated === undefined) s.a10Compensated = false;
  clampBagToCap(s);
}

/**
 * 3.6.5：上限改成 6×6。已经更大的档把格子收到 6×6。
 * 占到界外的装备整件挪进临时区，不删除。已经是 6 列（含旧的金币第 6 列、A10 补到的 6×6）视为到顶，不再要求献祭。
 * 还停在 5 列的档按行数对齐进度：5×4 / 5×5 / 5×6 仍可按新阶梯往下走。
 */
export function clampBagToCap(s: { rows?: number; cols?: number; expansions?: number; items?: ItemInstance[] }) {
  if (!s || !Array.isArray(s.items)) return;
  for (const it of s.items) {
    if (it.x == null || it.y == null) continue;
    let outside = it.x >= BAG_MAX_COLS || it.y >= BAG_MAX_ROWS || it.x < 0 || it.y < 0;
    if (!outside) {
      try {
        outside = occupiedCells(it.kind, it.x, it.y, !!it.rotated).some(c => c.x >= BAG_MAX_COLS || c.y >= BAG_MAX_ROWS);
      } catch {
        outside = true;
      }
    }
    if (outside) { it.x = null; it.y = null; }
  }
  const cols = Math.min(BAG_MAX_COLS, Math.max(1, s.cols ?? ECONOMY.startCols));
  const rows = Math.min(BAG_MAX_ROWS, Math.max(1, s.rows ?? ECONOMY.startRows));
  s.cols = cols;
  s.rows = rows;
  if (cols >= BAG_MAX_COLS) s.expansions = ECONOMY.expansions.length;
  else s.expansions = Math.min(ECONOMY.expansions.length, Math.max(0, rows - ECONOMY.startRows));
}

function backupOld(st: Storage, raw: string, ver: number) {
  const key = ver <= 1 ? SAVE_BACKUP_V1 : SAVE_BACKUP_V2;
  try { st.setItem(key, raw); } catch { /* ignore */ }
}

export function loadGame(st: Storage): LoadResult {
  let raw: string | null = null;
  try { raw = st.getItem(SAVE_KEY); } catch { return { status: 'none' }; }
  if (!raw) return { status: 'none' };
  try {
    const s = JSON.parse(raw);
    const ver = typeof s?.version === 'number' ? s.version : -1;
    if (ver > 0 && ver < SAVE_VERSION) {
      backupOld(st, raw, ver);
      try { st.removeItem(SAVE_KEY); } catch { /* ignore */ }
      return {
        status: 'corrupt',
        message: `检测到旧版存档（v${ver}），已备份。V3 为 50 关战役，请开始新冒险。`,
      };
    }
    if (ver !== SAVE_VERSION) return { status: 'corrupt', message: '存档版本不兼容，无法继续。' };
    migrateV3(s);
    if (!validate(s)) return { status: 'corrupt', message: '存档数据已损坏，无法继续。' };
    return { status: 'ok', state: s };
  } catch { return { status: 'corrupt', message: '存档数据已损坏，无法继续。' }; }
}

export function saveGame(st: Storage, s: GameState) { try { st.setItem(SAVE_KEY, JSON.stringify(s)); } catch { /* 存储满或禁用时忽略 */ } }
export function clearSave(st: Storage) { try { st.removeItem(SAVE_KEY); } catch { /* */ } }
export function loadSettings(st: Storage): Settings {
  try {
    const s = JSON.parse(st.getItem(SETTINGS_KEY) || '{}');
    const voice = typeof s.voice === 'number' ? Math.max(0, Math.min(100, s.voice)) : 100;
    const openingFor = s.openingFor === 'merchant' || s.openingFor === 'guard' || s.openingFor === 'ranger' ? s.openingFor : undefined;
    return { sound: s.sound !== false, tutorialDone: !!s.tutorialDone, openingSeen: !!s.openingSeen, voice, openingFor };
  }
  catch { return { sound: true, tutorialDone: false, openingSeen: false, voice: 100 }; }
}
export function saveSettings(st: Storage, s: Settings) { try { st.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* */ } }

void CAMPAIGN_VERSION;
