import Phaser from 'phaser';
import type { LevelDef } from '../config/levels';
import { ITEMS } from '../config/items';
import { ECONOMY } from '../config/economy';
import { CHAPTER_BG, MONSTER_ART, MONSTER_BASE } from '../config/monsters';
import { stepCombat, type CombatEvent, type CombatState } from '../systems/combat';
import type { ItemInstance } from '../models/types';
import { drawHero, drawMonster } from './art';
import { allVariantArt, pickEnemyArt, ENEMY_FOOT_ORIGIN_Y } from '../art/enemyArt';
import { V3_LEVELS } from '../config/v3/levels';
import { HeroSprite } from '../art/HeroSprite';
import type { HeroClassId } from '../art/types';

export interface BattleHooks {
  onEvents(ev: CombatEvent[], c: CombatState): void;
  onEnd(c: CombatState): void;
}

/**
 * 战斗表现：唯一游戏时钟在 update() 推进 stepCombat；
 * 伤害只在逻辑层计算一次；英雄动画由状态驱动，刀光次数≠扣血次数。
 */
export class BattleScene extends Phaser.Scene {
  combat: CombatState | null = null;
  hooks: BattleHooks | null = null;
  speed = 1;
  paused = false;
  heroClass: HeroClassId = 'merchant';
  private items: ItemInstance[] = [];
  private heroGfx!: Phaser.GameObjects.Container; // fallback
  private heroSprite: HeroSprite | null = null;
  private mon!: Phaser.GameObjects.Container;
  private monG!: Phaser.GameObjects.Graphics;
  private monImg: Phaser.GameObjects.Image | null = null;
  private bg!: Phaser.GameObjects.Graphics;
  private bgImg: Phaser.GameObjects.Image | null = null;
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
  artReady = false;
  private footMark: Phaser.GameObjects.Arc | null = null;
  private monIsBoss = false;

  constructor() { super('battle'); }

  preload() {
    // 缺失时不阻断：create 会回退程序绘制
    const asset = (rel: string) => rel; // vite base ./
    for (const bg of Object.values(CHAPTER_BG)) this.load.image(bg.key, asset(bg.src));
    for (const art of Object.values(MONSTER_ART)) {
      if (art) this.load.image(art.key, asset(art.src));
    }
    for (const art of allVariantArt()) this.load.image(art.key, asset(art.src));
    HeroSprite.preload(this, 'merchant');
    HeroSprite.preload(this, 'guard');
    HeroSprite.preload(this, 'ranger');
    this.load.on('loaderror', (file: { key: string; src?: string }) => {
      console.warn('[art] 资源缺失:', file.key, file.src || '');
    });
    this.load.on('complete', () => {
      const ok = this.textures.exists('hero_merchant_idle');
      console.info('[art] preload complete, merchant_idle=', ok, 'keys=', this.textures.getTextureKeys().filter(k => k.startsWith('hero_')).length);
    });
  }

  create() {
    this.bg = this.add.graphics();
    if (this.textures.exists('bg_ch1')) {
      this.bgImg = this.add.image(0, 0, 'bg_ch1').setOrigin(0.5, 0.5).setDepth(0);
    }
    for (let i = 0; i < 2; i++) this.torches.push(this.add.circle(0, 0, 40, 0xffa040, 0.18).setDepth(1));
    this.heroGfx = this.add.container(0, 0).setDepth(3);
    this.tryBuildHero();
    if (this.heroSprite) {
      this.heroSprite.container.setDepth(12).setVisible(true).setAlpha(1);
      this.heroSprite.sprite.setVisible(true).setAlpha(1);
    }
    this.shieldBubble = this.add.circle(0, 0, 58, 0x6fc8ff, 0.18).setStrokeStyle(3, 0x9fe0ff, 0.9).setVisible(false).setDepth(4);
    this.mon = this.add.container(0, 0).setDepth(3);
    this.monG = this.add.graphics();
    this.mon.add(this.monG);
    this.bars = this.add.graphics().setDepth(5);
    this.monName = this.add.text(0, 0, '', { fontFamily: 'sans-serif', fontSize: '15px', color: '#ffe9a8', stroke: '#2a1a10', strokeThickness: 4, fontStyle: 'bold' }).setOrigin(0.5).setDepth(5);
    this.banner = this.add.text(0, 0, '', { fontFamily: 'sans-serif', fontSize: '22px', color: '#ff6b5a', stroke: '#2a0a05', strokeThickness: 5, fontStyle: 'bold' }).setOrigin(0.5).setDepth(10).setAlpha(0);
    this.timerText = this.add.text(0, 0, '', { fontFamily: 'sans-serif', fontSize: '13px', color: '#f5e6c4', stroke: '#000', strokeThickness: 3 }).setDepth(5);
    this.scale.on('resize', () => this.layout());
    this.artReady = true;
    this.layout();
    // 若首帧纹理未就绪，短暂重试（不改伤害逻辑）
    this.time.delayedCall(200, () => { this.tryBuildHero(); this.layout(); });
    this.time.delayedCall(800, () => { this.tryBuildHero(); this.layout(); });
    this.game.events.emit('battle-ui-ready');
    this.game.events.emit('ready');
  }

  private tryBuildHero() {
    const idleKey = `hero_${this.heroClass}_idle`;
    const has = this.textures.exists(idleKey);
    console.info('[art] tryBuildHero', idleKey, has);
    try {
      if (has) {
        this.heroSprite?.destroy();
        this.heroSprite = new HeroSprite(this, this.heroClass, 0, 0);
        this.heroGfx?.setVisible(false);
        this.heroSprite.container.setDepth(12).setVisible(true);
        this.heroSprite.play('idle', true);
        return;
      }
    } catch (e) {
      console.warn('[art] hero sprite failed, fallback graphics', e);
    }
    this.heroSprite?.destroy();
    this.heroSprite = null;
    this.heroGfx.removeAll(true);
    const hg = this.add.graphics();
    drawHero(hg, 40);
    this.heroGfx.add(hg);
    this.heroGfx.setVisible(true);
    this.tweens.add({ targets: this.heroGfx, y: '+=4', yoyo: true, repeat: -1, duration: 900, ease: 'Sine.inOut' });
  }

  setHeroClass(cls: HeroClassId) {
    this.heroClass = cls;
    if (!this.artReady) return;
    this.tryBuildHero();
    this.layout();
  }

  private layout() {
    const w = this.scale.width, h = this.scale.height;
    this.bg.clear();
    if (this.bgImg) {
      this.bgImg.setPosition(w / 2, h / 2).setDisplaySize(w, h);
    } else {
      this.bg.fillGradientStyle(0x2a1f3a, 0x2a1f3a, 0x15101e, 0x15101e, 1); this.bg.fillRect(0, 0, w, h);
      this.bg.lineStyle(1, 0x3d2f52, 0.6);
      for (let y = 0; y < h * 0.7; y += 24) { this.bg.lineBetween(0, y, w, y); for (let x = (y / 24) % 2 ? 0 : 24; x < w; x += 48) this.bg.lineBetween(x, y, x, y + 24); }
      this.bg.fillStyle(0x3a2c26); this.bg.fillRect(0, h * 0.7, w, h * 0.3);
      this.bg.fillStyle(0x4a382e); for (let x = 0; x < w; x += 40) this.bg.fillRect(x, h * 0.7, 38, 6);
    }
    this.torches[0].setPosition(w * 0.08, h * 0.25); this.torches[1].setPosition(w * 0.92, h * 0.25);
    if (!this.bgImg) {
      this.bg.fillStyle(0x6b4a2a); this.bg.fillRect(w * 0.08 - 3, h * 0.25, 6, 26); this.bg.fillRect(w * 0.92 - 3, h * 0.25, 6, 26);
      this.bg.fillStyle(0xffb040); this.bg.fillCircle(w * 0.08, h * 0.25 - 4, 7); this.bg.fillCircle(w * 0.92, h * 0.25 - 4, 7);
    }
    // #battle 仅 ~210–340px 高且 overflow:hidden：脚底靠下，身高按「地面以上可用高度」适配，避免裁掉上半身
    const groundY = h * 0.82;
    const s = Math.min(1.15, Math.max(0.75, h / 260));
    if (this.heroSprite) {
      const heroH = Math.max(96, Math.min(groundY * 0.92, h * 0.78));
      this.heroSprite.container.setPosition(w * 0.26, groundY).setDepth(12).setVisible(true).setAlpha(1);
      this.heroSprite.setDisplaySize(heroH);
      this.heroSprite.sprite.setVisible(true).setAlpha(1);
      this.shieldBubble?.setPosition(w * 0.26, groundY - heroH * 0.35);
      if (!this.footMark) this.footMark = this.add.circle(0, 0, 5, 0x7dff9a, 0.95).setDepth(13);
      this.footMark.setPosition(w * 0.26, groundY).setVisible(true);
    } else {
      this.heroGfx.setPosition(w * 0.25, groundY).setScale(s);
      this.shieldBubble?.setPosition(w * 0.25, groundY);
    }
    // 敌人画布与主角同为「1024 画布+脚底 y≈928」，按主角画布高度等比；首领放大 1.2×
    const heroCanvasH = this.heroSprite ? Math.max(96, Math.min(groundY * 0.92, h * 0.78)) : 130;
    const monH = Math.min(heroCanvasH * (this.monIsBoss ? 1.12 : 1.0), groundY * 0.98);
    this.mon.setPosition(w * 0.74, groundY).setScale(1);
    if (this.monImg?.visible) this.monImg.setDisplaySize(monH, monH);
    else this.mon.setScale(s);
    this.monName.setPosition(w * 0.72, h * 0.12);
    this.banner.setPosition(w / 2, h * 0.32);
    this.timerText.setPosition(8, 6);
  }

  private heroXY() {
    if (this.heroSprite) return { x: this.heroSprite.container.x, y: this.heroSprite.container.y - 40 };
    return { x: this.heroGfx.x, y: this.heroGfx.y };
  }

  private applyBackground(chapter: number) {
    const ch = Math.max(1, Math.min(10, chapter || 1));
    const prefer = CHAPTER_BG[ch]?.key ?? 'bg_ch1';
    const key = this.textures.exists(prefer) ? prefer : (this.textures.exists('bg_ch1') ? 'bg_ch1' : null);
    if (!key) {
      this.bgImg?.setVisible(false);
      return;
    }
    if (!this.bgImg) {
      this.bgImg = this.add.image(0, 0, key).setOrigin(0.5, 0.5).setDepth(0);
    } else {
      this.bgImg.setTexture(key).setVisible(true);
    }
    this.layout();
  }

  private eliteActive = false;
  private previewLevelNo = 1;

  private applyMonsterArt(lv: LevelDef) {
    const levelNo = this.previewLevelNo || (V3_LEVELS.indexOf(lv) + 1);
    const art = pickEnemyArt(lv.monster, lv.chapter ?? 1, levelNo, !!lv.boss, MONSTER_ART[lv.monster], {
      eliteActive: this.eliteActive,
    });
    const fb = MONSTER_ART[lv.monster];
    const key = art && this.textures.exists(art.key) ? art.key : (fb && this.textures.exists(fb.key) ? fb.key : null);
    this.monIsBoss = !!lv.boss;
    if (key) {
      this.monG?.clear();
      this.monG?.setVisible(false);
      if (!this.monImg) {
        this.monImg = this.add.image(0, 0, key).setOrigin(0.5, ENEMY_FOOT_ORIGIN_Y);
        this.mon.add(this.monImg);
      } else {
        this.monImg.setTexture(key).setOrigin(0.5, ENEMY_FOOT_ORIGIN_Y);
      }
      this.monImg.setVisible(true).setFlipX(false);
      this.layout();
    } else {
      this.monImg?.setVisible(false);
      this.monG?.setVisible(true);
      if (this.monG) drawMonster(this.monG, lv.monster, 44);
    }
  }

  setPreview(lv: LevelDef, hp: number, maxHp: number, opts?: { eliteActive?: boolean; levelNo?: number }) {
    if (!this.artReady && !this.monG) return;
    this.eliteActive = !!opts?.eliteActive;
    this.previewLevelNo = opts?.levelNo ?? ((V3_LEVELS.indexOf(lv) + 1) || 1);
    this.level = lv; this.combat = null; this.endTimer = -1;
    this.applyBackground(lv.chapter ?? 1);
    this.applyMonsterArt(lv);
    const baseName = MONSTER_BASE[lv.monster]?.name;
    this.monName.setText(`${lv.boss ? '👑 ' : ''}${lv.title}${baseName && baseName !== lv.title ? `（${baseName}）` : ''}`);
    this.mon.setAlpha(1).setAngle(0);
    this.target = { hp, maxHp, shield: 0, mHp: lv.hp, mMax: lv.hp }; this.shown = { ...this.target };
    this.shieldBubble?.setVisible(false); this.timerText?.setText(''); this.banner?.setAlpha(0);
    this.tweens.killTweensOf(this.mon); this.mon.setScale(this.heroSprite ? 1 : this.heroGfx.scale);
    this.tweens.add({ targets: this.mon, scaleY: (this.mon.scaleX) * 0.94, yoyo: true, repeat: -1, duration: 700, ease: 'Sine.inOut' });
    this.heroSprite?.play('idle', true);
  }

  start(c: CombatState, items: ItemInstance[], hooks: BattleHooks) {
    this.combat = c; this.items = items; this.hooks = hooks; this.endTimer = -1;
    this.heroSprite?.play('idle', true);
  }

  setSpeed(s: number) { this.speed = s; this.tweens.timeScale = s; }

  update(_t: number, dtRaw: number) {
    for (const t of this.torches) t.setRadius(38 + Math.sin(this.time.now / 130 + t.x) * 4);
    const c = this.combat;
    if (c && !this.paused) {
      const dt = Math.min(dtRaw, 100) * this.speed;
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
    const hy = this.heroSprite ? this.heroSprite.container.y + 28 : h * 0.88;
    bar(w * 0.25 - bw / 2, Math.min(h - 18, hy), bw, this.shown.hp / this.shown.maxHp, 0x5fd17a, this.shown.shield / this.shown.maxHp);
    bar(w * 0.72 - bw / 2, h * 0.2, bw, this.shown.mHp / this.shown.mMax, 0xff6b5a);
  }

  private float(x: number, y: number, text: string, color: string, size = 20) {
    const t = this.add.text(x + Phaser.Math.Between(-14, 14), y, text, { fontFamily: 'sans-serif', fontSize: `${size}px`, color, stroke: '#1a1010', strokeThickness: 4, fontStyle: 'bold' }).setOrigin(0.5).setDepth(9);
    this.tweens.add({ targets: t, y: y - 46, alpha: 0, duration: 900, ease: 'Cubic.out', onComplete: () => t.destroy() });
  }

  private render(ev: CombatEvent[], c: CombatState) {
    const { x: hx, y: hy } = this.heroXY();
    const mx = this.mon.x, my = this.mon.y;
    for (const e of ev) {
      if (e.type === 'weapon') {
        this.heroSprite?.play('attack');
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
        const ht = this.heroSprite?.container ?? this.heroGfx;
        this.tweens.add({ targets: ht, x: (this.heroSprite ? this.heroSprite.container.x : this.heroGfx.x) + 10, duration: 70, yoyo: true });
      } else if (e.type === 'shield') {
        this.heroSprite?.play('defend');
        if (e.amount > 0) this.float(hx, hy - 70, `+${e.amount}护盾`, '#8fd8ff', 16);
      } else if (e.type === 'monsterAttack') {
        this.heroSprite?.play('hurt');
        this.tweens.add({ targets: this.mon, x: mx - 40, duration: 110, yoyo: true, ease: 'Quad.out' });
        if (e.absorbed) this.float(hx, hy - 60, `吸收${e.absorbed}`, '#8fd8ff', 16);
        if (e.hpLoss) this.float(hx + 10, hy - 40, `-${e.hpLoss}`, '#ff7a6a', 22);
        const fl = this.add.circle(hx, hy, 46, 0xff4040, 0.3).setDepth(6); this.tweens.add({ targets: fl, alpha: 0, duration: 250, onComplete: () => fl.destroy() });
        if (e.dmg >= 25) this.cameras.main.shake(140, 0.006);
      } else if (e.type === 'potion' || e.type === 'lamp') {
        this.heroSprite?.play('drink');
        this.float(hx, hy - 80, `+${e.heal}`, '#7dff9a', 24);
        const g = this.add.circle(hx, hy, 20, 0x7dff9a, 0.4).setDepth(6); this.tweens.add({ targets: g, scale: 3, alpha: 0, duration: 500, onComplete: () => g.destroy() });
      } else if (e.type === 'enrage') {
        this.showBanner(`🔥 怪物狂暴！伤害×${e.mult.toFixed(2)}`);
        const rg = this.add.circle(0, 0, 70, 0xff3030, 0.22); this.mon.add(rg);
      } else if (e.type === 'tide') {
        this.showBanner(e.phase === 'high' ? `🌊 潮汐高潮 护甲${e.armor}` : `🌊 潮汐回落 护甲${e.armor}`, '#6ab0d0');
      } else if (e.type === 'echo') {
        this.showBanner(`🪞 施法：回响 ${e.dmg}`, '#c8b890');
        this.castRing(0xc8b890, 1.3, 500);
      } else if (e.type === 'overheat') {
        this.showBanner(e.kind === 'strike' ? '🔥 施法：过热重击！' : '💨 过热排空：护甲归零', '#ff9a6b');
        if (e.kind === 'strike') this.slamFx(0xff7a3a); else this.castRing(0xff9a6b, 1.4, 500);
      } else if (e.type === 'pray') {
        this.showBanner(`🙏 施法：祝祷加盾 +${e.shield}`, '#e8e0ff');
        this.castRing(0xd8c8ff, 1.35, 550);
      } else if (e.type === 'addHit') {
        this.showBanner(`先击祝祷者 -${e.dmg}（剩${e.hp}）`, '#d8c8ff');
      } else if (e.type === 'addDown') {
        this.showBanner('祝祷者倒下：不再加盾', '#a8ffb0');
      } else if (e.type === 'heavyWindup') {
        this.showBanner('⚠ 蓄力施法！', '#ffcc66');
        this.castRing(0xffcc44, 1.6, 1600);
      } else if (e.type === 'heavyStrike') {
        this.showBanner(`💥 技能重击 ×${e.mult}`, '#ff8844');
        this.slamFx(0xff6622);
      } else if (e.type === 'phaseShield') {
        this.showBanner(`🛡 施法：阶段护盾 +${e.shield}`, '#88ccff');
        this.castRing(0x66ccff, 1.5, 600);
      } else if (e.type === 'summon') {
        this.showBanner(`🕸 施法：召唤（HP ${e.hp}）`, '#c8a0ff');
        this.castRing(0xaa66ff, 1.7, 700);
      } else if (e.type === 'heartPhase') {
        const names = ['', '重击', '回响', '过热'];
        this.showBanner(`💛 黄金心脏 · 阶段${e.phase}（${names[e.phase] ?? ''}）`, '#ffd45c');
        this.castRing(0xffd45c, 2.0, 900);
        this.cameras.main.shake(200, 0.008);
      } else if (e.type === 'bossHaste') {
        const nm = this.level?.monster === 'salt_captain' ? '盐雾船长' : '首领';
        this.showBanner(`💢 ${nm}暴怒施法：攻速提升！`);
        this.castRing(0xff4040, 1.8, 700);
        this.cameras.main.shake(160, 0.007);
      } else if (e.type === 'regen') {
        this.showBanner(`💚 再生 +${e.amount}`, '#7dff9a');
        this.castRing(0x66dd88, 1.2, 450);
      } else if (e.type === 'end') {
        if (e.won) {
          this.heroSprite?.play('victory', true);
          this.tweens.killTweensOf(this.mon);
          this.tweens.add({ targets: this.mon, alpha: 0, angle: 20, scale: 0.3, duration: 700 });
          this.showBanner('胜利！', '#ffd45c');
        } else {
          this.heroSprite?.play('defeat', true);
          this.showBanner(c.t >= ECONOMY.timeout * 1000 ? '超时……' : '倒下了……', '#ff6b5a');
        }
      }
    }
    this.shieldBubble?.setVisible(c.shield > 0).setAlpha(0.4 + Math.min(0.6, c.shield / c.maxHp));
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

  /** 首领施法圈：蓄力/阶段技通用演出 */
  private castRing(color: number, scale = 1.4, dur = 700) {
    const g = this.add.graphics().setDepth(8);
    g.lineStyle(4, color, 0.95);
    g.strokeCircle(0, 0, 36);
    g.setPosition(this.mon.x, this.mon.y);
    g.setScale(0.4);
    this.tweens.add({ targets: g, scale: scale, alpha: 0, duration: dur, ease: 'Cubic.out', onComplete: () => g.destroy() });
    const core = this.add.circle(this.mon.x, this.mon.y, 10, color, 0.55).setDepth(8);
    this.tweens.add({ targets: core, scale: 2.8, alpha: 0, duration: dur, onComplete: () => core.destroy() });
    this.tweens.add({ targets: this.mon, scaleX: this.mon.scaleX * 1.08, scaleY: this.mon.scaleY * 1.08, duration: Math.min(220, dur / 2), yoyo: true });
  }

  private slamFx(color = 0xff5522) {
    this.castRing(color, 1.8, 420);
    this.cameras.main.shake(180, 0.01);
    const shock = this.add.circle(this.mon.x, this.mon.y + 20, 18, color, 0.35).setDepth(7);
    this.tweens.add({ targets: shock, scale: 4, alpha: 0, duration: 380, onComplete: () => shock.destroy() });
    this.tweens.add({ targets: this.mon, x: this.mon.x - 55, duration: 90, yoyo: true, ease: 'Quad.out' });
  }
}
