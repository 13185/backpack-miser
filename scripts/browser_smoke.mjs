/**
 * Headless Playwright smoke vs localhost:5173
 * Screenshots → art/screenshots/browser_smoke_*.png
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { join } from 'path';

const BASE = process.env.SMOKE_URL || 'http://127.0.0.1:5173';
const OUT = join('art', 'screenshots');
mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const log = [];
  const shot = async (name) => {
    const p = join(OUT, `browser_smoke_${name}.png`);
    await page.screenshot({ path: p, fullPage: false });
    log.push(`ok ${p}`);
    console.log('shot', p);
  };
  try {
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60000 });
    await sleep(1500);
    await shot('01_title');

    const startBtn = page.locator('button:has-text("开始"), button:has-text("新游戏"), button:has-text("商旅"), #btnStart, .btn.gold').first();
    if (await startBtn.count()) {
      await startBtn.click({ timeout: 5000 }).catch(() => {});
      await sleep(800);
    }
    for (const label of ['商旅', 'merchant', '开始冒险', '确认']) {
      const b = page.locator(`button:has-text("${label}")`).first();
      if (await b.count()) { await b.click().catch(() => {}); await sleep(500); }
    }
    await shot('02_prep');

    for (let i = 0; i < 8; i++) {
      const cont = page.locator('button:has-text("继续"), button:has-text("普通路线"), button:has-text("离开"), #storyOk, #routeNormal').first();
      if (await cont.count() && await cont.isVisible().catch(() => false)) {
        await cont.click().catch(() => {});
        await sleep(400);
      } else break;
    }
    await shot('03_after_modals');

    const battle = page.locator('button:has-text("开战"), button:has-text("开始战斗"), #btnBattle').first();
    if (await battle.count()) {
      await battle.click().catch(() => {});
      await sleep(2500);
      await shot('04_battle');
    } else {
      log.push('warn no battle button');
      await shot('04_no_battle');
    }
  } catch (e) {
    console.error(e);
    await shot('error');
    log.push(String(e));
    process.exitCode = 1;
  } finally {
    await browser.close();
    console.log(JSON.stringify(log, null, 2));
  }
}
main();
