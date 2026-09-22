import { describe, it, expect } from 'vitest'
import { createSaveStore, memoryStorage } from '../src/engine/storage'

describe('save store', () => {
  it('round-trips and stamps version/time', () => {
    const s = createSaveStore<{ a: number }>({ storage: memoryStorage(), key: 'k', version: 2 })
    expect(s.load()).toBeNull()
    s.save({ a: 1 }, 1234)
    expect(s.load()).toEqual({ v: 2, savedAt: 1234, data: { a: 1 } })
  })
  it('migrates old versions in order', () => {
    const st = memoryStorage()
    st.set('k', JSON.stringify({ v: 1, savedAt: 5, data: { a: 1 } }))
    const s = createSaveStore<{ a: number; b: number }>({ storage: st, key: 'k', version: 3, migrations: { 1: (d) => ({ ...d, b: 0 }), 2: (d) => ({ ...d, b: d.b + 10 }) } })
    expect(s.load()).toEqual({ v: 3, savedAt: 5, data: { a: 1, b: 10 } })
  })
  it('returns null on garbage or missing migration', () => {
    const st = memoryStorage(); st.set('k', '{not json')
    expect(createSaveStore({ storage: st, key: 'k', version: 1 }).load()).toBeNull()
    st.set('k', JSON.stringify({ v: 1, data: {} }))
    expect(createSaveStore({ storage: st, key: 'k', version: 2 }).load()).toBeNull()
  })
})
