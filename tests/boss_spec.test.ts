import { describe, expect, it } from 'vitest';
import { getLevel } from '../src/config/v3/levels';
import { HEART_TUNE } from '../src/config/v3/campaign';
import { createCombat, simulate, stepCombat } from '../src/systems/combat';
import type { ItemInstance } from '../src/models/types';

function mk(kind: ItemInstance['kind'], id: string, level: 1|2|3, x: number, y: number): ItemInstance {
  return { id, kind, level, x, y, rotated: false };
}

describe('Boss 机制对齐规格', () => {
  it('B5 黄金宝箱怪具备完整技能组', () => {
    const lv = getLevel(5);
    expect(lv.monster).toBe('mimic');
    expect(lv.heavyStrike?.every).toBe(3);
    expect(lv.heavyStrike!.mult).toBeGreaterThanOrEqual(2);
    expect(lv.phaseShields?.thresholds?.length).toBeGreaterThan(0);
    expect(lv.openMShieldPct).toBeGreaterThan(0);
    expect(lv.mechSummary).toMatch(/撕咬|噬金|蓄力/);
  });
  it('HEART 阈值 70%/35%，护盾随地狱调参', () => {
    expect(HEART_TUNE.phase2At).toBe(0.7);
    expect(HEART_TUNE.phase3At).toBe(0.35);
    expect(HEART_TUNE.phase2Shield).toBe(HEART_TUNE.phase3Shield);
    expect(HEART_TUNE.phase2Shield).toBeGreaterThan(0);
  });
  it('B10 有重击与破绽配置', () => {
    const lv = getLevel(10);
    expect(lv.heavyStrike?.every).toBe(3);
    expect(lv.heavyStrike?.mult).toBe(2);
    expect(lv.heavyStrike?.armorBreakMs).toBe(2000);
    expect(lv.armor).toBe(5);
  });
  it('B15 有三次召唤+蓄力', () => {
    const lv = getLevel(15);
    expect(lv.summons?.atSec).toEqual([7, 16, 26]);
    expect(lv.summons?.maxAlive).toBe(2);
    expect(lv.heavyStrike?.mult).toBeGreaterThanOrEqual(1.7);
  });
  it('B20 三阶段盾与重击', () => {
    const lv = getLevel(20);
    expect(lv.phaseShields?.thresholds).toEqual([0.75, 0.45, 0.2]);
    expect(lv.heavyStrike?.every).toBe(3);
    expect(lv.heavyStrike!.mult).toBeGreaterThanOrEqual(1.8);
  });
  it('B25 潮汐+阶段盾+高频重击', () => {
    const lv = getLevel(25);
    expect(lv.tideCycle).toBe(true);
    expect(lv.heavyStrike?.every).toBe(2);
    expect(lv.heavyStrike!.mult).toBeGreaterThanOrEqual(2.0);
    expect(lv.phaseShields?.thresholds?.length).toBeGreaterThanOrEqual(2);
  });
  it('B30 回响 every2 + 双阶段盾 + 蓄力', () => {
    const lv = getLevel(30);
    expect(lv.echo?.every).toBe(2);
    expect(lv.echo!.pct).toBeGreaterThanOrEqual(0.65);
    expect(lv.phaseShields?.thresholds).toEqual([0.65, 0.35]);
    expect(lv.heavyStrike?.mult).toBeGreaterThanOrEqual(1.7);
  });
  it('B35 护甲5、过热更频、半血盾', () => {
    const lv = getLevel(35);
    expect(lv.armor).toBe(5);
    expect(lv.overheat?.every).toBe(2);
    expect(lv.overheat!.mult).toBeGreaterThanOrEqual(2.2);
    expect(lv.phaseShields?.thresholds).toEqual([0.5]);
  });
  it('B40 强化祝祷+双盾+高频重击', () => {
    const lv = getLevel(40);
    expect(lv.pray).toBeTruthy();
    expect(lv.pray!.intervalMs).toBeLessThanOrEqual(5000);
    expect(lv.heavyStrike?.every).toBe(3);
    expect(lv.phaseShields?.thresholds?.length).toBeGreaterThanOrEqual(2);
  });
  it('B45 护甲4、回响55%、三阶段盾+蓄力', () => {
    const lv = getLevel(45);
    expect(lv.armor).toBe(4);
    expect(lv.echo!.pct).toBeGreaterThanOrEqual(0.55);
    expect(lv.phaseShields?.thresholds).toEqual([0.7, 0.4, 0.15]);
    expect(lv.heavyStrike?.every).toBe(3);
  });
  it('B10 重击会触发 windup 事件', () => {
    const lv = getLevel(10);
    const items = [mk('dagger', 'd', 1, 0, 0)];
    const c = createCombat(items, 200, 200, { ...lv, atk: 5, interval: 0.5, hp: 5000 }, {});
    const evs = [];
    for (let i = 0; i < 40 && !c.over; i++) evs.push(...stepCombat(c, 200));
    expect(evs.some(e => e.type === 'heavyWindup')).toBe(true);
  });
  it('B15 召唤在约6秒出现', () => {
    const lv = getLevel(15);
    const items = [mk('dagger', 'd', 1, 0, 0)];
    const c = createCombat(items, 500, 500, { ...lv, atk: 1, interval: 5, hp: 800 }, {});
    stepCombat(c, 7500);
    expect(c.adds.some(a => a.id.startsWith('summon_'))).toBe(true);
  });
});
