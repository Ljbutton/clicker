import type { Unlock, Condition } from '@/content/types'
import type { GameState } from '@/engine/state'
import type { ContentIndex } from './index'

export function isUnlocked(ci: ContentIndex, s: GameState, u: Unlock): boolean {
  switch (u.kind) {
    case 'always': return true
    case 'height': return s.height >= u.min
    case 'building': return (s.buildings[u.id] ?? 0) >= (u.level ?? 1)
    case 'producer': return (s.producers[u.id] ?? 0) >= u.count
    case 'prestige': return s.prestige.count >= u.count
    case 'mechanic': return s.prestige.count >= (ci.mechanics.get(u.id)?.atPrestige ?? Infinity)
    case 'resource': return (s.earned[u.id] ?? 0) >= u.lifetime
    case 'all': return u.of.every((x) => isUnlocked(ci, s, x))
  }
}

/** Human-readable description of what is needed to unlock. */
export function describeUnlock(ci: ContentIndex, u: Unlock): string {
  switch (u.kind) {
    case 'always': return ''
    case 'height': return `Reach ${u.min} m`
    case 'building': return `Build ${ci.buildings.get(u.id)?.name ?? u.id}${u.level && u.level > 1 ? ` Lv ${u.level}` : ''}`
    case 'producer': return `${u.count}× ${ci.producers.get(u.id)?.name ?? u.id}`
    case 'prestige': return `Replant ${u.count}×`
    case 'mechanic': return `Unlock ${ci.mechanics.get(u.id)?.name ?? u.id}`
    case 'resource': return `Earn ${u.lifetime} ${ci.resources.get(u.id)?.name ?? u.id}`
    case 'all': return u.of.map((x) => describeUnlock(ci, x)).filter(Boolean).join(', ')
  }
}

export function checkCondition(s: GameState, c: Condition): boolean {
  switch (c.kind) {
    case 'height': return s.height >= c.min
    case 'taps': return s.stats.tapsTotal >= c.min
    case 'grows': return s.stats.growsTotal >= c.min
    case 'producers': return Object.values(s.producers).reduce((a, b) => a + b, 0) >= c.min
    case 'producer': return (s.producers[c.id] ?? 0) >= c.min
    case 'crafts': return s.stats.craftsTotal >= c.min
    case 'craft': return (s.craftsBy[c.id] ?? 0) >= c.min
    case 'boosts': return Object.values(s.boosts).reduce((a, b) => a + b, 0) >= c.min
    case 'building': return (s.buildings[c.id] ?? 0) >= c.level
    case 'prestiges': return s.prestige.count >= c.min
    case 'lifetime': return (s.earned[c.id] ?? 0) >= c.min
    case 'bursts': return s.stats.burstsTotal >= c.min
    case 'combo': return s.combo.best >= c.min
    case 'setpieces': return s.stats.setPiecesTotal >= c.min
    case 'cosmetics': return s.cosmetics.owned.length >= c.min
  }
}

/** Progress fraction toward a condition (for milestone lists). */
export function conditionProgress(s: GameState, c: Condition): { have: number; need: number } {
  const need = 'min' in c ? c.min : 'level' in c ? c.level : 1
  let have = 0
  switch (c.kind) {
    case 'height': have = s.height; break
    case 'taps': have = s.stats.tapsTotal; break
    case 'grows': have = s.stats.growsTotal; break
    case 'producers': have = Object.values(s.producers).reduce((a, b) => a + b, 0); break
    case 'producer': have = s.producers[c.id] ?? 0; break
    case 'crafts': have = s.stats.craftsTotal; break
    case 'craft': have = s.craftsBy[c.id] ?? 0; break
    case 'boosts': have = Object.values(s.boosts).reduce((a, b) => a + b, 0); break
    case 'building': have = s.buildings[c.id] ?? 0; break
    case 'prestiges': have = s.prestige.count; break
    case 'lifetime': have = s.earned[c.id] ?? 0; break
    case 'bursts': have = s.stats.burstsTotal; break
    case 'combo': have = s.combo.best; break
    case 'setpieces': have = s.stats.setPiecesTotal; break
    case 'cosmetics': have = s.cosmetics.owned.length; break
  }
  return { have, need }
}
