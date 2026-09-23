// Render public/icon.svg to build/icon.png (512x512) for electron-builder.
import { chromium } from 'playwright'
import { readFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
const svg = await readFile('public/icon.svg', 'utf8')
await mkdir('build', { recursive: true })
const fallback = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || (existsSync(fallback) ? fallback : undefined) })
const page = await browser.newPage({ viewport: { width: 512, height: 512 }, deviceScaleFactor: 1 })
await page.setContent(`<html><body style="margin:0;background:transparent">${svg.replace('<svg ', '<svg width="512" height="512" ')}</body></html>`)
await page.screenshot({ path: 'build/icon.png', omitBackground: true })
await browser.close(); console.log('icon written')
