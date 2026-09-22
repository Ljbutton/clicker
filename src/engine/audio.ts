/** Tiny WebAudio synth. Off by default; safe no-ops without an AudioContext. Pentatonic, tap pitch rises with Thrum. */
let ctx: AudioContext | null = null
let enabled = false
let master: GainNode | null = null
const PENTA = [0, 2, 4, 7, 9, 12, 14, 16]

export function setSoundEnabled(v: boolean) { enabled = v; if (v) ensure() }
function ensure(): AudioContext | null {
  if (ctx) return ctx
  try {
    const AC = (globalThis as any).AudioContext || (globalThis as any).webkitAudioContext
    if (!AC) return null
    ctx = new AC() as AudioContext
    master = ctx.createGain(); master.gain.value = 0.18; master.connect(ctx.destination)
  } catch { ctx = null }
  return ctx
}
/** Call on the first user gesture so browsers allow playback. */
export function unlockAudio() { const c = ensure(); if (c && c.state === 'suspended') void c.resume() }

function tone(freq: number, dur = 0.12, type: OscillatorType = 'sine', gain = 1, when = 0) {
  if (!enabled) return
  const c = ensure(); if (!c || !master) return
  try {
    const o = c.createOscillator(), g = c.createGain()
    o.type = type; o.frequency.value = freq
    const t = c.currentTime + when
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02)
  } catch { /* ignore */ }
}
const note = (semi: number, base = 261.63) => base * Math.pow(2, semi / 12)

export const audio = {
  strike(thrum: number) { const i = Math.min(PENTA.length - 1, Math.floor((thrum / 100) * PENTA.length)); tone(note(PENTA[i]!, 329.6), 0.08, 'triangle', 0.6) },
  crit() { tone(note(12, 329.6), 0.18, 'square', 0.5); tone(note(19, 329.6), 0.25, 'sine', 0.5, 0.05) },
  resonance() { [0, 4, 7, 12].forEach((s, i) => tone(note(s, 220), 0.5, 'sine', 0.5, i * 0.06)) },
  grow() { [0, 2, 4].forEach((s, i) => tone(note(s, 392), 0.15, 'triangle', 0.5, i * 0.07)) },
  chime(kind: 'milestone' | 'goal' | 'unlock' | 'chest' | 'discovery' | 'masterwork') {
    const seq: Record<string, number[]> = { milestone: [0, 4, 7, 12], goal: [7, 12], unlock: [0, 7, 12, 16], chest: [4, 9, 12], discovery: [0, 5, 9, 14, 19], masterwork: [0, 7, 14, 21] }
    ;(seq[kind] ?? [0, 12]).forEach((s, i) => tone(note(s, 523.25), 0.22, 'sine', 0.45, i * 0.08))
  },
  ritual() { [0, 3, 7, 10, 14].forEach((s, i) => tone(note(s, 130.8), 0.6, 'sawtooth', 0.25, i * 0.12)) },
  turn() { [12, 9, 7, 4, 0, -5].forEach((s, i) => tone(note(s, 392), 0.5, 'sine', 0.4, i * 0.15)) },
  tick() { tone(880, 0.04, 'square', 0.25) },
}
