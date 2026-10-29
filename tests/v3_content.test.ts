import { ECONOMY } from '../src/config/economy';
import { describe, expect, it } from 'vitest';
import { ITEMS, ITEM_KINDS, itemUnlockLevel } from '../src/config/items';
import { getLevel } from '../src/config/v3/levels';
import { RUNES, RUNE_IDS } from '../src/config/v3/runes';
import { DOCTRINES, DOCTRINE_IDS } from '../src/config/v3/doctrines';
import { V3_RELICS, V3_RELIC_IDS, MAX_RELICS } from '../src/config/v3/relics';
import { createCombat, computeBagGold, computeLedgerBonus, computeWeaponCombatValue, damageToMonster, isMonsterCharging, simulate, stepCombat } from '../src/systems/combat';
import { refreshCost } from '../src/systems/economy';
import { Game, newGameState } from '../src/systems/game';
import { canPlace, findSpot } from '../src/systems/placement';
import { mergeItems } from '../src/systems/merge';
import type { ItemInstance, RuneInstance } from '../src/models/types';
import { CHAPTER_BG, MONSTER_ART } from '../src/config/monsters';

const mk = (kind: ItemInstance['kind'], id: string, level: 1 | 2 | 3 = 1, x = 0, y = 0): ItemInstance =>
  ({ id, kind, level, x, y, rotated: false });

describe('新装备', () => {
  it('12 种 ItemKind 均有配置与解锁关', () => {
    expect(ITEM_KINDS.length).toBe(19); // 6基础+5 V2+7 V3+burden
    expect(itemUnlockLevel('spear')).toBe(21);
    expect(itemUnlockLevel('compass')).toBe(26);
    expect(itemUnlockLevel('firework_crossbow')).toBe(31);
    expect(itemUnlockLevel('fold_wall')).toBe(36);
    expect(itemUnlockLevel('travel_lamp')).toBe(41);
    expect(itemUnlockLevel('emergency_ledger')).toBe(46);
    expect(itemUnlockLevel('poison_needle')).toBe(21);
  });
  it('可放置、合成、开战', () => {
    const items: ItemInstance[] = [];
    const spot = findSpot(items, 5, 6, 'spear')!;
    expect(spot).toBeTruthy();
    expect(canPlace(items, 5, 6, 'spear', spot.x, spot.y, spot.rotated)).toBe(true);
    const a = mk('spear', 'a', 1, spot.x, spot.y);
    const b = mk('spear', 'b', 1, null as any, null as any);
    b.x = null; b.y = null;
    const r = mergeItems([a, b], b.id, a.id);
    expect(r.result?.level).toBe(2);
    const g = new Game(newGameState(1));
    g.s.items = [mk('spear', 's1', 1, 0, 0), mk('fold_wall', 'f1', 1, 2, 0)];
    g.s.phase = 'prep';
    // fold_wall is 1x3 - may overlap; place properly
    g.s.items = [];
    for (const kind of ['spear', 'fold_wall'] as const) {
      const sp = findSpot(g.s.items, g.s.cols, 6, kind)!;
      g.s.rows = 6;
      g.s.items.push({ id: kind, kind, level: 1, x: sp.x, y: sp.y, rotated: sp.rotated });
    }
    expect(g.startBattle().ok).toBe(true);
    const c = g.makeCombat();
    simulate(c);
    expect(c.over).toBe(true);
  });
  it('折叠铁壁每场最多2次；旅行灯最多3次', () => {
    const items = [
      mk('dagger', 'd', 3, 0, 0),
      mk('fold_wall', 'fw', 3, 1, 0),
    ];
    // dagger 1x2 at 0,0; fold_wall 1x3 at 1,0
    const c = createCombat(items, 100, 100, { monster: 'slime', title: 't', hp: 5000, atk: 0, interval: 10 });
    const sh = c.actors.find(a => a.id === 'fw')!;
    expect(sh.maxUses).toBe(2);
    let shields = 0;
    while (!c.over && c.t < 30000) {
      const ev = stepCombat(c, 1000);
      shields += ev.filter(e => e.type === 'shield' && e.itemId === 'fw').length;
    }
    expect(shields).toBeLessThanOrEqual(2);
  });
  it('账匣与钱袋结算', () => {
    const bag = [mk('moneybag', 'm', 1, 0, 0)];
    const runes: RuneInstance[] = [{ runeId: 'U07', itemId: 'm' }];
    expect(computeBagGold(bag, runes, null)).toBe(ITEMS.moneybag.values[0] + 2);
    expect(computeBagGold(bag, runes, 'T06')).toBe(Math.round((ITEMS.moneybag.values[0] + 2) * 1.15));
    expect(computeLedgerBonus([mk('emergency_ledger', 'e', 2, 1, 0)], 20)).toBe(7);
    expect(computeLedgerBonus([mk('emergency_ledger', 'e', 2, 1, 0)], 30)).toBe(0);
  });
});

describe('符文 U02–U08', () => {
  it('全部标记 implemented', () => {
    for (const id of RUNE_IDS) expect(RUNES[id].implemented).toBe(true);
  });
  it('U02 忽略1点护甲', () => {
    expect(damageToMonster(5, 2)).toBe(3);
    // with ignore 1 → armor 1 → dmg 4
    expect(damageToMonster(5, Math.max(0, 2 - 1))).toBe(4);
    const items = [mk('dagger', 'd', 1, 0, 0)];
    const c = createCombat(items, 100, 100, { monster: 'skeleton', title: 't', hp: 100, atk: 0, interval: 10, armor: 2 }, {
      runes: [{ runeId: 'U02', itemId: 'd' }],
    });
    const w = c.actors.find(a => a.id === 'd')!;
    expect(w.armorIgnore).toBe(1);
    stepCombat(c, 800);
    // raw 5, armor 2-1=1 → dmg 4
    expect(c.stats.weapon['d']).toBe(4);
  });
  it('U04 护盾+15% · U05 药水+15%', () => {
    const items = [mk('dagger', 'd', 1, 0, 0), mk('shield', 's', 1, 2, 0)];
    const c = createCombat(items, 100, 100, { monster: 'slime', title: 't', hp: 9999, atk: 0, interval: 10 }, {
      runes: [{ runeId: 'U04', itemId: 's' }],
    });
    const sh = c.actors.find(a => a.id === 's')!;
    expect(sh.shieldMult).toBeCloseTo(1.15);
    const pots = createCombat(
      [mk('dagger', 'd', 1, 0, 0), mk('potion', 'p', 1, 2, 0)],
      30, 100,
      { monster: 'slime', title: 't', hp: 9999, atk: 50, interval: 1 },
      { runes: [{ runeId: 'U05', itemId: 'p' }] },
    );
    expect(pots.potions[0].heal).toBe(Math.round(ITEMS.potion.values[0] * 1.15));
  });
  it('U06 毒针附毒+1；U08 蓄力窗口+15%', () => {
    const items = [mk('poison_needle', 'n', 1, 0, 0)];
    const c = createCombat(items, 100, 100, { monster: 'slime', title: 't', hp: 200, atk: 0, interval: 10 }, {
      runes: [{ runeId: 'U06', itemId: 'n' }],
    });
    stepCombat(c, 1200);
    expect(c.poisonStacks).toBe(2); // 1+1
    const items2 = [mk('dagger', 'd', 1, 0, 0)];
    const c2 = createCombat(items2, 100, 100, { monster: 'mimic', title: 't', hp: 100, atk: 0, interval: 10, boss: true, armor: 0 }, {
      runes: [{ runeId: 'U08', itemId: 'd' }],
    });
    c2.enrageStage = 1; // 模拟狂暴蓄力窗口
    expect(isMonsterCharging(c2)).toBe(true);
    const base = computeWeaponCombatValue(items2, items2[0], [], null).value;
    stepCombat(c2, 800);
    expect(c2.stats.weapon['d']).toBe(Math.round(base * 1.15));
  });
});

describe('专精 T02–T06', () => {
  it('全部 implemented；T06 刷新折扣', () => {
    for (const id of DOCTRINE_IDS) expect(DOCTRINES[id].implemented).toBe(true);
    expect(refreshCost(0)).toBe(ECONOMY.refreshBase);
    expect(refreshCost(0, 'T06')).toBe(Math.max(1, ECONOMY.refreshBase - 1));
    expect(refreshCost(0, 'T06')).toBeGreaterThanOrEqual(1);
  });
  it('T02 缩短间隔；T03 盾上限60%', () => {
    const items = [mk('dagger', 'a', 1, 0, 0), mk('dagger', 'b', 1, 1, 0), mk('dagger', 'c', 1, 2, 0)];
    // place non-overlap: dagger is 1x2 — use rotated
    items[0].rotated = true; items[1].rotated = true; items[1].x = 0; items[1].y = 1;
    items[2].rotated = true; items[2].x = 0; items[2].y = 2;
    const r = computeWeaponCombatValue(items, items[0], [], 'T02');
    expect(r.intervalMs).toBe(Math.round(800 * 0.94));
    const c = createCombat([mk('dagger', 'd', 1, 0, 0), mk('shield', 's', 1, 2, 0)], 100, 100,
      { monster: 'slime', title: 't', hp: 9999, atk: 0, interval: 10 }, { doctrine: 'T03' });
    expect(c.shieldCapRate).toBe(0.6);
    expect(c.shieldGenMult).toBe(1.08);
  });
});

describe('遗物与章节美术', () => {
  it('遗物表完整；Boss 后可选题', () => {
    expect(V3_RELIC_IDS.length).toBe(36);
    expect(MAX_RELICS).toBe(3);
    expect(V3_RELICS.A02.implemented).toBe(true);
    expect(V3_RELICS.A05.implemented).toBe(true);
    expect(V3_RELICS.C10.implemented).toBe(true);
    const g = new Game(newGameState(1));
    g.s.level = 20; g.s.phase = 'battle'; g.s.battleToken = 1;
    g.settle({ over: true, won: true, reason: 't', t: 1, hp: 80, maxHp: 100, stats: { weapon: {}, absorbed: 0, healed: 0 } } as any);
    g.claimLoot(0);
    expect(g.s.level).toBe(21);
    expect(g.s.phase).toBe('camp');
    expect(g.campLeave().ok).toBe(true);
    expect(g.s.pendingRelicChoices?.length).toBe(3);
    const id = g.s.pendingRelicChoices![0];
    expect(g.chooseRelic(id).ok).toBe(true);
    expect(g.s.relics).toContain(id);
  });
  it('skipLoot 触发 A05', () => {
    const g = new Game(newGameState(1));
    g.s.level = 21; g.s.relics = ['A05'];
    g.s.phase = 'loot';
    g.s.loot = { level: 21, options: [{ kind: 'dagger', level: 1 }, { kind: 'shield', level: 1 }, { kind: 'potion', level: 1 }], claimed: false };
    const gold0 = g.s.gold;
    expect(g.skipLoot().ok).toBe(true);
    expect(g.s.gold).toBe(gold0 + 6); // V3 §09 回收4 + A05 2
  });
  it('第30关镜砂审计官；ch6/ch7 背景注册', () => {
    expect(getLevel(30).monster).toBe('mirror_auditor');
    expect(getLevel(30).boss).toBe(true);
    expect(CHAPTER_BG[6].key).toBe('bg_ch6');
    expect(CHAPTER_BG[7].key).toBe('bg_ch7');
    expect(MONSTER_ART.mirror_auditor?.src).toContain('B30');
  });
});
