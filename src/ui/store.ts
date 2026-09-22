/** App-wide singletons: the Game, the render tick signal, and navigation state. */
import { signal } from '@preact/signals'
import { Game } from '@/engine/game'
import { content } from '@/content/data'
import { browserStorage } from '@/engine/storage'
import { createLoop } from '@/engine/loop'
import { setHapticsEnabled } from '@/engine/haptics'
import { setSoundEnabled } from '@/engine/audio'

export const game = new Game(content, { storage: browserStorage(), saveKey: 'hollowspire.save' })

/** Bumped every render frame so components re-read game state; cheap because signals batch. */
export const frame = signal(0)
export type Tab = 'grow' | 'folk' | 'craft' | 'season' | 'more'
export const tab = signal<Tab>('grow')
export const sheet = signal<null | 'settings' | 'waystone' | 'stats' | 'return' | 'crucible' | 'caravan'>(null)
export const returnBoard = signal<import('@/engine/game').ReturnBoard | null>(null)

let saveAcc = 0
export const loop = createLoop({
  step: 0.1,
  onTick: (dt) => { game.tick(dt); saveAcc += dt; if (saveAcc >= 5) { saveAcc = 0; game.save() } },
  onRender: () => { frame.value++ },
  onGap: (seconds) => { game.save(); const b = game.load(); if (b) { returnBoard.value = b; sheet.value = 'return' } void seconds },
})

export function boot() {
  const board = game.load()
  setHapticsEnabled(game.s.settings.haptics)
  setSoundEnabled(game.s.settings.sound)
  if (board) { returnBoard.value = board; sheet.value = 'return' }
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

/** Try-on preview: a cosmetic id the scene renders as if equipped (null = none). */
export const preview = signal<string | null>(null)
/** Bump to ask the scene to render and share a Season Card. */
export const requestSeasonCard = signal(0)
