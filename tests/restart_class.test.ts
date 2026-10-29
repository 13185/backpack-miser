import { describe, expect, it } from 'vitest';
import { newGameState } from '../src/systems/game';
import { clearSave, loadGame, loadSettings, saveGame, saveSettings } from '../src/systems/save';
import { classVoiceSet, resolveStart, restartTarget, shouldReplayOpening } from '../src/ui/classRun';

const mem = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
};

describe('重开与职业', () => {
  it('重新选择回到选人，同职业再来沿用当前职业', () => {
    expect(restartTarget('reselect', 'guard')).toEqual({ screen: 'title', heroClass: null });
    expect(restartTarget('same', 'guard')).toEqual({ screen: 'play', heroClass: 'guard' });
  });

  it('刷新后继续用存档职业，新开一局用新点的职业并清空旧进度', () => {
    const guard = newGameState(1, { heroClass: 'guard' });
    guard.level = 8;
    guard.gold = 500;
    guard.items.push({ id: 'temp-left', kind: 'potion', level: 1, x: null, y: null, rotated: false });
    expect(resolveStart('continue', guard, 'ranger')).toBe('guard');
    expect(resolveStart('new', guard, 'ranger')).toBe('ranger');
    const fresh = newGameState(2, { heroClass: 'ranger' });
    expect(fresh.heroClass).toBe('ranger');
    expect(fresh.level).toBe(1);
    expect(fresh.gold).toBe(13);
    expect(fresh.relics).toEqual([]);
    expect(fresh.items.map(i => i.kind)).toEqual(['dagger', 'dagger', 'ruby']);
    expect(fresh.items.every(i => i.x !== null)).toBe(true);
    expect(fresh.items.some(i => i.id === 'temp-left')).toBe(false);
    expect(guard.heroClass).toBe('guard');
    expect(guard.level).toBe(8);
    expect(guard.gold).toBe(500);
  });

  it('语音文件跟当前职业走，换人和刷新后再选也不会留在守卫', () => {
    const guardLines = classVoiceSet('guard');
    const rangerLines = classVoiceSet(resolveStart('new', { heroClass: 'guard' }, 'ranger'));
    expect(guardLines).toContain('audio/voice/open_open03_guard');
    expect(guardLines.some(p => p.startsWith('audio/voice/bark_guard_'))).toBe(true);
    expect(rangerLines).toContain('audio/voice/open_open03_ranger');
    expect(rangerLines.every(p => p.includes('ranger'))).toBe(true);
    expect(rangerLines.some(p => p.includes('guard'))).toBe(false);
    const continued = classVoiceSet(resolveStart('continue', { heroClass: 'guard' }, 'ranger'));
    expect(continued).toContain('audio/voice/open_open03_guard');
    expect(shouldReplayOpening({ openingSeen: true, openingFor: 'guard' }, 'ranger')).toBe(true);
    expect(shouldReplayOpening({ openingSeen: true, openingFor: 'ranger' }, 'ranger')).toBe(false);
  });

  it('清掉这一局不会清掉音量', () => {
    const store = mem();
    saveSettings(store, { sound: true, tutorialDone: true, openingSeen: true, voice: 40, openingFor: 'guard' });
    saveGame(store, newGameState(3, { heroClass: 'guard' }));
    clearSave(store);
    expect(loadGame(store).status).toBe('none');
    expect(loadSettings(store)).toMatchObject({ voice: 40, openingSeen: true, openingFor: 'guard', tutorialDone: true });
  });
});
