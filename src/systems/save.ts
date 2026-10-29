import { CAMPAIGN_LENGTH, CAMPAIGN_VERSION } from '../config/v3';
import type { GameState, Settings } from '../models/types';

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
  try { const s = JSON.parse(st.getItem(SETTINGS_KEY) || '{}'); return { sound: s.sound !== false, tutorialDone: !!s.tutorialDone }; }
  catch { return { sound: true, tutorialDone: false }; }
}
export function saveSettings(st: Storage, s: Settings) { try { st.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* */ } }

void CAMPAIGN_VERSION;
