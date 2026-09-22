// Scripted play-through of the real UI at phone size. Fails on any page error.
import { chromium, devices } from 'playwright'
import { createServer } from 'node:http'
import { readFile, stat, mkdir } from 'node:fs/promises'
import { join, extname } from 'node:path'
import { existsSync } from 'node:fs'
const root = new URL('../dist/', import.meta.url).pathname
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' }
const server = createServer(async (req, res) => { let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p === '/') p = '/index.html'; try { const f = join(root, p); await stat(f); res.writeHead(200, { 'content-type': types[extname(f)] || 'application/octet-stream' }); res.end(await readFile(f)) } catch { res.writeHead(404); res.end() } })
await new Promise((r) => server.listen(4181, r))
await mkdir('screenshots', { recursive: true })
const fallback = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || (existsSync(fallback) ? fallback : undefined) })
const ctx = await browser.newContext({ ...devices['iPhone 13'] })
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push('pageerror: ' + e)); page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()) })
const shot = (n) => page.screenshot({ path: `screenshots/p-${n}.png` })
await page.goto('http://localhost:4181/')
const canvas = page.locator('[data-testid="tap-target"]')
await canvas.waitFor()
const box = await canvas.boundingBox()
const strike = async (n) => { for (let i = 0; i < n; i++) { await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.7); if (i % 10 === 0) await page.waitForTimeout(30) } }
await strike(40); await page.waitForTimeout(1200)
const sap = async () => Number((await page.locator('[data-testid="sap"]').innerText()).replace(/[^0-9.]/g, ''))
console.log('sap after 40 strikes:', await sap())
await page.locator('[data-testid="tab-grow"]').tap(); await page.locator('[data-testid="grow"]').tap(); await page.waitForTimeout(600)
await shot('01-grew')
await page.locator('[data-testid="tab-build"]').tap(); await page.waitForTimeout(300)
await strike(30); await page.waitForTimeout(500)
const buy = page.locator('[data-card="sapper"] button.buy').first(); await buy.tap(); await page.waitForTimeout(300); await buy.tap(); await page.waitForTimeout(300); await buy.tap()
await page.waitForTimeout(1500); await shot('02-sappers')
const rateText = await page.locator('.sap-rate').innerText(); console.log('rate:', rateText)
await page.locator('[data-testid="tab-craft"]').tap(); await strike(60); await page.waitForTimeout(500)
const build = page.locator('[data-card="kiln"] button.buy').first(); if (await build.isEnabled()) await build.tap()
await page.waitForTimeout(800)
for (let i = 0; i < 12; i++) { const craft = page.locator('[data-card="kiln"] button', { hasText: 'Craft' }).first(); if (await craft.count() && await craft.isEnabled()) await craft.tap(); await page.waitForTimeout(120) }
await shot('03-kiln')
const hire = page.locator('[data-card="kiln"] button', { hasText: 'Hire Foreman' }).first()
console.log('foreman button present:', await hire.count())
await page.locator('[data-testid="compass"]').tap(); await page.waitForTimeout(400); await shot('04-road-ahead'); await page.locator('.sheet-close').tap()
await page.locator('[data-testid="tab-ascend"]').tap(); await page.waitForTimeout(300); await shot('05-season')
await page.locator('[data-testid="tab-shop"]').tap(); await page.waitForTimeout(300)
await page.locator('.seg-btn', { hasText: 'Shop' }).tap(); await page.waitForTimeout(300); await shot('06-shop')
await page.locator('button', { hasText: 'Settings' }).tap(); await page.waitForTimeout(300); await shot('07-settings'); await page.locator('.sheet-close').tap()
// save + reload after simulated absence: set lastSeen back 3h in the save
await page.waitForTimeout(6000) // autosave every 5s
const before = await page.evaluate(() => JSON.parse(localStorage.getItem('hollowspire.save')))
console.log('saved height:', before?.data?.height, 'sappers:', before?.data?.producers?.sapper)
await page.evaluate(() => { const env = JSON.parse(localStorage.getItem('hollowspire.save')); env.savedAt -= 3 * 3600 * 1000; env.data.lastSeen -= 3 * 3600 * 1000; env.data.stats.strikesTotal = 100; localStorage.setItem('hollowspire.save', JSON.stringify(env)) })
// a second tab reads the back-dated save (reloading the first would re-save it on pagehide)
const page2 = await ctx.newPage(); page2.on('pageerror', (e) => errors.push('pageerror: ' + e))
await page2.goto('http://localhost:4181/'); await page2.locator('[data-testid="tap-target"]').waitFor(); await page2.waitForTimeout(1200)
await page2.screenshot({ path: 'screenshots/p-08-return.png' })
const board = await page2.locator('.sheet').count(); console.log('return board shown:', board > 0, '· sap now:', await page2.locator('[data-testid="sap"]').innerText())
if (board) { await page2.locator('.sheet button', { hasText: 'Collect' }).tap(); await page2.waitForTimeout(300) }
await browser.close(); server.close()
if (errors.length) { console.error('ERRORS:\n' + errors.join('\n')); process.exit(1) }
console.log('playthrough OK')
