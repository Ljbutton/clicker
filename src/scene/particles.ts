/** Lightweight particle + floating-text system for the canvas scene. Pooled, no allocations per frame beyond spawn. */
export interface Particle {
  x: number; y: number; vx: number; vy: number; life: number; maxLife: number
  size: number; color: string; gravity: number; drag: number; shape: 'circle' | 'square' | 'spark' | 'text'; text?: string; rot: number; vrot: number
}

export class ParticleSystem {
  private pool: Particle[] = []
  live: Particle[] = []
  readonly max: number
  constructor(max = 400) { this.max = max }

  spawn(p: Partial<Particle> & { x: number; y: number }): Particle | null {
    if (this.live.length >= this.max) return null
    const q = this.pool.pop() ?? ({} as Particle)
    q.x = p.x; q.y = p.y; q.vx = p.vx ?? 0; q.vy = p.vy ?? 0
    q.maxLife = p.maxLife ?? 0.8; q.life = q.maxLife
    q.size = p.size ?? 4; q.color = p.color ?? '#ffb547'; q.gravity = p.gravity ?? 300; q.drag = p.drag ?? 0.98
    q.shape = p.shape ?? 'circle'; q.text = p.text; q.rot = p.rot ?? 0; q.vrot = p.vrot ?? 0
    this.live.push(q)
    return q
  }

  /** Radial burst of debris. */
  burst(x: number, y: number, count: number, opts: { color?: string | string[]; speed?: number; size?: number; life?: number; shape?: Particle['shape']; gravity?: number } = {}) {
    const colors = Array.isArray(opts.color) ? opts.color : [opts.color ?? '#ffb547']
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2
      const s = (opts.speed ?? 220) * (0.4 + Math.random() * 0.8)
      this.spawn({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60, size: (opts.size ?? 4) * (0.6 + Math.random() * 0.8), color: colors[i % colors.length], maxLife: (opts.life ?? 0.7) * (0.7 + Math.random() * 0.6), shape: opts.shape ?? 'square', gravity: opts.gravity ?? 500, rot: Math.random() * 6.28, vrot: (Math.random() - 0.5) * 10 })
    }
  }

  /** Floating damage-number style text that rises and fades. */
  text(x: number, y: number, text: string, opts: { color?: string; size?: number; life?: number; vy?: number } = {}) {
    this.spawn({ x, y, vx: (Math.random() - 0.5) * 30, vy: opts.vy ?? -90, gravity: 0, drag: 0.96, size: opts.size ?? 18, color: opts.color ?? '#ffffff', maxLife: opts.life ?? 1.0, shape: 'text', text })
  }

  update(dt: number) {
    const live = this.live
    for (let i = live.length - 1; i >= 0; i--) {
      const p = live[i]!
      p.life -= dt
      if (p.life <= 0) { live[i] = live[live.length - 1]!; live.pop(); this.pool.push(p); continue }
      p.vy += p.gravity * dt
      p.vx *= p.drag; p.vy *= p.drag
      p.x += p.vx * dt; p.y += p.vy * dt
      p.rot += p.vrot * dt
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    for (const p of this.live) {
      const t = p.life / p.maxLife
      ctx.globalAlpha = t < 0.3 ? t / 0.3 : 1
      ctx.fillStyle = p.color
      if (p.shape === 'text') {
        ctx.font = `800 ${p.size}px ${'-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif'}`
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineJoin = 'round'
        ctx.strokeText(p.text ?? '', p.x, p.y); ctx.fillText(p.text ?? '', p.x, p.y)
      } else if (p.shape === 'circle') {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.5 + t * 0.5), 0, 6.283); ctx.fill()
      } else if (p.shape === 'spark') {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.atan2(p.vy, p.vx)); ctx.fillRect(-p.size * 2, -p.size * 0.25, p.size * 4, p.size * 0.5); ctx.restore()
      } else {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); const s = p.size * (0.5 + t * 0.5); ctx.fillRect(-s / 2, -s / 2, s, s); ctx.restore()
      }
    }
    ctx.globalAlpha = 1
  }
}
