/** Tiny colour helpers for the canvas scene (hex/rgb parsing, mixing, alpha). Pure; cached parses. */
export type Rgb = [number, number, number]

const parseCache = new Map<string, Rgb>()
const GREY: Rgb = [128, 128, 128]

/** Parse '#rgb', '#rrggbb', 'rgb(r,g,b)' or 'rgba(r,g,b,a)' into [r,g,b]. Unknown strings return grey. */
export function toRgb(c: string): Rgb {
  const hit = parseCache.get(c)
  if (hit) return hit
  let out: Rgb = GREY
  if (c.startsWith('#')) {
    const h = c.slice(1)
    if (h.length === 3 || h.length === 4) out = [parseInt(h[0]! + h[0], 16), parseInt(h[1]! + h[1], 16), parseInt(h[2]! + h[2], 16)]
    else if (h.length >= 6) out = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
  } else if (c.startsWith('rgb')) {
    const m = c.match(/[\d.]+/g)
    if (m && m.length >= 3) out = [Number(m[0]), Number(m[1]), Number(m[2])]
  }
  if (out.some((v) => !Number.isFinite(v))) out = GREY
  if (parseCache.size > 2000) parseCache.clear()
  parseCache.set(c, out)
  return out
}

const clamp255 = (v: number) => Math.max(0, Math.min(255, Math.round(v)))

export function rgbStr(rgb: Rgb): string { return `rgb(${clamp255(rgb[0])},${clamp255(rgb[1])},${clamp255(rgb[2])})` }

/** Linear mix of two colours, t in 0..1 (0 = a). */
export function mix(a: string, b: string, t: number): string {
  if (t <= 0) return a
  if (t >= 1) return b
  const A = toRgb(a), B = toRgb(b)
  return rgbStr([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t])
}

/** Colour with alpha. */
export function rgba(c: string, alpha: number): string {
  const [r, g, b] = toRgb(c)
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, alpha)).toFixed(3)})`
}

/** Multiply brightness: k < 1 darkens, k > 1 lightens (toward white). */
export function shade(c: string, k: number): string {
  const [r, g, b] = toRgb(c)
  if (k <= 1) return rgbStr([r * k, g * k, b * k])
  const t = Math.min(1, k - 1)
  return rgbStr([r + (255 - r) * t, g + (255 - g) * t, b + (255 - b) * t])
}

/** Perceived luminance 0..1. */
export function luma(c: string): number {
  const [r, g, b] = toRgb(c)
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
}

/** Deterministic 0..1 hash of a string (for stable per-id jitter). */
export function hash01(s: string, salt = 0): number {
  let h = 2166136261 ^ salt
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return ((h >>> 0) % 10007) / 10007
}
