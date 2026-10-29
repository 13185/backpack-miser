import { describe, expect, it } from 'vitest';
import { TRACKS, barkBase, voiceBase, type BgmId } from '../src/ui/audioCatalog';

const classes = ['merchant', 'guard', 'ranger'] as const;

describe('音频包目录', () => {
  it('十个背景音乐 id 都有循环点', () => {
    const ids = Object.keys(TRACKS) as BgmId[];
    expect(ids.sort()).toEqual(['battleA', 'battleB', 'boss', 'elite', 'final', 'lose', 'prep', 'story', 'title', 'win']);
    for (const id of ids) {
      const t = TRACKS[id];
      expect(t.file.startsWith('bgm_')).toBe(true);
      if (t.loop) expect(t.loopEnd).toBeGreaterThan(1);
      else expect(t.loopEnd).toBeNull();
    }
    expect(TRACKS.title.loop).toBe(true);
    expect(TRACKS.win.loop).toBe(false);
  });

  it('开场、首领和喊声的文件名对得上音频包', () => {
    const bases = [
      voiceBase('OPEN01'),
      voiceBase('OPEN02'),
      ...classes.map(c => voiceBase('OPEN03', c)),
      ...Array.from({ length: 10 }, (_, i) => voiceBase(`boss_pre_${i + 1}`)),
      ...Array.from({ length: 10 }, (_, i) => voiceBase(`boss_post_${i + 1}`)),
      ...classes.flatMap(c => [1, 2, 3, 4, 5].map(n => barkBase(c, n))),
    ];
    expect(bases.filter((b): b is string => !!b)).toHaveLength(40);
    expect(new Set(bases).size).toBe(40);
    expect(voiceBase('OPEN03')).toBeNull();
    expect(voiceBase('OPEN03', 'guard')).toBe('audio/voice/open_open03_guard');
    expect(voiceBase('boss_pre_1')).toBe('audio/voice/boss01_pre');
    expect(voiceBase('boss_post_10')).toBe('audio/voice/boss10_post');
    expect(barkBase('ranger', 3)).toBe('audio/voice/bark_ranger_3');
  });
});
