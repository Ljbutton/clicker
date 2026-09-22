/** Number formatting for idle-game magnitudes. Stays within JS doubles (max ~1.8e308). */
const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc', 'UDc', 'DDc', 'TDc', 'QaDc', 'QiDc', 'SxDc', 'SpDc', 'OcDc', 'NoDc', 'Vg']

/** Format a quantity for display: 0-999 as integers, then 1.23K, 45.6M, 789B ... */
export function fmt(n: number, opts: { digits?: number; int?: boolean } = {}): string {
  if (!Number.isFinite(n)) return n > 0 ? '∞' : n < 0 ? '-∞' : '?'
  const sign = n < 0 ? '-' : ''
  n = Math.abs(n)
  if (n < 1000) {
    if (opts.int || Number.isInteger(n)) return sign + Math.floor(n).toString()
    return sign + (n < 10 ? n.toFixed(opts.digits ?? 1) : Math.floor(n).toString())
  }
  const tier = Math.min(SUFFIXES.length - 1, Math.floor(Math.log10(n) / 3))
  const scaled = n / Math.pow(10, tier * 3)
  if (tier === SUFFIXES.length - 1 && scaled >= 1000) return sign + n.toExponential(2)
  const digits = scaled < 10 ? 2 : scaled < 100 ? 1 : 0
  return sign + scaled.toFixed(digits) + SUFFIXES[tier]
}

/** Format a per-second rate. */
export function fmtRate(n: number): string {
  return fmt(n, { digits: 1 }) + '/s'
}

/** Format seconds as a compact duration: 45s, 3m 12s, 2h 05m, 3d 4h. */
export function fmtDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '—'
  const s = Math.floor(seconds)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ${(s % 60).toString().padStart(2, '0')}s`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ${(m % 60).toString().padStart(2, '0')}m`
  const d = Math.floor(h / 24)
  return `${d}d ${h % 24}h`
}

/** Percent with sensible precision: 12%, 3.5%, 0.25% */
export function fmtPct(frac: number): string {
  const p = frac * 100
  if (p >= 10) return `${Math.round(p)}%`
  if (p >= 1) return `${p.toFixed(1)}%`
  return `${p.toFixed(2)}%`
}

/** Geometric cost curve: base * growth^count. */
export function geomCost(base: number, growth: number, count: number): number {
  return base * Math.pow(growth, count)
}

/** Cost of buying `n` more of a geometric-cost item when you already own `owned`. */
export function geomCostN(base: number, growth: number, owned: number, n: number): number {
  if (n <= 0) return 0
  if (growth === 1) return base * n
  return base * Math.pow(growth, owned) * (Math.pow(growth, n) - 1) / (growth - 1)
}

/** Max number you can afford of a geometric-cost item with `money`, already owning `owned`. */
export function geomMaxAffordable(base: number, growth: number, owned: number, money: number): number {
  if (money <= 0) return 0
  if (growth === 1) return Math.floor(money / base)
  const first = base * Math.pow(growth, owned)
  if (money < first) return 0
  // n = floor(log_g(money*(g-1)/first + 1))
  const n = Math.floor(Math.log(money * (growth - 1) / first + 1) / Math.log(growth))
  // guard against float error
  let k = Math.max(0, n)
  while (k > 0 && geomCostN(base, growth, owned, k) > money) k--
  while (geomCostN(base, growth, owned, k + 1) <= money) k++
  return k
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
