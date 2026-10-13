// Sets for Episode 4: The Drawing Tower.
//   edge    – the frayed world's edge: crumbling islands over the void, Lowmere's last stones
//   tower   – Seren's Drawing Tower: two draft floors and the sanctum on top
//   brokentop – the sanctum torn open over the void, where the Unmaker stands
import { fbm, mulberry32 } from '../../core/rng';
import type { SetDef } from '../../render/stage';
import { cylinder, fill, house, lampPost, type W } from '../kit';

// ---------------------------------------------------------------------------
// shared helpers

/** A ragged floating island whose rim is coming apart into the Fray. */
function shardIsland(w: W, cx: number, top: number, cz: number, rx: number, rz: number, depth: number, seed: number, fray = 0.5, surface = 'grass') {
  const r = mulberry32(seed);
  for (let z = Math.floor(cz - rz - 2); z <= cz + rz + 2; z++) for (let x = Math.floor(cx - rx - 2); x <= cx + rx + 2; x++) {
    const d = Math.hypot((x - cx) / rx, (z - cz) / rz);
    const n = fbm(x / 5, z / 5, seed);
    const lim = 0.8 + n * 0.4;
    if (d > lim) continue;
    const t = d / lim;
    const down = Math.max(1, Math.round((1 - t * t) * depth * (0.7 + n * 0.6)) + 1);
    for (let k = 0; k < down; k++) {
      const y = top - k;
      let b: string;
      if (k === 0) {
        const q = r();
        if (t > 0.8) b = q < fray ? 'frayed' : q < fray + 0.25 ? 'voidstone' : surface;
        else if (t > 0.6) b = q < fray * 0.35 ? 'frayed' : surface;
        else b = surface;
      } else if (k < 3) b = 'dirt';
      else b = k > down - 3 ? 'voidstone' : r() < 0.12 ? 'frayed' : 'stone';
      w.put(x, y, z, b);
    }
    // loose blocks hanging under the rim
    if (t > 0.7 && r() < 0.18) w.put(x, top - down - 1 - Math.floor(r() * 3), z, r() < 0.5 ? 'frayed' : 'voidstone');
  }
}

/** Little cubes of world drifting in the void. */
function debris(w: W, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, n: number, seed: number, avoid?: (x: number, y: number, z: number) => boolean) {
  const r = mulberry32(seed);
  const kinds = ['frayed', 'frayed', 'voidstone', 'stone', 'dirt', 'grass', 'planks', 'cobble'];
  for (let i = 0; i < n; i++) {
    const x = x0 + Math.floor(r() * (x1 - x0)), y = y0 + Math.floor(r() * (y1 - y0)), z = z0 + Math.floor(r() * (z1 - z0));
    if (avoid?.(x, y, z)) continue;
    const b = kinds[Math.floor(r() * kinds.length)];
    const s = r() < 0.25 ? 2 : 1;
    for (let dy = 0; dy < s; dy++) for (let dz = 0; dz < s; dz++) for (let dx = 0; dx < s; dx++) if (!w.get(x + dx, y + dy, z + dz)) w.put(x + dx, y + dy, z + dz, dy === s - 1 && b === 'dirt' ? 'grass' : b);
  }
}

/** Partially wreck a region: some blocks go to air, some to frayed. */
function wreck(w: W, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, seed: number, amount = 0.35) {
  for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
    if (!w.get(x, y, z)) continue;
    const n = fbm(x / 3, (z + y * 3) / 3, seed) + (y - y0) / Math.max(1, y1 - y0) * 0.25;
    if (n > 1 - amount) w.put(x, y, z, 'air');
    else if (n > 0.95 - amount) w.put(x, y, z, 'frayed');
  }
}

/** A plank bridge along x at deck height y, z from zc-1..zc+1. */
function bridge(w: W, xa: number, xb: number, y: number, zc: number, lamps = true) {
  for (let x = xa; x <= xb; x++) {
    fill(w, x, y, zc - 1, x, y, zc + 1, x % 4 === 0 ? 'planks_dark' : 'planks');
    if ((x - xa) % 3 === 0) { w.put(x, y + 1, zc - 2, 'log'); w.put(x, y + 1, zc + 2, 'log'); w.put(x, y, zc - 2, 'planks_dark'); w.put(x, y, zc + 2, 'planks_dark'); }
    if (x % 2 === 0) w.put(x, y - 1, zc, 'planks_dark');
  }
  if (lamps) { w.put(xa, y + 2, zc - 2, 'lantern'); w.put(xb, y + 2, zc + 2, 'lantern'); }
}

// ---------------------------------------------------------------------------
// THE EDGE

/** Island tops are y = 30 (stand at 31). Bridges run along z = 48..50. */
export const ED = {
  camp: [17, 52] as [number, number],
  startIsland: [22, 50] as [number, number],
  lowmere: [24, 20] as [number, number],
  bridgeGap: [38, 43] as [number, number], // x range of the broken span
  mid: [52, 49] as [number, number],
  third: [64, 49] as [number, number],
  tower: [84, 49] as [number, number],
  door: [77.5, 49.5] as [number, number],
};

export const edge: SetDef = {
  id: 'edge',
  size: [100, 64, 96],
  sky: 'void',
  voidBelow: true,
  cams: {
    wide: { pos: [4, 41, 72], look: [46, 31, 44] },
    arrive: { pos: [11, 34.5, 61], look: [24, 32, 47] },
    tower: { pos: [27, 33.5, 55], look: [84, 44, 49] },
    lowmere: { pos: [33, 36, 31], look: [23, 31, 19] },
    lowmereClose: { pos: [27, 33, 27], look: [22, 32, 20] },
    bridge: { pos: [38, 35, 59], look: [40, 30.5, 49] },
    crossing: { pos: [56, 38, 64], look: [58, 31, 49] },
    mid: { pos: [46, 34, 58], look: [53, 31.5, 48] },
    gap: { pos: [62, 33, 58], look: [69, 30.5, 49] },
    door: { pos: [66, 35, 60], look: [79, 35, 49] },
    towerUp: { pos: [66, 31.8, 57], look: [84, 50, 49] },
    void: { pos: [36, 33, 64], look: [40, 14, 40] },
  },
  lights: [
    { at: [17.5, 32.5, 52.5], color: '#ffb060', intensity: 5, dist: 10 },
    { at: [24.5, 33, 21.5], color: '#ff9a6a', intensity: 3, dist: 9 },
    { at: [52.5, 34, 49.5], color: '#ffc890', intensity: 5, dist: 12 },
    { at: [64.5, 33.5, 49.5], color: '#c79bff', intensity: 4, dist: 9 },
    { at: [75.5, 34, 49.5], color: '#ffd0a0', intensity: 5, dist: 10 },
    { at: [37.5, 33.5, 52.5], color: '#ffc080', intensity: 3, dist: 9 },
  ],
  build(w) {
    // --- Lastreach: the last solid ground before the edge
    shardIsland(w, 22, 30, 50, 14, 12, 13, 11, 0.45);
    // --- Lowmere's last island, to the north
    shardIsland(w, 24, 30, 20, 10, 8, 9, 23, 0.6);
    // crumbling causeway between them
    for (let z = 27; z <= 39; z++) for (let x = 23; x <= 25; x++) {
      if (fbm(x / 2, z / 2, 5) > 0.62) continue;
      w.put(x, 30, z, z % 3 === 0 ? 'mossy' : 'cobble');
      w.put(x, 29, z, 'stone');
    }
    // --- the middle islands and the tower island
    shardIsland(w, 52, 30, 49, 7, 7, 9, 31, 0.55);
    shardIsland(w, 64, 30, 49, 4, 4, 6, 37, 0.7, 'voidstone');
    shardIsland(w, 84, 30, 49, 12, 12, 18, 41, 0.35, 'voidstone');
    // flatten the bridge landings so the walk is level
    for (const [xa, xb] of [[30, 36], [44, 47], [57, 59], [61, 62], [67, 68], [72, 75]] as const) fill(w, xa, 30, 48, xb, 30, 50, 'stone');
    fill(w, 30, 31, 48, 36, 33, 50, 'air');

    // --- bridges (z = 48..50). The first one is broken in the middle.
    bridge(w, 35, 46, 30, 49);
    fill(w, 38, 29, 47, 43, 31, 51, 'air');
    // ragged ends of the break
    w.put(37, 30, 48, 'frayed'); w.put(44, 30, 50, 'frayed'); w.put(37, 30, 50, 'air'); w.put(44, 30, 48, 'air');
    bridge(w, 58, 61, 30, 49, false);
    bridge(w, 67, 73, 30, 49);

    // --- camp on Lastreach
    // tent
    for (let i = 0; i < 3; i++) {
      fill(w, 11 + i, 31 + i, 53, 11 + i, 31 + i, 57, 'wool_teal');
      fill(w, 17 - i, 31 + i, 53, 17 - i, 31 + i, 57, 'wool_teal');
    }
    fill(w, 14, 34, 53, 14, 34, 57, 'wool_white');
    fill(w, 12, 31, 53, 16, 31, 53, 'air');
    w.put(14, 31, 56, 'wool_red');
    // campfire
    for (const [x, z] of [[18, 49], [20, 49], [18, 51], [20, 51], [19, 48], [19, 52], [17, 50], [21, 50]]) w.put(x, 31, z, 'cobble');
    w.put(19, 31, 50, 'torch');
    w.put(18, 31, 50, 'log'); w.put(20, 31, 50, 'log');
    // Ostin's pack and tools
    w.put(14, 31, 47, 'crate'); w.put(15, 31, 47, 'crate'); w.put(14, 32, 47, 'pipe'); w.put(13, 31, 46, 'copper'); w.put(16, 31, 46, 'iron');
    fill(w, 15, 31, 45, 18, 31, 45, 'sparkwire');
    lampPost(w, 21, 31, 45, 2);
    lampPost(w, 29, 31, 52, 2);
    // signpost toward Lowmere
    fill(w, 22, 31, 38, 22, 33, 38, 'log');
    fill(w, 21, 33, 38, 23, 33, 38, 'planks');
    w.put(21, 34, 38, 'banner_red');
    // crystal vein: the Fray squeezes old crystal out of the ground here
    for (const [x, y, z, b] of [
      [27, 31, 57, 'voidstone'], [28, 31, 57, 'voidstone'], [28, 31, 58, 'voidstone'], [27, 31, 58, 'gale'], [28, 32, 57, 'gale'],
      [29, 31, 57, 'tide'], [28, 33, 57, 'gale'], [26, 31, 58, 'voidstone'], [29, 31, 58, 'voidstone'], [28, 32, 58, 'voidstone'], [27, 32, 58, 'tide'],
    ] as const) w.put(x, y, z, b);
    // a dead tree and dying grass
    fill(w, 9, 31, 45, 9, 35, 45, 'log'); w.put(10, 35, 45, 'log'); w.put(8, 34, 45, 'log'); w.put(9, 36, 45, 'leaves_autumn'); w.put(10, 36, 45, 'leaves_autumn');
    const rr = mulberry32(5);
    for (let z = 38; z <= 62; z++) for (let x = 8; x <= 36; x++) {
      if (w.name(x, 30, z) !== 'grass' || w.get(x, 31, z)) continue;
      const q = rr();
      if (q < 0.08) w.put(x, 31, z, 'tallgrass');
      else if (q < 0.1) w.put(x, 31, z, 'flower_glow');
    }

    // --- Lowmere's last houses
    house(w, 18, 31, 15, 7, 6, 4, { wall: 'planks', roof: 'roof_red', door: 's', interior: false });
    wreck(w, 17, 31, 14, 25, 38, 21, 3, 0.32);
    house(w, 27, 31, 17, 6, 6, 4, { wall: 'planks_pale', roof: 'roof_blue', door: 'w', interior: false });
    wreck(w, 26, 31, 16, 34, 38, 23, 7, 0.4);
    fill(w, 31, 31, 14, 34, 40, 25, 'air');
    // the well
    for (const [x, z] of [[22, 24], [23, 24], [24, 24], [22, 25], [24, 25], [22, 26], [23, 26], [24, 26]]) w.put(x, 31, z, 'cobble');
    w.put(23, 31, 25, 'water');
    w.put(22, 32, 24, 'planks_dark'); w.put(24, 32, 26, 'planks_dark');
    // a lamp post that still burns
    lampPost(w, 26, 31, 24, 2);
    // the red door, standing on its own
    fill(w, 21, 31, 20, 21, 32, 20, 'banner_red');
    // little paths
    for (const [x, z] of [[23, 27], [23, 28], [22, 23], [21, 22], [25, 23], [26, 22]]) if (w.name(x, 30, z) === 'grass') w.put(x, 30, z, 'path');

    // --- the middle island: an old waystone circle, half eaten
    for (let a = 0; a < 8; a++) {
      const x = Math.round(52 + Math.cos((a / 8) * Math.PI * 2) * 4), z = Math.round(49 + Math.sin((a / 8) * Math.PI * 2) * 4);
      if (a === 0 || a === 4) continue; // keep the path along z = 49 open
      fill(w, x, 31, z, x, 31 + (a % 3) + 1, z, a % 2 ? 'mossy' : 'stone');
    }
    w.put(52, 31, 45, 'voidstone'); w.put(52, 32, 45, 'gale');
    lampPost(w, 48, 31, 46, 2); lampPost(w, 56, 31, 53, 2); lampPost(w, 64, 31, 46, 2);
    // --- the tower in the distance
    const tx = 84, tz = 49;
    cylinder(w, tx, 31, tz, 6, 26, 'obsid', true);
    cylinder(w, tx, 31, tz, 5, 1, 'marble_tile');
    for (const y of [36, 43, 50]) cylinder(w, tx, y, tz, 6, 1, 'marble', true);
    for (let y = 33; y < 57; y += 7) for (let a = 0; a < 6; a++) {
      const ang = (a / 6) * Math.PI * 2 + y * 0.3;
      const x = Math.round(tx + Math.cos(ang) * 6), z = Math.round(tz + Math.sin(ang) * 6);
      w.put(x, y, z, 'glowblock'); w.put(x, y + 1, z, 'glowblock');
    }
    // crown and spire
    cylinder(w, tx, 57, tz, 7, 1, 'marble', true);
    for (let a = 0; a < 8; a++) {
      const x = Math.round(tx + Math.cos((a / 8) * Math.PI * 2) * 7), z = Math.round(tz + Math.sin((a / 8) * Math.PI * 2) * 7);
      fill(w, x, 58, z, x, 59, z, 'obsid');
    }
    cylinder(w, tx, 57, tz, 3, 3, 'obsid');
    cylinder(w, tx, 60, tz, 1, 2, 'obsid');
    w.put(tx, 62, tz, 'gale'); w.put(tx, 63, tz, 'gale');
    // door on the west face, with an arch
    fill(w, 78, 31, 48, 78, 33, 50, 'obsid');
    fill(w, 79, 31, 48, 79, 33, 50, 'air');
    w.put(78, 32, 49, 'gale');
    fill(w, 78, 34, 47, 78, 34, 51, 'marble');
    fill(w, 77, 31, 47, 77, 34, 47, 'marble'); fill(w, 77, 31, 51, 77, 34, 51, 'marble');
    w.put(77, 35, 49, 'gale');
    w.put(76, 31, 46, 'lantern'); w.put(76, 31, 52, 'lantern');
    // glowing seam lines on the tower island floor leading to the door
    for (let x = 74; x <= 77; x++) w.put(x, 31, 49, 'sparkwire');

    // --- debris drifting everywhere
    const isl = (x: number, y: number, z: number) =>
      Math.hypot(x - 22, z - 50) < 17 || Math.hypot(x - 24, z - 20) < 13 || Math.hypot(x - 84, z - 49) < 15 || Math.hypot(x - 52, z - 49) < 10 || (y > 26 && y < 36 && z > 44 && z < 54);
    debris(w, 2, 8, 2, 98, 60, 94, 260, 99, isl);
  },
};

// ---------------------------------------------------------------------------
// THE DRAWING TOWER (interior)

/** Floor 1 stands at y = 11, floor 2 at y = 27, the sanctum at y = 43. Center (32, 32). */
export const TW = {
  c: 32,
  door: [17.5, 32.5] as [number, number],
  lowmereDraft: [32, 21] as [number, number],
  kbDraft: [32, 43] as [number, number],
  lock: [45, 32] as [number, number],
  lift: [42, 32] as [number, number],
  stairFoot: [19, 32] as [number, number],
  table: [41, 32] as [number, number],
};

export const tower: SetDef = {
  id: 'tower',
  size: [64, 64, 64],
  sky: 'void',
  voidBelow: true,
  cams: {
    wide: { pos: [20, 20, 41], look: [36, 13, 29] },
    hall: { pos: [19, 13.5, 32.5], look: [40, 14, 32] },
    up: { pos: [24, 12.5, 37], look: [32, 30, 30] },
    great: { pos: [36, 15.5, 38], look: [32, 12, 31.5] },
    lowmere: { pos: [32.5, 15, 27], look: [32, 12, 20.5] },
    kb: { pos: [32.5, 15, 37.5], look: [32, 12, 43.5] },
    lock: { pos: [44.5, 15, 37.2], look: [47, 14.5, 32] },
    lift: { pos: [36, 14, 37], look: [42, 13, 32] },
    f2: { pos: [42, 31.5, 41], look: [28, 27.5, 30] },
    f2low: { pos: [38.5, 29, 44.2], look: [27, 28, 37] },
    sentry: { pos: [33, 31, 44.8], look: [26, 27.5, 39] },
    alcove: { pos: [30, 30.5, 38], look: [21, 28, 33] },
    stair: { pos: [27, 31, 44], look: [20.5, 33, 34] },
    sanctum: { pos: [20.5, 47, 40], look: [38, 44, 31] },
    serenView: { pos: [27, 45, 32.5], look: [44, 44.5, 32.5] },
    map: { pos: [32.5, 52, 39], look: [32.5, 42, 31] },
    anchors: { pos: [32.5, 47, 20], look: [32.5, 43, 34] },
    rise: { pos: [22.5, 44.5, 41], look: [32, 48.5, 31] },
  },
  lights: [
    { at: [32.5, 15, 32.5], color: '#c79bff', intensity: 4, dist: 12 },
    { at: [32.5, 14, 21.5], color: '#ffc080', intensity: 3, dist: 8 },
    { at: [32.5, 14, 43.5], color: '#ffc080', intensity: 3, dist: 8 },
    { at: [42.5, 14, 32.5], color: '#ffd080', intensity: 3, dist: 8 },
    { at: [24.5, 30, 34.5], color: '#ffb060', intensity: 4, dist: 9 },
    { at: [40.5, 30, 40.5], color: '#c79bff', intensity: 3, dist: 9 },
    { at: [40.5, 47, 32.5], color: '#c79bff', intensity: 5, dist: 12 },
    { at: [42.5, 45.6, 32.5], color: '#ffd8b0', intensity: 4, dist: 6 },
    { at: [26.5, 46, 32.5], color: '#ffd8a0', intensity: 4, dist: 11 },
    { at: [24.5, 14.5, 32.5], color: '#ffc890', intensity: 3, dist: 10 },
  ],
  build(w) {
    const C = 32;
    const inR = (x: number, z: number, r: number) => Math.hypot(x - C, z - C) <= r + 0.5;
    // foundation and floors
    cylinder(w, C, 0, C, 16, 11, 'stone');
    for (let z = 16; z <= 48; z++) for (let x = 16; x <= 48; x++) {
      if (!inR(x, z, 15)) continue;
      const d = Math.hypot(x - C, z - C);
      w.put(x, 10, z, d > 13.5 ? 'marble_tile' : (Math.floor(d) % 4 === 0 ? 'planks' : 'planks_dark'));
    }
    // outer wall, tall
    cylinder(w, C, 11, C, 16, 47, 'obsid', true);
    for (const y of [25, 26, 41, 42]) cylinder(w, C, y, C, 16, 1, 'marble', true);
    // floor 2: a ring around an open well; sanctum floor: solid
    for (let z = 16; z <= 48; z++) for (let x = 16; x <= 48; x++) {
      const d = Math.hypot(x - C, z - C);
      if (d > 15.5) continue;
      if (d > 6.5) w.put(x, 26, z, Math.floor(d) % 3 === 0 ? 'planks' : 'planks_dark');
      w.put(x, 42, z, 'paper');
    }
    // railing around the well on floor 2
    for (let a = 0; a < 48; a++) {
      const x = Math.round(C + Math.cos((a / 48) * Math.PI * 2) * 7), z = Math.round(C + Math.sin((a / 48) * Math.PI * 2) * 7);
      w.put(x, 27, z, a % 4 === 0 ? 'marble' : 'iron');
      if (a % 8 === 0) { w.put(x, 28, z, 'marble'); w.put(x, 29, z, 'lantern'); }
    }
    // windows in the outer wall (all floors)
    for (let a = 0; a < 12; a++) {
      const ang = (a / 12) * Math.PI * 2 + 0.13;
      const x = Math.round(C + Math.cos(ang) * 16), z = Math.round(C + Math.sin(ang) * 16);
      fill(w, x, 13, z, x, 17, z, 'glass');
      fill(w, x, 29, z, x, 33, z, 'glass');
      fill(w, x, 45, z, x, 52, z, 'glass');
    }
    // door on the west
    fill(w, 16, 11, 31, 17, 13, 33, 'air');
    fill(w, 16, 14, 30, 16, 14, 34, 'marble');

    // wall lanterns on both draft floors
    for (let a = 0; a < 12; a++) {
      const ang = (a / 12) * Math.PI * 2 + 0.39;
      const x = Math.round(C + Math.cos(ang) * 15), z = Math.round(C + Math.sin(ang) * 15);
      if (!w.get(x, 15, z)) w.put(x, 15, z, 'lantern');
      if (!w.get(x, 31, z)) w.put(x, 31, z, 'lantern');
    }
    // ---------- floor 1: the First Draft ----------
    // bookshelves around the wall, broken by windows and the door
    for (let a = 0; a < 96; a++) {
      const ang = (a / 96) * Math.PI * 2;
      const x = Math.round(C + Math.cos(ang) * 15), z = Math.round(C + Math.sin(ang) * 15);
      if (x <= 18 && z >= 29 && z <= 35) continue;
      if (x >= 45 && z >= 28 && z <= 36) continue;
      if (!w.get(x, 11, z)) { w.put(x, 11, z, 'bookshelf'); w.put(x, 12, z, a % 5 === 0 ? 'map' : 'bookshelf'); }
    }
    // the Great Draft: a round dais with a miniature redrawn world on it
    cylinder(w, C, 11, C, 5, 1, 'marble_tile');
    cylinder(w, C, 11, C, 5, 1, 'gold', true);
    for (let z = C - 4; z <= C + 4; z++) for (let x = C - 4; x <= C + 4; x++) {
      const d = Math.hypot(x - C, z - C);
      if (d > 3.6) continue;
      const n = fbm(x / 2.5, z / 2.5, 17);
      w.put(x, 12, z, n > 0.62 ? 'water' : n < 0.3 ? 'sand' : 'grass');
      if (n > 0.45 && n < 0.55 && d > 1.5) w.put(x, 13, z, 'leaves');
    }
    fill(w, C, 12, C, C, 15, C, 'obsid'); w.put(C, 16, C, 'gale');
    for (const [x, z, b] of [[C - 3, C, 'ember'], [C + 3, C, 'tide'], [C, C - 3, 'root'], [C, C + 3, 'gale']] as const) w.put(x, 13, z, b);
    // sparkwire lines from the dais to every draft table
    for (let k = 6; k <= 9; k++) { w.put(C, 11, C - k, 'sparkwire'); w.put(C, 11, C + k, 'sparkwire'); }
    for (let k = 6; k <= 9; k++) w.put(C + k, 11, C, 'sparkwire');
    // Lowmere draft (north)
    fill(w, 26, 11, 19, 38, 11, 23, 'table');
    fill(w, 27, 12, 20, 37, 12, 22, 'grass');
    for (const [x, z, roof] of [[28, 20, 'roof_red'], [30, 22, 'roof_blue'], [33, 20, 'roof_red'], [35, 22, 'roof_green'], [36, 20, 'roof_red']] as const) { w.put(x, 13, z, 'planks'); w.put(x, 14, z, roof); }
    w.put(32, 13, 21, 'water'); w.put(31, 13, 21, 'cobble'); w.put(32, 13, 22, 'cobble');
    w.put(29, 13, 21, 'torch'); w.put(34, 13, 21, 'torch');
    for (const x of [27, 31, 37]) { w.put(x, 13, 22, 'log'); w.put(x, 14, 22, 'leaves'); }
    for (let x = 27; x <= 37; x++) if (!w.get(x, 13, 21)) w.put(x, 12, 21, 'path');
    w.put(26, 12, 19, 'paper'); w.put(38, 12, 23, 'paper');
    // Kettlebrook draft (south): a map with a hole where the village was
    fill(w, 26, 11, 41, 38, 11, 45, 'table');
    fill(w, 27, 12, 42, 37, 12, 44, 'grass');
    for (const [x, z] of [[28, 42], [28, 44], [36, 42], [36, 43]]) { w.put(x, 13, z, 'log'); w.put(x, 14, z, 'leaves'); }
    fill(w, 30, 12, 42, 34, 12, 44, 'air');
    for (const [x, z] of [[29, 42], [29, 43], [29, 44], [35, 42], [35, 44], [30, 41], [33, 41], [31, 45]]) w.put(x, 12, z, 'frayed');
    w.put(32, 11, 43, 'voidstone'); w.put(31, 11, 43, 'voidstone');
    // the tiny Beacon, knocked off the table and lying on the floor
    w.put(32, 11, 47, 'marble'); w.put(33, 11, 47, 'marble'); w.put(34, 11, 47, 'beacon_dead');
    // work tables and scattered drafts
    for (const [x, z] of [[22, 24], [23, 41], [41, 23], [41, 41]]) {
      fill(w, x, 11, z, x + 1, 11, z, 'table');
      w.put(x, 12, z, 'paper'); w.put(x + 1, 12, z, 'map');
    }
    w.put(24, 11, 25, 'crate'); w.put(40, 11, 42, 'crate'); w.put(40, 12, 42, 'paper');
    // the map wall and its drafting lock (east)
    fill(w, 47, 12, 28, 47, 18, 36, 'map');
    fill(w, 47, 13, 30, 47, 17, 34, 'paper');
    for (const [y, z] of [[13, 30], [14, 31], [15, 32], [16, 33], [17, 34], [17, 30], [13, 34], [15, 30], [15, 34]]) w.put(47, y, z, 'glowblock');
    fill(w, 46, 11, 31, 46, 12, 33, 'marble');
    w.put(46, 13, 32, 'keystone');
    // the lift: a gold platform with posts up to the floor above
    fill(w, 41, 10, 31, 43, 10, 33, 'gold');
    for (const [x, z] of [[40, 30], [44, 30], [40, 34], [44, 34]]) fill(w, x, 11, z, x, 25, z, 'iron');
    for (let y = 11; y <= 25; y += 2) { w.put(40, y, 32, 'sparkwire'); }
    fill(w, 41, 26, 31, 43, 26, 33, 'air');
    // hanging lanterns under the ring
    for (let a = 0; a < 8; a++) {
      const ang = (a / 8) * Math.PI * 2 + 0.4;
      const x = Math.round(C + Math.cos(ang) * 10), z = Math.round(C + Math.sin(ang) * 10);
      w.put(x, 25, z, 'iron'); w.put(x, 24, z, 'lantern');
    }

    // ---------- floor 2: the Second Draft ----------
    // garden patches of a drafted world, growing straight out of the floorboards
    const r2 = mulberry32(77);
    for (let z = 17; z <= 47; z++) for (let x = 17; x <= 47; x++) {
      const d = Math.hypot(x - C, z - C);
      if (d < 8.5 || d > 14.5) continue;
      const n = fbm(x / 4, z / 4, 29);
      if (n > 0.6) w.put(x, 26, z, n > 0.72 ? 'mossy' : 'grass');
      if (n > 0.6 && n < 0.68 && r2() < 0.25) w.put(x, 27, z, r2() < 0.5 ? 'flower_glow' : 'tallgrass');
    }
    // small glowing trees
    for (const [x, z] of [[42, 25], [45, 37], [36, 44]]) {
      fill(w, x, 27, z, x, 29, z, 'log');
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) w.put(x + dx, 30, z + dz, 'leaves_glow');
      w.put(x, 31, z, 'leaves_glow');
    }
    // drafting desks in the north arc
    for (const [x, z] of [[28, 19], [35, 19], [40, 21]]) {
      fill(w, x, 27, z, x + 1, 27, z, 'table');
      w.put(x, 28, z, 'paper'); w.put(x + 1, 28, z, 'wool_black');
    }
    // south arc: cover for sneaking (crates and stacked drafts)
    for (const [x, z, h] of [[38, 41, 2], [33, 44, 1], [29, 43, 2], [25, 40, 1]] as const) for (let k = 0; k < h; k++) { w.put(x, 27 + k, z, k ? 'paper' : 'crate'); w.put(x + 1, 27, z, 'crate'); }
    // the alcove by the stair (west): carpet, shelves, a lamp, a reading table
    fill(w, 19, 26, 33, 24, 26, 39, 'wool_purple');
    for (const z of [36, 37, 38]) { w.put(18, 27, z, 'bookshelf'); w.put(18, 28, z, 'bookshelf'); }
    w.put(24, 27, 39, 'crate'); w.put(24, 28, 39, 'lantern');
    w.put(22, 27, 39, 'table'); w.put(22, 28, 39, 'paper');
    // the stair to the sanctum: a spiral hugging the wall, from the west going north
    for (let k = 0; k <= 15; k++) for (let s2 = 0; s2 < 4; s2++) for (const rad of [13, 14]) {
      const th = Math.PI + (k + s2 / 4) * 0.068;
      const x = Math.round(C + Math.cos(th) * rad), z = Math.round(C + Math.sin(th) * rad);
      if (rad === 14) fill(w, x, 27, z, x, 27 + k, z, 'marble');
      else { w.put(x, 27 + k, z, 'marble_tile'); if (k > 0) w.put(x, 26 + k, z, 'marble'); }
    }
    // hanging lanterns under the sanctum floor
    for (let a = 0; a < 6; a++) {
      const ang = (a / 6) * Math.PI * 2;
      const x = Math.round(C + Math.cos(ang) * 11), z = Math.round(C + Math.sin(ang) * 11);
      w.put(x, 41, z, 'iron'); w.put(x, 40, z, 'lantern');
    }

    // ---------- the sanctum: the map of dying edges ----------
    // the land, drawn on the floor
    for (let z = 18; z <= 46; z++) for (let x = 18; x <= 46; x++) {
      const d = Math.hypot(x - C, z - C);
      if (d > 15.5) continue;
      const n = fbm(x / 6, z / 6, 51);
      const land = d + (n - 0.5) * 7 < 10.5;
      if (!land) { w.put(x, 42, z, 'voidstone'); continue; }
      w.put(x, 42, z, 'map');
      const rim = d + (n - 0.5) * 7 > 8.6;
      if (rim) w.put(x, 42, z, fbm(x / 2, z / 2, 9) > 0.5 ? 'frayed' : 'wool_purple');
    }
    // the hole where the spiral stair comes up
    for (let k = 9; k <= 14; k++) for (let s2 = 0; s2 < 4; s2++) for (const rad of [13, 14]) {
      const th = Math.PI + (k + s2 / 4) * 0.068;
      w.put(Math.round(C + Math.cos(th) * rad), 42, Math.round(C + Math.sin(th) * rad), 'air');
    }
    // markers: Kettlebrook and the Beacon near the middle, Lowmere lost at the rim
    w.put(31, 42, 33, 'gold'); w.put(32, 42, 32, 'beacon_dead');
    w.put(25, 42, 26, 'wool_red');
    // Anchor pedestals at the four diagonals
    for (const [x, z, b] of [[26, 26, 'ember'], [38, 26, 'tide'], [26, 38, 'root'], [38, 38, 'gale']] as const) {
      w.put(x, 43, z, 'marble'); w.put(x, 44, z, 'marble_tile'); w.put(x, 45, z, b);
    }
    // sparkwire threads from each Anchor to the drafting table
    for (let k = 0; k <= 12; k++) {
      const t = k / 12;
      for (const [ax, az] of [[26, 26], [38, 26], [26, 38], [38, 38]]) {
        const x = Math.round(ax + (41 - ax) * t), z = Math.round(az + (32 - az) * t);
        if (!w.get(x, 43, z)) w.put(x, 43, z, 'sparkwire');
      }
    }
    // the drafting table
    fill(w, 41, 43, 30, 41, 43, 34, 'table');
    w.put(41, 44, 31, 'map'); w.put(41, 44, 33, 'paper'); w.put(41, 44, 32, 'keystone');
    // walls of the sanctum: big windows, ribs, an open crown
    for (let a = 0; a < 16; a++) {
      const ang = (a / 16) * Math.PI * 2;
      const x = Math.round(C + Math.cos(ang) * 16), z = Math.round(C + Math.sin(ang) * 16);
      if (a % 2 || a === 0) { fill(w, x, 44, z, x, 52, z, 'air'); const x2 = Math.round(C + Math.cos(ang) * 15.6), z2 = Math.round(C + Math.sin(ang) * 15.6); fill(w, x2, 44, z2, x2, 52, z2, 'air'); }
      if (a % 2 === 0 && a !== 0) { const x2 = Math.round(C + Math.cos(ang) * 15), z2 = Math.round(C + Math.sin(ang) * 15); w.put(x2, 47, z2, 'lantern'); }
    }
    for (let a = 0; a < 32; a++) {
      const ang = (a / 32) * Math.PI * 2;
      if (a % 2 === 0) w.put(Math.round(C + Math.cos(ang) * 16), 54, Math.round(C + Math.sin(ang) * 16), 'glowblock');
    }
    for (let y = 55; y <= 59; y++) cylinder(w, C, y, C, 16 - (y - 55) * 2, 1, 'obsid', true);
    for (let y = 55; y <= 59; y++) cylinder(w, C, y, C, 15 - (y - 55) * 2, 1, 'air', true);
    cylinder(w, C, 54, C, 16, 1, 'marble', true);
    // banners behind the table
    w.put(47, 47, 30, 'banner_blue'); w.put(47, 47, 34, 'banner_blue');
  },
};

// ---------------------------------------------------------------------------
// THE BROKEN TOP: the sanctum torn open over the void

/** Floor top is y = 30 (stand at 31). Disc center (36, 36). The Unmaker stands at the north. */
export const BT = {
  c: [36, 36] as [number, number],
  unmaker: [36.5, 27.5] as [number, number],
  party: [36.5, 42.5] as [number, number],
  anchors: [[28, 28], [44, 28], [28, 44], [44, 44]] as Array<[number, number]>,
  east: [60, 36] as [number, number],
  south: [36, 60] as [number, number],
};

export const brokentop: SetDef = {
  id: 'brokentop',
  size: [80, 60, 80],
  sky: 'void',
  voidBelow: true,
  cams: {
    wide: { pos: [36.5, 39, 62], look: [36.5, 34, 30] },
    low: { pos: [37, 31.6, 47], look: [36.5, 37, 28] },
    high: { pos: [52, 46, 52], look: [36, 31, 34] },
    side: { pos: [58, 35, 38], look: [36, 33, 32] },
    east: { pos: [50, 35, 50], look: [60, 31, 37] },
    ledge: { pos: [54, 34, 46], look: [59, 31.5, 37] },
    south: { pos: [44, 35, 66], look: [36, 31, 56] },
    anchorsW: { pos: [20, 34, 52], look: [28, 32, 36] },
    anchorsE: { pos: [52, 34, 52], look: [44, 32, 36] },
    heart: { pos: [36.5, 34, 37], look: [36.5, 35, 27.5] },
    sky: { pos: [36, 32, 44], look: [36, 52, 20] },
  },
  lights: [
    { at: [36.5, 34, 30], color: '#d7b4ff', intensity: 6, dist: 14 },
    { at: [36.5, 37.5, 35], color: '#efe0ff', intensity: 6, dist: 12 },
    { at: [36.5, 38, 22], color: '#a26cff', intensity: 7, dist: 12 },
    { at: [28.5, 34, 28.5], color: '#ff8a3a', intensity: 3, dist: 8 },
    { at: [44.5, 34, 28.5], color: '#4a8cff', intensity: 3, dist: 8 },
    { at: [28.5, 34, 44.5], color: '#7ad04a', intensity: 3, dist: 8 },
    { at: [44.5, 34, 44.5], color: '#e6e9ff', intensity: 3, dist: 8 },
    { at: [36.5, 33, 46], color: '#ffd0a0', intensity: 3, dist: 10 },
  ],
  build(w) {
    const cx = 36, cz = 36;
    // the main disc: the sanctum floor, its map half burned away
    shardIsland(w, cx, 30, cz, 15, 15, 16, 61, 0.25, 'planks_dark');
    for (let z = 21; z <= 51; z++) for (let x = 21; x <= 51; x++) {
      const d = Math.hypot(x - cx, z - cz);
      if (d > 13 || w.name(x, 30, z) !== 'planks_dark') continue;
      const n = fbm(x / 4, z / 4, 3);
      if (n > 0.62) w.put(x, 30, z, 'map');
      else if (n < 0.28) w.put(x, 30, z, 'frayed');
      else if (n < 0.33) w.put(x, 30, z, 'wool_purple');
    }
    // wall stubs around the rim
    for (let a = 0; a < 64; a++) {
      const ang = (a / 64) * Math.PI * 2;
      const x = Math.round(cx + Math.cos(ang) * 15), z = Math.round(cz + Math.sin(ang) * 15);
      if (z > 44 && Math.abs(x - cx) < 8) continue; // open to the south (camera side)
      if (x > 46 && Math.abs(z - 36.5) < 3) continue; // gap for the east ledge
      const h = Math.max(0, Math.round((fbm(a / 6, 1, 13) - 0.35) * 16));
      for (let y = 31; y < 31 + h; y++) w.put(x, y, z, y === 38 ? 'marble' : (a % 4 === 0 && y > 33) ? 'glass' : 'obsid');
    }
    // the four Anchors on pillars, burning
    const anchors: Array<[number, number, string]> = [[28, 28, 'ember'], [44, 28, 'tide'], [28, 44, 'root'], [44, 44, 'gale']];
    for (const [x, z, b] of anchors) {
      fill(w, x, 31, z, x, 32, z, 'marble');
      w.put(x, 33, z, 'marble_tile');
      w.put(x, 34, z, b);
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) w.put(x + dx, 31, z + dz, 'frayed');
    }
    // sparkwire threads converging where the Unmaker stands
    for (let k = 1; k <= 9; k++) {
      const t = k / 10;
      for (const [ax, az] of [[28, 28], [44, 28], [28, 44], [44, 44]]) {
        const x = Math.round(ax + (36 - ax) * t), z = Math.round(az + (28 - az) * t);
        if (!w.get(x, 31, z)) w.put(x, 31, z, 'sparkwire');
      }
    }
    // shards of drafted crystal jutting from the north rim, behind the Unmaker
    for (const [x, z, h, b] of [[30, 23, 3, 'gale'], [33, 22, 5, 'tide'], [36, 21, 6, 'gale'], [39, 22, 4, 'ember'], [42, 23, 3, 'gale'], [27, 25, 2, 'root']] as const) {
      fill(w, x, 31, z, x, 30 + h, z, 'voidstone');
      w.put(x, 31 + h, z, b); w.put(x + 1, 30 + h, z, b);
    }
    // the broken drafting table, overturned
    w.put(40, 31, 46, 'table'); w.put(41, 31, 47, 'table'); w.put(41, 32, 47, 'paper');
    w.put(31, 31, 47, 'crate'); w.put(30, 31, 46, 'paper');
    // the east ledge (Pepper's run): a narrow strip to a floating chunk
    for (let x = 51; x <= 57; x++) { w.put(x, 30, 36, 'planks'); w.put(x, 30, 37, x % 2 ? 'planks_dark' : 'frayed'); }
    shardIsland(w, 61, 30, 37, 4, 4, 7, 71, 0.4, 'voidstone');
    fill(w, 47, 30, 35, 50, 30, 38, 'planks_dark');
    fill(w, 47, 31, 35, 50, 34, 38, 'air');
    // the south landing (where help arrives), joined by a stitched span
    shardIsland(w, 36, 30, 60, 6, 5, 8, 83, 0.4, 'grass');
    for (let z = 50; z <= 55; z++) fill(w, 35, 30, z, 37, 30, z, z % 2 ? 'planks_pale' : 'planks');
    for (let z = 50; z <= 55; z += 2) w.put(36, 31, z, 'sparkwire');
    lampPost(w, 33, 31, 58, 2); lampPost(w, 39, 31, 58, 2);
    // big drifting chunks for scale
    shardIsland(w, 12, 40, 18, 5, 4, 6, 91, 0.5, 'grass');
    shardIsland(w, 62, 44, 14, 4, 5, 5, 93, 0.5, 'voidstone');
    shardIsland(w, 10, 26, 58, 4, 3, 4, 95, 0.6, 'grass');
    fill(w, 12, 41, 18, 12, 44, 18, 'log'); w.put(12, 45, 18, 'leaves_autumn'); w.put(11, 44, 18, 'leaves_autumn');
    debris(w, 2, 6, 2, 78, 58, 78, 300, 7, (x, _y, z) => Math.hypot(x - cx, z - cz) < 18 || Math.hypot(x - 36, z - 60) < 8 || Math.hypot(x - 61, z - 37) < 6);
  },
};

export const ep4Sets: SetDef[] = [edge, tower, brokentop];
