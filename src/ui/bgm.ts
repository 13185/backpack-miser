/**
 * 曲目在 public/audio/music。OGG Opus 优先，Safari / iOS 用 m4a。
 * 循环用 AudioBufferSource 的 loopStart / loopEnd，避开 AAC 文件循环的接缝。
 * 加载失败时退回原来的 8 音合成循环。2 倍速不改 playbackRate。同一状态不叠第二份。
 */
import { audioContext } from './audio';
import { NEXT_TRACK, TRACKS, trackPath, type BgmId } from './audioCatalog';
import { loadAudioBuffer } from './buffers';

export type { BgmId };

const FADE = 0.8;
const FULL = 0.18;
/** 约 −6 dB。对白和剧情共用这一档，不叠成两次。 */
const DUCKED = 0.09;

const LOOPS: Record<Exclude<BgmId, 'win' | 'lose'>, number[]> = {
  title: [196, 220, 247, 262, 247, 220, 196, 174],
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

interface Playing { id: BgmId; stop: (fade?: number) => void }

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let current: Playing | null = null;
let sceneDuck = false;
let voiceDuck = false;
let wanted: BgmId | null = null;
let musicOn = true;
let unlocked = false;
let gen = 0;

function ac(): AudioContext | null {
  ctx = audioContext();
  if (ctx && !master) {
    master = ctx.createGain();
    master.gain.value = FULL;
    master.connect(ctx.destination);
  }
  return ctx;
}

function applyMaster() {
  const audio = ac();
  if (!audio || !master) return;
  const now = audio.currentTime;
  master.gain.cancelScheduledValues(now);
  master.gain.setValueAtTime(master.gain.value, now);
  master.gain.linearRampToValueAtTime(sceneDuck || voiceDuck ? DUCKED : FULL, now + 0.25);
}

function playNotes(id: BgmId, notes: number[], loop: boolean): Playing {
  const audio = ac();
  if (!audio || !master || !musicOn) return { id, stop: () => {} };
  const gain = audio.createGain();
  gain.gain.setValueAtTime(0.0001, audio.currentTime);
  gain.gain.linearRampToValueAtTime(1, audio.currentTime + FADE);
  gain.connect(master);
  let step = 0;
  let timer = 0;
  let stopped = false;
  const tick = () => {
    if (!ctx || stopped) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = id === 'prep' || id === 'story' || id === 'title' ? 'triangle' : 'sawtooth';
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
  return { id, stop(fade = FADE) {
    if (stopped) return;
    stopped = true;
    window.clearInterval(timer);
    const now = audio.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(0.0001, now + fade);
    window.setTimeout(() => { try { gain.disconnect(); } catch { /* already gone */ } }, fade * 1000 + 40);
  } };
}

function playBuffer(id: BgmId, buffer: AudioBuffer): Playing {
  const audio = ac();
  const meta = TRACKS[id];
  if (!audio || !master) return { id, stop: () => {} };
  const gain = audio.createGain();
  gain.gain.setValueAtTime(0.0001, audio.currentTime);
  gain.gain.linearRampToValueAtTime(1, audio.currentTime + FADE);
  gain.connect(master);
  const src = audio.createBufferSource();
  src.buffer = buffer;
  if (meta.loop) {
    src.loop = true;
    const start = Math.min(meta.loopStart, Math.max(0, buffer.duration - 0.05));
    const end = Math.min(meta.loopEnd ?? buffer.duration, buffer.duration);
    src.loopStart = start;
    src.loopEnd = Math.max(start + 0.05, end);
  }
  src.connect(gain);
  src.start();
  let stopped = false;
  return { id, stop(fade = FADE) {
    if (stopped) return;
    stopped = true;
    const now = audio.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), now);
    gain.gain.linearRampToValueAtTime(0.0001, now + fade);
    window.setTimeout(() => {
      try { src.stop(); } catch { /* already stopped */ }
      try { gain.disconnect(); } catch { /* already gone */ }
    }, fade * 1000 + 40);
  } };
}

function startLoaded(id: BgmId, buf: AudioBuffer | null, token: number, prev: Playing | null) {
  if (token !== gen || !musicOn) return;
  prev?.stop(FADE);
  if (!buf) {
    const notes = id === 'win' || id === 'lose' ? STING[id] : LOOPS[id];
    current = playNotes(id, notes, id !== 'win' && id !== 'lose');
    return;
  }
  current = playBuffer(id, buf);
  const nxt = NEXT_TRACK[id];
  if (nxt) void loadAudioBuffer(trackPath(nxt));
}

/** 同一 id 不重开。胜利/战败短句可以再播一次。解锁前只记下想播的曲子。 */
export function setBgm(id: BgmId) {
  wanted = id;
  if (!musicOn || !unlocked) return;
  if (current?.id === id && id !== 'win' && id !== 'lose') return;
  const token = ++gen;
  const prev = current;
  current = { id, stop: (fade) => prev?.stop(fade) };
  void loadAudioBuffer(trackPath(id)).then(buf => startLoaded(id, buf, token, prev));
}

/** 第一次指针之后才拉文件。点在按钮上时，先让点击改掉 wanted。 */
export function startBgmIfUnlocked() {
  if (unlocked) return;
  unlocked = true;
  if (musicOn && wanted) setBgm(wanted);
}

export function prefetchBgm(id: BgmId) {
  if (!unlocked || !musicOn) return;
  void loadAudioBuffer(trackPath(id));
}

export function duckBgm(on: boolean) {
  sceneDuck = on;
  applyMaster();
}

export function duckForVoice(on: boolean) {
  voiceDuck = on;
  applyMaster();
}

export function setMusicEnabled(on: boolean) {
  musicOn = on;
  if (!on) {
    gen++;
    current?.stop(0.2);
    current = null;
    return;
  }
  if (wanted && unlocked) setBgm(wanted);
}

export function pauseBgm(paused: boolean) {
  const audio = ctx;
  if (!audio) return;
  if (paused && audio.state === 'running') audio.suspend().catch(() => {});
  if (!paused && audio.state === 'suspended') audio.resume().catch(() => {});
}

document.addEventListener('visibilitychange', () => pauseBgm(document.hidden));
