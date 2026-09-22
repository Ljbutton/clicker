/** Tiny typed event emitter used to decouple systems from UI juice (toasts, particles, celebrations). */
export type Handler<T> = (payload: T) => void

export function createEmitter<Events extends Record<string, any>>() {
  const map = new Map<keyof Events, Set<Handler<any>>>()
  return {
    on<K extends keyof Events>(type: K, h: Handler<Events[K]>): () => void {
      let set = map.get(type)
      if (!set) { set = new Set(); map.set(type, set) }
      set.add(h)
      return () => { set!.delete(h) }
    },
    emit<K extends keyof Events>(type: K, payload: Events[K]): void {
      const set = map.get(type)
      if (!set) return
      for (const h of [...set]) { try { h(payload) } catch (e) { console.error(e) } }
    },
    clear() { map.clear() },
  }
}
