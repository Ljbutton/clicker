/** Serializable game state (the save file). No functions, no class instances. */
import type { ChestTier, CosmeticCategory } from '@/content/types'

export interface ActiveToken { value: number; until: number }
export interface PendingChest { id: string; tier: ChestTier; source: string; cosmeticHint?: string }
export interface ActiveSetPiece { id: string; tapsDone: number; expiresAt: number; x: number; y: number; lastTapAt: number }

export interface GameState {
  createdAt: number
  lastSeen: number
  /** Seconds of simulated play this Season / overall. */
  runTime: number
  playTime: number

  // ---------- Season run (resets on Turn) ----------
  height: number
  grows: number
  res: Record<string, number>
  earned: Record<string, number>
  heartwood: number
  producers: Record<string, number>
  workshops: Record<string, boolean>
  handcrafts: Record<string, number>
  crafted: Record<string, number>
  /** Fractional craft progress per station. */
  craftAcc: Record<string, number>
  feed: Record<string, number>
  runes: Record<string, number>
  boughs: string[]
  /** Annex id per built limb, keyed by bough id. */
  limbs: Record<string, string[]>
  limbsBought: number
  annexLevels: Record<string, number>
  hearthTarget: string | null
  strikes: number
  crits: number
  resonances: number
  masterworks: number
  thrum: number
  thrumLastAt: number
  resonanceUntil: number
  rally: { stamina: number; holding: boolean; since: number }
  droplet: { until: number; x: number; y: number } | null
  dropletBoostUntil: number
  dawnRushUntil: number
  tokens: ActiveToken[]
  setPiece: ActiveSetPiece | null
  nextSetPieceAt: number
  laneIndex: number
  nightFireflies: number
  nightIndex: number
  lastAutoThrumAt: number
  // season mechanics
  wind: { nextAt: number; caught: number }
  frost: { frozenSeconds: number; thawTaps: number; frozenAt: number; snowUntil: number; nextSnowAt: number }
  bloom: { nextAt: number; startedAt: number; active: boolean; front: number }
  storm: { nextAt: number; activeUntil: number; charges: number; fullAt: number; lastStrikeAt: number }
  caravan: { nextAt: number; activeUntil: number; offers: string[]; taken: string[]; cosmeticOffer: string | null }
  /** Star Charts chosen this Season. */
  charts: string[]
  kite: { nextAt: number }
  lastStewardAt: number

  // ---------- Persistent ----------
  stewardsOn: boolean
  /** Active expedition: returns at `until` (wall-clock ms). */
  expedition: { until: number; hours: number; folk: number } | null
  prestige: { count: number; rings: number; lifetimeRings: number; nodes: Record<string, number>; bestHeight: number }
  fireflies: number
  firefliesLifetime: number
  glimmer: number
  glimmerEarned: number
  lifetimeHeartwood: number
  lifetimeLanterns: number
  lifetimeRunes: number
  codex: { discovered: string[]; attempts: Record<string, number>; revealed: Record<string, number> }
  landmarks: string[]
  milestones: string[]
  chests: PendingChest[]
  cosmetics: { owned: string[]; equipped: Partial<Record<CosmeticCategory, string>>; purchases: string[]; supporter: boolean; initials: string; dyeHue: string }
  setPieceCounts: Record<string, number>
  wishes: { day: number; list: { id: string; base: number; done: boolean }[] }
  streak: { lastDay: number; count: number }
  annexDiscovered: string[]
  kites: number
  stats: {
    strikesTotal: number; critsTotal: number; resonancesTotal: number; growsTotal: number; craftsTotal: number
    masterworksTotal: number; seasons: number; maxHeight: number; offlineEarned: number; setPiecesTotal: number
    lastDailyBonus: number; thaws: number; gusts: number; discharges: number; trades: number; blooms: number
    handcraftsTotal: number; runesTotal: number; ritualsTotal: number; chestsOpened: number
    expeditions: number; chartsPicked: number; stewardBuys: number; kitesReturned: number
  }
  settings: { haptics: boolean; sound: boolean; reducedMotion: boolean; sci: boolean; fps30: boolean; leftHand: boolean }
  flags: Record<string, boolean>
}

export const SAVE_VERSION = 2

export function seasonDefaults(now: number): Pick<GameState,
  'height' | 'grows' | 'res' | 'earned' | 'heartwood' | 'producers' | 'workshops' | 'handcrafts' | 'crafted' | 'craftAcc' | 'runes' | 'boughs' | 'limbs' | 'limbsBought' | 'annexLevels' | 'hearthTarget' |
  'strikes' | 'crits' | 'resonances' | 'masterworks' | 'thrum' | 'thrumLastAt' | 'resonanceUntil' | 'rally' | 'droplet' | 'dropletBoostUntil' | 'dawnRushUntil' | 'tokens' | 'setPiece' | 'nextSetPieceAt' | 'laneIndex' |
  'nightFireflies' | 'nightIndex' | 'lastAutoThrumAt' | 'wind' | 'frost' | 'bloom' | 'storm' | 'caravan' | 'charts' | 'kite' | 'lastStewardAt' | 'runTime'> {
  return {
    height: 0, grows: 0, res: {}, earned: {}, heartwood: 0, producers: {}, workshops: {}, handcrafts: {}, crafted: {}, craftAcc: {}, runes: {},
    boughs: ['trunk'], limbs: {}, limbsBought: 0, annexLevels: {}, hearthTarget: null,
    strikes: 0, crits: 0, resonances: 0, masterworks: 0, thrum: 0, thrumLastAt: 0, resonanceUntil: 0,
    rally: { stamina: 1, holding: false, since: 0 }, droplet: null, dropletBoostUntil: 0, dawnRushUntil: 0, tokens: [], setPiece: null, nextSetPieceAt: 0, laneIndex: 0,
    nightFireflies: 0, nightIndex: 0, lastAutoThrumAt: 0,
    wind: { nextAt: 0, caught: 0 },
    frost: { frozenSeconds: 0, thawTaps: 0, frozenAt: 0, snowUntil: 0, nextSnowAt: 0 },
    bloom: { nextAt: 0, startedAt: 0, active: false, front: 0 },
    storm: { nextAt: 0, activeUntil: 0, charges: 0, fullAt: 0, lastStrikeAt: 0 },
    caravan: { nextAt: 0, activeUntil: 0, offers: [], taken: [], cosmeticOffer: null },
    charts: [], kite: { nextAt: 0 }, lastStewardAt: 0,
    runTime: 0,
  }
}

export function defaultState(now: number): GameState {
  return {
    createdAt: now, lastSeen: now, playTime: 0,
    ...seasonDefaults(now),
    feed: {}, stewardsOn: true, expedition: null,
    prestige: { count: 0, rings: 0, lifetimeRings: 0, nodes: {}, bestHeight: 0 },
    fireflies: 0, firefliesLifetime: 0, glimmer: 0, glimmerEarned: 0, lifetimeHeartwood: 0, lifetimeLanterns: 0, lifetimeRunes: 0,
    codex: { discovered: [], attempts: {}, revealed: {} },
    landmarks: [], milestones: [], chests: [],
    cosmetics: { owned: [], equipped: {}, purchases: [], supporter: false, initials: '', dyeHue: '#ff8a5c' },
    setPieceCounts: {}, wishes: { day: 0, list: [] }, streak: { lastDay: 0, count: 0 }, annexDiscovered: [], kites: 0,
    stats: { strikesTotal: 0, critsTotal: 0, resonancesTotal: 0, growsTotal: 0, craftsTotal: 0, masterworksTotal: 0, seasons: 0, maxHeight: 0, offlineEarned: 0, setPiecesTotal: 0, lastDailyBonus: 0, thaws: 0, gusts: 0, discharges: 0, trades: 0, blooms: 0, handcraftsTotal: 0, runesTotal: 0, ritualsTotal: 0, chestsOpened: 0, expeditions: 0, chartsPicked: 0, stewardBuys: 0, kitesReturned: 0 },
    settings: { haptics: true, sound: false, reducedMotion: false, sci: false, fps30: false, leftHand: false },
    flags: {},
  }
}

/** Fill in any fields missing from an older/partial save so systems never see undefined. */
export function normalizeState(partial: Partial<GameState>, now: number): GameState {
  const d = defaultState(now)
  const s: GameState = { ...d, ...partial }
  const objs = ['rally', 'wind', 'frost', 'bloom', 'storm', 'caravan', 'kite', 'prestige', 'codex', 'cosmetics', 'wishes', 'streak', 'stats', 'settings'] as const
  for (const k of objs) (s as any)[k] = { ...(d as any)[k], ...((partial as any)[k] ?? {}) }
  const maps = ['res', 'earned', 'producers', 'workshops', 'handcrafts', 'crafted', 'craftAcc', 'feed', 'runes', 'limbs', 'annexLevels', 'setPieceCounts', 'flags'] as const
  for (const k of maps) if (!s[k] || typeof s[k] !== 'object') (s as any)[k] = {}
  const arrs = ['boughs', 'tokens', 'landmarks', 'milestones', 'chests', 'annexDiscovered', 'charts'] as const
  for (const k of arrs) if (!Array.isArray(s[k])) (s as any)[k] = []
  if (!s.boughs.includes('trunk')) s.boughs.unshift('trunk')
  if (!Array.isArray(s.codex.discovered)) s.codex.discovered = []
  if (!Array.isArray(s.cosmetics.owned)) s.cosmetics.owned = []
  if (!Array.isArray(s.wishes.list)) s.wishes.list = []
  return s
}
