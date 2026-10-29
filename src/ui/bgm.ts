/**
 * 原创程序旋律。每首是 8 秒一句、收在主音上的无缝循环，不是录音棚乐曲，也不是配音。
 * 2 倍速不改 playbackRate。同一状态不叠第二份。
 */
import { audioContext } from './audio';

export type BgmId = 'prep' | 'battleA' | 'battleB' | 'elite' | 'boss' | 'final' | 'story' | 'win' | 'lose';

const LOOPS: Record<Exclude<BgmId, 'win' | 'lose'>, number[]> = {
  prep: [262, 294, 330, 349, 330, 294, 262, 220],
  battleA: [196, 233, 262, 294, 262, 233, 196, 175],
  battleB: [220, 247, 294, 330, 294, 247, 220, 196],
  elite: [175, 196, 233, 175, 156, 175, 196, 147],
  boss: [147, 175, 196, 233, 196, 175, 147, 131],
  final: [131, 156, 175, 196, 175, 147, 131, 110],
  story: [220, 262, 294, 262, 247, 220, 196, 220],
};
const STING: Record<'win' | 'lose', number[]> = {
  win: [523, 659, 784, 1047],
  lose: [392, 330, 262, 196],
};

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let current: { id: BgmId; stop: () => void } | null = null;
let ducked = false;
let wanted: BgmId | null = null;
let musicOn = true;

function ac(): AudioContext | null {
  ctx = audioContext();
  if (ctx && !master) {
    master = ctx.createGain();
    master.gain.value = 0.18;
    master.connect(ctx.destination);
  }
  return ctx;
}

function playNotes(id: BgmId, notes: number[], loop: boolean): () => void {
  const audio = ac();
  if (!audio || !master || !musicOn) return () => {};
  const gain = audio.createGain();
  gain.gain.setValueAtTime(0.0001, audio.currentTime);
  gain.gain.linearRampToValueAtTime(ducked ? 0.22 : 1, audio.currentTime + 1.1);
  gain.connect(master);
  let step = 0;
  let timer = 0;
  const tick = () => {
    if (!ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = id === 'prep' || id === 'story' ? 'triangle' : 'sawtooth';
    o.frequency.value = notes[step % notes.length];
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + (loop ? 0.85 : 0.45));
    o.connect(g).connect(gain);
    o.start();
    o.stop(ctx.currentTime + 0.9);
    step++;
    if (!loop && step >= notes.length) window.clearInterval(timer);
  };
  tick();
  timer = window.setInterval(tick, loop ? 1000 : 420);
  return () => {
    window.clearInterval(timer);
    const now = audio.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(0.0001, now + 1.0);
    window.setTimeout(() => gain.disconnect(), 1100);
  };
}

/** 同一 id 不重开。胜利/战败短句可以盖过循环。 */
export function setBgm(id: BgmId) {
  wanted = id;
  if (!musicOn) return;
  if (current?.id === id && id !== 'win' && id !== 'lose') return;
  current?.stop();
  const notes = id === 'win' || id === 'lose' ? STING[id] : LOOPS[id];
  const stop = playNotes(id, notes, id !== 'win' && id !== 'lose');
  current = { id, stop };
}

export function duckBgm(on: boolean) {
  ducked = on;
  if (!master || !ctx) return;
  master.gain.cancelScheduledValues(ctx.currentTime);
  master.gain.linearRampToValueAtTime(on ? 0.05 : 0.18, ctx.currentTime + 0.4);
}

export function setMusicEnabled(on: boolean) {
  musicOn = on;
  if (!on) { current?.stop(); current = null; return; }
  if (wanted) setBgm(wanted);
}

export function pauseBgm(paused: boolean) {
  const audio = ctx;
  if (!audio) return;
  if (paused && audio.state === 'running') audio.suspend().catch(() => {});
  if (!paused && audio.state === 'suspended') audio.resume().catch(() => {});
}

document.addEventListener('visibilitychange', () => pauseBgm(document.hidden));
