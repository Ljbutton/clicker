import { describe, it, expect } from 'vitest'
import { ParticleSystem } from '../src/scene/particles'
import { Smooth, Shake, Punch } from '../src/scene/tween'

describe('ParticleSystem', () => {
  it('spawns, ages out, and recycles into the pool without exceeding max', () => {
    const ps = new ParticleSystem(50)
    ps.burst(0, 0, 80)
    expect(ps.live.length).toBe(50)
    for (let i = 0; i < 40; i++) ps.update(0.1)
    expect(ps.live.length).toBe(0)
    ps.text(1, 1, '+5')
    expect(ps.live.length).toBe(1)
    expect(ps.live[0]!.shape).toBe('text')
  })
  it('moves particles under gravity', () => {
    const ps = new ParticleSystem()
    const p = ps.spawn({ x: 0, y: 0, vx: 10, vy: 0, gravity: 100, drag: 1, maxLife: 5 })!
    ps.update(1)
    expect(p.x).toBeCloseTo(10)
    expect(p.y).toBeGreaterThan(0)
  })
})

describe('tween helpers', () => {
  it('Smooth converges to target', () => { const s = new Smooth(0, 10); s.target = 1; for (let i = 0; i < 100; i++) s.update(0.05); expect(s.value).toBeCloseTo(1, 3) })
  it('Shake decays to zero', () => { const s = new Shake(); s.add(10); for (let i = 0; i < 60; i++) s.update(0.1); expect(s.x).toBe(0); expect(s.y).toBe(0) })
  it('Punch pops then settles', () => { const p = new Punch(); p.trigger(0.3); expect(p.scale).toBeCloseTo(1.3); for (let i = 0; i < 10; i++) p.update(0.1); expect(p.scale).toBeCloseTo(1) })
})
