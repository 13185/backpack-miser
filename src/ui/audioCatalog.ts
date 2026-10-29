/** 音频包路径与循环点。二进制在 public/audio，不打进 JS。 */

export type BgmId = 'title' | 'prep' | 'battleA' | 'battleB' | 'elite' | 'boss' | 'final' | 'story' | 'win' | 'lose';

export interface TrackMeta {
  file: string;
  loop: boolean;
  loopStart: number;
  /** 秒。短句为 null。 */
  loopEnd: number | null;
}

export const TRACKS: Record<BgmId, TrackMeta> = {
  title: { file: 'bgm_title', loop: true, loopStart: 0, loopEnd: 101.053 },
  prep: { file: 'bgm_prep', loop: true, loopStart: 0, loopEnd: 80 },
  battleA: { file: 'bgm_battleA', loop: true, loopStart: 0, loopEnd: 87.273 },
  battleB: { file: 'bgm_battleB', loop: true, loopStart: 0, loopEnd: 82.286 },
  elite: { file: 'bgm_elite', loop: true, loopStart: 0, loopEnd: 64 },
  boss: { file: 'bgm_boss', loop: true, loopStart: 0, loopEnd: 99.31 },
  final: { file: 'bgm_final', loop: true, loopStart: 0, loopEnd: 115.2 },
  story: { file: 'bgm_story', loop: true, loopStart: 0, loopEnd: 116.364 },
  win: { file: 'bgm_win', loop: false, loopStart: 0, loopEnd: null },
  lose: { file: 'bgm_lose', loop: false, loopStart: 0, loopEnd: null },
};

/** 当前曲目开始后预取的下一首，不预取整包。 */
export const NEXT_TRACK: Partial<Record<BgmId, BgmId>> = {
  title: 'prep',
  prep: 'battleA',
  battleA: 'battleB',
  battleB: 'boss',
  elite: 'boss',
  boss: 'win',
  final: 'win',
  story: 'prep',
  win: 'prep',
};

export function mediaExt(): 'ogg' | 'm4a' {
  if (typeof document === 'undefined') return 'ogg';
  try {
    const support = document.createElement('audio').canPlayType('audio/ogg; codecs="opus"');
    if (support === 'probably' || support === 'maybe') return 'ogg';
  } catch { /* Safari / iOS 走 m4a */ }
  return 'm4a';
}

/** pathNoExt 形如 audio/music/bgm_title，不含后缀。 */
export function mediaUrl(pathNoExt: string): string {
  const base = import.meta.env.BASE_URL || './';
  const prefix = base.endsWith('/') ? base : `${base}/`;
  return `${prefix}${pathNoExt}.${mediaExt()}`;
}

export function trackPath(id: BgmId): string {
  return `audio/music/${TRACKS[id].file}`;
}

export function voiceBase(id: string, hero?: string): string | null {
  if (id === 'OPEN01') return 'audio/voice/open_open01';
  if (id === 'OPEN02') return 'audio/voice/open_open02';
  if (id === 'OPEN03') return hero ? `audio/voice/open_open03_${hero}` : null;
  const pre = /^boss_pre_(\d+)$/.exec(id);
  if (pre) return `audio/voice/boss${pre[1].padStart(2, '0')}_pre`;
  const post = /^boss_post_(\d+)$/.exec(id);
  if (post) return `audio/voice/boss${post[1].padStart(2, '0')}_post`;
  return null;
}

export function barkBase(hero: string, n: number): string {
  return `audio/voice/bark_${hero}_${n}`;
}
