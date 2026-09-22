import type { Content, ResourceDef, BandDef, ProducerDef, WorkshopDef, RecipeDef, AnnexDef, BoostDef, MilestoneDef, PrestigeNodeDef, CosmeticDef, SetPieceDef, MechanicDef, BundleDef, WaystoneGoalDef, CaravanOfferDef, WishDef, LandmarkDef } from '@/content/types'

/** Indexed content for O(1) lookups. Built once per content pack. */
export interface ContentIndex {
  raw: Content
  resources: Map<string, ResourceDef>
  /** Bands sorted by index. */
  bands: BandDef[]
  bandById: Map<string, BandDef>
  producers: Map<string, ProducerDef>
  workshops: Map<string, WorkshopDef>
  /** Workshops sorted by recipe tier then hook (processing order for stepEconomy). */
  workshopOrder: WorkshopDef[]
  recipes: Map<string, RecipeDef>
  annexes: Map<string, AnnexDef>
  runes: Map<string, BoostDef>
  milestones: Map<string, MilestoneDef>
  prestigeNodes: Map<string, PrestigeNodeDef>
  cosmetics: Map<string, CosmeticDef>
  setPieces: Map<string, SetPieceDef>
  mechanics: Map<string, MechanicDef>
  bundles: Map<string, BundleDef>
  caravanOffers: Map<string, CaravanOfferDef>
  wishes: Map<string, WishDef>
  landmarks: Map<string, LandmarkDef>
  goalsS1: Map<string, WaystoneGoalDef>
  crewByStation: Map<string, ProducerDef>
  lodgeByResource: Map<string, ProducerDef>
  workshopByOutput: Map<string, WorkshopDef>
  baseResource: string
}

export function indexContent(c: Content): ContentIndex {
  const byId = <T extends { id: string }>(arr: T[]) => new Map(arr.map((x) => [x.id, x]))
  const recipes = byId(c.recipes)
  const crewByStation = new Map<string, ProducerDef>()
  const lodgeByResource = new Map<string, ProducerDef>()
  for (const p of c.producers) {
    if (p.kind === 'crew' && p.station) crewByStation.set(p.station, p)
    if (p.kind === 'lodge' && p.produces && !lodgeByResource.has(p.produces.id)) lodgeByResource.set(p.produces.id, p)
  }
  const workshopByOutput = new Map<string, WorkshopDef>()
  for (const w of c.workshops) { const r = recipes.get(w.recipe); if (r) workshopByOutput.set(r.output.id, w) }
  const bands = [...c.bands].sort((a, b) => a.index - b.index)
  return {
    raw: c,
    resources: byId(c.resources),
    bands, bandById: byId(bands),
    producers: byId(c.producers), workshops: byId(c.workshops),
    workshopOrder: [...c.workshops].sort((a, b) => a.tier - b.tier || a.hook - b.hook),
    recipes, annexes: byId(c.annexes), runes: byId(c.runes), milestones: byId(c.milestones), prestigeNodes: byId(c.prestigeNodes),
    cosmetics: byId(c.cosmetics), setPieces: byId(c.setPieces), mechanics: byId(c.mechanics), bundles: byId(c.bundles),
    caravanOffers: byId(c.caravanOffers), wishes: byId(c.wishes), landmarks: byId(c.landmarks), goalsS1: byId(c.waystoneSeason1),
    crewByStation, lodgeByResource, workshopByOutput,
    baseResource: c.resources.find((r) => r.base)?.id ?? 'sap',
  }
}
