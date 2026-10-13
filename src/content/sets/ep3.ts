// Sets for Episode 3: Iron Hollow.
//   hollow   - the great mining cavern: lift, street, plaza, Great Forge, Mags's office
//              on the north terrace, the Crucible arena, the ore yard and lava falls.
//   vault    - the old ore-spur rail tunnel (with a lava trestle) and Mags's vault.
//   deepmine - the lift landing, the old tunnel and Gallery Nine, where the Fray is eating in.
import { fbm, mulberry32 } from '../../core/rng';
import type { SetDef } from '../../render/stage';
import type { VoxelWorld } from '../../render/voxels';
import { edgeBarrier, fence, fill, hollow, house, lampPost, stall } from '../kit';

type W = VoxelWorld;

// ---------------------------------------------------------------------------
// shared helpers

/** Turn exposed rock into ore veins (clustered by noise). */
function oreVeins(w: W, seed: number, x0: number, z0: number, x1: number, z1: number, y0: number, y1: number, spark = 0.35) {
  const r = mulberry32(seed);
  const nb = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
    const n = w.name(x, y, z);
    if (n !== 'stone' && n !== 'basalt') continue;
    let open = false;
    for (const [dx, dy, dz] of nb) if (w.get(x + dx, y + dy, z + dz) === 0) { open = true; break; }
    if (!open) continue;
    const v = fbm(x / 3.2 + y / 5, z / 3.2 - y / 7, seed);
    if (v > 0.66) {
      const k = r();
      w.put(x, y, z, k < spark ? 'ore_spark' : k < spark + 0.4 ? 'ore_iron' : 'ore_gold');
    } else if (v < 0.3 && r() < 0.5) w.put(x, y, z, 'basalt');
  }
}

/** Hang little stalactites (and a few spark-ore "stars") from a cave ceiling. */
function ceilingDressing(w: W, seed: number, x0: number, z0: number, x1: number, z1: number, minY: number, starChance = 0.04) {
  const r = mulberry32(seed);
  for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
    // find the ceiling: first solid going up from minY through air
    let y = minY;
    if (w.get(x, y, z) !== 0) continue;
    while (y < w.sy - 1 && w.get(x, y, z) === 0) y++;
    if (y >= w.sy - 1) continue;
    const roll = r();
    if (roll < 0.05) {
      const len = 1 + Math.floor(r() * 4);
      for (let k = 1; k <= len; k++) if (w.get(x, y - k, z) === 0 && y - k > minY + 3) w.put(x, y - k, z, k === len && r() < 0.3 ? 'ore_spark' : 'stone');
    } else if (roll < 0.05 + starChance) w.put(x, y, z, 'ore_spark');
  }
}

function torchPost(w: W, x: number, y: number, z: number, h = 2) {
  for (let i = 0; i < h; i++) w.put(x, y + i, z, 'planks_dark');
  w.put(x, y + h, z, 'torch');
}

// ===========================================================================
// IRON HOLLOW
// ===========================================================================

const HG = 10; // floor block y in the Hollow; stand at 11
const TY = 18; // terrace (Mags's office level) block y; stand at 19

/** Key places in the Hollow (x, z). Ground stand height is 11; terrace stand height is 19. */
export const IH = {
  lift: [48, 85] as [number, number],
  street: [48, 72] as [number, number],
  plaza: [48, 52] as [number, number],
  forge: [33, 52] as [number, number],
  board: [58, 44] as [number, number],
  stairs: [48, 43] as [number, number],
  balcony: [48, 32] as [number, number],
  officeDoor: [48, 30] as [number, number],
  desk: [48, 22] as [number, number],
  arena: [76, 54] as [number, number],
  magsBox: [89.5, 54.5] as [number, number],
  oreyard: [76, 28] as [number, number],
  spurGate: [78, 17] as [number, number],
  lavafall: [12, 47] as [number, number],
  assay: [22, 40] as [number, number],
  wrenLane: 50,
  fennLane: 58,
};

function hollowCavern(w: W) {
  fill(w, 0, 0, 0, w.sx - 1, w.sy - 1, w.sz - 1, 'stone');
  for (let z = 0; z < w.sz; z++) for (let x = 0; x < w.sx; x++) {
    const n = (fbm(x / 10, z / 10, 5) - 0.5) * 0.22;
    const d = Math.hypot((x - 48) / 44, (z - 50) / 44) + n;
    if (d >= 1) continue;
    const ceil = HG + Math.round(38 * Math.pow(Math.sqrt(1 - d * d), 0.55) + (fbm(x / 6, z / 6, 8) - 0.5) * 6);
    for (let y = HG + 1; y <= Math.min(ceil, w.sy - 3); y++) w.put(x, y, z, 'air');
    const f = fbm(x / 5, z / 5, 2);
    w.put(x, HG, z, f > 0.6 ? 'cobble' : f < 0.38 ? 'stone' : 'gravel');
  }
}

function lavaFall(w: W, z0: number, z1: number, scanFromX: number) {
  for (let z = z0; z <= z1; z++) {
    // wall x at mid height
    let wx = scanFromX;
    while (wx > 0 && w.get(wx, HG + 6, z) === 0) wx--;
    const fx = wx + 1;
    let top = HG + 1;
    while (top < w.sy - 2 && w.get(fx, top, z) === 0) top++;
    for (let y = HG; y < top; y++) w.put(fx, y, z, 'lava');
    // a lip of basalt at the top and a pool at the bottom
    w.put(fx, top - 1, z, 'basalt');
    for (let x = fx; x <= scanFromX; x++) { w.put(x, HG, z, 'lava'); w.put(x, HG - 1, z, 'lava'); }
  }
}

function buildHollow(w: W, flags: Record<string, unknown>) {
  hollowCavern(w);
  oreVeins(w, 11, 0, 0, w.sx - 1, w.sz - 1, HG + 1, w.sy - 2);

  // ---------------- the lava river and falls (west) ----------------
  for (let z = 16; z <= 86; z++) for (let x = 12; x <= 15; x++) {
    if (w.get(x, HG + 2, z) !== 0) continue;
    w.put(x, HG, z, 'lava'); w.put(x, HG - 1, z, 'lava');
  }
  for (let z = 16; z <= 86; z++) for (const x of [11, 16]) if (w.get(x, HG + 2, z) === 0 && w.name(x, HG, z) !== 'lava') w.put(x, HG + 1, z, 'basalt');
  lavaFall(w, 44, 50, 12);
  lavaFall(w, 64, 66, 12);
  // a bridge over the river to the fall-side ledge
  fill(w, 10, HG + 1, 40, 17, HG + 1, 41, 'planks_dark');
  // glass-covered lava channel feeding the Great Forge
  for (let x = 16; x <= 30; x++) { w.put(x, HG - 1, 52, 'lava'); w.put(x, HG, 52, 'glass'); w.put(x, HG + 1, 52, 'air'); }

  // ---------------- north terrace (Mags's level) ----------------
  for (let z = 0; z <= 34; z++) for (let x = 26; x <= 64; x++) {
    if (w.get(x, HG + 1, z) !== 0) continue;
    fill(w, x, HG + 1, z, x, TY, z, 'stone');
    w.put(x, TY, z, (x + z) % 7 === 0 ? 'gravel' : 'cobble');
  }
  // terrace cliff face: brick facade with lit windows, doors, little balconies
  for (let x = 26; x <= 64; x++) for (let y = HG + 1; y <= TY; y++) if (w.get(x, y, 35) === 0 && w.get(x, y, 34) !== 0) w.put(x, y, 34, y === TY ? 'planks_dark' : y % 4 === 0 ? 'planks_dark' : 'brick');
  for (const x of [28, 32, 36, 40, 56, 60]) { w.put(x, 13, 34, 'glass'); w.put(x, 14, 34, 'glass'); w.put(x, 13, 33, 'lantern'); }
  for (const x of [30, 38, 58, 62]) { w.put(x, 11, 34, 'planks_dark'); w.put(x, 12, 34, 'planks_dark'); w.put(x, 13, 35, 'torch'); }
  for (const [a, b] of [[27, 33], [55, 61]]) {
    fill(w, a, 15, 35, b, 15, 36, 'planks');
    for (const px of [a, b]) fill(w, px, HG + 1, 36, px, 14, 36, 'log');
    fence(w, a, 37, b, 37, 15, 'log');
    w.put(a, 16, 37, 'lantern'); w.put(b, 16, 37, 'lantern');
  }
  // grand stairs up from the plaza (x 46..50)
  for (let k = 1; k <= 8; k++) fill(w, 46, HG + 1, 43 - k, 50, HG + k, 43 - k, k % 2 ? 'cobble' : 'stone');
  for (const x of [45, 51]) for (let k = 1; k <= 8; k++) fill(w, x, HG + 1, 43 - k, x, HG + k + 1, 43 - k, 'brick');
  for (const x of [45, 51]) w.put(x, HG + 3, 42, 'lantern');
  // balcony rail along the terrace edge (gap for the stairs)
  fence(w, 27, 34, 44, 34, TY + 1, 'log');
  fence(w, 52, 34, 63, 34, TY + 1, 'log');
  for (const x of [27, 44, 52, 63]) w.put(x, TY + 2, 34, 'lantern');

  // ---------------- Mags's office ----------------
  const ox0 = 40, ox1 = 56, oz0 = 18, oz1 = 30;
  hollow(w, ox0, TY, oz0, ox1, TY + 7, oz1, 'brick');
  fill(w, ox0 + 1, TY, oz0 + 1, ox1 - 1, TY, oz1 - 1, 'planks_dark');
  for (const [cx, cz] of [[ox0, oz0], [ox1, oz0], [ox0, oz1], [ox1, oz1]]) fill(w, cx, TY + 1, cz, cx, TY + 7, cz, 'iron');
  fill(w, ox0, TY + 7, oz0, ox1, TY + 7, oz1, 'iron');
  fill(w, ox0 + 1, TY + 7, oz0 + 1, ox1 - 1, TY + 7, oz1 - 1, 'planks_dark');
  // front: windows, double door, sign
  fill(w, 42, TY + 2, oz1, 45, TY + 4, oz1, 'glass');
  fill(w, 51, TY + 2, oz1, 54, TY + 4, oz1, 'glass');
  fill(w, 47, TY + 1, oz1, 48, TY + 2, oz1, 'air');
  fill(w, 46, TY + 3, oz1, 49, TY + 3, oz1, 'planks_dark');
  fill(w, 46, TY + 4, oz1 + 1, 49, TY + 5, oz1 + 1, 'banner_red');
  for (const x of [45, 50]) w.put(x, TY + 3, oz1 + 1, 'lantern');
  w.put(47, TY + 6, oz1 + 1, 'gold'); w.put(48, TY + 6, oz1 + 1, 'gold');
  // side windows
  for (const z of [22, 26]) { fill(w, ox0, TY + 2, z, ox0, TY + 3, z, 'glass'); fill(w, ox1, TY + 2, z, ox1, TY + 3, z, 'glass'); }
  // chimney + rooftop clutter
  fill(w, 54, TY + 8, 20, 54, TY + 12, 20, 'iron');
  w.put(42, TY + 8, 20, 'crate'); w.put(43, TY + 8, 20, 'crate');
  // interior: desk, chair, shelves, safe, maps, display cases, carpet
  fill(w, 47, TY, 23, 49, TY, 29, 'carpet');
  fill(w, 45, TY + 1, 22, 51, TY + 1, 22, 'table');
  w.put(45, TY + 2, 22, 'lantern');
  w.put(48, TY + 1, 19, 'planks_dark'); w.put(48, TY + 2, 19, 'planks_dark'); w.put(48, TY + 3, 19, 'gold');
  fill(w, ox0 + 1, TY + 1, 20, ox0 + 1, TY + 3, 28, 'bookshelf');
  fill(w, 54, TY + 1, 19, 55, TY + 2, 19, 'iron'); w.put(54, TY + 2, 19, 'gold');
  fill(w, 43, TY + 3, oz0, 46, TY + 4, oz0, 'map');
  fill(w, 50, TY + 3, oz0, 53, TY + 4, oz0, 'map');
  for (const z of [21, 23, 25, 27]) { w.put(ox1, TY + 3, z, z % 4 === 1 ? 'gold' : 'copper'); w.put(ox1, TY + 2, z, 'planks_dark'); }
  for (const [lx, lz] of [[ox0 + 1, oz0 + 1], [ox1 - 1, oz0 + 1], [ox0 + 1, oz1 - 1], [ox1 - 1, oz1 - 1]]) w.put(lx, TY + 5, lz, 'lantern');
  w.put(44, TY + 1, 28, 'crate'); w.put(52, TY + 1, 28, 'crate'); w.put(52, TY + 2, 28, 'crate');

  // terrace dressing: crates, lamps, a winch for hauling ore up
  lampPost(w, 34, TY + 1, 30, 2); lampPost(w, 60, TY + 1, 30, 2); lampPost(w, 34, TY + 1, 20, 2);
  w.put(30, TY + 1, 28, 'crate'); w.put(31, TY + 1, 28, 'crate'); w.put(30, TY + 2, 28, 'crate');
  w.put(61, TY + 1, 24, 'hay'); w.put(62, TY + 1, 24, 'crate');
  // small houses on the terrace, behind the office
  house(w, 28, TY + 1, 12, 8, 7, 4, { wall: 'planks', frame: 'log', roof: 'copper', door: 's', interior: false });
  house(w, 58, TY + 1, 12, 6, 7, 4, { wall: 'brick', frame: 'planks_dark', roof: 'copper', door: 's', interior: false });

  // ---------------- plaza ----------------
  for (let z = 40; z <= 64; z++) for (let x = 36; x <= 60; x++) {
    const d = Math.hypot(x - 48, z - 52);
    if (d > 11.5 || w.get(x, HG + 1, z) !== 0) continue;
    const ring = Math.floor(d);
    w.put(x, HG, z, d < 2.2 ? 'iron' : ring === 6 ? 'brick' : ring === 3 ? 'cobble' : ring === 10 ? 'planks_dark' : 'stone');
  }
  for (const [x, z] of [[48, 50], [48, 54], [46, 52], [50, 52]]) w.put(x, HG, z, 'gold');
  for (const a of [0.4, 1.2, 2.0, 2.8, 3.6, 4.4, 5.2, 6.0]) {
    const x = Math.round(48 + Math.cos(a) * 10.5), z = Math.round(52 + Math.sin(a) * 10.5);
    if (z < 44 && Math.abs(x - 48) < 4) continue;
    if (w.get(x, HG + 1, z) === 0) lampPost(w, x, HG + 1, z, 3);
  }
  // the Great Forge
  const fx0 = 29, fz0 = 49;
  hollow(w, fx0, HG + 1, fz0, fx0 + 6, HG + 7, fz0 + 6, 'brick');
  fill(w, fx0 + 1, HG + 1, fz0 + 1, fx0 + 5, HG + 1, fz0 + 5, 'basalt');
  fill(w, fx0 + 2, HG + 1, fz0 + 2, fx0 + 4, HG + 2, fz0 + 4, 'lava');
  fill(w, fx0 + 6, HG + 2, fz0 + 2, fx0 + 6, HG + 4, fz0 + 4, 'air'); // the mouth faces the plaza
  fill(w, fx0 + 2, HG + 7, fz0 + 2, fx0 + 4, HG + 7, fz0 + 4, 'iron');
  for (let y = HG + 8; y < w.sy - 3; y++) { if (w.get(fx0 + 3, y, fz0 + 3) !== 0) break; fill(w, fx0 + 2, y, fz0 + 2, fx0 + 4, y, fz0 + 4, y % 5 === 0 ? 'iron' : 'brick'); }
  for (const [cx, cz] of [[fx0, fz0], [fx0 + 6, fz0], [fx0, fz0 + 6], [fx0 + 6, fz0 + 6]]) fill(w, cx, HG + 1, cz, cx, HG + 8, cz, 'iron');
  w.put(38, HG + 1, 50, 'iron'); w.put(38, HG + 1, 54, 'iron'); // anvils
  w.put(37, HG + 1, 49, 'crate'); w.put(37, HG + 1, 55, 'basalt');

  // the exchange board
  fill(w, 56, HG + 1, 44, 60, HG + 3, 44, 'planks_dark');
  for (const [x, y] of [[56, 12], [57, 13], [58, 12], [59, 13], [60, 12], [57, 11], [59, 11]]) w.put(x, y, 44, 'paper');
  fill(w, 55, HG + 4, 43, 61, HG + 4, 45, 'awning_b');
  for (const x of [55, 61]) fill(w, x, HG + 1, 44, x, HG + 3, 44, 'log');

  // ---------------- the street to the lift ----------------
  for (let z = 62; z <= 84; z++) for (let x = 42; x <= 55; x++) if (w.get(x, HG + 1, z) === 0) w.put(x, HG, z, x === 42 || x === 55 ? 'gravel' : (x + z) % 9 === 0 ? 'stone' : 'cobble');
  house(w, 32, HG + 1, 64, 9, 7, 5, { wall: 'brick', frame: 'log', roof: 'copper', door: 'e', interior: false });
  house(w, 32, HG + 1, 73, 9, 7, 5, { wall: 'planks', frame: 'planks_dark', roof: 'roof_red', door: 'e', interior: false });
  house(w, 57, HG + 1, 66, 9, 7, 5, { wall: 'planks_pale', frame: 'log', roof: 'copper', door: 'w', interior: false });
  house(w, 57, HG + 1, 75, 9, 7, 5, { wall: 'brick', frame: 'planks_dark', roof: 'roof_red', door: 'w', interior: false });
  for (const [x, z] of [[41, 66], [41, 70], [41, 76], [41, 80], [56, 68], [56, 72], [56, 78], [56, 82]]) w.put(x, HG + 3, z, 'lantern');
  // a mushroom-skewer stall
  stall(w, 44, HG + 1, 66, 'awning');
  w.put(43, HG + 1, 65, 'crate'); w.put(43, HG + 2, 65, 'mushroom');
  for (const z of [64, 70, 76, 82]) { lampPost(w, 42, HG + 1, z, 3); }

  // ---------------- the great lift ----------------
  for (let y = HG + 1; y < w.sy - 1; y++) fill(w, 44, y, 81, 52, y, 89, 'air');
  fill(w, 45, HG, 82, 51, HG, 88, 'planks_dark');
  fill(w, 46, HG, 83, 50, HG, 87, 'planks');
  for (const [px, pz] of [[45, 82], [51, 82], [45, 88], [51, 88]]) fill(w, px, HG + 1, pz, px, w.sy - 2, pz, 'log');
  for (let y = HG + 6; y < w.sy - 2; y += 7) { fill(w, 45, y, 82, 51, y, 82, 'iron'); fill(w, 45, y, 88, 51, y, 88, 'iron'); }
  fill(w, 46, HG + 1, 88, 50, HG + 1, 88, 'planks_dark');
  fill(w, 45, HG + 1, 83, 45, HG + 1, 87, 'planks_dark');
  fill(w, 51, HG + 1, 83, 51, HG + 1, 87, 'planks_dark');
  for (const [lx, lz] of [[45, 82], [51, 82], [45, 88], [51, 88]]) w.put(lx, HG + 5, lz, 'lantern');
  // the winch house at the foot of the lift
  fill(w, 53, HG + 1, 84, 55, HG + 2, 86, 'planks_dark'); w.put(54, HG + 3, 85, 'copper'); w.put(53, HG + 3, 84, 'lantern');

  // ---------------- rails ----------------
  const rail = (x: number, z: number) => { if (w.get(x, HG + 1, z) === 0 && w.name(x, HG, z) !== 'lava') { w.put(x, HG + 1, z, 'rail'); } };
  for (let z = 38; z <= 86; z++) rail(55, z);
  for (let x = 55; x <= 86; x++) rail(x, 38);
  for (let z = 6; z <= 38; z++) rail(78, z);
  for (let z = 20; z <= 38; z++) rail(70, z);
  // sparkwire running beside the rails and up the street
  for (let z = 40; z <= 86; z += 1) if (w.get(54, HG + 1, z) === 0) w.put(54, HG + 1, z, z % 6 === 0 ? 'copper' : 'sparkwire');
  for (let x = 56; x <= 86; x++) if (w.get(x, HG + 1, 37) === 0) w.put(x, HG + 1, 37, x % 6 === 0 ? 'copper' : 'sparkwire');

  // ---------------- elevated rail trestle across the cavern ----------------
  for (let x = 4; x <= 92; x++) {
    if (w.get(x, 21, 72) !== 0 || w.get(x, 23, 72) !== 0) continue;
    fill(w, x, 21, 71, x, 21, 73, x % 5 === 0 ? 'planks_dark' : 'planks');
    w.put(x, 22, 72, 'rail');
    if (x % 8 === 0) { w.put(x, 22, 71, 'lantern'); }
  }
  for (const x of [20, 30, 41, 56, 68, 80]) for (const z of [71, 73]) for (let y = HG + 1; y <= 20; y++) if (w.get(x, y, z) === 0) w.put(x, y, z, 'log');

  // ---------------- the Crucible arena ----------------
  const [ax, az] = IH.arena;
  for (let z = az - 16; z <= az + 16; z++) for (let x = ax - 16; x <= ax + 16; x++) {
    const d = Math.hypot(x - ax, z - az);
    if (d > 15.5) continue;
    fill(w, x, HG + 1, z, x, HG + 13, z, 'air');
    const entry = x < ax && Math.abs(z - az) <= 1;
    if (d <= 10) {
      const tr = x >= ax - 1 && x <= ax + 1;
      w.put(x, HG, z, tr ? 'lava' : d > 9 ? 'iron' : (Math.floor(d) % 3 === 0 ? 'cobble' : 'stone'));
      if (tr) w.put(x, HG - 1, z, 'lava');
    } else if (d <= 11.5) {
      if (entry) w.put(x, HG, z, 'cobble');
      else { w.put(x, HG, z, 'lava'); w.put(x, HG - 1, z, 'lava'); }
    } else {
      w.put(x, HG, z, 'cobble');
      if (entry) continue;
      const k = Math.min(3, Math.floor(d - 11.5));
      fill(w, x, HG + 1, z, x, HG + 1 + k, z, k % 2 ? 'cobble' : 'brick');
    }
  }
  // lanterns and banners around the back row
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const x = Math.round(ax + Math.cos(a) * 15), z = Math.round(az + Math.sin(a) * 15);
    if (x < ax && Math.abs(z - az) <= 2) continue;
    const y = HG + 5;
    if (i % 2) { w.put(x, y, z, 'planks_dark'); w.put(x, y + 1, z, 'lantern'); } else { w.put(x, y, z, 'banner_red'); w.put(x, y + 1, z, 'banner_red'); }
  }
  // Mags's box on the east side
  fill(w, 87, HG + 1, 51, 91, HG + 5, 57, 'brick');
  fill(w, 87, HG + 5, 52, 91, HG + 5, 56, 'carpet');
  fence(w, 87, 51, 87, 57, HG + 6, 'log');
  w.put(91, HG + 6, 54, 'gold'); w.put(91, HG + 7, 54, 'gold');
  w.put(87, HG + 7, 51, 'lantern'); w.put(87, HG + 7, 57, 'lantern');
  // build-site markers on the west half and the material stockpile
  for (const lz of [IH.wrenLane, IH.fennLane]) { w.put(74, HG, lz - 1, 'planks_dark'); w.put(74, HG, lz + 1, 'planks_dark'); w.put(78, HG, lz - 1, 'planks_dark'); w.put(78, HG, lz + 1, 'planks_dark'); }
  w.put(70, HG + 1, 46, 'iron'); w.put(71, HG + 1, 46, 'iron'); w.put(70, HG + 2, 46, 'iron');
  w.put(73, HG + 1, 45, 'planks'); w.put(74, HG + 1, 45, 'planks'); w.put(73, HG + 2, 45, 'planks');
  w.put(70, HG + 1, 62, 'copper'); w.put(71, HG + 1, 62, 'sparkwire'); w.put(72, HG + 1, 62, 'crate');
  // the arena's finished bridges (after the Crucible is won)
  if (flags.e3_crucible_built) fill(w, 75, HG, IH.wrenLane - 1, 77, HG, IH.wrenLane + 1, 'planks');

  // ---------------- ore yard and the old spur ----------------
  house(w, 82, HG + 1, 22, 7, 7, 5, { wall: 'brick', frame: 'iron', roof: 'basalt', door: 'w', interior: false });
  for (const [x, z] of [[70, 26], [70, 31], [78, 30]]) { w.put(x, HG + 1, z, 'iron'); w.put(x, HG + 2, z, 'ore_gold'); }
  // crane
  fill(w, 66, HG + 1, 22, 66, HG + 10, 22, 'log');
  fill(w, 66, HG + 10, 22, 73, HG + 10, 22, 'planks_dark');
  fill(w, 73, HG + 7, 22, 73, HG + 9, 22, 'iron');
  // ore heaps and crates
  for (const [x, z, b] of [[74, 33, 'ore_iron'], [75, 33, 'ore_iron'], [74, 34, 'ore_gold'], [84, 33, 'crate'], [85, 33, 'crate'], [84, 32, 'crate'], [67, 34, 'hay']] as const) w.put(x, HG + 1, z, b);
  lampPost(w, 72, HG + 1, 36, 3); lampPost(w, 84, HG + 1, 36, 3); lampPost(w, 76, HG + 1, 20, 3);
  // the spur tunnel and its gate
  for (let z = 4; z <= 19; z++) fill(w, 77, HG + 1, z, 79, HG + 4, z, 'air');
  for (let z = 4; z <= 19; z++) w.put(78, HG + 1, z, 'rail');
  fill(w, 76, HG + 1, 18, 80, HG + 5, 18, 'iron');
  for (const [x, y] of [[77, 12], [79, 12], [78, 11], [77, 14], [79, 14], [78, 13]]) w.put(x, y, 18, 'air');
  w.put(76, HG + 3, 19, 'torch'); w.put(80, HG + 3, 19, 'torch');
  for (let z = 6; z <= 16; z += 5) { w.put(77, HG + 3, z, 'torch'); }

  // ---------------- the assayers' hall (west) ----------------
  house(w, 18, HG + 1, 34, 11, 9, 6, { wall: 'brick', frame: 'marble', roof: 'roof_blue', door: 'e', interior: true, floor: 'marble_tile' });

  // ---------------- dressing ----------------
  lampPost(w, 20, HG + 1, 46, 3); lampPost(w, 20, HG + 1, 58, 3); lampPost(w, 24, HG + 1, 66, 3);
  for (const [x, z] of [[62, 46], [62, 58], [40, 44], [56, 60]]) if (w.get(x, HG + 1, z) === 0) torchPost(w, x, HG + 1, z, 2);
  ceilingDressing(w, 12, 2, 2, w.sx - 3, w.sz - 3, HG + 14, 0.05);
  edgeBarrier(w, 1, 1, w.sx - 2, w.sz - 2, HG + 1, HG + 12);
}

export const hollowSet: SetDef = {
  id: 'hollow',
  size: [96, 60, 96],
  sky: 'cave',
  cams: {
    wide: { pos: [62, 27, 68], look: [44, 12, 46] },
    descend: { pos: [55, 34, 92], look: [48, 14, 84] },
    lift: { pos: [54, 15, 75], look: [48, 12, 85] },
    street: { pos: [52, 16, 86], look: [48, 12, 62] },
    plaza: { pos: [53, 19, 66], look: [48, 12, 50] },
    forge: { pos: [42, 14, 58], look: [33, 13, 52] },
    lavafall: { pos: [26, 16, 54], look: [9, 20, 47] },
    terrace: { pos: [48, 16, 52], look: [48, 19, 30] },
    office: { pos: [50.2, 23.6, 28.8], look: [48.3, 20.2, 20.5] },
    officeDoor: { pos: [48, 21.5, 20], look: [48, 20, 28] },
    balcony: { pos: [42, 21.5, 33], look: [52, 13, 58] },
    balconyClose: { pos: [53, 21, 37], look: [48, 19.5, 32] },
    arena: { pos: [60, 19, 54], look: [76, 11, 54] },
    arenaHigh: { pos: [62, 25, 68], look: [76, 11, 54] },
    arenaBuild: { pos: [68, 16, 39], look: [76, 11, 52] },
    magsBox: { pos: [80, 16, 50], look: [89.5, 17, 54.5] },
    oreyard: { pos: [66, 16, 40], look: [78, 12, 22] },
    spur: { pos: [74, 13, 26], look: [78, 12, 16] },
    crowd: { pos: [48, 15, 41], look: [48, 12, 60] },
  },
  lights: [
    { at: [48.5, 15, 84.5], color: '#ffc070', intensity: 4, dist: 12 },
    { at: [48.5, 16, 52.5], color: '#ffb060', intensity: 5, dist: 16 },
    { at: [36.5, 14, 52.5], color: '#ff7a2a', intensity: 4, dist: 10 },
    { at: [48.5, 23, 24.5], color: '#ffc880', intensity: 4, dist: 10 },
    { at: [48.5, 22, 32.5], color: '#ffb060', intensity: 3, dist: 8 },
    { at: [72.5, 15, 50.5], color: '#ffb070', intensity: 5, dist: 12 },
    { at: [72.5, 15, 58.5], color: '#ffb070', intensity: 4, dist: 10 },
    { at: [86.5, 19, 54.5], color: '#ffc080', intensity: 4, dist: 9 },
    { at: [77.5, 15, 28.5], color: '#ffb060', intensity: 3, dist: 12 },
  ],
  build: buildHollow,
};

// ===========================================================================
// THE VAULT (and the old spur tunnel)
// ===========================================================================

const VG = 8; // floor block y; stand at 9

/** Key places in the vault set (x, z). Stand height is 9 everywhere except the trestle (also 9). */
export const VT = {
  tunnelStart: [6, 32] as [number, number],
  lowBeam: [26, 32] as [number, number],
  trestle: [40, 32] as [number, number],
  gap: [41, 32] as [number, number],
  junction: [50, 32] as [number, number],
  dock: [55, 32] as [number, number],
  anchor: [74, 34] as [number, number],
  desk: [83, 23] as [number, number],
  door: [74, 50] as [number, number],
  shelves: [62, 22] as [number, number],
};

function buildVault(w: W, flags: Record<string, unknown>) {
  fill(w, 0, 0, 0, w.sx - 1, w.sy - 1, w.sz - 1, 'stone');
  // ---------------- the spur tunnel ----------------
  for (let x = 1; x <= 57; x++) {
    for (let z = 29; z <= 35; z++) {
      const edge = z === 29 || z === 35;
      fill(w, x, VG + 1, z, x, VG + (edge ? 5 : 7), z, 'air');
      w.put(x, VG, z, (x * 7 + z * 3) % 11 === 0 ? 'cobble' : 'gravel');
    }
    w.put(x, VG + 1, 32, 'rail');
    if (x % 6 === 0) {
      fill(w, x, VG + 1, 29, x, VG + 5, 29, 'log');
      fill(w, x, VG + 1, 35, x, VG + 5, 35, 'log');
      fill(w, x, VG + 6, 29, x, VG + 6, 35, 'planks_dark');
      w.put(x, VG + 4, 30, 'torch');
    }
    if (x % 6 !== 0) { w.put(x, VG + 1, 30, 'sparkwire'); w.put(x, VG + 1, 34, 'sparkwire'); }
    if (x % 12 === 6) w.put(x, VG + 5, 32, 'lantern');
  }
  // side branch at the junction heading north (to the old smelters)
  for (let z = 14; z <= 29; z++) for (let x = 48; x <= 52; x++) { fill(w, x, VG + 1, z, x, VG + 5, z, 'air'); w.put(x, VG, z, 'gravel'); }
  for (let z = 14; z <= 31; z++) w.put(50, VG + 1, z, 'rail');
  w.put(48, VG + 3, 22, 'torch');
  // the low beam (duck!)
  fill(w, VT.lowBeam[0], VG + 3, 29, VT.lowBeam[0], VG + 3, 35, 'log');
  fill(w, VT.lowBeam[0] + 1, VG + 3, 29, VT.lowBeam[0] + 1, VG + 3, 35, 'planks_dark');
  // the lava chasm with the rail trestle
  for (let x = 34; x <= 46; x++) for (let z = 22; z <= 42; z++) {
    const dz = Math.abs(z - 32), dx = Math.abs(x - 40);
    if (dz > 10 - (dx > 4 ? (dx - 4) * 2 : 0)) continue;
    fill(w, x, 1, z, x, VG + 9, z, 'air');
    w.put(x, 1, z, 'lava'); w.put(x, 0, z, 'lava');
  }
  for (let x = 34; x <= 46; x++) {
    fill(w, x, VG, 31, x, VG, 33, x % 3 === 0 ? 'planks_dark' : 'planks');
    w.put(x, VG + 1, 32, 'rail');
    if (x % 3 === 1) for (const z of [31, 33]) fill(w, x, 2, z, x, VG - 1, z, 'log');
  }
  // the broken gap in the trestle
  fill(w, VT.gap[0], VG, 31, VT.gap[0] + 1, VG + 1, 33, 'air');
  w.put(VT.gap[0] - 1, VG - 1, 32, 'planks_dark');
  // the buffer and loading dock
  fill(w, 56, VG + 1, 31, 56, VG + 2, 33, 'log');
  w.put(56, VG + 3, 32, 'iron');
  fill(w, 52, VG + 1, 29, 55, VG + 1, 29, 'crate');
  w.put(53, VG + 2, 29, 'crate');
  w.put(57, VG + 3, 30, 'lantern'); w.put(57, VG + 3, 34, 'lantern');
  w.put(1, VG + 4, 30, 'lantern'); w.put(1, VG + 4, 34, 'lantern');
  // an old cart at the start of the line
  fill(w, 3, VG + 1, 31, 4, VG + 1, 31, 'iron');
  fill(w, 3, VG + 1, 33, 4, VG + 1, 33, 'iron');
  w.put(2, VG + 1, 32, 'iron');
  // a brake lever post
  w.put(8, VG + 1, 35, 'planks_dark'); w.put(8, VG + 2, 35, 'iron');
  // ---------------- the vault ----------------
  const vx0 = 58, vx1 = 90, vz0 = 18, vz1 = 50;
  fill(w, vx0, VG + 1, vz0, vx1, VG + 12, vz1, 'iron');
  fill(w, vx0 + 1, VG + 1, vz0 + 1, vx1 - 1, VG + 11, vz1 - 1, 'air');
  fill(w, vx0 + 1, VG, vz0 + 1, vx1 - 1, VG, vz1 - 1, 'marble_tile');
  for (let x = vx0 + 1; x < vx1; x++) for (let z = vz0 + 1; z < vz1; z++) if ((x + z) % 4 === 0) w.put(x, VG, z, 'marble');
  fill(w, 73, VG, vz0 + 1, 75, VG, vz1 - 1, 'carpet');
  fill(w, vx0 + 1, VG, 31, 72, VG, 33, 'carpet');
  // gold trim bands and stone pillars
  for (let x = vx0; x <= vx1; x++) for (const z of [vz0, vz1]) { w.put(x, VG + 4, z, 'gold'); w.put(x, VG + 9, z, 'gold'); }
  for (let z = vz0; z <= vz1; z++) for (const x of [vx0, vx1]) { w.put(x, VG + 4, z, 'gold'); w.put(x, VG + 9, z, 'gold'); }
  for (const [px, pz] of [[66, 26], [82, 26], [66, 42], [82, 42]]) {
    fill(w, px, VG + 1, pz, px + 1, VG + 11, pz + 1, 'marble');
    fill(w, px, VG + 1, pz, px + 1, VG + 1, pz + 1, 'gold');
    w.put(px, VG + 5, pz + 2, 'lantern'); w.put(px + 1, VG + 5, pz - 1, 'lantern');
  }
  // the dock door (west) and the great door (south)
  fill(w, vx0, VG + 1, 31, vx0, VG + 3, 33, 'air');
  fill(w, 73, VG + 1, vz1, 75, VG + 4, vz1, flags.e3_vault_open ? 'air' : 'gold');
  for (let z = vz1 + 1; z <= 63; z++) { fill(w, 72, VG + 1, z, 76, VG + 5, z, 'air'); w.put(72, VG, z, 'cobble'); fill(w, 73, VG, z, 75, VG, z, 'carpet'); w.put(76, VG, z, 'cobble'); }
  for (let z = vz1 + 3; z <= 63; z += 4) { w.put(72, VG + 3, z, 'lantern'); w.put(76, VG + 3, z, 'lantern'); }
  // the Ember Anchor on its pedestal in a glass case
  const [ex, ez] = VT.anchor;
  fill(w, ex - 2, VG + 1, ez - 2, ex + 2, VG + 1, ez + 2, 'gold');
  fill(w, ex - 1, VG + 2, ez - 1, ex + 1, VG + 2, ez + 1, 'marble');
  if (!flags.e3_anchor_taken) {
    w.put(ex, VG + 3, ez, 'ember');
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) if (dx || dz) fill(w, ex + dx, VG + 3, ez + dz, ex + dx, VG + 4, ez + dz, 'glass');
    fill(w, ex - 1, VG + 5, ez - 1, ex + 1, VG + 5, ez + 1, 'glass');
  }
  // treasure: shelves, crates, ore and gold, Mags's "fine work" displays
  for (let x = 60; x <= 70; x++) { w.put(x, VG + 1, 19, 'bookshelf'); w.put(x, VG + 2, 19, x % 3 ? 'bookshelf' : 'gold'); w.put(x, VG + 3, 19, 'bookshelf'); }
  for (const [x, z] of [[60, 46], [61, 46], [60, 45], [62, 46], [60, 46]]) w.put(x, VG + 1, z, 'crate');
  w.put(60, VG + 2, 46, 'crate'); w.put(61, VG + 2, 46, 'gold');
  for (const [x, z] of [[86, 44], [87, 44], [87, 45], [88, 44], [88, 45], [88, 46], [87, 46]]) { w.put(x, VG + 1, z, 'gold'); }
  w.put(88, VG + 2, 45, 'gold'); w.put(87, VG + 2, 45, 'ore_gold'); w.put(88, VG + 2, 44, 'ore_gold');
  for (const [x, z] of [[86, 36], [86, 39]]) { w.put(x, VG + 1, z, 'planks_pale'); w.put(x, VG + 2, z, 'glass'); }
  w.put(86, VG + 1, 36, 'copper'); w.put(86, VG + 1, 39, 'gold');
  fill(w, 62, VG + 1, 36, 62, VG + 1, 38, 'planks_pale'); w.put(62, VG + 2, 37, 'glass'); w.put(62, VG + 2, 36, 'lantern'); w.put(62, VG + 2, 38, 'wool_red');
  // Mags's desk in the north-east corner
  fill(w, 81, VG + 1, 23, 85, VG + 1, 23, 'table');
  w.put(82, VG + 2, 23, 'paper'); w.put(84, VG + 2, 23, 'lantern');
  w.put(83, VG + 1, 21, 'planks_dark'); w.put(83, VG + 2, 21, 'planks_dark');
  fill(w, 87, VG + 1, 19, 89, VG + 3, 19, 'map');
  w.put(89, VG + 1, 21, 'iron'); w.put(89, VG + 2, 21, 'iron');
  // ceiling lanterns
  for (const [x, z] of [[66, 34], [82, 34], [74, 24], [74, 44]]) w.put(x, VG + 11, z, 'lantern');
  edgeBarrier(w, 1, 1, w.sx - 2, w.sz - 2, VG + 1, VG + 8);
}

export const vaultSet: SetDef = {
  id: 'vault',
  size: [96, 34, 66],
  sky: 'cave',
  cams: {
    wide: { pos: [64, 16, 46], look: [76, 10, 30] },
    entry: { pos: [62, 13, 38], look: [74, 11, 33] },
    anchor: { pos: [70.5, 13, 38.5], look: [74.5, 11.5, 34.5] },
    desk: { pos: [79, 12.5, 27], look: [83, 10, 22.5] },
    door: { pos: [74, 13, 36], look: [74, 10, 50] },
    tunnelStart: { pos: [12, 12, 30.5], look: [3, 10, 32] },
    tunnelRun: { pos: [2, 12, 32], look: [14, 10, 32] },
    beam: { pos: [32, 11.5, 33], look: [24, 10, 32] },
    trestle: { pos: [44, 13, 39], look: [39, 8, 32] },
    trestleLow: { pos: [38, 4, 39], look: [41, 9, 32] },
    junction: { pos: [54, 12, 34], look: [48, 10, 30] },
    dock: { pos: [50, 12, 30], look: [57, 10, 32] },
  },
  lights: [
    { at: [74.5, 13, 34.5], color: '#ff8a3a', intensity: 6, dist: 14 },
    { at: [83, 12, 25], color: '#ffc880', intensity: 3, dist: 8 },
    { at: [10, 12, 32], color: '#ffb060', intensity: 3, dist: 10 },
    { at: [40, 6, 32], color: '#ff7a2a', intensity: 4, dist: 12 },
    { at: [54, 12, 32], color: '#ffb060', intensity: 3, dist: 9 },
  ],
  build: buildVault,
};

// ===========================================================================
// THE DEEP MINE: Gallery Nine
// ===========================================================================

const DG = 10; // floor block y; stand at 11

/** Key places in the deep mine (x, z). Stand height is 11. */
export const DM = {
  landing: [48, 87] as [number, number],
  bench: [41, 82] as [number, number],
  supplies: [55, 80] as [number, number],
  trail: [46, 68] as [number, number],
  tunnel: [48, 70] as [number, number],
  chasmSouth: [48, 45] as [number, number],
  chasmNorth: [48, 34] as [number, number],
  cage: [48, 24] as [number, number],
  pump: [66, 50] as [number, number],
  pool: [30, 52] as [number, number],
};

function buildDeepmine(w: W, flags: Record<string, unknown>) {
  fill(w, 0, 0, 0, w.sx - 1, w.sy - 1, w.sz - 1, 'stone');
  const carveRoom = (cx: number, cz: number, rx: number, rz: number, h: number, seed: number) => {
    for (let z = cz - rz - 2; z <= cz + rz + 2; z++) for (let x = cx - rx - 2; x <= cx + rx + 2; x++) {
      const d = Math.hypot((x - cx) / rx, (z - cz) / rz) + (fbm(x / 6, z / 6, seed) - 0.5) * 0.25;
      if (d >= 1) continue;
      const top = DG + Math.max(3, Math.round(h * Math.pow(Math.sqrt(1 - d * d), 0.5)));
      fill(w, x, DG + 1, z, x, top, z, 'air');
      const f = fbm(x / 4, z / 4, seed + 3);
      w.put(x, DG, z, f > 0.62 ? 'gravel' : f < 0.35 ? 'basalt' : 'stone');
    }
  };
  // landing chamber, tunnel, Gallery Nine
  carveRoom(48, 84, 12, 9, 10, 21);
  for (let z = 60; z <= 78; z++) for (let x = 45; x <= 51; x++) { fill(w, x, DG + 1, z, x, DG + (x === 45 || x === 51 ? 5 : 6), z, 'air'); w.put(x, DG, z, (x + z) % 5 ? 'gravel' : 'stone'); }
  carveRoom(48, 40, 28, 25, 16, 22);
  oreVeins(w, 23, 0, 0, w.sx - 1, w.sz - 1, DG + 1, w.sy - 2, 0.55);

  // ---------------- the lift landing ----------------
  for (let y = DG + 1; y < w.sy - 1; y++) fill(w, 45, y, 86, 51, y, 92, 'air');
  fill(w, 45, DG, 86, 51, DG, 92, 'planks_dark');
  fill(w, 46, DG, 87, 50, DG, 91, 'planks');
  for (const [px, pz] of [[45, 86], [51, 86], [45, 92], [51, 92]]) fill(w, px, DG + 1, pz, px, w.sy - 2, pz, 'log');
  for (let y = DG + 6; y < w.sy - 2; y += 6) { fill(w, 45, y, 92, 51, y, 92, 'iron'); }
  fill(w, 46, DG + 1, 92, 50, DG + 1, 92, 'planks_dark');
  for (const [lx, lz] of [[45, 86], [51, 86], [45, 92], [51, 92]]) w.put(lx, DG + 5, lz, 'lantern');
  // abandoned camp: workbench, supply cart, lean-to, crates, lanterns
  w.put(DM.bench[0], DG + 1, DM.bench[1], 'workbench');
  w.put(DM.bench[0] - 1, DG + 1, DM.bench[1], 'crate'); w.put(DM.bench[0] - 1, DG + 2, DM.bench[1], 'lantern');
  for (let z = 76; z <= 86; z++) w.put(55, DG + 1, z, 'rail');
  fill(w, 54, DG + 1, 79, 56, DG + 1, 81, 'iron');
  w.put(55, DG + 1, 80, 'crate'); w.put(54, DG + 2, 79, 'crate'); w.put(56, DG + 2, 81, 'ore_iron');
  fill(w, 38, DG + 1, 86, 38, DG + 3, 89, 'log');
  fill(w, 39, DG + 3, 86, 41, DG + 3, 89, 'wool_red');
  fill(w, 39, DG + 1, 86, 39, DG + 1, 88, 'wool_white');
  w.put(40, DG + 1, 89, 'crate'); w.put(41, DG + 1, 89, 'lantern');
  w.put(57, DG + 1, 87, 'crate'); w.put(57, DG + 2, 87, 'crate'); w.put(58, DG + 1, 86, 'hay');
  for (let z = 60; z <= 84; z++) w.put(48, DG + 1, z, z % 9 === 4 ? 'air' : 'rail');
  lampPost(w, 43, DG + 1, 78, 2); lampPost(w, 53, DG + 1, 89, 2);

  // ---------------- the old tunnel ----------------
  for (let z = 61; z <= 77; z += 4) {
    if (z === 69) { // a broken frame
      w.put(45, DG + 1, z, 'log'); w.put(46, DG + 1, z + 1, 'log'); w.put(47, DG + 1, z + 1, 'log');
      continue;
    }
    fill(w, 45, DG + 1, z, 45, DG + 5, z, 'log');
    fill(w, 51, DG + 1, z, 51, DG + 5, z, 'log');
    fill(w, 45, DG + 6, z, 51, DG + 6, z, 'planks_dark');
  }
  w.put(50, DG + 3, 73, 'torch'); w.put(46, DG + 3, 64, 'torch');
  // the captive's trail
  const [tx, tz] = DM.trail;
  if (flags.saved === 'bram') {
    // Juno scratched arrows and tied scarf threads to the rocks
    w.put(tx, DG + 1, tz, 'cobble'); w.put(tx, DG + 2, tz, 'wool_red');
    w.put(45, DG + 2, tz - 1, 'wool_red');
  } else {
    // Bram stacked little pebble houses along the way
    w.put(tx, DG + 1, tz, 'cobble'); w.put(tx + 1, DG + 1, tz, 'cobble'); w.put(tx, DG + 2, tz, 'planks');
    w.put(50, DG + 1, tz - 3, 'cobble'); w.put(50, DG + 2, tz - 3, 'planks');
  }

  // ---------------- Gallery Nine ----------------
  // lava pool, pump house, voidstone growths, frayed patches
  for (let z = 49; z <= 55; z++) for (let x = 27; x <= 33; x++) if (Math.hypot(x - 30, z - 52) < 3.3 && w.get(x, DG + 1, z) === 0) { w.put(x, DG, z, 'lava'); w.put(x, DG - 1, z, 'lava'); }
  for (let z = 47; z <= 57; z++) for (let x = 25; x <= 35; x++) { const d = Math.hypot(x - 30, z - 52); if (d >= 3.3 && d < 4.4 && w.get(x, DG + 1, z) === 0) w.put(x, DG, z, 'basalt'); }
  const [px, pz] = DM.pump;
  fill(w, px - 2, DG + 1, pz - 2, px + 2, DG + 4, pz + 2, 'copper');
  fill(w, px - 1, DG + 5, pz - 1, px + 1, DG + 5, pz + 1, 'pipe');
  fill(w, px, DG + 6, pz, px, DG + 12, pz, 'pipe');
  fill(w, px - 3, DG + 2, pz, px - 3, DG + 2, pz, 'pipe');
  w.put(px - 3, DG + 1, pz + 2, 'lantern');
  // the chasm across the gallery
  for (let z = 34; z <= 44; z++) for (let x = 16; x <= 80; x++) {
    const edge = 36 + Math.round((fbm(x / 5, 1, 31) - 0.5) * 3), edge2 = 42 + Math.round((fbm(x / 5, 2, 32) - 0.5) * 3);
    if (z < edge || z > edge2) continue;
    for (let y = 4; y <= DG; y++) w.put(x, y, z, 'air');
    w.put(x, 3, z, 'lava'); w.put(x, 2, z, 'lava');
  }
  // keep the crossing point tidy: the stubs of the old bridge
  for (let z = 33; z <= 45; z++) for (let x = 46; x <= 50; x++) {
    if (z >= 38 && z <= 40) continue;
    if (z < 36 || z > 42) { w.put(x, DG, z, 'stone'); continue; }
    w.put(x, DG, z, x === 46 || x === 50 ? 'planks_dark' : 'planks');
  }
  for (const z of [37, 41]) w.put(48, DG - 1, z, 'log');
  // the old pump beam over the chasm (the grapple anchor)
  fill(w, 48, DG + 11, 31, 48, DG + 11, 47, 'log');
  for (const z of [31, 47]) {
    for (const x of [45, 51]) fill(w, x, DG + 1, z, x, DG + 11, z, 'stone');
    fill(w, 45, DG + 11, z, 51, DG + 11, z, 'planks_dark');
    w.put(45, DG + 11, z, 'iron'); w.put(51, DG + 11, z, 'iron');
    w.put(45, DG + 4, z + (z === 47 ? 1 : -1), 'torch'); w.put(51, DG + 4, z + (z === 47 ? 1 : -1), 'torch');
  }
  // voidstone growths and frayed scars, thicker toward the north
  const r = mulberry32(77);
  for (let i = 0; i < 70; i++) {
    const x = 22 + Math.floor(r() * 52), z = 16 + Math.floor(r() * 46);
    if (Math.abs(x - 48) < 4 && z > 26 && z < 62) continue;
    if (Math.hypot(x - DM.cage[0], z - DM.cage[1]) < 5) continue;
    if (w.get(x, DG + 1, z) !== 0 || w.name(x, DG, z) === 'lava') continue;
    const north = z < 36;
    if (r() < (north ? 0.65 : 0.3)) {
      const h = 1 + Math.floor(r() * (north ? 4 : 2));
      for (let k = 1; k <= h; k++) w.put(x, DG + k, z, 'voidstone');
    } else {
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) if (r() < 0.6 && w.get(x + dx, DG + 1, z + dz) === 0) w.put(x + dx, DG, z + dz, 'frayed');
    }
  }
  // the Fray eating in from the north edge: frayed ground, then nothing
  for (let z = 0; z <= 22; z++) for (let x = 16; x <= 80; x++) {
    const edge = 12 + Math.round((fbm(x / 7, 5, 41) - 0.5) * 6);
    if (z < edge) { for (let y = 0; y < w.sy - 1; y++) if (w.name(x, y, z) !== 'air' && y < DG + 18) w.put(x, y, z, 'air'); }
    else if (z < edge + 5 && w.get(x, DG + 1, z) === 0 && fbm(x / 3, z / 3, 42) > 0.4) w.put(x, DG, z, 'frayed');
  }
  // floating fragments over the void
  for (let i = 0; i < 26; i++) {
    const x = 24 + Math.floor(r() * 48), z = 2 + Math.floor(r() * 10), y = DG + 2 + Math.floor(r() * 12);
    if (w.get(x, y, z) === 0) w.put(x, y, z, r() < 0.5 ? 'frayed' : 'voidstone');
  }
  // the gloamling cage
  const [cx, cz] = DM.cage;
  fill(w, cx - 3, DG, cz - 3, cx + 3, DG, cz + 3, 'basalt');
  fill(w, cx - 2, DG + 1, cz - 2, cx + 2, DG + 1, cz + 2, 'cobble');
  for (const [lx, lz] of [[cx - 3, cz - 3], [cx + 3, cz - 3], [cx - 3, cz + 3], [cx + 3, cz + 3]]) torchPost(w, lx, DG + 1, lz, 2);
  if (!flags.e3_cage_open) {
    for (let x = cx - 2; x <= cx + 2; x++) for (let z = cz - 2; z <= cz + 2; z++) {
      const edge = x === cx - 2 || x === cx + 2 || z === cz - 2 || z === cz + 2;
      if (!edge) continue;
      const corner = (x === cx - 2 || x === cx + 2) && (z === cz - 2 || z === cz + 2);
      if (corner || (x + z) % 2 === 1) fill(w, x, DG + 2, z, x, DG + 4, z, corner ? 'iron' : 'voidstone');
    }
    fill(w, cx - 2, DG + 5, cz - 2, cx + 2, DG + 5, cz + 2, 'iron');
    w.put(cx - 1, DG + 2, cz - 1, 'lantern');
    w.put(cx, DG + 6, cz, 'voidstone');
  }
  // a little pallet inside: the captive's blanket and a lantern someone left
  w.put(cx + 1, DG + 2, cz + 1, flags.e3_cage_open ? 'air' : 'wool_white');
  // steps up onto the cage plinth
  fill(w, cx - 1, DG + 1, cz + 3, cx + 1, DG + 1, cz + 3, 'cobble');
  // mood lights along the gallery
  for (const [x, z] of [[36, 56], [60, 58], [56, 46], [40, 46], [40, 30], [58, 28]]) if (w.get(x, DG + 1, z) === 0) torchPost(w, x, DG + 1, z, 1);
  // glowing cave fungus and the miners' old lanterns
  const rg = mulberry32(88);
  for (let z = 14; z <= 92; z++) for (let x = 18; x <= 78; x++) {
    if (w.get(x, DG + 1, z) !== 0 || !w.solid(x, DG, z) || w.name(x, DG, z) === 'lava') continue;
    if (Math.abs(x - 48) <= 2 && z > 26) continue;
    if (rg() < 0.035) w.put(x, DG + 1, z, 'flower_glow');
  }
  for (const [x, z] of [[33, 44], [63, 44], [26, 58], [70, 56], [44, 58], [54, 30], [40, 22], [58, 20]]) if (w.get(x, DG + 1, z) === 0 && w.solid(x, DG, z)) lampPost(w, x, DG + 1, z, 1);
  for (let z = 44; z <= 60; z++) if (w.get(47, DG + 1, z) === 0) w.put(47, DG + 1, z, 'sparkwire');
  ceilingDressing(w, 24, 2, 2, w.sx - 3, w.sz - 3, DG + 10, 0.06);
  edgeBarrier(w, 1, 1, w.sx - 2, w.sz - 2, DG + 1, DG + 10);
}

export const deepmineSet: SetDef = {
  id: 'deepmine',
  size: [96, 44, 96],
  sky: 'cave',
  cams: {
    wide: { pos: [60, 21, 60], look: [48, 12, 38] },
    landing: { pos: [56, 15, 78], look: [46, 12, 87] },
    shaft: { pos: [50.2, 24, 91.4], look: [48, 11, 85] },
    tunnel: { pos: [49, 15, 79], look: [48, 12, 64] },
    gallery: { pos: [48, 17, 64], look: [48, 12, 42] },
    chasm: { pos: [58, 17, 50], look: [48, 12, 38] },
    chasmLow: { pos: [53, 7.5, 40], look: [48.5, 13, 36] },
    beam: { pos: [52.6, 13.4, 47.6], look: [48.5, 15.5, 40] },
    cage: { pos: [55, 16, 33], look: [48, 12, 24] },
    cageClose: { pos: [48.5, 13.3, 29.6], look: [48.5, 12.8, 24.5] },
    fray: { pos: [48, 19, 36], look: [48, 12, 8] },
    reunion: { pos: [52, 13.5, 80], look: [47, 11.5, 85] },
  },
  lights: [
    { at: [48.5, 15, 86.5], color: '#ffc070', intensity: 4, dist: 12 },
    { at: [41.5, 13, 81.5], color: '#ffb060', intensity: 3, dist: 7 },
    { at: [48.5, 15, 66.5], color: '#ffb060', intensity: 2, dist: 9 },
    { at: [48.5, 15, 47.5], color: '#ffb060', intensity: 4, dist: 12 },
    { at: [48.5, 15, 28.5], color: '#a26cff', intensity: 5, dist: 14 },
    { at: [30.5, 13, 52.5], color: '#ff7a2a', intensity: 4, dist: 10 },
  ],
  build: buildDeepmine,
};

export const ep3Sets: SetDef[] = [hollowSet, vaultSet, deepmineSet];
