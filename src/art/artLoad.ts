import type Phaser from 'phaser';
import { CHAPTER_BG, MONSTER_ART } from '../config/monsters';
import { applyEliteOverlay, getLevel, CAMPAIGN_LENGTH } from '../config/v3';
import { pickEnemyArt } from './enemyArt';
import type { HeroAnimState, HeroClassId } from './types';
import { webAsset } from './webAsset';
import elementFrames from './elementFrames.json';

export interface ArtEntry { key: string; url: string }

const HERO_FRAMES: Record<HeroAnimState, number> = {
  idle: 4, move: 8, attack: 6, defend: 4, hurt: 3, drink: 6, special: 6, victory: 6, defeat: 6,
};

export function heroArtEntries(cls: HeroClassId, states: readonly HeroAnimState[]): ArtEntry[] {
  const out: ArtEntry[] = [];
  for (const st of states) {
    out.push({ key: `hero_${cls}_${st}`, url: webAsset(`art/characters/${cls}/${cls}_${st}_512.png`) });
    const n = HERO_FRAMES[st];
    for (let i = 1; i <= n; i++) {
      const f = String(i).padStart(2, '0');
      out.push({
        key: `hero_${cls}_${st}_f${f}`,
        url: webAsset(`art/characters/${cls}/${cls}_${st}_f${f}_512.png`),
      });
    }
  }
  return out;
}

export function levelArtEntries(levelNo: number, elite: boolean): ArtEntry[] {
  if (levelNo < 1 || levelNo > CAMPAIGN_LENGTH) return [];
  const base = getLevel(levelNo);
  const lv = elite ? applyEliteOverlay(base, levelNo) : base;
  const out: ArtEntry[] = [];
  const bg = CHAPTER_BG[lv.chapter ?? 1];
  if (bg) out.push({ key: bg.key, url: webAsset(bg.src) });
  const art = pickEnemyArt(lv.monster, lv.chapter ?? 1, levelNo, !!lv.boss, MONSTER_ART[lv.monster], { eliteActive: elite });
  if (art) out.push({ key: art.key, url: webAsset(art.src) });
  const fb = MONSTER_ART[lv.monster];
  if (fb && fb.key !== art?.key) out.push({ key: fb.key, url: webAsset(fb.src) });
  if (levelNo === 35) {
    for (const pose of ['windup', 'attack', 'hurt', 'defeat'] as const) {
      out.push({ key: `furnace_${pose}`, url: webAsset(`art/enemies/B35_furnace_${pose}.png`) });
    }
  }
  out.push(...elementVfxEntries());
  return out;
}

export function elementVfxEntries(): ArtEntry[] {
  const out: ArtEntry[] = [];
  for (const [el, pack] of Object.entries(elementFrames)) {
    for (const frame of pack.frames) {
      out.push({ key: `vfx_${el}_${frame.order}`, url: frame.file });
    }
  }
  return out;
}

let tail: Promise<void> = Promise.resolve();

/** Queue image loads. Missing files warn and do not reject. */
export function loadTextures(scene: Phaser.Scene, entries: ArtEntry[]): Promise<void> {
  const run = () => runLoad(scene, entries);
  const next = tail.then(run, run);
  tail = next.then(() => undefined, () => undefined);
  return next;
}

function runLoad(scene: Phaser.Scene, entries: ArtEntry[]): Promise<void> {
  const seen = new Set<string>();
  const pending = entries.filter(e => {
    if (!e.key || !e.url || scene.textures.exists(e.key) || seen.has(e.key)) return false;
    seen.add(e.key);
    return true;
  });
  if (!pending.length) return Promise.resolve();
  return new Promise(resolve => {
    const onErr = (file: { key?: string; src?: string }) => {
      console.warn('[art] 资源缺失:', file?.key || '', file?.src || '');
    };
    scene.load.on('loaderror', onErr);
    for (const e of pending) scene.load.image(e.key, e.url);
    scene.load.once('complete', () => {
      scene.load.off('loaderror', onErr);
      resolve();
    });
    scene.load.start();
  });
}
