/** App-wide singletons: the Game, the render tick signal, and navigation state. */
import { signal } from '@preact/signals'
import { Game } from '@/engine/game'
import { content } from '@/content/data'
import { browserStorage } from '@/engine/storage'
import { createLoop } from '@/engine/loop'
import { setHapticsEnabled } from '@/engine/haptics'

export const game = new Game(content, { storage: browserStorage(), saveKey: 'hollowspire.save' })

/** Bumped every render frame so components re-read game state; cheap because signals batch. */
export const frame = signal(0)
export type Tab = 'grow' | 'folk' | 'craft' | 'season' | 'more'
export const tab = signal<Tab>('grow')
export const sheet = signal<null | 'wardrobe' | 'shop' | 'settings' | 'waystone' | 'stats' | 'return' | 'prestige'>(null)
export const offlineSummary = signal<import('@/systems/offline').OfflineSummary | null>(null)

let saveAcc = 0
export const loop = createLoop({
  step: 0.1,
  onTick: (dt) => { game.tick(dt); saveAcc += dt; if (saveAcc >= 5) { saveAcc = 0; game.save() } },
  onRender: () => { frame.value++ },
  onGap: (seconds) => { game.save(); const s = game.load(); if (s && s.effective > 30) { offlineSummary.value = s; sheet.value = 'return' } void seconds },
})

export function boot() {
  const summary = game.load()
  setHapticsEnabled(game.s.settings.haptics)
  if (summary && summary.effective > 30) { offlineSummary.value = summary; sheet.value = 'return' }
  loop.start()
  const persist = () => game.save()
  window.addEventListener('pagehide', persist)
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') persist() })
}

/** Navigate to a tab and optionally highlight an item (compass tap-through). */
export const highlight = signal<string | null>(null)
export function goTo(t: Tab, itemId?: string) {
  tab.value = t
  if (itemId) { highlight.value = itemId; setTimeout(() => { if (highlight.value === itemId) highlight.value = null }, 2500) }
}
