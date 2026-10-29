import { describe, expect, it } from 'vitest';
import { bossCinema, isBossStory, openingBeats } from '../src/ui/cinema';
import { Game, newGameState } from '../src/systems/game';

describe('开场与首领落败', () => {
  it('开场三段合计 15 秒，第三段随职业换一句', () => {
    const merchant = openingBeats('merchant');
    expect(merchant.map(b => b.id)).toEqual(['OPEN01', 'OPEN02', 'OPEN03']);
    expect(merchant.reduce((a, b) => a + b.ms, 0)).toBe(15000);
    expect(openingBeats('guard')[2].line).toContain('命令');
    expect(openingBeats('ranger')[2].line).toContain('脚印');
    expect(merchant[2].line).not.toBe(openingBeats('guard')[2].line);
    expect(merchant.map(b => b.plate)).toEqual(['OPEN01', 'OPEN02', 'OPEN03']);
  });
  it('十个首领各有不同的消失样式，台词来自已有战后句', () => {
    const looks = new Set<string>();
    for (const lv of [5, 10, 15, 20, 25, 30, 35, 40, 45, 50]) {
      const beat = bossCinema(lv);
      expect(beat?.id).toBe(`boss_post_${lv / 5}`);
      expect(beat!.line.length).toBeGreaterThan(10);
      looks.add(beat!.look);
    }
    expect(looks.size).toBe(10);
    expect(bossCinema(5)?.plate).toBe('BOSS01_post');
    expect(bossCinema(50)?.plate).toBe('BOSS10_post');
    expect(bossCinema(19)).toBeNull();
    expect(isBossStory('boss_post_4')).toBe(true);
    expect(isBossStory('ch1_intro')).toBe(false);
  });
  it('首领胜利只结算一次，刷新前故事仍待播，跳过故事不再发金币', () => {
    const g = new Game(newGameState(3));
    g.s.level = 5;
    g.s.hp = 100;
    g.startBattle();
    const c = g.makeCombat();
    c.mHp = 0; c.over = true; c.won = true; c.reason = '怪物被击败！';
    const gold = g.s.gold;
    expect(g.settle(c).ok).toBe(true);
    const after = g.s.gold;
    expect(after).toBeGreaterThan(gold);
    expect(g.settle(c).ok).toBe(false);
    expect(g.s.gold).toBe(after);
    expect(isBossStory(g.s.pendingStoryId)).toBe(true);
    expect(g.s.phase).toBe('loot');
    g.dismissStory();
    expect(g.s.pendingStoryId).toBeNull();
    expect(g.s.gold).toBe(after);
    expect(g.s.loot && !g.s.loot.claimed).toBe(true);
  });
});
