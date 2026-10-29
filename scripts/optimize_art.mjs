/**
 * Build phone-sized WebP under public/art/web from the painted PNGs.
 * The web/Electron bundle loads these and does not request the full-size originals.
 */
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const ROOT = path.resolve('public/art');
const OUT = path.join(ROOT, 'web');
const HERO_RE = /^(merchant|guard|ranger)_(idle|move|attack|defend|hurt|drink|special|victory|defeat)(_f\d{2})?_512\.png$/;

async function emit(src, dest, { width, quality }) {
  if (!fs.existsSync(src)) return false;
  const st = fs.statSync(src);
  if (fs.existsSync(dest) && fs.statSync(dest).mtimeMs >= st.mtimeMs && fs.statSync(dest).size > 0) return false;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  let img = sharp(src, { limitInputPixels: false }).rotate();
  if (width) img = img.resize({ width, withoutEnlargement: true });
  await img.webp({ quality, effort: 4 }).toFile(dest);
  return true;
}

export async function optimizeArt() {
  let wrote = 0;
  let skipped = 0;
  const jobs = [];
  const add = (src, dest, opts) => jobs.push({ src, dest, opts });

  const enemies = path.join(ROOT, 'enemies');
  if (fs.existsSync(enemies)) {
    const names = new Set();
    for (const fn of fs.readdirSync(enemies)) {
      if (!fn.endsWith('.png')) continue;
      if (fn.endsWith('_512.png')) names.add(fn.slice(0, -'_512.png'.length));
      else names.add(fn.slice(0, -'.png'.length));
    }
    for (const base of names) {
      const half = path.join(enemies, `${base}_512.png`);
      const full = path.join(enemies, `${base}.png`);
      const src = fs.existsSync(half) ? half : full;
      if (!fs.existsSync(src)) continue;
      add(src, path.join(OUT, 'enemies', `${base}.webp`), { width: 512, quality: 68 });
    }
  }

  const chars = path.join(ROOT, 'characters');
  if (fs.existsSync(chars)) {
    for (const cls of fs.readdirSync(chars)) {
      const dir = path.join(chars, cls);
      if (!fs.statSync(dir).isDirectory()) continue;
      for (const fn of fs.readdirSync(dir)) {
        if (!HERO_RE.test(fn)) continue;
        add(path.join(dir, fn), path.join(OUT, 'characters', cls, fn.replace(/\.png$/, '.webp')), { width: 512, quality: 68 });
      }
    }
  }

  const bgs = path.join(ROOT, 'backgrounds');
  if (fs.existsSync(bgs)) {
    for (const fn of fs.readdirSync(bgs)) {
      if (!fn.endsWith('.png')) continue;
      add(path.join(bgs, fn), path.join(OUT, 'backgrounds', fn.replace(/\.png$/, '.webp')), { width: 960, quality: 66 });
    }
  }

  const items = path.join(ROOT, 'items');
  if (fs.existsSync(items)) {
    for (const fn of fs.readdirSync(items)) {
      if (!fn.endsWith('.png')) continue;
      add(path.join(items, fn), path.join(OUT, 'items', fn.replace(/\.png$/, '.webp')), { width: 128, quality: 78 });
    }
  }

  const npc = path.join(ROOT, 'npc');
  if (fs.existsSync(npc)) {
    for (const fn of fs.readdirSync(npc)) {
      if (!fn.endsWith('_512.png')) continue;
      add(path.join(npc, fn), path.join(OUT, 'npc', fn.replace(/\.png$/, '.webp')), { width: 512, quality: 70 });
    }
  }

  for (const job of jobs) {
    const fresh = await emit(job.src, job.dest, job.opts);
    if (fresh) wrote++; else skipped++;
  }
  let bytes = 0;
  const walk = (dir) => {
    for (const name of fs.readdirSync(dir)) {
      const p = path.join(dir, name);
      const st = fs.statSync(p);
      if (st.isDirectory()) walk(p); else bytes += st.size;
    }
  };
  if (fs.existsSync(OUT)) walk(OUT);
  console.log(`[art] webp wrote ${wrote}, up-to-date ${skipped}, total ${(bytes / 1024 / 1024).toFixed(1)} MB`);
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);
if (invoked) optimizeArt().catch(err => { console.error(err); process.exit(1); });
