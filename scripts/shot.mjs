// Screenshot helper: node scripts/shot.mjs <url> <out.png> [waitMs] [w] [h] [actions-json]
import { chromium } from 'playwright-core';
const [url, out, wait = '4000', w = '1280', h = '720', actions = '[]'] = process.argv.slice(2);
const exe = process.env.CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch({ executablePath: exe, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: Number(w), height: Number(h) } });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
await page.goto(url);
await page.waitForTimeout(Number(wait));
for (const a of JSON.parse(actions)) {
  if (a.key) await page.keyboard.press(a.key);
  if (a.down) await page.keyboard.down(a.down);
  if (a.up) await page.keyboard.up(a.up);
  if (a.click) await page.mouse.click(a.click[0], a.click[1]);
  if (a.wait) await page.waitForTimeout(a.wait);
  if (a.shot) await page.screenshot({ path: a.shot });
}
await page.screenshot({ path: out });
if (errs.length) console.log(errs.slice(0, 10).join('\n'));
await browser.close();
