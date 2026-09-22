/** Versioned save storage that works in the browser (localStorage) and in Node (in-memory) for tests/sim. */
export interface Storage {
  get(key: string): string | null
  set(key: string, value: string): void
  remove(key: string): void
}

export function memoryStorage(): Storage {
  const m = new Map<string, string>()
  return { get: (k) => m.get(k) ?? null, set: (k, v) => { m.set(k, v) }, remove: (k) => { m.delete(k) } }
}

export function browserStorage(): Storage {
  try {
    const ls = globalThis.localStorage
    if (!ls) return memoryStorage()
    ls.setItem('__probe', '1'); ls.removeItem('__probe')
    return { get: (k) => ls.getItem(k), set: (k, v) => { try { ls.setItem(k, v) } catch { /* quota / private mode */ } }, remove: (k) => { ls.removeItem(k) } }
  } catch { return memoryStorage() }
}

export interface Envelope<T> { v: number; savedAt: number; data: T }

export type Migration = (data: any, fromVersion: number) => any

/**
 * Save/load JSON with a schema version. `migrations[n]` upgrades a save from version n to n+1.
 * Returns null when nothing is saved or the payload is unreadable.
 */
export function createSaveStore<T>(opts: { storage: Storage; key: string; version: number; migrations?: Record<number, Migration> }) {
  return {
    save(data: T, now: number): void {
      const env: Envelope<T> = { v: opts.version, savedAt: now, data }
      opts.storage.set(opts.key, JSON.stringify(env))
    },
    load(): Envelope<T> | null {
      const raw = opts.storage.get(opts.key)
      if (!raw) return null
      try {
        const env = JSON.parse(raw) as Envelope<any>
        if (!env || typeof env !== 'object' || typeof env.v !== 'number') return null
        let v = env.v
        let data = env.data
        while (v < opts.version) {
          const m = opts.migrations?.[v]
          if (!m) return null
          data = m(data, v)
          v++
        }
        return { v: opts.version, savedAt: env.savedAt ?? 0, data: data as T }
      } catch { return null }
    },
    clear(): void { opts.storage.remove(opts.key) },
    export(): string | null { return opts.storage.get(opts.key) },
    import(raw: string): boolean {
      try { const env = JSON.parse(raw); if (typeof env?.v !== 'number') return false; opts.storage.set(opts.key, raw); return true } catch { return false }
    },
  }
}
