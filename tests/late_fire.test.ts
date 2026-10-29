import { describe, expect, it } from 'vitest';
import { getLevel } from '../src/config/v3/levels';
import { lateTrashMult } from '../src/config/v3/campaign';
import { createCombat, stepCombat } from '../src/systems/combat';
import type { ItemInstance } from '../src/models/types';

const mk = (kind: ItemInstance['kind'], id: string): ItemInstance => ({ id, kind, level: 3, x: 0, y: 0, rotated: false });

describe('3.6.4 后期血量与心脏', () => {
  it('40 关起的杂兵按 1.30×1.05^(关-40) 叠血，首领不吃这档', () => {
    expect(lateTrashMult(40)).toBeCloseTo(1.3, 5);
    expect(lateTrashMult(41)).toBeCloseTo(1.3 * 1.05, 5);
    expect(lateTrashMult(46)).toBeCloseTo(1.3 * 1.05 ** 6, 5);
    expect(getLevel(39).boss).toBeFalsy();
    expect(getLevel(40).boss).toBe(true);
    expect(getLevel(40).hp).toBe(3257);
    expect(getLevel(41).boss).toBeFalsy();
    expect(getLevel(46).hp).toBe(Math.floor(3418 * lateTrashMult(46)));
    expect(getLevel(46).atk).toBe(35);
  });

  it('首领血攻保持 3.6.3，终局生命再 ×3', () => {
    expect(getLevel(15).hp).toBe(1218);
    expect(getLevel(15).atk).toBe(32);
    expect(getLevel(30).hp).toBe(2342);
    expect(getLevel(30).atk).toBe(32);
    expect(getLevel(50).hp).toBe(6204 * 3);
    expect(getLevel(50).atk).toBe(43);
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
