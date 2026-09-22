/** HOLLOWSPIRE content pack — every table from docs/GAME_DESIGN.md, transcribed as data (see src/content/pack/*). */
import type { Content } from './types'
import { resources } from './pack/resources'
import { bands } from './pack/bands'
import { producers } from './pack/producers'
import { workshops, recipes } from './pack/crafting'
import { annexes } from './pack/annexes'
import { runes } from './pack/runes'
import { milestones } from './pack/milestones'
import { waystoneSeason1, legacyLane } from './pack/waystone'
import { prestigeNodes, mechanics } from './pack/prestige'
import { cosmetics, bundles } from './pack/cosmetics'
import { setPieces, caravanOffers, wishes, landmarks } from './pack/events'

export const content: Content = {
  resources, bands, producers, workshops, recipes, annexes, runes, milestones,
  waystoneSeason1, legacyLane, prestigeNodes, mechanics, cosmetics, bundles,
  setPieces, caravanOffers, wishes, landmarks,
}
