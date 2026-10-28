import Phaser from 'phaser';
import type { LevelDef } from '../config/levels';
import { ITEMS } from '../config/items';
import { ECONOMY } from '../config/economy';
import { stepCombat, type CombatEvent, type CombatState } from '../systems/combat';
import type { ItemInstance } from '../models/types';
import { drawHero, drawMonster } from './art';

export interface BattleHooks {
  onEvents(ev: CombatEvent[], c: CombatState): void; // 通知 UI（装备闪光、音效）
  onEnd(c: CombatState): void;
}
/**
 * 战斗表现场景：唯一的游戏时钟在 update() 中推进 stepCombat；
 * 伤害只在逻辑层计算一次，动画只读取事件，掉帧/重复动画不影响结果。
 */
export class BattleScene extends Phaser.Scene {
  combat: CombatState | null = null;
  hooks: BattleHooks | null = null;
  speed = 1;
  paused = false;
  private items: ItemInstance[] = [];
  private hero!: Phaser.GameObjects.Container;
  private mon!: Phaser.GameObjects.Container;
  private monG!: Phaser.GameObjects.Graphics;
  private bg!: Phaser.GameObjects.Graphics;
  private bars!: Phaser.GameObjects.Graphics;
  private shieldBubble!: Phaser.GameObjects.Arc;
  private monName!: Phaser.GameObjects.Text;
  private banner!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private torches: Phaser.GameObjects.Arc[] = [];
  private shown = { hp: 100, maxHp: 100, shield: 0, mHp: 1, mMax: 1 };
  private target = { ...this.shown };
  private endTimer = -1;
  private level: LevelDef | null = null;
  constructor() { super('battle'); }
  create() {
    this.bg = this.add.graphics();
    for (let i = 0; i < 2; i++) this.torches.push(this.add.circle(0, 0, 40, 0xffa040, 0.18));
    this.hero = this.add.container(0, 0); const hg = this.add.graphics(); drawHero(hg, 40); this.hero.add(hg);
    this.shieldBubble = this.add.circle(0, 0, 58, 0x6fc8ff, 0.18).setStrokeStyle(3, 0x9fe0ff, 0.9).setVisible(false);
    this.hero.add(this.shieldBubble);
    this.mon = this.add.container(0, 0); this.monG = this.add.graphics(); this.mon.add(this.monG);
    this.bars = this.add.graphics().setDepth(5);
    this.monName = this.add.text(0, 0, '', { fontFamily: 'sans-serif', fontSize: '15px', color: '#ffe9a8', stroke: '#2a1a10', strokeThickness: 4, fontStyle: 'bold' }).setOrigin(0.5).setDepth(5);
    this.banner = this.add.text(0, 0, '', { fontFamily: 'sans-serif', fontSize: '22px', color: '#ff6b5a', stroke: '#2a0a05', strokeThickness: 5, fontStyle: 'bold' }).setOrigin(0.5).setDepth(10).setAlpha(0);
    this.timerText = this.add.text(0, 0, '', { fontFamily: 'sans-serif', fontSize: '13px', color: '#f5e6c4', stroke: '#000', strokeThickness: 3 }).setDepth(5);
    this.scale.on('resize', () => this.layout());
    this.tweens.add({ targets: this.hero, y: '+=4', yoyo: true, repeat: -1, duration: 900, ease: 'Sine.inOut' });
    this.layout();
    this.game.events.emit('ready');
  }
  private layout() {
    const w = this.scale.width, h = this.scale.height;
    this.bg.clear();
    this.bg.fillGradientStyle(0x2a1f3a, 0x2a1f3a, 0x15101e, 0x15101e, 1); this.bg.fillRect(0, 0, w, h);
    this.bg.lineStyle(1, 0x3d2f52, 0.6);
    for (let y = 0; y < h * 0.7; y += 24) { this.bg.lineBetween(0, y, w, y); for (let x = (y / 24) % 2 ? 0 : 24; x < w; x += 48) this.bg.lineBetween(x, y, x, y + 24); }
    this.bg.fillStyle(0x3a2c26); this.bg.fillRect(0, h * 0.7, w, h * 0.3);
    this.bg.fillStyle(0x4a382e); for (let x = 0; x < w; x += 40) this.bg.fillRect(x, h * 0.7, 38, 6);
    this.torches[0].setPosition(w * 0.08, h * 0.25); this.torches[1].setPosition(w * 0.92, h * 0.25);
    this.bg.fillStyle(0x6b4a2a); this.bg.fillRect(w * 0.08 - 3, h * 0.25, 6, 26); this.bg.fillRect(w * 0.92 - 3, h * 0.25, 6, 26);
    this.bg.fillStyle(0xffb040); this.bg.fillCircle(w * 0.08, h * 0.25 - 4, 7); this.bg.fillCircle(w * 0.92, h * 0.25 - 4, 7);
    const s = Math.min(1.3, Math.max(0.7, h / 260));
    this.hero.setPosition(w * 0.25, h * 0.6).setScale(s);
    this.mon.setPosition(w * 0.72, h * 0.58).setScale(s);
    this.monName.setPosition(w * 0.72, h * 0.12);
    this.banner.setPosition(w / 2, h * 0.32);
    this.timerText.setPosition(8, 6);
  }
  setPreview(lv: LevelDef, hp: number, maxHp: number) {
    this.level = lv; this.combat = null; this.endTimer = -1;
    drawMonster(this.monG, lv.monster, 44);
    this.monName.setText(`${lv.boss ? '👑 ' : ''}${lv.title}`);
    this.mon.setAlpha(1).setAngle(0); this.mon.list.slice(1).forEach(o => o.destroy());
    this.target = { hp, maxHp, shield: 0, mHp: lv.hp, mMax: lv.hp }; this.shown = { ...this.target };
    this.shieldBubble.setVisible(false); this.timerText.setText(''); this.banner.setAlpha(0);
    this.tweens.killTweensOf(this.mon); this.mon.setScale(this.hero.scale);
    this.tweens.add({ targets: this.mon, scaleY: this.hero.scale * 0.94, yoyo: true, repeat: -1, duration: 700, ease: 'Sine.inOut' });
  }
  start(c: CombatState, items: ItemInstance[], hooks: BattleHooks) {
    this.combat = c; this.items = items; this.hooks = hooks; this.endTimer = -1;
  }
  setSpeed(s: number) { this.speed = s; this.tweens.timeScale = s; }
  update(_t: number, dtRaw: number) {
    for (const t of this.torches) t.setRadius(38 + Math.sin(this.time.now / 130 + t.x) * 4);
    const c = this.combat;
    if (c && !this.paused) {
      const dt = Math.min(dtRaw, 100) * this.speed; // 掉帧/后台回来时限制步长，不会瞬间结算大量攻击
      if (!c.over) {
        const ev = stepCombat(c, dt);
        if (ev.length) { this.render(ev, c); this.hooks?.onEvents(ev, c); }
        this.target = { hp: c.hp, maxHp: c.maxHp, shield: c.shield, mHp: c.mHp, mMax: c.mMaxHp };
        const left = ECONOMY.enrageAt - c.t / 1000;
        this.timerText.setText(`⏱ ${(c.t / 1000).toFixed(1)}s  ${left > 0 ? `${Math.ceil(left)}秒后狂暴` : `🔥狂暴 ×${(1 + c.enrageStage * ECONOMY.enrageBonus).toFixed(2)}  ${Math.ceil(ECONOMY.timeout - c.t / 1000)}秒后超时`}`);
        if (c.over) this.endTimer = 1100;
      } else if (this.endTimer > 0) {
        this.endTimer -= dt;
        if (this.endTimer <= 0) { const h = this.hooks; this.combat = null; h?.onEnd(c); }
      }
    }
    // 血条平滑
    const k = Math.min(1, dtRaw / 120);
    for (const key of Object.keys(this.shown) as (keyof typeof this.shown)[]) this.shown[key] += (this.target[key] - this.shown[key]) * k;
    this.drawBars();
  }
  private drawBars() {
    const w = this.scale.width, h = this.scale.height, b = this.bars; b.clear();
    const bar = (x: number, y: number, bw: number, ratio: number, col: number, sh = 0) => {
      b.fillStyle(0x000000, 0.6); b.fillRoundedRect(x - 2, y - 2, bw + 4, 14, 7);
      b.fillStyle(col); b.fillRoundedRect(x, y, Math.max(0, bw * Math.min(1, ratio)), 10, 5);
      if (sh > 0) { b.fillStyle(0x7fd4ff, 0.85); b.fillRoundedRect(x, y + 6, Math.max(0, bw * Math.min(1, sh)), 4, 2); }
      b.lineStyle(1.5, 0xe8b64c); b.strokeRoundedRect(x - 2, y - 2, bw + 4, 14, 7);
    };
    const bw = Math.min(160, w * 0.36);
    bar(w * 0.25 - bw / 2, h * 0.88, bw, this.shown.hp / this.shown.maxHp, 0x5fd17a, this.shown.shield / this.shown.maxHp);
    bar(w * 0.72 - bw / 2, h * 0.2, bw, this.shown.mHp / this.shown.mMax, 0xff6b5a);
  }
  private float(x: number, y: number, text: string, color: string, size = 20) {
    const t = this.add.text(x + Phaser.Math.Between(-14, 14), y, text, { fontFamily: 'sans-serif', fontSize: `${size}px`, color, stroke: '#1a1010', strokeThickness: 4, fontStyle: 'bold' }).setOrigin(0.5).setDepth(9);
    this.tweens.add({ targets: t, y: y - 46, alpha: 0, duration: 900, ease: 'Cubic.out', onComplete: () => t.destroy() });
  }
  private render(ev: CombatEvent[], c: CombatState) {
    const hx = this.hero.x, hy = this.hero.y, mx = this.mon.x, my = this.mon.y;
    for (const e of ev) {
      if (e.type === 'weapon') {
        const kind = this.items.find(i => i.id === e.itemId)?.kind ?? 'dagger';
        const col = Phaser.Display.Color.HexStringToColor(ITEMS[kind].color).color;
        if (kind === 'dagger') {
          const p = this.add.triangle(hx + 30, hy - 10, 0, 0, 18, 4, 0, 8, col).setDepth(6);
          this.tweens.add({ targets: p, x: mx - 20, y: my - 10 + Phaser.Math.Between(-12, 12), duration: 160, onComplete: () => { p.destroy(); this.hit(mx, my, col, false); } });
        } else {
          const arc = this.add.graphics().setDepth(6); arc.lineStyle(7, col, 1); arc.beginPath(); arc.arc(0, 0, 50, -1.2, 1.2); arc.strokePath(); arc.setPosition(mx - 30, my);
          arc.setAlpha(0); this.tweens.add({ targets: arc, alpha: 1, angle: 50, duration: 180, yoyo: true, onComplete: () => arc.destroy() });
          this.hit(mx, my, col, true);
        }
        this.float(mx, my - 50, `-${e.dmg}`, '#fff2b0', e.heavy ? 26 : 20);
        this.tweens.add({ targets: this.hero, x: hx + 10, duration: 70, yoyo: true });
      } else if (e.type === 'shield') {
        if (e.amount > 0) this.float(hx, hy - 70, `+${e.amount}护盾`, '#8fd8ff', 16);
      } else if (e.type === 'monsterAttack') {
        this.tweens.add({ targets: this.mon, x: mx - 40, duration: 110, yoyo: true, ease: 'Quad.out' });
        if (e.absorbed) this.float(hx, hy - 60, `吸收${e.absorbed}`, '#8fd8ff', 16);
        if (e.hpLoss) this.float(hx + 10, hy - 40, `-${e.hpLoss}`, '#ff7a6a', 22);
        const fl = this.add.circle(hx, hy, 46, 0xff4040, 0.3).setDepth(6); this.tweens.add({ targets: fl, alpha: 0, duration: 250, onComplete: () => fl.destroy() });
        if (e.dmg >= 25) this.cameras.main.shake(140, 0.006);
      } else if (e.type === 'potion') {
        this.float(hx, hy - 80, `+${e.heal}`, '#7dff9a', 24);
        const g = this.add.circle(hx, hy, 20, 0x7dff9a, 0.4).setDepth(6); this.tweens.add({ targets: g, scale: 3, alpha: 0, duration: 500, onComplete: () => g.destroy() });
      } else if (e.type === 'enrage') {
        this.showBanner(`🔥 怪物狂暴！伤害×${e.mult.toFixed(2)}`);
        const rg = this.add.circle(0, 0, 70, 0xff3030, 0.22); this.mon.add(rg);
      } else if (e.type === 'bossHaste') {
        this.showBanner('💢 宝箱怪暴怒：攻速提升20%！');
      } else if (e.type === 'end') {
        if (e.won) { this.tweens.killTweensOf(this.mon); this.tweens.add({ targets: this.mon, alpha: 0, angle: 20, scale: 0.3, duration: 700 }); this.showBanner('胜利！', '#ffd45c'); }
        else this.showBanner(c.t >= ECONOMY.timeout * 1000 ? '超时……' : '倒下了……', '#ff6b5a');
      }
    }
    this.shieldBubble.setVisible(c.shield > 0).setAlpha(0.4 + Math.min(0.6, c.shield / c.maxHp));
  }
  private hit(x: number, y: number, col: number, heavy: boolean) {
    for (let i = 0; i < (heavy ? 10 : 5); i++) {
      const p = this.add.circle(x - 10, y - 10, heavy ? 5 : 3, col).setDepth(7);
      this.tweens.add({ targets: p, x: x - 10 + Phaser.Math.Between(-40, 40), y: y - 10 + Phaser.Math.Between(-40, 30), alpha: 0, duration: 380, onComplete: () => p.destroy() });
    }
    this.tweens.add({ targets: this.monG, x: 6, duration: 50, yoyo: true });
    if (heavy) this.cameras.main.shake(90, 0.004);
  }
  private showBanner(t: string, color = '#ff6b5a') {
    this.banner.setText(t).setColor(color).setAlpha(1).setScale(0.6);
    this.tweens.add({ targets: this.banner, scale: 1, duration: 250, ease: 'Back.out' });
    this.tweens.add({ targets: this.banner, alpha: 0, delay: 1400, duration: 500 });
  }
}
