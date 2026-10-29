/**
 * 对白与战斗喊声。文件在 public/audio/voice，和音乐分开音量。
 * 播放时把音乐压低约 6 dB。跳过会停掉当前一句。
 */
import { shoutTone, audioContext, setBarkPlayer } from './audio';
import { barkBase } from './audioCatalog';
import { loadAudioBuffer } from './buffers';
import { duckForVoice } from './bgm';

const BUS = 0.5;
let voiceOn = true;
let voiceLevel = 1;
let bus: GainNode | null = null;
let busCtx: AudioContext | null = null;
let lineStop: () => void = () => {};
let ducking = false;

function endDuck() {
  if (!ducking) return;
  ducking = false;
  duckForVoice(false);
}

function beginDuck() {
  if (ducking) return;
  ducking = true;
  duckForVoice(true);
}

function ensureBus(ctx: AudioContext) {
  if (bus && busCtx === ctx) return bus;
  bus = ctx.createGain();
  bus.gain.value = BUS * voiceLevel;
  bus.connect(ctx.destination);
  busCtx = ctx;
  return bus;
}

export function setVoiceEnabled(on: boolean) {
  voiceOn = on;
  if (!on) stopVoice();
}

export function setVoiceVolume(level: number) {
  voiceLevel = Math.max(0, Math.min(1, level));
  if (!bus || !busCtx) return;
  bus.gain.setValueAtTime(BUS * voiceLevel, busCtx.currentTime);
}

export function stopVoice() {
  lineStop();
  lineStop = () => {};
}

export function prefetchVoice(pathNoExt: string) {
  if (!voiceOn) return;
  void loadAudioBuffer(pathNoExt);
}

/** done 为 false 表示没播出来（静音、缺文件、解码失败）。 */
export function playVoice(pathNoExt: string | null): { stop: () => void; done: Promise<boolean> } {
  stopVoice();
  if (!pathNoExt || !voiceOn) return { stop() {}, done: Promise.resolve(false) };
  let settle: (ok: boolean) => void = () => {};
  const done = new Promise<boolean>(resolve => { settle = resolve; });
  let ended = false;
  let source: AudioBufferSourceNode | null = null;
  const finish = (ok: boolean) => {
    if (ended) return;
    ended = true;
    endDuck();
    try { source?.stop(); } catch { /* already ended */ }
    settle(ok);
  };
  lineStop = () => finish(true);
  void loadAudioBuffer(pathNoExt).then(buf => {
    if (ended) return;
    const ctx = audioContext();
    if (!buf || !ctx || !voiceOn) { finish(false); return; }
    const node = ctx.createBufferSource();
    source = node;
    node.buffer = buf;
    node.connect(ensureBus(ctx));
    node.onended = () => finish(true);
    beginDuck();
    try { node.start(); } catch { finish(false); }
  });
  return { stop: () => finish(true), done };
}

function tryBark(who: string): boolean {
  if (!voiceOn) return false;
  if (!audioContext()) return false;
  const n = 1 + Math.floor(Math.random() * 5);
  void playVoice(barkBase(who, n)).done.then(ok => { if (!ok) shoutTone(who); });
  return true;
}

setBarkPlayer(tryBark);
