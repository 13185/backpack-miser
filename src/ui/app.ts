import Phaser from 'phaser';
import { ECONOMY } from '../config/economy';
import { ITEMS } from '../config/items';
import { LEVELS } from '../config/levels';
import { MONSTER_BASE } from '../config/monsters';
import type { GameState, ItemInstance, ItemKind, Level, Settings } from '../models/types';
import { gemBonus, weaponDamage, weaponsBoostedBy } from '../systems/adjacency';
import type { CombatEvent, CombatState } from '../systems/combat';
import { buyPrice, expansionCost, refreshCost, sellPrice } from '../systems/economy';
import { Game, itemLabel, newGameState, type Result } from '../systems/game';
import { canMerge } from '../systems/merge';
import { canPlace, inBag, itemAt, itemSize, occupiedCells } from '../systems/placement';
import { clearSave, loadGame, loadSettings, saveGame, saveSettings } from '../systems/save';
import { BattleScene } from '../scenes/BattleScene';
import { setSound, sfx, unlockAudio } from './audio';
import { iconSvg } from './icons';

const $ = (id: string) => document.getElementById(id)!;
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

interface DragState {
  id: string; startX: number; startY: number; active: boolean; rotated: boolean;
  grabDx: number; grabDy: number; ghost: HTMLElement | null; from: 'bag' | 'temp';
  drop: { type: 'place'; x: number; y: number; ok: boolean } | { type: 'merge'; targetId: string; ok: boolean; reason?: string } | { type: 'temp' } | null;
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
  tutStep = -1;
  busy = false; // 防止快速连点
  cell = 60;
  private phaser!: Phaser.Game;

  constructor() {
    this.settings = loadSettings(localStorage);
    setSound(this.settings.sound);
    document.addEventListener('pointerdown', () => unlockAudio(), { capture: true });
    this.phaser = new Phaser.Game({
      type: Phaser.AUTO, parent: 'battle', backgroundColor: '#15101e', transparent: false,
      scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' }, scene: [BattleScene],
      render: { antialias: true }, banner: false, audio: { noAudio: true },
    });
    this.phaser.events.once('ready', () => { this.scene = this.phaser.scene.getScene('battle') as BattleScene; this.showTitle(); });
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
  private saveSettings() { saveSettings(localStorage, this.settings); setSound(this.settings.sound); }

  // ---------- 标题界面 ----------
  showTitle(message?: string) {
    const lr = loadGame(localStorage);
    const canContinue = lr.status === 'ok' && lr.state.phase !== 'victory' && lr.state.phase !== 'defeat';
    const corrupt = lr.status === 'corrupt' ? lr.message : '';
    const ov = $('overlay');
    ov.className = 'show title';
    ov.innerHTML = `<div class="titleCard">
      <div class="logo">${iconSvg('moneybag')}<h1>背包守财奴</h1>${iconSvg('greatsword')}</div>
      <p class="sub">整理背包 · 合成装备 · 自动战斗 · 攒金币</p>
      ${message ? `<p class="warn">${esc(message)}</p>` : ''}
      ${corrupt ? `<p class="warn">⚠ ${esc(corrupt)}请开始新的冒险。</p>` : ''}
      <div class="btns">
        ${canContinue ? `<button class="btn gold big" id="tContinue">继续游戏（第${(lr as any).state.level}关）</button>` : ''}
        <button class="btn ${canContinue ? '' : 'gold'} big" id="tNew">开始冒险</button>
      </div>
      <ul class="howto">
        <li>🎒 把装备拖进背包格子，<b>放进背包才生效</b>；手机点「旋转」，电脑按 R 键旋转。</li>
        <li>✨ 同种同级装备拖到一起即可<b>合成升级</b>。</li>
        <li>💎 红宝石强化<b>上下左右</b>相邻的武器。</li>
        <li>⚔ 开战后装备自动攻击，击败10关怪物，打倒黄金宝箱怪！</li>
      </ul>
      <label class="toggle"><input type="checkbox" id="tSound" ${this.settings.sound ? 'checked' : ''}/> 音效</label>
    </div>`;
    $('tNew').onclick = () => {
      if (canContinue && !confirm('开始新冒险将覆盖当前存档，确定吗？')) return;
      sfx.click(); this.newGame();
    };
    if (canContinue) $('tContinue').onclick = () => { sfx.click(); this.loadState((lr as any).state); };
    ($('tSound') as HTMLInputElement).onchange = e => { this.settings.sound = (e.target as HTMLInputElement).checked; this.saveSettings(); };
    this.scene.setPreview(LEVELS[0], 100, 100);
  }
  newGame() {
    clearSave(localStorage);
    const st = newGameState((Date.now() ^ (Math.random() * 1e9)) >>> 0);
    saveGame(localStorage, st);
    this.tutStep = this.settings.tutorialDone ? -1 : 0;
    this.loadState(st);
  }
  loadState(st: GameState) {
    this.game = new Game(st, this.persist);
    this.selected = null; this.closeOverlay();
    this.scene.setPreview(LEVELS[st.level - 1], st.hp, st.maxHp);
    if (st.phase === 'battle') {
      this.toast('检测到战斗中断，已恢复到开战前，重新进行本场战斗。');
      this.render(); this.runBattle();
    } else this.render();
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
    const avail = wide ? 520 : Math.min(window.innerWidth, 600) - 28;
    this.cell = Math.max(44, Math.min(72, Math.floor(avail / s.cols)));
    document.documentElement.style.setProperty('--cell', this.cell + 'px');
    const battle = s.phase === 'battle';
    document.body.classList.toggle('inBattle', battle);
    // HUD
    $('hud').innerHTML = `<div class="hudItem lvl">第 <b>${s.level}</b>/10 关</div>
      <div class="hudItem hp"><span>❤</span><div class="hpbar"><i style="width:${(s.hp / s.maxHp) * 100}%"></i></div><b>${s.hp}/${s.maxHp}</b></div>
      <div class="hudItem gold"><span class="coin"></span><b id="goldNum">${s.gold}</b></div>
      <button class="iconBtn" id="soundBtn" aria-label="音效">${this.settings.sound ? '🔊' : '🔇'}</button>
      <button class="iconBtn" id="setBtn" aria-label="设置">⚙</button>`;
    $('soundBtn').onclick = () => { this.settings.sound = !this.settings.sound; this.saveSettings(); this.render(); };
    $('setBtn').onclick = () => this.showSettings();
    this.renderMid(); this.renderBag(); this.renderTemp(); this.renderDetails(); this.renderShop(); this.renderStats(); this.renderTutorial();
  }
  renderMid() {
    const g = this.game!, s = g.s, lv = LEVELS[s.level - 1], base = MONSTER_BASE[lv.monster];
    const battle = s.phase === 'battle';
    const can = g.canStartBattle();
    const abil = lv.armor ? base.ability.replace('固定值', `${lv.armor}点`) : base.ability;
    $('mid').innerHTML = `<div class="enemyCard ${lv.boss ? 'boss' : ''}">
        <div class="eName">${lv.boss ? '👑 首领 · ' : '下一关：'}${lv.title}</div>
        <div class="eStats"><span>❤ ${lv.hp}</span><span>⚔ ${lv.atk}/${lv.interval}秒</span>${lv.armor ? `<span>🛡 减伤${lv.armor}</span>` : ''}</div>
        <div class="eAbil">✦ ${abil}<br/>⚠ ${ECONOMY.enrageAt}秒后狂暴，每${ECONOMY.enrageStep}秒伤害提升；${ECONOMY.timeout}秒未击败即失败。</div>
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
    const cost = expansionCost(s.expansions);
    $('expand').innerHTML = cost === null ? `<div class="expMax">背包已扩容至最大（5×6）</div>`
      : `<button class="expandRow ${s.gold >= cost && s.phase === 'prep' ? '' : 'disabled'}" id="expBtn" style="width:${s.cols * c}px">➕ 扩容：新增第${s.rows + 1}行（${s.cols}格） · <span class="coin"></span>${cost}${s.gold < cost ? ' · 金币不足' : ''}</button>`;
    if (cost !== null) $('expBtn').onclick = () => this.guard(() => this.act(() => g.expand(), sfx.coin));
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
    if (d.category === 'weapon') {
      const b = gemBonus(g.s.items, it); const fin = weaponDamage(g.s.items, it);
      stats = `<div>基础伤害：<b>${v}</b> · 间隔 ${d.interval}秒</div><div>宝石加成：<b class="${b.pct ? 'up' : ''}">+${b.pct}%</b>${b.pct >= 100 ? '（已达上限）' : ''}${!inBag(it) ? '（在临时区不生效）' : ''}</div>
        <div>最终伤害：<b class="up">${inBag(it) ? fin : 0}</b> · 每秒约 ${inBag(it) ? (fin / d.interval!).toFixed(1) : 0}</div>`;
    } else if (d.category === 'gem') {
      const n = weaponsBoostedBy(g.s.items, it).length;
      stats = `<div>加成：<b>+${v}%</b></div><div>当前强化武器：<b class="${n ? 'up' : ''}">${n}</b> 件（已高亮）</div>`;
    } else if (d.category === 'shield') stats = `<div>每3秒护盾：<b>${v}</b></div><div>护盾上限：${Math.floor(g.s.maxHp * ECONOMY.shieldCapRate)}</div>`;
    else if (d.category === 'potion') stats = `<div>恢复：<b>${v}</b> 生命</div><div>触发：生命 ≤ ${Math.floor(g.s.maxHp * ECONOMY.potionThreshold)}</div>`;
    else stats = `<div>胜利金币：<b>+${v}</b></div>`;
    const next = it.level < 3 ? `<div class="nextLv">合成后 Lv${it.level + 1}：${d.category === 'gem' ? '+' + d.values[it.level as number] + '%' : d.values[it.level as number]}</div>` : `<div class="nextLv">已达最高等级</div>`;
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
    const rc = refreshCost(s.shop.refreshes);
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
      if (m.ok) { d.drop = { type: 'merge', targetId: target.id, ok: true }; return; }
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
      if (d.drop.ok) { const def = ITEMS[it.kind]; const nv = def.values[it.level as number]; tip = `✨ 合成预览：${def.name} Lv${it.level + 1}（${def.category === 'gem' ? '+' + nv + '%' : def.category === 'weapon' ? '伤害' + nv : def.category === 'shield' ? '护盾' + nv : def.category === 'potion' ? '治疗' + nv : '金币+' + nv}）`; }
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
  // ---------- 战斗 ----------
  runBattle() {
    const g = this.game!;
    this.selected = null; this.render();
    const c = g.makeCombat();
    this.scene.setPreview(LEVELS[g.s.level - 1], g.s.hp, g.s.maxHp);
    this.scene.setSpeed(this.speed);
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
        (e.type === 'weapon' ? (e.heavy ? sfx.heavy : sfx.hit) : e.type === 'shield' ? sfx.shield : sfx.heal)();
        if (e.type === 'potion') document.querySelectorAll(`#bag .item[data-id="${e.itemId}"]`).forEach(el => el.classList.add('used'));
      } else if (e.type === 'monsterAttack') sfx.hurt();
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
    if (s.phase === 'loot') { sfx.win(); this.showLoot(); }
    else if (s.phase === 'victory') { sfx.win(); this.showEnd(true); }
    else { sfx.lose(); this.showEnd(false); }
    void l;
  }
  showLoot() {
    const g = this.game!, s = g.s, l = s.last!, loot = s.loot!;
    const ov = $('overlay'); ov.className = 'show';
    ov.innerHTML = `<div class="modal"><h2>🏆 第${l.level}关胜利！</h2>
      <div class="goldGain"><span class="coin big"></span> +${l.baseGold + l.bagGold} 金币 <small>（胜利${l.baseGold}${l.bagGold ? ` + 钱袋${l.bagGold}` : ''}）</small></div>
      <div class="muted">生命恢复 ${Math.round(s.maxHp * ECONOMY.healAfterWin)} 点（当前 ${s.hp}/${s.maxHp}）</div>
      ${this.statsHtml(l)}
      <h3>选择一件战利品（三选一）</h3>
      <div class="lootRow">${loot.options.map((o, i) => { const d = ITEMS[o.kind]; return `<button class="lootCard" data-loot="${i}"><div class="detIcon lv${o.level}" style="--c:${d.color}">${iconSvg(o.kind)}<div class="lvBadge">Lv${o.level}</div></div><div class="sName">${d.name} Lv${o.level}</div><div class="sDesc">${d.desc(d.values[o.level - 1])}</div></button>`; }).join('')}</div></div>`;
    ov.querySelectorAll<HTMLElement>('[data-loot]').forEach(b => (b.onclick = () => this.guard(() => {
      ov.querySelectorAll('button').forEach(x => ((x as HTMLButtonElement).disabled = true));
      if (this.act(() => g.claimLoot(+b.dataset.loot!), sfx.coin)) { this.closeOverlay(); this.scene.setPreview(LEVELS[s.level - 1], s.hp, s.maxHp); this.render(); }
    })));
  }
  showEnd(won: boolean) {
    const g = this.game!, s = g.s, l = s.last!;
    const main = Object.entries(s.stats.contribution).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const ov = $('overlay'); ov.className = 'show';
    ov.innerHTML = `<div class="modal ${won ? 'win' : 'lose'}"><h2>${won ? '👑 通关！你成为了地牢首富！' : '💀 冒险失败'}</h2>
      ${won ? '' : `<p class="warn">${esc(l.reason)}</p>`}
      <div class="statList"><div><span>到达关卡</span><b>第${l.level}关</b></div><div><span>击败怪物</span><b>${s.stats.kills}</b></div>
      <div><span>累计获得金币</span><b>${s.stats.goldEarned}</b></div><div><span>剩余金币</span><b>${s.gold}</b></div></div>
      <h3>主要装备</h3><div class="equipRow">${g.bagItems.map(i => `<div class="mini lv${i.level}" style="--c:${ITEMS[i.kind].color}">${iconSvg(i.kind)}<span>${itemLabel(i)}</span></div>`).join('')}</div>
      <h3>累计战斗贡献</h3><div class="statList">${main.map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('') || '<div>无</div>'}</div>
      <h3>最后一战</h3>${this.statsHtml(l)}
      <div class="btns"><button class="btn gold big" id="again">重新开始</button><button class="btn big" id="toTitle">返回标题</button></div></div>`;
    $('again').onclick = () => { sfx.click(); this.newGame(); };
    $('toTitle').onclick = () => { this.showTitle(); };
  }
  showSettings() {
    const ov = $('overlay'); ov.className = 'show';
    ov.innerHTML = `<div class="modal small"><h2>⚙ 设置</h2>
      <label class="toggle"><input type="checkbox" id="sSound" ${this.settings.sound ? 'checked' : ''}/> 音效</label>
      <div class="btns col"><button class="btn" id="sTut">重新查看引导</button><button class="btn" id="sTitle">返回标题（进度已自动保存）</button>
      <button class="btn danger" id="sRestart">放弃并重新开始</button><button class="btn gold" id="sClose">关闭</button></div></div>`;
    ($('sSound') as HTMLInputElement).onchange = e => { this.settings.sound = (e.target as HTMLInputElement).checked; this.saveSettings(); this.render(); };
    $('sClose').onclick = () => { this.closeOverlay(); const ph = this.game?.s.phase; if (ph === 'loot') this.showLoot(); else if (ph === 'victory' || ph === 'defeat') this.showEnd(ph === 'victory'); else if (!this.game) this.showTitle(); };
    $('sTut').onclick = () => { this.closeOverlay(); this.tutStep = 0; this.render(); };
    $('sTitle').onclick = () => { if (this.game?.s.phase === 'battle') { this.scene.combat = null; } this.showTitle(); };
    $('sRestart').onclick = () => { if (confirm('确定放弃当前进度并重新开始？')) { this.scene.combat = null; this.newGame(); } };
  }
}
export type { ItemKind, Level };
