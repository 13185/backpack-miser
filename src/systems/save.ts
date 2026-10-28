import type { GameState, Settings } from '../models/types';
export const SAVE_VERSION = 1;
export const SAVE_KEY = 'backpack-miser-save';
export const SETTINGS_KEY = 'backpack-miser-settings';
export interface Storage { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void; }
export type LoadResult = { status: 'none' } | { status: 'ok'; state: GameState } | { status: 'corrupt'; message: string };
export function validate(s: any): s is GameState {
  return s && typeof s === 'object' && s.version === SAVE_VERSION && typeof s.level === 'number' && s.level >= 1 && s.level <= 10 &&
    typeof s.hp === 'number' && typeof s.gold === 'number' && s.gold >= 0 && Array.isArray(s.items) && typeof s.rows === 'number' &&
    ['prep', 'battle', 'loot', 'victory', 'defeat'].includes(s.phase) && s.shop && Array.isArray(s.shop.slots) &&
    s.items.every((i: any) => typeof i.id === 'string' && typeof i.kind === 'string' && [1, 2, 3].includes(i.level));
}
export function loadGame(st: Storage): LoadResult {
  let raw: string | null = null;
  try { raw = st.getItem(SAVE_KEY); } catch { return { status: 'none' }; }
  if (!raw) return { status: 'none' };
  try {
    const s = JSON.parse(raw);
    if (s?.version !== SAVE_VERSION) return { status: 'corrupt', message: '存档版本不兼容，无法继续。' };
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
