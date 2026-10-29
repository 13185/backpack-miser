import { describe, expect, it } from 'vitest';
import {
  CAMPAIGN_LENGTH, FINAL_LEVEL, MID_ACT_LEVEL, V3_CHAPTERS, V3_LEVELS, V3_STAGES,
  getLevel, isFinalVictory, isMidAct, isBossLevel, campAfterBoss, chapterOf,
} from '../src/config/v3';
import { Game, newGameState } from '../src/systems/game';
import { createCombat, simulate } from '../src/systems/combat';
import { loadGame, saveGame, SAVE_KEY, SAVE_BACKUP_V1, SAVE_VERSION } from '../src/systems/save';
import type { CombatState } from '../src/systems/combat';

const mem = () => {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    _m: m,
  };
};

/** 强制一场已结束的胜利/失败战斗状态，绕过真实战斗 */
function fakeCombat(won: boolean): CombatState {
  return {
    over: true, won, reason: won ? '测试胜利' : '测试失败', t: 1000,
    hp: won ? 80 : 0, maxHp: 100, mHp: won ? 0 : 50, mMaxHp: 100,
    shield: 0, mInterval: 1500, enrage: 0, bossHasted: false,
    actors: [], potions: [], stats: { weapon: {}, absorbed: 0, healed: 0 },
  } as unknown as CombatState;
}

describe('V3 战役配置', () => {
  it('50关、10章、Boss/精英/折转/终局标记正确', () => {
    expect(V3_STAGES.length).toBe(50);
    expect(V3_LEVELS.length).toBe(CAMPAIGN_LENGTH);
    expect(V3_CHAPTERS.length).toBe(10);
    expect(V3_STAGES.filter(s => s.boss).length).toBe(10);
    expect(V3_STAGES.filter(s => s.eliteChoice).length).toBe(10);
    expect(V3_STAGES.find(s => s.level === 20)?.midAct).toBe(true);
    expect(V3_STAGES.find(s => s.level === 50)?.finalBoss).toBe(true);
    expect(V3_STAGES.find(s => s.level === 49)?.finalPrep).toBe(true);
    expect(isMidAct(MID_ACT_LEVEL)).toBe(true);
    expect(isFinalVictory(20)).toBe(false);
    expect(isFinalVictory(50)).toBe(true);
    expect(isFinalVictory(FINAL_LEVEL)).toBe(true);
    expect(isBossLevel(5)).toBe(true);
    expect(campAfterBoss(5)).toBe(true);
    expect(campAfterBoss(50)).toBe(false);
    expect(chapterOf(21)).toBe(5);
    expect(getLevel(20).title).toBe('金冠背后');
    expect(getLevel(50).boss).toBe(true);
  });
});

describe('V3 胜利判定', () => {
  it('第20关胜利不进 victory，进 loot 并可到21', () => {
    const g = new Game(newGameState(42));
    g.s.level = 20;
    g.s.phase = 'battle';
    g.s.battleToken = 1;
    g.s.settledToken = 0;
    expect(g.settle(fakeCombat(true)).ok).toBe(true);
    expect(g.s.phase).toBe('loot');
    expect(g.s.phase).not.toBe('victory');
    expect(g.s.storyFlags.midActSeen).toBe(true);
    expect(g.claimLoot(0).ok).toBe(true);
    expect(g.s.level).toBe(21);
    expect(g.s.phase).toBe('camp'); // Boss 后营地
    expect(g.campLeave().ok).toBe(true);
    expect(g.s.phase).toBe('prep');
    expect(g.s.currentChapter).toBe(5);
  });

  it('第50关胜利才进 victory', () => {
    const g = new Game(newGameState(43));
    g.s.level = 50;
    g.s.phase = 'battle';
    g.s.battleToken = 1;
    g.s.settledToken = 0;
    expect(g.settle(fakeCombat(true)).ok).toBe(true);
    expect(g.s.phase).toBe('victory');
  });

  it('第1关胜利走 loot 而非 victory', () => {
    const g = new Game(newGameState(7, { heroClass: 'ranger' }));
    g.startBattle();
    const c = g.makeCombat();
    simulate(c);
    expect(c.won).toBe(true);
    g.settle(c);
    expect(g.s.phase).toBe('loot');
  });
});

describe('章节检查点', () => {
  it('Boss 后领奖进入下一章时写入检查点；战败可回退', () => {
    const g = new Game(newGameState(99));
    g.s.level = 5;
    g.s.phase = 'battle';
    g.s.battleToken = 1;
    g.s.settledToken = 0;
    g.settle(fakeCombat(true));
    expect(g.s.phase).toBe('loot');
    g.claimLoot(0);
    expect(g.s.level).toBe(6);
    expect(g.s.currentChapter).toBe(2);
    expect(g.s.phase).toBe('camp');
    expect(g.s.chapterCheckpoint!.level).toBe(1); // 第1章起点；新章检查点营地结束后才写
    expect(g.campLeave().ok).toBe(true);
    expect(g.s.phase).toBe('prep');
    expect(g.s.chapterCheckpoint).not.toBeNull();
    expect(g.s.chapterCheckpoint!.level).toBe(6);
    const goldAtCp = g.s.gold;
    // 模拟打到第7关失败
    g.s.level = 7;
    g.s.gold = 999;
    g.s.phase = 'battle';
    g.s.battleToken++;
    g.settle(fakeCombat(false));
    expect(g.s.phase).toBe('defeat');
    expect(g.restoreChapterCheckpoint().ok).toBe(true);
    expect(g.s.level).toBe(6);
    expect(g.s.gold).toBe(goldAtCp);
    expect(g.s.phase).toBe('prep');
    expect(g.s.retryCount).toBe(1);
    expect(g.s.attemptId).toBe(2);
  });

  it('ironman 不能回章节起点', () => {
    const g = new Game(newGameState(1));
    g.s.mode = 'ironman';
    g.s.chapterCheckpoint = {
      level: 6, chapter: 2, hp: 100, maxHp: 100, gold: 10, rows: 4, cols: 5, expansions: 0,
      items: [], nextId: 1, rng: 1, shop: { level: 6, slots: [], refreshes: 0 },
      stats: { kills: 0, goldEarned: 0, contribution: {} },
      storyFlags: {}, questStates: {}, npcStates: {}, runes: [], doctrine: null, seenDialogue: [],
      pendingRuneChoices: null, pendingDoctrineChoices: null, endingChoice: null,
      relics: [], pendingRelicChoices: null,
      campServiceUsed: false, pendingCheckpointAfterCamp: false,
      battleToken: 0, settledToken: 0,
    };
    g.s.phase = 'defeat';
    expect(g.restoreChapterCheckpoint().ok).toBe(false);
  });
});

describe('V3 存档', () => {
  it('新局 version=3 且 campaignLength=50', () => {
    const s = newGameState(1);
    expect(s.version).toBe(SAVE_VERSION);
    expect(s.campaignLength).toBe(50);
    expect(s.mode).toBe('story');
  });

  it('旧版存档备份并提示新开', () => {
    const st = mem();
    st.setItem(SAVE_KEY, JSON.stringify({ version: 1, level: 3, phase: 'prep', hp: 100, gold: 10, items: [], rows: 4, shop: { slots: [] } }));
    const r = loadGame(st);
    expect(r.status).toBe('corrupt');
    if (r.status === 'corrupt') expect(r.message).toContain('旧版存档');
    expect(st.getItem(SAVE_BACKUP_V1)).toBeTruthy();
    expect(st.getItem(SAVE_KEY)).toBeNull();
  });

  it('V3 存档可读写', () => {
    const st = mem();
    const g = new Game(newGameState(11), s => saveGame(st, s));
    g.s.gold = 100;
    g.buy(0);
    const r = loadGame(st);
    expect(r.status).toBe('ok');
    if (r.status === 'ok') {
      expect(r.state.campaignLength).toBe(50);
      expect(r.state.shop).toEqual(g.s.shop);
    }
  });
});
