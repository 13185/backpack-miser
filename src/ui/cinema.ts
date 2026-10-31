import { getLevel } from '../config/v3/levels';
import { CHAPTER_STORIES } from '../config/v3/story';
import { bossElementMark } from '../config/v4/bosses';
import type { HeroClass } from '../models/types';

export interface CinemaBeat {
  id: string;
  ms: number;
  line: string;
  /** CSS scene class. Shape fallback and overlay FX. */
  look: string;
  title: string;
  /** Painted plate under public/art/cinema, without extension. */
  plate: string;
}

const OPEN03: Record<HeroClass, string> = {
  merchant: '货要找回来，人也一个不能少。',
  guard: '这一次，我得亲自查清命令。',
  ranger: '留下这么多脚印，还想让我找不到？',
};

/** OPEN01–03，各 5 秒，合计约 15 秒。 */
export function openingBeats(hero: HeroClass = 'merchant'): CinemaBeat[] {
  return [
    { id: 'OPEN01', ms: 5000, look: 'open-mine', title: '矿洞口', plate: 'OPEN01', line: '那一晚，他们带走了货，也带走了同行的人。' },
    { id: 'OPEN02', ms: 5000, look: 'open-tax', title: '账桌', plate: 'OPEN02', line: '我们明明已经付清了。账上却说，还欠着明天。' },
    { id: 'OPEN03', ms: 5000, look: 'open-pack', title: '动身', plate: 'OPEN03', line: OPEN03[hero] },
  ];
}

const VANISH: Record<number, { look: string; title: string; plate: string }> = {
  5: { look: 'van-chest', title: '箱盖卡住', plate: 'BOSS01_post' },
  10: { look: 'van-kneel', title: '单膝跪下', plate: 'BOSS02_post' },
  15: { look: 'van-legs', title: '纹路熄灭', plate: 'BOSS03_post' },
  20: { look: 'van-crown', title: '金冠落地', plate: 'BOSS04_post' },
  25: { look: 'van-lamp', title: '灯熄印落', plate: 'BOSS05_post' },
  30: { look: 'van-mirror', title: '面具裂开', plate: 'BOSS06_post' },
  35: { look: 'van-furnace', title: '炉膛变黑', plate: 'BOSS07_post' },
  40: { look: 'van-chain', title: '锁链断开', plate: 'BOSS08_post' },
  45: { look: 'van-throne', title: '权杖折断', plate: 'BOSS09_post' },
  50: { look: 'van-heart', title: '核心停跳', plate: 'BOSS10_post' },
};

export function bossCinema(level: number): CinemaBeat | null {
  const ch = level / 5;
  if (!Number.isInteger(ch) || ch < 1 || ch > 10) return null;
  const story = CHAPTER_STORIES[ch];
  const vanish = VANISH[level];
  if (!story || !vanish) return null;
  const mark = bossElementMark(level);
  const named = mark ? `${getLevel(level).title}${mark}` : '';
  return { id: `boss_post_${ch}`, ms: 8000, look: vanish.look, title: named ? `${vanish.title} · ${named}` : vanish.title, plate: vanish.plate, line: story.bossPost };
}

export function isBossStory(id: string | null | undefined): boolean {
  return !!id && id.startsWith('boss_post_');
}
