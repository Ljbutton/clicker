# Hollowspire

*Tap the great tree. Raise the Folk. Grow your spire skyward — and dress it so the whole valley can see how far you've climbed.*

Hollowspire is a mobile-first tap-and-idle crafting game in the family of *Tap Craft*, rebuilt around one idea: **progression should feel great every minute**. Everything you do grows a single vertical tree on a portrait phone, and one pinned goal always tells you what's next and how far away it is.

The full design (numbers, tables, pacing targets) lives in [`docs/GAME_DESIGN.md`](docs/GAME_DESIGN.md).

## How it differs from Tap Craft

| Tap Craft | Hollowspire |
|---|---|
| Random islands you dig across | One authored vertical world you physically **GROW**; the phone's scroll is the map |
| Feed settlers, farm wood and ore repeatedly | No upkeep. Raws are cheap and auto-gathered; every crafted good is worth **4x its inputs**, so climbing the recipe chain is always the efficient play |
| Lots of clicking or button-holding before automation | First Sapper at ~15 s, first auto-crafting Foreman by ~1:30, whole tier-1 chain idle by ~4-5 min. Holding is a stamina-limited burst (Rally), never a requirement |
| Content locked behind grinds you can't see | The **Waystone**: one pinned goal with a live ETA, a blocking reason when a rate is zero, a sub-step suggestion when it's slow, and the next goals as a runway |
| Prestige mostly multiplies | **Turn the Season** re-skins the whole tree, inscribes a ring on the stump, awards a Season Medal, and adds a **new mechanic every time** (Wind, Frost, Bloom, Storm, Caravans…) |
| Paid PC build / ad-supported mobile build | Free, **no ads**, **cosmetics only**: lanterns on every building, tree skins, hats on every Folk, skies, tap effects, crown ornaments — earnable with Fireflies, or bought with Glimmer. Nothing sold affects a number |

## The loop

- **Strike** the trunk for Sap. A Thrum meter fills; at 100 it bursts into a 4 s **Resonance** (everything x5). 5% of strikes crit (every 25th is guaranteed).
- **GROW**: spend Sap to stretch the tree taller. Height reveals workshop hooks and bough lines; the sky changes as you climb.
- **Folk lodges** gather raws idly. **Workshops** convert them up the chain (Resin → Beam → Lantern → Starglass). Tap a hut to hand-craft the first stack; that hires the **Foreman** and the workshop runs forever. Feed dials keep the Kiln from eating all your Sap.
- **Runes** carved into the bark are permanent multipliers priced in crafted goods.
- **Boughs** (Roots, Canopy, Upper Trunk, Deep Roots, Crown, Cloudreach, Starbough, Elder, Worldcrown) open via **Rituals** paid in crafted goods; each is a new biome with its own Folk, workshops and set-pieces.
- Tap-only **set-pieces** (Beehive Shake, Woodpecker, Golden Acorn, Falling Star…) are treats, never requirements: every one has an idle source one bough later.
- **Nightwatch**: come back to a haul (offline production runs the same economy step, crafting included), a Dawn Rush tap boost, and a Morning Dew bonus.
- Roughly once an hour, **Turn the Season** for Rings and spend them in the Ring Tree.

## Running it

```bash
npm install
npm run dev          # http://localhost:5173 — open in a phone-sized viewport (390x844)
npm test             # vitest: engine, formulas, content lint
npm run typecheck
npm run build        # production build to dist/ (PWA: manifest + service worker)
npm run smoke        # Playwright: boots dist/ at iPhone size, taps, screenshots ./screenshots
npm run sim -- 70    # headless bots (active / casual / no-tap) for 70 minutes + the design's §17 pacing assertions
npm run sim -- 120 active --single   # verbose single run that also Turns the Season
```

### Mobile packaging (Capacitor)

The web build is the app. To wrap it for stores:

```bash
npm run build
npx cap add android   # or: npx cap add ios   (needs Android Studio / Xcode locally)
npm run cap:sync
npx cap open android
```

`capacitor.config.ts` is set up; haptics use `@capacitor/haptics` on device and `navigator.vibrate` on the web. In-app purchases are behind `src/engine/iap.ts`: on the web it is a clearly labelled mock that credits Glimmer after a confirm dialog; on native it is a TODO for the store plugin of your choice. Purchases only ever grant cosmetics.

## Project layout

```
docs/GAME_DESIGN.md      the design document (source of truth) + reference pacing sim
src/content/             types.ts (schema), balance.ts (constants), data.ts (the content pack)
src/engine/              game.ts (orchestrator), state.ts (save shape), loop, storage, numbers, haptics, audio, iap
src/systems/             economy (stepEconomy, purchases), grow (GROW, boughs, rituals), tap (Strike/Thrum/crits/Rally),
                         waystone + compass (pinned goal, ETA, advice), milestones/chests, prestige (Rings, Ring Tree, Turn),
                         seasons (Wind/Frost/Bloom/Storm/Caravans), setpiece, codex (Crucible), offline (Nightwatch)
src/scene/               canvas renderer (tree, boughs, huts, Folk, lanterns, particles, camera), season card
src/ui/                  Preact shell: HUD, Waystone bar, tabs (Grow / Folk / Craft / Season / More), sheets, wardrobe/shop
src/sim/                 headless bot + §17 assertions
tests/                   vitest suites
```

Everything in the game is data: systems never hard-code an item, so adding a bough, a recipe, a Rune, a cosmetic or a Season mechanic is a row in `src/content/`.

## Monetization policy

Premium currency (Glimmer) buys cosmetics only. Never sold: Sap, any good, Heartwood, Rings, Ring Tree nodes, Folk, crew, Foremen, levels, Runes, Boughs, Rituals, GROW, offline time, boosts, chests, Waystone skips, Codex attempts, Fireflies — or anything that changes a number. Earned Fireflies buy from a market that always stocks every cosmetic category.
