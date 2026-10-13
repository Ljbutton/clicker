# Blockbound: The Fraying: Story Bible

An original, four-episode, choice-driven adventure set in a blocky voxel world.
All characters, places and plot below are original to this project.

Tone: warm, funny, earnest, with real stakes. Friends bicker and care about each
other. No gore. Dialogue is short, punchy and characterful. A single line is
rarely more than two sentences.

## The world

**The Shardlands** is a world built of blocks that floats on nothing. At its
heart, on a hill above the village of **Kettlebrook**, stands **the Beacon**, a
tower whose light everyone has always believed "keeps the world together".

**The Fray** is what happens at the world's edges when it comes apart. Blocks
crack, turn grey-violet, and dissolve upward into motes of light, leaving
nothing behind. **Seams** are glowing cracks that open in the sky when the Fray
is near. **Gloamlings** are shadowy, cube-bodied creatures with glowing violet
eyes. They come out of the Fray, and they swarm.

**Sparkwire** is a glowing orange wire that carries power (used for machines,
doors, lifts, minecart rails). **The Keystone** is a small, pulsing, teal
crystal shard. Pepper digs it up in Episode 1. It reacts to the Beacon and to
the Anchors. **The Anchors** are four great crystals hidden around the world
(Ember, Tide, Root and Gale). The Beacon draws on them.

**The truth (revealed in Episode 3):** the Beacon doesn't hold the world
together. It *drinks* from it. Long ago it was built to light the first
settlement, and over centuries it pulled harder and harder on the Anchors. Their
strain is what frays the edges. The Cartographer has been pulling Anchors out to
starve the Beacon and "redraw" a smaller, stable world. That would erase
Kettlebrook and everything near the Beacon.

## Characters

| id | Name | Who they are |
|---|---|---|
| `wren` | **Wren** | The player. A young, scrappy builder from Kettlebrook. Underdog, quick-witted. Referred to as *they/them*. Player picks one of three looks at the start. |
| `pepper` | **Pepper** | Wren's small spotted dog with a red bandana. Brave, food-motivated, digs things up. Barks; never "talks". |
| `ostin` | **Ostin Fell** | Inventor. Anxious, talks fast, brilliant with sparkwire, wears goggles. Self-deprecating. Gets braver over the season. |
| `juno` | **Juno Marr** | Scavenger and fighter. Sharp-tongued, red scarf, carries a pickaxe she calls "Nettle". Grew up in **Lowmere**, a town lost to the Fray years ago. Hides how much she cares. |
| `bram` | **Bram Oakhart** | Big, gentle builder with a hammer. Wants to win the Lantern Fair for his grandmother (Nana Oakhart). Loyal, earnest, a terrible liar. |
| `tibbet` | **Mayor Tibbet** | Kettlebrook's pompous but ultimately decent mayor. Tall hat. |
| `nana` | **Nana Oakhart** | Bram's grandmother. Tiny, fierce, judges the Lantern Fair. |
| `ysolde` | **Keeper Ysolde** | Ancient archivist of the **Sunken Archive**. Wry, secretive. Was once the Cartographer's apprentice. |
| `mags` | **Mags Gristle** | Boss of **Iron Hollow**, the mining city. Mercenary dealer, loud, has a soft spot for good craftsmanship. |
| `seren` | **The Cartographer (Seren Vael)** | Masked, cloaked in grey. Controls the gloamlings through a "drafting staff". Sympathetic: lost Lowmere to the Fray and is **Juno's aunt**. Believes erasing part of the world is the only way to save the rest. Appears in Ep1 disguised as "a grey traveler" (`stranger`). |
| `gloam` | Gloamlings | Enemies. Spawned with `spawn` using the `gloam` kind. |
| `unmaker` | **The Unmaker** | Colossal Fray-construct, the finale boss. |

Relationships are tracked as numbers: `rel.ostin`, `rel.juno`, `rel.bram`,
`rel.ysolde`, `rel.seren`, `rel.mags`.

## The big choice of Episode 1 and the "partner" alias

At the end of Episode 1, Wren must choose whom to save from the collapsing
Beacon bridge: **Juno** or **Bram**. The one you save becomes `partner`. The
other is snatched by gloamlings and becomes `captive`. Their name is
`{captive}` in text. The captive returns in Episode 3.

- Flag `saved` = `'juno'` or `'bram'`.
- In scripts, cast/actor id `partner` resolves to whichever was saved, and
  `captive` to the other. Text placeholders `{partner}` and `{captive}` give
  their names.
- For lines where Juno and Bram would speak very differently, use
  `{ if: 'saved=juno', then: [...], else: [...] }`.

## Episode outlines

### Episode 1: The Lantern Fair
1. **Morning in Kettlebrook.** The Lantern Fair building contest is today. Wren,
   Ostin, Pepper. The team's entry is a giant lantern-statue, but they're
   missing its **lantern core**. Explore the village: talk to Bram (rival
   team, friendly), Juno (scavenger stall), Mayor Tibbet, Nana. Pepper digs up
   a strange teal shard (the Keystone). Craft the lantern core with the shard
   in the middle.
2. **The grey traveler.** A cloaked stranger asks Wren about "anything unusual
   dug up lately". Choice: tell them about the shard, or lie (`told_stranger`).
3. **The judging.** Lantern design choice (`lantern` = `fox` | `tower` | `star`).
   Judging with Nana and Tibbet. The Keystone flares, the Beacon on the hill
   flickers out, seams split the sky, and the Fray begins eating the east edge
   of the village. Gloamlings attack. Action sequence: protect Ostin, fight off
   gloamlings, save a villager.
4. **To the Beacon.** Wren, Ostin, Juno, Bram and Pepper climb the hill path to
   the Beacon while Tibbet evacuates. Inside the Beacon: an inscription.
   "Four Anchors feed the light. The Keeper holds the way." The Keystone hums.
5. **The bridge.** The sky-bridge from the Beacon tower is fraying. Juno and
   Bram both dangle over the void. **Major choice: save Juno or Bram.** The other
   is dragged off by gloamlings. A masked figure is glimpsed on a floating
   island, holding a staff.
6. **Epilogue.** Back at a wrecked Kettlebrook, at dusk. The group (Wren,
   Ostin, `partner`, Pepper) decides to find "the Keeper". Tibbet gives them an
   old map pointing to the Sunken Archive.

### Episode 2: The Sunken Archive
1. **Glimmerwood.** Travel through a glowing night forest. Gloamling scouts.
   Camp scene: heart-to-heart choices with Ostin and `partner` about the captive.
   Ostin admits he's scared.
2. **Glasswater Lake.** Find the domed archive beneath the lake. Craft
   **bubble helms** (glass + wool + sparkwire). Dive.
3. **The Keeper.** Meet Keeper Ysolde. She tests Wren with a riddle/bookshelf
   puzzle (explore + choices). She explains the Beacon and the four Anchors,
   and that someone has been removing them. One, the Ember Anchor, was sold to
   Mags Gristle of Iron Hollow.
4. **Flood.** Gloamlings crack the dome. Escape sequence with QTEs. **Choice:**
   take the Atlas (`atlas` = `taken` | `left`). **Choice:** convince Ysolde to
   come, or let her stay to hold the doors (`ysolde` = `came` | `stayed`).
5. **The shore.** The Cartographer appears in person, masked. They offer a deal:
   hand over the Keystone and the captive goes free. **Major choice:** refuse
   defiantly, bargain, or stay silent (`answer`). The Cartographer leaves, saying
   "Iron Hollow, then." Cliffhanger.

### Episode 3: Iron Hollow
1. **The Hollow.** A mining city in a vast cavern: rails, lifts, sparkwire, lava
   light. Meet Mags Gristle. She won't sell the Ember Anchor.
2. **The plan.** **Major choice:** Ostin's plan (`plan` = `rails`: sneak into the
   vault by minecart) or `partner`'s plan (`plan` = `arena`: win Mags's building
   challenge and demand the Anchor as the prize). Two different mid-scenes.
3. **The vault.** Get the Ember Anchor. Discover a letter: Mags has been trading
   with the Cartographer. Choice: expose Mags to her workers or keep her secret in
   exchange for help (`mags` = `exposed` | `spared`).
4. **The captive.** Find `{captive}` caged in the gloamling-infested deep mine.
   Rescue (action). The reunion: the captive is hurt that Wren chose the other.
   Choices to make amends.
5. **The truth.** Ysolde (in person if she came, or via a message stone if she
   stayed) reveals that the Beacon drinks from the world, and that the
   Cartographer is Seren Vael, her old teacher. Seren arrives, takes the Ember
   Anchor, and unmasks. Juno recognises her aunt. Seren tells Wren: "Come to
   the Drawing Tower. See the truth for yourself."

### Episode 4: The Drawing Tower
1. **The edge.** Travel to the world's edge. The tower stands on islands over the
   void. All four friends together again (Wren, Ostin, Juno, Bram, Pepper).
2. **The tower floors.** Seren's tower: each floor is a "draft", a miniature
   remade world. Explore, puzzles, gloamling stealth.
3. **Seren.** Confrontation. Seren shows the map of the dying edges. **Choice:**
   reason with her or fight (`seren_choice` = `spared` | `fought`), influenced by
   `rel.seren` and Juno.
4. **The Unmaker.** The drafted Anchors overload. The Unmaker forms out of the
   Fray. Boss fight (action sequences) with friends helping, each set up by
   earlier choices.
5. **The light.** **Final major choice** (`ending`):
   - `keeper`: Wren uses the Keystone to become the Beacon's keeper, binding
     themself to the light so it can be tamed. Bittersweet.
   - `shared`: light a new Beacon from everyone's lanterns (the Lantern Fair
     callback). It needs Seren's help: only available if Seren was spared or
     `rel.seren` ≥ 1. A smaller world, but whole, and no one is alone.
6. **Epilogue.** Kettlebrook rebuilt. Callbacks to `lantern`, `atlas`, `mags`,
   `ysolde`, `saved`.

## Cross-episode flags

| flag | values | set in |
|---|---|---|
| `look` | `0`,`1`,`2` | start |
| `told_stranger` | `true`/`false` | ep1 |
| `lantern` | `fox`/`tower`/`star` | ep1 |
| `saved` | `juno`/`bram` | ep1 |
| `atlas` | `taken`/`left` | ep2 |
| `ysolde` | `came`/`stayed` | ep2 |
| `answer` | `defiant`/`bargain`/`silent` | ep2 |
| `plan` | `rails`/`arena` | ep3 |
| `mags` | `exposed`/`spared` | ep3 |
| `forgiven` | `true`/`false` | ep3 |
| `seren_choice` | `spared`/`fought` | ep4 |
| `ending` | `keeper`/`shared` | ep4 |

Starting an episode from the menu without a save fills in sensible defaults for
earlier flags (see `src/content/defaults.ts`).
