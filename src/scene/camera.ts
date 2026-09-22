/**
 * Vertical scene camera: follows the growing tip by default, one-finger drag with inertia,
 * timed "rides" (Ritual, jump-to-bough) that return to the tip. Pure; unit-tested.
 */
export type CameraMode = 'follow' | 'free' | 'ride'

export class Camera {
  /** Current world y at the centre of the canvas. */
  y = 0
  mode: CameraMode = 'follow'
  private vel = 0
  private rideTo = 0
  private rideLeft = 0
  private rideThenFollow = true
  private dragLast = 0
  private dragT = 0
  private dragging = false
  min = -Infinity
  max = Infinity
  /** Follow easing (1/s). */
  speed = 5
  /** Extra offset added to the follow target (camera push on GROW, decays). */
  push = 0

  setBounds(min: number, max: number) { this.min = min; this.max = max; this.y = this.clamp(this.y) }
  private clamp(v: number) { return Math.max(this.min, Math.min(this.max, v)) }

  /** Snap the camera onto its follow target instantly (first frame). */
  jumpTo(y: number) { this.y = this.clamp(y); this.vel = 0; this.mode = 'follow' }

  beginDrag(pointerY: number, t: number) { this.dragging = true; this.dragLast = pointerY; this.dragT = t; this.vel = 0; this.mode = 'free'; this.rideLeft = 0 }
  drag(pointerY: number, t: number) {
    if (!this.dragging) return
    const dy = pointerY - this.dragLast
    const dt = Math.max(1e-3, t - this.dragT)
    this.y = this.clamp(this.y - dy)
    // blend the velocity so a slow finish kills the fling
    this.vel = this.vel * 0.5 + (-dy / dt) * 0.5
    this.dragLast = pointerY; this.dragT = t
  }
  endDrag(t: number) {
    if (!this.dragging) return
    this.dragging = false
    if (t - this.dragT > 0.08) this.vel = 0
    if (Math.abs(this.vel) < 20) this.vel = 0
  }
  get isDragging() { return this.dragging }

  /** Ride to a world y over ~`seconds`, then follow the tip again (or stay free). */
  ride(toY: number, seconds = 1.6, thenFollow = true) { this.mode = 'ride'; this.rideTo = toY; this.rideLeft = seconds; this.rideThenFollow = thenFollow; this.vel = 0 }
  /** Return to following the tip. */
  snap() { this.mode = 'follow'; this.vel = 0; this.rideLeft = 0 }
  /** Is the camera away from its follow target far enough to show the "Now" pill? */
  isAway(followY: number, tol = 40) { return this.mode !== 'follow' && Math.abs(this.y - followY) > tol }

  update(dt: number, followY: number) {
    if (dt <= 0) return
    this.push *= Math.pow(0.02, dt)
    if (this.dragging) return
    if (this.mode === 'free') {
      if (this.vel !== 0) {
        this.y = this.clamp(this.y + this.vel * dt)
        this.vel *= Math.pow(0.05, dt)
        if (Math.abs(this.vel) < 8 || this.y === this.min || this.y === this.max) this.vel = 0
      }
      return
    }
    if (this.mode === 'ride') {
      this.y += (this.clamp(this.rideTo) - this.y) * Math.min(1, 6 * dt)
      this.rideLeft -= dt
      if (this.rideLeft <= 0) this.mode = this.rideThenFollow ? 'follow' : 'free'
      return
    }
    const target = this.clamp(followY + this.push)
    this.y += (target - this.y) * Math.min(1, this.speed * dt)
  }
}
