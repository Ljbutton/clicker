/**
 * Fixed-step game loop with catch-up, driven by requestAnimationFrame when visible
 * and a slow setInterval when the tab is hidden. Large gaps (tab suspended) are
 * handed to `onGap` so offline-progress can be applied in one step instead of
 * simulating thousands of ticks.
 */
export interface LoopOptions {
  /** Simulation step in seconds. */
  step?: number
  /** Gaps larger than this (seconds) are passed to onGap instead of being ticked. */
  maxCatchup?: number
  onTick: (dt: number, now: number) => void
  onRender?: (alpha: number, now: number) => void
  onGap?: (seconds: number) => void
}

export function createLoop(opts: LoopOptions) {
  const step = opts.step ?? 0.1
  const maxCatchup = opts.maxCatchup ?? 30
  let acc = 0
  let last = 0
  let running = false
  let raf = 0
  let interval: ReturnType<typeof setInterval> | undefined

  function frame(nowMs: number) {
    if (!running) return
    const now = nowMs / 1000
    if (last === 0) last = now
    let delta = now - last
    last = now
    if (delta > maxCatchup) { opts.onGap?.(delta); delta = 0 }
    acc += delta
    let guard = 0
    while (acc >= step && guard++ < 1000) { opts.onTick(step, now); acc -= step }
    opts.onRender?.(acc / step, now)
    if (typeof document === 'undefined' || document.visibilityState === 'visible') raf = requestAnimationFrame(frame)
  }

  function start() {
    if (running) return
    running = true
    last = 0
    raf = requestAnimationFrame(frame)
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVis)
    }
  }
  function onVis() {
    if (document.visibilityState === 'visible') {
      if (interval) { clearInterval(interval); interval = undefined }
      last = 0
      raf = requestAnimationFrame(frame)
    } else {
      cancelAnimationFrame(raf)
      // keep the sim alive slowly in background; rAF is throttled/paused there
      interval = setInterval(() => frame(performance.now()), 1000)
    }
  }
  function stop() {
    running = false
    cancelAnimationFrame(raf)
    if (interval) { clearInterval(interval); interval = undefined }
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVis)
  }
  return { start, stop }
}
