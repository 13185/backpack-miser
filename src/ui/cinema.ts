import { CHAPTER_STORIES } from '../config/v3/story';
import type { HeroClass } from '../models/types';

export interface CinemaBeat {
  id: string;
  ms: number;
  line: string;
  /** CSS scene class. Decorative layers only. */
  look: string;
  title: string;
}

const OPEN03: Record<HeroClass, string> = {
  merchant: '货要找回来，人也一个不能少。',
  guard: '这一次，我得亲自查清命令。',
  ranger: '留下这么多脚印，还想让我找不到？',
};

/** OPEN01–03，各 5 秒，合计约 15 秒。 */
export function openingBeats(hero: HeroClass = 'merchant'): CinemaBeat[] {
  return [
    { id: 'OPEN01', ms: 5000, look: 'open-mine', title: '矿洞口', line: '那一晚，他们带走了货，也带走了同行的人。' },
    { id: 'OPEN02', ms: 5000, look: 'open-tax', title: '账桌', line: '我们明明已经付清了。账上却说，还欠着明天。' },
    { id: 'OPEN03', ms: 5000, look: 'open-pack', title: '动身', line: OPEN03[hero] },
  ];
}

const VANISH: Record<number, { look: string; title: string }> = {
  5: { look: 'van-chest', title: '箱盖卡住' },
  10: { look: 'van-kneel', title: '单膝跪下' },
  15: { look: 'van-legs', title: '纹路熄灭' },
  20: { look: 'van-crown', title: '金冠落地' },
  25: { look: 'van-lamp', title: '灯熄印落' },
  30: { look: 'van-mirror', title: '面具裂开' },
  35: { look: 'van-furnace', title: '炉膛变黑' },
  40: { look: 'van-chain', title: '锁链断开' },
  45: { look: 'van-throne', title: '权杖折断' },
  50: { look: 'van-heart', title: '核心停跳' },
};

export function bossCinema(level: number): CinemaBeat | null {
  const ch = level / 5;
  if (!Number.isInteger(ch) || ch < 1 || ch > 10) return null;
  const story = CHAPTER_STORIES[ch];
  const vanish = VANISH[level];
  if (!story || !vanish) return null;
  return { id: `boss_post_${ch}`, ms: 8000, look: vanish.look, title: vanish.title, line: story.bossPost };
}

export function isBossStory(id: string | null | undefined): boolean {
  return !!id && id.startsWith('boss_post_');
}
