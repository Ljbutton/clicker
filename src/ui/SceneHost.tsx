import { useEffect, useRef } from 'preact/hooks'
import { game } from './store'
import { haptic } from '@/engine/haptics'

/** Hosts the canvas scene; the tap target covers the trunk area. Replaced by the full renderer. */
export function SceneHost() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current!
    const ctx = c.getContext('2d')!
    let raf = 0
    const draw = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const w = c.clientWidth, h = c.clientHeight
      if (c.width !== w * dpr || c.height !== h * dpr) { c.width = w * dpr; c.height = h * dpr }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const band = game.band
      const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, band.sky[0]); g.addColorStop(1, band.sky[1])
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h)
      ctx.fillStyle = '#5a3b22'; ctx.fillRect(w / 2 - 28, 0, 56, h)
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [])
  return (
    <div class="scene">
      <canvas ref={ref} class="scene-canvas" />
      <button class="tap-target" data-testid="tap-target" aria-label="Strike the trunk" onPointerDown={(e) => { e.preventDefault(); game.tap(e.clientX, e.clientY); haptic('light') }} />
    </div>
  )
}
