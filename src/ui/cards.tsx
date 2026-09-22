import type { ComponentChildren } from 'preact'
import { useEffect, useRef, useState } from 'preact/hooks'
import type { Cost } from '@/content/types'
import { game, highlight } from './store'
import { costParts } from './helpers'
import { fmt } from '@/engine/numbers'
import { haptic } from '@/engine/haptics'

/** Cost line with per-resource ok/short colouring. */
export function CostLine({ cost }: { cost: Cost }) {
  const parts = costParts(game.ci, game.s, cost)
  return <span class="cost">{parts.map((p) => <span key={p.id} class={`cost-part${p.ok ? '' : ' short'}`} title={p.name}>{p.glyph}{fmt(p.need, { int: true })}</span>)}</span>
}

/** A card that pulses when the compass points at it. */
export function Card({ id, children, class: cls }: { id?: string; children: ComponentChildren; class?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const hl = !!id && highlight.value === id
  useEffect(() => { if (hl) ref.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }) }, [hl])
  return <div ref={ref} class={`card${hl ? ' hl' : ''}${cls ? ' ' + cls : ''}`} data-card={id}>{children}</div>
}

/** Buy button: tap = one action; long-press = the `onMax` action with haptic ticks. */
export function BuyButton({ label, sub, disabled, onClick, onMax, primary, testid }: { label: string; sub?: ComponentChildren; disabled?: boolean; onClick: () => void; onMax?: () => void; primary?: boolean; testid?: string }) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fired = useRef(false)
  const start = () => { fired.current = false; if (!onMax) return; timer.current = setTimeout(() => { fired.current = true; onMax(); haptic('medium') }, 450) }
  const end = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null } }
  return (
    <button class={`btn buy${primary ? ' btn-primary' : ''}`} disabled={disabled} data-testid={testid}
      onPointerDown={start} onPointerUp={end} onPointerLeave={end} onPointerCancel={end}
      onClick={() => { if (fired.current) { fired.current = false; return } onClick(); haptic('light') }}>
      <span class="buy-label">{label}</span>{sub && <span class="buy-sub">{sub}</span>}
    </button>
  )
}

/** Hold-for-N-seconds ring button for big actions (Ritual, Turn). */
export function HoldButton({ label, seconds, disabled, onComplete, class: cls }: { label: ComponentChildren; seconds: number; disabled?: boolean; onComplete: () => void; class?: string }) {
  const [p, setP] = useState(0)
  const raf = useRef(0); const t0 = useRef(0); const holding = useRef(false)
  const stop = () => { holding.current = false; cancelAnimationFrame(raf.current); setP(0) }
  const tick = () => { if (!holding.current) return; const f = Math.min(1, (performance.now() - t0.current) / (seconds * 1000)); setP(f); if (f >= 1) { holding.current = false; setP(0); haptic('heavy'); onComplete() } else raf.current = requestAnimationFrame(tick) }
  const start = (e: Event) => { e.preventDefault(); if (disabled) return; holding.current = true; t0.current = performance.now(); haptic('light'); raf.current = requestAnimationFrame(tick) }
  useEffect(() => () => cancelAnimationFrame(raf.current), [])
  return (
    <button class={`btn hold${cls ? ' ' + cls : ''}`} disabled={disabled} onPointerDown={start} onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop} onContextMenu={(e) => e.preventDefault()} style={{ '--p': `${p * 100}%` } as any}>
      <span class="hold-fill" style={{ width: `${p * 100}%` }} />
      <span class="hold-label">{label}{p > 0 ? ' …' : ''}</span>
    </button>
  )
}

export function Segmented<T extends string | number>({ value, options, onChange, labels }: { value: T; options: T[]; onChange: (v: T) => void; labels?: (v: T) => string }) {
  return <div class="seg">{options.map((o) => <button key={String(o)} class={`seg-btn${o === value ? ' on' : ''}`} onClick={() => { onChange(o); haptic('light') }}>{labels ? labels(o) : String(o)}</button>)}</div>
}

export function Row({ children, class: cls }: { children: ComponentChildren; class?: string }) { return <div class={`row${cls ? ' ' + cls : ''}`}>{children}</div> }
export function Small({ children }: { children: ComponentChildren }) { return <div class="small dim">{children}</div> }
