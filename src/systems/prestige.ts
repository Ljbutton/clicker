import type { GameState } from '@/engine/state'
import type { ContentIndex } from './index'
import { BALANCE } from '@/content/balance'
import { type EffectTable, mult, add } from './effects'
import { geomCost } from '@/engine/numbers'

export function prestigeGainAt(height: number, fx: EffectTable, hasKey: boolean): number {
  const p = BALANCE.prestige
  if (height < p.minHeight) return 0
  let g = Math.floor(Math.pow(height / p.divisor, p.exponent))
  if (hasKey) g = Math.floor(g * (1 + p.keyBonus))
  g = Math.floor((g + add(fx, 'prestige_gain')) * mult(fx, 'prestige_gain'))
  return Math.max(0, g)
}

export function prestigeGain(s: GameState, fx: EffectTable, hasKey = false): number {
  return prestigeGainAt(s.height, fx, hasKey)
}

/** Height at which the prestige gain would be `target`. */
export function heightForGain(target: number): number {
  const p = BALANCE.prestige
  return Math.max(p.minHeight, Math.pow(target, 1 / p.exponent) * p.divisor)
}

export function canPrestige(s: GameState, fx: EffectTable): boolean { return prestigeGain(s, fx) >= 1 }

export function nodeLevel(s: GameState, id: string) { return s.prestige.nodes[id] ?? 0 }

export function nodeCost(ci: ContentIndex, s: GameState, id: string): number {
  const n = ci.prestigeNodes.get(id)!
  return Math.ceil(geomCost(n.baseCost, n.costGrowth, nodeLevel(s, id)))
}

export function nodeVisible(ci: ContentIndex, s: GameState, id: string): boolean {
  const n = ci.prestigeNodes.get(id)
  return !!n && s.prestige.count >= (n.requiresPrestiges ?? 0)
}

export function buyNode(ci: ContentIndex, s: GameState, id: string): boolean {
  const n = ci.prestigeNodes.get(id)
  if (!n || !nodeVisible(ci, s, id) || nodeLevel(s, id) >= n.maxLevel) return false
  const cost = nodeCost(ci, s, id)
  if (s.prestige.currency < cost) return false
  s.prestige.currency -= cost
  s.prestige.nodes[id] = nodeLevel(s, id) + 1
  return true
}

/** Perform the prestige: award currency, reset the run, apply persistent starting bonuses. */
export function doPrestige(ci: ContentIndex, s: GameState, fx: EffectTable, now: number, hasKey = false): number {
  const gainAmt = prestigeGain(s, fx, hasKey)
  if (gainAmt < 1) return 0
  s.prestige.currency += gainAmt
  s.prestige.lifetimeCurrency += gainAmt
  s.prestige.count++
  s.stats.prestiges++

  // keep a percentage of boost tiers if a node says so
  let keepPct = 0
  const startProducers: Record<string, number> = {}
  for (const [id, lvl] of Object.entries(s.prestige.nodes)) {
    const n = ci.prestigeNodes.get(id)
    if (!n || lvl <= 0) continue
    if (n.special === 'keep_boosts_pct') keepPct += Number(n.specialValue ?? 0) * lvl
    if (n.special === 'start_producers') {
      const [pid, cnt] = String(n.specialValue ?? '').split(':')
      if (pid) startProducers[pid] = (startProducers[pid] ?? 0) + Number(cnt ?? 1) * lvl
    }
  }
  const keptBoosts: Record<string, number> = {}
  if (keepPct > 0) for (const [id, tier] of Object.entries(s.boosts)) { const k = Math.floor(tier * Math.min(1, keepPct)); if (k > 0) keptBoosts[id] = k }

  // reset run state
  s.height = 0; s.grows = 0; s.res = {}; s.earned = {}; s.producers = { ...startProducers }; s.buildings = {}; s.boosts = keptBoosts
  s.queues = {}; s.reserves = {}; s.taps = 0; s.bursts = 0; s.crafts = 0; s.craftsBy = {}
  s.combo = { count: 0, lastTapAt: 0, best: s.combo.best }
  s.cheer = { stamina: 1, active: false, until: 0 }
  s.tokens = []; s.setPiece = null; s.nextSetPieceAt = now + 45; s.setPiecesDone = 0; s.seenBands = []; s.runTime = 0
  // persistent currencies (prestige/premium) live in s.res too? No: they live in s.prestige / s.cosmetics. Nothing to restore.
  return gainAmt
}
