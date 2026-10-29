import { describe, expect, it } from 'vitest';
import { getLevel, V3_LEVELS } from '../src/config/v3/levels';
import { RUNES, RUNE_IDS, MAX_RUNES, pickRuneCandidates } from '../src/config/v3/runes';
import { DOCTRINES, DOCTRINE_IDS, pickDoctrineCandidates, doctrineT01Mult } from '../src/config/v3/doctrines';
import { V3_ITEMS, V3_ITEM_IDS } from '../src/config/v3/items';
import { V3_RELICS, V3_RELIC_IDS } from '../src/config/v3/relics';
import { CHAPTER_INTROS, ENDING_CHOICES, ENDING_IDS, MID_ACT_STORY } from '../src/config/v3/story';
import { createCombat, computeWeaponCombatValue, simulate, stepCombat } from '../src/systems/combat';
import { Game, newGameState } from '../src/systems/game';
import type { ItemInstance, RuneInstance } from '../src/models/types';

const mk = (kind: ItemInstance['kind'], id: string, level: 1 | 2 | 3 = 1): ItemInstance =>
  ({ id, kind, level, x: 0, y: 0, rotated: false });

describe('第5章敌人', () => {
  it('21–25 关使用港口怪种', () => {
    expect(getLevel(21).monster).toBe('harbor_patrol');
    expect(getLevel(22).monster).toBe('tide_crab');
    expect(getLevel(22).tideCycle).toBe(true);
    expect(getLevel(24).monster).toBe('tide_crab');
    expect(getLevel(25).monster).toBe('salt_captain');
    expect(getLevel(25).boss).toBe(true);
    expect(getLevel(25).chapter).toBe(5);
  });
  it('潮汐周期切换护甲', () => {
    const items = [mk('dagger', 'w1')];
    // 地狱压下 L22 伤很高：测潮汐时关掉敌攻，避免测时阵亡打断时钟
    const c = createCombat(items, 500, 500, { ...getLevel(22), atk: 0, hp: 99999 });
    expect(c.tideCycle).toBe(true);
    expect(c.armor).toBe((c.baseArmor) + 2); // t=0 高潮
    stepCombat(c, 4000);
    expect(c.tidePhase).toBe('low');
    expect(c.armor).toBe(c.baseArmor);
    stepCombat(c, 4000);
    expect(c.tidePhase).toBe('high');
    expect(c.armor).toBe(c.baseArmor + 2);
  });
});

describe('符文', () => {
  it('U01–U08 注册完整', () => {
    expect(RUNE_IDS.length).toBe(8);
    for (const id of RUNE_IDS) expect(RUNES[id].name).toBeTruthy();
  });
  it('候选生成至少1个适配且最多不重复', () => {
    let n = 0;
    const next = () => { n += 0.17; return n % 1; };
    const c = pickRuneCandidates(next, ['dagger', 'shield', 'moneybag'], [], 3);
    expect(c.length).toBe(3);
    expect(new Set(c).size).toBe(3);
    expect(c.some(id => RUNES[id].legalKinds.includes('dagger') || RUNES[id].legalKinds.includes('shield') || RUNES[id].legalKinds.includes('moneybag'))).toBe(true);
  });
  it('最多2枚且同ID不重复；U01 伤害+10%', () => {
    const g = new Game(newGameState(21));
    g.s.level = 21;
    g.s.pendingRuneChoices = ['U01', 'U03', 'U04'];
    const dagger = g.s.items.find(i => i.kind === 'dagger')!;
    expect(g.chooseRune('U01', dagger.id).ok).toBe(true);
    g.s.pendingRuneChoices = ['U01', 'U03', 'U05'];
    expect(g.chooseRune('U01', dagger.id).ok).toBe(false); // 同ID
    g.s.pendingRuneChoices = ['U03', 'U04', 'U05'];
    const shield = g.s.items.find(i => i.kind === 'shield')!;
    expect(g.chooseRune('U03', dagger.id).ok).toBe(false); // 同装备已有
    expect(g.chooseRune('U03', null).ok).toBe(true); // 暂存
    expect(g.s.runes.length).toBe(2);
    g.s.pendingRuneChoices = ['U04', 'U05', 'U07'];
    expect(g.chooseRune('U04', shield.id).ok).toBe(false); // 已满2

    const items = [mk('dagger', 'd1')];
    const runes: RuneInstance[] = [{ runeId: 'U01', itemId: 'd1' }];
    const base = computeWeaponCombatValue(items, items[0], [], null).value;
    const buffed = computeWeaponCombatValue(items, items[0], runes, null).value;
    expect(buffed).toBe(Math.round(base * 1.1));
  });
  it('U03 缩短间隔且受50%上限', () => {
    const items = [mk('dagger', 'd1')];
    const r = computeWeaponCombatValue(items, items[0], [{ runeId: 'U03', itemId: 'd1' }], null);
    expect(r.intervalMs).toBe(Math.round(800 * 0.94));
  });
  it('进入21关生成符文候选', () => {
    const g = new Game(newGameState(7));
    g.s.level = 20; g.s.phase = 'battle'; g.s.battleToken = 1;
    const fake = { over: true, won: true, reason: 't', t: 1, hp: 80, maxHp: 100, stats: { weapon: {}, absorbed: 0, healed: 0 } } as any;
    g.settle(fake);
    g.claimLoot(0);
    expect(g.s.level).toBe(21);
    expect(g.s.phase).toBe('camp');
    expect(g.campLeave().ok).toBe(true);
    expect(g.s.pendingRuneChoices?.length).toBe(3);
  });
});

describe('专精与配置表', () => {
  it('T01–T06 与 T01 倍率', () => {
    expect(DOCTRINE_IDS.length).toBe(6);
    expect(doctrineT01Mult(1)).toBe(1.12);
    expect(doctrineT01Mult(3)).toBe(1.04);
    const c = pickDoctrineCandidates(() => 0.2);
    expect(c.length).toBe(3);
    expect(new Set(c).size).toBe(3);
  });
  it('第36关生成专精候选并可选择', () => {
    const g = new Game(newGameState(1));
    g.s.level = 35; g.s.phase = 'battle'; g.s.battleToken = 1;
    g.settle({ over: true, won: true, reason: 't', t: 1, hp: 80, maxHp: 100, stats: { weapon: {}, absorbed: 0, healed: 0 } } as any);
    g.claimLoot(0);
    expect(g.s.level).toBe(36);
    expect(g.s.phase).toBe('camp');
    expect(g.campLeave().ok).toBe(true);
    expect(g.s.pendingDoctrineChoices?.length).toBe(3);
    const id = g.s.pendingDoctrineChoices![0];
    expect(g.chooseDoctrine(id).ok).toBe(true);
    expect(g.s.doctrine).toBe(id);
  });
  it('V3 装备与遗物注册完整', () => {
    expect(V3_ITEM_IDS.length).toBe(6);
    expect(V3_RELIC_IDS.length).toBe(36);
    for (const id of V3_ITEM_IDS) expect(V3_ITEMS[id].unlockLevel).toBeGreaterThan(0);
    for (const id of V3_RELIC_IDS) expect(V3_RELICS[id].name).toBeTruthy();
  });
  it('剧情与结局文案齐全', () => {
    expect(Object.keys(CHAPTER_INTROS).length).toBe(10);
    expect(MID_ACT_STORY.body.length).toBeGreaterThan(10);
    expect(ENDING_IDS.length).toBe(3);
    for (const id of ENDING_IDS) expect(ENDING_CHOICES[id].finale.length).toBeGreaterThan(10);
  });
  it('第45关可选结局', () => {
    const g = new Game(newGameState(1));
    g.s.level = 45;
    expect(g.chooseEnding('break_bond').ok).toBe(true);
    expect(g.s.endingChoice).toBe('break_bond');
  });
});

describe('战斗接入符文', () => {
  it('createCombat 应用 U01', () => {
    const items = [mk('dagger', 'd1')];
    const c0 = createCombat(items, 100, 100, V3_LEVELS[0]);
    const c1 = createCombat(items, 100, 100, V3_LEVELS[0], { runes: [{ runeId: 'U01', itemId: 'd1' }] });
    const v0 = c0.actors.find(a => a.kind === 'weapon')!.value;
    const v1 = c1.actors.find(a => a.kind === 'weapon')!.value;
    expect(v1).toBe(Math.round(v0 * 1.1));
  });
});
