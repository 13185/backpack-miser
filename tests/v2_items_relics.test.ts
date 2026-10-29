import { describe, expect, it } from 'vitest';
import { ITEMS, itemUnlockLevel } from '../src/config/items';
import { V3_RELICS, V3_RELIC_IDS } from '../src/config/v3/relics';
import { createCombat, stepCombat } from '../src/systems/combat';
import { sameKindPenalty, weaponDamage } from '../src/systems/adjacency';
import type { ItemInstance } from '../src/models/types';

function mk(kind: ItemInstance['kind'], id: string, level: 1|2|3, x: number, y: number): ItemInstance {
  return { id, kind, level, x, y, rotated: false };
}

describe('V2 装备入池', () => {
  it('连弩/链锤/战锤/冰晶/战旗有配置与解锁', () => {
    for (const k of ['crossbow', 'chain_hammer', 'warhammer', 'ice_crystal', 'war_banner'] as const) {
      expect(ITEMS[k].name).toBeTruthy();
      expect(itemUnlockLevel(k)).toBeGreaterThanOrEqual(6);
    }
  });
  it('连弩一轮两箭', () => {
    const items = [mk('crossbow', 'c', 1, 0, 0)];
    const c = createCombat(items, 100, 100, { monster: 'slime', title: 't', hp: 500, atk: 0, interval: 10 }, {});
    const a = c.actors.find(x => x.id === 'c')!;
    expect(a.shots).toBe(2);
    stepCombat(c, 1600);
    expect(c.stats.weapon['c']).toBeGreaterThan(0);
  });
  it('战锤忽略50%护甲', () => {
    const items = [mk('warhammer', 'w', 1, 0, 0)];
    const c = createCombat(items, 100, 100, { monster: 'skeleton', title: 't', hp: 200, atk: 0, interval: 10, armor: 10 }, {});
    const a = c.actors.find(x => x.id === 'w')!;
    expect(a.armorIgnorePct).toBe(0.5);
  });
  it('同种≥3 匕首有衰减', () => {
    const items = [mk('dagger', 'a', 3, 0, 0), mk('dagger', 'b', 3, 1, 0), mk('dagger', 'c', 3, 2, 0)];
    expect(sameKindPenalty(items, items[2])).toBe(0.85);
    expect(weaponDamage(items, items[0])).toBeGreaterThan(weaponDamage(items, items[2]));
  });
});

describe('V2 遗物接入', () => {
  it('36 件遗物均 implemented', () => {
    expect(V3_RELIC_IDS.length).toBe(36);
    for (const id of V3_RELIC_IDS) expect(V3_RELICS[id].implemented).toBe(true);
  });
  it('C12 开战给盾；C02 提高武器伤害', () => {
    const items = [mk('dagger', 'd', 1, 0, 0)];
    const base = createCombat(items, 100, 100, { monster: 'slime', title: 't', hp: 100, atk: 0, interval: 10 }, {});
    const withR = createCombat(items, 100, 100, { monster: 'slime', title: 't', hp: 100, atk: 0, interval: 10 }, {
      relics: ['C12', 'C02'],
    });
    expect(withR.shield).toBe(8);
    expect(withR.actors.find(a => a.id === 'd')!.value).toBeGreaterThan(base.actors.find(a => a.id === 'd')!.value);
  });
});
