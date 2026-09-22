/** Pure UI helpers (no DOM, no signals) so they can be unit-tested in node. */
import type { Cost, CosmeticCategory, Effect, RecipeDef, Reward } from '@/content/types'
import type { ContentIndex } from '@/systems/index'
import type { GameState } from '@/engine/state'
import { fmt } from '@/engine/numbers'

export const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV']
export function roman(n: number): string { return ROMAN[n] ?? String(n) }

/** fmt with the scientific-notation setting applied. */
export function fmtS(n: number, sci = false, opts?: { digits?: number; int?: boolean }): string {
  if (sci && Number.isFinite(n) && Math.abs(n) >= 1000) return n.toExponential(2)
  return fmt(n, opts)
}

/** ETA text per GDD §9.3: ~45 s · ~4 m 10 s · ~2 h 15 m · > 1 day. */
export function etaText(seconds: number): string {
  if (!Number.isFinite(seconds)) return '—'
  if (seconds <= 0) return 'now'
  const s = Math.round(seconds)
  if (s < 60) return `~${s} s`
  const m = Math.floor(s / 60)
  if (m < 60) return s % 60 ? `~${m} m ${s % 60} s` : `~${m} m`
  const h = Math.floor(m / 60)
  if (h < 24) return m % 60 ? `~${h} h ${m % 60} m` : `~${h} h`
  return '> 1 day'
}

/** "5 h 12 m" / "12 m" / "45 s" for the return board. */
export function awayText(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  if (s < 60) return `${s} s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} m`
  const h = Math.floor(m / 60)
  if (h < 48) return `${h} h ${m % 60} m`
  return `${Math.floor(h / 24)} d ${h % 24} h`
}

export interface CostPart { id: string; glyph: string; name: string; need: number; have: number; ok: boolean }
export function costParts(ci: ContentIndex, s: GameState, cost: Cost): CostPart[] {
  return Object.entries(cost).map(([id, need]) => {
    const r = ci.resources.get(id)
    const have = s.res[id] ?? 0
    return { id, glyph: r?.glyph ?? '?', name: r?.name ?? id, need, have, ok: have + 1e-9 >= need }
  })
}
/** "40 🪚 + 20 🫙" (glyph form) or "40 Plank + 20 Resin" (names). */
export function costText(ci: ContentIndex, cost: Cost, opts: { names?: boolean; sci?: boolean } = {}): string {
  const parts = Object.entries(cost).map(([id, n]) => {
    const r = ci.resources.get(id)
    return `${fmtS(Math.ceil(n), opts.sci, { int: true })} ${opts.names ? r?.name ?? id : r?.glyph ?? id}`
  })
  return parts.join(' + ') || 'free'
}
export function canPay(s: GameState, cost: Cost): boolean {
  for (const [id, n] of Object.entries(cost)) if ((s.res[id] ?? 0) + 1e-9 < n) return false
  return true
}

/* ---------- recipes ---------- */
export function recipeWorth(ci: ContentIndex, r: RecipeDef, inputs: Cost = r.inputs): { worth: number; inputsWorth: number; mult: number } {
  const worth = (ci.resources.get(r.output.id)?.worth ?? 0) * r.output.count
  let inputsWorth = 0
  for (const [id, n] of Object.entries(inputs)) inputsWorth += (ci.resources.get(id)?.worth ?? 0) * n
  return { worth, inputsWorth, mult: inputsWorth > 0 ? worth / inputsWorth : 0 }
}
/** Recipe cards always print "worth 480 Sap · inputs 116 Sap · x4.1". */
export function recipeWorthText(ci: ContentIndex, r: RecipeDef, inputs: Cost = r.inputs): string {
  const w = recipeWorth(ci, r, inputs)
  return `worth ${fmt(w.worth)} Sap · inputs ${fmt(w.inputsWorth)} Sap · x${w.mult.toFixed(1)}`
}
/** "4 🪚 + 1 🫙 → 1 🪵" */
export function recipeLine(ci: ContentIndex, r: RecipeDef, inputs: Cost = r.inputs): string {
  const out = ci.resources.get(r.output.id)
  return `${costText(ci, inputs)} → ${r.output.count} ${out?.glyph ?? r.output.id}`
}

/* ---------- feed dial ---------- */
export function feedLabel(v: number): string { return v <= 0 ? 'Off' : `${Math.round(v * 100)}%` }
export function feedName(v: number): string { return v <= 0 ? 'Off' : v <= 0.25 ? 'Thrifty' : v <= 0.5 ? 'Balanced' : 'Greedy' }

/* ---------- effects ---------- */
const TARGET_NAMES: Record<string, string> = {
  all_production: 'everything', raw_production: 'all raw production', craft_throughput: 'all workshop throughput', tap: 'Strike value', tap_peg: 'tap peg',
  crit_chance: 'crit chance', resonance_mult: 'Resonance', resonance_seconds: 'Resonance', masterwork_chance: 'Masterwork chance', rally_stamina: 'Rally stamina',
  rally_refill: 'Rally refill', grow_meters: 'metres per GROW', grow_meters_add: 'metres per GROW', grow_cost: 'GROW cost', offline_rate_add: 'offline rate',
  offline_cap_add: 'offline cap', ritual_cost: 'Ritual costs', producer_cost: 'lodge costs', crew_cost: 'crew costs', recipe_inputs: 'recipe inputs',
  milestone_bonus: 'milestone multipliers', discovery_fireflies: 'discovery Fireflies', lit_every: 'Lanterns per lit bough', dawn_rush_seconds: 'Dawn Rush',
  acorn_minutes: 'Golden Acorn', auto_thrum: 'Auto-Thrum', wind_every: 'gust frequency', windmill_cap: 'Windmill cap', cellar_hours: 'Frost Cellar',
  thaw_mult: 'thaw', bloom_seconds: 'Bloom', rod_charges: 'Rod charges', caravan_offers: 'caravan offers',
}
const PCT = new Set(['crit_chance', 'masterwork_chance', 'offline_rate_add', 'milestone_bonus'])
const SECS = new Set(['resonance_seconds', 'rally_stamina', 'dawn_rush_seconds', 'bloom_seconds'])
const HOURS = new Set(['offline_cap_add', 'cellar_hours'])
function trim(n: number): string { return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, '') }
/** Human text for an effect applied `times` times: "Sap production ×1.5", "+2% crit chance", "+0.5 m per GROW". */
export function effectText(e: Effect, times = 1, ci?: ContentIndex): string {
  let name = TARGET_NAMES[e.target]
  if (!name && e.target.startsWith('resource:')) { const id = e.target.slice(9); name = `${ci?.resources.get(id)?.name ?? id} production` }
  if (!name && e.target.startsWith('station:')) { const id = e.target.slice(8); name = `${ci?.workshops.get(id)?.name ?? id} throughput` }
  name ??= e.target
  if (e.op === 'mult') return `${name} ×${trim(Math.pow(e.value, times))}`
  const v = e.value * times
  if (PCT.has(e.target)) return `+${trim(v * 100)}% ${name}`
  if (SECS.has(e.target)) return `${name} +${trim(v)} s`
  if (HOURS.has(e.target)) return `${name} +${trim(v)} h`
  if (e.target === 'grow_meters_add') return `+${trim(v)} m per GROW`
  if (e.target === 'acorn_minutes') return `${name} +${trim(v)} min`
  return `${name} +${trim(v)}`
}

/* ---------- rewards ---------- */
export function rewardText(ci: ContentIndex, r: Reward | undefined): string {
  if (!r) return ''
  const parts: string[] = []
  if (r.fireflies) parts.push(`✨ ${r.fireflies}`)
  if (r.glimmer) parts.push(`🫙 ${r.glimmer}`)
  if (r.chest) parts.push(`${r.chest === 'bark' ? '🪵' : r.chest === 'amber' ? '🟠' : r.chest === 'star' ? '⭐' : '🌀'} ${r.chest} chest`)
  if (r.cosmetic) { const c = ci.cosmetics.get(r.cosmetic); parts.push(`${c?.glyph ?? '🎁'} ${c?.name ?? 'cosmetic'}`) }
  if (r.landmark) parts.push(`🏛️ ${ci.landmarks.get(r.landmark)?.name ?? 'Landmark'}`)
  if (r.token) parts.push(`×${r.token.value} for ${Math.round(r.token.seconds / 60)} min`)
  if (r.incomeSeconds) parts.push(`${r.incomeSeconds} s of income`)
  if (r.resources) for (const [id, n] of Object.entries(r.resources)) parts.push(`${fmt(n)} ${ci.resources.get(id)?.glyph ?? id}`)
  return parts.join(' · ')
}

/* ---------- cosmetics ---------- */
export const CATEGORY_LABELS: Record<CosmeticCategory, string> = {
  lantern_color: 'Lantern colour', lantern_shape: 'Lantern shape', lantern_glow: 'Lantern glow', tree: 'Tree', hat: 'Hat', chief: 'Chief',
  roof: 'Roof', sky: 'Sky', tap: 'Tap effect', meter: 'Thrum meter', crown: 'Crown', companion: 'Companion', frame: 'Frame', title: 'Title',
}
export const CATEGORIES = Object.keys(CATEGORY_LABELS) as CosmeticCategory[]
export function categoryLabel(c: CosmeticCategory | string): string { return (CATEGORY_LABELS as Record<string, string>)[c] ?? c }
/** A representative colour from a cosmetic's params, for a swatch dot. */
export function swatch(params: Record<string, string | number | boolean>): string | null {
  for (const k of ['color', 'leaf', 'top', 'cloak', 'bark']) { const v = params[k]; if (typeof v === 'string' && v.startsWith('#')) return v }
  return null
}
export function groupBy<T, K>(arr: T[], key: (t: T) => K): Map<K, T[]> {
  const m = new Map<K, T[]>()
  for (const t of arr) { const k = key(t); const l = m.get(k); if (l) l.push(t); else m.set(k, [t]) }
  return m
}

/* ---------- shop (store-integration placeholders) ---------- */
export const GLIMMER_PACKS = [
  { sku: 'glimmer_200', glimmer: 200, usd: '$1.99', best: false },
  { sku: 'glimmer_550', glimmer: 550, usd: '$4.99', best: true },
  { sku: 'glimmer_1200', glimmer: 1200, usd: '$9.99', best: false },
  { sku: 'glimmer_2600', glimmer: 2600, usd: '$19.99', best: false },
] as const
export const SUPPORTER_USD = '$4.99'

/* ---------- rings ---------- */
/** "Turn at 3 Rings · 1 now · +1 in ~12 m" before the threshold, "Turn now: 4 Rings (+1 in ~12 m)" after. */
export function ringsReadout(rings: number, min: number, etaSeconds: number): string {
  const next = `+1 in ${Number.isFinite(etaSeconds) ? etaText(etaSeconds) : '—'}`
  return rings < min ? `Turn at ${min} Rings · ${rings} now · ${next}` : `Turn now: ${rings} Rings (${next})`
}
