// Plays episodes automatically in headless Chromium, choosing random options
// and randomly failing some quick-time events. Fails on any script error.
// Usage: node scripts/autoplay.mjs [url] [episodes] [seeds]
import { chromium } from 'playwright-core';

const base = process.argv[2] ?? 'http://localhost:5173/';
const eps = process.argv[3] ?? 'all';
const seeds = (process.argv[4] ?? '1,2,3').split(',').map(Number);
const exe = process.env.CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const browser = await chromium.launch({ executablePath: exe, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let failed = 0;
for (const seed of seeds) {
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.stack ?? e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const extra = process.argv[5] ? `&flags=${process.argv[5]}` : '';
  const url = `${base}?auto=1&ep=${eps}&seed=${seed}&fail=0.2${extra}`;
  await page.goto(url);
  const t0 = Date.now();
  await page.waitForFunction(() => window.__auto?.done, null, { timeout: 600000, polling: 500 });
  const res = await page.evaluate(() => ({ error: window.__auto.error, log: window.__auto.log, flags: window.__auto.state?.flags, rel: window.__auto.state?.rel }));
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  if (res.error || errors.length) {
    failed++;
    console.log(`seed ${seed}: FAILED after ${secs}s`);
    console.log(res.error ?? '');
    console.log(errors.slice(0, 5).join('\n'));
    console.log('--- last log lines ---');
    console.log(res.log.slice(-15).join('\n'));
  } else {
    console.log(`seed ${seed}: ok in ${secs}s, ${res.log.length} lines. flags=${JSON.stringify(res.flags)} rel=${JSON.stringify(res.rel)}`);
  }
  await page.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
