/** Easing + tiny tween/shake helpers for the canvas scene. */
export const ease = {
  outCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  outBack: (t: number) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2) },
  outElastic: (t: number) => t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1,
  inOutSine: (t: number) => -(Math.cos(Math.PI * t) - 1) / 2,
}

/** Spring-ish scalar that eases toward a target; call update(dt) each frame. */
export class Smooth {
  value: number; target: number; speed: number
  constructor(v = 0, speed = 8) { this.value = v; this.target = v; this.speed = speed }
  update(dt: number) { this.value += (this.target - this.value) * Math.min(1, this.speed * dt); return this.value }
  set(v: number) { this.value = v; this.target = v }
}

/** Screen shake with decay. */
export class Shake {
  private amp = 0
  x = 0; y = 0
  add(amount: number) { this.amp = Math.min(24, this.amp + amount) }
  update(dt: number) {
    if (this.amp <= 0.05) { this.amp = 0; this.x = 0; this.y = 0; return }
    this.x = (Math.random() - 0.5) * 2 * this.amp; this.y = (Math.random() - 0.5) * 2 * this.amp
    this.amp *= Math.pow(0.001, dt)
  }
}

/** A punch scale that pops on trigger and settles back to 1. */
export class Punch {
  private t = 1
  private strength = 0
  trigger(strength = 0.25) { this.t = 0; this.strength = strength }
  update(dt: number) { this.t = Math.min(1, this.t + dt * 4) }
  get scale() { return 1 + this.strength * (1 - ease.outCubic(this.t)) }
}
