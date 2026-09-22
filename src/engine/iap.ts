/**
 * Store boundary. Purchases only ever grant cosmetics or Glimmer (cosmetic currency).
 * Web: a clearly labelled mock that credits after a confirm dialog. Native: TODO for a store plugin.
 */
import type { Game } from './game'

export interface StoreProduct { sku: string; title: string; price: string; glimmer?: number; supporter?: boolean; desc: string }

export const products: StoreProduct[] = [
  { sku: 'glimmer_200', title: '200 Glimmer', price: '$1.99', glimmer: 200, desc: 'A small jar of light.' },
  { sku: 'glimmer_550', title: '550 Glimmer', price: '$4.99', glimmer: 550, desc: 'Best value.' },
  { sku: 'glimmer_1200', title: '1,200 Glimmer', price: '$9.99', glimmer: 1200, desc: 'A lantern-full.' },
  { sku: 'glimmer_2600', title: '2,600 Glimmer', price: '$19.99', glimmer: 2600, desc: 'Light the whole valley.' },
  { sku: 'supporter', title: 'Lantern-Keeper Supporter Pack', price: '$4.99', supporter: true, desc: 'Golden Keeper glow, Keeper\'s Cloak, the Keeper title, a golden frame, 300 Glimmer, your initials on the roots plaque. No gameplay effect.' },
]

async function isNative(): Promise<boolean> {
  try { const core = await import('@capacitor/core'); return core.Capacitor.isNativePlatform() } catch { return false }
}

/** Returns a receipt on success. On native this is a TODO: wire the store plugin of your choice here. */
export async function purchase(sku: string): Promise<{ ok: boolean; receipt: string }> {
  const p = products.find((x) => x.sku === sku)
  if (!p) return { ok: false, receipt: '' }
  if (await isNative()) {
    // TODO(store): integrate an IAP plugin (e.g. a RevenueCat or cordova-plugin-purchase wrapper) and validate receipts.
    return { ok: false, receipt: '' }
  }
  const ok = typeof confirm === 'function' ? confirm(`[Store placeholder] Buy "${p.title}" for ${p.price}?\n\nThis web build credits the purchase locally. Nothing here affects progress.`) : true
  return ok ? { ok: true, receipt: `mock:${sku}:${Date.now()}` } : { ok: false, receipt: '' }
}

export function applyPurchase(game: Game, product: StoreProduct, receipt: string, initials = '') {
  if (product.supporter) game.grantSupporter(receipt, initials)
  else if (product.glimmer) game.creditGlimmer(product.glimmer, receipt)
}

export function restore(game: Game): string[] { return game.s.cosmetics.purchases.filter((p) => p.startsWith('mock:') || p.startsWith('store:')) }
