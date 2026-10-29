import Phaser from 'phaser';
import { HeroSprite } from '../art/HeroSprite';
import { HERO_CLASSES, HERO_FOOT_ORIGIN, type HeroAnimState, type HeroClassId } from '../art/types';

const STATES: HeroAnimState[] = [
  'idle', 'move', 'attack', 'defend', 'hurt', 'drink', 'special', 'victory', 'defeat',
];
const STATE_ZH: Record<HeroAnimState, string> = {
  idle: '待机', move: '移动', attack: '攻击', defend: '防御', hurt: '受伤',
  drink: '喝药', special: '特色', victory: '胜利', defeat: '战败',
};

/**
 * 调试用动画预览：切换职业/状态，显示脚底线与锚点。
 * 正式游戏不进入此场景（仅 ?debugArt=1 或显式 start）。
 */
export class AnimPreviewScene extends Phaser.Scene {
  private hero!: HeroSprite;
  private cls: HeroClassId = 'merchant';
  private state: HeroAnimState = 'idle';
  private info!: Phaser.GameObjects.Text;
  private footLine!: Phaser.GameObjects.Graphics;

  constructor() { super('animPreview'); }

  preload() {
    for (const c of HERO_CLASSES) {
      HeroSprite.preload(this, c.id);
    }
    this.load.image('bg_ch1', 'art/backgrounds/chapter1_mine.png');
  }

  create() {
    const w = this.scale.width, h = this.scale.height;
    if (this.textures.exists('bg_ch1')) {
      const bg = this.add.image(w / 2, h / 2, 'bg_ch1').setDepth(0);
      bg.setDisplaySize(w, h);
    } else {
      this.add.rectangle(w / 2, h / 2, w, h, 0x1a2438);
    }
    this.footLine = this.add.graphics().setDepth(5);
    this.hero = new HeroSprite(this, this.cls, w * 0.5, h * 0.78);
    this.hero.setDisplaySize(Math.min(360, h * 0.7));
    this.info = this.add.text(12, 12, '', {
      fontFamily: 'sans-serif', fontSize: '14px', color: '#ffe9a8',
      backgroundColor: '#000000aa', padding: { x: 8, y: 6 },
    }).setDepth(20);
    this.drawGuides();
    this.refreshLabel();
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => this.onKey(e));
    // on-screen buttons for mobile
    this.makeBtn(12, h - 44, '←职业', () => this.cycleClass(-1));
    this.makeBtn(100, h - 44, '职业→', () => this.cycleClass(1));
    this.makeBtn(200, h - 44, '←动作', () => this.cycleState(-1));
    this.makeBtn(290, h - 44, '动作→', () => this.cycleState(1));
    this.makeBtn(w - 100, 12, '关闭', () => {
      this.scene.stop();
      this.game.events.emit('artPreviewClosed');
    });
    this.scale.on('resize', () => this.layout());
  }

  private makeBtn(x: number, y: number, label: string, fn: () => void) {
    const t = this.add.text(x, y, label, {
      fontFamily: 'sans-serif', fontSize: '16px', color: '#1a1010',
      backgroundColor: '#e8b64c', padding: { x: 10, y: 8 },
    }).setDepth(20).setInteractive({ useHandCursor: true });
    t.on('pointerup', fn);
  }

  private onKey(e: KeyboardEvent) {
    if (e.key === 'ArrowLeft') this.cycleClass(-1);
    if (e.key === 'ArrowRight') this.cycleClass(1);
    if (e.key === 'ArrowUp') this.cycleState(-1);
    if (e.key === 'ArrowDown') this.cycleState(1);
    if (e.key === 'Escape') { this.scene.stop(); this.game.events.emit('artPreviewClosed'); }
  }

  private cycleClass(dir: number) {
    const ids = HERO_CLASSES.map(c => c.id);
    const i = (ids.indexOf(this.cls) + dir + ids.length) % ids.length;
    this.cls = ids[i]!;
    const w = this.scale.width, h = this.scale.height;
    this.hero.destroy();
    this.hero = new HeroSprite(this, this.cls, w * 0.5, h * 0.78);
    this.hero.setDisplaySize(Math.min(360, h * 0.7));
    this.hero.play(this.state, true);
    this.refreshLabel();
  }

  private cycleState(dir: number) {
    const i = (STATES.indexOf(this.state) + dir + STATES.length) % STATES.length;
    this.state = STATES[i]!;
    this.hero.play(this.state, true);
    this.refreshLabel();
  }

  private refreshLabel() {
    const meta = HERO_CLASSES.find(c => c.id === this.cls)!;
    this.info.setText([
      '【美术调试 · Animation Preview】',
      `职业: ${meta.name} (${this.cls})  特色: ${meta.special}`,
      `状态: ${STATE_ZH[this.state]} (${this.state})  · ${(() => {
        const byClass: Record<string, Partial<Record<string, string>>> = {
          merchant: {
            idle: 'idle 4帧循环', move: 'move 8帧循环', attack: 'attack 6帧',
            defend: 'defend 4帧', hurt: 'hurt 3帧', drink: 'drink 6帧', special: 'special 6帧',
            victory: 'victory 6帧 HOLD末', defeat: 'defeat 6帧 HOLD末',
          },
          guard: { idle: 'idle 4帧循环', move: 'move 8帧循环', attack: 'attack 6帧', defend: 'defend 4帧', hurt: 'hurt 3帧', drink: 'drink 6帧', special: 'special 6帧', victory: 'victory 6帧 HOLD末', defeat: 'defeat 6帧 HOLD末' },
          ranger: { idle: 'idle 4帧循环', move: 'move 8帧循环', attack: 'attack 6帧', defend: 'defend 4帧', hurt: 'hurt 3帧', drink: 'drink 6帧', special: 'special 6帧', victory: 'victory 6帧 HOLD末', defeat: 'defeat 6帧 HOLD末' },
        };
        return byClass[this.cls]?.[this.state] ?? '单帧 HOLD';
      })()}`,
      `脚底锚点 origin=(${HERO_FOOT_ORIGIN.x}, ${HERO_FOOT_ORIGIN.y.toFixed(4)})  master=(512,928)`,
      '←→ 切换职业  ↑↓ 切换状态  Esc 关闭',
      '诚实说明: 商旅全周期已齐；守卫全周期已齐；游侠全周期已齐。',
    ].join('\n'));
  }

  private layout() {
    const w = this.scale.width, h = this.scale.height;
    this.hero.container.setPosition(w * 0.5, h * 0.78);
    this.hero.setDisplaySize(Math.min(360, h * 0.7));
    this.drawGuides();
  }

  private drawGuides() {
    const g = this.footLine; g.clear();
    const w = this.scale.width, h = this.scale.height;
    const groundY = h * 0.78;
    g.lineStyle(2, 0xff6b5a, 0.85);
    g.lineBetween(0, groundY, w, groundY);
    g.fillStyle(0x7dff9a, 1);
    g.fillCircle(w * 0.5, groundY, 5);
    g.lineStyle(1, 0x7dff9a, 0.5);
    g.lineBetween(w * 0.5, 0, w * 0.5, h);
  }
}
