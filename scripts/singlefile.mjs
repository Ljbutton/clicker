import { execSync } from 'node:child_process'
import { copyFileSync, mkdirSync } from 'node:fs'
execSync('npx vite build --config vite.single.config.ts', { stdio: 'inherit' })
mkdirSync('release', { recursive: true })
import('node:fs').then(({ readFileSync, writeFileSync }) => {
  const html = readFileSync('release/single/index.html', 'utf8').replace(/<link rel="(manifest|icon|apple-touch-icon)"[^>]*>\s*/g, '')
  writeFileSync('release/Hollowspire.html', html)
})
console.log('release/Hollowspire.html written')
