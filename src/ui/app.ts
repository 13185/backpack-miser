import { npcPortraitHtml } from '../art/npcArt';
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
import { buyPrice, expansionLabel, expansionOffer, refreshCost, sellPrice } from '../systems/economy';
import { Game, applyBossPrep, endingAvailability, itemLabel, newGameState, type Result } from '../systems/game';
import { QUEST_CHOICES, evidenceOf, type ChoiceId } from '../config/v3/quests';
import { canMerge } from '../systems/merge';
import { canPlace, inBag, itemAt, itemSize, occupiedCells } from '../systems/placement';
import { clearSave, loadGame, loadSettings, saveGame, saveSettings } from '../systems/save';
import { BattleScene } from '../scenes/BattleScene';
import { AnimPreviewScene } from '../scenes/AnimPreviewScene';
import { isV2Enabled } from '../config/v2';
import type { HeroClassId } from '../art/types';
import { maybeShout, monsterCue, setSound, sfx, unlockAudio } from './audio';
import { duckBgm, setBgm, setMusicEnabled } from './bgm';
import { bossCinema, isBossStory, openingBeats } from './cinema';
import { iconSvg } from './icons';

const $ = (id: string) => document.getElementById(id)!;
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

interface DragState {
  id: string; startX: number; startY: number; active: boolean; rotated: boolean;
  grabDx: number; grabDy: number; ghost: HTMLElement | null; from: 'bag' | 'temp';
  drop: { type: 'place'; x: number; y: number; ok: boolean } | { type: 'merge'; targetId: string; ok: boolean; gamble?: boolean; reason?: string } | { type: 'temp' } | null;
}
const TUTORIAL = [
  { sel: '#bag', text: '① 装备必须放进<b>背包</b>才会生效，临时区的装备不参与战斗。' },
  { sel: '#bag', text: '② 把一件装备拖到<b>相同种类、相同等级</b>的装备上，即可合成升级，还能腾出空间。' },
  { sel: '#bag', text: '③ <b>红宝石</b>放在武器的上下左右（对角无效），可以强化武器伤害。' },
  { sel: '#bag', text: '④ <b>钱袋</b>胜利后额外给金币，但会占据宝贵的战斗格子。' },
  { sel: '#startBtn', text: '⑤ 整理好后，点击<b>开始战斗</b>，装备会自动出手！' },
];

export class App {
  game: Game | null = null;
  settings: Settings;
  scene!: BattleScene;
  selected: string | null = null;
  drag: DragState | null = null;
  sellConfirm: { id: string; until: number } | null = null;
  speed = 1;
  heroClass: HeroClassId = 'merchant';
  ironman = false;
  tutStep = -1;
  busy = false; // 防止快速连点
  cell = 60;
  private phaser!: Phaser.Game;

  constructor() {
    this.settings = loadSettings(localStorage);
    setSound(this.settings.sound);
    setMusicEnabled(this.settings.sound);
    document.addEventListener('pointerdown', () => unlockAudio(), { capture: true });
    // 标题不等 Phaser、不等素材。静态 #boot 在 JS 到达前盖住空骨架。
    this.showTitle();
    this.phaser = new Phaser.Game({
      type: Phaser.AUTO, parent: 'battle', backgroundColor: '#15101e', transparent: false,
      scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' }, scene: [BattleScene, AnimPreviewScene],
      render: { antialias: true }, banner: false, audio: { noAudio: true },
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
    window.addEventListener('pointerup', e => this.onUp(e));
    window.addEventListener('pointercancel', () => this.cancelDrag());
  }
  // ---------- 存档 ----------
  private persist = (s: GameState) => saveGame(localStorage, s);
  private saveSettings() { saveSettings(localStorage, this.settings); setSound(this.settings.sound); setMusicEnabled(this.settings.sound); }
  private cinemaOn = false;
  private battleFlip = false;

  // ---------- 标题界面 ----------
  showTitle(message?: string) {
    const lr = loadGame(localStorage);
    const canContinue = lr.status === 'ok' && lr.state.phase !== 'victory' && lr.state.phase !== 'defeat';
    const corrupt = lr.status === 'corrupt' ? lr.message : '';
    const ov = $('overlay');
    ov.className = 'show title';
    ov.innerHTML = `<div class="titleCard">
      <div class="logo">${iconSvg('moneybag')}<h1>背包守财奴</h1>${iconSvg('greatsword')}</div>
      <p class="sub">整理背包 · 合成装备 · 自动战斗 · <b>故事战役</b></p>
      ${message ? `<p class="warn">${esc(message)}</p>` : ''}
      ${corrupt ? `<p class="warn">⚠ ${esc(corrupt)}请开始新的冒险。</p>` : ''}
      <div class="classPick" id="classPick" style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin:10px 0">
        ${['merchant','guard','ranger'].map(id=>{
          const names:Record<string,string>={merchant:'商旅',guard:'守卫',ranger:'游侠'};
          const on=this.heroClass===id;
          return `<button type="button" class="btn ${on?'gold':''}" data-class="${id}" style="min-width:88px">${names[id]}</button>`;
        }).join('')}
      </div>
      <label class="toggle" style="justify-content:center"><input type="checkbox" id="tIron" ${this.ironman ? 'checked' : ''}/> 单命远征（战败即结束，无回档/援助）</label>
      <div class="btns">
        ${canContinue ? `<button class="btn gold big" id="tContinue">继续游戏（第${(lr as any).state.level}关）</button>` : ''}
        <button class="btn ${canContinue ? '' : 'gold'} big" id="tNew">开始冒险</button>
        <button class="btn" id="tArt" title="仅调试">美术预览</button>
      </div>
      <ul class="howto">
        <li>🎒 把装备拖进背包格子，<b>放进背包才生效</b>；手机点「旋转」，电脑按 R 键旋转。</li>
        <li>✨ 同种同级装备拖到一起即可<b>合成升级</b>。</li>
        <li>💎 红宝石强化<b>上下左右</b>相邻的武器。</li>
        <li>⚔ 开战后装备自动攻击，征战50关、10个章节，第20关只是中段折转，第50关才是终点！</li>
        <li>🎲 两件相同的 <b>Lv3</b> 可以赌合成：${gamblePct(LV4_GAMBLE.success)}% 得到 Lv4，${gamblePct(LV4_GAMBLE.loseOne)}% 只消失拖过去的那一件。</li>
        <li>👑 两件相同的 <b>Lv4</b> 可以再赌：${gamblePct(LV5_GAMBLE.success)}% 得到 Lv5，${gamblePct(LV5_GAMBLE.loseOne)}% 只丢一件，${gamblePct(LV5_GAMBLE.loseBoth)}% 两件都消失。结果立刻存档。</li>
      </ul>
      <label class="toggle"><input type="checkbox" id="tSound" ${this.settings.sound ? 'checked' : ''}/> 音效</label>
    </div>`;
    $('tNew').onclick = () => {
      if (canContinue && !confirm('开始新冒险将覆盖当前存档，确定吗？')) return;
      sfx.click(); this.newGame();
    };
    if (canContinue) $('tContinue').onclick = () => { sfx.click(); this.loadState((lr as any).state); };
    ($('tIron') as HTMLInputElement).onchange = e => { this.ironman = (e.target as HTMLInputElement).checked; };
    ($('tSound') as HTMLInputElement).onchange = e => { this.settings.sound = (e.target as HTMLInputElement).checked; this.saveSettings(); };
    document.querySelectorAll('#classPick [data-class]').forEach(btn => {
      (btn as HTMLElement).onclick = () => {
        this.heroClass = (btn as HTMLElement).dataset.class as HeroClassId;
        if (this.scene?.artReady) this.scene.setHeroClass(this.heroClass);
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
  }
  newGame() {
    clearSave(localStorage);
    const st = newGameState((Date.now() ^ (Math.random() * 1e9)) >>> 0, { heroClass: this.heroClass, mode: this.ironman ? 'ironman' : 'story' });
    if (!st.seenDialogue.includes('ch1_intro')) st.pendingStoryId = 'ch1_intro';
    saveGame(localStorage, st);
    this.tutStep = this.settings.tutorialDone ? -1 : 0;
    const start = () => this.loadState(st);
    if (!this.settings.openingSeen) this.playOpening(this.heroClass, () => { this.settings.openingSeen = true; this.saveSettings(); start(); });
    else start();
  }
  loadState(st: GameState) {
    applyBossPrep(st);
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
    const availW = wide ? 520 : Math.min(window.innerWidth, 600) - 36;
    const availH = wide ? 560 : Math.max(200, Math.min(window.innerHeight * 0.42, 380));
    this.cell = Math.max(40, Math.min(72, Math.floor(Math.min(availW / s.cols, availH / s.rows))));
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
    this.renderMid(); this.renderBag(); this.renderTemp(); this.renderDetails(); this.renderShop(); this.renderStats(); this.renderTutorial();
  }
  renderMid() {
    const g = this.game!, s = g.s, lv = getLevel(s.level), base = MONSTER_BASE[lv.monster];
    const battle = s.phase === 'battle';
    const can = g.canStartBattle();
    const abil = lv.armor ? base.ability.replace('固定值', `${lv.armor}点`) : base.ability;
    const lvLine = LEVEL_LINES[s.level] ?? '';
    $('mid').innerHTML = `<div class="enemyCard ${lv.boss ? 'boss' : ''}">
        <div class="eName">${lv.boss ? '👑 首领 · ' : '下一关：'}${lv.title}</div>
        ${lvLine ? `<div class="muted" style="margin:4px 0 8px">「${esc(lvLine)}」</div>` : ''}
        <div class="eStats"><span>❤ ${lv.hp}</span><span>⚔ ${lv.atk}/${lv.interval}秒</span>${lv.armor ? `<span>🛡 减伤${lv.armor}</span>` : ''}</div>
        <div class="eAbil">✦ ${abil}${lv.mechSummary ? `<br/>⚙ ${lv.mechSummary}` : ''}<br/>⚠ ${ECONOMY.enrageAt}秒后狂暴（+10%，之后每${ECONOMY.enrageStep}秒再+10%）；${ECONOMY.timeout}秒未击败即失败。</div>
      </div>
      <div class="actions">
        ${battle ? `<div class="hint">⚔ 自动战斗中……背包已锁定</div>
          <div class="speed"><button class="btn small ${this.speed === 1 ? 'gold' : ''}" id="sp1">1倍速</button><button class="btn small ${this.speed === 2 ? 'gold' : ''}" id="sp2">2倍速</button></div>`
        : `<div class="hint">${can.ok ? '准备就绪！' : '⚠ ' + can.msg}</div>
          <button class="btn gold big ${can.ok ? '' : 'disabled'}" id="startBtn">⚔ 开始战斗</button>`}
      </div>`;
    if (battle) {
      $('sp1').onclick = () => { this.speed = 1; this.scene.setSpeed(1); this.renderMid(); };
      $('sp2').onclick = () => { this.speed = 2; this.scene.setSpeed(2); this.renderMid(); };
    } else $('startBtn').onclick = () => this.guard(() => {
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
      <div class="iname ${small ? 'tiny' : ''}">${d.name}</div><div class="lvBadge">Lv${it.level}</div></div>`;
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
      const cls = [this.selected === it.id ? 'sel' : '', hi.has(it.id) ? 'boosted' : '', this.drag?.active && this.drag.id === it.id ? 'dragging' : ''].join(' ');
      html += `<div class="placed" style="left:${it.x! * c}px;top:${it.y! * c}px">${this.itemHtml(it, c, cls)}</div>`;
    }
    bag.innerHTML = html;
    bag.classList.toggle('locked', s.phase !== 'prep');
    $('bagHead').innerHTML = `<div class="ptitle">🎒 背包 <small>${s.cols}×${s.rows}</small></div>
      <button class="btn small" id="rotBtn" ${this.selected && ITEMS[g.find(this.selected)?.kind ?? 'potion'].rotatable && s.phase === 'prep' ? '' : 'disabled'}>⟳ 旋转（R）</button>`;
    $('rotBtn').onclick = () => { if (this.selected) this.act(() => g.rotate(this.selected!)); };
    const exp = expansionLabel(s.level, s.rows, s.cols, s.expansions);
    const offer = expansionOffer(s.expansions);
    const poor = !!offer && s.gold < offer.cost;
    const mark = `<span class="knitMark">吉利达</span>`;
    $('expand').innerHTML = !exp.canBuy
      ? `<div class="expMax">${exp.text}</div>${mark}`
      : `<button class="expandRow ${!poor && s.phase === 'prep' ? '' : 'disabled'}" id="expBtn" style="width:${Math.min(s.cols * c, 360)}px">➕ ${exp.text}${poor ? ' · 金币不足' : ''}</button>${mark}`;
    if (exp.canBuy) $('expBtn').onclick = () => this.guard(() => {
      const before = g.s.expansions;
      if (this.act(() => g.expand(), sfx.coin) && g.s.expansions > before) {
        $('bagWrap')?.classList.add('bagGrow');
        setTimeout(() => $('bagWrap')?.classList.remove('bagGrow'), 900);
      }
    });
    bag.querySelectorAll<HTMLElement>('.item').forEach(el => el.addEventListener('pointerdown', e => this.onDown(e, el.dataset.id!, 'bag')));
  }
  renderTemp() {
    const g = this.game!;
    const tc = Math.min(40, this.cell * 0.7);
    const t = $('temp');
    t.innerHTML = g.tempItems.length ? g.tempItems.map(it => this.itemHtml(it, tc, this.selected === it.id ? 'sel' : '')).join('') : `<div class="empty">空</div>`;
    $('tempWrap').classList.toggle('hasItems', g.tempItems.length > 0);
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
    let stats = '';
    if (d.category === 'weapon' || d.category === 'needle') {
      const b = d.category === 'weapon' ? gemBonus(g.s.items, it) : { pct: 0 };
      const fin = d.category === 'weapon' ? weaponDamage(g.s.items, it) : v;
      stats = `<div>基础伤害：<b>${v}</b> · 间隔 ${d.interval}秒</div><div>宝石加成：<b class="${b.pct ? 'up' : ''}">+${b.pct}%</b>${!inBag(it) ? '（临时区不生效）' : ''}</div>
        <div>最终伤害：<b class="up">${inBag(it) ? fin : 0}</b>${d.category === 'needle' ? ' · 附毒' : ''}</div>`;
    } else if (d.category === 'gem') {
      const n = weaponsBoostedBy(g.s.items, it).length;
      stats = `<div>加成：<b>+${v}%</b></div><div>当前强化武器：<b class="${n ? 'up' : ''}">${n}</b> 件（已高亮）</div>`;
    } else if (d.category === 'shield') stats = `<div>护盾生成：<b>${v}</b> / ${d.interval}秒</div><div>护盾上限：${Math.floor(g.s.maxHp * ECONOMY.shieldCapRate)}${d.maxTriggers ? ` · 每场最多${d.maxTriggers}次` : ''}</div>`;
    else if (d.category === 'potion') stats = `<div>恢复：<b>${v}</b> 生命</div><div>触发：生命 ≤ ${Math.floor(g.s.maxHp * ECONOMY.potionThreshold)}</div>`;
    else if (d.category === 'heal') stats = `<div>恢复：<b>${v}</b> · 间隔 ${d.interval}秒</div><div>每场最多 ${d.maxTriggers ?? 3} 次（非药水）</div>`;
    else if (d.category === 'passive') stats = `<div>减甲：<b>${v}</b> · 持续前8秒</div>`;
    else if (d.category === 'economy') stats = `<div>开战金&lt;30时额外：<b>+${v}</b> 金币</div>`;
    else stats = `<div>胜利金币：<b>+${v}</b></div>`;
    const nextVal = it.level < 3 ? d.values[(it.level) as 1 | 2] : d.values[3];
    const next = it.level < 3
      ? `<div class="nextLv">合成后 Lv${it.level + 1}：${d.category === 'gem' ? '+' + nextVal + '%' : nextVal}</div>`
      : it.level === 3
        ? `<div class="nextLv">拖到另一件 Lv3 上可赌 Lv4（数值 ${d.values[3]}）：${gamblePct(LV4_GAMBLE.success)}% 成功，${gamblePct(LV4_GAMBLE.loseOne)}% 只消失拖过去的那一件。</div>`
        : it.level === 4
          ? `<div class="nextLv">拖到另一件 Lv4 上可赌 Lv5（数值 ${d.values[4]}）：${gamblePct(LV5_GAMBLE.success)}% 成功，${gamblePct(LV5_GAMBLE.loseOne)}% 只丢一件，${gamblePct(LV5_GAMBLE.loseBoth)}% 两件都消失。</div>`
          : `<div class="nextLv">Lv5 · 已是最高等级</div>`;
    const sp = sellPrice(it.kind, it.level); const confirming = this.sellConfirm?.id === it.id && this.sellConfirm.until > Date.now();
    const prep = g.s.phase === 'prep';
    el.innerHTML = `<div class="ptitle">🔍 装备详情 <button class="iconBtn closeSheet" id="closeDet">✕</button></div>
      <div class="detHead"><div class="detIcon lv${it.level}" style="--c:${d.color}">${iconSvg(it.kind)}<div class="lvBadge">Lv${it.level}</div></div>
      <div><div class="detName">${d.name} <span class="lvTxt">Lv${it.level}</span></div><div class="muted">占格 ${w}×${h}${d.rotatable ? ' · 可旋转' : ''} · ${inBag(it) ? '背包中（生效）' : '临时区（不生效）'}</div></div></div>
      <div class="desc">${d.desc(v)}</div><div class="statsBox">${stats}${next}</div>
      <div class="detBtns">
        ${d.rotatable ? `<button class="btn small" id="dRot" ${prep ? '' : 'disabled'}>⟳ 旋转</button>` : ''}
        ${inBag(it) ? `<button class="btn small" id="dTemp" ${prep ? '' : 'disabled'}>移到临时区</button>` : `<button class="btn small gold" id="dPlace" ${prep ? '' : 'disabled'}>放入背包</button>`}
        <button class="btn small ${confirming ? 'danger' : ''}" id="dSell" ${prep ? '' : 'disabled'}>${confirming ? `确认出售？+${sp}金币` : `出售 +${sp}金币`}</button>
      </div>`;
    $('closeDet').onclick = () => { this.selected = null; this.render(); };
    if (d.rotatable) $('dRot').onclick = () => this.act(() => g.rotate(it.id));
    if (inBag(it)) $('dTemp').onclick = () => this.act(() => g.toTemp(it.id));
    else $('dPlace').onclick = () => this.act(() => this.autoPlace(it));
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
    $('shop').innerHTML = `<div class="ptitle">🏪 商店 <small>购买的装备进入临时区</small></div>
      <div class="shopRow">${s.shop.slots.map((sl, i) => {
        const p = buyPrice(sl.kind, sl.level); const poor = s.gold < p; const d = ITEMS[sl.kind];
        return `<div class="shopCard ${sl.bought ? 'bought' : ''}"><div class="detIcon lv${sl.level}" style="--c:${d.color}">${iconSvg(sl.kind)}<div class="lvBadge">Lv${sl.level}</div></div>
          <div class="sName">${d.name} Lv${sl.level}</div><div class="sDesc">${d.desc(d.values[sl.level - 1])}</div>
          <button class="btn small ${sl.bought ? '' : 'gold'}" data-buy="${i}" ${sl.bought || poor || !prep ? 'disabled' : ''}>${sl.bought ? '已购买' : poor ? `金币不足（${p}）` : `<span class="coin"></span>${p} 购买`}</button></div>`;
      }).join('')}</div>
      <button class="btn small wideBtn" id="refBtn" ${s.gold < rc || !prep ? 'disabled' : ''}>🔄 刷新商店 · <span class="coin"></span>${rc}${s.gold < rc ? '（金币不足）' : ''}</button>`;
    $('shop').querySelectorAll<HTMLElement>('[data-buy]').forEach(b => (b.onclick = () => this.guard(() => this.act(() => g.buy(+b.dataset.buy!), sfx.coin))));
    $('refBtn').onclick = () => this.guard(() => this.act(() => g.refreshShop(), sfx.coin));
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
    if (this.tutStep < 0 || this.game?.s.phase !== 'prep') return;
    const st = TUTORIAL[this.tutStep]; const target = document.querySelector(st.sel); if (!target) return;
    target.classList.add('tutTarget');
    const b = document.createElement('div'); b.id = 'tutBubble';
    b.innerHTML = `<div>${st.text}</div><div class="tutBtns"><button class="btn small" id="tutSkip">跳过引导</button><button class="btn small gold" id="tutNext">${this.tutStep < TUTORIAL.length - 1 ? '下一步' : '知道了'}</button></div>`;
    (st.sel === '#bag' ? $('bagWrap') : $('mid')).appendChild(b);
    $('tutSkip').onclick = () => this.endTutorial();
    $('tutNext').onclick = () => { this.tutStep++; if (this.tutStep >= TUTORIAL.length) this.endTutorial(); else this.renderTutorial(); };
  }
  endTutorial() { this.tutStep = -1; this.settings.tutorialDone = true; this.saveSettings(); this.renderTutorial(); }

  // ---------- 拖动 ----------
  onDown(e: PointerEvent, id: string, from: 'bag' | 'temp') {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.preventDefault();
    const it = this.game!.find(id); if (!it) return;
    const el = e.currentTarget as HTMLElement; const r = el.getBoundingClientRect();
    const cs = from === 'bag' ? this.cell : r.width / itemSize(it.kind, it.rotated).w;
    this.drag = { id, startX: e.clientX, startY: e.clientY, active: false, rotated: it.rotated, grabDx: Math.floor((e.clientX - r.left) / cs), grabDy: Math.floor((e.clientY - r.top) / cs), ghost: null, from, drop: null };
    const sz = itemSize(it.kind, it.rotated);
    this.drag.grabDx = Math.min(sz.w - 1, Math.max(0, this.drag.grabDx)); this.drag.grabDy = Math.min(sz.h - 1, Math.max(0, this.drag.grabDy));
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
      if (Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < 7) return;
      if (this.game!.s.phase !== 'prep') { this.drag = null; this.toast('战斗中无法整理背包。', true); return; }
      d.active = true; if (document.body.classList.contains('wide')) this.selected = d.id; else this.selected = null; sfx.pick(); this.makeGhost(); this.renderBag(); this.renderDetails();
    }
    e.preventDefault();
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
    const targetEl = under?.closest('.item') as HTMLElement | null;
    const bagRect = $('bag').getBoundingClientRect();
    const inGrid = px >= bagRect.left && px < bagRect.right && py >= bagRect.top && py < bagRect.bottom;
    // 1) 合成判断优先：指针正下方明确指向另一件装备
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
      d.drop = { type: 'place', x: cx, y: cy, ok: canPlace(g.s.items, g.s.cols, g.s.rows, it.kind, cx, cy, d.rotated, it.id) };
      return;
    }
    if (under?.closest('#tempWrap')) d.drop = { type: 'temp' };
  }
  private renderPreview() {
    const d = this.drag!, g = this.game!, it = g.find(d.id)!;
    const pv = $('preview'); let html = '';
    document.querySelectorAll('.mergeTarget,.mergeBad').forEach(e => e.classList.remove('mergeTarget', 'mergeBad'));
    $('tempWrap').classList.toggle('dropHere', d.drop?.type === 'temp');
    let tip = '';
    if (d.drop?.type === 'place') {
      for (const c of occupiedCells(it.kind, d.drop.x, d.drop.y, d.rotated))
        if (c.x >= 0 && c.y >= 0 && c.x < g.s.cols && c.y < g.s.rows) html += `<div class="pv ${d.drop.ok ? 'ok' : 'bad'}" style="left:${c.x * this.cell}px;top:${c.y * this.cell}px"></div>`;
      tip = d.drop.ok ? '' : '这里放不下';
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
    } else if (d.drop?.type === 'temp') tip = '放回临时区';
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
    const d = this.drag; if (!d) return;
    const g = this.game!;
    if (!d.active) { // 点击 → 查看详情
      this.drag = null;
      if (!(e.target as HTMLElement).closest('.item')) return;
      this.selected = this.selected === d.id ? null : d.id; this.sellConfirm = null; sfx.click(); this.render(); return;
    }
    this.computeDrop(e.clientX, e.clientY);
    const drop = d.drop; d.ghost?.remove(); this.drag = null;
    $('tempWrap').classList.remove('dropHere');
    if (!drop) { sfx.drop(); this.render(); return; } // 无效位置：回到原处
    if (drop.type === 'merge') {
      if (drop.ok && drop.gamble) { this.confirmGamble(d.id, drop.targetId); return; }
      if (drop.ok) { if (this.act(() => g.merge(d.id, drop.targetId), sfx.merge)) { this.selected = drop.targetId; this.render(); this.flashMerge(drop.targetId); } }
      else { sfx.error(); this.toast(drop.reason ?? '需要相同种类和等级才能合成。', true); this.render(); }
    } else if (drop.type === 'place') {
      if (drop.ok) this.act(() => g.move(d.id, drop.x, drop.y, d.rotated), sfx.drop);
      else { sfx.error(); this.toast('这里放不下。', true); this.render(); }
    } else { if (inBag(g.find(d.id)!)) this.act(() => g.toTemp(d.id), sfx.drop); else this.render(); }
  }
  cancelDrag() { if (this.drag) { this.drag.ghost?.remove(); this.drag = null; this.render(); } }
  flashMerge(id: string) {
    document.querySelectorAll(`.item[data-id="${id}"]`).forEach(el => { el.classList.add('merged'); });
  }
  private confirmGamble(sourceId: string, targetId: string) {
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
      const r = g.safeForge(sourceId, targetId);
      if (!r.ok) { sfx.error(); this.toast(r.msg, true); this.render(); return; }
      sfx.merge();
      this.selected = targetId;
      this.toast(r.msg ?? '稳妥锻成');
      this.render();
      this.flashMerge(targetId);
    };
    $('gambleYes').onclick = () => {
      this.closeOverlay();
      const r = g.gambleMerge(sourceId, targetId);
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
    this.selected = null; this.render();
    const c = g.makeCombat();
    this.scene.setPreview(g.s.eliteActive ? applyEliteOverlay(getLevel(g.s.level), g.s.level) : getLevel(g.s.level), g.s.hp, g.s.maxHp, { eliteActive: !!g.s.eliteActive, levelNo: g.s.level });
    this.scene.setSpeed(this.speed);
    this.battleFlip = !this.battleFlip;
    const tune = g.s.eliteActive ? 'elite' : isBossLevel(g.s.level) ? (g.s.level >= 50 ? 'final' : 'boss') : (this.battleFlip ? 'battleA' : 'battleB');
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
      } else if (e.type === 'monsterAttack') { sfx.hurt(); monsterCue(getLevel(this.game?.s.level ?? 1).monster); }
      else if (e.type === 'enrage' || e.type === 'bossHaste') sfx.enrage();
    }
    const hpEl = document.querySelector('.hud .hp b, #hud .hp b'); if (hpEl) hpEl.textContent = `${c.hp}/${c.maxHp}`;
    const bar = document.querySelector('#hud .hpbar i') as HTMLElement | null; if (bar) bar.style.width = (c.hp / c.maxHp) * 100 + '%';
  }
  endBattle(c: CombatState) {
    const g = this.game!;
    const r = g.settle(c); if (!r.ok) return; // 只结算一次
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
    this.playCinema(openingBeats(hero), onDone);
  }
  private playBossCinema(onDone: () => void) {
    const level = this.game?.s.level ?? 0;
    const beat = bossCinema(level);
    if (!beat) { onDone(); return; }
    this.playCinema([beat], onDone);
  }
  private playCinema(beats: { id: string; ms: number; line: string; look: string; title: string }[], onDone: () => void) {
    if (this.cinemaOn) return;
    this.cinemaOn = true;
    if (this.scene) this.scene.paused = true;
    setBgm('story');
    duckBgm(true);
    const root = $('cinema');
    root.hidden = false;
    let i = 0;
    let timer = 0;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      window.clearTimeout(timer);
      root.hidden = true;
      root.innerHTML = '';
      this.cinemaOn = false;
      duckBgm(false);
      if (this.scene && !document.hidden) this.scene.paused = false;
      onDone();
    };
    const show = () => {
      const b = beats[i];
      if (!b) { finish(); return; }
      root.innerHTML = `<div class="cinema ${b.look}" role="dialog" aria-label="${b.id}">
        <div class="cinLayer cinBack"></div><div class="cinLayer cinMid"></div><div class="cinLayer cinFront"></div>
        <div class="cinCard"><div class="cinId">${b.id} · ${b.title}</div><p class="cinLine">${b.line}</p>
        <div class="btns"><button class="btn" id="cinNext">继续</button><button class="btn" id="cinSkip">跳过</button></div></div>
      </div>`;
      $('cinSkip').onclick = () => finish();
      $('cinNext').onclick = () => { i++; show(); };
      window.clearTimeout(timer);
      timer = window.setTimeout(() => { i++; show(); }, b.ms);
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
    $('again').onclick = () => { sfx.click(); this.newGame(); };
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
    // 跳过文字不跳过选择：只清除 pendingStoryId
    $('storyOk').onclick = () => {
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
      <p class="muted">版本 3.3.0 · 平衡 ${BALANCE_VERSION}</p>
      <label class="toggle"><input type="checkbox" id="sSound" ${this.settings.sound ? 'checked' : ''}/> 音效</label>
      <div class="btns col"><button class="btn" id="sOpen">回看开场</button><button class="btn" id="sTut">重新查看引导</button><button class="btn" id="sTitle">返回标题（进度已自动保存）</button>
      <button class="btn danger" id="sRestart">放弃并重新开始</button><button class="btn gold" id="sClose">关闭</button></div></div>`;
    ($('sSound') as HTMLInputElement).onchange = e => { this.settings.sound = (e.target as HTMLInputElement).checked; this.saveSettings(); this.render(); };
    $('sClose').onclick = () => { this.closeOverlay(); const ph = this.game?.s.phase; if (ph === 'loot') this.showLoot(); else if (ph === 'camp') this.showCamp(); else if (ph === 'victory' || ph === 'defeat') this.showEnd(ph === 'victory'); else if (!this.game) this.showTitle(); };
    $('sOpen').onclick = () => { this.closeOverlay(); this.playOpening(this.heroClass, () => this.showSettings()); };
    $('sTut').onclick = () => { this.closeOverlay(); this.tutStep = 0; this.render(); };
    $('sTitle').onclick = () => { if (this.game?.s.phase === 'battle') { this.scene.combat = null; } this.showTitle(); };
    $('sRestart').onclick = () => { if (confirm('确定放弃当前进度并重新开始？')) { this.scene.combat = null; this.newGame(); } };
  }
}
export type { ItemKind, Level };
