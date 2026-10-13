# Blockbound: The Fraying

An original, four-episode, choice-driven adventure set in a blocky voxel world.
It runs in the browser and is built with TypeScript and three.js.

The Beacon above the village of Kettlebrook has always shone. On the day of the
Lantern Fair it goes dark. Glowing seams crack open the sky, the edges of the
world start to fray away, and Wren, a young builder, has a strange crystal their
dog just dug up.

## What's in it

- **Four episodes**: *The Lantern Fair*, *The Sunken Archive*, *Iron Hollow* and *The Drawing Tower*.
- **Choices that stick.** Timed dialogue choices, relationships ("Juno will
  remember that."), and major decisions that carry across episodes. The big one
  at the end of Episode 1 decides which friend travels with you and which one is
  taken. Each episode ends with a summary of your choices.
- **Exploration**: walk the sets, talk to people, pick things up.
- **Action**: quick-time sequences (press, dodge, mash, combos). Failing one
  rewinds to the start of the sequence.
- **Crafting**: 3×3 recipe puzzles.
- **Two endings.**

Everything is original and generated in code: story and characters, the pixel
textures (painted procedurally on a canvas), the box-model characters and their
faces, the voxel sets, the music (a small generative WebAudio sequencer) and the
sound effects. There are no external art or audio assets.

## Play

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # static build in dist/
```

Controls:

| | Keyboard / mouse | Touch |
|---|---|---|
| Advance dialogue | Click, Space, Enter | Tap |
| Choose | Click or 1–4 | Tap |
| Walk | WASD / arrows (Shift to run), or click the ground | Tap the ground |
| Interact | E, or click the label | Tap the label |
| Turn camera | Q / C | – |
| Action prompts | E / Space and the arrow keys shown | Tap the on-screen button |
| Pause | Esc or the ❚❚ button | ❚❚ button |

Settings include text speed, timed choices on/off, an action-assist mode
(slower, more forgiving quick-time events) and volume.

## Project layout

```
src/
  core/        script runner, exploration, game state & saves, script types
  render/      voxel world + shader, block textures, character models, stage (camera, sky, fx)
  ui/          HUD (dialogue, choices, QTEs, labels), crafting, menus
  audio/       procedural music and sfx
  content/     cast, items, sets (voxel maps), episodes (scripts)
docs/
  STORY.md     story bible: characters, arc, cross-episode flags
  AUTHORING.md how to write scenes, sets and episodes
scripts/
  validate.ts  static checks for all episode scripts
  autoplay.mjs plays episodes in headless Chromium with random choices
  shot.mjs     screenshot helper
```

## Testing

```bash
npx tsc --noEmit
npx vite-node scripts/validate.ts
npx vite --port 5173 &
node scripts/autoplay.mjs http://localhost:5173/ all 1,2,3
```

`autoplay.mjs` plays the whole season with random choices, and deliberately
fails some quick-time events to exercise the retry path. It reports any script
error. For development, `?ep=ep2&scene=camp` in the URL jumps straight to a
scene.
