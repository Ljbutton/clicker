// Sets for Episode 2: the Glimmerwood, Glasswater Lake and the Sunken Archive.
import { fbm, mulberry32 } from '../../core/rng';
import { BLOCKS, BLOCK_ID } from '../../render/blocks';
import type { SetDef } from '../../render/stage';
import type { VoxelWorld } from '../../render/voxels';
import { cylinder, edgeBarrier, fill, forest, house, lampPost, path, scatter, sphere, topY, tree } from '../kit';

type P2 = [number, number];
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

function segDist(px: number, pz: number, a: P2, b: P2) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const l2 = dx * dx + dz * dz || 1;
  const t = clamp01(((px - a[0]) * dx + (pz - a[1]) * dz) / l2);
  return Math.hypot(px - (a[0] + dx * t), pz - (a[1] + dz * t));
}
function lineDist(px: number, pz: number, pts: P2[]) {
  let d = Infinity;
  for (let i = 0; i < pts.length - 1; i++) d = Math.min(d, segDist(px, pz, pts[i], pts[i + 1]));
  return d;
}

// =====================================================================
// The Glimmerwood: a glowing night forest, a fray scar, and a camp.
// Ground level is y = 8 (stand at 9).
// =====================================================================

export const GW = {
  G: 8,
  entry: [50.5, 90.5] as P2,
  marker: [41, 72] as P2,
  token: [54, 57] as P2,
  scar: [62, 66] as P2,
  ring: [36, 61] as P2,
  fight: [47.5, 64.5] as P2,
  fire: [42, 36] as P2,
  lantern: [46, 31] as P2,
  tent: [37, 29] as P2,
};

const GW_TRAIL: P2[] = [[50, 95], [47, 82], [44, 72], [47, 64], [52, 56], [50, 46], [48, 38], [48, 24], [47, 12], [48, 0]];
/** Side paths kept clear of trees so every hotspot is reachable. */
const GW_CLEAR: Array<[P2, P2, number]> = [
  [[36, 61], [46, 63], 2.6],
  [[41, 72], [44, 72], 2.2],
  [[54, 57], [51, 57], 2.2],
  [[62, 66], [48, 64], 3.2],
  [[42, 36], [49, 38], 3],
];

function gwClear(x: number, z: number) {
  if (lineDist(x, z, GW_TRAIL) < 4.2) return true;
  if (Math.hypot(x - GW.fire[0], z - GW.fire[1]) < 11) return true;
  if (Math.hypot(x - GW.scar[0], z - GW.scar[1]) < 6.5) return true;
  if (Math.hypot(x - GW.ring[0], z - GW.ring[1]) < 4.5) return true;
  for (const [a, b, r] of GW_CLEAR) if (segDist(x, z, a, b) < r) return true;
  return false;
}

function gwHeight(x: number, z: number) {
  const n = fbm(x / 16, z / 16, 5);
  let h = GW.G + (n - 0.5) * 9;
  let f = clamp01((8 - lineDist(x, z, GW_TRAIL)) / 4);
  f = Math.max(f, clamp01((14 - Math.hypot(x - GW.fire[0], z - GW.fire[1])) / 4));
  f = Math.max(f, clamp01((9 - Math.hypot(x - GW.scar[0], z - GW.scar[1])) / 3));
  f = Math.max(f, clamp01((7 - Math.hypot(x - GW.ring[0], z - GW.ring[1])) / 3));
  for (const [a, b, r] of GW_CLEAR) f = Math.max(f, clamp01((r + 3 - segDist(x, z, a, b)) / 3));
  h = h * (1 - f) + GW.G * f;
  return Math.round(h);
}

export const glimmerwood: SetDef = {
  id: 'glimmerwood',
  size: [96, 40, 96],
  sky: 'night',
  cams: {
    wide: { pos: [58, 19, 94], look: [46, 9, 70] },
    trail: { pos: [52, 13, 84], look: [44, 10, 70] },
    marker: { pos: [44.5, 11.5, 75.5], look: [41, 10.5, 72] },
    scar: { pos: [52, 13, 71], look: [63, 9, 65] },
    fight: { pos: [41, 13.5, 71], look: [50, 9.5, 62] },
    tracks: { pos: [60, 14, 70], look: [76, 10, 52] },
    camp: { pos: [51, 14.5, 47], look: [42, 9.5, 35] },
    fire: { pos: [42.5, 10.6, 42.2], look: [42.5, 9.8, 35] },
    tent: { pos: [44, 12, 38], look: [37, 10, 29] },
    sky: { pos: [42, 10.2, 41], look: [52, 32, 2] },
    north: { pos: [48, 14, 44], look: [48, 10, 14] },
    above: { pos: [42, 30, 50], look: [42, 9, 36] },
  },
  lights: [
    { at: [42.5, 10.6, 36.5], color: '#ff9a40', intensity: 6, dist: 13 },
    { at: [46, 13, 76], color: '#8ff0e0', intensity: 3, dist: 15 },
    { at: [50, 13, 60], color: '#8ff0e0', intensity: 3, dist: 15 },
    { at: [61, 12, 66], color: '#b080ff', intensity: 3, dist: 11 },
    { at: [48, 13, 88], color: '#8ff0e0', intensity: 2, dist: 14 },
  ],
  build(w, flags) {
    const G = GW.G;
    // terrain
    for (let z = 0; z < w.sz; z++) for (let x = 0; x < w.sx; x++) {
      const h = gwHeight(x, z);
      for (let y = 0; y <= h; y++) w.put(x, y, z, y === h ? 'grass' : y > h - 3 ? 'dirt' : 'stone');
    }
    // the trail
    path(w, GW_TRAIL, 3, 'path');
    path(w, [[48, 38], [44, 37]], 2, 'path');
    // the waymarker: an old stone post with a glowing glyph
    {
      const [x, z] = GW.marker;
      w.put(x, G, z, 'cobble');
      w.put(x, G + 1, z, 'mossy');
      w.put(x, G + 2, z, 'glowblock');
      w.put(x, G + 3, z, 'cobble');
      w.put(x - 1, G + 1, z, 'mossy');
      w.put(x, G + 1, z - 1, 'cobble');
    }
    // a thornbush where something got snagged
    {
      const [x, z] = GW.token;
      for (const [dx, dy, dz] of [[1, 1, 0], [1, 1, 1], [2, 1, 0], [1, 2, 0], [2, 1, -1]]) w.put(x + dx, G + dy, z + dz, 'leaves');
      w.put(x + 1, G + 1, z - 1, 'flower_red');
    }
    // the glowcap ring
    {
      const [cx, cz] = GW.ring;
      for (let a = 0; a < 12; a++) {
        const x = Math.round(cx + Math.cos((a / 12) * Math.PI * 2) * 2.6), z = Math.round(cz + Math.sin((a / 12) * Math.PI * 2) * 2.6);
        w.put(x, G + 1, z, a % 2 ? 'mushroom' : 'flower_glow');
      }
    }
    // the fray scar: grey-violet ground, dead trees, voidstone splinters
    {
      const [cx, cz] = GW.scar;
      for (let z = cz - 7; z <= cz + 7; z++) for (let x = cx - 7; x <= cx + 7; x++) {
        const d = Math.hypot(x - cx, z - cz);
        if (d > 6.5) continue;
        const t = topY(w, x, z);
        if (t < 0) continue;
        if (fbm(x / 3, z / 3, 4) + (1 - d / 6.5) * 0.35 > 0.62) w.put(x, t, z, 'frayed');
        const above = w.name(x, t + 1, z);
        if (above === 'tallgrass' || above.startsWith('flower')) w.put(x, t + 1, z, 'air');
      }
      for (const [x, z, h] of [[65, 63, 4], [59, 70, 3], [66, 69, 5]]) {
        for (let y = 1; y <= h; y++) w.put(x, G + y, z, y === h ? 'frayed' : 'log');
        w.put(x + 1, G + h - 1, z, 'frayed');
      }
      for (const [x, z, h] of [[63, 66, 2], [61, 64, 1], [64, 68, 1], [60, 67, 1]]) for (let y = 1; y <= h; y++) w.put(x, G + y, z, 'voidstone');
      // tracks leading north-east, toward the far mountains
      for (let k = 0; k < 9; k++) {
        const x = 66 + k * 2, z = 62 - k * 1.6;
        const t = topY(w, Math.round(x), Math.round(z));
        if (t > 0) w.put(Math.round(x), t, Math.round(z), 'frayed');
      }
    }
    // the camp: fire ring, log seats, a tent, bedrolls, and Ostin's little lantern
    {
      const [fx, fz] = GW.fire;
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) w.put(fx + dx, G, fz + dz, dx || dz ? 'cobble' : 'lava');
      w.put(fx, G + 1, fz, 'torch');
      fill(w, fx - 4, G + 1, fz - 1, fx - 4, G + 1, fz + 1, 'log');
      fill(w, fx - 1, G + 1, fz - 4, fx + 1, G + 1, fz - 4, 'log');
      fill(w, fx + 4, G + 1, fz - 1, fx + 4, G + 1, fz + 1, 'log');
      // A-frame tent opening south
      const [tx, tz] = GW.tent;
      for (let z = tz - 2; z <= tz + 1; z++) {
        w.put(tx - 2, G + 1, z, 'wool_teal'); w.put(tx + 2, G + 1, z, 'wool_teal');
        w.put(tx - 1, G + 2, z, 'wool_teal'); w.put(tx + 1, G + 2, z, 'wool_teal');
        w.put(tx, G + 3, z, 'wool_teal');
      }
      fill(w, tx - 1, G + 1, tz - 2, tx + 1, G + 1, tz - 2, 'wool_teal');
      w.put(tx, G + 2, tz - 2, 'wool_teal');
      w.put(tx, G, tz, 'wool_blue'); w.put(tx, G, tz - 1, 'wool_blue');
      // bedrolls
      for (const [x, z, c] of [[36, 39, 'wool_blue'], [37, 39, 'wool_blue'], [39, 41, 'wool_red'], [40, 41, 'wool_red'], [46, 40, 'wool_green'], [47, 40, 'wool_green']] as const) w.put(x, G, z, c);
      // packs
      w.put(35, G + 1, 36, 'crate'); w.put(35, G + 1, 37, 'crate'); w.put(35, G + 2, 36, 'hay');
      // Ostin's traveling lantern, built like the fair entry
      const [lx, lz] = GW.lantern;
      fill(w, lx - 1, G + 1, lz, lx + 1, G + 1, lz, 'planks_dark');
      w.put(lx, G + 2, lz, 'lantern');
      if (flags.lantern === 'fox') { w.put(lx - 1, G + 3, lz, 'wool_orange'); w.put(lx + 1, G + 3, lz, 'wool_orange'); }
      else if (flags.lantern === 'tower') { w.put(lx, G + 3, lz, 'planks_dark'); w.put(lx, G + 4, lz, 'planks_dark'); w.put(lx, G + 5, lz, 'roof_red'); }
      else { w.put(lx, G + 3, lz, 'gold'); w.put(lx - 1, G + 4, lz, 'gold'); w.put(lx + 1, G + 4, lz, 'gold'); w.put(lx, G + 4, lz, 'gold'); w.put(lx, G + 5, lz, 'gold'); }
    }
    // boulders
    const rnd = mulberry32(42);
    for (let i = 0; i < 40; i++) {
      const x = 4 + Math.floor(rnd() * 88), z = 4 + Math.floor(rnd() * 88);
      if (gwClear(x, z)) continue;
      const t = topY(w, x, z);
      if (t < 0) continue;
      w.put(x, t + 1, z, 'mossy'); if (rnd() < 0.5) w.put(x + 1, t + 1, z, 'cobble'); if (rnd() < 0.4) w.put(x, t + 2, z, 'mossy');
    }
    // undergrowth
    scatter(w, 0, 0, 95, 95, 11, 0.13, ['tallgrass', 'tallgrass', 'tallgrass', 'flower_glow', 'mushroom', 'flower_blue']);
    // the forest: mostly glowing trees, with pines and oaks between them
    forest(w, 2, 2, 92, 92, 23, 0.72, ['glow', 'glow', 'glow', 'pine', 'oak', 'birch'], gwClear);
    // a few tall glow trees framing the trail
    for (const [x, z] of [[40, 80], [53, 74], [41, 66], [56, 51], [44, 50], [53, 84], [52, 30], [32, 44]] as P2[]) {
      const t = topY(w, x, z);
      if (t > 0 && w.name(x, t, z) === 'grass') tree(w, x, t + 1, z, 'glow', 7, x * 7 + z);
    }
    edgeBarrier(w, 1, 1, 94, 94, 0, 30);
  },
};

// =====================================================================
// Glasswater Lake: a wide lake with a glass dome on the bottom, a beach,
// an old jetty, a boathouse and a rocky islet. Land is y = 26 (stand at 27),
// the water surface is y = 25, the lake bed by the dome is y = 9 (stand at 10).
// =====================================================================

export const GL = {
  G: 26,
  W: 25,
  dome: [48, 34] as P2,
  domeR: 11,
  bed: 9,
  jettyEnd: [48.5, 51.5] as P2,
  jettyFoot: [48.5, 64.5] as P2,
  bench: [41, 67] as P2,
  bedroll: [36, 69] as P2,
  window: [59, 28, 68] as [number, number, number],
  coil: [47, 51] as P2,
  islet: [63, 47] as P2,
  tunnel: [48.5, 49.5] as P2,
  beach: [48, 67] as P2,
};

function glLake(x: number, z: number) { return Math.hypot((x - 48) / 30, (z - 38) / 22); }
function glShore(x: number, z: number) { return Math.abs(x - 46) < 20 && z > 57 && z < 82; }

function glHeight(x: number, z: number) {
  const d = glLake(x, z);
  if (d < 1) {
    if (d < 0.72) return GL.bed;
    return Math.round(GL.bed + ((d - 0.72) / 0.28) * 15);
  }
  if (d < 1.22) return glShore(x, z) ? 25 + Math.round(clamp01((d - 1) / 0.22)) : 25 + Math.round(((d - 1) / 0.22) * 1.4);
  const n = fbm(x / 14, z / 14, 8);
  let h = GL.G + (n - 0.45) * 14 * clamp01((d - 1.22) * 2.2);
  if (glShore(x, z)) h = GL.G;
  return Math.round(h);
}

/** Build the dome (and its tunnel) at the bottom of the lake. */
function glDome(w: VoxelWorld, flags: Record<string, unknown>) {
  const [cx, cz] = GL.dome;
  const r = GL.domeR;
  const y0 = GL.bed + 1; // floor y
  cylinder(w, cx, GL.bed - 1, cz, r + 1, 2, 'marble');
  // glass shell with marble ribs
  for (let y = 0; y <= r; y++) for (let z = -r; z <= r; z++) for (let x = -r; x <= r; x++) {
    const d = Math.hypot(x, y, z);
    if (d > r + 0.5) continue;
    if (d >= r - 0.5) {
      const ang = Math.atan2(z, x) * (180 / Math.PI);
      const rib = Math.abs(((ang % 45) + 45) % 45 - 22.5) > 19.5 || y === 0;
      w.put(cx + x, y0 + y, cz + z, rib ? 'marble' : 'glass');
    } else w.put(cx + x, y0 + y, cz + z, 'air');
  }
  cylinder(w, cx, y0, cz, r - 1, 1, 'marble_tile');
  // shelves and lights you can see from the surface
  for (let z = -r; z <= r; z++) for (let x = -r; x <= r; x++) {
    const d = Math.hypot(x, z);
    if (d > 7.6 && d < 8.6 && !(Math.abs(x) <= 1 && z > 0)) { w.put(cx + x, y0 + 1, cz + z, 'bookshelf'); w.put(cx + x, y0 + 2, cz + z, 'bookshelf'); }
  }
  for (let a = 0; a < 8; a++) {
    const x = Math.round(Math.cos((a / 8) * Math.PI * 2) * 5), z = Math.round(Math.sin((a / 8) * Math.PI * 2) * 5);
    w.put(cx + x, y0, cz + z, 'glowblock');
    w.put(cx + Math.round(x * 1.55), y0 + 3, cz + Math.round(z * 1.55), 'lantern');
  }
  w.put(cx, y0 + 1, cz, 'gold'); w.put(cx, y0 + 2, cz, 'beacon_core');
  // a crown of light at the top so the dome glows up through the water
  w.put(cx, y0 + r, cz, 'glowblock');
  for (const [dx, dz] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) w.put(cx + dx, y0 + r - 1, cz + dz, 'glowblock');
  for (let a = 0; a < 8; a++) {
    const ang = (a / 8) * Math.PI * 2 + Math.PI / 8;
    w.put(cx + Math.round(Math.cos(ang) * 8.5), y0 + 7, cz + Math.round(Math.sin(ang) * 8.5), 'glowblock');
  }
  fill(w, cx, y0 + 6, cz, cx, y0 + 10, cz, 'iron');
  w.put(cx, y0 + 5, cz, 'glowblock');
  // the entry tunnel, running south along the lake bed
  const tz0 = cz + r - 1, tz1 = cz + r + 5;
  fill(w, cx - 2, y0 - 1, tz0, cx + 2, y0 + 3, tz1, 'marble');
  fill(w, cx - 1, y0, tz0 - 1, cx + 1, y0 + 2, tz1, 'air');
  fill(w, cx - 1, y0 - 1, tz0, cx + 1, y0 - 1, tz1, 'marble_tile');
  for (let z = tz0; z <= tz1; z += 2) w.put(cx, y0 + 3, z, 'glass');
  fill(w, cx - 2, y0, tz1, cx - 2, y0 + 3, tz1, 'gold');
  fill(w, cx + 2, y0, tz1, cx + 2, y0 + 3, tz1, 'gold');
  fill(w, cx - 2, y0 + 3, tz1, cx + 2, y0 + 3, tz1, 'gold');
  for (const x of [cx - 2, cx + 2]) { fill(w, x, y0 - 1, tz1 + 1, x, y0 + 1, tz1 + 1, 'marble'); w.put(x, y0 + 2, tz1 + 1, 'lantern'); }
  if (flags.dome_broken) {
    // flooded and dark, with a ragged hole in the top
    for (let y = y0; y <= y0 + r; y++) for (let z = -r; z <= r; z++) for (let x = -r; x <= r; x++) {
      const nm = w.name(cx + x, y, cz + z);
      if (nm === 'air') w.put(cx + x, y, cz + z, 'water');
      else if (nm === 'glowblock' || nm === 'beacon_core') w.put(cx + x, y, cz + z, flags.ysolde === 'stayed' && x === 0 && z === 0 ? 'glowblock' : 'marble');
      else if (nm === 'lantern') w.put(cx + x, y, cz + z, 'planks_dark');
    }
    for (let y = y0 + 6; y <= y0 + r; y++) for (let z = -r; z <= 0; z++) for (let x = 0; x <= r; x++) {
      const nm = w.name(cx + x, y, cz + z);
      if ((nm === 'glass' || nm === 'marble') && fbm(x / 2.5, (y + z) / 2.5, 3) > 0.5) w.put(cx + x, y, cz + z, (x + y + z) % 3 ? 'water' : 'frayed');
    }
    fill(w, cx - 1, y0, tz0 - 1, cx + 1, y0 + 2, tz1, 'water');
  }
}

export const glasswater: SetDef = {
  id: 'glasswater',
  size: [96, 48, 96],
  sky: 'dawn',
  cams: {
    wide: { pos: [36, 39, 90], look: [50, 22, 44] },
    shore: { pos: [48, 30.5, 79], look: [47, 27, 64] },
    lake: { pos: [44, 34, 58], look: [48, 14, 36] },
    domeTop: { pos: [48.5, 29, 47], look: [48, 16, 34] },
    jetty: { pos: [55, 30, 60], look: [48, 27, 52] },
    bench: { pos: [45, 29.5, 73], look: [40.5, 27, 66.5] },
    boathouse: { pos: [54, 30, 75], look: [60, 28, 66] },
    under: { pos: [56.5, 14.2, 55], look: [49, 12.2, 42] },
    tunnel: { pos: [51, 12.4, 53.5], look: [48.5, 11, 48.5] },
    islet: { pos: [57.2, 29.4, 55.2], look: [62.6, 27.9, 47.6] },
    east: { pos: [46, 30, 70], look: [95, 34, 38] },
    standoff: { pos: [43, 30.4, 72.5], look: [49.5, 27.6, 57] },
    surface: { pos: [44, 27.6, 58], look: [49, 26.5, 64] },
  },
  lights: [
    { at: [49.5, 30, 51.5], color: '#ffd080', intensity: 3, dist: 9 },
    { at: [48.5, 12.5, 49.5], color: '#7ff2e4', intensity: 3, dist: 10 },
    { at: [41.5, 29.5, 67.5], color: '#ffc070', intensity: 2, dist: 8 },
  ],
  build(w, flags) {
    // terrain + lake bowl
    for (let z = 0; z < w.sz; z++) for (let x = 0; x < w.sx; x++) {
      const h = glHeight(x, z);
      const d = glLake(x, z);
      for (let y = 0; y <= h; y++) {
        let b = y === h ? 'grass' : y > h - 3 ? 'dirt' : 'stone';
        if (d < 1.22 && y > h - 3) b = d < 0.72 && y === h ? (fbm(x / 3, z / 3, 2) > 0.55 ? 'gravel' : 'sand') : 'sand';
        w.put(x, y, z, b);
      }
    }
    glDome(w, flags);
    // fill the lake
    for (let z = 0; z < w.sz; z++) for (let x = 0; x < w.sx; x++) {
      if (glLake(x, z) > 1.05) continue;
      const t = topY(w, x, z);
      if (t >= GL.W) continue;
      for (let y = t + 1; y <= GL.W; y++) w.put(x, y, z, 'water');
    }
    // lake bed life: kelp, coral, glowing weed
    const rnd = mulberry32(7);
    for (let i = 0; i < 260; i++) {
      const x = 18 + Math.floor(rnd() * 60), z = 16 + Math.floor(rnd() * 46);
      if (glLake(x, z) > 0.95) continue;
      if (Math.hypot(x - GL.dome[0], z - GL.dome[1]) < GL.domeR + 2) continue;
      if (Math.abs(x - 48) < 4 && z > 40 && z < 60) continue;
      let y = topY(w, x, z);
      while (y > 0 && w.name(x, y, z) === 'water') y--;
      if (w.name(x, y + 1, z) !== 'water') continue;
      const k = rnd();
      if (k < 0.45) { const h = 1 + Math.floor(rnd() * 3); for (let j = 1; j <= h; j++) if (w.name(x, y + j, z) === 'water') w.put(x, y + j, z, 'reeds'); }
      else if (k < 0.8) w.put(x, y + 1, z, 'coral');
      else if (k < 0.9) w.put(x, y + 1, z, 'flower_glow');
      else { w.put(x, y + 1, z, 'mossy'); }
    }
    // the islet: a rock column with a dead tree
    {
      const [ix, iz] = GL.islet;
      for (let z = iz - 4; z <= iz + 4; z++) for (let x = ix - 4; x <= ix + 4; x++) {
        const d = Math.hypot(x - ix, z - iz);
        if (d > 3.4) continue;
        const top = d < 2.6 ? GL.G : GL.G - 1;
        for (let y = GL.bed - 1; y <= top; y++) w.put(x, y, z, y === top ? (d < 1.8 ? 'grass' : 'mossy') : (y + x) % 5 ? 'stone' : 'mossy');
      }
      fill(w, ix + 1, GL.G + 1, iz - 1, ix + 1, GL.G + 3, iz - 1, 'log');
      w.put(ix + 2, GL.G + 3, iz - 1, 'log'); w.put(ix + 1, GL.G + 4, iz - 2, 'log');
      w.put(ix - 2, GL.G + 1, iz + 1, 'cobble');
    }
    // the jetty
    for (let z = 50; z <= 66; z++) {
      fill(w, 47, GL.G, z, 49, GL.G, z, z % 4 === 0 ? 'planks_dark' : 'planks');
      if (z % 4 === 2 && z < 62) for (const x of [46, 50]) for (let y = topY(w, x, z) + 1; y <= GL.G; y++) w.put(x, y, z, 'log');
    }
    fill(w, 47, GL.G - 1, 50, 49, GL.G - 1, 50, 'planks_dark');
    lampPost(w, 49, GL.G + 1, 50, 2);
    if (!flags.got_wire) w.put(GL.coil[0], GL.G + 1, GL.coil[1], 'sparkwire');
    w.put(GL.coil[0], GL.G + 1, GL.coil[1] - 1, 'copper');
    // the boathouse
    house(w, 57, GL.G + 1, 63, 8, 6, 4, { wall: 'planks', frame: 'log', roof: 'roof_blue', door: 'w' });
    if (flags.took_window) w.put(GL.window[0], GL.window[1], GL.window[2], 'air');
    // an upturned rowboat and oars on the beach
    fill(w, 52, GL.G, 69, 54, GL.G, 70, 'planks_dark');
    fill(w, 53, GL.G + 1, 69, 53, GL.G + 1, 70, 'planks');
    // the warning sign
    w.put(44, GL.G + 1, 62, 'planks_dark'); w.put(44, GL.G + 2, 62, 'planks_dark'); w.put(44, GL.G + 3, 62, 'paper');
    // camp gear on the beach
    w.put(GL.bench[0], GL.G + 1, GL.bench[1], 'workbench');
    w.put(GL.bench[0] - 1, GL.G + 1, GL.bench[1], 'crate');
    w.put(GL.bench[0] - 1, GL.G + 2, GL.bench[1], 'crate');
    if (!flags.took_bedroll) { w.put(GL.bedroll[0], GL.G, GL.bedroll[1], 'wool_blue'); w.put(GL.bedroll[0] + 1, GL.G, GL.bedroll[1], 'wool_blue'); }
    w.put(GL.bedroll[0] - 1, GL.G + 1, GL.bedroll[1], 'crate');
    // reeds along the waterline
    scatter(w, 14, 50, 82, 64, 3, 0.25, ['reeds', 'reeds', 'tallgrass'], 'sand');
    scatter(w, 0, 0, 95, 95, 5, 0.08, ['tallgrass', 'flower_yellow', 'flower_blue', 'tallgrass'], 'grass');
    // trees around the lake
    const avoid = (x: number, z: number) => glLake(x, z) < 1.3 || (Math.abs(x - 46) < 20 && z > 57 && z < 88) || (x > 54 && x < 68 && z > 60 && z < 72);
    forest(w, 2, 2, 92, 92, 31, 0.55, ['pine', 'pine', 'birch', 'oak'], avoid);
    edgeBarrier(w, 26, 48, 70, 84, GL.G - 2, GL.G + 6);
  },
};

// =====================================================================
// The Sunken Archive: a glass-domed library on the lake bed.
// Floor is y = 10 (stand at 11). Centre (32, 32), dome radius 17.
// =====================================================================

export const AR = {
  F: 10,
  C: [32, 32] as P2,
  R: 17,
  lockIn: [32.5, 47.5] as P2,
  lockOut: [32.5, 54.5] as P2,
  lever: [29, 46] as P2,
  desk: [32.5, 20.5] as P2,
  atlas: [32, 18] as P2,
  orrery: [32, 32] as P2,
  ember: [21, 21] as P2,
  gale: [43, 21] as P2,
  root: [21, 43] as P2,
  tide: [43, 43] as P2,
  sunkTable: [41, 32] as P2,
  westTable: [22, 32] as P2,
};

const AR_MARKERS: Array<[P2, string, string]> = [
  [AR.ember, 'ember', 'wool_orange'],
  [AR.gale, 'gale', 'wool_white'],
  [AR.root, 'root', 'wool_green'],
  [AR.tide, 'tide', 'wool_teal'],
];

function arRing(x: number, z: number) { const d = Math.hypot(x - 32, z - 32); return d >= 14.6 && d <= 16.2; }
function arWing(x: number, z: number) {
  const dx = x - 32, dz = z - 32;
  const d = Math.hypot(dx, dz);
  return dx > 0 && Math.abs(Math.atan2(dz, dx)) < (38 * Math.PI) / 180 && d >= 7.5 && d <= 14.6;
}

export const archive: SetDef = {
  id: 'archive',
  size: [64, 40, 64],
  sky: 'underwater',
  cams: {
    wide: { pos: [32, 19, 45], look: [32, 12, 26] },
    entry: { pos: [34.5, 13.6, 42], look: [32.5, 12, 52] },
    lock: { pos: [32.5, 12.6, 46], look: [32.5, 11.8, 54] },
    hall: { pos: [24, 14.5, 41], look: [36, 12, 26] },
    desk: { pos: [36.5, 14, 28], look: [32, 12, 20] },
    atlas: { pos: [35, 13.4, 23], look: [32, 12, 18] },
    orrery: { pos: [37.5, 15, 38.5], look: [32, 12.4, 32] },
    orreryTop: { pos: [32.5, 21, 38], look: [32, 12, 31] },
    wing: { pos: [27, 14, 37], look: [41, 11, 30] },
    crack: { pos: [33, 12.5, 34], look: [41, 21, 25] },
    shelves: { pos: [32, 13.5, 30], look: [21, 13.5, 21] },
    up: { pos: [32, 12, 36], look: [32, 26, 30] },
  },
  lights: [
    { at: [32.5, 15, 32.5], color: '#7ff2e4', intensity: 4, dist: 15 },
    { at: [32.5, 13.5, 22.5], color: '#ffd080', intensity: 3, dist: 9 },
    { at: [32.5, 13, 45.5], color: '#ffd080', intensity: 2.5, dist: 9 },
    { at: [40.5, 12.5, 32.5], color: '#7ff2e4', intensity: 2, dist: 8 },
  ],
  build(w, flags) {
    const F = AR.F;
    const [cx, cz] = AR.C;
    const R = AR.R;
    // sea floor
    for (let z = 0; z < w.sz; z++) for (let x = 0; x < w.sx; x++) {
      const h = 9 + (fbm(x / 9, z / 9, 12) > 0.62 ? 1 : 0);
      for (let y = 0; y <= h; y++) w.put(x, y, z, y === h ? (fbm(x / 4, z / 4, 3) > 0.6 ? 'gravel' : 'sand') : 'stone');
    }
    // floor
    cylinder(w, cx, F - 2, cz, R, 3, 'marble');
    for (let z = cz - R; z <= cz + R; z++) for (let x = cx - R; x <= cx + R; x++) {
      const d = Math.hypot(x - cx, z - cz);
      if (d > R - 0.5) continue;
      let b = 'marble_tile';
      if (d > 11.5 && d < 12.5) b = 'marble';
      if (d <= 4.2) b = 'carpet';
      if (Math.abs(x - cx) <= 1 && z > cz + 4) b = 'carpet';
      if (Math.abs(z - cz) <= 0 && x < cx - 4 && x > cx - 12) b = 'carpet';
      w.put(x, F, z, b);
    }
    // glow inlays
    for (let a = 0; a < 8; a++) {
      const x = cx + Math.round(Math.cos((a / 8) * Math.PI * 2 + Math.PI / 8) * 6.2), z = cz + Math.round(Math.sin((a / 8) * Math.PI * 2 + Math.PI / 8) * 6.2);
      w.put(x, F, z, 'glowblock');
    }
    // dome: base wall + glass shell with marble ribs
    cylinder(w, cx, F + 1, cz, R, 2, 'marble', true);
    for (let y = 0; y <= R; y++) for (let z = -R; z <= R; z++) for (let x = -R; x <= R; x++) {
      const d = Math.hypot(x, y, z);
      if (d > R + 0.5 || d < R - 0.5) continue;
      const ang = Math.atan2(z, x) * (180 / Math.PI);
      const rib = Math.abs(((ang % 45) + 45) % 45 - 22.5) > 20.5;
      const band = y === 6;
      w.put(cx + x, F + 2 + y, cz + z, rib || band ? (band ? 'gold' : 'marble') : 'glass');
    }
    w.put(cx, F + 2 + R, cz, 'gold');
    // the outer ring of shelves
    for (let z = cz - R; z <= cz + R; z++) for (let x = cx - R; x <= cx + R; x++) {
      if (!arRing(x, z)) continue;
      if (Math.abs(x - cx) <= 1 && z > cz) continue; // south entrance
      fill(w, x, F + 1, z, x, F + 4, z, 'bookshelf');
      w.put(x, F + 5, z, 'planks_dark');
    }
    for (let a = 0; a < 16; a++) {
      const ang = (a / 16) * Math.PI * 2 + Math.PI / 16;
      const x = cx + Math.round(Math.cos(ang) * 15.2), z = cz + Math.round(Math.sin(ang) * 15.2);
      if (arRing(x, z) && !(Math.abs(x - cx) <= 1 && z > cz)) w.put(x, F + 6, z, 'lantern');
    }
    // crystal markers above four shelf sections
    for (const [[mx, mz], crystal, wool] of AR_MARKERS) {
      for (const [dx, dz] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
        if (arRing(mx + dx, mz + dz)) { w.put(mx + dx, F + 5, mz + dz, (dx || dz) ? 'gold' : crystal); }
      }
      w.put(mx, F + 6, mz, crystal);
      // a colored banner on the shelf face, facing the hall
      const ix = mx + Math.sign(cx - mx), iz = mz + Math.sign(cz - mz);
      if (!arRing(ix, iz)) { w.put(mx, F + 3, mz, wool); w.put(mx, F + 4, mz, wool); }
    }
    // the flooded east wing: one step down, ankle-deep water, coral
    for (let z = cz - R; z <= cz + R; z++) for (let x = cx - R; x <= cx + R; x++) {
      if (!arWing(x, z)) continue;
      w.put(x, F - 1, z, fbm(x / 3, z / 3, 6) > 0.55 ? 'mossy' : 'sand');
      w.put(x, F, z, 'water');
    }
    {
      const r = mulberry32(3);
      for (let z = cz - R; z <= cz + R; z++) for (let x = cx - R; x <= cx + R; x++) {
        if (!arWing(x, z)) continue;
        if (r() < 0.12) w.put(x, F, z, r() < 0.6 ? 'coral' : 'reeds');
      }
    }
    w.put(AR.sunkTable[0], F, AR.sunkTable[1], 'table');
    w.put(AR.sunkTable[0], F, AR.sunkTable[1] + 1, 'table');
    // a toppled shelf half under water
    fill(w, 44, F, 27, 46, F, 27, 'bookshelf');
    w.put(45, F + 1, 27, 'bookshelf');
    // the orrery: a model of the Beacon and its four Anchors
    fill(w, cx - 1, F + 1, cz - 1, cx + 1, F + 1, cz + 1, 'gold');
    w.put(cx, F + 2, cz, 'marble');
    w.put(cx, F + 3, cz, flags.orrery_dark ? 'beacon_dead' : 'beacon_core');
    for (const [dx, dz, crystal] of [[-3, -3, 'ember'], [3, -3, 'gale'], [-3, 3, 'root'], [3, 3, 'tide']] as const) {
      w.put(cx + dx, F + 1, cz + dz, 'marble');
      const dark = (crystal === 'gale' || crystal === 'root') || (crystal === 'tide' && flags.tide_dark);
      w.put(cx + dx, F + 2, cz + dz, dark ? 'basalt' : crystal);
    }
    // chandelier above the orrery
    fill(w, cx, F + 9, cz, cx, F + 2 + R - 1, cz, 'iron');
    w.put(cx, F + 8, cz, 'glowblock');
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) w.put(cx + dx, F + 8, cz + dz, 'lantern');
    // Ysolde's desk and the Atlas pedestal
    fill(w, cx - 2, F + 1, cz - 10, cx + 2, F + 1, cz - 10, 'table');
    w.put(cx - 3, F + 1, cz - 10, 'bookshelf'); w.put(cx - 3, F + 2, cz - 10, 'bookshelf');
    w.put(cx + 3, F + 1, cz - 10, 'bookshelf'); w.put(cx + 3, F + 2, cz - 10, 'bookshelf');
    w.put(cx - 2, F + 2, cz - 10, 'lantern');
    w.put(cx + 2, F + 2, cz - 10, 'paper');
    w.put(AR.atlas[0], F + 1, AR.atlas[1], 'gold');
    if (!flags.atlas_gone) w.put(AR.atlas[0], F + 2, AR.atlas[1], 'map');
    w.put(cx - 1, F + 1, cz - 14, 'banner_blue'); w.put(cx + 1, F + 1, cz - 14, 'banner_blue');
    // reading tables
    fill(w, AR.westTable[0], F + 1, AR.westTable[1] - 1, AR.westTable[0], F + 1, AR.westTable[1] + 1, 'table');
    w.put(AR.westTable[0], F + 2, AR.westTable[1] + 1, 'lantern');
    for (const x of [26, 38]) { fill(w, x, F + 1, 40, x, F + 1, 41, 'table'); w.put(x, F + 2, 41, 'paper'); }
    // lamp posts
    for (let a = 0; a < 8; a++) {
      const ang = (a / 8) * Math.PI * 2 + Math.PI / 8;
      const x = cx + Math.round(Math.cos(ang) * 10), z = cz + Math.round(Math.sin(ang) * 10);
      if (arWing(x, z)) lampPost(w, x, F, z, 3);
      else lampPost(w, x, F + 1, z, 2);
    }
    // airlock: through the south wall, a short tunnel with two doors
    fill(w, cx - 1, F + 1, cz + 12, cx + 1, F + 3, cz + 18, 'air');
    fill(w, cx - 2, F, cz + 15, cx + 2, F + 4, cz + 25, 'marble');
    fill(w, cx - 1, F + 1, cz + 15, cx + 1, F + 3, cz + 24, 'air');
    fill(w, cx - 1, F, cz + 15, cx + 1, F, cz + 24, 'marble_tile');
    for (let z = cz + 16; z <= cz + 24; z += 2) w.put(cx, F + 4, z, 'glass');
    for (let z = cz + 15; z <= cz + 23; z++) w.put(cx, F + 1, z, 'sparkwire');
    for (const x of [cx - 2, cx + 2]) fill(w, x, F + 1, cz + 15, x, F + 4, cz + 15, 'gold');
    fill(w, cx - 2, F + 4, cz + 15, cx + 2, F + 4, cz + 15, 'gold');
    fill(w, cx - 1, F + 1, cz + 24, cx + 1, F + 3, cz + 24, 'iron');
    if (flags.inner_shut) fill(w, cx - 1, F + 1, cz + 15, cx + 1, F + 3, cz + 15, 'iron');
    w.put(cx - 2, F + 2, cz + 19, 'lantern'); w.put(cx + 2, F + 2, cz + 19, 'lantern');
    // the lever that works the doors, just inside the hall
    w.put(AR.lever[0], F + 1, AR.lever[1], 'planks_dark');
    w.put(AR.lever[0], F + 2, AR.lever[1], 'copper');
    // outside the glass: kelp, coral, rocks, glowing weed
    const r = mulberry32(11);
    for (let i = 0; i < 420; i++) {
      const x = Math.floor(r() * 64), z = Math.floor(r() * 64);
      const d = Math.hypot(x - cx, z - cz);
      if (d < R + 1.5) continue;
      if (Math.abs(x - cx) <= 3 && z > cz) continue;
      const t = topY(w, x, z);
      const k = r();
      if (k < 0.4) { const h = 2 + Math.floor(r() * 4); for (let j = 1; j <= h; j++) w.put(x, t + j, z, 'reeds'); }
      else if (k < 0.7) w.put(x, t + 1, z, 'coral');
      else if (k < 0.82) w.put(x, t + 1, z, 'flower_glow');
      else { w.put(x, t + 1, z, 'mossy'); if (r() < 0.5) w.put(x, t + 2, z, 'mossy'); }
    }
    for (const [x, z] of [[8, 14], [54, 10], [56, 52], [6, 48]] as P2[]) sphere(w, x, 10, z, 3, 'mossy', false, true);
  },
};

// ---------------------------------------------------------------------
// Precomputed cell lists for the flood (built from the archive set, so the
// script and the map stay in sync).
// ---------------------------------------------------------------------

class GridWorld {
  data: Uint8Array;
  constructor(public sx: number, public sy: number, public sz: number) { this.data = new Uint8Array(sx * sy * sz); }
  idx(x: number, y: number, z: number) { return (y * this.sz + z) * this.sx + x; }
  inside(x: number, y: number, z: number) { return x >= 0 && y >= 0 && z >= 0 && x < this.sx && y < this.sy && z < this.sz; }
  get(x: number, y: number, z: number) { return this.inside(x, y, z) ? this.data[this.idx(x, y, z)] : 0; }
  name(x: number, y: number, z: number) { return BLOCKS[this.get(x, y, z)].name; }
  solid(x: number, y: number, z: number) { return BLOCKS[this.get(Math.floor(x), Math.floor(y), Math.floor(z))].solid; }
  put(x: number, y: number, z: number, b: string | number) {
    x = Math.floor(x); y = Math.floor(y); z = Math.floor(z);
    if (!this.inside(x, y, z)) return;
    this.data[this.idx(x, y, z)] = typeof b === 'string' ? (BLOCK_ID[b] ?? 0) : b;
  }
}

let arGrid: GridWorld | null = null;
function archiveGrid() {
  if (!arGrid) {
    arGrid = new GridWorld(archive.size[0], archive.size[1], archive.size[2]);
    archive.build(arGrid as unknown as VoxelWorld, {});
  }
  return arGrid;
}

type Cell = [number, number, number, string];

/** Water for every open cell inside the dome at height y (the hall floods layer by layer). */
export function archiveFlood(y: number, zMax = 60): Cell[] {
  const g = archiveGrid();
  const out: Cell[] = [];
  for (let z = 0; z < g.sz; z++) for (let x = 0; x < g.sx; x++) {
    if (z > zMax) continue;
    const d = Math.hypot(x - AR.C[0], z - AR.C[1]);
    const inTunnel = Math.abs(x - AR.C[0]) <= 1 && z >= AR.C[1] + 12 && z <= AR.C[1] + 23;
    if (d > AR.R - 0.6 && !inTunnel) continue;
    const nm = g.name(x, y, z);
    if (nm === 'air' || nm === 'sparkwire') out.push([x, y, z, 'water']);
  }
  return out;
}

/** Glass panes in the north-east of the dome where the gloamlings break in. */
export function archiveCrack(block: string): Cell[] {
  const g = archiveGrid();
  const out: Cell[] = [];
  for (let y = AR.F + 7; y <= AR.F + 12; y++) for (let z = AR.C[1] - 14; z <= AR.C[1] - 4; z++) for (let x = AR.C[0] + 4; x <= AR.C[0] + 14; x++) {
    if (g.name(x, y, z) !== 'glass') continue;
    if (Math.hypot(x - 42.5, y - 20.5, z - 22.5) > 3.2) continue;
    out.push([x, y, z, block]);
  }
  return out;
}

/** A column of falling water from the crack to the floor. */
export function archiveFall(): Cell[] {
  const g = archiveGrid();
  const out: Cell[] = [];
  for (const [x, z] of [[41, 23], [41, 24], [40, 23]] as P2[]) {
    for (let y = AR.F + 1; y <= AR.F + 10; y++) if (g.name(x, y, z) === 'air') out.push([x, y, z, 'water']);
  }
  return out;
}

export const ep2Sets: SetDef[] = [glimmerwood, glasswater, archive];
