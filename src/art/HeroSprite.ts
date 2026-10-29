import Phaser from 'phaser';
import { heroArtEntries } from './artLoad';
import {
  HERO_ANIM_HOLD_MS, HERO_ANIM_PRIORITY, HERO_FOOT_ORIGIN,
  type HeroAnimState, type HeroClassId,
} from './types';

const STATES: HeroAnimState[] = [
  'idle', 'move', 'attack', 'defend', 'hurt', 'drink', 'special', 'victory', 'defeat',
];

/** 多帧纹理键；仅 1 帧则 HOLD。 */
const MULTI: Partial<Record<HeroClassId, Partial<Record<HeroAnimState, string[]>>>> = {
  merchant: {
    idle: [
      'hero_merchant_idle_f01', 'hero_merchant_idle_f02', 'hero_merchant_idle_f03', 'hero_merchant_idle_f04',
    ],
    move: [
      'hero_merchant_move_f01', 'hero_merchant_move_f02', 'hero_merchant_move_f03', 'hero_merchant_move_f04',
      'hero_merchant_move_f05', 'hero_merchant_move_f06', 'hero_merchant_move_f07', 'hero_merchant_move_f08',
    ],
    attack: [
      'hero_merchant_attack_f01', 'hero_merchant_attack_f02', 'hero_merchant_attack_f03',
      'hero_merchant_attack_f04', 'hero_merchant_attack_f05', 'hero_merchant_attack_f06',
    ],
    defend: [
      'hero_merchant_defend_f01', 'hero_merchant_defend_f02', 'hero_merchant_defend_f03', 'hero_merchant_defend_f04',
    ],
    hurt: [
      'hero_merchant_hurt_f01', 'hero_merchant_hurt_f02', 'hero_merchant_hurt_f03',
    ],
    drink: [
      'hero_merchant_drink_f01', 'hero_merchant_drink_f02', 'hero_merchant_drink_f03',
      'hero_merchant_drink_f04', 'hero_merchant_drink_f05', 'hero_merchant_drink_f06',
    ],
    special: [
      'hero_merchant_special_f01', 'hero_merchant_special_f02', 'hero_merchant_special_f03',
      'hero_merchant_special_f04', 'hero_merchant_special_f05', 'hero_merchant_special_f06',
    ],
    victory: [
      'hero_merchant_victory_f01', 'hero_merchant_victory_f02', 'hero_merchant_victory_f03',
      'hero_merchant_victory_f04', 'hero_merchant_victory_f05', 'hero_merchant_victory_f06',
    ],
    defeat: [
      'hero_merchant_defeat_f01', 'hero_merchant_defeat_f02', 'hero_merchant_defeat_f03',
      'hero_merchant_defeat_f04', 'hero_merchant_defeat_f05', 'hero_merchant_defeat_f06',
    ],
  },
  guard: {
    idle: [
      'hero_guard_idle_f01', 'hero_guard_idle_f02', 'hero_guard_idle_f03', 'hero_guard_idle_f04',
    ],
    move: [
      'hero_guard_move_f01', 'hero_guard_move_f02', 'hero_guard_move_f03', 'hero_guard_move_f04',
      'hero_guard_move_f05', 'hero_guard_move_f06', 'hero_guard_move_f07', 'hero_guard_move_f08',
    ],
    attack: [
      'hero_guard_attack_f01', 'hero_guard_attack_f02', 'hero_guard_attack_f03',
      'hero_guard_attack_f04', 'hero_guard_attack_f05', 'hero_guard_attack_f06',
    ],
    defend: [
      'hero_guard_defend_f01', 'hero_guard_defend_f02', 'hero_guard_defend_f03', 'hero_guard_defend_f04',
    ],
    hurt: [
      'hero_guard_hurt_f01', 'hero_guard_hurt_f02', 'hero_guard_hurt_f03',
    ],
    drink: [
      'hero_guard_drink_f01', 'hero_guard_drink_f02', 'hero_guard_drink_f03',
      'hero_guard_drink_f04', 'hero_guard_drink_f05', 'hero_guard_drink_f06',
    ],
    special: [
      'hero_guard_special_f01', 'hero_guard_special_f02', 'hero_guard_special_f03',
      'hero_guard_special_f04', 'hero_guard_special_f05', 'hero_guard_special_f06',
    ],
    victory: [
      'hero_guard_victory_f01', 'hero_guard_victory_f02', 'hero_guard_victory_f03',
      'hero_guard_victory_f04', 'hero_guard_victory_f05', 'hero_guard_victory_f06',
    ],
    defeat: [
      'hero_guard_defeat_f01', 'hero_guard_defeat_f02', 'hero_guard_defeat_f03',
      'hero_guard_defeat_f04', 'hero_guard_defeat_f05', 'hero_guard_defeat_f06',
    ],
  },
  ranger: {
    idle: [
      'hero_ranger_idle_f01', 'hero_ranger_idle_f02', 'hero_ranger_idle_f03', 'hero_ranger_idle_f04',
    ],
    move: [
      'hero_ranger_move_f01', 'hero_ranger_move_f02', 'hero_ranger_move_f03', 'hero_ranger_move_f04',
      'hero_ranger_move_f05', 'hero_ranger_move_f06', 'hero_ranger_move_f07', 'hero_ranger_move_f08',
    ],
    attack: [
      'hero_ranger_attack_f01', 'hero_ranger_attack_f02', 'hero_ranger_attack_f03',
      'hero_ranger_attack_f04', 'hero_ranger_attack_f05', 'hero_ranger_attack_f06',
    ],
    defend: [
      'hero_ranger_defend_f01', 'hero_ranger_defend_f02', 'hero_ranger_defend_f03', 'hero_ranger_defend_f04',
    ],
    hurt: [
      'hero_ranger_hurt_f01', 'hero_ranger_hurt_f02', 'hero_ranger_hurt_f03',
    ],
    drink: [
      'hero_ranger_drink_f01', 'hero_ranger_drink_f02', 'hero_ranger_drink_f03',
      'hero_ranger_drink_f04', 'hero_ranger_drink_f05', 'hero_ranger_drink_f06',
    ],
    special: [
      'hero_ranger_special_f01', 'hero_ranger_special_f02', 'hero_ranger_special_f03',
      'hero_ranger_special_f04', 'hero_ranger_special_f05', 'hero_ranger_special_f06',
    ],
    victory: [
      'hero_ranger_victory_f01', 'hero_ranger_victory_f02', 'hero_ranger_victory_f03',
      'hero_ranger_victory_f04', 'hero_ranger_victory_f05', 'hero_ranger_victory_f06',
    ],
    defeat: [
      'hero_ranger_defeat_f01', 'hero_ranger_defeat_f02', 'hero_ranger_defeat_f03',
      'hero_ranger_defeat_f04', 'hero_ranger_defeat_f05', 'hero_ranger_defeat_f06',
    ],
  },
};

function frameKey(cls: HeroClassId, state: HeroAnimState) {
  return `hero_${cls}_${state}`;
}

function framesFor(cls: HeroClassId, state: HeroAnimState): string[] {
  const m = MULTI[cls]?.[state];
  if (m?.length) return m;
  return [frameKey(cls, state)];
}

export class HeroSprite {
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Ellipse;
  private scene: Phaser.Scene;
  private cls: HeroClassId;
  private state: HeroAnimState = 'idle';
  private lockUntil = 0;
  private breath?: Phaser.Tweens.Tween;
  private frameTimer?: Phaser.Time.TimerEvent;
  private frameIdx = 0;

  constructor(scene: Phaser.Scene, cls: HeroClassId, x: number, y: number) {
    this.scene = scene;
    this.cls = cls;
    this.container = scene.add.container(x, y).setDepth(12);
    this.shadow = scene.add.ellipse(0, 4, 78, 20, 0x000000, 0.4);
    const keys = framesFor(cls, 'idle');
    const key = keys.find(k => scene.textures.exists(k)) || frameKey(cls, 'idle');
    this.sprite = scene.add.image(0, 0, key);
    this.sprite.setOrigin(HERO_FOOT_ORIGIN.x, HERO_FOOT_ORIGIN.y);
    this.container.add([this.shadow, this.sprite]);
    this.play('idle', true);
  }

  /** Queue frames onto the scene loader. Pass states to avoid loading the whole class. */
  static preload(scene: Phaser.Scene, cls: HeroClassId, states: readonly HeroAnimState[] = STATES) {
    for (const e of heroArtEntries(cls, states)) {
      if (!scene.textures.exists(e.key)) scene.load.image(e.key, e.url);
    }
  }

  setClass(cls: HeroClassId) {
    if (cls === this.cls) return;
    this.cls = cls;
    this.play(this.state, true);
  }

  getState() { return this.state; }
  getClass() { return this.cls; }

  play(next: HeroAnimState, force = false) {
    const now = this.scene.time.now;
    const keysExisting = () => framesFor(this.cls, next).filter(k => this.scene.textures.exists(k));
    if (!force) {
      if (now < this.lockUntil && HERO_ANIM_PRIORITY[next] < HERO_ANIM_PRIORITY[this.state]) return;
      if (next === this.state && HERO_ANIM_HOLD_MS[next] === 0 && keysExisting().length <= 1) return;
    }
    this.state = next;
    this.frameIdx = 0;
    this.frameTimer?.remove(false);
    this.showFrame(0);
    const keys = keysExisting();
    const hold = HERO_ANIM_HOLD_MS[next];
    this.lockUntil = hold > 0 ? now + hold : 0;
    this.breath?.stop();
    this.sprite.setScale(1);

    if (keys.length > 1) {
      const loop = next === 'idle' || next === 'move';
      const ms = next === 'move' ? 100 : next === 'idle' ? 200 : 110;
      this.frameTimer = this.scene.time.addEvent({
        delay: ms, loop: true,
        callback: () => {
          this.frameIdx++;
          if (this.frameIdx >= keys.length) {
            if (loop) this.frameIdx = 0;
            else {
              this.frameTimer?.remove(false);
              if (next !== 'victory' && next !== 'defeat') this.play('idle', true);
              return;
            }
          }
          this.showFrame(this.frameIdx);
        },
      });
    } else {
      if (next === 'idle' || next === 'move') {
        this.breath = this.scene.tweens.add({
          targets: this.sprite, scaleY: 1.025, scaleX: 0.985, yoyo: true, repeat: -1,
          duration: next === 'move' ? 260 : 900, ease: 'Sine.inOut',
        });
      } else if (next === 'attack' || next === 'special') {
        this.scene.tweens.add({ targets: this.sprite, scaleX: 1.06, scaleY: 0.96, duration: 80, yoyo: true });
      } else if (next === 'hurt') {
        this.scene.tweens.add({ targets: this.sprite, x: 8, duration: 50, yoyo: true, repeat: 1 });
      }
      if (hold > 0 && next !== 'victory' && next !== 'defeat') {
        this.scene.time.delayedCall(hold, () => {
          if (this.state === next) this.play('idle', true);
        });
      }
    }
  }

  private showFrame(i: number) {
    const keys = framesFor(this.cls, this.state).filter(k => this.scene.textures.exists(k));
    if (!keys.length) {
      const fb = frameKey(this.cls, this.state);
      if (this.scene.textures.exists(fb)) this.sprite.setTexture(fb);
    } else {
      this.sprite.setTexture(keys[i % keys.length]!);
    }
    this.sprite.setOrigin(HERO_FOOT_ORIGIN.x, HERO_FOOT_ORIGIN.y);
  }

  setDisplaySize(h: number) {
    this.container.setScale(h / 512);
  }

  destroy() {
    this.breath?.stop();
    this.frameTimer?.remove(false);
    this.container.destroy(true);
  }
}

export function ensureHeroAnims(_scene: Phaser.Scene, _cls: HeroClassId) {
  void STATES;
}
