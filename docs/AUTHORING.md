# Writing episodes

Everything in the game is original: story, characters, dialogue, art (procedural
pixel textures and box models), music and sound (procedural WebAudio). Keep it
that way. Do not borrow names, characters, lines, plot beats, creatures or
places from any existing game, film or book.

Read `docs/STORY.md` first. It defines the characters, the four-episode arc and
the cross-episode flags.

## Files

| What | Where |
|---|---|
| Episode script | `src/content/episodes/epN.ts` exporting `epN: Episode` |
| Sets (voxel maps) for that episode | `src/content/sets/epN.ts` exporting `epNSets: SetDef[]` |
| Script types | `src/core/types.ts` |
| Building helpers | `src/content/kit.ts` |
| Block names | `src/render/blocks.ts` (`def('name', ...)` calls) |
| Characters | `src/content/cast.ts`. Add new ones from your episode file with `registerChars({...}, {id: '#color'})` |
| Items | `src/content/items.ts`. Add new ones with `registerItems({...})` |
| Reference episode | `src/content/episodes/ep1.ts` with sets `kettlebrook.ts`, `beacon.ts` |

## Coordinates

- `x` is east, `z` is south, `y` is up. One block = 1 unit. A block at `(x, y, z)` fills `[x, x+1)`.
- Stand an actor in the middle of a block with `.5` coordinates, e.g. `[41.5, 43.5]`.
- `at: [x, z]` drops the actor onto the **topmost** solid block in that column.
  **Under a roof, in caves, or on bridges, use `at: [x, y, z]`**, where `y` is the
  standing height (one above the floor block). The actor lands on the first floor
  at or below `y`.
- `face` is in degrees: `0` = facing +z (south), `180` = north, `90` = east,
  `-90` = west. Or pass an actor id to face them, or `'camera'`.
- Hotspot `at` is a world position `[x, y, z]`, usually about 1 block above the floor.

## Scenes

```ts
{
  id: 'camp', title: 'Camp', set: 'glimmerwood', sky: 'night', music: 'night',
  cast: { wren: { at: [40.5, 52.5], face: 180 }, ostin: { at: [...] }, 'gloam#1': { at: [...], hidden: true } },
  steps: [ ... ],
}
```

- Every scene loads its set fresh. Changes made with `blocks`/`fill`/`fray` don't
  carry over to the next scene. To keep a change, `set` a flag and have the set's
  `build(w, flags)` read it.
- Cast ids are character ids from `CHARS`, the aliases `partner` and `captive`,
  or numbered copies such as `'gloam#1'`, `'miner#2'` (kind before the `#`).
- End a scene with `{ scene: 'nextId' }`. End the episode with `{ end: true }`
  (put a `{ title: 'To be continued…', sub: 'Next: ...' }` before it).
- Progress is saved at the start of each scene.

## Steps (the full list is in `src/core/types.ts`)

- Dialogue: `{ say: 'ostin', text: '...', mood?: 'worried', anim?: 'point', to?: 'wren', shot?: ... }`.
  Without `shot`, the camera cuts between speakers automatically
  (over-the-shoulder / close-up). `{ think: '...' }` is Wren's inner voice.
  `{ narrate: '...' }` is a centered caption.
- Text placeholders: `{partner}`, `{captive}`, any character id like `{ysolde}`,
  or any flag name like `{lantern_name}`.
- Choices:
  ```ts
  { choice: [
      { text: 'Option', steps: [...], rel: { juno: 1 }, remember: 'Juno will remember that.', set: { flag: 'x' }, label: 'Summary label', when: 'rel.juno>=1' },
      { text: 'Hidden timeout result', timeout: true, steps: [...] },
    ], timer: 8, prompt: 'Optional heading', major: { id: 'unique_id', title: 'Shown on the end-of-episode summary' } }
  ```
  Use 1–4 visible options. `timer` (seconds) makes it a timed choice. If time
  runs out, the `timeout: true` option is used, or else Wren stays silent ("...").
  Mark the episode's 3–5 biggest decisions with `major`.
- Conditions (`if`, `when`, `until`): `'flag'`, `'!flag'`, `'saved=juno'`,
  `'rel.juno>=2'`, `'item.helm'`, `'seen.hotspotId'`, combined with `&&` or `||`.
  `{ if: 'cond', then: [...], else: [...] }`.
- Flow: `{ label: 'x' }`, `{ goto: 'x' }`. Labels must be top-level in a scene.
- State: `{ set: { flag: value } }`, `{ rel: { juno: 1 } }`, `{ remember: 'text' }`,
  `{ give: 'item' }`, `{ take: 'item' }`.
- Actors: `{ move: 'id', to: [x, z], run?: true, speed?, wait?: true }` (without
  `wait` it runs in the background), `{ place: 'id', at, face? }`,
  `{ face: 'id', to }`, `{ anim: 'id', name: 'wave', wait? }`,
  `{ mood: 'id', is: 'angry' }`, `{ show: 'id', at?, face? }`, `{ hide: 'id' }`,
  `{ spawn: 'gloam#5', kind: 'gloam', at, face? }`,
  `{ hold: 'id', item: 'pickaxe' | null }` (right hand), `{ carry: 'id', item }` (left hand).
  Props: pickaxe, hammer, sword, staff, lantern, keystone, ember, map, atlas, book,
  torch, wrench, core, helm, bone, flower, letter.
- Animations: idle wave nod shake shrug point cheer swing dodge hit fall crouch
  stand jump think facepalm bark cast hug reach dig build scared sit roar spin.
  `fall`, `crouch`, `reach` and `sit` hold their pose until `stand` or `idle`.
- Camera: `{ shot: 'wide' }` (named cam on the set),
  `{ shot: { close: 'id', side?, dist?, height? } }`, `{ shot: { two: ['a', 'b'] } }`,
  `{ shot: { ots: ['from', 'to'] } }`, `{ shot: { pos: [x,y,z], look: [x,y,z] } }`,
  `{ shot: { orbit: 'id', dist?, height?, speed? } }`. Add `dur: 1.5` to glide.
- World: `{ blocks: [[x,y,z,'block'], ...] }`, `{ fill: { from, to, block } }`,
  `{ fray: { from, to, dur } }` (dissolves blocks into the Fray), `{ sky: 'night' }`.
- Effects: `{ fx: 'shake'|'flash'|'embers'|'motes'|'splash'|'dust'|'sparks'|'poof'|'seams'|'glow'|'beam'|'beamoff'|'bubbles'|'rain'|'stoprain'|'confetti', at?: actorId | [x,y,z], radius?, color? }`.
- Audio: `{ music: 'village'|'wonder'|'mystery'|'tension'|'action'|'sad'|'triumph'|'night'|'cave'|'void'|'none' }`,
  `{ sfx: 'hit'|'swing'|'whoosh'|'break'|'place'|'craft'|'item'|'bark'|'rumble'|'fray'|'gloam'|'chime'|'splash'|'door'|'beacon'|'powerdown'|'thud'|'cheer'|'drip'|'heart'|'select'|'ok'|'fail' }`.
- Misc: `{ wait: 1.2 }`, `{ fade: 'out' | 'in' }`, `{ title: 'Big text', sub: 'small' }`,
  `{ parallel: [steps...] }`.

## Action sequences

```ts
{ action: [
  { place: 'gloam#1', at: [46.5, 42.5], face: 'wren' },
  { qte: { kind: 'dir', key: 'left', text: 'Dodge!', on: 'wren', time: 1.3, ok: [{ anim: 'wren', name: 'dodge' }] } },
  { qte: { kind: 'press', key: 'action', text: 'Swing!', on: 'gloam#1', ok: [ { anim: 'wren', name: 'swing' }, { sfx: 'hit' }, { fx: 'poof', at: 'gloam#1' }, { hide: 'gloam#1' } ] } },
  { qte: { kind: 'mash', key: 'action', text: 'Pull!', count: 9, time: 3.2 } },
  { qte: { kind: 'seq', keys: ['left', 'up', 'action'], text: 'Climb!' } },
] }
```

A failed QTE with no `fail` steps shows a "You were overwhelmed" screen. The game
then rewinds the actors and flags to the start of the enclosing `action` block
and replays it. So start each `action` block with `place` steps that put
everyone where they need to be. A QTE with `fail: [...]` runs those steps
instead and carries on (use this for non-lethal stumbles). Keys: `action` (E /
Space), `up`, `down`, `left`, `right`.

## Exploration

```ts
{ explore: {
  objective: 'Find a way into the Archive',
  until: 'item.helm',           // or rely on required/ends hotspots
  bounds: [x0, z0, x1, z1],     // optional walkable area
  cam: { dist: 6.5, height: 3.6, yaw: 180 }, // optional
  hotspots: [
    { id: 'unique', at: [x, y, z], label: 'Old chest', verb: 'Open', required: true, steps: [...] },
    { id: 'talk_ostin', actor: 'ostin', label: 'Ostin', verb: 'Talk', steps: [...] },
    { id: 'door', at: [...], label: 'Door', verb: 'Go', ends: true, when: 'seen.unique', steps: [...] },
  ],
} }
```

- The player walks Wren with WASD/arrows or click-to-move and presses E near a hotspot.
- Finishing: when `until` is true, or (without `until`) when every `required`
  hotspot has been used, or when an `ends: true` hotspot is used.
- `once` defaults to true for Take/Use/Open and for `ends`, false otherwise.
- `when` hides a hotspot until its condition is true.
- Make sure every required hotspot is reachable on foot from Wren's start.
  Walking can climb 1 block at a time, can't drop more than 3, and can't cross
  water or lava. Leave a clear path at least 2 blocks wide.
- Keep 2–4 required hotspots and a few optional ones with flavor and
  character moments.

## Crafting

```ts
{ craft: { title: 'Bubble Helm', recipe: ['GGG', 'G.G', 'WSW'], key: { G: 'glass', W: 'wool', S: 'sparkwire' }, extras: ['stone'], result: 'helm', hint: 'Glass all around, wool to seal the bottom, sparkwire to pump air.' } }
```

The player places items to match the shape. It can sit anywhere in the 3×3
grid. A hint button reveals it. The result is added to the inventory
automatically.

## Building sets

```ts
export const glimmerwood: SetDef = {
  id: 'glimmerwood', size: [96, 48, 96], sky: 'night',
  cams: { wide: { pos: [...], look: [...] }, camp: {...} },   // 'wide' is required
  lights: [{ at: [x, y, z], color: '#ffb060', intensity: 4, dist: 8 }], // a few point lights for characters
  build(w, flags) { /* use kit helpers and w.put(x, y, z, 'block') */ },
};
```

- Keep sets at or under about 112 × 64 × 112.
- Use the kit: `terrain`, `fill`, `hollow`, `house`, `tree`, `forest`, `scatter`,
  `path`, `pond`, `carve`, `island`, `sphere`, `cylinder`, `stall`, `fence`,
  `lampPost`, `edgeBarrier`, `topY`.
- Light-emitting blocks (lantern, glowblock, torch, lava, crystals, leaves_glow,
  flower_glow, sparkwire, ore_spark) light up the voxels around them. That
  matters a lot in `night`, `cave` and `underwater` skies.
- Export a constants object with key coordinates (like `KB` in
  `kettlebrook.ts`) and use it in the script, so the script and map stay in sync.
- Wrap the playable area with `edgeBarrier` so players can't walk off.

## Testing

```bash
npx tsc --noEmit                       # types
npx vite-node scripts/validate.ts      # static script checks
npx vite --port 5174 &                 # dev server
node scripts/autoplay.mjs http://localhost:5174/ ep2 1,2,3,4   # random playthroughs (choices + some QTE failures)
node scripts/shot.mjs "http://localhost:5174/?ep=ep2&scene=camp" shots/camp.png 7000   # screenshot after 7s
```

`?ep=ep2&scene=camp` jumps straight to a scene in the browser. Shots can take
an actions list too, e.g.
`'[{"click":[640,300],"wait":800,"shot":"shots/a.png"}]'`. Clicking advances
dialogue.
