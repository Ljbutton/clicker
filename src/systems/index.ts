import type { Content, ResourceDef, BandDef, ProducerDef, BuildingDef, RecipeDef, BoostDef, MilestoneDef, PrestigeNodeDef, CosmeticDef, SetPieceDef, MechanicDef, BundleDef } from '@/content/types'

/** Indexed content for O(1) lookups. Built once per content pack. */
export interface ContentIndex {
  raw: Content
  resources: Map<string, ResourceDef>
  bands: BandDef[]
  producers: Map<string, ProducerDef>
  buildings: Map<string, BuildingDef>
  recipes: Map<string, RecipeDef>
  boosts: Map<string, BoostDef>
  milestones: Map<string, MilestoneDef>
  prestigeNodes: Map<string, PrestigeNodeDef>
  cosmetics: Map<string, CosmeticDef>
  setPieces: Map<string, SetPieceDef>
  mechanics: Map<string, MechanicDef>
  bundles: Map<string, BundleDef>
  recipesByStation: Map<string, RecipeDef[]>
  craftersByStation: Map<string, ProducerDef>
  baseResource: string
}

export function indexContent(c: Content): ContentIndex {
  const byId = <T extends { id: string }>(arr: T[]) => new Map(arr.map((x) => [x.id, x]))
  const recipesByStation = new Map<string, RecipeDef[]>()
  for (const r of c.recipes) { const l = recipesByStation.get(r.station) ?? []; l.push(r); recipesByStation.set(r.station, l) }
  const craftersByStation = new Map<string, ProducerDef>()
  for (const p of c.producers) if (p.kind === 'crafter' && p.station) craftersByStation.set(p.station, p)
  const base = c.resources.find((r) => r.base)?.id ?? 'sap'
  return {
    raw: c,
    resources: byId(c.resources),
    bands: [...c.bands].sort((a, b) => a.minHeight - b.minHeight),
    producers: byId(c.producers), buildings: byId(c.buildings), recipes: byId(c.recipes), boosts: byId(c.boosts),
    milestones: byId(c.milestones), prestigeNodes: byId(c.prestigeNodes), cosmetics: byId(c.cosmetics), setPieces: byId(c.setPieces),
    mechanics: byId(c.mechanics), bundles: byId(c.bundles),
    recipesByStation, craftersByStation, baseResource: base,
  }
}
