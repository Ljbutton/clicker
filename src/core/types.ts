// Script format for episodes. Episodes are plain data (with optional
// condition functions) interpreted by core/runner.ts.

export type Vec2 = [number, number];
export type Vec3 = [number, number, number];

export type Mood =
  | 'neutral' | 'happy' | 'sad' | 'angry' | 'worried' | 'surprised' | 'smug' | 'determined' | 'hurt';

export type AnimName =
  | 'idle' | 'wave' | 'nod' | 'shake' | 'shrug' | 'point' | 'cheer' | 'swing' | 'dodge' | 'hit'
  | 'fall' | 'crouch' | 'stand' | 'jump' | 'think' | 'facepalm' | 'bark' | 'cast' | 'hug' | 'reach'
  | 'dig' | 'build' | 'scared' | 'sit' | 'roar' | 'spin';

/** Condition shorthand: 'flag', '!flag', 'flag=value', 'flag!=value', 'rel.juno>=2',
 *  'seen.hotspotId', 'item.shard'. Combine with '&&' / '||'. Or a function. */
export type Cond = string | ((s: import('./state').GameState) => boolean);

/** Camera shot. Strings: 'wide' or any named cam on the set. */
export type ShotSpec =
  | string
  | { close: string; side?: number; dist?: number; height?: number }
  | { two: [string, string]; side?: number; dist?: number }
  | { ots: [string, string]; side?: number } // over the shoulder of [0], looking at [1]
  | { pos: Vec3; look: Vec3 }
  | { orbit: string; dist?: number; height?: number; speed?: number }
  | { follow: string; dist?: number; height?: number };

export interface Option {
  text: string;
  steps?: Step[];
  /** Shown as e.g. "Juno will remember that." */
  remember?: string;
  rel?: Record<string, number>;
  set?: Record<string, FlagVal>;
  /** Only offered when true. */
  when?: Cond;
  /** Label for the episode summary when this choice is `major`. */
  label?: string;
  /** This option is what happens when the timer runs out. If none, the
   *  runner adds a silent "..." option. */
  timeout?: boolean;
}

export type FlagVal = string | number | boolean;

export interface QteSpec {
  /** press: hit one key. dir: hit a direction. mash: hit action repeatedly.
   *  seq: a sequence of directions/keys. */
  kind: 'press' | 'dir' | 'mash' | 'seq';
  key?: QteKey;
  keys?: QteKey[];
  /** seconds allowed (per key for seq) */
  time?: number;
  /** presses needed for mash */
  count?: number;
  text?: string;
  /** Shown during the QTE; screen position follows the actor */
  on?: string;
  /** Steps on success */
  ok?: Step[];
  /** Steps on failure. If omitted the failure is lethal and the enclosing
   *  `action` block restarts. */
  fail?: Step[];
}
export type QteKey = 'action' | 'up' | 'down' | 'left' | 'right';

export interface Hotspot {
  id: string;
  /** World position, or attach to an actor id. */
  at?: Vec3;
  actor?: string;
  label: string;
  verb?: 'Look' | 'Talk' | 'Use' | 'Take' | 'Go' | 'Pet' | 'Open' | 'Climb';
  steps: Step[];
  /** Can only be used once (default true for Take/Use, false for Talk/Look) */
  once?: boolean;
  required?: boolean;
  when?: Cond;
  /** Finishing this hotspot ends the explore section */
  ends?: boolean;
  radius?: number;
}

export interface ExploreSpec {
  objective: string;
  hotspots: Hotspot[];
  /** Explore ends once this is true (checked after each hotspot) */
  until?: Cond;
  player?: string;
  /** Walkable bounds [x0, z0, x1, z1] */
  bounds?: [number, number, number, number];
  /** Follow-camera distance/height */
  cam?: { dist?: number; height?: number; yaw?: number };
}

export interface CraftSpec {
  title: string;
  /** 3 rows of 3 characters; '.' is empty */
  recipe: [string, string, string];
  /** Map recipe chars to item ids */
  key: Record<string, string>;
  /** Extra items placed in the inventory that aren't part of the recipe */
  extras?: string[];
  result: string;
  hint: string;
}

export type Step =
  | { say: string; text: string; mood?: Mood; shot?: ShotSpec; anim?: AnimName; to?: string }
  | { narrate: string }
  | { think: string }
  | { choice: Option[]; timer?: number; prompt?: string; major?: { id: string; title: string }; shot?: ShotSpec }
  | { if: Cond; then: Step[]; else?: Step[] }
  | { label: string }
  | { goto: string }
  | { set: Record<string, FlagVal> }
  | { rel: Record<string, number> }
  | { remember: string }
  | { shot: ShotSpec; dur?: number }
  | { move: string; to: Vec2; speed?: number; run?: boolean; wait?: boolean }
  | { place: string; at: Vec2 | Vec3; face?: number | string }
  | { face: string; to: string | number }
  | { anim: string; name: AnimName; wait?: boolean }
  | { mood: string; is: Mood }
  | { show: string; at?: Vec2 | Vec3; face?: number | string }
  | { hide: string }
  | { spawn: string; kind: string; at: Vec2 | Vec3; face?: number | string }
  | { wait: number }
  | { sfx: string }
  | { music: string }
  | { fx: FxName; at?: Vec3 | string; radius?: number; dur?: number; color?: string }
  | { fill: { from: Vec3; to: Vec3; block: string } }
  | { blocks: Array<[number, number, number, string]> }
  | { fray: { from: Vec3; to: Vec3; dur?: number } }
  | { sky: SkyName }
  | { qte: QteSpec }
  | { action: Step[] }
  | { explore: ExploreSpec }
  | { craft: CraftSpec }
  | { title: string; sub?: string }
  | { scene: string }
  | { end: true }
  | { give: string }
  | { take: string }
  | { parallel: Step[] }
  | { fade: 'in' | 'out'; dur?: number }
  | { carry: string; item: string | null }
  | { hold: string; item: string | null };

export type FxName =
  | 'shake' | 'flash' | 'embers' | 'motes' | 'splash' | 'dust' | 'sparks' | 'poof' | 'seams'
  | 'glow' | 'beam' | 'beamoff' | 'bubbles' | 'rain' | 'stoprain' | 'confetti';

export type SkyName = 'day' | 'morning' | 'dusk' | 'night' | 'cave' | 'underwater' | 'void' | 'storm' | 'dawn';

export interface CastEntry {
  at: Vec2 | Vec3;
  face?: number | string;
  hidden?: boolean;
  item?: string;
}

export interface Scene {
  id: string;
  title?: string;
  set: string;
  sky?: SkyName;
  music?: string;
  cast: Record<string, CastEntry>;
  steps: Step[];
}

export interface Episode {
  id: string;
  number: number;
  title: string;
  blurb: string;
  /** First scene id */
  start: string;
  scenes: Scene[];
}

export interface CharDef {
  id: string;
  name: string;
  kind: 'human' | 'dog' | 'gloam' | 'giant' | 'villager';
  look: Look;
  /** Speaking voice pitch for text blips */
  voice?: number;
  scale?: number;
}

export interface Look {
  skin: string;
  hair: string;
  hairStyle: 'short' | 'long' | 'bun' | 'bald' | 'spiky' | 'hood' | 'cap' | 'tophat' | 'braid' | 'curly' | 'none';
  eyes?: string;
  shirt: string;
  shirt2?: string;
  pants: string;
  shoes: string;
  extras?: Array<'goggles' | 'scarf' | 'apron' | 'cape' | 'glasses' | 'beard' | 'mask' | 'backpack' | 'bandana' | 'belt' | 'freckles' | 'blush' | 'eyepatch' | 'robe'>;
  accent?: string;
}
