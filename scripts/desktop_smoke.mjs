// Electron 桌面端冒烟：xvfb-run node scripts/desktop_smoke.mjs
import { _electron as electron } from 'playwright';
import { mkdirSync } from 'fs';
const OUT = 'art/screenshots'; mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const errs = [];
async function launch() {
  const app = await electron.launch({ args: ['.', '--no-sandbox'], env: { ...process.env, ELECTRON_DISABLE_SECURITY_WARNINGS: '1' } });
  const page = await app.firstWindow();
  page.on('requestfailed', r => errs.push('FAIL ' + r.url()));
  page.on('response', r => { if (r.status() >= 400) errs.push(r.status() + ' ' + r.url()); });
  page.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  await page.waitForLoadState('load'); await sleep(2500);
  return { app, page };
}
let { app, page } = await launch();
const info = await app.evaluate(({ app, BrowserWindow }) => { const w = BrowserWindow.getAllWindows()[0]; return { userData: app.getPath('userData'), size: w.getSize(), title: w.getTitle(), menu: w.isMenuBarVisible() }; });
console.log('window', info, 'url', page.url());
await page.screenshot({ path: `${OUT}/desktop_01_title.png` });
for (const sel of ['button:has-text("开始"), button:has-text("新游戏"), #btnStart, .btn.gold', 'button:has-text("商旅")', 'button:has-text("开始冒险")', 'button:has-text("确认")']) {
  const b = page.locator(sel).first(); if (await b.count()) { await b.click().catch(() => {}); await sleep(600); }
}
for (let i = 0; i < 8; i++) { const c = page.locator('button:has-text("继续"), button:has-text("普通路线"), button:has-text("离开"), #storyOk, #routeNormal').first(); if (await c.count() && await c.isVisible().catch(() => false)) { await c.click().catch(() => {}); await sleep(400); } else break; }
await page.screenshot({ path: `${OUT}/desktop_02_prep.png` });
const bt = page.locator('button:has-text("开战"), button:has-text("开始战斗"), #btnBattle').first();
if (await bt.count()) { await bt.click().catch(() => {}); await sleep(3000); }
await page.screenshot({ path: `${OUT}/desktop_03_battle.png` });
const keys = await page.evaluate(() => { localStorage.setItem('bm_desktop_probe', 'persist-ok'); return Object.keys(localStorage); });
console.log('localStorage keys', keys);
await app.close(); await sleep(1000);
({ app, page } = await launch());
console.log('after relaunch', await page.evaluate(() => ({ probe: localStorage.getItem('bm_desktop_probe'), keys: Object.keys(localStorage) })));
await page.evaluate(() => localStorage.removeItem('bm_desktop_probe'));
await app.close();
console.log('errors', errs.length ? errs : 'none');
