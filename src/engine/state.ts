/** Serializable game state. Everything the save file holds; no functions, no class instances. */

export interface CraftJob { recipeId: string; remaining: number; total: number }

export interface ActiveToken { value: number; until: number }

export interface PendingChest { id: string; tier: 'wood' | 'silver' | 'gold' | 'giant'; source: string; reward: import('@/content/types').Reward }

export interface ActiveSetPiece { id: string; tapsDone: number; expiresAt: number; x: number; y: number }

export interface GameState {
  /** Wall-clock timestamps in ms. */
  createdAt: number
  lastSeen: number
  /** Seconds of simulated play in this run and overall. */
  runTime: number
  playTime: number

  // ----- run state (reset on prestige) -----
  height: number
  grows: number
  res: Record<string, number>
  /** Lifetime earned per resource this run (never decreases). */
  earned: Record<string, number>
  producers: Record<string, number>
  buildings: Record<string, number>
  boosts: Record<string, number>
  queues: Record<string, CraftJob[]>
  /** Crafter reserve dial per station: keep N inputs uncrafted. */
  reserves: Record<string, number>
  taps: number
  bursts: number
  crafts: number
  craftsBy: Record<string, number>
  combo: { count: number; lastTapAt: number; best: number }
  cheer: { stamina: number; active: boolean; until: number }
  tokens: ActiveToken[]
  setPiece: ActiveSetPiece | null
  nextSetPieceAt: number
  setPiecesDone: number
  /** Buildings whose "built" animation has already played this run (scene concern, but persisted so reload doesn't replay). */
  seenBands: string[]

  // ----- persistent state (survives prestige) -----
  prestige: {
    count: number
    currency: number
    lifetimeCurrency: number
    nodes: Record<string, number>
    bestHeight: number
  }
  milestones: string[]
  chests: PendingChest[]
  cosmetics: {
    owned: string[]
    equipped: Partial<Record<import('@/content/types').CosmeticCategory, string>>
    petals: number
    petalsEarned: number
    supporter: boolean
    purchases: string[]
  }
  stats: {
    tapsTotal: number
    burstsTotal: number
    growsTotal: number
    craftsTotal: number
    prestiges: number
    maxHeight: number
    offlineEarned: number
    setPiecesTotal: number
    lastDailyBonus: number
  }
  settings: { haptics: boolean; sound: boolean; reducedMotion: boolean; sci: boolean; fps30: boolean }
  /** One-time flags: tutorial steps, tips shown, features revealed. */
  flags: Record<string, boolean>
}

export const SAVE_VERSION = 1

export function defaultState(now: number): GameState {
  return {
    createdAt: now, lastSeen: now, runTime: 0, playTime: 0,
    height: 0, grows: 0, res: {}, earned: {}, producers: {}, buildings: {}, boosts: {}, queues: {}, reserves: {},
    taps: 0, bursts: 0, crafts: 0, craftsBy: {},
    combo: { count: 0, lastTapAt: 0, best: 0 },
    cheer: { stamina: 1, active: false, until: 0 },
    tokens: [], setPiece: null, nextSetPieceAt: 0, setPiecesDone: 0, seenBands: [],
    prestige: { count: 0, currency: 0, lifetimeCurrency: 0, nodes: {}, bestHeight: 0 },
    milestones: [], chests: [],
    cosmetics: { owned: [], equipped: {}, petals: 0, petalsEarned: 0, supporter: false, purchases: [] },
    stats: { tapsTotal: 0, burstsTotal: 0, growsTotal: 0, craftsTotal: 0, prestiges: 0, maxHeight: 0, offlineEarned: 0, setPiecesTotal: 0, lastDailyBonus: 0 },
    settings: { haptics: true, sound: false, reducedMotion: false, sci: false, fps30: false },
    flags: {},
  }
}

/** Fill in any fields missing from an older/partial save so systems never see undefined. */
export function normalizeState(partial: Partial<GameState>, now: number): GameState {
  const d = defaultState(now)
  const s: GameState = { ...d, ...partial }
  s.combo = { ...d.combo, ...(partial.combo ?? {}) }
  s.cheer = { ...d.cheer, ...(partial.cheer ?? {}) }
  s.prestige = { ...d.prestige, ...(partial.prestige ?? {}) }
  s.cosmetics = { ...d.cosmetics, ...(partial.cosmetics ?? {}) }
  s.stats = { ...d.stats, ...(partial.stats ?? {}) }
  s.settings = { ...d.settings, ...(partial.settings ?? {}) }
  for (const k of ['res', 'earned', 'producers', 'buildings', 'boosts', 'queues', 'reserves', 'craftsBy', 'flags'] as const) {
    if (!s[k] || typeof s[k] !== 'object') (s as any)[k] = {}
  }
  for (const k of ['tokens', 'seenBands', 'milestones', 'chests'] as const) {
    if (!Array.isArray(s[k])) (s as any)[k] = []
  }
  return s
}
