/** mulberry32：可序列化的确定性随机数。返回 [值, 新状态] */
export function nextRandom(state: number): [number, number] {
  const s = (state + 0x6d2b79f5) >>> 0;
  let t = s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, s];
}
export class Rng {
  constructor(public state: number) {}
  next(): number { const [v, s] = nextRandom(this.state); this.state = s; return v; }
  int(n: number): number { return Math.floor(this.next() * n); }
}
