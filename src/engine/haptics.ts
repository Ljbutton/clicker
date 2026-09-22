/** Haptic feedback: Capacitor Haptics on device, navigator.vibrate on the web, no-op elsewhere. Respects a user toggle. */
let enabled = true
export function setHapticsEnabled(v: boolean) { enabled = v }

type Kind = 'light' | 'medium' | 'heavy' | 'success' | 'warning'
let cap: null | { impact: (o: { style: 'LIGHT' | 'MEDIUM' | 'HEAVY' }) => Promise<void>; notification: (o: { type: 'SUCCESS' | 'WARNING' | 'ERROR' }) => Promise<void> } = null
let capTried = false
async function loadCap() {
  if (capTried) return
  capTried = true
  try {
    const core = await import('@capacitor/core')
    if (!core.Capacitor.isNativePlatform()) return
    const mod = await import('@capacitor/haptics')
    cap = mod.Haptics as any
  } catch { cap = null }
}
void loadCap()

const patterns: Record<Kind, number | number[]> = { light: 8, medium: 15, heavy: 25, success: [10, 40, 20], warning: [20, 60, 20] }

export function haptic(kind: Kind = 'light') {
  if (!enabled) return
  if (cap) {
    if (kind === 'success' || kind === 'warning') void cap.notification({ type: kind.toUpperCase() as 'SUCCESS' | 'WARNING' })
    else void cap.impact({ style: kind.toUpperCase() as 'LIGHT' | 'MEDIUM' | 'HEAVY' })
    return
  }
  try { (navigator as any)?.vibrate?.(patterns[kind]) } catch { /* unsupported */ }
}
