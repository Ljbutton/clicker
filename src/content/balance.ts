/**
 * Every tunable number that is not per-item content lives here so the headless simulator
 * and the design doc can be reconciled in one place.
 */
export const BALANCE = {
  base: 'sap',
  tap: {
    /** Base currency per tap before multipliers. */
    base: 1,
    /** Tap value is never less than this many seconds of current idle income (keeps taps meaningful at scale). */
    idlePegSeconds: 4,
    /** Chance a tap shakes loose a band resource. */
    dropChance: 0.2,
    /** Burst (crit) chance and multiplier; every Nth tap is a guaranteed burst so it is legible. */
    burstChance: 0.06,
    burstMult: 12,
    burstEvery: 25,
    /** Consecutive taps within this window keep the combo alive; the combo decays after `decay` seconds. */
    comboWindow: 0.6,
    comboDecay: 1.2,
    /** [tapsNeeded, multiplier] steps. */
    comboSteps: [[5, 1.5], [12, 2], [25, 3], [50, 5]] as [number, number][],
    /** Every N taps the tip blooms and drops a small chest. */
    bloomEvery: 500,
  },
  cheer: {
    /** Tapping grants a short window where all producers work at `mult`. Holding drains stamina. */
    windowSeconds: 3,
    mult: 2,
    staminaSeconds: 12,
    staminaRefillSeconds: 30,
    unlockHeight: 200,
  },
  grow: {
    baseCost: 10,
    costGrowth: 1.18,
    /** Meters per GROW = (baseMeters + grows * slope) * grow_meters multiplier. */
    baseMeters: 1,
    slope: 0.25,
  },
  producers: {
    /** Output multiplier applied at each breakpoint (count >= bp). */
    breakpointMult: 2,
    maxQueue: 5,
    /** Auto-crafter speed: 1 + (count - 1) * perExtra. */
    crafterSpeedPerExtra: 0.5,
  },
  offline: {
    fullRateHours: 2,
    halfRateHours: 12,
    capHours: 24,
    quarterRate: 0.25,
    /** Coarse step for offline crafting simulation, seconds. */
    craftStep: 60,
    maxCraftSteps: 2000,
  },
  prestige: {
    minHeight: 1200,
    /** Currency = floor((height / divisor) ^ exponent). */
    divisor: 1000,
    exponent: 1.5,
    keyBonus: 0.5,
  },
  setPieces: { rewardScaleSeconds: 30 },
  compass: { maxEtaSeconds: 600 },
  chests: { openTaps: 3 },
  daily: { petals: 5 },
} as const
