import { describe, expect, it } from 'vitest';
import {
  CHAPTER_STORIES, LEVEL_LINES, ENDING_CHOICES, ENDING_IDS,
  resolveEndingFinale, resolveStoryText, charLen,
} from '../src/config/v3/story';
import { Game, newGameState } from '../src/systems/game';

describe('正式剧情文本', () => {
  it('十章开场均存在且约 60–120 字', () => {
    for (let ch = 1; ch <= 10; ch++) {
      const s = CHAPTER_STORIES[ch];
      expect(s, `章${ch}`).toBeTruthy();
      const n = charLen(s.intro);
      expect(n).toBeGreaterThanOrEqual(60);
      expect(n).toBeLessThanOrEqual(130); // 略放宽标点
      expect(s.goal.length).toBeGreaterThan(4);
      expect(charLen(s.bossPre)).toBeGreaterThanOrEqual(34);
      expect(charLen(s.bossPost)).toBeGreaterThanOrEqual(28);
    }
  });
  it('每关一句 8–24 字', () => {
    for (let lv = 1; lv <= 50; lv++) {
      const line = LEVEL_LINES[lv];
      expect(line, `L${lv}`).toBeTruthy();
      const n = charLen(line);
      expect(n).toBeGreaterThanOrEqual(8);
      expect(n).toBeLessThanOrEqual(24);
    }
  });
  it('三结局基础文本不同', () => {
    const texts = ENDING_IDS.map(id => ENDING_CHOICES[id].finale);
    expect(new Set(texts).size).toBe(3);
  });
  it('支线 flag 影响结局正文', () => {
    const base = resolveEndingFinale({ ending: 'break_bond', questStates: {} });
    const rescued = resolveEndingFinale({
      ending: 'break_bond',
      questStates: { rescue: 'protected', forge: 'stopped_clean', ledgerEvidence: '2' },
    });
    expect(rescued).not.toBe(base);
    expect(rescued).toContain('商队');
    expect(rescued).toContain('工坊');
    const publicPoor = resolveEndingFinale({ ending: 'public_ledger', questStates: { ledgerEvidence: '0' } });
    const publicRich = resolveEndingFinale({ ending: 'public_ledger', questStates: { ledgerEvidence: '3' } });
    expect(publicRich).not.toBe(publicPoor);
  });
  it('三职业开场语气不同（章1）', () => {
    const m = resolveStoryText('ch1_intro', { heroClass: 'merchant' }).body;
    const g = resolveStoryText('ch1_intro', { heroClass: 'guard' }).body;
    const r = resolveStoryText('ch1_intro', { heroClass: 'ranger' }).body;
    expect(m).not.toBe(g);
    expect(g).not.toBe(r);
  });
  it('新开局章节开场进入 pendingStory / storyLog', () => {
    const s = newGameState(1, { heroClass: 'guard' });
    expect(s.pendingStoryId === 'ch1_intro' || s.storyLog.includes('ch1_intro')).toBe(true);
  });
});
