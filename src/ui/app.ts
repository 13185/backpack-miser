import { npcPortraitHtml } from '../art/npcArt';
import { webAsset } from '../art/webAsset';
import { V2_CLASSES } from '../config/v2/classes';
import Phaser from 'phaser';
import { BALANCE_VERSION, ECONOMY, FORGE_SAFE_COST, winHealAmount } from '../config/economy';
import { LV4_GAMBLE, LV5_GAMBLE, gamblePct, type GambleOdds } from '../config/gamble';
import { ITEMS } from '../config/items';
import { MONSTER_BASE } from '../config/monsters';
import { EVENTS as EVENTS_MAP } from '../config/v3/events';
import { CAMPAIGN_LENGTH, getLevel, isBossLevel, isMidAct, applyEliteOverlay, V3_CHAPTERS, RUNES, DOCTRINES, ENDING_CHOICES, ENDING_IDS, CHAPTER_INTROS, MID_ACT_STORY, resolveStoryText, LEVEL_LINES, runeLegalForItem, V3_RELICS, type RuneId, type EndingId, type RelicId } from '../config/v3';
import type { GameState, ItemInstance, ItemKind, Level, Settings } from '../models/types';
import { gemBonus, weaponDamage, weaponsBoostedBy } from '../systems/adjacency';
import type { CombatEvent, CombatState } from '../systems/combat';
import { armorResist, isArmorKind } from '../config/v4/armor';
import { ELEMENT_NAME, ELEMENTS, type Element as GearElement } from '../config/v4/elements';
import { buyPrice, expansionLabel, expansionOffer, refreshCost, sellPrice } from '../systems/economy';
import { slotBlurb, slotCost } from '../systems/slot';
import { bossSkillLine } from '../config/v4/bosses';
import { chapterBossElement, ensureGearTrials, gearTrialLevel } from '../systems/gearTrial';
import { activateGuard } from '../systems/combat';
import { Game, RESERVE_CAP, applyBossPrep, endingAvailability, itemLabel, newGameState, type Result } from '../systems/game';
import { QUEST_CHOICES, evidenceOf, type ChoiceId } from '../config/v3/quests';
import { canMerge, mergeTargetIds } from '../systems/merge';
import { canPlace, findSpot, inBag, itemAt, itemPlace, itemSize, occupiedCells } from '../systems/placement';
import { clearSave, loadGame, loadSettings, saveGame, saveSettings } from '../systems/save';
import { BattleScene } from '../scenes/BattleScene';
import { AnimPreviewScene } from '../scenes/AnimPreviewScene';
import { isV2Enabled } from '../config/v2';
import type { HeroClassId } from '../art/types';
import { maybeShout, monsterCue, resetShouts, setSound, sfx, unlockAudio } from './audio';
import { duckBgm, prefetchBgm, setBgm, setMusicEnabled, startBgmIfUnlocked } from './bgm';
import { voiceBase } from './audioCatalog';
import { resolveStart, restartTarget, shouldReplayOpening } from './classRun';
import { playVoice, prefetchClassVoice, prefetchVoice, setVoiceEnabled, setVoiceVolume, stopVoice } from './voice';
import { bossCinema, isBossStory, openingBeats } from './cinema';
import { bagCellSize } from './bagLayout';
import { iconSvg } from './icons';

const $ = (id: string) => document.getElementById(id)!;
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

type DragFrom = 'bag' | 'temp' | 'reserve' | 'legacy' | 'slot';
type DragDrop =
  | { type: 'place'; x: number; y: number; ok: boolean; unequip?: boolean }
  | { type: 'merge'; targetId: string; ok: boolean; gamble?: boolean; reason?: string }
  | { type: 'temp' }
  | { type: 'wear'; slot: 'hand' | 'armor'; ok: boolean; reason?: string; land?: { x: number; y: number } | null }
  | { type: 'reserve'; ok: boolean; reason?: string };
interface DragState {
  id: string; startX: number; startY: number; active: boolean; rotated: boolean;
  grabDx: number; grabDy: number; ghost: HTMLElement | null; from: DragFrom;
  drop: DragDrop | null;
  pointerType: string;
  t0: number;
  /** pending：还没决定。drag：这次手势归装备。scroll：交给页面滚动。 */
  claim: 'pending' | 'drag' | 'scroll';
}
const TUTORIAL = [
  { sel: '#bag', text: '① 装备必须放进<b>背包</b>才会生效，待整理的装备不参与战斗。' },
  { sel: '#bag', text: '② 把一件装备拖到<b>相同种类、相同等级</b>的装备上，即可合成升级，还能腾出空间。' },
  { sel: '#bag', text: '③ <b>红宝石</b>放在武器的上下左右（对角无效），可以强化武器伤害。' },
  { sel: '#bag', text: '④ <b>钱袋</b>胜利后额外给金币，但会占据宝贵的战斗格子。' },
  { sel: '#startBtn', text: '⑤ 整理好后，点击<b>开始战斗</b>，装备会自动出手！' },
];
const WEAR_TUTORIAL = [
  { sel: '#handSlot', text: '把武器拖进<b>主手</b>，把衬甲拖进<b>护甲</b>。穿上后离开背包，格子会腾出来。' },
  { sel: '#tempWrap', text: '<b>待整理</b>紧挨背包。备用箱只有两件，放进去就不攻击、不加抗性。' },
  { sel: '#sheetNav', text: '上面是<b>背包</b>和<b>寻找套装</b>。商店就在装备详情下面，不用切页。' },
];
const TRIAL_NAME: Record<'guard' | 'counter' | 'special', string> = {
  guard: '防护委托', counter: '克制委托', special: '专项委托',
};
const elName = (e: string | null | undefined) => (e && e in ELEMENT_NAME ? ELEMENT_NAME[e as GearElement] : '无属性');
function noticeRepeats(ability: string, mech: string): boolean {
  const a = ability.replace(/\s/g, '');
  const m = mech.replace(/\s/g, '');
  if (!m) return true;
  if (a.includes(m) || m.includes(a)) return true;
  if (m.length > 10 && a.includes(m.slice(0, 12))) return true;
  const head = (s: string) => s.split('：')[0];
  return head(a).length >= 2 && head(a) === head(m);
}

export class App {
  game: Game | null = null;
  settings: Settings;
  scene!: BattleScene;
  selected: string | null = null;
  drag: DragState | null = null;
  private holdTimer = 0;
  sellConfirm: { id: string; until: number } | null = null;
  speed = 1;
  heroClass: HeroClassId = 'merchant';
  /** 刷新后第一次打开标题时，用存档职业点亮卡片；之后以玩家点的为准。 */
  private titleClassSeeded = false;
  ironman = false;
  tutStep = -1;
  wearStep = -1;
  sheet: 'bag' | 'trial' = 'bag';
  /** 手机上商店默认折叠，点开后刷新商店仍保持。 */
  shopOpen = false;
  sub: 'plan' | 'report' | null = null;
  busy = false; // 防止快速连点
  cell = 60;
  /** 最近一次摇奖结果，刷新商店面板时还留在机器上。 */
  slotMsg = '';
  private phaser!: Phaser.Game;

  constructor() {
    this.settings = loadSettings(localStorage);
    setSound(this.settings.sound);
    setMusicEnabled(this.settings.sound);
    setVoiceEnabled(this.settings.sound);
    setVoiceVolume(this.settings.voice / 100);
    document.addEventListener('pointerdown', () => {
      unlockAudio();
      window.setTimeout(() => startBgmIfUnlocked(), 0);
    }, { capture: true });
    // 标题不等 Phaser、不等素材。静态 #boot 在 JS 到达前盖住空骨架。
    this.showTitle();
    this.phaser = new Phaser.Game({
      type: Phaser.AUTO, parent: 'battle', backgroundColor: '#15101e', transparent: false,
      scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' }, scene: [BattleScene, AnimPreviewScene],
      render: { antialias: true }, banner: false, audio: { noAudio: true },
      input: { touch: { capture: false } },
    });
    const bootUi = () => {
      this.scene = this.phaser.scene.getScene('battle') as BattleScene;
      if (!this.scene || !(this.scene as any).artReady) return;
      this.scene.setHeroClass(this.heroClass);
      try {
        if (new URLSearchParams(location.search).get('debugArt') === '1') {
          this.phaser.scene.start('animPreview');
          this.phaser.events.once('artPreviewClosed', () => {
            this.phaser.scene.start('battle');
            this.phaser.events.once('battle-ui-ready', () => bootUi());
          });
          return;
        }
      } catch { /* ignore */ }
      (window as unknown as { __bmArt?: () => string[] }).__bmArt = () => this.scene.textures.getTextureKeys();
      this.showTitle();
    };
    this.phaser.events.on('battle-ui-ready', () => bootUi());
    // 切到后台暂停统一时钟
    document.addEventListener('visibilitychange', () => { if (this.scene) this.scene.paused = document.hidden; });
    window.addEventListener('keydown', e => {
      if (e.key === 'r' || e.key === 'R') { if (this.drag?.active) { this.rotateDrag(); } else if (this.selected) this.act(() => this.game!.rotate(this.selected!)); }
      if (e.key === 'Escape') this.cancelDrag();
    });
    window.addEventListener('resize', () => this.render());
    window.addEventListener('pointermove', e => this.onMove(e), { passive: false });
    window.addEventListener('touchmove', e => {
      if (this.drag?.claim === 'drag' && e.cancelable) e.preventDefault();
    }, { passive: false });
    window.addEventListener('pointerup', e => this.onUp(e));
    window.addEventListener('pointercancel', () => this.cancelDrag());
    window.addEventListener('blur', () => this.cancelDrag());
    document.querySelectorAll<HTMLButtonElement>('#sheetNav [data-sheet]').forEach(b => {
      b.onclick = () => { this.sheet = b.dataset.sheet as 'bag' | 'trial'; this.render(); };
    });
    document.querySelectorAll<HTMLButtonElement>('.subNav [data-sub]').forEach(b => {
      b.onclick = () => {
        const next = b.dataset.sub as 'plan' | 'report';
        this.sub = this.sub === next ? null : next;
        this.render();
      };
    });
  }
  // ---------- 存档 ----------
  private persist = (s: GameState) => {
    if (!this.game || this.game.s !== s) return;
    saveGame(localStorage, s);
  };
  private saveSettings() {
    saveSettings(localStorage, this.settings);
    setSound(this.settings.sound);
    setMusicEnabled(this.settings.sound);
    setVoiceEnabled(this.settings.sound);
    setVoiceVolume(this.settings.voice / 100);
  }
  private cinemaOn = false;
  private battleFlip = false;

  // ---------- 标题界面 ----------
  showTitle(message?: string) {
    const lr = loadGame(localStorage);
    if (!this.titleClassSeeded) {
      this.titleClassSeeded = true;
      if (lr.status === 'ok') this.heroClass = lr.state.heroClass;
    }
    const canContinue = lr.status === 'ok' && lr.state.phase !== 'victory' && lr.state.phase !== 'defeat';
    const savedName = lr.status === 'ok' ? (V2_CLASSES.find(c => c.id === lr.state.heroClass)?.name ?? '') : '';
    const pickedName = V2_CLASSES.find(c => c.id === this.heroClass)?.name ?? '';
    const corrupt = lr.status === 'corrupt' ? lr.message : '';
    const ov = $('overlay');
    ov.className = 'show title';
    ov.innerHTML = `<div class="titleCard">
      <div class="logo">${iconSvg('moneybag')}<h1>背包守财奴</h1>${iconSvg('greatsword')}</div>
      <p class="sub">整理背包 · 合成装备 · 自动战斗 · <b>故事战役</b></p>
      ${message ? `<p class="warn">${esc(message)}</p>` : ''}
      ${corrupt ? `<p class="warn">⚠ ${esc(corrupt)}请开始新的冒险。</p>` : ''}
      <div class="classPick" id="classPick">
        ${V2_CLASSES.map(c => {
          const on = this.heroClass === c.id;
          const frames: string[] = [];
          for (let i = 1; i <= 4; i++) frames.push(webAsset(`art/characters/${c.id}/${c.id}_idle_f${String(i).padStart(2, '0')}_512.png`));
          for (let i = 1; i <= 6; i++) frames.push(webAsset(`art/characters/${c.id}/${c.id}_attack_f${String(i).padStart(2, '0')}_512.png`));
          const reel = frames.map((src, n) => `<img class="${n < 4 ? 'idleF' : 'atkF'}" src="${src}" alt="" draggable="false">`).join('');
          return `<button type="button" class="classCard ${on ? 'on' : ''}" data-class="${c.id}">
            <span class="figReel" aria-hidden="true">${reel}</span>
            <b class="nm">${c.name}</b>
            <span class="blurb">${c.blurb[0]}<br>${c.blurb[1]}</span>
          </button>`;
        }).join('')}
      </div>
      <label class="toggle" style="justify-content:center"><input type="checkbox" id="tIron" ${this.ironman ? 'checked' : ''}/> 单命远征（战败即结束，无回档/援助）</label>
      ${canContinue ? `<p class="muted">继续沿用存档里的<b>${esc(savedName)}</b>。点下面的职业再开始，是丢掉这份存档的新冒险。</p>` : ''}
      <div class="btns">
        ${canContinue ? `<button class="btn gold big" id="tContinue">继续${esc(savedName)} · 第${(lr as any).state.level}关</button>` : ''}
        <button class="btn ${canContinue ? '' : 'gold'} big" id="tNew">以${esc(pickedName)}开始新冒险</button>
        <button class="btn" id="tArt" title="仅调试">美术预览</button>
      </div>
      <ul class="howto">
        <li>🎒 把装备拖进背包格子，<b>放进背包才生效</b>；手机点「旋转」，电脑按 R 键旋转。</li>
        <li>✨ 同种同级装备拖到一起即可<b>合成升级</b>。待整理的也可以直接拖到背包里那一件上。</li>
        <li>💎 红宝石强化<b>上下左右</b>相邻的武器。</li>
        <li>⚔ 开战后装备自动攻击，征战50关、10个章节，第20关只是中段折转，第50关才是终点！</li>
        <li>🎲 两件相同的 <b>Lv3</b> 可以赌合成：${gamblePct(LV4_GAMBLE.success)}% 得到 Lv4，${gamblePct(LV4_GAMBLE.loseOne)}% 只消失拖过去的那一件。</li>
        <li>👑 两件相同的 <b>Lv4</b> 可以再赌：${gamblePct(LV5_GAMBLE.success)}% 得到 Lv5，${gamblePct(LV5_GAMBLE.loseOne)}% 只丢一件，${gamblePct(LV5_GAMBLE.loseBoth)}% 两件都消失。结果立刻存档。</li>
      </ul>
      <label class="toggle"><input type="checkbox" id="tSound" ${this.settings.sound ? 'checked' : ''}/> 音效</label>
      <label class="voiceSlide">语音 <input type="range" id="tVoice" min="0" max="100" value="${this.settings.voice}"></label>
    </div>`;
    $('tNew').onclick = () => {
      if (canContinue && !confirm('开始新冒险将覆盖当前存档，确定吗？')) return;
      this.heroClass = resolveStart('new', lr.status === 'ok' ? lr.state : null, this.heroClass) as HeroClassId;
      sfx.click(); this.newGame();
    };
    if (canContinue) $('tContinue').onclick = () => {
      this.heroClass = resolveStart('continue', lr.state, this.heroClass) as HeroClassId;
      this.scene?.setHeroClass(this.heroClass);
      stopVoice();
      sfx.click();
      this.loadState(lr.state);
    };
    ($('tIron') as HTMLInputElement).onchange = e => { this.ironman = (e.target as HTMLInputElement).checked; };
    ($('tSound') as HTMLInputElement).onchange = e => { this.settings.sound = (e.target as HTMLInputElement).checked; this.saveSettings(); };
    ($('tVoice') as HTMLInputElement).oninput = e => {
      this.settings.voice = Number((e.target as HTMLInputElement).value);
      setVoiceVolume(this.settings.voice / 100);
      this.saveSettings();
    };
    document.querySelectorAll('#classPick [data-class]').forEach(btn => {
      (btn as HTMLElement).onclick = () => {
        this.heroClass = (btn as HTMLElement).dataset.class as HeroClassId;
        if (this.scene?.artReady) this.scene.setHeroClass(this.heroClass);
        stopVoice();
        sfx.click(); this.showTitle();
      };
    });
    const artBtn = $('tArt');
    if (artBtn) artBtn.onclick = () => {
      sfx.click();
      this.closeOverlay();
      this.phaser.scene.stop('battle');
      this.phaser.scene.start('animPreview');
      this.phaser.events.once('artPreviewClosed', () => {
        this.phaser.scene.start('battle');
        this.phaser.events.once('battle-ui-ready', () => {
          this.scene = this.phaser.scene.getScene('battle') as BattleScene;
          this.scene.setHeroClass(this.heroClass);
          this.showTitle();
        });
      });
    };
    const sub = ov.querySelector('.sub');
    if (sub) sub.innerHTML = `V3 战役 · ${CAMPAIGN_LENGTH}关 / 10章 · <b style="color:#ff8866">故事战役</b> · 第50关终局`;
    void isV2Enabled;
    document.getElementById('boot')?.setAttribute('hidden', '');
    if (this.scene?.artReady) this.scene.setPreview(getLevel(1), 100, 100, { eliteActive: false, levelNo: 1 });
    setBgm('title');
  }
  newGame() {
    this.silenceRun();
    this.game = null;
    clearSave(localStorage);
    const st = newGameState((Date.now() ^ (Math.random() * 1e9)) >>> 0, { heroClass: this.heroClass, mode: this.ironman ? 'ironman' : 'story' });
    if (!st.seenDialogue.includes('ch1_intro')) st.pendingStoryId = 'ch1_intro';
    saveGame(localStorage, st);
    this.scene?.setHeroClass(this.heroClass);
    prefetchClassVoice(this.heroClass);
    this.tutStep = this.settings.tutorialDone ? -1 : 0;
    const start = () => this.loadState(st);
    const hero = this.heroClass;
    if (shouldReplayOpening(this.settings, hero)) {
      this.playOpening(hero, () => {
        this.settings.openingSeen = true;
        this.settings.openingFor = hero;
        this.saveSettings();
        start();
      });
    } else start();
  }
  loadState(st: GameState) {
    applyBossPrep(st);
    this.heroClass = st.heroClass;
    this.scene?.setHeroClass(st.heroClass);
    prefetchClassVoice(st.heroClass);
    this.game = new Game(st, this.persist);
    this.selected = null; this.closeOverlay();
    this.scene.setPreview(st.eliteActive ? applyEliteOverlay(getLevel(st.level), st.level) : getLevel(st.level), st.hp, st.maxHp, { eliteActive: !!st.eliteActive, levelNo: st.level });
    if (st.phase === 'battle') {
      this.toast('检测到战斗中断，已恢复到开战前，重新进行本场战斗。');
      this.render(); this.runBattle();
    } else {
      this.render();
      if (st.phase === 'camp') this.showCamp();
      else if (isBossStory(st.pendingStoryId) && (st.phase === 'loot' || st.phase === 'victory')) this.playBossCinema(() => this.finishBossStory());
      else this.showPendingModals();
    }
  }
  closeOverlay() { const o = $('overlay'); o.className = ''; o.innerHTML = ''; }

  // ---------- 通用 ----------
  toast(msg: string, bad = false) {
    const t = $('toast'); const d = document.createElement('div');
    d.className = 'toastItem' + (bad ? ' bad' : ''); d.textContent = msg; t.appendChild(d);
    while (t.children.length > 2) t.firstElementChild!.remove();
    setTimeout(() => d.remove(), 1800);
  }
  act(fn: () => Result, okSfx: () => void = sfx.click): boolean {
    const r = fn();
    if (!r.ok) { sfx.error(); this.toast(r.msg, true); } else { okSfx(); if (r.msg) this.toast(r.msg); }
    this.render(); return r.ok;
  }
  /** 防连点：按钮操作后短暂锁定 */
  guard(fn: () => void) { if (this.busy) return; this.busy = true; try { fn(); } finally { setTimeout(() => (this.busy = false), 180); } }

  // ---------- 渲染 ----------
  render() {
    const g = this.game; if (!g) return;
    const s = g.s;
    const wide = window.innerWidth >= 960;
    document.body.classList.toggle('wide', wide);
    this.cell = bagCellSize(window.innerWidth, s.cols, wide);
    document.documentElement.style.setProperty('--cell', this.cell + 'px');
    const battle = s.phase === 'battle';
    document.body.classList.toggle('inBattle', battle);
    if (!this.cinemaOn && s.phase === 'prep') setBgm('prep');
    // HUD
    const ch = V3_CHAPTERS.find(c => c.id === (s.currentChapter ?? 1));
    const lvDef = getLevel(s.level);
    const cap = s.campaignLength ?? CAMPAIGN_LENGTH;
    $('hud').innerHTML = `<div class="hudItem lvl">第 <b>${s.level}</b>/${cap} 关</div>
      <div class="hudItem chap" title="${lvDef.title}">${ch ? ch.name : ''} · ${lvDef.title}</div>
      <div class="hudItem hp"><span>❤</span><div class="hpbar"><i style="width:${(s.hp / s.maxHp) * 100}%"></i></div><b>${s.hp}/${s.maxHp}</b></div>
      <div class="hudItem gold"><span class="coin"></span><b id="goldNum">${s.gold}</b></div>
      <button class="iconBtn" id="logBtn" aria-label="剧情日志" title="剧情日志">📜</button>
      <button class="iconBtn" id="soundBtn" aria-label="音效">${this.settings.sound ? '🔊' : '🔇'}</button>
      <button class="iconBtn" id="setBtn" aria-label="设置">⚙</button>`;
    $('logBtn').onclick = () => this.showStoryLog();
    $('soundBtn').onclick = () => { this.settings.sound = !this.settings.sound; this.saveSettings(); this.render(); };
    $('setBtn').onclick = () => this.showSettings();
    if (s.pendingBagToast) {
      const lv = s.pendingBagToast;
      const offer = expansionOffer(s.expansions);
      s.pendingBagToast = undefined;
      const what = offer?.axis === 'col' ? '新的一列' : '新的一行';
      this.toast(`通关第${lv}关！可以花钱解锁${what}`);
      this.persist(s);
    }
    this.renderMid(); this.renderEquip(); this.renderBag(); this.renderTemp(); this.renderReserve(); this.renderTrial(); this.renderPlan(); this.renderDetails(); this.renderShop(); this.renderStats(); this.applySheet(); this.renderTutorial();
  }
  private applySheet() {
    const bag = this.sheet === 'bag';
    const trial = this.sheet === 'trial';
    $('pageBag').hidden = !bag;
    $('pageTrial').hidden = !trial;
    $('shop').hidden = !bag;
    $('planPanel').hidden = this.sub !== 'plan';
    $('statsPanel').hidden = this.sub !== 'report';
    document.querySelectorAll<HTMLButtonElement>('#sheetNav [data-sheet]').forEach(b => b.classList.toggle('on', b.dataset.sheet === this.sheet));
    document.querySelectorAll<HTMLButtonElement>('.subNav [data-sub]').forEach(b => b.classList.toggle('on', b.dataset.sub === this.sub));
  }
  renderMid() {
    const g = this.game!, s = g.s;
    const lv = s.gearFight ? gearTrialLevel(s.currentChapter, s.level) : getLevel(s.level);
    const base = MONSTER_BASE[lv.monster];
    const battle = s.phase === 'battle';
    const can = g.canStartBattle();
    const abil = lv.armor ? base.ability.replace('固定值', `${lv.armor}点`) : base.ability;
    const mech = lv.mechSummary && !noticeRepeats(abil, lv.mechSummary) ? `<br/>⚙ ${lv.mechSummary}` : '';
    const lvLine = s.gearFight ? '' : (LEVEL_LINES[s.level] ?? '');
    const temps = g.tempItems.length;
    const armed = g.bagItems.some(i => { const c = ITEMS[i.kind].category; return c === 'weapon' || c === 'needle'; }) || !!g.handItem;
    const skillLine = s.gearFight ? null : bossSkillLine(s.level);
    let startLabel = '⚔ 开始战斗';
    let startMode: 'start' | 'tidy' | 'block' = can.ok ? 'start' : 'block';
    if (!battle && temps) { startLabel = `整理装备（${temps}）`; startMode = 'tidy'; }
    else if (!battle && !armed) { startLabel = '配置攻击装备'; startMode = 'block'; }
    $('mid').innerHTML = `<div class="enemyCard ${lv.boss ? 'boss' : ''}">
        <div class="eName">${s.gearFight ? '训练：' : lv.boss ? '👑 首领 · ' : '下一关：'}${lv.title}</div>
        ${lvLine ? `<div class="muted" style="margin:4px 0 8px">「${esc(lvLine)}」</div>` : ''}
        <div class="eStats"><span>❤ ${lv.hp}</span><span>⚔ ${lv.atk}/${lv.interval}秒</span>${lv.armor ? `<span>🛡 减伤${lv.armor}</span>` : ''}</div>
        <div class="eAbil">✦ ${abil}${mech}${skillLine ? `<br/>✦ ${esc(skillLine)}` : ''}<br/>⚠ ${(lv.boss && (lv.level ?? 0) >= 40 ? 36 : ECONOMY.enrageAt)}秒后狂暴（+${lv.boss && (lv.level ?? 0) >= 40 ? 14 : 10}%，之后每${ECONOMY.enrageStep}秒再加一次）；${ECONOMY.timeout}秒未击败即失败。</div>
      </div>
      <div class="actions">
        ${battle ? `<div class="hint">⚔ 自动战斗中……背包已锁定</div>
          <div class="speed"><button class="btn small ${this.speed === 1 ? 'gold' : ''}" id="sp1">1倍速</button><button class="btn small ${this.speed === 2 ? 'gold' : ''}" id="sp2">2倍速</button></div>`
        : `<div class="hint">${can.ok ? '准备就绪！' : '⚠ ' + can.msg}</div>
          <button class="btn gold big ${startMode === 'block' ? 'disabled' : ''}" id="startBtn" ${startMode === 'block' ? 'disabled' : ''}>${startLabel}</button>`}
      </div>`;
    if (battle) {
      $('sp1').onclick = () => { this.speed = 1; this.scene.setSpeed(1); this.renderMid(); };
      $('sp2').onclick = () => { this.speed = 2; this.scene.setSpeed(2); this.renderMid(); };
    } else $('startBtn').onclick = () => this.guard(() => {
      if (startMode === 'tidy') {
        this.sheet = 'bag';
        this.applySheet();
        $('tempWrap').scrollIntoView({ block: 'nearest' });
        this.toast('先把待整理的装备放进背包、合成或出售。');
        return;
      }
      if (startMode === 'block') return;
      if (this.tutStep >= 0) this.endTutorial();
      if (this.act(() => g.startBattle())) this.runBattle();
    });
  }
  private itemHtml(it: ItemInstance, cell: number, extra = '') {
    const { w, h } = itemSize(it.kind, it.rotated);
    const d = ITEMS[it.kind];
    const small = Math.min(w, h) * cell < 50;
    return `<div class="item lv${it.level} ${extra}" data-id="${it.id}" style="width:${w * cell}px;height:${h * cell}px;--c:${d.color}">
      <div class="iconWrap ${it.rotated ? 'rot' : ''}">${iconSvg(it.kind)}</div>
      <div class="iname ${small ? 'tiny' : ''}">${d.name}</div><div class="lvBadge">Lv${it.level}</div>${extra.includes('worn') ? '<div class="wornTag">穿戴</div>' : ''}</div>`;
  }
  renderBag() {
    const g = this.game!, s = g.s, c = this.cell;
    const bag = $('bag');
    bag.style.width = s.cols * c + 'px'; bag.style.height = s.rows * c + 'px';
    let html = '';
    for (let y = 0; y < s.rows; y++) for (let x = 0; x < s.cols; x++) html += `<div class="cell ${y >= ECONOMY.startRows ? 'newRow' : ''}" style="left:${x * c}px;top:${y * c}px"></div>`;
    html += `<div id="preview"></div>`;
    const hi = this.highlightSet();
    for (const it of g.bagItems) {
      const worn = it.id === s.mainHandId || it.id === s.armorId;
      const cls = [this.selected === it.id ? 'sel' : '', hi.has(it.id) ? 'boosted' : '', worn ? 'worn' : '', this.drag?.active && this.drag.id === it.id ? 'dragging' : ''].join(' ');
      html += `<div class="placed" style="left:${it.x! * c}px;top:${it.y! * c}px">${this.itemHtml(it, c, cls)}</div>`;
    }
    bag.innerHTML = html;
    bag.classList.toggle('locked', s.phase !== 'prep');
    $('bagHead').innerHTML = `<div class="ptitle">🎒 背包 <small>${s.cols}×${s.rows}</small></div>
      <button class="btn small" id="rotBtn" ${this.selected && ITEMS[g.find(this.selected)?.kind ?? 'potion'].rotatable && s.phase === 'prep' ? '' : 'disabled'}>⟳ 旋转（R）</button>`;
    $('rotBtn').onclick = () => { if (this.selected) this.act(() => g.rotate(this.selected!)); };
    const exp = expansionLabel(s.level, s.rows, s.cols, s.expansions);
    const offer = expansionOffer(s.expansions);
    const poor = !!offer && !exp.itemCost && s.gold < offer.cost;
    const short = offer && !exp.itemCost ? Math.max(0, offer.cost - s.gold) : 0;
    const mark = `<span class="knitMark">吉利达</span>`;
    const expOk = exp.canBuy && !poor && s.phase === 'prep';
    $('expand').innerHTML = !exp.canBuy
      ? `<div class="expMax">${exp.text}</div>${mark}`
      : `<button class="expandRow ${expOk ? '' : 'disabled'}" id="expBtn" style="width:${Math.min(s.cols * c, 360)}px" ${expOk ? '' : 'disabled'}>➕ ${exp.text}${poor ? ` · 还差${short}金币` : ''}</button>${mark}`;
    if (exp.canBuy) $('expBtn').onclick = () => this.guard(() => {
      if (exp.itemCost) { this.showSacrificeExpand(); return; }
      const before = g.s.expansions;
      if (this.act(() => g.expand(), sfx.coin) && g.s.expansions > before) {
        $('bagWrap')?.classList.add('bagGrow');
        setTimeout(() => $('bagWrap')?.classList.remove('bagGrow'), 900);
      }
    });
    bag.querySelectorAll<HTMLElement>('.item').forEach(el => el.addEventListener('pointerdown', e => this.onDown(e, el.dataset.id!, 'bag')));
  }
  /** 后期扩容：三档献祭里选一档，点背包里的装备凑齐再确认。 */
  private showSacrificeExpand() {
    const g = this.game!;
    const offer = expansionOffer(g.s.expansions);
    if (!offer?.itemCost || g.s.phase !== 'prep') return;
    const what = offer.axis === 'col' ? `第 ${g.s.cols + 1} 列` : `第 ${g.s.rows + 1} 行`;
    const modes = [
      { level: 3 as const, need: 4, label: '4 件任意 Lv3' },
      { level: 4 as const, need: 2, label: '2 件任意 Lv4' },
      { level: 5 as const, need: 1, label: '1 件任意 Lv5' },
    ];
    let mode = modes[0];
    const picked = new Set<string>();
    const ov = $('overlay');
    ov.className = 'show';
    const draw = () => {
      const bag = g.bagItems.filter(i => i.kind !== 'burden' && i.level === mode.level);
      const ready = picked.size === mode.need;
      ov.innerHTML = `<div class="modal"><h2>献祭扩容 · ${what}</h2>
        <p>这一格不能用金币买。从下面三档里选一档，再点背包中的装备。临时区不算。</p>
        <div class="btns">${modes.map(m => `<button class="btn ${m.level === mode.level ? 'gold' : ''}" data-sac="${m.level}">${m.label}</button>`).join('')}</div>
        <p class="muted">已选 ${picked.size} / ${mode.need}。背包里有 ${bag.length} 件 Lv${mode.level}。</p>
        <div class="lootRow">${bag.map(i => `<button class="lootCard ${picked.has(i.id) ? 'on' : ''}" data-item="${i.id}"><div class="sName">${esc(itemLabel(i))}</div><div class="sDesc">${picked.has(i.id) ? '已选，再点取消' : '点选献祭'}</div></button>`).join('') || '<p class="muted">背包里没有这一级的装备。</p>'}</div>
        <div class="btns"><button class="btn gold" id="sacOk" ${ready ? '' : 'disabled'}>确认献祭并扩容</button><button class="btn" id="sacNo">取消</button></div></div>`;
      ov.querySelectorAll<HTMLElement>('[data-sac]').forEach(b => b.onclick = () => {
        mode = modes.find(m => m.level === Number(b.dataset.sac)) ?? mode;
        picked.clear();
        draw();
      });
      ov.querySelectorAll<HTMLElement>('[data-item]').forEach(b => b.onclick = () => {
        const id = b.dataset.item!;
        if (picked.has(id)) picked.delete(id);
        else if (picked.size < mode.need) picked.add(id);
        draw();
      });
      $('sacNo').onclick = () => { this.closeOverlay(); this.render(); };
      $('sacOk').onclick = () => {
        if (picked.size !== mode.need) return;
        const ids = [...picked];
        this.closeOverlay();
        const before = g.s.expansions;
        if (this.act(() => g.expand(ids), sfx.coin) && g.s.expansions > before) {
          $('bagWrap')?.classList.add('bagGrow');
          setTimeout(() => $('bagWrap')?.classList.remove('bagGrow'), 900);
        }
      };
    };
    draw();
  }
  private slotFig(it: ItemInstance | undefined, empty: string) {
    if (!it) return `<div class="slotEmpty">${empty}</div>`;
    const d = ITEMS[it.kind];
    return `<div class="slotFig" data-id="${it.id}">${iconSvg(it.kind)}<div class="lvBadge">Lv${it.level}</div><div class="wornTag">${d.category === 'armor' ? '甲' : elName(it.element)}</div></div>`;
  }
  renderEquip() {
    const g = this.game!; const s = g.s; const prep = s.phase === 'prep';
    if (s.level > 10 && g.maybeGrantV4Lesson()) this.persist(g.s);
    const hand = g.handItem; const armor = g.wornArmor;
    const open = s.level > 10;
    const armorKind = armor && isArmorKind(armor.kind) ? armor.kind : null;
    const resist = armorKind
      ? ELEMENTS.map(e => `${ELEMENT_NAME[e]}${armorResist(armorKind, armor!.level)[e]}`).join(' ')
      : '未穿甲，抗性未生效';
    const guardBtn = s.phase === 'battle' && s.level >= 11
      ? `<button class="btn small" id="guardBtn">战术防御</button>` : '';
    $('equip').innerHTML = `<div class="eqBoard" aria-label="人物穿戴">
        <div class="eqSlot" id="handSlot" data-slot="hand">${this.slotFig(hand, open ? '拖入武器' : '未开启')}<span class="slotName">主手</span></div>
        <div class="eqSlot" id="armorSlot" data-slot="armor">${this.slotFig(armor, open ? '拖入护甲' : '未开启')}<span class="slotName">护甲</span></div>
      </div>
      <div class="sDesc">${hand ? `主手：${ITEMS[hand.kind].name} · ${elName(hand.element)} · 不占背包` : '未指定主手，背包武器正常攻击'}</div>
      <div class="sDesc">${resist}</div>
      ${open ? '' : '<div class="muted">通关第10关后，可以把武器和衬甲拖进槽里。格子仍被占用。</div>'}
      ${open && !g.s.items.some(i => isArmorKind(i.kind)) ? '<button class="btn small" id="gotoTrial" type="button">暂无护甲 → 查看防护委托</button>' : ''}
      ${guardBtn}`;
    const handFig = document.querySelector('#handSlot .slotFig') as HTMLElement | null;
    const armorFig = document.querySelector('#armorSlot .slotFig') as HTMLElement | null;
    if (handFig && prep) handFig.addEventListener('pointerdown', e => this.onDown(e, handFig.dataset.id!, 'slot'));
    if (armorFig && prep) armorFig.addEventListener('pointerdown', e => this.onDown(e, armorFig.dataset.id!, 'slot'));
    const go = document.getElementById('gotoTrial');
    if (go) go.onclick = () => { this.sheet = 'trial'; this.render(); };
    const gb = document.getElementById('guardBtn');
    if (gb) gb.onclick = () => { const c = this.scene?.combat; if (c) activateGuard(c); };
  }
  renderReserve() {
    const g = this.game!; const s = g.s; const prep = s.phase === 'prep';
    const tc = Math.min(40, this.cell * 0.7);
    const box = g.reserveItems;
    const old = g.legacyItems;
    $('reserveWrap').innerHTML = `<details>
        <summary>备用 ${box.length}/${RESERVE_CAP}${old.length ? ` · 旧档暂存 ${old.length}` : ''}</summary>
        <div id="reserveItems">${box.length ? box.map(it => this.itemHtml(it, tc, this.selected === it.id ? 'sel' : '')).join('') : '<div class="empty">空。只收武器和衬甲，放进去就不生效。</div>'}</div>
        ${old.length ? `<div class="muted">旧档多出来的只能取出或出售，不能再放回这个暂存。</div><div id="legacyList">${old.map(it => `<div class="detBtns"><span>${ITEMS[it.kind].name} Lv${it.level}</span><button class="btn small" data-out="${it.id}" ${prep ? '' : 'disabled'}>取出</button></div>`).join('')}</div>` : ''}
      </details>`;
    $('reserveItems').querySelectorAll<HTMLElement>('.item').forEach(el => el.addEventListener('pointerdown', e => this.onDown(e, el.dataset.id!, 'reserve')));
    $('reserveWrap').querySelectorAll<HTMLButtonElement>('[data-out]').forEach(b => b.onclick = () => this.guard(() => this.act(() => g.unequip(b.dataset.out!))));
  }
  renderTrial() {
    const g = this.game!; const s = g.s; const prep = s.phase === 'prep';
    if (s.level > 10) ensureGearTrials(s);
    const info = chapterBossElement(s.currentChapter);
    const trials = s.level > 10 && s.gearTrials?.chapter === s.currentChapter ? s.gearTrials.trials : [];
    const locked = s.level <= 10;
    $('pageTrial').innerHTML = `<div class="panel"><div class="ptitle">寻找套装</div>
      ${locked ? '<div class="empty">通关第10关后开放。训练不改主线生命、金币和关卡。</div>' : `
      <p class="muted">训练用满血打一局，结束回到主线原来的生命和金币。奖励领一次。</p>
      ${trials.map(t => {
        const label = t.claimed ? '再次练习（无奖励）' : t.ready ? '领取奖励' : '挑战委托';
        return `<div class="detBtns"><span>${TRIAL_NAME[t.kind]}</span><button class="btn small ${t.ready && !t.claimed ? 'gold' : ''}" data-trial="${t.id}" ${prep ? '' : 'disabled'}>${label}</button></div>`;
      }).join('')}
      ${info ? `<details><summary>第${s.currentChapter * 5}关首领预告</summary><div class="sDesc">偏${elName(info.element)}，弱点偏${elName(info.weakness)}。火抗甲只减受到的火伤，不改变自己的火输出。</div></details>` : ''}`}</div>`;
    $('pageTrial').querySelectorAll<HTMLElement>('[data-trial]').forEach(b => b.onclick = () => this.guard(() => {
      const id = b.dataset.trial!;
      const trial = s.gearTrials?.trials.find(t => t.id === id);
      if (trial?.ready && !trial.claimed) this.act(() => g.claimGearTrial(id));
      else {
        const r = g.startGearTrial(id);
        if (!r.ok) { this.toast(r.msg, true); return; }
        this.render(); this.runBattle();
      }
    }));
  }
  renderPlan() {
    const g = this.game!; const s = g.s; const prep = s.phase === 'prep';
    const lines = (s.loadouts ?? []).map(l => `${l.name}${l.handId && !g.find(l.handId) ? '（主手失效）' : ''}${l.armorId && !g.find(l.armorId) ? '（护甲失效）' : ''}`).join(' · ');
    $('planPanel').innerHTML = `<div class="ptitle">方案</div>
      <div class="sDesc">${lines || '两套方案都还是空的。只保存引用，不复制装备。'}</div>
      <div class="detBtns">
        <button class="btn small" id="saveA" ${prep ? '' : 'disabled'}>记下方案甲</button>
        <button class="btn small" id="loadA" ${prep ? '' : 'disabled'}>换上方案甲</button>
        <button class="btn small" id="saveB" ${prep ? '' : 'disabled'}>记下方案乙</button>
        <button class="btn small" id="loadB" ${prep ? '' : 'disabled'}>换上方案乙</button>
      </div>`;
    if (!prep) return;
    $('saveA').onclick = () => this.guard(() => this.act(() => g.saveLoadout(0)));
    $('loadA').onclick = () => this.guard(() => this.act(() => g.applyLoadout(0)));
    $('saveB').onclick = () => this.guard(() => this.act(() => g.saveLoadout(1)));
    $('loadB').onclick = () => this.guard(() => this.act(() => g.applyLoadout(1)));
  }
  renderTemp() {
    const g = this.game!;
    const tc = Math.min(40, this.cell * 0.7);
    const t = $('temp');
    const n = g.tempItems.length;
    $('tempTitle').textContent = n ? `待整理（${n}）` : '待整理';
    t.innerHTML = n ? g.tempItems.map(it => this.itemHtml(it, tc, this.selected === it.id ? 'sel' : '')).join('') : `<div class="empty">没有待整理的装备</div>`;
    $('tempWrap').classList.toggle('hasItems', n > 0);
    t.querySelectorAll<HTMLElement>('.item').forEach(el => el.addEventListener('pointerdown', e => this.onDown(e, el.dataset.id!, 'temp')));
  }
  /** 选中/拖动宝石时高亮被强化的武器；选中武器时高亮强化它的宝石 */
  highlightSet(): Set<string> {
    const g = this.game!; const out = new Set<string>();
    const id = this.drag?.active ? this.drag.id : this.selected; if (!id) return out;
    let items = g.s.items; const it = g.find(id); if (!it) return out;
    if (this.drag?.active && this.drag.drop?.type === 'place' && this.drag.drop.ok) {
      const dp = this.drag.drop; items = items.map(i => (i.id === id ? { ...i, x: dp.x, y: dp.y, rotated: this.drag!.rotated } : i));
    } else if (this.drag?.active) return out;
    const cur = items.find(i => i.id === id)!;
    if (cur.kind === 'ruby') weaponsBoostedBy(items, cur).forEach(w => out.add(w));
    else if (ITEMS[cur.kind].category === 'weapon') gemBonus(items, cur).gems.forEach(x => out.add(x));
    return out;
  }
  renderDetails() {
    const g = this.game!, el = $('details');
    const it = this.selected ? g.find(this.selected) : undefined;
    document.body.classList.toggle('sheetOpen', !!it);
    if (!it) { el.innerHTML = `<div class="ptitle">🔍 装备详情</div><div class="empty">点击一件装备查看详情</div>`; return; }
    const d = ITEMS[it.kind]; const v = d.values[it.level - 1]; const { w, h } = itemSize(it.kind, it.rotated);
    const place = itemPlace(it);
    let status = '背包中 · 按原规则生效';
    if (place === 'reserve' || place === 'legacy') status = '备用中 · 不参与战斗';
    else if (place === 'temp') status = '待整理 · 不参与战斗';
    else if (place === 'hand') status = '主手 · 攻击生效 · 不占背包格 · 不吃邻接';
    else if (place === 'armor') status = `已穿戴 · 抗性生效 · 不占背包格`;
    else if (d.category === 'armor') status = `未穿戴 · 抗性未生效 · 占格${w}×${h}`;
    else if (d.category === 'weapon' || d.category === 'needle') status = '背包武器 · 攻击生效';
    let stats = '';
    if (d.category === 'weapon' || d.category === 'needle') {
      const b = d.category === 'weapon' ? gemBonus(g.s.items, it) : { pct: 0, gems: [] as string[] };
      const fin = d.category === 'weapon' ? weaponDamage(g.s.items, it) : v;
      const names = (b.gems ?? []).map(id => g.find(id) ? ITEMS[g.find(id)!.kind].name : '').filter(Boolean).join('、') || '无';
      const off = place === 'hand' ? '（已穿出，不吃邻接）' : !inBag(it) ? '（待整理不生效）' : '';
      stats = `<div>伤害：<b>${v}</b> · 间隔 ${d.interval}秒 · 元素 ${elName(it.element)}</div><div>邻接：${names} · 宝石 <b class="${b.pct ? 'up' : ''}">+${b.pct}%</b>${off}</div>
        <div>结算伤害：<b class="up">${inBag(it) ? fin : 0}</b>${d.category === 'needle' ? ' · 附毒' : ''}</div>`;
    } else if (d.category === 'gem') {
      const n = weaponsBoostedBy(g.s.items, it).length;
      stats = `<div>加成：<b>+${v}%</b></div><div>当前强化武器：<b class="${n ? 'up' : ''}">${n}</b> 件（已高亮）</div>`;
    } else if (d.category === 'shield') stats = `<div>护盾：<b>${v}</b> / ${d.interval}秒</div><div>护盾上限：${Math.floor(g.s.maxHp * ECONOMY.shieldCapRate)}${d.maxTriggers ? ` · 每场最多${d.maxTriggers}次` : ''}</div><div>这是背包护盾，不是穿戴甲。</div>`;
    else if (d.category === 'potion') stats = `<div>单次治疗：<b>${v}</b> 生命</div><div>触发：生命 ≤ ${Math.floor(g.s.maxHp * ECONOMY.potionThreshold)}</div>`;
    else if (d.category === 'heal') stats = `<div>恢复：<b>${v}</b> · 间隔 ${d.interval}秒</div><div>每场最多 ${d.maxTriggers ?? 3} 次（非药水）</div>`;
    else if (d.category === 'passive') stats = `<div>减甲：<b>${v}</b> · 持续前8秒</div>`;
    else if (d.category === 'economy') stats = `<div>开战金低于 30 时，本场额外 <b>+${v}</b> 金币</div>`;
    else if (d.category === 'armor' && isArmorKind(it.kind)) {
      const kind = it.kind;
      const r = armorResist(kind, it.level);
      stats = `<div>${ELEMENTS.map(e => `${ELEMENT_NAME[e]} ${r[e]}`).join(' · ')}</div><div>${g.s.armorId === it.id ? '抗性已计入下一场' : '未穿戴，抗性未计入'}。衬甲不提供护盾。</div>`;
    }
    else if (it.kind === 'luck_charm') stats = `<div>首次加盾额外：<b>+${v}</b> · 每场一次 · 固定一级</div>`;
    else stats = `<div>胜利金币：<b>+${v}</b></div>`;
    let next = '';
    if (d.category === 'armor' && isArmorKind(it.kind)) {
      const kind = it.kind;
      next = it.level >= 5
        ? `<div class="nextLv">已是最高等级</div>`
        : `<div class="nextLv">升至${it.level + 1}级：${ELEMENTS.map(e => `${ELEMENT_NAME[e]} ${armorResist(kind, (it.level + 1) as Level)[e]}`).join(' · ')}</div>`;
    } else if (it.kind === 'luck_charm') {
      next = `<div class="nextLv">固定一级，不能合成。</div>`;
    } else {
      const unit = d.category === 'gem' ? '%' : d.category === 'weapon' || d.category === 'needle' ? '伤害' : d.category === 'shield' ? '护盾' : d.category === 'potion' || d.category === 'heal' ? '治疗' : '金币';
      const nextVal = it.level < 3 ? d.values[(it.level) as 1 | 2] : d.values[3];
      next = it.level < 3
        ? `<div class="nextLv">升至${it.level + 1}级：${unit}${d.category === 'gem' ? '+' : ''}${nextVal}${d.category === 'gem' ? '%' : ''}</div>`
        : it.level === 3
          ? `<div class="nextLv">拖到另一件 Lv3 上可赌 Lv4（${unit}${d.values[3]}）：${gamblePct(LV4_GAMBLE.success)}% 成功，${gamblePct(LV4_GAMBLE.loseOne)}% 只消失拖过去的那一件。</div>`
          : it.level === 4
            ? `<div class="nextLv">拖到另一件 Lv4 上可赌 Lv5（${unit}${d.values[4]}）：${gamblePct(LV5_GAMBLE.success)}% 成功，${gamblePct(LV5_GAMBLE.loseOne)}% 只丢一件，${gamblePct(LV5_GAMBLE.loseBoth)}% 两件都消失。</div>`
            : `<div class="nextLv">已是最高等级</div>`;
    }
    const sp = sellPrice(it.kind, it.level); const confirming = this.sellConfirm?.id === it.id && this.sellConfirm.until > Date.now();
    const prep = g.s.phase === 'prep';
    const wornHand = g.s.mainHandId === it.id;
    const wornArmor = g.s.armorId === it.id;
    const canBox = (d.category === 'weapon' || d.category === 'needle' || d.category === 'armor') && place !== 'legacy';
    el.innerHTML = `<div class="ptitle">装备详情 <button class="iconBtn closeSheet" id="closeDet">✕</button></div>
      <div class="detHead"><div class="detIcon lv${it.level}" style="--c:${d.color}">${iconSvg(it.kind)}<div class="lvBadge">Lv${it.level}</div></div>
      <div><div class="detName">${d.name} <span class="lvTxt">Lv${it.level}</span></div><div class="muted">占格 ${w}×${h}${d.rotatable ? ' · 可旋转' : ''} · ${status}</div></div></div>
      <div class="desc">${d.desc(v)}</div><div class="statsBox">${stats}${next}</div>
      <div class="detBtns">
        ${inBag(it) ? `<button class="btn small" id="dTemp" ${prep ? '' : 'disabled'}>移到待整理</button>` : `<button class="btn small gold" id="dPlace" ${prep ? '' : 'disabled'}>放入背包</button>`}
        ${(d.category === 'weapon' || d.category === 'needle') ? `<button class="btn small" id="dHand" ${prep ? '' : 'disabled'}>${wornHand ? '卸下主手' : '设为主手'}</button>` : ''}
        ${d.category === 'armor' ? `<button class="btn small" id="dArmor" ${prep ? '' : 'disabled'}>${wornArmor ? '卸下护甲' : '穿上'}</button>` : ''}
        <button class="btn small ${confirming ? 'danger' : ''}" id="dSell" ${prep ? '' : 'disabled'}>${confirming ? `确认出售？+${sp}金币` : `出售 +${sp}金币`}</button>
      </div>
      <details><summary>更多</summary><div class="detBtns">
        ${d.rotatable ? `<button class="btn small" id="dRot" ${prep ? '' : 'disabled'}>旋转</button>` : ''}
        ${canBox ? `<button class="btn small" id="dBox" ${prep ? '' : 'disabled'}>放入备用箱</button>` : ''}
      </div></details>`;
    $('closeDet').onclick = () => { this.selected = null; this.render(); };
    if (d.rotatable) $('dRot').onclick = () => this.act(() => g.rotate(it.id));
    if (inBag(it)) $('dTemp').onclick = () => this.act(() => g.toTemp(it.id));
    else $('dPlace').onclick = () => this.act(() => this.autoPlace(it));
    const dHand = document.getElementById('dHand');
    const dArmor = document.getElementById('dArmor');
    const dBox = document.getElementById('dBox');
    if (dHand) dHand.onclick = () => this.act(() => wornHand ? g.unequip(it.id) : g.equipHand(it.id));
    if (dArmor) dArmor.onclick = () => this.act(() => wornArmor ? g.unequip(it.id) : g.equipArmor(it.id));
    if (dBox) dBox.onclick = () => this.act(() => g.toReserve(it.id));
    $('dSell').onclick = () => this.guard(() => {
      if (confirming) { this.sellConfirm = null; this.selected = null; this.act(() => g.sell(it.id), sfx.coin); }
      else { this.sellConfirm = { id: it.id, until: Date.now() + 3000 }; this.renderDetails(); setTimeout(() => this.renderDetails(), 3050); }
    });
  }
  autoPlace(it: ItemInstance): Result {
    const g = this.game!;
    for (const rot of ITEMS[it.kind].rotatable ? [it.rotated, !it.rotated] : [false])
      for (let y = 0; y < g.s.rows; y++) for (let x = 0; x < g.s.cols; x++)
        if (canPlace(g.s.items, g.s.cols, g.s.rows, it.kind, x, y, rot, it.id)) return g.move(it.id, x, y, rot);
    return { ok: false, msg: '这里放不下。背包没有空位，可以合成、出售或扩容。' };
  }
  renderShop() {
    const g = this.game!, s = g.s, prep = s.phase === 'prep';
    const rc = refreshCost(s.shop.refreshes, s.doctrine, s.heroClass, s.level);
    const picked = this.selected ? g.find(this.selected) : undefined;
    const canImprint = !!picked && (ITEMS[picked.kind].category === 'weapon' || ITEMS[picked.kind].category === 'needle') && s.level > 10;
    const imprint = `<div class="slotBox"><div class="sName">元素改造</div>
      <div class="sDesc">${canImprint ? `当前 ${ITEMS[picked!.kind].name} · ${elName(picked!.element)}。每章 10 金一次。` : '先选中一把武器。每章 10 金一次。火抗甲不改变火输出。'}</div>
      <div class="detBtns">${[{ id: '', label: '无属性' }, ...ELEMENTS.map(e => ({ id: e, label: ELEMENT_NAME[e] }))].map(e => `<button class="btn small" data-imprint="${e.id}" ${canImprint && prep ? '' : 'disabled'}>${e.label}</button>`).join('')}</div></div>`;
    const wide = document.body.classList.contains('wide');
    const wasOpen = (document.querySelector('#shop details') as HTMLDetailsElement | null)?.open;
    if (wasOpen) this.shopOpen = true;
    const open = wide || this.shopOpen ? 'open' : '';
    $('shop').innerHTML = `<details class="shopFold" ${open}><summary>商店 <small>买到的装备进入待整理</small></summary><div class="shopBody">
      <div class="shopRow">${s.shop.slots.map((sl, i) => {
        const p = buyPrice(sl.kind, sl.level, s.heroClass); const poor = s.gold < p; const d = ITEMS[sl.kind];
        const short = Math.max(0, p - s.gold);
        return `<div class="shopCard ${sl.bought ? 'bought' : ''}"><div class="detIcon lv${sl.level}" style="--c:${d.color}">${iconSvg(sl.kind)}<div class="lvBadge">Lv${sl.level}</div></div>
          <div class="sName">${d.name} Lv${sl.level}</div><div class="sDesc">${d.desc(d.values[sl.level - 1])}</div>
          <button class="btn small ${sl.bought ? '' : 'gold'}" data-buy="${i}" ${sl.bought || poor || !prep ? 'disabled' : ''}>${sl.bought ? '已购买' : poor ? `还差${short}金币` : `<span class="coin"></span>${p} 购买`}</button></div>`;
      }).join('')}</div>
      <button class="btn small wideBtn" id="refBtn" ${s.gold < rc || !prep ? 'disabled' : ''}>刷新商店 · <span class="coin"></span>${rc}${s.gold < rc ? `（还差${rc - s.gold}金币）` : ''}</button>
      ${imprint}
      <details class="slotFold"><summary>摇奖机</summary>${this.slotHtml(prep)}</details></div></details>`;
    $('shop').querySelectorAll<HTMLElement>('[data-buy]').forEach(b => (b.onclick = () => this.guard(() => this.act(() => g.buy(+b.dataset.buy!), sfx.coin))));
    $('refBtn').onclick = () => this.guard(() => this.act(() => g.refreshShop(), sfx.coin));
    $('shop').querySelectorAll<HTMLButtonElement>('[data-imprint]').forEach(b => b.onclick = () => this.guard(() => {
      if (!picked) return;
      const raw = b.dataset.imprint || '';
      const element = (ELEMENTS as readonly string[]).includes(raw) ? raw as GearElement : null;
      this.act(() => g.imprint(picked.id, element));
    }));
    const fold = document.querySelector('#shop details');
    if (fold) fold.addEventListener('toggle', () => { this.shopOpen = (fold as HTMLDetailsElement).open; });
    $('slotBtn').onclick = () => this.guard(() => this.act(() => {
      const r = g.pullSlot();
      if (r.ok) this.slotMsg = r.msg ?? '摇完了';
      return r;
    }, sfx.coin));
  }
  slotHtml(prep: boolean) {
    const s = this.game!.s;
    const cost = slotCost(s.level);
    const poor = s.gold < cost;
    const msg = this.slotMsg ? `<div class="slotMsg">${esc(this.slotMsg)}</div>` : '';
    return `<div class="slotBox">
      <div class="sName">🎰 守财奴摇奖机</div>
      <div class="sDesc">${slotBlurb()}</div>
      ${msg}
      <button class="btn small gold wideBtn" id="slotBtn" ${poor || !prep ? 'disabled' : ''}>${poor ? `还差${cost - s.gold}金币` : `摇一次 · <span class="coin"></span>${cost}`}</button>
    </div>`;
  }
  renderStats() {
    const l = this.game!.s.last; const el = $('statsPanel');
    el.innerHTML = `<div class="ptitle">📊 上场战斗统计</div>${l ? this.statsHtml(l) : '<div class="empty">还没有战斗记录</div>'}`;
  }
  statsHtml(l: NonNullable<GameState['last']>) {
    return `<div class="statList">${l.weaponDamage.map(w => `<div><span>⚔ ${w.label}</span><b>${w.value} 伤害</b></div>`).join('')}
      <div><span>🛡 盾牌吸收</span><b>${l.shieldAbsorb}</b></div><div><span>🧪 药水治疗</span><b>${l.potionHeal}</b></div>
      <div><span>💰 钱袋金币</span><b>${l.bagGold}</b></div><div><span>🏆 胜利金币</span><b>${l.baseGold}</b></div><div><span>⏱ 用时</span><b>${l.time.toFixed(1)}秒</b></div></div>`;
  }
  // ---------- 新手引导（就地提示） ----------
  renderTutorial() {
    document.querySelectorAll('.tutTarget').forEach(e => e.classList.remove('tutTarget'));
    document.getElementById('tutBubble')?.remove();
    const s = this.game?.s;
    if (!s || s.phase !== 'prep') return;
    if (this.tutStep >= 0) {
      const st = TUTORIAL[this.tutStep]; const target = document.querySelector(st.sel); if (!target) return;
      this.placeTut(target, st.text, this.tutStep < TUTORIAL.length - 1, () => this.endTutorial(), () => {
        this.tutStep++; if (this.tutStep >= TUTORIAL.length) this.endTutorial(); else this.renderTutorial();
      });
      return;
    }
    if (s.level >= 11 && !this.settings.wearLessonDone && this.wearStep < 0 && this.tutStep < 0) {
      this.wearStep = 0;
      this.sheet = 'bag';
      this.applySheet();
    }
    if (this.wearStep < 0 || this.settings.wearLessonDone) return;
    const st = WEAR_TUTORIAL[this.wearStep]; const target = document.querySelector(st.sel); if (!target) return;
    this.placeTut(target, st.text, this.wearStep < WEAR_TUTORIAL.length - 1, () => this.endWearLesson(), () => {
      this.wearStep++; if (this.wearStep >= WEAR_TUTORIAL.length) this.endWearLesson(); else this.renderTutorial();
    });
  }
  private placeTut(target: Element, text: string, more: boolean, skip: () => void, next: () => void) {
    target.classList.add('tutTarget');
    const b = document.createElement('div'); b.id = 'tutBubble';
    b.innerHTML = `<div>${text}</div><div class="tutBtns"><button class="btn small" id="tutSkip">跳过引导</button><button class="btn small gold" id="tutNext">${more ? '下一步' : '知道了'}</button></div>`;
    (target.id === 'bag' ? $('bagWrap') : target).appendChild(b);
    $('tutSkip').onclick = () => skip();
    $('tutNext').onclick = () => next();
  }
  endTutorial() { this.tutStep = -1; this.settings.tutorialDone = true; this.saveSettings(); this.renderTutorial(); }
  endWearLesson() { this.wearStep = -1; this.settings.wearLessonDone = true; this.saveSettings(); this.renderTutorial(); }

  // ---------- 拖动 ----------
  onDown(e: PointerEvent, id: string, from: DragFrom) {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const touch = e.pointerType !== 'mouse';
    if (!touch) e.preventDefault();
    const it = this.game!.find(id); if (!it) return;
    const el = e.currentTarget as HTMLElement; const r = el.getBoundingClientRect();
    const cs = from === 'bag' ? this.cell : r.width / itemSize(it.kind, it.rotated).w;
    this.drag = {
      id, startX: e.clientX, startY: e.clientY, active: false, rotated: it.rotated,
      grabDx: Math.floor((e.clientX - r.left) / cs), grabDy: Math.floor((e.clientY - r.top) / cs),
      ghost: null, from, drop: null, pointerType: e.pointerType, t0: performance.now(),
      claim: touch ? 'pending' : 'drag',
    };
    const sz = itemSize(it.kind, it.rotated);
    this.drag.grabDx = Math.min(sz.w - 1, Math.max(0, this.drag.grabDx)); this.drag.grabDy = Math.min(sz.h - 1, Math.max(0, this.drag.grabDy));
    window.clearTimeout(this.holdTimer);
    if (touch) this.holdTimer = window.setTimeout(() => { if (this.drag?.claim === 'pending') this.drag.claim = 'drag'; }, 150);
  }
  rotateDrag() {
    const d = this.drag!; const it = this.game!.find(d.id)!;
    if (!ITEMS[it.kind].rotatable) return;
    d.rotated = !d.rotated; [d.grabDx, d.grabDy] = [d.grabDy, d.grabDx];
    this.makeGhost(); sfx.click();
  }
  private makeGhost() {
    const d = this.drag!; const it = this.game!.find(d.id)!;
    d.ghost?.remove();
    const wrap = document.createElement('div'); wrap.className = 'ghost';
    wrap.innerHTML = this.itemHtml({ ...it, rotated: d.rotated }, this.cell);
    document.body.appendChild(wrap); d.ghost = wrap;
  }
  onMove(e: PointerEvent) {
    const d = this.drag; if (!d) return;
    if (!d.active) {
      const dx = e.clientX - d.startX, dy = e.clientY - d.startY;
      const dist = Math.hypot(dx, dy);
      if (d.pointerType !== 'mouse') {
        const held = d.claim === 'drag' || performance.now() - d.t0 >= 150;
        const vertical = Math.abs(dy) >= 10 && Math.abs(dy) > Math.abs(dx) * 1.2;
        if (!held && vertical) { this.releaseDrag(false); return; }
        const sideways = Math.abs(dx) >= 8 && Math.abs(dx) > Math.abs(dy);
        if (!(held || sideways) || dist < 7) return;
      } else if (dist < 7) return;
      if (this.game!.s.phase !== 'prep') { this.releaseDrag(false); this.toast('战斗中无法整理背包。', true); return; }
      d.claim = 'drag';
      d.active = true; if (document.body.classList.contains('wide')) this.selected = d.id; else this.selected = null; sfx.pick(); this.makeGhost(); this.renderBag(); this.renderDetails();
    }
    if (e.cancelable) e.preventDefault();
    const sc = $('bagScroll');
    if (sc) {
      const r = sc.getBoundingClientRect();
      if (e.clientY > r.bottom - 36) sc.scrollTop += 12;
      else if (e.clientY < r.top + 36) sc.scrollTop -= 12;
    }
    d.ghost!.style.transform = `translate(${e.clientX - (d.grabDx + 0.5) * this.cell}px, ${e.clientY - (d.grabDy + 0.5) * this.cell}px)`;
    this.computeDrop(e.clientX, e.clientY);
    this.renderPreview();
  }
  private computeDrop(px: number, py: number) {
    const d = this.drag!, g = this.game!; const it = g.find(d.id)!;
    d.ghost!.style.display = 'none';
    const under = document.elementFromPoint(px, py) as HTMLElement | null;
    d.ghost!.style.display = '';
    d.drop = null;
    const cat = ITEMS[it.kind].category;
    const slotEl = under?.closest('#handSlot, #armorSlot') as HTMLElement | null;
    if (slotEl) {
      const slot = slotEl.id === 'handSlot' ? 'hand' as const : 'armor' as const;
      let ok = true;
      let reason = '';
      let land: { x: number; y: number } | null = null;
      if (g.s.level <= 10) { ok = false; reason = '通关第10关后才能穿戴'; }
      else if (slot === 'hand' && cat !== 'weapon' && cat !== 'needle') { ok = false; reason = '主手只能装武器'; }
      else if (slot === 'armor' && cat !== 'armor') { ok = false; reason = '护甲槽只接受衬甲'; }
      d.drop = { type: 'wear', slot, ok, reason, land };
      return;
    }
    if (under?.closest('#reserveWrap') && !under.closest('#legacyList')) {
      const full = itemPlace(it) !== 'reserve' && g.reserveItems.length >= RESERVE_CAP;
      const okType = cat === 'weapon' || cat === 'needle' || cat === 'armor';
      let reason = '';
      if (it.bin === 'legacy') reason = '旧档暂存只能取出或出售';
      else if (!okType) reason = '备用箱只收武器和护甲';
      else if (full) reason = '备用箱已满，请先取出或出售';
      d.drop = { type: 'reserve', ok: !reason, reason };
      return;
    }
    const targetEl = under?.closest('.item') as HTMLElement | null;
    const bagRect = $('bag').getBoundingClientRect();
    const inGrid = px >= bagRect.left && px < bagRect.right && py >= bagRect.top && py < bagRect.bottom;
    // 合成优先于放置。临时区拖到背包里同种同级的装备上，走和背包内一样的合成。
    let target: ItemInstance | undefined;
    if (inGrid) target = itemAt(g.s.items, Math.floor((px - bagRect.left) / this.cell), Math.floor((py - bagRect.top) / this.cell));
    else if (targetEl && targetEl.dataset.id && !targetEl.closest('.ghost')) target = g.find(targetEl.dataset.id);
    if (target && target.id !== d.id) {
      const m = canMerge(it, target);
      if (m.ok) { d.drop = { type: 'merge', targetId: target.id, ok: true, gamble: !!m.gamble }; return; }
      if (!inGrid) { d.drop = { type: 'merge', targetId: target.id, ok: false, reason: m.reason }; return; }
      if (target.kind === it.kind) { d.drop = { type: 'merge', targetId: target.id, ok: false, reason: m.reason }; return; }
    }
    if (inGrid) {
      const cx = Math.floor((px - bagRect.left) / this.cell) - d.grabDx, cy = Math.floor((py - bagRect.top) / this.cell) - d.grabDy;
      d.drop = { type: 'place', x: cx, y: cy, ok: canPlace(g.s.items, g.s.cols, g.s.rows, it.kind, cx, cy, d.rotated, it.id), unequip: d.from === 'slot' };
      return;
    }
    if (under?.closest('#tempWrap')) d.drop = { type: 'temp' };
  }
  private renderPreview() {
    const d = this.drag!, g = this.game!, it = g.find(d.id)!;
    const pv = $('preview'); let html = '';
    document.querySelectorAll('.mergeTarget,.mergeBad,.mergeCandidate').forEach(e => e.classList.remove('mergeTarget', 'mergeBad', 'mergeCandidate'));
    if (d.active) {
      for (const id of mergeTargetIds(g.s.items, d.id)) {
        document.querySelectorAll(`#bag .item[data-id="${id}"]`).forEach(e => e.classList.add('mergeCandidate'));
      }
    }
    $('tempWrap').classList.toggle('dropHere', d.drop?.type === 'temp');
    document.querySelectorAll('.eqSlot').forEach(e => e.classList.remove('hot', 'bad'));
    $('reserveWrap').classList.toggle('dropHere', d.drop?.type === 'reserve' && d.drop.ok);
    let tip = '';
    if (d.drop?.type === 'wear') {
      document.getElementById(d.drop.slot === 'hand' ? 'handSlot' : 'armorSlot')?.classList.add(d.drop.ok ? 'hot' : 'bad');
      if (d.drop.land) {
        for (const c of occupiedCells(it.kind, d.drop.land.x, d.drop.land.y, d.rotated))
          html += `<div class="pv ok" style="left:${c.x * this.cell}px;top:${c.y * this.cell}px"></div>`;
      }
      tip = d.drop.ok ? '松开后离开背包' : (d.drop.reason ?? '');
    } else if (d.drop?.type === 'reserve') {
      tip = d.drop.ok ? '放入备用，不生效' : (d.drop.reason ?? '');
    } else if (d.drop?.type === 'place') {
      for (const c of occupiedCells(it.kind, d.drop.x, d.drop.y, d.rotated))
        if (c.x >= 0 && c.y >= 0 && c.x < g.s.cols && c.y < g.s.rows) html += `<div class="pv ${d.drop.ok ? 'ok' : 'bad'}" style="left:${c.x * this.cell}px;top:${c.y * this.cell}px"></div>`;
      tip = d.drop.ok ? (d.drop.unequip ? '卸下' : '') : '这里放不下';
    } else if (d.drop?.type === 'merge') {
      document.querySelectorAll(`.item[data-id="${d.drop.targetId}"]`).forEach(e => { if (!e.closest('.ghost')) e.classList.add((d.drop as any).ok ? 'mergeTarget' : 'mergeBad'); });
      if (d.drop.ok && d.drop.gamble) {
        const odds = it.level === 4 ? LV5_GAMBLE : LV4_GAMBLE;
        const up = it.level === 4 ? 5 : 4;
        tip = it.level === 4
          ? `赌 Lv${up}：${gamblePct(odds.success)}% 成功，${gamblePct(odds.loseOne)}% 只丢这一件，${gamblePct(odds.loseBoth)}% 两件都消失`
          : `赌 Lv${up}：${gamblePct(odds.success)}% 得到更强的一件，${gamblePct(odds.loseOne)}% 只消失拖过去的这一件`;
      }
      else if (d.drop.ok) { const def = ITEMS[it.kind]; const nv = def.values[it.level as number]; tip = `✨ 合成预览：${def.name} Lv${it.level + 1}（${def.category === 'gem' ? '+' + nv + '%' : def.category === 'weapon' ? '伤害' + nv : def.category === 'shield' ? '护盾' + nv : def.category === 'potion' ? '治疗' + nv : '金币+' + nv}）`; }
      else tip = d.drop.reason ?? '';
    } else if (d.drop?.type === 'temp') tip = '放到待整理';
    pv.innerHTML = html;
    // 宝石高亮预览
    const hi = this.highlightSet();
    document.querySelectorAll('#bag .item').forEach(e => e.classList.toggle('boosted', hi.has((e as HTMLElement).dataset.id!)));
    let tipEl = d.ghost!.querySelector('.dragTip') as HTMLElement | null;
    if (!tipEl) { tipEl = document.createElement('div'); tipEl.className = 'dragTip'; d.ghost!.appendChild(tipEl); }
    tipEl.textContent = tip; tipEl.style.display = tip ? '' : 'none';
    tipEl.classList.toggle('good', d.drop?.type === 'merge' && d.drop.ok);
  }
  onUp(e: PointerEvent) {
    window.clearTimeout(this.holdTimer);
    const d = this.drag; if (!d) return;
    const g = this.game!;
    if (!d.active) { // 点击 → 查看详情
      this.releaseDrag(false);
      if (!(e.target as HTMLElement).closest('.item, .slotFig')) return;
      this.selected = this.selected === d.id ? null : d.id; this.sellConfirm = null; sfx.click(); this.render(); return;
    }
    this.computeDrop(e.clientX, e.clientY);
    const drop = d.drop; d.ghost?.remove(); this.drag = null;
    $('tempWrap').classList.remove('dropHere');
    $('reserveWrap').classList.remove('dropHere');
    if (!drop) { sfx.drop(); this.render(); return; } // 无效位置：回到原处
    if (drop.type === 'merge') {
      const src = g.find(d.id); const tgt = g.find(drop.targetId);
      const differ = !!src && !!tgt && (src.element ?? null) !== (tgt.element ?? null);
      if (drop.ok && differ) { this.confirmElementMerge(d.id, drop.targetId, !!drop.gamble); return; }
      if (drop.ok && drop.gamble) { this.confirmGamble(d.id, drop.targetId); return; }
      if (drop.ok) { if (this.act(() => g.merge(d.id, drop.targetId), sfx.merge)) { this.selected = drop.targetId; this.render(); this.flashMerge(drop.targetId); } }
      else { sfx.error(); this.toast(drop.reason ?? '需要相同种类和等级才能合成。', true); this.render(); }
    } else if (drop.type === 'place' && drop.unequip) {
      this.act(() => g.unequip(d.id, drop.ok ? { x: drop.x, y: drop.y, rotated: d.rotated } : undefined), sfx.drop);
    } else if (drop.type === 'place') {
      if (!drop.ok) { sfx.error(); this.toast('这里放不下。', true); this.render(); return; }
      const it = g.find(d.id)!;
      const same = inBag(it) && it.x === drop.x && it.y === drop.y && it.rotated === d.rotated;
      if (!same && !this.act(() => g.move(d.id, drop.x, drop.y, d.rotated), sfx.drop)) return;
      else if (same) this.render();
    } else if (drop.type === 'wear') {
      if (!drop.ok) { sfx.error(); this.toast(drop.reason || '不能穿上', true); this.render(); return; }
      this.act(() => drop.slot === 'hand' ? g.equipHand(d.id) : g.equipArmor(d.id), sfx.drop);
    } else if (drop.type === 'reserve') {
      if (!drop.ok) { sfx.error(); this.toast(drop.reason || '放不进备用箱', true); this.render(); return; }
      if (itemPlace(g.find(d.id)!) === 'reserve') { this.render(); return; }
      this.act(() => g.toReserve(d.id), sfx.drop);
    } else { if (inBag(g.find(d.id)!)) this.act(() => g.toTemp(d.id), sfx.drop); else this.render(); }
  }
  private releaseDrag(render: boolean) {
    window.clearTimeout(this.holdTimer);
    if (!this.drag) return;
    this.drag.ghost?.remove();
    this.drag = null;
    if (render) this.render();
  }
  cancelDrag() { this.releaseDrag(true); }
  flashMerge(id: string) {
    document.querySelectorAll(`.item[data-id="${id}"]`).forEach(el => { el.classList.add('merged'); });
  }
  private confirmElementMerge(sourceId: string, targetId: string, gamble: boolean) {
    const g = this.game!;
    const src = g.find(sourceId); const tgt = g.find(targetId);
    if (!src || !tgt) return;
    const nameOf = elName;
    const ov = $('overlay');
    ov.className = 'show';
    ov.innerHTML = `<div class="modal"><h3>保留哪种元素</h3>
      <p>两件 ${ITEMS[tgt.kind].name} 元素不同。默认留下被拖到的那一件（主装备）。失败时主装备原样保留。</p>
      <div class="btns">
        <button class="btn gold" id="keepA">留下主装备：${nameOf(tgt.element)}</button>
        <button class="btn" id="keepB">留下拖来的：${nameOf(src.element)}</button>
        <button class="btn" id="keepNo">取消</button>
      </div></div>`;
    $('keepNo').onclick = () => { this.closeOverlay(); this.render(); };
    const go = (keep: 'source' | 'target') => {
      this.closeOverlay();
      if (gamble) { this.confirmGamble(sourceId, targetId, keep); return; }
      if (this.act(() => g.merge(sourceId, targetId, keep), sfx.merge)) {
        this.selected = targetId; this.render(); this.flashMerge(targetId);
      }
    };
    $('keepA').onclick = () => go('target');
    $('keepB').onclick = () => go('source');
  }
  private confirmGamble(sourceId: string, targetId: string, keep: 'source' | 'target' = 'target') {
    const g = this.game!;
    const it = g.find(sourceId);
    if (!it) return;
    const name = ITEMS[it.kind].name;
    const odds: GambleOdds = it.level === 4 ? LV5_GAMBLE : LV4_GAMBLE;
    const up = it.level + 1;
    const stat = it.level === 4 ? ITEMS[it.kind].values[4] : ITEMS[it.kind].values[3];
    const both = gamblePct(odds.loseBoth);
    const risk = both > 0
      ? `<b>${gamblePct(odds.success)}%</b> 合成一件 Lv${up}（数值 ${stat}），<b>${gamblePct(odds.loseOne)}%</b> 只消失拖过去的那一件，<b>${both}%</b> 两件都消失。`
      : `<b>${gamblePct(odds.success)}%</b> 合成一件 Lv${up}（数值 ${stat}），<b>${gamblePct(odds.loseOne)}%</b> 只消失拖过去的那一件，另一件 Lv${it.level} 留在原地。`;
    const vouchers = g.s.forgeVouchers ?? 0;
    const safe = it.level === 3
      ? `<button class="btn gold" id="forgeSafe">稳妥锻造${vouchers > 0 ? '（用锻造券）' : `（${FORGE_SAFE_COST}金）`}</button>`
      : '';
    const ov = $('overlay');
    ov.className = 'show';
    ov.innerHTML = `<div class="modal"><h3>${it.level === 4 ? '传说锻造' : '锻造'} Lv${up}</h3>
      <p>两件 <b>${name} Lv${it.level}</b>。冒险：${risk}拖过去的是材料，失败时先消失它。结果马上写入存档，刷新不能重来。腾出 ${ITEMS[it.kind].w * ITEMS[it.kind].h} 格。</p>
      <div class="btns">${safe}<button class="btn danger" id="gambleYes">冒险锻造</button><button class="btn" id="gambleNo">取消</button></div></div>`;
    $('gambleNo').onclick = () => { this.closeOverlay(); this.render(); };
    if (it.level === 3) $('forgeSafe').onclick = () => {
      this.closeOverlay();
      const r = g.safeForge(sourceId, targetId, keep);
      if (!r.ok) { sfx.error(); this.toast(r.msg, true); this.render(); return; }
      sfx.merge();
      this.selected = targetId;
      this.toast(r.msg ?? '稳妥锻成');
      this.render();
      this.flashMerge(targetId);
    };
    $('gambleYes').onclick = () => {
      this.closeOverlay();
      const r = g.gambleMerge(sourceId, targetId, keep);
      if (!r.ok) { sfx.error(); this.toast(r.msg, true); this.render(); return; }
      const msg = r.msg ?? '';
      const wiped = msg.includes('两件') && msg.includes('都消失');
      const lost = msg.includes('消失');
      const bag = $('bagWrap');
      if (wiped) {
        sfx.error();
        this.selected = null;
        bag?.classList.add('bagWipe');
        setTimeout(() => bag?.classList.remove('bagWipe'), 800);
      } else if (lost) {
        sfx.error();
        this.selected = targetId;
        bag?.classList.add('bagFail');
        setTimeout(() => bag?.classList.remove('bagFail'), 700);
      } else {
        sfx.merge();
        this.selected = targetId;
      }
      this.toast(msg, lost);
      this.render();
      if (!lost) this.flashMerge(targetId);
    };
  }
  // ---------- 战斗 ----------
  runBattle() {
    const g = this.game!;
    const trial = !!g.s.gearFight;
    this.selected = null; this.render();
    const c = g.makeCombat();
    const preview = trial
      ? gearTrialLevel(g.s.currentChapter, g.s.level)
      : (g.s.eliteActive ? applyEliteOverlay(getLevel(g.s.level), g.s.level) : getLevel(g.s.level));
    this.scene.setPreview(preview, trial ? g.s.maxHp : g.s.hp, g.s.maxHp, { eliteActive: trial ? false : !!g.s.eliteActive, levelNo: trial ? 1 : g.s.level });
    this.scene.setSpeed(this.speed);
    this.battleFlip = !this.battleFlip;
    const tune = trial ? (this.battleFlip ? 'battleA' : 'battleB') : g.s.eliteActive ? 'elite' : isBossLevel(g.s.level) ? (g.s.level >= 50 ? 'final' : 'boss') : (this.battleFlip ? 'battleA' : 'battleB');
    setBgm(tune);
    this.scene.start(c, g.s.items.map(i => ({ ...i })), {
      onEvents: (ev, cs) => this.onBattleEvents(ev, cs),
      onEnd: cs => this.endBattle(cs),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  onBattleEvents(ev: CombatEvent[], c: CombatState) {
    for (const e of ev) {
      if (e.type === 'weapon' || e.type === 'shield' || e.type === 'potion') {
        document.querySelectorAll(`#bag .item[data-id="${e.itemId}"]`).forEach(el => { el.classList.remove('fire'); void (el as HTMLElement).offsetWidth; el.classList.add('fire'); });
        if (e.type === 'weapon') maybeShout(this.game?.s.heroClass ?? 'merchant');
        (e.type === 'weapon' ? (e.heavy ? sfx.heavy : sfx.hit) : e.type === 'shield' ? sfx.shield : sfx.heal)();
        if (e.type === 'potion') document.querySelectorAll(`#bag .item[data-id="${e.itemId}"]`).forEach(el => el.classList.add('used'));
      } else if (e.type === 'monsterAttack') { (e.crit ? sfx.crit : sfx.hurt)(); monsterCue(getLevel(this.game?.s.level ?? 1).monster); }
      else if (e.type === 'fireBreath') sfx.fire();
      else if (e.type === 'enrage' || e.type === 'bossHaste') sfx.enrage();
    }
    const hpEl = document.querySelector('.hud .hp b, #hud .hp b'); if (hpEl) hpEl.textContent = `${c.hp}/${c.maxHp}`;
    const bar = document.querySelector('#hud .hpbar i') as HTMLElement | null; if (bar) bar.style.width = (c.hp / c.maxHp) * 100 + '%';
  }
  endBattle(c: CombatState) {
    const g = this.game!;
    const trial = c.encounterKind === 'gearTrial';
    const r = g.settle(c); if (!r.ok) return; // 只结算一次
    if (trial) {
      this.toast(r.msg || (c.won ? '寻找套装胜利。主线没有变化。' : '寻找套装失败。主线生命和关卡没有变。'), !c.won);
      setBgm('prep');
      this.render();
      return;
    }
    const s = g.s; const l = s.last!;
    this.render();
    if (!c.won) { setBgm('lose'); this.showEnd(false); return; }
    if (isBossStory(s.pendingStoryId)) { this.playBossCinema(() => this.finishBossStory()); return; }
    setBgm('win');
    window.setTimeout(() => { if (!this.cinemaOn) setBgm('prep'); }, 1700);
    if (s.phase === 'loot') this.showLoot();
    else this.showEnd(true);
    void l;
  }
  /** 结算已经写入。演出结束或跳过都走这里，不再发一次奖励。 */
  private finishBossStory() {
    const g = this.game; if (!g) return;
    if (isBossStory(g.s.pendingStoryId)) g.dismissStory();
    duckBgm(false);
    if (g.s.phase === 'victory') { setBgm('final'); this.showEnd(true); return; }
    setBgm('prep');
    if (g.s.phase === 'loot' && g.s.loot && !g.s.loot.claimed) this.showLoot();
    else this.showPendingModals();
  }
  private playOpening(hero: typeof this.heroClass, onDone: () => void) {
    this.playCinema(openingBeats(hero), onDone, hero);
  }
  private playBossCinema(onDone: () => void) {
    const level = this.game?.s.level ?? 0;
    const beat = bossCinema(level);
    if (!beat) { onDone(); return; }
    const hero = this.game?.s.heroClass ?? this.heroClass;
    this.playCinema([beat], onDone, hero);
  }
  private playCinema(beats: { id: string; ms: number; line: string; look: string; title: string; plate?: string }[], onDone: () => void, hero: typeof this.heroClass) {
    if (this.cinemaOn) return;
    this.cinemaOn = true;
    if (this.scene) this.scene.paused = true;
    setBgm('story');
    duckBgm(true);
    const root = $('cinema');
    root.hidden = false;
    let i = 0;
    let timer = 0;
    let epoch = 0;
    let finished = false;
    let lineStop = () => {};
    const warm = (plate?: string) => {
      if (!plate) return;
      const img = new Image();
      img.decoding = 'async';
      img.src = webAsset(`art/cinema/${plate}.jpg`);
    };
    const finish = () => {
      if (finished) return;
      finished = true;
      epoch++;
      window.clearTimeout(timer);
      lineStop();
      lineStop = () => {};
      root.hidden = true;
      root.innerHTML = '';
      this.cinemaOn = false;
      duckBgm(false);
      if (this.scene && !document.hidden) this.scene.paused = false;
      onDone();
    };
    const show = () => {
      if (finished) return;
      const ep = ++epoch;
      window.clearTimeout(timer);
      lineStop();
      lineStop = () => {};
      const b = beats[i];
      if (!b) { finish(); return; }
      warm(beats[i + 1]?.plate);
      const nextVoice = voiceBase(beats[i + 1]?.id ?? '', hero);
      if (nextVoice) prefetchVoice(nextVoice);
      root.innerHTML = `<div class="cinema ${b.look}" role="dialog" aria-label="${b.id}">
        <div class="cinStage"><img class="cinPlate" alt=""><div class="cinShade"></div><div class="cinFx" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div></div>
        <div class="cinLayer cinBack"></div><div class="cinLayer cinMid"></div><div class="cinLayer cinFront"></div>
        <div class="cinCard"><div class="cinId">${b.id} · ${b.title}</div><p class="cinLine">${b.line}</p>
        <div class="btns"><button class="btn" id="cinNext">继续</button><button class="btn" id="cinSkip">跳过</button></div></div>
      </div>`;
      const stage = root.querySelector('.cinema') as HTMLElement;
      const img = root.querySelector('.cinPlate') as HTMLImageElement;
      if (!b.plate) stage.classList.add('noPlate');
      else {
        img.onerror = () => stage.classList.add('noPlate');
        img.onload = () => stage.classList.add('hasPlate');
        img.src = webAsset(`art/cinema/${b.plate}.jpg`);
      }
      const spoken = voiceBase(b.id, hero);
      let voiceDone = !spoken;
      let minDone = false;
      const maybe = () => {
        if (finished || ep !== epoch) return;
        if (minDone && voiceDone) { i++; show(); }
      };
      if (spoken) {
        const v = playVoice(spoken);
        lineStop = v.stop;
        v.done.then(() => { voiceDone = true; maybe(); });
      }
      $('cinSkip').onclick = () => finish();
      $('cinNext').onclick = () => { if (ep !== epoch) return; i++; show(); };
      timer = window.setTimeout(() => { minDone = true; maybe(); }, b.ms);
    };
    show();
  }
  showLoot() {
    const g = this.game!, s = g.s, l = s.last!, loot = s.loot!;
    const ov = $('overlay'); ov.className = 'show';
    const midBanner = isMidAct(l.level)
      ? `<div class="warn" style="margin:8px 0">⚔ 中段折转：王库只是收税站……黄金心脏仍在更深处。继续第21关。</div>`
      : '';
    ov.innerHTML = `<div class="modal"><h2>🏆 第${l.level}关胜利！</h2>
      ${midBanner}
      <div class="goldGain"><span class="coin big"></span> +${l.baseGold + l.bagGold} 金币 <small>（胜利${l.baseGold}${l.bagGold ? ` + 钱袋${l.bagGold}` : ''}）</small></div>
      <div class="muted">生命恢复 ${s.relics.includes('K02') ? 0 : winHealAmount(s.maxHp, isBossLevel(l.level))} 点（当前 ${s.hp}/${s.maxHp}）</div>
      ${this.statsHtml(l)}
      <h3>选择一件战利品（三选一）</h3>
      <div class="lootRow">${loot.options.map((o, i) => { const d = ITEMS[o.kind]; return `<button class="lootCard" data-loot="${i}"><div class="detIcon lv${o.level}" style="--c:${d.color}">${iconSvg(o.kind)}<div class="lvBadge">Lv${o.level}</div></div><div class="sName">${d.name} Lv${o.level}</div><div class="sDesc">${d.desc(d.values[o.level - 1])}</div></button>`; }).join('')}</div>
      <div class="btns" style="margin-top:12px">${l.level >= 21
        ? `<button class="btn" id="skipLoot">回收：+4金币${s.relics.includes('A05') ? '（空袋节俭+2）' : ''}</button><button class="btn" id="restLoot">休整：恢复4生命${s.relics.includes('A05') ? '（+2金）' : ''}</button>`
        : `<button class="btn" id="skipLoot">回收物资（放弃装备，+2金币）</button>`}</div></div>`;
    ov.querySelectorAll<HTMLElement>('[data-loot]').forEach(b => (b.onclick = () => this.guard(() => {
      ov.querySelectorAll('button').forEach(x => ((x as HTMLButtonElement).disabled = true));
      if (this.act(() => g.claimLoot(+b.dataset.loot!), sfx.coin)) { this.closeOverlay(); this.afterLootAdvance(); }
    })));
    const sk = document.getElementById('skipLoot');
    if (sk) sk.onclick = () => this.guard(() => {
      if (this.act(() => g.skipLoot('recycle'), sfx.coin)) { this.closeOverlay(); this.afterLootAdvance(); }
    });
    const rl = document.getElementById('restLoot');
    if (rl) rl.onclick = () => this.guard(() => {
      if (this.act(() => g.skipLoot('rest'))) { this.closeOverlay(); this.afterLootAdvance(); }
    });
  }
  afterLootAdvance() {
    const g = this.game!;
    this.scene.setPreview(g.s.eliteActive ? applyEliteOverlay(getLevel(g.s.level), g.s.level) : getLevel(g.s.level), g.s.hp, g.s.maxHp, { eliteActive: !!g.s.eliteActive, levelNo: g.s.level });
    this.render();
    if (g.s.phase === 'camp') this.showCamp();
    else this.showPendingModals();
  }
  showCamp() {
    const g = this.game!, s = g.s;
    const ov = $('overlay'); ov.className = 'show';
    const final = s.campKind === 'final';
    const forgeables = g.bagItems.filter(i => i.level < 3);
    const restHeal = Math.min(s.maxHp - s.hp, Math.floor(s.maxHp * 0.3));
    const reroll = s.doctrineRerollChoices && !s.storyFlags.doctrineRerollUsed
      ? `<div class="warn" style="margin-top:10px">⚔ 专精免费重选（仅一次，不占营地服务）：当前【${DOCTRINES[s.doctrine as keyof typeof DOCTRINES]?.name ?? '无'}】
         <div class="lootRow">${s.doctrineRerollChoices.map(id => { const d = DOCTRINES[id as keyof typeof DOCTRINES]; return `<button class="btn small" data-reroll="${id}" title="${esc(d.desc)}">换为${d.name}</button>`; }).join('')}
         <button class="btn small" data-reroll="">保留现有</button></div></div>` : '';
    ov.innerHTML = `<div class="modal"><h2>${final ? '🔥 最终整备站' : '🏕️ 章节营地'}</h2>
      <p class="muted">${final ? '第49关后：选择一项服务（休息／锻造／移除负担），商店在第50关准备阶段照常开放。' : '本章只能使用一次主服务，然后离开；离开后写入章节检查点（回档不会再给一次服务）。'}</p>
      <div class="statList"><div><span>生命</span><b>${s.hp}/${s.maxHp}</b></div><div><span>金币</span><b>${s.gold}</b></div>
      <div><span>主服务</span><b>${s.campServiceUsed ? '已用' : '可用'}</b></div></div>
      ${reroll}
      <div class="btns col" style="gap:8px;margin-top:12px">
        <button class="btn gold" id="campRest" ${s.campServiceUsed ? 'disabled' : ''}>休息：恢复${restHeal}生命（最大生命30%）${s.relics.includes('A06') ? ' · 修补线下场+5' : ''}</button>
        <div class="muted">锻造：1→2 ${g.forgeCost(1) ? g.forgeCost(1) + '金' : '免费'} / 2→3 ${g.forgeCost(2) ? g.forgeCost(2) + '金' : '免费'}${final && s.questStates.forge === 'stopped_clean' ? '（老铆回报：本次锻造免费）' : ''}</div>
        <div class="lootRow">${forgeables.map(i => `<button class="btn small" data-forge="${i.id}" ${s.campServiceUsed || s.gold < g.forgeCost(i.level) ? 'disabled' : ''}>${itemLabel(i)} → Lv${i.level + 1}</button>`).join('') || '<span class="muted">背包内无可锻造装备</span>'}</div>
        <button class="btn" id="campBurden" ${s.campServiceUsed || !s.items.some(i => i.kind === 'burden') || s.gold < 15 ? 'disabled' : ''}>
          移除负担（15金）${s.items.some(i => i.kind === 'burden') ? '' : ' · 无负担物'}</button>
        <button class="btn gold big" id="campLeave">${final ? '前往黄金心脏' : '离开营地'}</button>
      </div></div>`;
    $('campRest').onclick = () => this.guard(() => { if (this.act(() => g.campRest())) this.showCamp(); });
    const burBtn = document.getElementById('campBurden');
    if (burBtn) burBtn.onclick = () => this.guard(() => { if (this.act(() => g.campRemoveBurden())) this.showCamp(); });
    ov.querySelectorAll<HTMLElement>('[data-forge]').forEach(b => b.onclick = () => this.guard(() => {
      if (this.act(() => g.campForge(b.dataset.forge!))) this.showCamp();
    }));
    ov.querySelectorAll<HTMLElement>('[data-reroll]').forEach(b => b.onclick = () => this.guard(() => {
      if (this.act(() => g.rerollDoctrine(b.dataset.reroll || null))) this.showCamp();
    }));
    $('campLeave').onclick = () => this.guard(() => {
      if (this.act(() => g.campLeave())) {
        this.closeOverlay();
        this.scene.setPreview(g.s.eliteActive ? applyEliteOverlay(getLevel(g.s.level), g.s.level) : getLevel(g.s.level), g.s.hp, g.s.maxHp, { eliteActive: !!g.s.eliteActive, levelNo: g.s.level });
        this.render(); this.showPendingModals();
      }
    });
  }
  showEnd(won: boolean) {
    const g = this.game!, s = g.s, l = s.last!;
    const main = Object.entries(s.stats.contribution).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const ov = $('overlay'); ov.className = 'show';
    const canCheckpoint = !won && s.mode === 'story' && !!s.chapterCheckpoint;
    const end = s.endingChoice ? ENDING_CHOICES[s.endingChoice as EndingId] : null;
    const winTitle = won ? (end ? `👑 通关 · ${end.title}` : '👑 通关！黄金心脏已沉寂，你走完了五十关旅程！') : '💀 冒险失败';
    ov.innerHTML = `<div class="modal ${won ? 'win' : 'lose'}"><h2>${winTitle}</h2>
      ${won && end ? `<p style="line-height:1.6">${esc(end.finale)}</p>` : ''}
      ${won && s.completion ? `<p class="muted">记录：${s.completion.type === 'pure' ? '无援助故事通关' : s.completion.type === 'assisted' ? '援助通关（与纯净记录分开）' : '单命远征通关'} · 重试 ${s.completion.retries} 次</p>` : ''}${won ? '' : `<p class="warn">${esc(l.reason)}</p>`}
      <div class="statList"><div><span>到达关卡</span><b>第${l.level}/${s.campaignLength ?? CAMPAIGN_LENGTH}关</b></div><div><span>击败怪物</span><b>${s.stats.kills}</b></div>
      <div><span>累计获得金币</span><b>${s.stats.goldEarned}</b></div><div><span>剩余金币</span><b>${s.gold}</b></div></div>
      <h3>主要装备</h3><div class="equipRow">${g.bagItems.map(i => `<div class="mini lv${i.level}" style="--c:${ITEMS[i.kind].color}">${iconSvg(i.kind)}<span>${itemLabel(i)}</span></div>`).join('')}</div>
      <h3>累计战斗贡献</h3><div class="statList">${main.map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('') || '<div>无</div>'}</div>
      <h3>最后一战</h3>${this.statsHtml(l)}
      <div class="btns">
        ${canCheckpoint ? `<button class="btn gold big" id="toCheckpoint">回本章起点</button><button class="btn big" id="toAssist" title="回满生命，并可做一次等价值装备交换；本局记为援助通关">使用援助整备后重试</button>` : ''}
        ${!won ? `<button class="btn big" id="endCampaign">结束战役</button>` : ''}
        <button class="btn ${won || !canCheckpoint ? 'gold' : ''} big" id="again">重新开始</button>
        <button class="btn big" id="toTitle">返回标题</button>
      </div></div>`;
    $('again').onclick = () => { sfx.click(); this.showRestartChoice(() => this.showEnd(won)); };
    $('toTitle').onclick = () => { this.showTitle(); };
    const endBtn = document.getElementById('endCampaign');
    if (endBtn) endBtn.onclick = () => { sfx.click(); this.showTitle('战役已结束。'); };
    const asBtn = document.getElementById('toAssist');
    if (asBtn) asBtn.onclick = () => this.guard(() => {
      if (this.act(() => g.retryWithAssistance())) {
        this.closeOverlay();
        this.scene.setPreview(g.s.eliteActive ? applyEliteOverlay(getLevel(g.s.level), g.s.level) : getLevel(g.s.level), g.s.hp, g.s.maxHp, { eliteActive: !!g.s.eliteActive, levelNo: g.s.level });
        this.render(); this.showAssistSwap();
      }
    });
    const cpBtn = document.getElementById('toCheckpoint');
    if (cpBtn) cpBtn.onclick = () => this.guard(() => {
      if (this.act(() => g.restoreChapterCheckpoint())) {
        this.closeOverlay();
        this.scene.setPreview(g.s.eliteActive ? applyEliteOverlay(getLevel(g.s.level), g.s.level) : getLevel(g.s.level), g.s.hp, g.s.maxHp, { eliteActive: !!g.s.eliteActive, levelNo: g.s.level });
        this.render();
      }
    });
  }

  /** 依次弹出剧情 / 符文 / 专精 / 结局选择 */
  showPendingModals() {
    const g = this.game; if (!g) return;
    const s = g.s;
    if (s.pendingRoute) { this.showRoutePick(); return; }
    if (s.pendingEventId) { this.showEventModal(); return; }
    if (s.pendingUpgrade) { this.showUpgradePick(); return; }
    if (isBossStory(s.pendingStoryId)) { this.playBossCinema(() => this.finishBossStory()); return; }
    if (s.pendingStoryId) { this.showStoryModal(s.pendingStoryId); return; }
    if (s.pendingRuneChoices?.length) { this.showRunePick(); return; }
    if (s.pendingDoctrineChoices?.length) { this.showDoctrinePick(); return; }
    if (s.pendingRelicChoices?.length) { this.showRelicPick(); return; }
    if (s.pendingChoice) { this.showQuestChoice(); return; }
    if (s.level === 45 && !s.endingChoice) { this.showEndingPick(); return; }
  }
  showRoutePick() {
    const g = this.game!, s = g.s, lv = getLevel(s.level);
    const base = MONSTER_BASE[lv.monster];
    const ov = $('overlay'); ov.className = 'show';
    ov.innerHTML = `<div class="modal"><h2>🗺 路线选择 · 第${s.level}关</h2>
      <p style="line-height:1.6">本关可选<strong>普通</strong>或<strong>精英</strong>分支。精英：敌人生命×1.25、胜利金币×1.4，并额外三选一遗物；敌人机制更强。</p>
      <p class="muted">普通对手：${esc(lv.title)}（${esc(base?.name ?? lv.monster)}）${lv.mechSummary ? ' · ' + esc(lv.mechSummary) : ''}</p>
      <div class="btns col" style="gap:8px;margin-top:12px">
        <button class="btn gold big" id="routeNormal">普通路线</button>
        <button class="btn big" id="routeElite">精英路线（高风险高回报）</button>
      </div></div>`;
    $('routeNormal').onclick = () => this.guard(() => {
      if (this.act(() => g.chooseRoute(false))) {
        this.closeOverlay();
        this.scene.setPreview(getLevel(g.s.level), g.s.hp, g.s.maxHp, { eliteActive: false, levelNo: g.s.level });
        this.render(); this.showPendingModals();
      }
    });
    $('routeElite').onclick = () => this.guard(() => {
      if (this.act(() => g.chooseRoute(true))) {
        this.closeOverlay();
        const lv = applyEliteOverlay(getLevel(g.s.level), g.s.level);
        this.scene.setPreview(lv, g.s.hp, g.s.maxHp, { eliteActive: true, levelNo: g.s.level });
        this.render(); this.showPendingModals();
      }
    });
  }
  showEventModal() {
    const g = this.game!, s = g.s;
    const def = EVENTS_MAP[s.pendingEventId!];
    if (!def) { g.skipEvent(); this.render(); this.showPendingModals(); return; }
    const ov = $('overlay'); ov.className = 'show';
    ov.innerHTML = `<div class="modal"><h2>🎲 ${esc(def.name)}</h2>
      <p style="line-height:1.6;white-space:pre-wrap">${esc(def.body)}</p>
      <div class="lootRow">${def.options.map(o => {
        const bad = (o.cost?.gold && s.gold < o.cost.gold) || (o.cost?.hp && s.hp - o.cost.hp < 1);
        const cost = [o.cost?.gold ? `${o.cost.gold}金` : '', o.cost?.hp ? `${o.cost.hp}生命` : ''].filter(Boolean).join(' / ');
        return `<button class="lootCard" data-ev="${o.id}" ${bad ? 'disabled' : ''}><div class="sName">${esc(o.label)}</div>
          <div class="sDesc">${esc(o.desc)}${cost ? `（花费 ${cost}）` : ''}${bad ? ' · 无法支付' : ''}</div></button>`;
      }).join('')}</div></div>`;
    ov.querySelectorAll<HTMLElement>('[data-ev]').forEach(b => b.onclick = () => this.guard(() => {
      if (this.act(() => g.resolveEvent(b.dataset.ev!))) { this.closeOverlay(); this.render(); this.showPendingModals(); }
    }));
  }
  showUpgradePick() {
    const g = this.game!, s = g.s, pu = s.pendingUpgrade!;
    const cands = s.items.filter(i => i.kind !== 'burden' && i.level === pu.fromLevel);
    const ov = $('overlay'); ov.className = 'show';
    ov.innerHTML = `<div class="modal"><h2>⬆ 选择升级装备</h2>
      <p class="muted">将一件 ${pu.fromLevel} 级装备升到 ${pu.fromLevel + 1} 级。</p>
      <div class="lootRow">${cands.map(i =>
        `<button class="lootCard" data-up="${i.id}"><div class="sName">${esc(itemLabel(i))}</div><div class="sDesc">→ Lv${i.level + 1}</div></button>`
      ).join('') || '<p class="muted">没有可升级的装备。请整理背包后再试（可点跳过放弃）。</p>'}</div>
      <div class="btns"><button class="btn" id="upSkip">放弃升级</button></div></div>`;
    ov.querySelectorAll<HTMLElement>('[data-up]').forEach(b => b.onclick = () => this.guard(() => {
      if (this.act(() => g.confirmUpgrade(b.dataset.up!))) { this.closeOverlay(); this.render(); this.showPendingModals(); }
    }));
    $('upSkip').onclick = () => this.guard(() => {
      if (this.act(() => g.skipUpgrade())) { this.closeOverlay(); this.render(); this.showPendingModals(); }
    });
  }
  showQuestChoice() {
    const g = this.game!, s = g.s, pc = s.pendingChoice!;
    const def = QUEST_CHOICES[pc.id as ChoiceId];
    const ov = $('overlay'); ov.className = 'show';
    ov.innerHTML = `<div class="modal"><h2>📜 ${esc(def.title)}</h2><p style="line-height:1.6">${esc(def.body)}</p>
      <div class="lootRow">${def.options.map(o => {
        const bad = (o.cost.gold && s.gold < o.cost.gold) || (o.cost.hp && s.hp - o.cost.hp < 1);
        return `<button class="lootCard" data-choice="${o.id}" ${bad ? 'disabled' : ''}><div class="sName">${esc(o.label)}</div><div class="sDesc">${esc(o.desc)}${bad ? '（当前无法支付）' : ''}</div></button>`;
      }).join('')}</div></div>`;
    ov.querySelectorAll<HTMLElement>('[data-choice]').forEach(b => b.onclick = () => this.guard(() => {
      if (this.act(() => g.resolveChoice(b.dataset.choice!))) { this.closeOverlay(); this.render(); this.showPendingModals(); }
    }));
  }
  showAssistSwap() {
    const g = this.game!, s = g.s, a = s.assist;
    if (!a || a.used) { this.showPendingModals(); return; }
    const ov = $('overlay'); ov.className = 'show';
    ov.innerHTML = `<div class="modal"><h2>🤝 援助整备</h2><p class="muted">生命已回满。可选一次交换：候选基础价值不高于被换装备；也可以不换。重复援助只回到同一起点，不叠加。</p>
      <div class="lootRow">${a.options.map((o, i) => `<div class="lootCard" style="cursor:default"><div class="sName">${ITEMS[o.kind].name} Lv${o.level}</div>
        <div style="display:flex;flex-direction:column;gap:4px;margin-top:6px">${g.bagItems.filter(it => buyPrice(o.kind, o.level) <= buyPrice(it.kind, it.level)).slice(0, 5)
          .map(it => `<button class="btn small" data-as="${i}" data-item="${it.id}">替换 ${itemLabel(it)}</button>`).join('') || '<span class="muted">无可等价替换的装备</span>'}</div></div>`).join('')}</div>
      <div class="btns"><button class="btn gold" id="asSkip">不交换</button></div></div>`;
    ov.querySelectorAll<HTMLElement>('[data-as]').forEach(b => b.onclick = () => this.guard(() => {
      if (this.act(() => g.assistSwap(b.dataset.item!, +b.dataset.as!))) { this.closeOverlay(); this.render(); this.showPendingModals(); }
    }));
    $('asSkip').onclick = () => { this.closeOverlay(); this.render(); this.showPendingModals(); };
  }
  showStoryModal(id: string) {
    const g = this.game!;
    const endingCtx = id.startsWith('ending_') ? {
      ending: id.slice('ending_'.length) as EndingId,
      heroClass: g.s.heroClass,
      questStates: g.s.questStates,
      npcStates: g.s.npcStates,
    } : undefined;
    const { title, body } = resolveStoryText(id, { heroClass: g.s.heroClass, endingCtx });
    const ov = $('overlay'); ov.className = 'show';
    ov.innerHTML = `<div class="modal"><h2>📜 ${esc(title)}</h2>${npcPortraitHtml(body)}<p style="line-height:1.6;white-space:pre-wrap">${esc(body)}</p><div style="clear:both"></div>
      <div class="btns"><button class="btn gold big" id="storyOk">继续</button></div></div>`;
    const spoken = id.startsWith('boss_pre_') ? voiceBase(id, g.s.heroClass) : null;
    const line = spoken ? playVoice(spoken) : null;
    if (spoken && g.s.level >= 50) prefetchBgm('final');
    else if (spoken) prefetchBgm('boss');
    // 跳过文字不跳过选择：只清除 pendingStoryId。点继续会停掉这一句。
    $('storyOk').onclick = () => {
      line?.stop();
      g.dismissStory(); this.closeOverlay(); this.render(); this.showPendingModals();
    };
  }
  showStoryLog() {
    const g = this.game;
    if (!g) return;
    const ids = g.s.storyLog ?? [];
    const rows = ids.length ? ids.map(id => {
      const endingCtx = id.startsWith('ending_') ? {
        ending: id.slice('ending_'.length) as EndingId,
        heroClass: g.s.heroClass, questStates: g.s.questStates, npcStates: g.s.npcStates,
      } : undefined;
      const { title, body } = resolveStoryText(id, { heroClass: g.s.heroClass, endingCtx });
      return `<div style="margin:8px 0;padding:8px;border:1px solid #3a3050;border-radius:8px"><b>${esc(title)}</b><div class="muted" style="margin-top:4px;line-height:1.5">${esc(body)}</div></div>`;
    }).join('') : '<p class="muted">尚无已记录的剧情。</p>';
    const ov = $('overlay'); ov.className = 'show';
    ov.innerHTML = `<div class="modal" style="max-height:80vh;overflow:auto"><h2>📜 剧情日志</h2>
      <p class="muted">已见主线可回看；跳过文字不会跳过选择或标记。</p>
      ${rows}
      <div class="btns"><button class="btn gold" id="logClose">关闭</button></div></div>`;
    $('logClose').onclick = () => { this.closeOverlay(); this.render(); this.showPendingModals(); };
  }
  showRunePick() {
    const g = this.game!, s = g.s;
    const choices = s.pendingRuneChoices ?? [];
    const hosts = s.items;
    const ov = $('overlay'); ov.className = 'show';
    ov.innerHTML = `<div class="modal"><h2>✨ 铭刻符文（三选一）</h2>
      <p class="muted">最多2枚；可附着到合法装备，或暂存（暂存不生效）。</p>
      <div class="lootRow">${choices.map(id => {
        const d = RUNES[id as RuneId]; if (!d) return '';
        return `<div class="lootCard" style="cursor:default"><div class="sName">${d.name}</div><div class="sDesc">${d.desc}</div>
          <div style="display:flex;flex-direction:column;gap:4px;margin-top:8px">
            ${hosts.filter(w => runeLegalForItem(id as RuneId, w.kind)).slice(0, 5).map(w =>
              `<button class="btn small" data-rune="${id}" data-item="${w.id}">附着到 ${itemLabel(w)}</button>`
            ).join('') || '<span class="muted">无合法装备</span>'}
            <button class="btn small" data-rune="${id}" data-item="">暂存（不附着）</button>
          </div></div>`;
      }).join('')}</div></div>`;
    ov.querySelectorAll<HTMLElement>('[data-rune]').forEach(b => b.onclick = () => this.guard(() => {
      const rid = b.dataset.rune!, iid = b.dataset.item || null;
      if (this.act(() => g.chooseRune(rid, iid || null))) {
        this.closeOverlay(); this.render(); this.showPendingModals();
      }
    }));
  }
  showDoctrinePick() {
    const g = this.game!, s = g.s;
    const choices = s.pendingDoctrineChoices ?? [];
    const ov = $('overlay'); ov.className = 'show';
    ov.innerHTML = `<div class="modal"><h2>⚔ 战术专精（三选一）</h2>
      <p class="muted">本局只能保留一项专精。</p>
      <div class="lootRow">${choices.map(id => {
        const d = DOCTRINES[id as keyof typeof DOCTRINES]; if (!d) return '';
        return `<button class="lootCard" data-doc="${id}"><div class="sName">${d.name}</div><div class="sDesc">${d.desc}</div></button>`;
      }).join('')}</div></div>`;
    ov.querySelectorAll<HTMLElement>('[data-doc]').forEach(b => b.onclick = () => this.guard(() => {
      if (this.act(() => g.chooseDoctrine(b.dataset.doc!))) {
        this.closeOverlay(); this.render(); this.showPendingModals();
      }
    }));
  }
  showRelicPick() {
    const g = this.game!, s = g.s;
    const choices = s.pendingRelicChoices ?? [];
    const ov = $('overlay'); ov.className = 'show';
    ov.innerHTML = `<div class="modal"><h2>🔮 遗物（三选一，最多3件）</h2>
      <p class="muted">当前持有 ${s.relics.length}/3</p>
      <div class="lootRow">${choices.map(id => {
        const d = V3_RELICS[id as RelicId]; if (!d) return '';
        return `<button class="lootCard" data-rel="${id}"><div class="sName">${d.name}</div><div class="sDesc">${d.desc}${d.implemented ? '' : '（效果待深化）'}</div></button>`;
      }).join('')}</div>
      <div class="btns"><button class="btn" id="skipRelic">放弃</button></div></div>`;
    ov.querySelectorAll<HTMLElement>('[data-rel]').forEach(b => b.onclick = () => this.guard(() => {
      if (this.act(() => g.chooseRelic(b.dataset.rel!))) {
        this.closeOverlay(); this.render(); this.showPendingModals();
      }
    }));
    const sk = document.getElementById('skipRelic');
    if (sk) sk.onclick = () => this.guard(() => {
      if (this.act(() => g.skipRelic())) { this.closeOverlay(); this.render(); this.showPendingModals(); }
    });
  }
  showEndingPick() {
    const g = this.game!, s = g.s;
    const av = endingAvailability(s);
    const ov = $('overlay'); ov.className = 'show';
    ov.innerHTML = `<div class="modal"><h2>⚖ 最终处置原则</h2>
      <p class="muted">第45关：确认后不可无代价更改；三种方案都必须打第50关。当前证据 ${evidenceOf(s.questStates)} 份；商队：${s.questStates.rescue ?? '未知'}；工坊：${s.questStates.forge ?? '未知'}。</p>
      <div class="lootRow">${ENDING_IDS.map(id => {
        const e = ENDING_CHOICES[id]; const a = av[id];
        return `<button class="lootCard" data-end="${id}" ${a.ok ? '' : 'disabled'}><div class="sName">${e.title}</div><div class="sDesc">${e.summary}<br/><span class="muted">${esc(e.conditionHint)}</span>${a.ok ? '' : `<br><b>不可选：</b>${esc(a.reason ?? '')}`}</div></button>`;
      }).join('')}</div></div>`;
    ov.querySelectorAll<HTMLElement>('[data-end]').forEach(b => b.onclick = () => this.guard(() => {
      if (!confirm('确认后不能更改，确定吗？')) return;
      if (this.act(() => g.chooseEnding(b.dataset.end as EndingId))) {
        this.closeOverlay(); this.render(); this.showPendingModals();
      }
    }));
  }
  showSettings() {
    const ov = $('overlay'); ov.className = 'show';
    ov.innerHTML = `<div class="modal small"><h2>⚙ 设置</h2>
      <p class="muted">版本 3.8.4 · 平衡 ${BALANCE_VERSION}</p>
      <label class="toggle"><input type="checkbox" id="sSound" ${this.settings.sound ? 'checked' : ''}/> 音效</label>
      <label class="voiceSlide">语音 <input type="range" id="sVoice" min="0" max="100" value="${this.settings.voice}"></label>
      <div class="btns col"><button class="btn" id="sOpen">回看开场</button><button class="btn" id="sTut">重新查看引导</button><button class="btn" id="sTitle">返回标题（进度已自动保存）</button>
      <button class="btn danger" id="sRestart">放弃并重新开始</button><button class="btn gold" id="sClose">关闭</button></div></div>`;
    ($('sSound') as HTMLInputElement).onchange = e => { this.settings.sound = (e.target as HTMLInputElement).checked; this.saveSettings(); this.render(); };
    ($('sVoice') as HTMLInputElement).oninput = e => {
      this.settings.voice = Number((e.target as HTMLInputElement).value);
      setVoiceVolume(this.settings.voice / 100);
      this.saveSettings();
    };
    $('sClose').onclick = () => { this.closeOverlay(); const ph = this.game?.s.phase; if (ph === 'loot') this.showLoot(); else if (ph === 'camp') this.showCamp(); else if (ph === 'victory' || ph === 'defeat') this.showEnd(ph === 'victory'); else if (!this.game) this.showTitle(); };
    $('sOpen').onclick = () => { this.closeOverlay(); this.playOpening(this.game?.s.heroClass ?? this.heroClass, () => this.showSettings()); };
    $('sTut').onclick = () => { this.closeOverlay(); this.tutStep = 0; this.render(); };
    $('sTitle').onclick = () => { if (this.game?.s.phase === 'battle') { this.scene.combat = null; } this.showTitle(); };
    $('sRestart').onclick = () => this.showRestartChoice(() => this.showSettings());
  }
  /** 停掉战斗回调和正在说的话，免得旧职业的语音在新人开局后才播出来。 */
  private silenceRun() {
    stopVoice();
    resetShouts();
    duckBgm(false);
    if (this.scene) {
      this.scene.combat = null;
      this.scene.paused = false;
    }
    const root = document.getElementById('cinema');
    if (root) { root.hidden = true; root.innerHTML = ''; }
    this.cinemaOn = false;
  }
  private abandonToTitle() {
    this.silenceRun();
    this.game = null;
    this.selected = null;
    clearSave(localStorage);
    this.showTitle();
  }
  /** 局中或战败：先问是换职业，还是用当前职业重开。音量等设置不动。 */
  private showRestartChoice(back: () => void) {
    const current = (this.game?.s.heroClass ?? this.heroClass) as HeroClassId;
    const name = V2_CLASSES.find(c => c.id === current)?.name ?? '';
    const ov = $('overlay');
    ov.className = 'show';
    ov.innerHTML = `<div class="modal"><h3>重新开始</h3>
      <p>现在是<b>${esc(name)}</b>。换职业或重开都会丢掉这一局的关卡、背包、临时包裹、金币和遗物。音量和音效设置会留下。</p>
      <div class="btns col">
        <button class="btn gold big" id="restartPick">重新选择职业</button>
        <button class="btn big" id="restartSame">同职业再来</button>
        <button class="btn" id="restartBack">返回</button>
      </div></div>`;
    $('restartPick').onclick = () => {
      const plan = restartTarget('reselect', current);
      if (plan.screen === 'title') this.abandonToTitle();
    };
    $('restartSame').onclick = () => {
      const plan = restartTarget('same', current);
      this.heroClass = (plan.heroClass ?? current) as HeroClassId;
      this.scene?.setHeroClass(this.heroClass);
      sfx.click();
      this.newGame();
    };
    $('restartBack').onclick = () => back();
  }
}
export type { ItemKind, Level };
