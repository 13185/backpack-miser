import { barkBase, voiceBase } from './audioCatalog';

/** OPEN03 和五句喊声。只包含这一个职业，避免换人后还指着上一职业的文件。 */
export function classVoiceSet(hero: string): string[] {
  const open = voiceBase('OPEN03', hero);
  const barks = [1, 2, 3, 4, 5].map(n => barkBase(hero, n));
  return open ? [open, ...barks] : barks;
}

/**
 * 继续用存档职业。新开一局用标题上点中的职业，不用存档里的。
 * 刷新后两者会分开：卡片可以是游侠，继续按钮仍是守卫。
 */
export function resolveStart(action: 'continue' | 'new', saved: { heroClass: string } | null, picked: string): string {
  if (action === 'continue' && saved?.heroClass) return saved.heroClass;
  return picked;
}

/** 重新选择回到标题，不自动开局。同职业再来用当前这一局的职业。 */
export function restartTarget(action: 'reselect' | 'same', current: string): { screen: 'title' | 'play'; heroClass: string | null } {
  if (action === 'reselect') return { screen: 'title', heroClass: null };
  return { screen: 'play', heroClass: current };
}

/** 没看过开场，或看过的职业和这一局不同，就再放一次，好让 OPEN03 对上新人。 */
export function shouldReplayOpening(settings: { openingSeen?: boolean; openingFor?: string }, hero: string): boolean {
  return !settings.openingSeen || settings.openingFor !== hero;
}
