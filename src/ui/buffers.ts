import { mediaUrl } from './audioCatalog';
import { audioContext } from './audio';

const cache = new Map<string, Promise<AudioBuffer | null>>();

/** 按需拉取并解码。失败缓存 null，调用方改走合成音。 */
export function loadAudioBuffer(pathNoExt: string): Promise<AudioBuffer | null> {
  const url = mediaUrl(pathNoExt);
  const hit = cache.get(url);
  if (hit) return hit;
  const job = (async () => {
    try {
      const ctx = audioContext();
      if (!ctx) return null;
      const res = await fetch(url);
      if (!res.ok) return null;
      const ab = await res.arrayBuffer();
      return await ctx.decodeAudioData(ab.slice(0));
    } catch {
      return null;
    }
  })();
  cache.set(url, job);
  return job;
}
