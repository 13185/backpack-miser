/** WebAudio 合成音效：首次用户交互后才创建 AudioContext（尊重自动播放限制） */
let ctx: AudioContext | null = null;
let enabled = true;
let primed = false;
const shoutAt: Record<string, number> = {};
type BarkFn = (who: string) => boolean;
let barkFn: BarkFn | null = null;
export function setSound(on: boolean) { enabled = on; }
export function setBarkPlayer(fn: BarkFn) { barkFn = fn; }
export function unlockAudio() {
  if (!ctx) { try { ctx = new (window.AudioContext || (window as any).webkitAudioContext)(); } catch { ctx = null; } }
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  if (!primed) {
    primed = true;
    try {
      const buf = ctx.createBuffer(1, 1, ctx.sampleRate);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start(0);
    } catch { /* iOS 未解锁时忽略 */ }
  }
}
export function audioContext(): AudioContext | null { unlockAudio(); return ctx; }
export function resetShouts() {
  for (const k of Object.keys(shoutAt)) delete shoutAt[k];
}
export function shoutTone(who: string) {
  tone(who === 'guard' ? 140 : who === 'ranger' ? 420 : 280, 0.28, 'triangle', 0.05, who === 'guard' ? -40 : 80);
}
/** 同角色 2.5 秒内只一声，约 20% 出手才出声。有录音喊声就播录音，否则退回合成音。不使用战斗随机流。 */
export function maybeShout(who: string) {
  const now = performance.now();
  if (now - (shoutAt[who] ?? 0) < 2500) return;
  if (Math.random() > 0.2) return;
  shoutAt[who] = now;
  if (barkFn?.(who)) return;
  shoutTone(who);
}
export function monsterCue(kind: string) {
  if (kind.includes('slime')) tone(90, 0.12, 'sine', 0.04, 40);
  else if (kind.includes('bat')) tone(880, 0.08, 'square', 0.03, 200);
  else if (kind.includes('spider')) tone(160, 0.1, 'sawtooth', 0.03, -30);
  else if (kind.includes('skeleton')) tone(220, 0.06, 'square', 0.03, -80);
  else tone(130, 0.09, 'triangle', 0.03, -20);
}
function tone(freq: number, dur: number, type: OscillatorType = 'square', vol = 0.06, slide = 0, delay = 0) {
  if (!enabled || !ctx || ctx.state !== 'running') return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + dur + 0.02);
}
export const sfx = {
  click: () => tone(660, 0.05, 'triangle', 0.05),
  pick: () => tone(440, 0.06, 'triangle', 0.05, 200),
  drop: () => tone(300, 0.08, 'triangle', 0.06, -100),
  error: () => { tone(200, 0.12, 'sawtooth', 0.04); tone(150, 0.15, 'sawtooth', 0.04, 0, 0.08); },
  merge: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.12, 'triangle', 0.06, 0, i * 0.06)); },
  coin: () => { tone(988, 0.07, 'square', 0.04); tone(1319, 0.12, 'square', 0.04, 0, 0.07); },
  hit: () => tone(180, 0.06, 'square', 0.035, -80),
  heavy: () => tone(110, 0.15, 'sawtooth', 0.06, -50),
  hurt: () => tone(140, 0.1, 'sawtooth', 0.04, -60),
  shield: () => tone(520, 0.08, 'sine', 0.05, 300),
  heal: () => { tone(600, 0.1, 'sine', 0.05, 300); tone(900, 0.12, 'sine', 0.04, 200, 0.08); },
  win: () => { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.18, 'triangle', 0.07, 0, i * 0.1)); },
  lose: () => { [392, 330, 262, 196].forEach((f, i) => tone(f, 0.25, 'triangle', 0.06, 0, i * 0.15)); },
  enrage: () => tone(90, 0.4, 'sawtooth', 0.06, 60),
};
