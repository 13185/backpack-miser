import { describe, expect, it } from 'vitest';
import { bagCellSize } from '../src/ui/bagLayout';
import { getLevel } from '../src/config/v3/levels';
import { lateTrashMult, seasonedMult, wallEase } from '../src/config/v3/campaign';
import { BOSS_CRIT_HP_PCT, HEART_CRIT_HP_PCT, HEART_FIRE_HP_PCT, createCombat, stepCombat } from '../src/systems/combat';
import type { ItemInstance } from '../src/models/types';

const mk = (kind: ItemInstance['kind'], id: string): ItemInstance => ({ id, kind, level: 3, x: 0, y: 0, rotated: false });

describe('背包格子尺寸', () => {
  it('同一宽度下列数不变时，高度变化不会改格子', () => {
    const a = bagCellSize(390, 6, false);
    const b = bagCellSize(390, 6, false);
    expect(a).toBe(b);
    expect(a).toBeGreaterThanOrEqual(40);
    expect(bagCellSize(390, 5, false)).toBeGreaterThan(bagCellSize(390, 6, false));
    expect(bagCellSize(1280, 6, true)).toBe(72);
  });
});

describe('3.6.4 后期血量与心脏', () => {
  it('40 关起的杂兵按 1.30×1.05^(关-40) 叠血，首领不吃这档', () => {
    expect(lateTrashMult(40)).toBeCloseTo(1.3, 5);
    expect(lateTrashMult(41)).toBeCloseTo(1.3 * 1.05, 5);
    expect(lateTrashMult(46)).toBeCloseTo(1.3 * 1.05 ** 6, 5);
    expect(getLevel(39).boss).toBeFalsy();
    expect(getLevel(40).boss).toBe(true);
    expect(wallEase(40, true)).toBe(0.9);
    expect(wallEase(41, false)).toBe(1);
    expect(getLevel(40).hp).toBe(Math.floor(3257 * wallEase(40, true)));
    expect(getLevel(41).boss).toBeFalsy();
    const ease4346 = (n: number) => Math.floor(n * 0.965);
    expect(getLevel(42).hp).toBe(4341);
    expect(getLevel(43).hp).toBe(ease4346(4817));
    expect(getLevel(43).atk).toBe(ease4346(35));
    expect(getLevel(45).boss).toBe(true);
    expect(getLevel(45).hp).toBe(ease4346(3339));
    expect(getLevel(45).atk).toBe(ease4346(33));
    expect(getLevel(46).hp).toBe(ease4346(Math.floor(3418 * lateTrashMult(46))));
    expect(getLevel(46).atk).toBe(ease4346(35));
    expect(getLevel(47).hp).toBe(6570);
  });

  it('13–25 关先砍 10%，砖墙首领再让一截；终局生命仍 ×3', () => {
    expect(wallEase(15, true)).toBe(0.85);
    expect(wallEase(30, true)).toBe(0.78);
    expect(wallEase(50, true)).toBe(1);
    expect(getLevel(15).hp).toBe(Math.floor(Math.floor(1218 * 0.9) * 0.85));
    expect(getLevel(15).atk).toBe(Math.floor(Math.floor(32 * 0.9) * 0.85));
    expect(getLevel(25).hp).toBe(1642);
    expect(getLevel(25).atk).toBe(24);
    expect(getLevel(30).hp).toBe(Math.floor(2342 * 0.78));
    expect(getLevel(30).atk).toBe(Math.floor(32 * 0.78));
    expect(getLevel(35).hp).toBe(2245);
    expect(getLevel(35).atk).toBe(28);
    expect(getLevel(50).boss).toBe(true);
    const l50hp = Math.floor(6204 * 3 * 0.85);
    const l50atk = Math.floor(43 * 0.85);
    expect(getLevel(50).hp).toBe(Math.floor(l50hp * 1.20));
    expect(getLevel(50).atk).toBe(Math.floor(l50atk * 0.90));
    expect(HEART_FIRE_HP_PCT).toBeCloseTo(0.35 * 0.9, 5);
    expect(HEART_CRIT_HP_PCT).toBeCloseTo(0.38 * 0.9, 5);
    expect(BOSS_CRIT_HP_PCT).toBe(0.32);
    expect(seasonedMult(25)).toBe(1);
    expect(seasonedMult(46)).toBeCloseTo(1 + 0.012 * 21, 5);
    expect(seasonedMult(50)).toBeCloseTo(1.3, 5);
    expect(getLevel(46).hp).toBe(Math.floor(Math.floor(3418 * lateTrashMult(46)) * 0.965));
  });

  it('首领普攻会出现大暴击，杂兵不会', () => {
    const boss = createCombat([mk('dagger', 'd')], 500, 500, { ...getLevel(15), atk: 10, interval: 0.4, hp: 5000 });
    const evs = [];
    for (let i = 0; i < 80 && !boss.over; i++) evs.push(...stepCombat(boss, 200));
    expect(evs.some(e => e.type === 'monsterAttack' && e.crit)).toBe(true);
    const trash = createCombat([mk('dagger', 'd')], 500, 500, { ...getLevel(46), atk: 10, interval: 0.4, hp: 5000 });
    const te = [];
    for (let i = 0; i < 40 && !trash.over; i++) te.push(...stepCombat(trash, 200));
    expect(te.some(e => e.type === 'monsterAttack' && e.crit)).toBe(false);
  });

  it('黄金心脏到 66% 后无敌，期间打不掉血，随后放大火', () => {
    const lv = getLevel(50);
    const c = createCombat([mk('greatsword', 'g')], 10000, 100, { ...lv, atk: 0, interval: 8, armor: 0, hp: 200 });
    const evs = [];
    while (!c.over && c.mHp / c.mMaxHp > 0.66) evs.push(...stepCombat(c, 400));
    expect(c.invulnUntil).toBeGreaterThan(c.t - 1);
    const locked = c.mHp;
    stepCombat(c, 400);
    expect(c.mHp).toBe(locked);
    let fire = false;
    for (let i = 0; i < 30 && !c.over; i++) {
      const ev = stepCombat(c, 400);
      evs.push(...ev);
      if (ev.some(e => e.type === 'fireBreath')) { fire = true; break; }
    }
    expect(evs.some(e => e.type === 'invuln')).toBe(true);
    expect(fire).toBe(true);
  });
});
