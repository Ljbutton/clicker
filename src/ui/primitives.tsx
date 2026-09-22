import { signal } from '@preact/signals'
import type { ComponentChildren } from 'preact'
import { useEffect, useState } from 'preact/hooks'
import { fmt } from '@/engine/numbers'

/* ---------- Toasts ---------- */
export interface Toast { id: number; text: string; kind: 'info' | 'good' | 'reward' | 'bad'; icon?: string; ttl: number }
export const toasts = signal<Toast[]>([])
let toastId = 1
export function toast(text: string, kind: Toast['kind'] = 'info', icon?: string, ttl = 2600) {
  const t: Toast = { id: toastId++, text, kind, icon, ttl }
  toasts.value = [...toasts.value.slice(-3), t]
  setTimeout(() => { toasts.value = toasts.value.filter((x) => x.id !== t.id) }, ttl)
}
export function Toasts() {
  return (
    <div class="toasts" aria-live="polite">
      {toasts.value.map((t) => (
        <div key={t.id} class={`toast toast-${t.kind}`}>{t.icon && <span class="toast-icon">{t.icon}</span>}<span>{t.text}</span></div>
      ))}
    </div>
  )
}

/* ---------- Progress bar ---------- */
export function Bar({ value, max, color, label, height = 10 }: { value: number; max: number; color?: string; label?: string; height?: number }) {
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0
  return (
    <div class="bar" style={{ height: `${height}px` }} role="progressbar" aria-valuenow={Math.round(pct * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div class="bar-fill" style={{ width: `${pct * 100}%`, background: color ?? 'var(--accent)' }} />
    </div>
  )
}

/* ---------- Modal sheet ---------- */
export function Sheet({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title?: string; children?: ComponentChildren; wide?: boolean }) {
  if (!open) return null
  return (
    <div class="sheet-backdrop" onClick={onClose}>
      <div class={`sheet${wide ? ' sheet-wide' : ''}`} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={title}>
        <div class="sheet-handle" />
        {title && <h2 class="sheet-title">{title}</h2>}
        <div class="sheet-body">{children}</div>
        <button class="btn btn-ghost sheet-close" onClick={onClose} aria-label="Close">Close</button>
      </div>
    </div>
  )
}

/* ---------- Animated number ---------- */
export function Num({ value, class: cls }: { value: number; class?: string }) {
  const [shown, setShown] = useState(value)
  useEffect(() => {
    let raf = 0; const start = shown; const end = value; const t0 = performance.now()
    const dur = Math.abs(end - start) > 0 ? 220 : 0
    const step = (now: number) => { const t = dur ? Math.min(1, (now - t0) / dur) : 1; setShown(start + (end - start) * (1 - Math.pow(1 - t, 3))); if (t < 1) raf = requestAnimationFrame(step) }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value])
  return <span class={`num ${cls ?? ''}`}>{fmt(shown)}</span>
}

/* ---------- Pill / chip ---------- */
export function Chip({ children, color }: { children: ComponentChildren; color?: string }) {
  return <span class="chip" style={color ? { background: color } : undefined}>{children}</span>
}
