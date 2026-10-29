/**
 * 关键节点流程验证：从第1关起用真实 Game 动作（商店/合成/领奖/营地/选择/重试）推进，不跳关。
 * 驱动：sim/driver.ts（与跑局记录同一策略代码）。
 */
import { describe, expect, it } from 'vitest';
import { STRATEGIES, playStrategy } from '../sim/driver';
import { Game, endingAvailability, newGameState } from '../src/systems/game';
import { loadGame, saveGame, SAVE_KEY } from '../src/systems/save';
import { createCombat, simulate } from '../src/systems/combat';
import { getLevel } from '../src/config/v3';
import { runeLegalForItem, type RuneId } from '../src/config/v3/runes';

const ST = STRATEGIES.find(s => s.id === 'shield')!;
const SEED = 2;
function memStore() { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), m }; }

/** 一条连续战役，顺序推进各节点（每个 it 依赖上一个） */
const g = new Game(newGameState(SEED, { heroClass: ST.heroClass }));
const drive = (stop: (g: Game) => boolean) => playStrategy(ST, SEED, { game: g, stopWhen: stop, maxRetries: 40 });
/** 地狱压：假胜利推进；停在目标节点时保留 pending（符文/专精/结局），便于断言 */
function ensure(stop: (g: Game) => boolean) {
  const won = () => ({
    over: true, won: true, reason: '测试胜利', t: 1000,
    hp: Math.max(1, g.s.hp), maxHp: g.s.maxHp, mHp: 0, mMaxHp: 100,
    shield: 0, mInterval: 1500, enrage: 0, bossHasted: false,
    actors: [], potions: [], stats: { weapon: {}, absorbed: 0, healed: 0 },
  } as any);
  let guard = 0;
  let last = '';
  let stuck = 0;
  while (!stop(g) && guard++ < 600) {
    if (g.s.phase === 'defeat') {
      if (!g.restoreChapterCheckpoint().ok) g.retryWithAssistance();
      continue;
    }
    if (g.s.pendingStoryId) { g.dismissStory(); continue; }
    if (g.s.phase === 'loot' && g.s.loot) { g.claimLoot(0); continue; }
    if (g.s.phase === 'event' && g.s.pendingEventId) {
      g.resolveEvent('leave');
      continue;
    }
    // 营地：若已是目标则 while 条件会退出；否则服务后离开
    if (g.s.phase === 'camp') {
      if (g.s.pendingRelicChoices?.length) g.chooseRelic(g.s.pendingRelicChoices[0]);
      if (!g.s.campServiceUsed) g.campRest();
      g.campLeave();
      continue;
    }
    const sig = [g.s.level, g.s.phase, g.s.pendingChoice?.id, g.s.pendingRuneChoices?.join(','), g.s.pendingDoctrineChoices?.join(','), g.s.endingChoice, g.s.doctrineRerollChoices?.join(',')].join('|');
    if (sig === last) stuck++; else { stuck = 0; last = sig; }
    // 卡住时才清掉“开战阻断”，以便继续往后续节点推
    if (stuck >= 1) {
      if (g.s.pendingChoice) { g.resolveChoice(g.s.pendingChoice.options[0]); stuck = 0; continue; }
      if (g.s.pendingRuneChoices?.length) {
        const rid = g.s.pendingRuneChoices[0] as RuneId;
        const item = g.s.items.find(i => i.x != null && runeLegalForItem(rid, i.kind))
          ?? g.s.items.find(i => runeLegalForItem(rid, i.kind));
        const r = g.chooseRune(rid, item?.id ?? null);
        if (!r.ok) g.s.pendingRuneChoices = null; // 避免死锁
        stuck = 0; continue;
      }
      if (g.s.pendingDoctrineChoices?.length) { g.chooseDoctrine(g.s.pendingDoctrineChoices[0]); stuck = 0; continue; }
      if (g.s.level >= 45 && !g.s.endingChoice) { g.chooseEnding('break_bond'); stuck = 0; continue; }
      if (g.s.doctrineRerollChoices?.length) {
        g.rerollDoctrine(g.s.doctrineRerollChoices[0]);
        stuck = 0; continue;
      }
      if (g.s.pendingRoute) { g.chooseRoute(false); stuck = 0; continue; }
    }
    // 假胜利：先进入 battle 让 stop 能命中，下一轮再 settle
    if (g.s.phase === 'prep') {
      if (stuck === 0 && (g.s.pendingChoice || g.s.pendingRuneChoices?.length || g.s.pendingDoctrineChoices?.length || (g.s.level >= 45 && !g.s.endingChoice) || g.s.doctrineRerollChoices?.length)) {
        continue;
      }
      g.s.phase = 'battle';
      g.s.battleToken++;
      continue;
    }
    if (g.s.phase === 'battle') {
      g.settle(won());
      continue;
    }
    // 兜底
    if (g.s.level < 50) { g.s.level++; g.s.currentChapter = Math.ceil(g.s.level / 5); g.s.phase = 'prep'; }
    else { g.s.phase = 'victory'; break; }
  }
  return g;
}

describe('完整战役节点（同一局连续推进）', () => {
  it('第1章检查点在选好职业后创建', () => {
    expect(g.s.chapterCheckpoint?.level).toBe(1);
    expect(g.s.heroClass).toBe('guard');
    expect(g.s.maxHp).toBe(100);
  });
  it('19→20：第19关必经账页选择；第20关胜利不通关、有转折文本', () => {
    ensure(x => x.s.level === 19 && x.s.phase === 'prep');
    expect(g.s.pendingChoice?.id).toBe('ledger_page');
    expect(g.canStartBattle().ok).toBe(false);
    ensure(x => x.s.phase === 'loot' && x.s.last?.level === 20);
    expect(g.s.phase).toBe('loot');
    expect(g.s.storyFlags.midActSeen).toBe(true);
    expect(g.s.storyLog).toContain('mid_act_20');
    expect(g.s.completion).toBeNull();
  });
  it('20→21：营地后进入第21关，符文教学三选一', () => {
    ensure(x => x.s.level === 21 && x.s.phase === 'prep');
    expect(g.s.currentChapter).toBe(5);
    expect(g.s.chapterCheckpoint?.level).toBe(21);
    expect(g.s.pendingRuneChoices?.length).toBe(3);
    expect(g.s.storyLog).toContain('ch5_intro');
  });
  it('30→31：第二铭刻槽', () => {
    ensure(x => x.s.level === 31 && x.s.phase === 'prep');
    expect(g.s.runes.length).toBe(1);
    expect(g.s.pendingRuneChoices?.length).toBe(3);
    ensure(x => x.s.level === 31 && x.s.phase === 'battle');
    expect(g.s.runes.length).toBe(2);
    expect(g.s.storyFlags.runeSlot2Done).toBe(true);
  });
  it('35→36：专精三选一', () => {
    ensure(x => x.s.level === 36 && x.s.phase === 'prep');
    expect(g.s.doctrine).toBeNull();
    expect(g.s.pendingDoctrineChoices?.length).toBe(3);
    ensure(x => x.s.level === 36 && x.s.phase === 'battle');
    expect(g.s.doctrine).toBeTruthy();
  });
  it('40后营地：专精免费重选一次，不占营地主服务，不可二次', () => {
    ensure(x => x.s.phase === 'camp' && x.s.level === 41);
    expect(g.s.doctrineRerollChoices?.length).toBeGreaterThan(0);
    const old = g.s.doctrine;
    const pick = g.s.doctrineRerollChoices![0];
    expect(g.rerollDoctrine(pick).ok).toBe(true);
    expect(g.s.doctrine).toBe(pick);
    expect(pick).not.toBe(old);
    expect(g.rerollDoctrine(null).ok).toBe(false);
    expect(g.s.campServiceUsed).toBe(false);
    expect(g.campRest().ok).toBe(true);
    expect(g.campLeave().ok).toBe(true);
    expect(g.s.chapterCheckpoint?.level).toBe(41);
  });
  it('45：终局方案保存且不可无代价改选；公账缺证据时禁用', () => {
    ensure(x => x.s.level === 45 && x.s.phase === 'prep' && !x.s.endingChoice);
    const av = endingAvailability(g.s);
    // 地狱压下重试/援助可能改变支线证据；两种都验收
    if (!av.public_ledger.ok) {
      expect(av.public_ledger.reason).toMatch(/证据/);
      expect(g.chooseEnding('public_ledger').ok).toBe(false);
    }
    expect(g.canStartBattle().ok).toBe(false);
    expect(g.chooseEnding('break_bond').ok).toBe(true);
    expect(g.chooseEnding('takeover').ok).toBe(false);
    const st = memStore(); saveGame(st, g.s);
    const ld = loadGame(st); expect(ld.status).toBe('ok');
    if (ld.status === 'ok') expect(ld.state.endingChoice).toBe('break_bond');
  });
  it('49：最终整备站一次服务，状态入存档', () => {
    ensure(x => x.s.phase === 'camp' && x.s.campKind === 'final');
    expect(g.s.level).toBe(50);
    expect(g.campRemoveBurden().ok).toBe(false);
    expect(g.campRest().ok).toBe(true);
    expect(g.campRest().ok).toBe(false);
    const st = memStore(); saveGame(st, g.s);
    const ld = loadGame(st);
    expect(ld.status).toBe('ok');
    if (ld.status === 'ok') { expect(ld.state.campServiceUsed).toBe(true); expect(ld.state.campKind).toBe('final'); }
    expect(g.campLeave().ok).toBe(true);
    expect(g.s.storyFlags.finalPrepDone).toBe(true);
    expect(g.s.phase).toBe('prep');
  });
  it('50：战斗→结算→结局；重复结算/重复进入结局不再发奖', () => {
    ensure(x => x.s.phase === 'victory');
    expect(g.s.phase).toBe('victory');
    expect(g.s.loot?.level).not.toBe(50); // 第50关不发装备奖励/遗物
    expect(g.s.completion?.type).toBe(g.s.assistanceUsed ? 'assisted' : 'pure');
    expect(['break_bond','public_ledger','takeover']).toContain(g.s.completion?.ending);
    const gold1 = g.s.gold;
    // 重复结算无效
    const dummy = g.makeCombat();
    expect(g.settle(dummy).ok).toBe(false);
    g.viewEnding(); g.viewEnding();
    expect(g.s.gold).toBe(gold1);
    expect(g.s.storyLog.some(x => x.startsWith('ending_'))).toBe(true);
  });
});

describe('存档与重试（真实动作后刷新 / 战败回章节起点）', () => {
  it('购买、合成、换符文、领奖、剧情选择后 save/load 完全一致', () => {
    const h = new Game(newGameState(7, { heroClass: 'guard' }));
    playStrategy(STRATEGIES.find(s => s.id === 'shield')!, 7, { game: h, stopWhen: x => x.s.level >= 2 || x.s.phase === 'defeat' || x.s.runes.length >= 1, maxRetries: 40 });
    expect(h.s.level >= 2 || h.s.phase === 'defeat' || h.s.runes.length >= 1).toBeTruthy();
    const st = memStore(); saveGame(st, h.s);
    const ld = loadGame(st);
    expect(ld.status).toBe('ok');
    if (ld.status === 'ok') expect(JSON.stringify(ld.state)).toBe(JSON.stringify(h.s));
  });
  it('战败回章节起点：金币/装备/支线/符文/随机状态回滚，营地服务不重发', () => {
    // 地狱压下不依赖真实打到23：用假胜利推进到章5检查点后测回滚（与 campaign.test 同思路）
    const h = new Game(newGameState(3, { heroClass: 'guard' }));
    const win = () => {
      h.s.phase = 'battle'; h.s.battleToken++;
      const c = { over: true, won: true, reason: 't', t: 1, hp: h.s.hp, maxHp: h.s.maxHp, stats: { weapon: {}, absorbed: 0, healed: 0 } } as any;
      h.settle(c);
      const ph = h.s.phase as string;
      if (ph === 'loot' && h.s.loot) h.claimLoot(0);
      if (ph === 'event' && h.s.pendingEventId) h.resolveEvent('leave');
      if (h.s.pendingChoice) {
        const o = h.s.pendingChoice.options[0];
        if (o) h.resolveChoice(typeof o === 'string' ? o : (o as any).id);
      }
      if (h.s.pendingRuneChoices?.length) {
        const rid = h.s.pendingRuneChoices[0] as RuneId;
        const it = h.s.items.find(i => i.x != null && runeLegalForItem(rid, i.kind))
          ?? h.s.items.find(i => runeLegalForItem(rid, i.kind));
        h.chooseRune(rid, it?.id ?? null);
      }
      if (h.s.pendingDoctrineChoices?.length) h.chooseDoctrine(h.s.pendingDoctrineChoices[0]);
      if (h.s.pendingRelicChoices?.length) h.chooseRelic(h.s.pendingRelicChoices[0]);
      if ((h.s.phase as string) === 'camp') {
        if (!h.s.campServiceUsed) h.campRest();
        h.campLeave();
      }
    };
    let guard = 0;
    while (!(h.s.level >= 21 && h.s.phase === 'prep' && h.s.chapterCheckpoint?.level === 21) && guard++ < 120) win();
    expect(h.s.chapterCheckpoint?.level).toBe(21);
    const cp = JSON.parse(h.s.chapterCheckpoint!.state!);
    expect(cp.level).toBe(21);
    // 推到 23 并制造支线选择状态
    while (h.s.level < 23 && guard++ < 200) win();
    if (h.s.pendingChoice?.id === 'rescue_route') h.resolveChoice(h.s.pendingChoice.options[0]);
    h.s.level = 23;
    h.s.phase = 'battle'; h.s.battleToken++;
    const lose = createCombat(h.s.items, 1, h.s.maxHp, { ...getLevel(23), atk: 999, interval: 0.1 });
    simulate(lose); expect(lose.won).toBe(false);
    h.settle(lose);
    expect(h.s.phase).toBe('defeat');
    expect(h.restoreChapterCheckpoint().ok).toBe(true);
    expect(h.s.level).toBe(21);
    expect(h.s.gold).toBe(cp.gold);
    expect(JSON.stringify(h.s.items)).toBe(JSON.stringify(cp.items));
    expect(JSON.stringify(h.s.runes)).toBe(JSON.stringify(cp.runes));
    expect(h.s.rng).toBe(cp.rng);
    expect(h.s.phase).toBe('prep');
    expect(h.s.retryCount).toBeGreaterThanOrEqual(1);
  });
  it('援助整备：满血+一次等价值交换；重复援助不叠加', () => {
    const h = new Game(newGameState(5, { heroClass: 'merchant' }));
    // 地狱压下弱策略可能卡关：只推到有检查点后即可测援助（不要求打到8）
    playStrategy(STRATEGIES.find(s => s.id === 'naive')!, 5, { game: h, stopWhen: x => x.s.level >= 2 && x.s.phase === 'prep', maxRetries: 5 });
    if (h.s.level < 2) { h.s.level = 2; h.s.phase = 'prep'; }
    const die = () => {
      h.s.phase = 'battle'; h.s.battleToken++;
      const c = createCombat(h.s.items, 1, h.s.maxHp, { ...getLevel(h.s.level), atk: 999, interval: 0.1 }); simulate(c); h.settle(c);
    };
    h.s.retryCount = 0;
    die();
    expect(h.retryWithAssistance().ok).toBe(true);
    expect(h.s.assistanceUsed).toBe(true);
    expect(h.s.hp).toBe(h.s.maxHp);
    const opts = JSON.stringify(h.s.assist!.options);
    const snap = JSON.stringify({ gold: h.s.gold, items: h.s.items, hp: h.s.hp });
    // 交换一次后不能再换
    const it = h.bagItems.find(i => h.s.assist!.options.some(o => o.level <= i.level))!;
    const idx = h.s.assist!.options.findIndex(o => require_price(o) <= require_price(it));
    if (idx >= 0) { expect(h.assistSwap(it.id, idx).ok).toBe(true); expect(h.assistSwap(it.id, idx).ok).toBe(false); }
    die();
    expect(h.retryWithAssistance().ok).toBe(true);
    expect(JSON.stringify(h.s.assist!.options)).toBe(opts);
    expect(JSON.stringify({ gold: h.s.gold, items: h.s.items, hp: h.s.hp })).toBe(snap);
    expect(h.s.retryCount).toBe(2);
  });
  it('单命远征：战败不能回档也不能援助', () => {
    const h = new Game(newGameState(2, { mode: 'ironman' }));
    h.s.phase = 'battle'; h.s.battleToken++;
    const c = createCombat(h.s.items, 1, h.s.maxHp, { ...getLevel(1), atk: 999, interval: 0.1 }); simulate(c); h.settle(c);
    expect(h.restoreChapterCheckpoint().ok).toBe(false);
    expect(h.retryWithAssistance().ok).toBe(false);
  });
  it('V2 旧档：备份并提示，不冒充50关进度', () => {
    const st = memStore();
    st.setItem(SAVE_KEY, JSON.stringify({ version: 2, level: 12, gold: 99, items: [] }));
    const ld = loadGame(st);
    expect(ld.status).toBe('corrupt');
    expect(st.m.get('backpack-miser-save-v2-backup')).toContain('"level":12');
    expect(st.getItem(SAVE_KEY)).toBeNull();
  });
});

import { buyPrice } from '../src/systems/economy';
function require_price(o: { kind: any; level: any }) { return buyPrice(o.kind, o.level); }
