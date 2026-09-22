# HOLLOWSPIRE — Game Design Document (v1.0, final synthesis)

> **Status:** single source of truth for the implementation team. Every number here is a default that the headless simulator (`src/sim`) must reproduce within the tolerances in §17. When the sim and this document disagree, fix the data file, then update this document in the same commit.
>
> **Lineage:** built from the highest-scoring pitch, *Hollowspire* (147 judge points), with the judges' flagged grafts from *Skystalk* (GROW hero verb and curve, 4x-per-tier worth rule, crafted-goods-priced permanent multipliers, idle-pegged taps + stamina Rally, "idle source one bough later" rule, Compass resolver with sub-step advice, mechanic ladder shown in advance, milestone x2 tokens, Morning Dew, bot-player sim), *Hearthspire* (Crucible discovery + persistent Codex, Road Ahead sheet, visible supply chain with starving-input markers, Masterwork tap crafts, try-on shop preview, "Folk will finish this while you're away") and *Skyroot* (crafted goods as building upgrades, crafted offline-cap lever with a jar readout, Grow-to-goal on return, Ring Tree drawn as roots below the stump, stump nameplate, worth-vs-cost on recipe cards, ghosted next bough). Every judge concern is resolved explicitly in §0.3.

---

## 0. Executive summary

### 0.1 Name, tagline, pitch

**HOLLOWSPIRE**
*Tap the great tree. Raise the Folk. Grow your spire skyward — and dress it so the whole valley can see how far you've climbed.*

You inherit a sapling in a misty valley and a single lantern-carrying critter called a Folk. Every strike on the trunk knocks loose Sap; every scrap of Sap grows the tree taller (the **GROW** button is the hero verb — the trunk stretches, the camera rides up, and whatever lives at that height pops into view). Folk lodges gather raw goods; workshops and their Foremen turn them into Resin, Planks, Beams, Glass, Lanterns and Starglass, each step worth **4x its inputs**. Crafted goods buy **Bough Rituals** (the tree sprouts a whole new biome floor — Roots, Canopy, Crown, Cloudreach), **Runes** carved into the bark (permanent multipliers) and the lodges themselves, so crafting is the economy, not a side menu. One pinned goal — the **Waystone** — always tells you the next thing, how far away it is in seconds, and what to do if it is slow. Roughly once an hour you **Turn the Season**: the tree sheds, inscribes a ring in the stump, re-skins the whole world (Autumn, Winter, Spring, Summer…), pays out Rings for a permanent Ring Tree, and unlocks a *new mechanic* — Wind, Frost, Bloom, Storm, Caravans — every single time. Monetization is cosmetic-only: lanterns on every building, tree skins, hats on every Folk, skies, tap effects and a crown ornament — all visible on the screen you stare at, all previewable on your own tree, with an earned track (Fireflies) that covers every category.

### 0.2 Explicit differentiation from Tap Craft

| Tap Craft | Hollowspire |
|---|---|
| Horizontal spread across randomly generated islands you dig up | One authored vertical world: a single tree that you physically grow with GROW; the phone's scroll is the map; the scene is the progress bar |
| Food must be grown to feed settlers; wood/ore farmed repeatedly | No upkeep, no hunger, nothing decays. Raws are cheap and auto-gathered; every unit of value comes from converting *up* a recipe chain at 4x per tier, so stockpiling raws is always the wrong move |
| "Extensive clicking or holding the button" before automation | First Sapper at ~15 s, first auto-crafting Foreman at ~1 min, whole tier-1 chain automated by ~4 min. Hold-to-tap is a stamina-limited burst (Rally), never a requirement |
| Content locked behind grinds you cannot see | The Waystone: exactly one pinned goal with a live ETA, a blocking reason when the rate is zero, a sub-step suggestion when the ETA is long, and the next two goals shown as a runway |
| Worker upgrades behind separate unlock walls | Lodges level continuously (x1.13 curve) with visible breakpoints at 10/25/50/100/200; later lodges are priced in crafted goods, so gating lives inside the economy you already run |
| Prestige ("Retire") mostly multiplies | Every Season Turn re-skins the world, inscribes a permanent stump ring, awards a Season Medal cosmetic and adds a named mechanic (ladder shown in advance) |
| Paid Steam build, ad-supported mobile build, tournaments, clay mine side grinds | Free, no ads, no tournaments, no timers to skip; Glimmer buys cosmetics only; earned Fireflies cover every cosmetic category; a Season Card share sheet is the only network-adjacent feature |
| Pixel-art tilesets | Procedural canvas (gradients, circles, bezier limbs, particles) plus emoji accents: the world reacts to height, lantern count and season at near-zero asset cost, and cosmetics are parameter sets |

### 0.3 Judge concerns and how this design resolves them

| Concern (pitch) | Resolution |
|---|---|
| Rings formula explodes at large Heartwood (Hollowspire) | Log-based: `rings = floor(2 · (log10(max(HW,K)/K))^1.5)`, K = 3e6. 3 Rings at 1e8 HW, 5 at 2.1e8, 25 at 1e12, 49 at 1e15, 146 at 1e24, 228 at 1e30. Verified in §11 |
| Linear Waystone cannot handle the repeated early game each Season (Hollowspire) | Two-lane Waystone (§9): a per-season **Season Lane** generated from a template with tutorial goals skipped and rewards scaled, and a persistent **Legacy Lane**. The Compass resolver sits beneath both as the advice/fallback layer |
| Crafted goods only 1.5-2.2x inputs (Hollowspire) | Every recipe is 4.0-4.3x the worth of its inputs (§5), Runes are priced in crafted goods, later lodges and Rituals are priced in crafted goods |
| No explicit exponential multiplier source (Hollowspire) | Runes (x1.5 raw / x2 tap per tier, cost x6 per tier), lodge and crew milestones (x1.5 at 10, x2 at 25/50/100/200, x2 every 100), Ring passive (+5% per Ring ever earned), Ring Tree nodes (up to x1.5^5 · x2^3 · x1.5^3), Vigor (metres per GROW up to x6) and the season-scaled Ritual discount. §17 asserts the resulting curve |
| Amber Vault 10-minute aging is a timer gate (Hollowspire) | Removed. Amber is a normal 45 s recipe with a Foreman |
| Layout percentages exceed the screen (Hollowspire) | Exact pixel budget for 390x844 in §15 (sums to 844) |
| Eight season modules is too much scope (Hollowspire) | v1 ships Turns 1-5 (Wind, Frost, Bloom, Storm, Caravans); Turns 6+ are data rows flagged `implemented:false` and shown as "next update" on the ladder |
| Honey (set-piece only) gates Lacquer/Lantern/Amber (Hollowspire) | Rule adopted from Skystalk: every set-piece resource gets an idle source one bough later. Beehive Shake at ~6 min, Apiary annex (idle Honey) at Bough 3 (~10-12 min), Lacquery hint appears only after the Apiary is buildable |
| Tap = 2% of idle gives ~6% not 20-50% (Hollowspire) | Tap is pegged to **0.25 s of idle Sap income** (x2 per Firm Grip node, x2 per Rune of Thrum tier), so 3 taps/s with Thrum ≈ 1.4-3x idle while tapping; the sim measures tapping at 25-45% of session income after minute 10 (§17) |
| First prestige at 2-4 h is late (Skystalk/Skyroot/Hearthspire) | First Turn available at 3 Rings (~35-45 min), recommended at 5 (~43-55 min in the sim), all in Season 1 |
| Compass may pick silly goals (Skystalk) | Authored Season Lane owns the first ~60 goals; the Compass is advice-only until the lane is exhausted, has exclusion rules (ETA > 60 min excluded when any < 10 min candidate exists) and a max-ETA fallback to a sub-step |
| Cheer/hold re-introduces hold-the-button (Skystalk) | Rally: 10 s stamina, 30 s refill, x2 not x5, no Waystone goal ever depends on it, no-tap bot must progress within 1.6x of the active bot (§17) |
| Minute-30-to-hour-1 dead zone (Skystalk) | Lane goals #40-#58 are authored for that window (Lantern trophies, Amber discovery, crew and lodge milestones, Rune II/III, first Falling Star); assertion: no lane gap > 5 min before the first Turn |
| Pulse-rhythm combo fights touch latency (Skyroot) | Thrum is a fill meter (+6 per strike, decays only after 0.8 s idle), no timing window |
| Manual pod collection before haulers (Skyroot) | Everything auto-collects from the first Folk; the only manual crafting is the 5-25 hand-crafts that hire a Foreman |
| Emoji Folk hats read small (Skystalk/Hearthspire) | Hero cosmetics are procedural and large (lanterns, tree skins, skies, tap effects, crown ornament); hats render on every Folk *and* on the large Chief at lodge level 50 |
| Earned premium currency either stingy (Hearthspire) or demand-deflating (Skystalk) | Two currencies: Fireflies (earned, ~600 in Season 1, 2,500-4,000 in week 1, buys 8-12 cosmetics via a market that always stocks every category) and Glimmer (premium; ~210 earned in week 1 ≈ one mid-tier item) |
| Coin-from-Commissions hidden throttle (Hearthspire) | No second soft currency. Sap is the only currency; everything else is a material |
| Heat meter rewards continuous tapping (Hearthspire) | Resonance (Thrum 100) is a 4 s burst, then the meter resets; Auto-Thrum node fires it from idle |

---

## 1. Theme and scene

### 1.1 Setting and mood
A colossal hollow tree in a misty valley. Your colony of tiny lantern-carrying **Folk** (a circle body, two dot eyes, a hat slot, a swinging lantern) hollows the tree and builds a vertical village on and inside it. Mood: cozy Ghibli-meets-Hollow-Knight — warm amber lanterns at night, soft mist, fireflies, birds; storm and starlight higher up. Everything is drawn with canvas primitives (gradients, circles, rounded rects, bezier limbs, particle systems) with emoji only as icons in the UI, so lighting, palette and animation carry the look and cosmetics are parameter sets.

### 1.2 What the main canvas shows
A vertical strip (portrait). The **trunk** is a bezier column 80 px wide running the full height of the canvas at x-centre; every point on it is a tap target. **Boughs** (biome floors) are stacked by height; each has 2-4 **limbs** (side branches) that hold lodges, workshops and annexes as huts drawn on the limb. Folk walk bezier paths lodge → gather point → workshop, carrying a glowing item glyph, so the supply chain is visible; a starved workshop dims and shows a red "!" over the missing input. The **stump** at the bottom carries the nameplate (`Lena's Hollowspire · Season 6 · best 2,480 m`) and one inscribed ring per Season; scrolling below the stump reveals the **roots**, where the Ring Tree (prestige) is drawn. The camera is locked on the growing tip by default ("Now" pill snaps back); one-finger swipe scrolls the whole tree, bough-jump dots on the right edge jump between floors. Day/night cycles every 12 real minutes (8 day / 4 night): at night lanterns light, fireflies drift and can be tapped for +1 Firefly (max 15 per night), and each lit bough gives +5% production.

### 1.3 Progression stages (Boughs) and their visual changes

| Bough | Name | Line (height) | Ritual | Sky and world | New in scene |
|---|---|---|---|---|---|
| B1 | Trunk | 0 m (start) | — | Grey-green mist, bare stump, one campfire | Sapper lodge, Kiln at 0 m; Sawmill hook at 20 m; Beamworks hook at 40 m; first lantern hooks |
| B2 | Roots | needs 30 m | 40 Plank + 20 Resin | Camera dips *below* the stump: dark loam, glow-mushrooms, pale stone | Digger lodge, Brickyard, Glasshouse, Frost Cellar slot (S3+) |
| B3 | Canopy | 60 m | 200 Plank + 40 Beam | Sky crossfades to dappled gold; leaves; birds circle | Weaver lodge, Ropewalk (80 m), Lacquery (120 m), 3 annex slots (Apiary first), Windmill slot (S2+) |
| B4 | Upper Trunk | 200 m | 300 Beam + 150 Brick + 60 Glass | Mist grey-lavender, rope bridges between limbs, first lantern strings | Lanternry (250 m), Amber Vault (300 m), Kite Yard annex, Grove slot (S4+) |
| B5 | Deep Roots | needs 400 m | 1,000 Beam + 300 Glass + 150 Lacquer | Roots plunge deeper: ore veins, crystal glints, blue cave light | Miner lodge, Forge |
| B6 | Crown | 800 m | 2,000 Lantern + 500 Ingot + 1,000 Lacquer | Cloud-white/blue, wind streaks, kites, clouds drift | Clockworks (1,000 m), Weathervane ornament, Lightning Rod slot (S5+), Falling Stars begin |
| B7 | Cloudreach | 2,000 m | 200 Amber + 100 Clockwork + 2,000 Lantern | Purple dusk, aurora curtains, stars | Stargazer lodge, Observatory (3,000 m), Caravan dock (S6+) |
| B8 | Starbough | 5,000 m (Season 3+) | 50 Starglass + 500 Clockwork + 5,000 Lantern | Black starfield with constellations, comet trails | Star Chart altar (S8), Elder branch slots |
| B9 | Elder Bough | 12,000 m | 400 Starglass + 3,000 Clockwork | Deep navy, second moon, floating seeds | Two extra annex slots, x2 global "Elder Sap" |
| B10 | Worldcrown | 20,000 m | 3,000 Starglass + 20,000 Lantern | Golden dawn above the clouds; the crown ornament sits here | Endgame cutscene, Elder Crown cosmetic, Boughs 11+ generated (x2.5 height, x8 cost per step) |

Per-Season **palettes** override the whole tree (Autumn: orange leaves + falling-leaf particles; Winter: snow caps, blue light, icicle lanterns; Spring: blossoms + bees; Summer: deep green + lightning) and cycle forever from Season 2 on. Each **Rune** carved adds a glowing glyph to the bark; every 100 **Lanterns** crafted lights one more bough (visible from any scroll position). Every 10th Waystone goal is a **Landmark** that permanently adds a scene object (rope bridge, owl, mushroom lights, kite line, bell, prayer flags…).

---

## 2. Core loop

**30-second loop.** Strike the trunk (Sap pops, Thrum ring fills) → the Waystone bar at the top fills ("Craft 10 Resin — 7/10 · ~20 s") → GROW lights up: press it, the trunk stretches, the camera rides up, a hook/limb/line pops into view → open the Folk or Craft sheet, buy the thing the Waystone points at → a Folk walks out of the lodge and starts hauling → goal completes with a leaf-burst and a haptic → next goal slides in. Every 4-6 minutes a set-piece (beehive, woodpecker, acorn, star) crosses the screen and can be tapped for a bonus.

**5-minute loop.** Complete 3-6 Waystone goals → open one chest (income bundle, Fireflies, sometimes a cosmetic) → unlock or level a workshop and hire its Foreman so a new tier of goods flows on its own → carve a Rune (permanent multiplier, priced in the goods you just automated) → cross a bough line (sky changes) or perform a Ritual (hold 3 s; the tree shoots up a floor) → equip anything new in the Wardrobe → read the offline forecast ("Nightwatch will earn ~4.2K Sap/h") and leave. Every session is designed to end on a visible change to the tree.

**Session (2-8 min, 4-8 per day).** Dawn Rush opens the session (60 s of x3 taps with the Thrum pre-filled), the return board pays the Nightwatch haul, the Waystone says whether staying 30 more seconds pays. Sessions naturally end when the pinned ETA exceeds ~10 minutes and the bar says "Folk will finish this while you're away".

**Week.** 15-25 Season Turns. Each Turn re-skins the tree, inscribes a stump ring, adds a mechanic (Wind, Frost, Bloom, Storm, Caravans, then Stewards, Star Charts, Expeditions), pays Rings into the Ring Tree, awards a Season Medal and a Season Card to share. Boughs 7-9 arrive across days 2-5; Bough 10 (Worldcrown, 20 km) is the week-1 capstone for active players; the Codex and Firefly Market are the long-tail goals.

---

## 3. The tap: STRIKE, Thrum, crits, Rally, set-pieces

### 3.1 Strike
A tap anywhere on the trunk band is a **Strike**: bark ripple, a Sap spurt, a light haptic, and a number pop. Value:

```
strikeSap = tapBase · max(1, tapPeg · idleSapPerSec) · thrumMult · critMult · runeThrum · dawnRush
  tapBase  = 1               (Ring Tree TRUNK does not change this; it changes tapPeg)
  tapPeg   = 0.25 s          (Firm Grip node: 0.5 s, then 1.0 s)
  idleSapPerSec = current Sapper-lodge output only (not taps, not crafts)
  thrumMult = 1 / 1.5 / 2 / 3 at Thrum 0 / 25 / 50 / 75
  critMult  = 10 on a crit, else 1
  runeThrum = 2^tier of Rune of Thrum
  dawnRush  = 3 for 60 s after each return, else 1
```
At minute 0 (idle 0) a strike is worth 1 Sap. At 1,000 Sap/s idle a strike is worth 250 Sap, so 3 strikes/s with Thrum at 75 ≈ 2,250 Sap/s — a 3.25x burst on top of idle while you tap, and nothing when you don't. Taps also count toward Heartwood.

### 3.2 Thrum (combo)
A ring meter (0-100) around the tap point. Each Strike adds +6. The meter does not decay while you keep tapping; after 0.8 s without a Strike it drains at 15/s. There is no timing window (judge concern on rhythm combos). At 100 the ring bursts into **Resonance**: 4 s during which every Folk and every workshop crew works at x5 (visible: Folk sprint, workshops glow, whole-tree bark ripple, medium haptic), then the meter resets to 0. At 3 taps/s Resonance fires every ~6 s of sustained tapping. The Thrum meter unlocks at Waystone goal S1-11 (~3-4 min) so the first minutes stay simple. Ring Tree: Long Thrum (+2 s per level), Deep Resonance (x8), Auto-Thrum (fires from idle every 90 s, so Resonance is never something you *must* tap for).

### 3.3 Crits
5% of Strikes crit (Keen Eye nodes +5% each to 25%): x10 Sap, gold number, screen-edge glow, 60 ms heavy haptic, and a **golden amber droplet** bounces down the trunk for 3 s; tapping it grants 30 s of +100% crafting throughput. Every 25th Strike is a guaranteed crit so the reward rhythm is legible. Every 500 Strikes the trunk **Blooms** (flowers burst from the bark) and drops a Bark Chest.

### 3.4 Rally (hold)
Unlocked at Bough 3. Holding the trunk for ≥ 400 ms starts a **Rally**: all Folk and crews work at x2 while held, draining a 10 s stamina bar (refills in 30 s; Second Wind node: +10 s / 2x refill). It is a burst, never a grind: no Waystone goal depends on Rally, and the no-tap bot must keep pace (§17).

### 3.5 Tapping a workshop (manual craft, Masterwork)
Tapping a workshop hut instantly completes one craft if inputs are present (the "second thing to tap" before its Foreman exists; hiring the Foreman costs 5-25 units of that output, so you hand-craft the first stack and never again). A tap-completed craft has a 5% chance (Masterwork Hands nodes +5% each to 25%) to be a **Masterwork**: output x3 units with a purple flash and a rising chime. Foreman crafts are never Masterwork, which keeps the manual tap a treat rather than a requirement.

### 3.6 Set-pieces (tap-only, never mandatory)
| Set-piece | From | Cadence (app open) | Interaction | Reward | Idle source one bough later |
|---|---|---|---|---|---|
| Beehive Shake 🐝 | Goal S1-20 (~6 min) | every 240-360 s, 20 s window | tap the swinging hive 10x | 8 + 2·bough Honey and 20 s of income | Apiary annex at Bough 3 (Beekeeper Folk) |
| Woodpecker 🪶 | Bough 3 | every 300-420 s, 15 s | tap in time with 8 pecks (any rhythm, window 1.5 s each) | x3 Bark for 60 s | Peelers already idle |
| Golden Acorn 🌰 | Bough 4 | every 480-720 s, 20 s | 5 taps on a bouncing acorn | 15 min of offline-rate production instantly (Golden Hours node: 30) | Crown Ring Tree offline nodes, Frost Cellar (S3) |
| Falling Star ⭐ | Bough 6 | every 600-900 s, 1.2 s | one tap as it crosses the Cloudreach | 1 Starfall + Star Chest (guaranteed rare cosmetic the first 3 times) | Stargazer Roost at Bough 7 |
| Gust leaves 🍂 | Season 2 (Wind) | every 90-150 s, 8 s | tap leaves (12) | 10 s of income each | Windmill annex auto-catches 1/level |
| Lightning 🌩️ | Season 5 (Storm) | every 300 s, 40 s | tap the Rod to discharge | 60 s of all crafting per charge | auto-discharge at 50% after 2 min |

Set-pieces never overlap, never spawn in the first 5 minutes, are capped at 20 s on screen, and are not simulated offline (Golden Acorn is the only "time" reward and is earned by play).

---

## 4. Resources

`worth` is the hidden value in Sap used for Heartwood, Compass bottleneck ranking, chest scaling and pricing. Tier 0 = raw, 1-4 = crafted, M = meta.

| id | Name | Tier | Glyph | How obtained | Worth (Sap) |
|---|---|---|---|---|---|
| sap | Sap | 0 | 💧 | Trunk strikes; Sapper Lodge (0.5/s each) | 1 |
| bark | Bark | 0 | 🪵 | Peeler Lodge (0.4/s); Woodpecker set-piece | 2 |
| stone | Stone | 0 | 🪨 | Digger Lodge (0.3/s), Bough 2 | 3 |
| fiber | Fiber | 0 | 🧵 | Weaver Lodge (0.25/s), Bough 3 | 4 |
| honey | Honey | 0 | 🍯 | Beehive Shake set-piece; Apiary annex (0.1/s), Bough 3 | 12 |
| ore | Ore | 0 | ⛏️ | Miner Lodge (0.2/s), Bough 5 | 20 |
| starfall | Starfall | 0 | ⭐ | Falling Star set-piece (Bough 6+); Stargazer Roost (0.01/s), Bough 7 | 2,000 |
| resin | Resin | 1 | 🫙 | Kiln: 5 Sap → 1 (4 s) | 20 |
| plank | Plank | 1 | 🪚 | Sawmill: 3 Bark → 1 (5 s) | 24 |
| cord | Cord | 1 | 🪢 | Ropewalk: 4 Fiber → 1 (5 s) | 64 |
| brick | Brick | 1 | 🧱 | Brickyard: 3 Stone + 1 Resin → 1 (6 s) | 120 |
| beam | Beam | 2 | 🪵 | Beamworks: 4 Plank + 1 Resin → 1 (12 s) | 480 |
| glass | Glass | 2 | 🔮 | Glasshouse: 4 Stone + 2 Resin → 1 (10 s) | 210 |
| lacquer | Lacquer | 2 | 🎨 | Lacquery (discovered): 2 Resin + 1 Cord + 1 Honey → 1 (12 s) | 480 |
| ingot | Ingot | 2 | ⚙️ | Forge: 5 Ore + 2 Brick → 1 (15 s) | 1,400 |
| lantern | Lantern | 3 | 🏮 | Lanternry (discovered): 2 Glass + 1 Lacquer + 1 Cord → 1 (20 s) | 4,000 |
| amber | Amber | 3 | 🟠 | Amber Vault (discovered): 25 Resin + 5 Honey → 1 (45 s) | 2,400 |
| clockwork | Clockwork | 3 | ⏱️ | Clockworks (discovered): 3 Ingot + 2 Cord + 1 Lacquer → 1 (30 s) | 20,000 |
| starglass | Starglass | 4 | 💠 | Observatory (discovered): 10 Glass + 5 Amber + 1 Starfall → 1 (90 s) | 65,000 |
| heartwood | Heartwood | M | 🌳 | Score: Σ units produced × worth this Season (taps, raws, crafts). Not spendable; drives Rings | — |
| fireflies | Fireflies | M | ✨ | Goals, chests, night taps, Codex, Landmarks, Season Turns. Earned only, never sold, never reset | — |
| rings | Rings | M | 🌀 | Season Turn payout. Spent on the Ring Tree. Never reset, never sold | — |
| glimmer | Glimmer | M | 🫙 | Premium (IAP) plus small earned drips. Cosmetics only. Never reset | — |

Season-reset rule: every tier 0-4 resource resets on Turn; heartwood resets to 0 for the new Season (lifetime total kept in stats); the four meta currencies persist.

---

## 5. Crafting

### 5.1 The 4x rule and the recipe table
Every recipe outputs a good worth 4.0-4.3x the worth of its inputs. Because Runes, later lodges and Rituals are priced in crafted goods, climbing the chain is provably the efficient path (a Rune paid in Beams costs ~4x less in raw terms than the same multiplier would if it were priced in Planks). Recipe cards always print **"worth 480 Sap · inputs 116 Sap · x4.1"**.

| Recipe → output | Workshop | Inputs | Time / craft / crew | Worth multiplier | Where |
|---|---|---|---|---|---|
| Resin | Kiln | 5 Sap | 4 s | 20 / 5 = **x4.0** | B1, 0 m, build 40 Sap |
| Plank | Sawmill | 3 Bark | 5 s | 24 / 6 = **x4.0** | B1, 20 m, build 30 Bark |
| Beam | Beamworks | 4 Plank + 1 Resin | 12 s | 480 / 116 = **x4.1** | B1, 40 m, build 30 Plank + 10 Resin |
| Brick | Brickyard | 3 Stone + 1 Resin | 6 s | 120 / 29 = **x4.1** | B2, build 20 Resin + 20 Stone |
| Glass | Glasshouse | 4 Stone + 2 Resin | 10 s | 210 / 52 = **x4.0** | B2, build 15 Brick |
| Cord | Ropewalk | 4 Fiber | 5 s | 64 / 16 = **x4.0** | B3, 80 m, build 20 Plank |
| Lacquer ◆ | Lacquery | 2 Resin + 1 Cord + 1 Honey | 12 s | 480 / 116 = **x4.1** | B3, 120 m, build 10 Beam + 5 Brick |
| Ingot | Forge | 5 Ore + 2 Brick | 15 s | 1,400 / 340 = **x4.1** | B5, build 30 Beam + 20 Brick |
| Lantern ◆ | Lanternry | 2 Glass + 1 Lacquer + 1 Cord | 20 s | 4,000 / 964 = **x4.1** | B4, 250 m, build 20 Beam + 10 Glass |
| Amber ◆ | Amber Vault | 25 Resin + 5 Honey | 45 s | 2,400 / 560 = **x4.3** | B4, 300 m, build 30 Beam + 20 Lacquer |
| Clockwork ◆ | Clockworks | 3 Ingot + 2 Cord + 1 Lacquer | 30 s | 20,000 / 4,808 = **x4.2** | B6, 1,000 m, build 20 Ingot + 20 Lantern |
| Starglass ◆ | Observatory | 10 Glass + 5 Amber + 1 Starfall | 90 s | 65,000 / 16,100 = **x4.0** | B7, 3,000 m, build 50 Clockwork + 50 Lantern |

◆ = cross-chain recipe discovered in the Crucible (§5.4). All recipes are data rows `{id, workshop, inputs, output, seconds, discover?, hint}`.

### 5.2 Workshops: crew, Foreman, throughput, feed dial
One recipe per workshop. A workshop has a **crew** (Folk count, like a lodge level). Crew #1 is the **Foreman**: hiring the Foreman costs **N units of the workshop's own output** (tier 1: 25, tier 2: 15, tier 3: 10, tier 4: 5) which you hand-craft by tapping the hut; from then on the workshop runs continuously. Crew #2+ cost **Sap**: `crewCost(n) = cbase · 1.15^(n-1)`, cbase by tier: 30 / 150 / 800 / 5,000 Sap. Crew milestones match lodges (10: x1.5, 25/50/100/200: x2, then x2 every 100) and re-skin the hut (twig → woven → lantern-lit → glass → starlit at 1/10/25/50/100).

```
throughput (crafts/s) = crew · (1 / seconds) · milestoneMult(crew) · bell · foremanPride · seasonMult · resonance
inputs drawn/s        = throughput · recipe.inputs, capped per input by feed · grossProduction(input)
```
The **feed dial** (per workshop; Off / Thrifty 25% / Balanced 50% / Greedy 90%) caps how much of each input's gross production a workshop may draw, so the Kiln can never eat all your Sap and a downstream workshop never starves the Rituals you are saving Planks for. Draw beyond feed is simply not taken (the hut dims and shows the input's glyph with a red "!" — the diagnostic the player reads in the scene). Season 7 Stewards tune the dials automatically. The Compass accounts for feed when it computes net rates (§9).

### 5.3 Auto-crafting unlock path
1. Build the workshop (cost in the previous tier's goods or Sap).
2. Tap the hut to hand-craft (each tap = one craft; 5% Masterwork).
3. The N-th unit hires the Foreman (Waystone goal, unlock card, hut gains a chimney and the Folk walks in). Season 1 timings from the sim: Kiln Foreman 0:35-1:10, Sawmill 3:50-5:25, Brickyard ~6 min, Beamworks ~6:20, Ropewalk ~11:30, Glasshouse ~11:50, Lacquery ~13:10, Lanternry ~18:00, Forge ~24:30.
4. Buy crew with Sap as the Compass suggests; carve Foreman's Bell (Beam-priced, x1.5 all throughput per tier).
Ring Tree "Kept Foremen" starts later Seasons with the first workshops built and staffed, so re-runs skip steps 1-3 for the tier-1 chain.

### 5.4 Crucible discovery and the Codex (Hearthspire graft)
Single-chain recipes (Resin, Plank, Beam, Brick, Glass, Cord, Ingot) are handed out by the Waystone when their workshop hook appears. The five cross-chain recipes (Lacquer, Lantern, Amber, Clockwork, Starglass) are **discovered** in the Crucible at the stump: the Codex shows a hinted silhouette (`2 Resin + 1 Cord + ? → ?`) as soon as all-but-one input is owned and its workshop's bough is open; the player slots stacks from owned goods (tap-to-slot, no drag). A correct combination flips the Codex card, awards 20 · tier Fireflies, and permanently reveals the workshop for building. A wrong combination refunds 80% of the slotted goods and reveals one more input; the third attempt on any hint is a guaranteed discovery. The Codex (recipes, species, critters, Landmarks) persists across Seasons, so discovery is a one-time delight and later runs are about speed. Codex completion at 25/50/75/100% drops Amber Chests; Codex Mastery nodes pay x3 Fireflies and +10% worth on discovered goods.

### 5.5 Trophy craft: Lanterns
Every 100 Lanterns crafted this Season lights one more bough (lantern strings switch on, +5% all production while lit, max 12 boughs; Lit Boughs node: every 50). Lifetime Lantern counts unlock lantern cosmetics at 100 / 1,000 / 10,000 / 100,000 (§14). Lanterns are also the Rune of Roots currency and the Crown/Cloudreach Ritual currency, so the trophy is never dead weight.

### 5.6 Crafting-to-cosmetic bridge
The **Kite Yard** annex (Bough 4) crafts cosmetic Banners and kites from Cord + Lacquer + Fireflies (e.g., Carp Kite: 50 Cord + 20 Lacquer + 60 Fireflies), and Lacquer dyes lanterns (20 Lacquer per earned colour) — crafted goods become things you can see, never things you can sell.

---

## 6. Producers: Folk lodges and workshop crews

All producers share one data shape (`ProducerDef`): a count, a base rate, a base cost, a cost-growth factor and the milestone pattern. **Lodges** gather a raw; **crews** run a workshop's recipe. `count` is the level.

```
lodgeCost(n)   = baseCost · 1.13^n                       (n = owned; buy x1 / x10 / x25 / MAX, long-press = MAX)
lodgeOutput    = n · baseRate · milestoneMult(n) · runeRaw · runeRoots · ringPassive · ringTree · season · litBoughs · tokens
milestoneMult(n) = 1.5 if n ≥ 10  ·  2 for each of {25, 50, 100, 200}  ·  2 for every further 100 (300, 400, …)
```
So a lodge at 100 is x12 per Folk, at 200 x24, at 500 x192. Milestones are the Compass's favourite mini-goals ("Sapper Lodge ×2 at 25 · 21/25 · ~40 s") and each one visibly upgrades the hut (bigger, second storey at 25, lantern string at 50 with a **Chief** who stands outside and waves when you return, chimney smoke at 100, garden at 200).

| id | Name | Kind | Produces | Base rate (each) | Base cost | Growth | Unlock | Milestones |
|---|---|---|---|---|---|---|---|---|
| sapper | Sapper Lodge | lodge | Sap | 0.5 /s | 15 Sap | 1.13 | start | 10 ×1.5 · 25/50/100/200 ×2 · +100 ×2 |
| peeler | Peeler Lodge | lodge | Bark | 0.4 /s | 60 Sap | 1.13 | Waystone S1-08 (~1:20) | same |
| digger | Digger Lodge | lodge | Stone | 0.3 /s | 6 Resin | 1.13 | Bough 2 Roots | same |
| weaver | Weaver Lodge | lodge | Fiber | 0.25 /s | 10 Plank | 1.13 | Bough 3 Canopy | same |
| beekeeper | Apiary (annex) | lodge | Honey | 0.1 /s | 5 Cord | 1.13 | Bough 3 + first limb (10 Beam) | same |
| miner | Miner Lodge | lodge | Ore | 0.2 /s | 4 Beam | 1.13 | Bough 5 Deep Roots | same |
| stargazer | Stargazer Roost | lodge | Starfall | 0.01 /s | 5 Amber | 1.13 | Bough 7 Cloudreach | same |
| kiln_crew | Kiln crew | crew | Resin (5 Sap → 1, 4 s) | 0.25 crafts/s | Foreman 25 Resin; then 30 Sap | 1.15 | Kiln built (S1-05) | same (crew) |
| sawmill_crew | Sawmill crew | crew | Plank (3 Bark, 5 s) | 0.2 /s | 25 Plank; 30 Sap | 1.15 | Sawmill built | same |
| brickyard_crew | Brickyard crew | crew | Brick (6 s) | 0.167 /s | 25 Brick; 150 Sap | 1.15 | Brickyard built | same |
| ropewalk_crew | Ropewalk crew | crew | Cord (5 s) | 0.2 /s | 25 Cord; 150 Sap | 1.15 | Ropewalk built | same |
| beamworks_crew | Beamworks crew | crew | Beam (12 s) | 0.083 /s | 15 Beam; 150 Sap | 1.15 | Beamworks built | same |
| glasshouse_crew | Glasshouse crew | crew | Glass (10 s) | 0.1 /s | 15 Glass; 800 Sap | 1.15 | Glasshouse built | same |
| lacquery_crew | Lacquery crew | crew | Lacquer (12 s) | 0.083 /s | 15 Lacquer; 800 Sap | 1.15 | Lacquer discovered + built | same |
| forge_crew | Forge crew | crew | Ingot (15 s) | 0.067 /s | 15 Ingot; 5,000 Sap | 1.15 | Forge built | same |
| lanternry_crew | Lanternry crew | crew | Lantern (20 s) | 0.05 /s | 10 Lantern; 5,000 Sap | 1.15 | Lantern discovered + built | same |
| ambervault_crew | Amber Vault crew | crew | Amber (45 s) | 0.022 /s | 10 Amber; 5,000 Sap | 1.15 | Amber discovered + built | same |
| clockworks_crew | Clockworks crew | crew | Clockwork (30 s) | 0.033 /s | 10 Clockwork; 25,000 Sap | 1.15 | Clockwork discovered + built | same |
| observatory_crew | Observatory crew | crew | Starglass (90 s) | 0.011 /s | 5 Starglass; 150,000 Sap | 1.15 | Starglass discovered + built | same |

Season-2+ annexes that behave as producers: **Windmill** (Wind; 30 Beam base, growth 1.13, max 10; +8% all lodge output per level and auto-catches one gust leaf per level), **Grove** (Bloom; 60 Beam + 30 Lacquer; +1 wave per cycle per level, max 3; Beekeepers x2).

In the scene, a lodge draws at most 12 walking Folk (a "+188" badge shows the rest), so a 200-Folk lodge still runs at 60 fps. Folk from lodges carry raw glyphs to the nearest consuming workshop; crews carry the output glyph up the trunk to the next tier — the tree is a visible supply chain.

---

## 7. Upgrades: Runes (permanent multipliers priced in crafted goods)

A **Rune** is carved into the bark (a glowing glyph appears; ten Runes make the trunk shimmer). Each Rune has tiers; `cost(tier k) = base · 6^k` units of its good (k = 0 for the first carving). Tiers cap at 12 (Stars: 8). Within a Season Runes persist; on Turn they reset except for tiers kept by Deep Carving nodes.

| id | Name | Good | Base cost | Effect per tier | Unlock |
|---|---|---|---|---|---|
| rune_sap | Rune of Sap | Resin | 10 | Sap production x1.5 | Kiln Foreman hired (S1-14 goal) |
| rune_bark | Rune of Bark | Plank | 10 | Bark x1.5 | Sawmill Foreman |
| rune_stone | Rune of Stone | Brick | 10 | Stone x1.5 | Brickyard Foreman |
| rune_fiber | Rune of Fiber | Cord | 10 | Fiber x1.5 | Ropewalk Foreman |
| rune_hive | Rune of the Hive | Lacquer | 5 | Honey x1.5 | Lacquery Foreman |
| rune_ore | Rune of Ore | Ingot | 5 | Ore x1.5 | Forge Foreman |
| rune_bell | Foreman's Bell | Beam | 10 | all workshop throughput x1.5 | Beamworks Foreman |
| rune_thrum | Rune of Thrum | Glass | 10 | Strike value x2, crit chance +2% | Glasshouse Foreman |
| rune_reach | Rune of Reach | Beam | 25 | +0.5 m per GROW (additive, before Vigor) | Bough 4 |
| rune_roots | Rune of Roots | Lantern | 5 | all raw production x1.5 | Lanternry Foreman |
| rune_time | Rune of Time | Amber | 5 | offline cap +2 h, offline rate +5% (cap +12 h / +30%) | Amber Vault Foreman |
| rune_ritual | Rune of Rituals | Clockwork | 5 | Ritual costs x0.9 (cap 5 tiers, floor 25% with all discounts) | Clockworks Foreman |
| rune_stars | Rune of Stars | Starglass | 3 | everything x2 (production, crafting, taps) | Observatory Foreman |

Other permanent-per-Season upgrades (non-Rune): **Limbs** (annex slots, §8.2), **feed dials** (free, from the first Foreman), **Rally** (free at Bough 3), **Bough-jump dots** (free at Bough 2), **buy x10/x25/MAX** (free at any lodge 10). Temporary multipliers: milestone/chest **x2 tokens** (10 min, stack in duration not value), **Resonance** (x5 for 4 s), **Rally** (x2 while held), **amber droplet** (+100% crafting 30 s), **Dawn Rush** (x3 taps 60 s), season events (Snowfall x2 crafting, Bloom waves x4, Storm charges).

---

## 8. Expansion axis: Boughs (the islands replacement)

### 8.1 GROW and the bough lines
GROW is the hero verb: `growCost(n) = 10 · 1.18^n` Sap, `metres(n) = (1 + n/4 + reach) · vigor`, n = grows this Season, `reach` from Rune of Reach, `vigor` from Ring Tree (max x6). GROW never happens offline; the return board says "You can GROW 14 times". Cumulative cost to reach a line at vigor 1 (verified: Σ 10·1.18^k = 10·(1.18^n − 1)/0.18):

| Line | Height | Grows (vigor 1) | Cumulative Sap | Vigor x2 grows / Sap | Vigor x6 grows / Sap | Target (Season) |
|---|---|---|---|---|---|---|
| Roots (ritual req) | 30 m | 13 | 4.2e+02 | 8 / 1.5e+02 | 4 / 5.2e+01 | S1 ~5 min |
| Canopy | 60 m | 19 | 1.2e+03 | 13 / 4.2e+02 | 7 / 1.2e+02 | S1 ~6-9 min |
| Upper Trunk | 200 m | 37 | 2.5e+04 | 25 / 3.4e+03 | 14 / 5.1e+02 | S1 ~13-17 min |
| Deep Roots (ritual req) | 400 m | 54 | 4.2e+05 | 37 / 2.5e+04 | 20 / 1.5e+03 | S1 ~24-33 min |
| Crown | 800 m | 77 | 1.9e+07 | 54 / 4.2e+05 | 30 / 7.9e+03 | S1-S2 ~47-66 min |
| Cloudreach | 2,000 m | 124 | 4.6e+10 | 87 / 1.0e+08 | 49 / 1.8e+05 | S2-S4 (day 1) |
| Starbough | 5,000 m | 197 | 8.0e+15 | 138 / 4.6e+11 | 79 / 2.7e+07 | S6-S10 (day 2-3) |
| Elder Bough | 12,000 m | 307 | 6.5e+23 | 216 / 1.9e+17 | 124 / 4.6e+10 | day 4-5 |
| Worldcrown | 20,000 m | 397 | 1.9e+30 | 280 / 7.4e+21 | 160 / 1.8e+13 | day 6-7 |

Vigor is the lever that keeps later lines reachable with a week's income; it is capped at x6 (Vigor I x1.5 · II x2 · III x2) so the ladder stays a ladder. Elder boughs beyond B10 are generated: height x2.5, Ritual cost x8 per step.

### 8.2 Bough Rituals, limbs and annexes
Crossing a line changes the sky and lets the next hooks appear; the **Ritual** (a building at the bough's base height, priced in crafted goods) sprouts the bough's limbs and huts. Perform it by holding the trunk for 3 s while the tree hums and shakes, then it shoots up ~one screen with a leaf explosion, camera ride, birds scattering and a heavy haptic (Roots/Deep Roots plunge downward instead). The next locked bough is always drawn as a faint ghost silhouette with its cost floating beside it.

| Bough | Ritual cost (Season 1) | Requires | Limb slots (annexes) | Unlocks |
|---|---|---|---|---|
| B2 Roots | 40 Plank + 20 Resin | 30 m | 2 | Digger, Brickyard, Glasshouse; Frost Cellar slot (S3) |
| B3 Canopy | 200 Plank + 40 Beam | 60 m | 3 | Weaver, Ropewalk, Lacquery hint, Apiary (annex), Windmill (S2), Grove (S4), Rally |
| B4 Upper Trunk | 300 Beam + 150 Brick + 60 Glass | 200 m | 3 | Lanternry, Amber hint, Kite Yard (annex), Golden Acorn |
| B5 Deep Roots | 1,000 Beam + 300 Glass + 150 Lacquer | 400 m | 2 | Miner, Forge |
| B6 Crown | 2,000 Lantern + 500 Ingot + 1,000 Lacquer | 800 m | 3 | Clockworks hint, Weathervane, Lightning Rod (S5), Falling Stars |
| B7 Cloudreach | 200 Amber + 100 Clockwork + 2,000 Lantern | 2,000 m | 3 | Stargazer, Observatory hint, Caravan dock (S6) |
| B8 Starbough | 50 Starglass + 500 Clockwork + 5,000 Lantern | 5,000 m and Season ≥ 3 | 4 | Star Chart altar (S8), Elder slots |
| B9 Elder Bough | 400 Starglass + 3,000 Clockwork | 12,000 m | 4 | Elder Sap x2 global |
| B10 Worldcrown | 3,000 Starglass + 20,000 Lantern | 20,000 m | 4 | Elder Crown, endgame cutscene |

Ritual discount: x0.9 per Season completed (cumulative, floor 0.3), stacked with Quick Rituals nodes and Rune of Rituals to an absolute floor of 25% of the listed cost.

**Limbs** are bought per bough with Beams: `limbCost = 10 · 2.5^(limbsBoughtThisSeason)` (10, 25, 63, 156, …). A limb holds one **annex** chosen from those unlocked (a per-Season build decision, Skystalk's Branches): Apiary (S1, Beekeepers), Kite Yard (S1, cosmetic crafting), Hearth Annex (S1, Bough 2+: a second Foreman on one chosen workshop = x2 throughput), Windmill (S2), Frost Cellar (S3), Grove (S4), Lightning Rod (S5), Caravan Post (S6), Owl Nest (cosmetic companion egg, Landmark #30). Annexes are 30-line data rows (cost, timer, yields, art recipe).

---

## 9. Progression spine and the next-goal UI

### 9.1 The spine
The single axis is **the tree**: height in metres and the bough it has reached, shown permanently in the currency strip ("412 m · Deep Roots"). Everything else exists to raise the tree (Sap → GROW), is gated by it (hooks by height, Rituals by lines) or is paid by what it produces. The Season is the chapter; the stump ring count is the book.

### 9.2 The Waystone (pinned goal bar, 56 px, always present)
Exactly one active goal, e.g. `#37 · Craft 25 Beams · 17/25 ▓▓▓▓▓░░ · ~48 s · 🎁 Amber Chest`. Tapping it opens the **Road Ahead** sheet: the next three goals with their rewards and a silhouette preview of what each unlocks, plus the two current **Wishes** (optional daily side objectives, e.g., "Catch 3 Falling Stars this session → 40 Fireflies").

Two lanes feed the bar:
1. **Season Lane** (authored, per Season). Season 1 is the hand-written list in §10.2 (63 goals). Season N ≥ 2 is generated from the same template: goals tagged `tutorial` (S1-01…07, 11) are dropped; for each bough in order the template emits *[GROW to line → Ritual → first lodge → each workshop → its Foreman → first Rune of that good]*; milestone goals are inserted whenever the next lodge/crew milestone is within 3 minutes at current rates; the Season's new-mechanic intro goals are inserted after Bough 3 (S2: "Catch 5 gust leaves", "Build the Windmill"; S3: "Build the Frost Cellar", "Thaw a frozen bundle"; S4: "Ride a Bloom wave to the Crown", "Build the Grove"; S5: "Discharge the Lightning Rod"; S6: "Trade with the Caravan"). A goal whose condition is already met when it becomes active (Head Start, Kept Foremen, Sprout nodes) completes silently without reward. Firefly rewards scale x(1 + 0.1·season) capped at x2; chests scale with income; cosmetics and Landmarks are once-ever.
2. **Legacy Lane** (persistent): Season count, lifetime Rings, Codex %, lifetime Lanterns, cosmetics owned. Its next entry is shown on the "then:" line whenever the Season Lane's next goal is more than 10 minutes away.

### 9.3 The Compass resolver (advice layer and fallback)
Runs every 1 s.

```
candidates = { next lodge milestone (each lodge), next crew milestone (each workshop), unbuilt workshop with hook in range,
               Foreman not yet hired, next tier of each unlocked Rune, next limb, next annex, Ritual (if height ≥ line) else GROW-to-line,
               Crucible hint available, Season Turn at (rings+1) }
for each candidate c:
  deficit_r = max(0, cost_r − stock_r)                for every resource r in c.cost
  net_r     = gross_r − foremanDraw_r                  (10 s exponential moving average; taps excluded; feed dials respected)
  eta(c)    = max_r ( deficit_r / net_r )  ;  ∞ if any net_r ≤ 0 with deficit_r > 0
  bottleneck(c) = argmax_r ( deficit_r · worth_r )
score(c)  = eta(c) · (c.fresh ? 0.5 : 1) · (c.kind == 'turn' ? 1.5 : 1)      fresh = unlocks something new
exclusions: eta > 3600 s is excluded while any candidate has eta < 600 s; ready-and-not-fresh candidates are excluded (the player can see them); Rune tiers ≥ 4 above the cheapest unbought Rune are excluded (no "Rune of Sap IX" traps)
compass.best = argmin score
```
Pinned goal = Season Lane head while the lane has entries; otherwise `compass.best`. The bar always shows `eta(pinned)`; when `eta(pinned) > 600 s` or is ∞ the **advice line** appears: for ∞, the blocking reason from the static `sourceOf[r]` table ("Stone comes from Diggers — open Bough 2"); for long ETAs, the cheapest purchasable that raises `net_bottleneck` (a lodge level, a crew member, a feed-dial change, a Rune) together with the ETA it would give ("Hire 2 more Peelers → ~4 m"). Tapping the advice performs it (or opens the right sheet scrolled to it with a highlight pulse). When `eta > 1800 s` the bar adds "Folk will finish this while you're away" and the session-end forecast.

ETA text: `~45 s`, `~4 m 10 s`, `~2 h 15 m`, `> 1 day`. Progress = 1 − Σ deficit·worth / Σ cost·worth. The bar turns green and pulses when ready; completing a goal plays the leaf-burst and slides the next goal in from the right within 400 ms.

### 9.4 Landmarks, Wishes and the Season Turn readout
Every 10th Season-Lane goal is a **Landmark**: +50 Fireflies and a permanent scene object (#10 rope bridge, #20 birdhouse, #30 owl (companion egg), #40 wind chimes, #50 mushroom lights, #60 prayer flags; later seasons add bells, a swing, a hammock, a treehouse door…). Two **Wishes** refresh daily (catch N set-pieces, craft N of a good, reach a milestone) for 20-60 Fireflies. The Rings tab button shows live `Rings if you turn now: 4 (+1 in ~12 min)` from the Heartwood rate, and long-pressing the height readout shows the whole bough ladder with visited boughs coloured in.

---

## 10. Unlock timeline and target timings

Timings are from the reference bot (`docs/pacing_sim_reference.py`, 3 strikes/s while active, following the lane, buying what the Compass says) and a casual variant (2 strikes/s, half the duty, less optimal buying). Real players land between them. The implementation sim must reproduce these within the tolerances in §17.

### 10.1 First 10 minutes, minute by minute (typical player)

| Time | What happens | Feel |
|---|---|---|
| 0:00 | Sapling, mist, one prompt: "Strike the trunk". Five strikes; Sap counter appears | first haptic, bark ripple |
| 0:10 | **GROW** (10 Sap): the trunk stretches, camera nudges, the Waystone bar slides in | the hero verb, first |
| 0:20 | Hire a Sapper (15 Sap): the first Folk walks out with a lantern; Sap ticks by itself | automation begins |
| 0:40 | 3 Sappers; GROW again whenever it lights | rhythm established |
| 0:55 | Build the Kiln at the stump (40 Sap); Resin recipe card ("worth 20 · inputs 5 · x4") | crafting introduced |
| 1:05 | Hand-craft 5 Resin by tapping the Kiln; Codex flips its first card | second thing to tap |
| 1:30 | Hire the Kiln Foreman (25 Resin): auto-crafting forever. Card: "Taps now boost — Folk build." Bark Chest #1 | **auto-craft automation ≤ 1:50 casual** |
| 1:50 | Hire a Peeler (60 Sap): Bark starts | second raw |
| 2:30 | GROW to 20 m: the Sawmill hook pops into view as a ghost hut | GROW reveals things |
| 3:00 | Build the Sawmill (30 Bark). **Landmark #10**: a rope bridge appears | first Landmark |
| 3:30 | Thrum ring unlocks; first **Resonance** (all Folk sprint x5 for 4 s) | tapping gets a payoff |
| 4:15 | Hire the Sawmill Foreman (25 Plank): tier-1 chain fully automated. Bark Chest #2 | **whole chain idle < 5:30 casual** |
| 4:30 | Sapper Lodge 10: hut grows, hat slot appears, x1.5 | first breakpoint |
| 4:45 | Carve **Rune of Sap I** (10 Resin): a glowing glyph on the bark; first cosmetic (Lantern colour Amber) auto-equips and the Wardrobe tab appears | permanent multiplier |
| 5:00 | GROW to 30 m: the Roots line; a ghost of the Roots appears *below* the stump with its cost | the axis goes both ways |
| 5:20-7:40 | **Ritual: Bough 2 Roots** (hold 3 s): camera dips, mushrooms glow. Amber Chest, +20 Glimmer | first "new island" |
| 6:15 | Digger (6 Resin), Brickyard (20 Resin + 20 Stone) | crafted goods buy lodges |
| 6:30 | First **Beehive Shake** set-piece → Honey | tap-only treat |
| 7:00 | GROW to 40 m → Beamworks (30 Plank + 10 Resin); first Beam (x4.1 card). **Landmark #20**: birdhouse | |
| 7:15 | Brickyard and Beamworks Foremen; Rune of Bark I | |
| 8:00 | GROW to 60 m: the sky crossfades to gold, birds circle — the Canopy line. First dusk: lanterns light, fireflies drift, tapping one gives the first Firefly and reveals the Firefly Market tab | world reacts |
| 9:30-11:45 | **Ritual: Bough 3 Canopy** (200 Plank + 40 Beam): the tree shoots up a floor. Weaver, Ropewalk; Rally unlocks | |

### 10.2 Season 1 lane (authored) with targets

`Ff` = Fireflies. Chest contents in §12. Times = active / casual bot.

| # | Goal | Reward | Active | Casual |
|---|---|---|---|---|
| 1 | Strike the trunk 5 times | +5 Sap | 0:05 | 0:08 |
| 2 | GROW once | 5 Ff | 0:10 | 0:15 |
| 3 | Hire a Sapper (15 Sap) | 5 Ff | 0:15 | 0:25 |
| 4 | Own 3 Sappers | 5 Ff | 0:30 | 0:45 |
| 5 | Build the Kiln (40 Sap) | 5 Ff | 0:45 | 1:00 |
| 6 | Hand-craft 5 Resin | 5 Ff | 0:55 | 1:15 |
| 7 | Hire the Kiln Foreman (25 Resin) | 15 Ff · Bark Chest | 1:10 | 1:50 |
| 8 | Hire a Peeler (60 Sap) | 5 Ff | 1:20 | 2:10 |
| 9 | GROW to 20 m | 5 Ff | 1:45 | 2:40 |
| 10 | Build the Sawmill (30 Bark) | Landmark: rope bridge · 50 Ff | 2:30 | 3:20 |
| 11 | Fill the Thrum ring (first Resonance) | 10 Ff | 3:00 | 3:50 |
| 12 | Hire the Sawmill Foreman (25 Plank) | 15 Ff · Bark Chest | 3:50 | 5:25 |
| 13 | Sapper Lodge level 10 | 10 Ff | 4:00 | 5:30 |
| 14 | Carve Rune of Sap I (10 Resin) | 10 Ff · 🏮 Lantern colour: Amber | 4:05 | 5:40 |
| 15 | GROW to 30 m (Roots line) | 5 Ff | 4:10 | 5:45 |
| 16 | Ritual: Bough 2 Roots | Amber Chest · 20 Glimmer | 5:20 | 7:40 |
| 17 | Hire a Digger (6 Resin) | 5 Ff | 5:20 | 7:45 |
| 18 | Build the Brickyard | 5 Ff | 5:30 | 8:00 |
| 19 | Hire the Brickyard Foreman (25 Brick) | 15 Ff | 6:10 | 8:40 |
| 20 | GROW to 40 m | Landmark: birdhouse · 50 Ff · Beehive Shake unlocks | 6:10 | 8:45 |
| 21 | Build the Beamworks | 5 Ff | 6:15 | 8:50 |
| 22 | Hire the Beamworks Foreman (15 Beam) | 15 Ff · Bark Chest | 6:20 | 9:00 |
| 23 | Carve Rune of Bark I (10 Plank) | 10 Ff | 6:20 | 9:05 |
| 24 | GROW to 60 m (Canopy line) | 10 Ff · 🌄 Sky: Dawn Gold | 6:25 | 9:10 |
| 25 | Ritual: Bough 3 Canopy | Amber Chest · 20 Glimmer · Rally unlocks | 9:30 | 11:45 |
| 26 | Hire a Weaver (10 Plank) | 5 Ff | 9:40 | 11:50 |
| 27 | Build the Ropewalk (20 Plank) | 5 Ff | 9:45 | 12:00 |
| 28 | Peeler Lodge level 10 | 10 Ff | 10:30 | 13:00 |
| 29 | Hire the Ropewalk Foreman (25 Cord) | 15 Ff | 11:30 | 14:00 |
| 30 | Sprout a limb (10 Beam) and build the Apiary | Landmark: owl (companion egg) · 50 Ff | 11:35 | 14:10 |
| 31 | Hire a Beekeeper (5 Cord) | 5 Ff | 11:40 | 14:15 |
| 32 | Build the Glasshouse (15 Brick) | 5 Ff | 11:45 | 14:20 |
| 33 | Hire the Glasshouse Foreman (15 Glass) | 15 Ff · Bark Chest | 11:50 | 14:30 |
| 34 | Discover Lacquer in the Crucible | 40 Ff (Codex) | 11:55 | 14:40 |
| 35 | Build the Lacquery and hire its Foreman (15 Lacquer) | 15 Ff | 13:10 | 15:40 |
| 36 | Sapper Lodge level 25 (x2) | 10 Ff | 13:10 | 15:45 |
| 37 | Carve Foreman's Bell I (10 Beam) | 10 Ff | 13:10 | 15:50 |
| 38 | GROW to 200 m (Upper Trunk line) | 10 Ff | 13:20 | 16:30 |
| 39 | Kiln crew 10 | 10 Ff | 14:00 | 17:00 |
| 40 | Ritual: Bough 4 Upper Trunk | Landmark: wind chimes · Amber Chest · 20 Glimmer | 16:10 | 20:05 |
| 41 | GROW to 250 m and build the Lanternry (20 Beam + 10 Glass) | 5 Ff | 17:30 | 22:00 |
| 42 | Hire the Lanternry Foreman (10 Lantern) | 15 Ff | 18:00 | 22:30 |
| 43 | Catch a Golden Acorn | 20 Ff | 18:30 | 23:00 |
| 44 | Discover Amber in the Crucible | 60 Ff | 19:30 | 24:30 |
| 45 | Build the Amber Vault (300 m) and hire its Foreman (10 Amber) | 15 Ff · Bark Chest | 22:00 | 28:00 |
| 46 | Carve Rune of Sap III | 10 Ff | 22:00 | 28:00 |
| 47 | Sapper Lodge level 50 (Chief appears) | 10 Ff · 🎩 Hat: Acorn Cap | 23:00 | 30:00 |
| 48 | Craft 100 Lanterns (the Trunk lights up) | 25 Ff · 🏮 Lantern shape: Paper | 24:00 | 30:30 |
| 49 | GROW to 400 m (Deep Roots line) | 10 Ff | 24:15 | 33:00 |
| 50 | Ritual: Bough 5 Deep Roots | Landmark: mushroom lights · Amber Chest · 20 Glimmer | 24:20 | 35:00 |
| 51 | Hire a Miner (4 Beam) | 5 Ff | 24:20 | 35:05 |
| 52 | Build the Forge and hire its Foreman (15 Ingot) | 15 Ff · Bark Chest | 24:30 | 35:30 |
| 53 | Carve Rune of Ore I (5 Ingot) | 10 Ff | 26:30 | 37:00 |
| 54 | Craft 300 Lanterns (three boughs lit) | 25 Ff | 29:00 | 39:00 |
| 55 | Sprout a second limb and build the Kite Yard (25 Beam) | 20 Ff | 30:00 | 42:00 |
| 56 | Craft a Carp Kite at the Kite Yard | 🪁 Kite: Carp | 33:00 | 45:00 |
| 57 | Carve Rune of Roots I (5 Lantern) | 10 Ff | 33:00 | 45:00 |
| 58 | Reach 3 Rings (Season Turn button appears with the Autumn preview card) | 25 Ff | 35:00 | 47:00 |
| 59 | Kiln crew 50 | 10 Ff | 36:00 | 50:00 |
| 60 | Reach 5 Rings (Turn recommended) | Landmark: prayer flags · 50 Ff | 43:00 | 55:00 |
| 61 | *optional* GROW to 800 m (Crown line) | 10 Ff | 47:00 | 66:00 |
| 62 | *optional* Ritual: Bough 6 Crown | Amber Chest · 20 Glimmer | 50:00 | 70:00 |
| 63 | Turn the Season | Season Medal · Season Card · 100 Ff · 10 Glimmer | player's choice | |

Largest gap between consecutive goals in the first 30 minutes: 3:05 (active, #24→#25 while Planks and Beams accumulate for the Canopy Ritual) / 3:05 (casual, #39→#40), both within the assertion in §17; nothing exceeds 8 minutes before the first Turn (the #57→#60 window is filled by set-pieces, Wishes and Compass milestones such as Sapper 100 and Beamworks crew 50).

### 10.3 First hour
- **12-16 min:** Apiary and Beekeepers (Honey idle), Glasshouse, Lacquer discovered (Crucible hint shows `2 Resin + 1 Cord + ?`), Lacquery Foreman, Sapper 25 (x2), Foreman's Bell I, Upper Trunk line at 200 m (mist, rope bridges), Bough 4 Ritual, Lanternry.
- **16-24 min:** Golden Acorn, first 100 Lanterns light the Trunk, Amber discovered, Amber Vault, Kite Yard limb, Rune tiers II-III, crew 10/25, lodge 25/50 milestones, Chief at Sapper 50.
- **24-35 min:** Deep Roots line at 400 m, Bough 5 Ritual (roots plunge), Miner, Forge, Ingot, Rune of Ore, 300 Lanterns, Woodpecker set-piece.
- **35-45 min:** Season Turn button at 3 Rings with the preview card *"Season 2: AUTUMN — Wind and the Windmill"*, Rune of Roots I, Carp Kite crafted.
- **43-55 min:** 5 Rings; the Turn is recommended. Active players may push to the Crown line (800 m, ~47 min) and even perform the Crown Ritual (~50-70 min) for +2 Rings before turning; the readout shows both options.
- **Turn 1 (~50-60 min):** wilt animation, seeds fall, stump ring #1, Ring Tree opens in the roots with 5-8 Rings; buy Rich Sap (1), Head Start (2) and Tailwind (1); Season 2 starts in the Autumn palette with Wind gusts.

### 10.4 Day 1 (4-6 sessions, 3-4 h cumulative)
Seasons 2-5 last 35-60 minutes each: Wind (S2, Windmill), Frost (S3, Frost Cellar and Snowfall), Bloom (S4, Grove and Bloom waves), Storm (S5, Lightning Rod). Season 2 reaches the Crown (800 m) in ~25 min and discovers Clockwork; Season 3 or 4 reaches Cloudreach (2,000 m): aurora, Stargazers, Observatory hint, first Starglass. End of day 1: 4-5 Turns, 30-45 lifetime Rings, ~14 Ring Tree nodes, 10-14 earned cosmetics, Sap/s ~1e6-1e7, Heartwood per Season ~1e10-1e11, Codex ~45%.

### 10.5 Week 1
Seasons 6-20+: Caravans (S6), then Stewards (S7), Star Charts (S8) and Expeditions (S9) as they ship, Great Ring at S10 (permanent tree-wide skin choice, x2 global). Starbough (5,000 m) on day 2-3 (needs Season ≥ 3 and Vigor ≥ x2), Elder Bough (12 km) day 4-5, Worldcrown (20 km) day 6-7 for active players with Vigor x6. Sap/s ≥ 1e12, lifetime Heartwood ≥ 1e18 (stretch 1e24), 800-1,500 lifetime Rings, 25-35 earned cosmetics, Codex ~80%, all four Season Medal skins, Elder Crown at Season 20. Numbers use K/M/B/T/Qa/Qi/Sx/Sp/Oc/No/Dc, scientific beyond 1e36.

---

## 11. Prestige: Turn the Season

### 11.1 Name, availability, ceremony
**Turn the Season.** The Rings tab shows a greyed seed until the Season has produced 3 Rings' worth of Heartwood (~35-47 min in Season 1); from then on the button reads `Turn now: 4 Rings (+1 in ~12 min)` at all times. Turning is a hold-for-1.5 s ring (no modal). The exact payout is shown before the hold completes. Ceremony (4 s, skippable after the first time): leaves shed from the top down in the current palette, Folk parachute off on leaves, the tree shrinks to a sapling, seeds drift down past every bough you built, one ring is inscribed on the stump with a chime and a heavy haptic, the palette shifts to the next Season, the Season Medal banner unfurls, the Season Card renders, and the Ring Tree opens automatically with the new Rings glowing.

### 11.2 Currency formula
```
seasonHeartwood HW = Σ over the Season of (units produced × worth)   — taps, raws and every craft tier count
rings = floor( 2 · ( log10( max(HW, K) / K ) )^1.5 ),  K = 3e6
```
Checkpoints: 1e8 → 3, 2.1e8 → 5, 5e8 → 6, 1e9 → 8, 1e10 → 13, 1e12 → 25, 1e15 → 49, 1e18 → 78, 1e24 → 146, 1e30 → 228. Per-Season payouts therefore grow slowly (log-power), which keeps a week of 15-25 Turns at ~800-1,500 lifetime Rings while Heartwood climbs 20 orders of magnitude, and the "+1 Ring in ~N min" readout is always finite. K is the single tuning knob for first-Turn timing. Offline Heartwood counts (returning after a night makes turning worthwhile).

**Ring passive:** every Ring ever earned gives +5% to all production, multiplicative with everything else (1,000 Rings = x51).

### 11.3 What resets, what persists
| Resets on Turn | Persists |
|---|---|
| Height, grows, Sap and every tier 0-4 good | Rings (unspent and lifetime), the Ring Tree |
| Lodge and crew counts, workshops built, Foremen | Codex: discovered recipes stay discovered (workshops rebuild without the Crucible), species, critters, Landmarks |
| Runes (except tiers kept by Deep Carving) | Cosmetics owned and equipped, Fireflies, Glimmer, Season Medals, titles, nameplate |
| Limbs and annexes (discovered annex types re-sprout at 50% cost) | Stump rings, Landmark objects (reappear on their bough when it reopens; stump-level ones stay) |
| Boughs (tree returns to sapling; Sprout nodes restore B2/B3 and 30/60 m) | Waystone Legacy lane, Wishes, statistics, unlocked mechanics, annex discoveries, feed-dial settings, settings |
| Season Heartwood, lit-bough count, set-piece timers, tokens | Lifetime Heartwood, lifetime Lanterns (cosmetic thresholds), Firefly Market history |

### 11.4 The Ring Tree (five limbs, drawn as roots below the stump)
Node cost of level L = `baseCost · 2^L` Rings (first purchase at baseCost). Costs along each limb follow 1, 2, 3, 5, 8, 13, 21, 34 so a first Turn of 5-8 Rings buys two or three nodes, and the Season's new-mechanic node is always 1-2 Rings.

| id | Limb | Name | Base cost | Max | Effect per level | Mechanic? | Requires |
|---|---|---|---|---|---|---|---|
| roots_rich | ROOTS | Rich Sap | 1 | 5 | all raw production x1.5 | no | — |
| roots_start | ROOTS | Head Start | 2 | 4 | start each Season with +5 Sappers | no | — |
| roots_old | ROOTS | Old Growth | 3 | 3 | lodge milestone multipliers +25% (x2 → x2.5) | no | — |
| roots_vigor1 | ROOTS | Vigor I | 5 | 1 | metres per GROW x1.5 | no | — |
| roots_cheap | ROOTS | Cheap Hires | 8 | 3 | lodge and crew costs x0.9 | no | — |
| roots_vigor2 | ROOTS | Vigor II | 13 | 1 | metres per GROW x2 | no | Vigor I |
| roots_ancient | ROOTS | Ancient Roots | 21 | 3 | all production x2 | no | Season ≥ 3 |
| roots_vigor3 | ROOTS | Vigor III | 34 | 1 | metres per GROW x2 (Vigor cap x6) | no | Vigor II, Season ≥ 5 |
| trunk_grip | TRUNK | Firm Grip | 1 | 2 | tap peg 0.25 s → 0.5 s → 1.0 s of idle income | no | — |
| trunk_eye | TRUNK | Keen Eye | 2 | 4 | crit chance +5% | no | — |
| trunk_long | TRUNK | Long Thrum | 3 | 3 | Resonance +2 s | no | — |
| trunk_deep | TRUNK | Deep Resonance | 5 | 1 | Resonance x5 → x8 | no | — |
| trunk_auto | TRUNK | Auto-Thrum | 8 | 1 | Resonance fires from idle every 90 s | no | Season ≥ 2 |
| trunk_master | TRUNK | Masterwork Hands | 13 | 4 | Masterwork chance +5% | no | — |
| trunk_wind | TRUNK | Second Wind | 21 | 2 | Rally stamina +10 s, refill x2 | no | Season ≥ 3 |
| canopy_pride | CANOPY | Foreman's Pride | 1 | 5 | all workshop throughput x1.5 | no | — |
| canopy_kept | CANOPY | Kept Foremen | 2 | 3 | start with Kiln + Sawmill (then + Brickyard/Ropewalk, then + Beamworks/Glasshouse) built and staffed | no | — |
| canopy_carve | CANOPY | Deep Carving | 3 | 3 | keep 1 tier of every Rune through the Turn | no | — |
| canopy_thrift | CANOPY | Thrifty Recipes | 5 | 3 | recipe inputs −10% | no | — |
| canopy_lit | CANOPY | Lit Boughs | 8 | 1 | Lanterns light a bough every 50 instead of 100 | no | Season ≥ 2 |
| canopy_guild | CANOPY | Guild Crew | 13 | 3 | crew costs x0.8 | no | — |
| canopy_codex | CANOPY | Codex Mastery | 21 | 2 | discoveries pay x3 Fireflies; discovered goods worth +10% | no | Season ≥ 4 |
| crown_night | CROWN | Nightwatch | 1 | 2 | offline rate 50% → 75% → 100% | no | — |
| crown_long | CROWN | Long Night | 2 | 4 | offline cap +4 h (8 → 24 h) | no | — |
| crown_quick | CROWN | Quick Rituals | 3 | 5 | Ritual costs x0.9 | no | — |
| crown_dawn | CROWN | Dawn Rush+ | 5 | 1 | Dawn Rush 60 s → 120 s | no | — |
| crown_sprout | CROWN | Sprout | 8 | 2 | start each Season at 30 m with Bough 2 open (then 60 m + Bough 3) | no | Season ≥ 2 |
| crown_golden | CROWN | Golden Hours | 13 | 1 | Golden Acorn 15 → 30 min | no | — |
| crown_time | CROWN | Time Ring | 21 | 3 | all production x1.5 | no | Season ≥ 4 |
| hw_wind | HEARTWOOD | Tailwind | 1 | 1 | gusts every 90 s; Windmill cap 12 | **yes** (Wind upgrade) | Season ≥ 2 |
| hw_frost | HEARTWOOD | Deep Freeze | 1 | 1 | Cellar +24 h; thaw x2 → x3 | **yes** (Frost) | Season ≥ 3 |
| hw_bloom | HEARTWOOD | Long Bloom | 1 | 1 | Bloom x4 lasts 20 s | **yes** (Bloom) | Season ≥ 4 |
| hw_storm | HEARTWOOD | Conductor | 1 | 1 | Rod holds 8 charges | **yes** (Storm) | Season ≥ 5 |
| hw_caravan | HEARTWOOD | Trade Routes | 1 | 1 | 4 offers per caravan | **yes** (Caravans) | Season ≥ 6 |
| hw_steward | HEARTWOOD | Head Steward | 2 | 1 | Stewards also tune feed dials | yes (Stewards, v1.1) | Season ≥ 7 |
| hw_chart | HEARTWOOD | Astrolabe | 2 | 1 | choose 2 constellations | yes (Star Charts, v1.1) | Season ≥ 8 |
| hw_exped | HEARTWOOD | Far Roads | 2 | 1 | 4 Folk per expedition | yes (Expeditions, v1.1) | Season ≥ 9 |

The mechanic itself unlocks **free** at the Turn (by count, not by spending); the HEARTWOOD node is its cheap upgrade, so every Turn changes what you do even with zero Rings spent.

### 11.5 The Season ladder (shown in advance on the Rings tab)
| Turn | Season | Palette | New mechanic | Annex | Medal cosmetic | v1 |
|---|---|---|---|---|---|---|
| 0 | Spring of the First Ring | default green | — | Apiary, Kite Yard, Hearth Annex | — | ✔ |
| 1 | Autumn | orange/red leaves, falling-leaf particles | **WIND**: a gust every 120 s ± 40% blows 12 leaves across for 8 s; each tapped leaf pays 10 s of total income; Windmill annex gives +8% lodge output per level and auto-catches one leaf per level | Windmill | Autumn tree skin + banner | ✔ |
| 2 | Winter | snow caps, blue light, icicle lanterns | **FROST**: Frost Cellar annex stores offline production beyond the cap (+24 h) as frozen bundles; 10 taps thaw at x2 (ice-crack particles, heavy haptic) or it auto-thaws at x1 after 10 min; Snowfall every 5 min for 30 s = all crafting x2 | Frost Cellar | Winter skin + banner | ✔ |
| 3 | Spring | blossoms, bees | **BLOOM**: a blossom wave every 180 s climbs the tree one bough per 4 s; each lodge and workshop it passes works x4 for 12 s; tapping the front pushes it up a bough instantly; Grove annex adds waves and doubles Beekeepers | Grove | Spring skin + banner | ✔ |
| 4 | Summer | deep green, thunderheads, lightning flashes | **STORM**: Lightning Rod annex; storms every 5 min for 40 s, a strike every 8 s charges the Rod (max 5); tap to discharge: each charge completes 60 s of all Foreman crafting instantly (from stock); auto-discharges at 50% two minutes after full | Lightning Rod | Summer skin + banner | ✔ |
| 5 | Autumn II | — | **CARAVANS**: a caravan docks at the stump every 30 min of play and on every return, for 5 min, with 3 offers from a data table (goods → Fireflies, goods → rare inputs such as 200 Lacquer → 5 Starfall, goods → a weekly cosmetic) | Caravan Post | Windchime ornament | ✔ |
| 6 | Winter II | — | **STEWARDS**: a Steward per bough auto-buys the cheapest lodge/crew level every 30 s and (with Head Steward) tunes feed dials | — | Snail Shell hat | v1.1, shown as "next update" |
| 7 | Spring II | — | **STAR CHARTS**: pick one constellation per Season (x2 raw / x2 crafting / x2 offline / +50% taps) at the Starbough altar | Altar | Star frame | v1.1 |
| 8 | Summer II | — | **EXPEDITIONS**: send 3 Folk off-tree for 2/4/8 h; they return with a Star Chest (resolves with offline) | Trailhead | Explorer title | v1.1 |
| 10 / 20 / 30 | Great Ring | — | permanent tree-wide skin choice, x2 global, +1 limb on every bough | — | Great Ring frame; Elder Crown at 20 | ✔ (10) |

Mechanic modules are data rows `{id, atTurn, implemented, palette, annex, medal}`; unimplemented rows render on the ladder with a "next update" tag and never block a Turn.

---

## 12. Milestones, chests and juice

### 12.1 Chests
| Chest | Contents | Opening |
|---|---|---|
| Bark Chest 🪵 | 120 s of current income (Sap-weighted raw bundle), 10-25 Fireflies, 10% chance of a common cosmetic | drops onto the canvas, 3 taps to crack (haptic tick each), contents fly to their counters with number roll-ups |
| Amber Chest 🟠 | 15 min of income, 50-100 Fireflies, a guaranteed uncommon cosmetic (or a dye if all owned), one x2 token (10 min) | 3 taps, light leaks between cracks |
| Star Chest ⭐ | 60 min of income, 150 Fireflies, a guaranteed rare cosmetic (dye set when exhausted), one x2 token | 3 taps, starburst |
| Season Chest 🌀 | 10 Glimmer, 100 Fireflies, Season Medal, x2 token (20 min) for the new Season | opens inside the Turn ceremony |
| Return Chest 🌙 | Bark Chest after > 2 h away, Amber Chest after > 12 h | on the return board |
Chests never expire and never stack beyond 5 unopened (the 6th auto-opens).

### 12.2 Milestone table (data-driven; ~150 rows in content, the spine shown here)
| id | Condition | Reward | Celebration |
|---|---|---|---|
| m_taps_100 / 1k / 10k / 100k / 1M | strikes | 10 / 25 / 50 / 100 / 250 Ff; 1k: tap effect **Sparks+**; 100k: tap effect **Musical Notes** | small / medium |
| m_crit_100 / 1k | crits | 25 / 100 Ff; 1k: tap effect **Golden Sparks** | small |
| m_reso_10 / 100 / 1k | Resonances | 20 / 60 / 200 Ff; 100: Thrum meter skin **Vine** | small |
| m_grow_10 / 50 / 100 / 250 / 500 | grows this Season | Bark Chest / Amber / Amber / Star / Star | medium |
| m_height_100m … every line | first time at each height line | 20 Glimmer (first time per bough), sky theme unlock per bough (§14) | **big**: full-screen sky crossfade 1.5 s, species fly in, title card |
| m_bough_N | Ritual performed (first time ever) | Amber Chest, Landmark | big: leaf explosion, camera ride |
| m_lodge_25 / 50 / 100 / 200 (per lodge) | lodge milestones | 10 / 15 / 25 / 50 Ff; first 50 ever: hat **Acorn Cap**; first 100: hat **Mushroom Cap**; first 200: **Tiny Crown** | medium: hut grows, Folk cheer (bounce + leaf confetti), chime |
| m_crew_25 / 50 / 100 (per workshop) | crew milestones | 10 / 15 / 25 Ff; first 100 ever: roof **Slate Tile** | medium |
| m_craft_tier1..4_1k | 1,000 crafts of a tier | 25 / 50 / 100 / 200 Ff | small |
| m_lantern_100 / 1k / 10k / 100k (lifetime) | Lanterns crafted | lantern shape **Paper** / colour **Moss** / shape **Gourd** / glow **Firefly-swarm** | medium: strings light bough by bough |
| m_rune_10 / 25 / 50 | Runes carved (lifetime) | 30 / 80 / 200 Ff; 25: tree tint **Glowbark** | small |
| m_codex_25 / 50 / 75 / 100 % | Codex completion | Amber / Amber / Star / Star Chest; 50%: lantern glow **Flicker**; 100%: title **Loremaster** | medium |
| m_season_1 / 3 / 5 / 10 / 20 | Turns | medal each; 3: tree skin **Birch**; 5: card frame **Rings**; 10: **Great Ring**; 20: **Elder Crown** ornament | big |
| m_landmark_N | every 10th Season-Lane goal | 50 Ff + permanent scene object | medium |
| m_setpiece_10 / 100 (each) | set-pieces completed | 25 / 100 Ff; Beehive 100: companion **Bee**; Star 10: sky **Starfield** | small |
| m_fireflies_1000 | Fireflies collected lifetime | companion **Firefly Swarm** | medium |
| m_streak_7 | 7 calendar days with a return | companion **Ash Cat**; no punishment for a miss, the lanterns on the stump door just go out | medium |
| m_masterwork_50 | Masterworks | 40 Ff; roof **Moss-Grown** | small |
| m_kite_1 | first kite crafted | title **Kite-flyer** | small |
Every milestone also drops one **x2 token** (10 min, all production) when its celebration is medium or big, so each milestone accelerates the next unlock.

### 12.3 Celebration presentation
- **GROW:** trunk stretch with ease-out-back, leaves unfurl, camera push, light haptic, 3 grass-note chime.
- **Line crossed:** full-screen sky crossfade (1.5 s), critters fly in, title card ("Canopy — 60 m"), medium haptic, new ambient sound bed.
- **Ritual:** hold ring fills over 3 s with rising hum, shake, leaf explosion, camera ride, heavy haptic, new biome fades in; Landmark object pops with a dust puff.
- **Unlock cards:** any new building/mechanic/cosmetic raises a card from the bottom sheet with two lines and an Equip/Build button — never a wall of text.
- **Resonance:** whole-tree bark ripple, Folk sprint with sweat drops, medium haptic. **Crit:** gold number, edge glow, 60 ms heavy haptic. **Masterwork:** purple trail up the trunk, rising pitch.
- **Milestones:** hut grows, Folk cheer, leaf confetti in the bough's leaf shape, pentatonic chime tuned to the Thrum meter.
- **Chests:** shake-then-crack on three taps, contents fly to counters, numbers tween (never snap).
- **Turn:** described in §11.1. **Return:** §13.
- Audio is a small WebAudio synth (pentatonic, tap pitch rises with Thrum), off by default until the speaker icon is tapped. Particles are pooled with a hard cap of 300 live particles (150 in reduced-motion mode, which swaps particles for fades). No celebration blocks input for more than 1.5 s.

---

## 13. Offline progress and return (Nightwatch)

### 13.1 Simulation
On load, `elapsed = now − lastSeen` (monotonic guard: negative or > 30-day deltas clamp to 0). The engine runs **the same `stepEconomy(dt)` used live** in 60-second steps for `min(elapsed, cap)` seconds with the offline multiplier applied to all lodge output (Foremen craft from stock under the same feed dials, tier by tier, so chains progress and the result matches live behaviour by construction). Max 1,440 steps (24 h) + Frost Cellar overflow.
```
offlineRate = 0.5 (+0.25 per Nightwatch node → 1.0) + 0.05 per Rune of Time tier (cap +0.30)
cap         = 8 h + 4 h per Long Night node (→ 24 h) + 2 h per Rune of Time tier (cap +12 h)   — absolute max 24 h
Frost Cellar (S3): production beyond the cap, up to +24 h, is stored frozen; 10 taps thaw it at x2 (x3 with Deep Freeze), or it auto-thaws at x1 after 10 min of play
Heartwood accrues offline; GROW never happens offline; set-pieces do not spawn offline; Golden Acorn is the only "time" reward and is earned by play
```
The current cap and rate are drawn as **fireflies in a jar** on the stump (one firefly per hour of cap; brighter with rate), so the Rune of Time and Crown nodes read as a visible, earned lever. Kites (Kite Yard) and Expeditions resolve on return with their own package on the tree.

### 13.2 Return presentation
1. The scene is shown at night with lanterns lit; one tap on the trunk "wakes" the tree (whoosh + haptic) — the only required tap.
2. A wooden board slides up: `Away 5 h 12 m — Nightwatch haul`, each resource counting up line by line (tick sounds, per-line light haptic), crafted goods listed separately ("6 Lanterns crafted"), then a big **Collect** button.
3. Return Chest if away > 2 h (Amber if > 12 h). Frozen bundle from the Cellar sits on the canvas to tap open.
4. **Grow-to-goal:** if the haul covers the next line or Ritual, the board says "You can reach the Crown right now" with a one-tap button that plays the climb as a 3 s time-lapse; otherwise "You can GROW 14 times".
5. **Dawn Rush:** sunrise sweep, 60 s of x3 strike value with the Thrum pre-filled to 50 (Dawn Rush+ node: 120 s).
6. **Morning Dew:** the first return each calendar day pays 3 Glimmer and 15 Fireflies; no streak punishment (the 7-day streak only adds the Ash Cat).
7. The Waystone recomputes before the board closes, so the first thing after the board is the next goal and how close the night got it; goals completed offline queue their chests.

---

## 14. Cosmetics catalog and monetization

### 14.1 Catalog
Categories and their scene hook: **lantern** (colour / shape / glow on every lodge, workshop and limb), **tree** (bark texture, leaf species, palette override), **hat** (every Folk of every type and the Chief), **roof** (all huts), **sky** (background gradient + particle layer, per bough table), **tap** (strike particles; Thrum meter skin), **crown** (ornament at the tip and the Season Card banner), **companion** (one critter that wanders and reacts to taps), **frame** (Season Card and nameplate), **title**. Everything is a parameter set consumed by the renderer; nothing has a stat effect.

| id | Category | Name | How it shows | Earned by / Glimmer price |
|---|---|---|---|---|
| lc_amber | lantern colour | Amber | default warm glow | start (goal S1-14) |
| lc_moss | lantern colour | Moss | green glow | 1,000 lifetime Lanterns |
| lc_rose | lantern colour | Rose | pink glow | Firefly Market 80 Ff |
| lc_icewater | lantern colour | Icewater | pale blue | Winter medal (Season 3) |
| lc_dye | lantern colour | Dyed (any hue) | hue slider | 20 Lacquer per hue (Kite Yard) |
| ls_paper | lantern shape | Paper | rounded paper lantern | 100 lifetime Lanterns |
| ls_gourd | lantern shape | Gourd | bulbous | 10,000 lifetime Lanterns |
| ls_bell | lantern shape | Bell | bell silhouette | Firefly Market 120 Ff |
| ls_crystal | lantern shape | Crystal | faceted, refracts | 250 Glimmer |
| ls_jelly | lantern shape | Jellyfish | trailing tendrils | 250 Glimmer |
| lg_flicker | lantern glow | Flicker | candle flicker | Codex 50% |
| lg_pulse | lantern glow | Pulse-with-Thrum | pulses with the combo | 300 Glimmer |
| lg_swarm | lantern glow | Firefly-swarm | fireflies orbit each lantern | 100,000 lifetime Lanterns |
| lg_golden | lantern glow | Golden Keeper | gold shimmer | Supporter Pack only |
| tr_oak | tree | Oak | default | start |
| tr_autumn / winter / spring / summer | tree | Season skins | palette override (choose any owned Season look) | Season Medals 2-5 |
| tr_birch | tree | Birch | white bark, black flecks | Season 3 milestone |
| tr_glowbark | tree | Glowbark | bark veins glow at night | 25 lifetime Runes |
| tr_elder | tree | Elder Oak | gnarled, moss, giant leaves | Season 20 |
| tr_cherry | tree | Cherry Blossom | pink leaves, petal fall | 600 Glimmer |
| tr_willow | tree | Ghost Willow | pale drooping leaves, mist | 600 Glimmer |
| tr_crystal | tree | Crystal Pine | translucent needles | 800 Glimmer |
| tr_night | tree | Nightbloom (animated) | bioluminescent flowers open at night | 900 Glimmer |
| hat_acorn | hat | Acorn Cap | on every Folk | first lodge 50 |
| hat_mushroom | hat | Mushroom Cap | | first lodge 100 |
| hat_straw | hat | Straw Hat | | Firefly Market 60 Ff |
| hat_bee | hat | Bee Suit | | Spring medal (Season 4) |
| hat_snail | hat | Snail Shell | | Season 7 medal / Caravan |
| hat_crown | hat | Tiny Crown | | first lodge 200, or 200 Glimmer |
| hat_wizard | hat | Wizard Hat | | 200 Glimmer |
| hat_lanternhelm | hat | Lantern Helm | helmet with a lit lantern | 300 Glimmer |
| chief_regal | hat (Chief) | Regal Cloak | Chief outfit | 350 Glimmer |
| chief_keeper | hat (Chief) | Keeper's Cloak | | Supporter Pack |
| roof_thatch | roof | Thatch | default | start |
| roof_slate | roof | Slate Tile | | first crew 100 |
| roof_mush | roof | Mushroom Cap | | Landmark #50 |
| roof_moss | roof | Moss-Grown | | 50 Masterworks |
| roof_hive | roof | Beehive Dome | | Spring medal |
| roof_pagoda | roof | Pagoda | | 300 Glimmer |
| roof_shell | roof | Shell | | 300 Glimmer |
| roof_glass | roof | Stained Glass (glows with lantern colour) | | 450 Glimmer |
| sky_dawn | sky | Dawn Gold | | Canopy line (S1-24) |
| sky_twilight | sky | Twilight Violet | | Upper Trunk line |
| sky_star | sky | Starfield | | first 10 Falling Stars |
| sky_snow | sky | Gentle Snow | | Winter medal |
| sky_aurora | sky | Aurora | | 400 Glimmer |
| sky_petal | sky | Petal Rain | | 350 Glimmer |
| sky_mist | sky | Bioluminescent Mist | | 500 Glimmer |
| tap_sparks | tap | Sparks | default | start |
| tap_petals | tap | Petals | | first Amber Chest |
| tap_notes | tap | Musical Notes | | 100k strikes |
| tap_gold | tap | Golden Sparks | | 1,000 crits |
| tap_runes | tap | Runes | | 150 Glimmer |
| tap_ink | tap | Ink Splash | | 150 Glimmer |
| tap_stars | tap | Tiny Stars | | 200 Glimmer |
| meter_wood / vine / clock | tap (Thrum skin) | Wood Ring / Vine / Clockface | | start / 100 Resonances / 200 Glimmer |
| crown_vane | crown | Weathervane | | Bough 6 first time |
| crown_chime | crown | Windchime | | Season 6 medal |
| crown_lantern | crown | Great Lantern | | 400 Glimmer |
| crown_crystal | crown | Crystal Spire | | 500 Glimmer |
| crown_kite | crown | Animated Kite | | 300 Glimmer |
| crown_elder | crown | Elder Crown | | Season 20 |
| kite_carp / dragon / guild | crown (kite) | kites on the Kite Yard line | | crafted: 50 Cord + 20 Lacquer + 60 Ff; dragon 120 Ff; guild emblems 24 procedural |
| pet_owl | companion | Owl | | Landmark #30 (egg hatches after 1 Season) |
| pet_snail | companion | Snail | | Firefly Market 200 Ff |
| pet_swarm | companion | Firefly Swarm | | 1,000 Fireflies collected |
| pet_bee | companion | Bee | | 100 Beehive Shakes |
| pet_cat | companion | Ash Cat | | 7-day return streak |
| pet_fox | companion | Fox | | 400 Glimmer |
| pet_dragon | companion | Baby Dragon | | 700 Glimmer |
| pet_deer | companion | Ghost Deer | | 700 Glimmer |
| frame_bark / rings / star | frame | Season Card frames | | start / Season 5 / first Starglass |
| frame_gilded / aurora | frame | Gilded / Animated Aurora | | 200 / 300 Glimmer |
| title_* | title | Cloudreacher, Storm Whisperer, Loremaster, Kite-flyer, Keeper, Explorer, Giantfriend… | nameplate | all earned (Supporter: Keeper) |

Bundles (a themed set at ~25% off): **Cherry Blossom Grove** (tr_cherry + sky_petal + tap_petals + pink paper lanterns) 1,000 Glimmer; **Deep Sea** (ls_jelly + sky_mist + roof_shell + hat_snail variant) 900; **Clockwork Court** (meter_clock + brass lanterns + hat_crown + roof_pagoda) 800; **Midnight Observatory** (sky_star+ variant, crown_crystal, owl variant) 1,000. Bundles rotate weekly on a featured shelf from a fixed data table and always return; nothing is ever removed permanently.

**Firefly Market:** weekly rotation of 7 items, one from every category, priced 60-400 Ff, plus permanent stock of every earned base item; no category is ever paywalled. Season-1 Firefly income ≈ 600; week-1 ≈ 2,500-4,000 → 8-12 earned cosmetics plus the 15+ granted by milestones.

**Try-on:** every shop and market item previews on the player's own tree in the live scene for 30 s before purchase (the Wardrobe renders the equip in place).

**Season Card:** on every Turn a 1080x1920 PNG is rendered (tree snapshot with equipped cosmetics, Season number, best height, Rings, lit lanterns, titles, frame) and offered via the Capacitor share sheet (PWA: download). It is the only network-adjacent feature and the organic acquisition loop.

### 14.2 Monetization
- **Premium currency: Glimmer** (a jar of captured light), shown only in the Wardrobe/Shop, never in the main HUD.
- **Price points (USD, Capacitor IAP; PWA hides the shop or uses web checkout):** 200 Glimmer $1.99 · 550 $4.99 (best value) · 1,200 $9.99 · 2,600 $19.99.
- **Item prices:** hats 150-300, lantern shapes 250, glows 300, tap effects 150-200, roofs 300-450, skies 350-500, crown 300-500, companions 400-700, tree skins 600-900, frames 200-300; bundles 800-1,000.
- **Earned Glimmer:** 20 per bough opened for the first time (B2-B8 = 140), 10 per Season Medal for Seasons 2-6 (50), Morning Dew 3/day (21) ≈ 210 in week 1 — one mid-tier paid item, enough that paying is a choice, not enough to deflate demand (judge concern).
- **Supporter Pack "Lantern-Keeper", $4.99 one-time:** Golden Keeper lantern glow, Keeper's Cloak for Chiefs, the Keeper title, a golden nameplate frame, a lit lantern on the stump door, 300 Glimmer, and the player's initials on a plaque at −1 m in the roots. No gameplay effect.
- **No ads, no battle pass, no gacha, no loot boxes for money, no timers to skip.** The optional monthly Almanac from the pitch is cut from v1.
- **NEVER SOLD:** Sap, any raw or crafted good, Heartwood, Rings, Ring Tree nodes, Folk, crew, Foremen, lodge or crew levels, Runes, Boughs, Rituals, limbs, annexes, GROW, Vigor, offline time, offline cap or rate, Frost thaws, time skips or warps, boosts or tokens, chests or chest keys, Waystone skips, Codex entries or Crucible attempts, Fireflies, set-piece spawns, or anything that changes a number. The shop header prints "Nothing here affects progress" with a Restore Purchases button; receipts are cached in the local save (serverless build; a spoofed receipt can only yield cosmetics, which is accepted and documented).

---

## 15. Mobile UX

### 15.1 Screen map (portrait only, 390x844 reference, safe-area aware; landscape locked)
Pixel budget (sums to 844):

| Zone | Height | Content |
|---|---|---|
| Top safe inset | 47 px | — |
| **Waystone bar** | 56 px | pinned goal, progress, ETA, reward icon; tap → Road Ahead sheet; the only interactive element at the top and a single large target |
| **Currency strip** | 32 px | height + bough (left), **Sap** big (centre), three goal-relevant goods auto-chosen (right); tap → full ledger; gear icon → settings |
| **Canvas** | 491 px (58%) | the tree; trunk band 80 px wide at centre is the tap target along its full height; growing tip pinned at ~70% down the canvas; lodges/workshops/chests tappable in place; swipe to scroll; bough-jump dots on the right edge; "Now" pill |
| **Bottom sheet (collapsed)** | 120 px | the active tab's primary action (e.g., GROW button with "+3.2 m · 1.4K Sap", or the next buy button) |
| **Tab bar** | 64 px | 5 tabs |
| Bottom safe inset | 34 px | — |

The sheet drags up to a maximum of 55% of the screen (464 px) with a handle; because the trunk runs the full canvas height, the sliver of canvas above an expanded sheet (≥ 200 px) always contains tappable trunk, so **sheets never cover the tap band**. While the sheet is expanded the scene renders at 30 fps with the particle budget halved.

### 15.2 Bottom nav tabs
| Tab | Glyph | Contents (primary button at the bottom, nearest the thumb) |
|---|---|---|
| **Folk** | 🏠 | lodge cards (count, rate, next milestone bar, Buy x1/x10/x25/MAX, hold-to-repeat), Chief, workshop crew cards |
| **Craft** | 🔥 | workshop cards (recipe with worth-vs-cost, throughput, feed dial, Foreman hire, "tap to craft"), Crucible, Codex |
| **Grow** | 🌳 | the big GROW button (+metres, cost, "GROW x10 / MAX"), bough ladder with the next Ritual (hold ring), limbs and annexes, Runes list |
| **Wardrobe** | 🏮 | equip slots per category with live preview, Firefly Market, Shop (Glimmer), Season Cards, Supporter Pack, Restore |
| **Rings** | 🌀 | greyed seed until 3 Rings ("Turn at 3 Rings · 2 now · +1 in ~12 m"); then Turn hold-ring, Ring Tree (roots), Season ladder, medals |

### 15.3 One-thumb rules and haptics
- Every frequent action (strike, GROW, buy, hire, open chest, catch set-piece, Waystone) is a single tap in the bottom 60% of the screen; buy buttons are 56 px tall and right-aligned; a left-hand mirror setting flips them.
- No drag-and-drop anywhere (Crucible uses tap-to-slot); drag is only for scrolling the tree and the sheet.
- Destructive or big actions (Ritual, Turn, feed dial "Off") are hold-for-1.5 s rings, never modals.
- Long-press on any card shows a tooltip with exact numbers; long-press a buy button = MAX with a haptic tick per 10 levels.
- **Haptics** (Capacitor Haptics, no-op on PWA): light on strike and Thrum steps, medium on crit/Resonance/lodge milestone/GROW, heavy on chest crack, Ritual, line crossing and Turn, success pattern on discovery and unlock cards, three short ticks on chest cracks; global toggle.
- **Audio:** WebAudio synth only, off by default until the speaker is tapped.

### 15.4 Numbers, accessibility, sessions, performance
- Formatting: 12.3K · 4.56M · 1.2B · 3.4T · 5.6Qa · 7.8Qi · Sx · Sp · Oc · No · Dc, scientific beyond 1e36 or always (setting); counters tween; rates show `/s` with the same suffixes; ETAs as `~45 s / ~4 m 10 s / ~2 h 15 m / > 1 day`.
- Accessibility: 44 pt minimum targets, font floor 14 px, resource icons differ by shape *and* colour (colour-blind safe), reduced-motion mode (particles → fades, no screen shake), screen-reader labels on every button, haptics/audio toggles, sci-notation toggle.
- Session targets: 2-5 minute check-ins (one chest, one milestone, a GROW spree), a 20-minute sit-down when a Ritual is near, a useful 30-second visit (return board → Waystone → one buy). The Waystone ETA states which kind of session this is.
- Performance: requestAnimationFrame at 60 fps with a 30 fps battery mode; only the visible bough band plus one neighbour is drawn; ≤ 12 Folk sprites per lodge; particle pool 300; 1 Hz economy tick when backgrounded; save debounced every 5 s and on `visibilitychange`; save < 200 KB, versioned with migrations and a plain-text export/import.
- PWA install prompt after Waystone goal #10; Capacitor wrapper for stores (haptics, IAP, share sheet).

---

## 16. Systems for implementation

Nine systems; each is a folder under `src/systems` (or `src/scene` / `src/ui`) with a one-paragraph contract. Content is data (`src/content/*.ts`, typed by `src/content/types.ts`); systems never hard-code an item.

1. **Economy Core** (`economy`, `craft`, `numbers`). Owns the resource ledger (stock, gross and net rates as 10 s EMAs, lifetime earned, Heartwood), producers (lodges and crews with the x1.13 / x1.15 curves and the 10/25/50/100/200 milestone pattern), workshops as continuous converters with feed dials, Runes as tiered multipliers, the effect table that folds every multiplier source (Runes, milestones, Ring passive, Ring Tree, lit boughs, season events, tokens, Resonance, Rally) into one `mult(target)` lookup, big-number formatting, and `stepEconomy(dt)` — the single function used live, offline and by the simulator.
2. **Tap & Thrum** (`tap`, `setpiece`). Strike value with the idle peg, the Thrum meter and Resonance, crits with the amber droplet, guaranteed 25th crit and 500th Bloom, Rally stamina, manual workshop crafts with Masterwork, and the set-piece scheduler (spawn cadence, on-screen timers, tap handling, rewards, the never-overlap and never-in-first-5-minutes rules).
3. **Growth** (`grow`, `boughs`). GROW cost/metres with Vigor and Reach, height and the line table (sky, ambient critters, hooks by height), Bough Rituals (requirements, discounted costs, hold interaction, direction up/down), limbs and annexes, the ghost silhouette of the next bough, and the Crucible/Codex discovery state for cross-chain recipes.
4. **Waystone & Compass** (`waystone`, `compass`, `milestones`). Season Lane generation from the template plus the authored Season-1 list, Legacy Lane, the Compass candidate resolver with ETA, bottleneck, exclusions and sub-step advice, Road Ahead, Wishes, Landmarks, the milestone table with chest generation and x2 tokens, Fireflies accounting.
5. **Seasons (prestige)** (`prestige`, `seasons`). Heartwood-to-Rings formula and live readout, the Turn ceremony state machine, reset/persist rules, the five-limb Ring Tree with node effects and requirements, the Season ladder keyed by Turn count with `implemented` flags, the mechanic modules Wind, Frost, Bloom, Storm and Caravans (each a timer + particles + a data table), Great Rings, Season Medals and the Season Card render request.
6. **Nightwatch (offline & return)** (`offline`, `storage`). Save/load with versioned migrations, monotonic-clock guard, offline simulation via `stepEconomy` in 60 s steps with rate and cap, Frost Cellar overflow, kite/expedition resolution, the return board data (per-resource haul, crafted goods, chests, Grow-to-goal), Dawn Rush and Morning Dew.
7. **Scene & Spire Renderer** (`scene`). Canvas: sky gradient per bough and season palette, day/night lighting, the trunk, boughs, limbs, huts with tier visuals, Folk sprites with walk/carry loops and caps, lantern strings and lit boughs, Runes on the bark, Landmark objects, ghost silhouettes, set-piece actors, chests, particles and tweens, camera scroll/snap/ride, the roots view with the Ring Tree, the starving-input marker, the nameplate, and cosmetic render hooks (lantern, tree, hat, roof, sky, tap, crown, companion). Also the Season Card renderer (offscreen 1080x1920).
8. **Wardrobe & Shop** (`cosmetics`, `shop`). Cosmetic registry with earned/priced flags and params, equip slots, live try-on, Firefly Market rotation (weekly seed, one item per category), Glimmer wallet with earned drips, bundles and the featured shelf, Supporter Pack, Capacitor IAP with local receipt cache and Restore, PWA shop-hidden mode, Season Card sharing.
9. **Shell** (`ui`, `engine`). Preact + signals UI (Waystone bar, currency strip, sheets, tabs, cards, unlock cards, hold rings), haptics and audio services, settings, PWA/service worker and Capacitor packaging, the game loop (1 Hz economy tick when backgrounded), event bus, and the headless bot (`src/sim`) that plays through the public Game API and prints the unlock timeline and the §17 assertions in CI.

**Mapping to the existing engine scaffold (`src/content/types.ts`):** `ResourceDef` → §4 (add `heartwood`-style meta flags); `BandDef` → Boughs (add `ritual: {cost, requiresHeight, direction}`, `limbSlots`); `ProducerDef` → lodges (`gatherer`) and crews (`crafter` with `station`; crews use the milestone pattern too, the per-extra-crafter speed becomes the crew count); `BuildingDef` → workshops (one recipe each, `height` = hook) and annexes; `RecipeDef` → §5.1 (add `discover`, `hint`); `BoostDef` → Runes (`costGrowth` 6, effects as listed); `MilestoneDef`/`Reward` → §12 (add `fireflies`, `landmark`); `PrestigeNodeDef` → Ring Tree (`limb`, `requiresPrestiges`, specials `start_producers`, `keep_boosts_pct` → keep-tiers, `unlock_mechanic`, new `vigor`, `sprout`, `kept_foremen`); `MechanicDef` → Season ladder (`atPrestige`, `implemented`); `CosmeticDef` categories → `lantern | tree | hat | roof | sky | tap | crown | companion | frame | title`; `SetPieceDef` → §3.6; `BALANCE` → tap peg 0.25, feed 0.5, grow 10/1.18/1+n/4, offline 0.5/8 h, prestige K = 3e6 (replace the height formula), compass maxEta 600. New content tables: `waystone` (authored lane + template), `seasons`, `annexes`, `codexHints`, `fireflyMarket`, `bundles`.

---

## 17. Balance targets the simulator must verify

The bot (`src/sim`) plays through the public Game API at 3 strikes/s while active with the duty cycle 100% / 60% / 35% / 20% for minutes 0-3 / 3-10 / 10-30 / 30+, follows the Waystone and takes the Compass's advice, buys lodges/crew when their cost is ≤ 20% of the paying stock, carves Runes when ≤ 50% of the stock. A "casual" run uses 2 strikes/s, half the duty and 12% thresholds. A "no-tap" run never strikes after minute 2. Sessions of 6 minutes separated by 2 h gaps model a day. Every assertion below is a CI check; tolerances are ± the stated range.

**First 10 minutes**
1. First Sapper (idle Sap) by 0:30 active, 0:45 casual.
2. Kiln Foreman (first auto-craft) by 1:30 active, 2:00 casual — automation < 3 min.
3. Hand-crafting the 25 Resin for the Kiln Foreman takes ≤ 40 s of tapping once the Kiln exists.
4. Sawmill Foreman (tier-1 chain fully idle) by 4:30 active, 6:00 casual.
5. GROW is affordable at least once every 45 s during minutes 0-10 (active).
6. Bough 2 Ritual between 4:00 and 8:00 (active 5:20 ± 1:00, casual 7:40 ± 1:30).
7. First cosmetic (lantern colour) by 5:00 active; Wardrobe tab visible.
8. Canopy line (60 m) crossed between 5:30 and 9:30; Bough 3 Ritual between 8:30 and 13:00.
9. No gap between consecutive Season-1 lane goals exceeds 3:30 (active) or 4:00 (casual) in the first 30 minutes.

**First hour**
10. Bough 4 Ritual 14-22 min; Bough 5 Ritual 22-38 min; Bough 6 line (800 m) reached by 70 min (active).
11. Season Turn button (3 Rings) appears between 30 and 47 min; 5 Rings between 40 and 60 min (active), 48-75 min (casual).
12. No lane gap exceeds 8 minutes before the first Turn; the Compass always has a candidate with ETA < 10 min until the lane is exhausted.
13. Honey idle source (Apiary) is buildable no later than 3 minutes after the Lacquer Crucible hint first shows.
14. Sap stock never sits below 30 s of income for more than 10% of ticks (Kiln feed cannot starve hires).
15. Tapping contributes 25-45% of Season-1 income after minute 10 (active) and the no-tap run reaches Bough 5 within 1.6x of the active run's time (taps are optional).
16. The Compass never pins a goal with ETA > 60 min while any candidate with ETA < 10 min exists; it never suggests a Rune tier more than 3 above the cheapest unbought Rune.
17. The Waystone's ETA is within ±25% of the realised time for 90% of goals with ETA < 10 min (honesty check).

**Prestige and Seasons**
18. `rings(HW)` returns 0/3/5/8/13/25/49/78/146 at HW = 1e7/1e8/2.1e8/1e9/1e10/1e12/1e15/1e18/1e24.
19. With the recommended first three nodes (Rich Sap, Head Start, Tailwind), Season 2 reaches Bough 5 in ≤ 40% of Season 1's time and the Crown in ≤ 30 min.
20. Each Turn 1-5 exposes exactly one new mechanic and its HEARTWOOD node is affordable with that Turn's payout.
21. Lifetime Rings after a modelled day 1 (5 sessions, ~4 h) ≥ 25 with ≥ 4 Turns; after a modelled week (3 h/day) 800-1,500 with ≥ 15 Turns.
22. Cumulative Ritual discounts never take a Ritual below 25% of its listed cost; Vigor never exceeds x6; Rune tiers never exceed 12 (Stars 8).

**Long curve**
23. Cloudreach (2,000 m) reached on modelled day 1-2; Starbough (5,000 m) day 2-3; Elder Bough (12 km) day 4-5; Worldcrown (20 km) by day 7 for the active model.
24. Sap/s ≥ 1e12 and lifetime Heartwood ≥ 1e18 by day 7; no value ever exceeds 1e300 or becomes NaN/Infinity (all multipliers capped as listed; display switches to scientific at 1e36).
25. Every crafted good's worth is 3.9-4.4x the worth of its inputs (data lint), and at least one Rune, lodge or Ritual is priced in every crafted good (no dead goods).

**Offline and economy invariants**
26. 8 h offline at rate 0.5 yields 4 h of live production ± 2% and crafted-goods output ≥ 30% of the live crafted/raw ratio; offline and live `stepEconomy` produce identical results for identical inputs.
27. The Golden Acorn is the only source of "time" and pays exactly 15 min (30 with Golden Hours) of offline-rate production.
28. Fireflies earned: 500-800 in Season 1, 2,500-4,000 in the modelled week; Glimmer earned in the week: 210 ± 30; the Firefly Market always lists at least one item per category.
29. Chest and set-piece rewards expressed in seconds of income never exceed 60 min of income per event (Star Chest cap).
30. Save size < 200 KB after a modelled week; save/load round-trips are lossless; a migration from version 1 loads without throwing.

---

## Appendix A — Reference pacing simulation
`docs/pacing_sim_reference.py` is the throwaway Python model used to tune this document (`python3 docs/pacing_sim_reference.py 0.25 100 10 1.18 3e6 6 1.5` runs the active bot for 100 minutes; arguments: tap peg seconds, minutes, GROW base, GROW growth, Ring K, Rune cost growth, raw-Rune multiplier). It is not the product simulator; `src/sim` must be rebuilt on the real engine and reproduce §10 and §17. The model simplifies taps to an average Thrum/crit multiplier of 1.9 and omits set-pieces, tokens, Rally, Dawn Rush and offline.

## Appendix B — Glossary
**Strike** tap on the trunk · **Thrum** combo meter · **Resonance** x5 burst at Thrum 100 · **Rally** hold boost · **GROW** spend Sap for metres · **Line** height at which a bough's sky begins · **Ritual** crafted-goods purchase that sprouts a bough · **Limb** annex slot on a bough · **Annex** special building on a limb · **Folk** worker · **Lodge** raw producer · **Crew / Foreman** workshop staff; Foreman = crew #1, turns on auto-crafting · **Feed dial** cap on a workshop's draw · **Rune** permanent tiered multiplier priced in crafted goods · **Heartwood** Season score (Σ produced × worth) · **Rings** prestige currency · **Ring Tree** prestige tree in the roots · **Turn the Season** prestige · **Season Medal** cosmetic awarded per Turn · **Waystone** pinned goal · **Compass** cheapest-next resolver · **Landmark** permanent scene object every 10th goal · **Codex / Crucible** discovery log and recipe experiment · **Fireflies** earned cosmetic currency · **Glimmer** premium cosmetic currency · **Nightwatch** offline production · **Dawn Rush** post-return tap boost · **Morning Dew** first-return-of-the-day bonus · **Season Card** shareable PNG.
