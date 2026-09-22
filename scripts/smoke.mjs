// Playwright smoke test: serves dist/, opens the game at a phone viewport, taps around, and screenshots.
// Usage: npm run build && npm run smoke
import { chromium, devices } from 'playwright'
import { createServer } from 'node:http'
import { readFile, stat, mkdir } from 'node:fs/promises'
import { join, extname } from 'node:path'

const root = new URL('../dist/', import.meta.url).pathname
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png' }
const server = createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname)
  if (p === '/') p = '/index.html'
  try {
    const file = join(root, p)
    await stat(file)
    res.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream' })
    res.end(await readFile(file))
  } catch { res.writeHead(404); res.end('nope') }
})
await new Promise((r) => server.listen(4180, r))
await mkdir('screenshots', { recursive: true })

const { existsSync } = await import('node:fs')
const fallback = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || (existsSync(fallback) ? fallback : undefined) })
const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'en-US' })
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
await page.goto('http://localhost:4180/')
await page.waitForSelector('[data-testid="tap-target"]', { timeout: 15000 })
await page.screenshot({ path: 'screenshots/01-start.png' })
const target = page.locator('[data-testid="tap-target"]')
for (let i = 0; i < 60; i++) { await target.tap(); if (i % 15 === 0) await page.waitForTimeout(50) }
await page.waitForTimeout(500)
await page.screenshot({ path: 'screenshots/02-after-taps.png' })
for (const tab of ['build', 'craft', 'ascend', 'shop']) {
  const t = page.locator(`[data-testid="tab-${tab}"]`)
  if (await t.count()) { await t.tap(); await page.waitForTimeout(300); await page.screenshot({ path: `screenshots/03-${tab}.png` }) }
}
await browser.close()
server.close()
if (errors.length) { console.error('Page errors:\n' + errors.join('\n')); process.exit(1) }
console.log('smoke OK — screenshots in ./screenshots')
