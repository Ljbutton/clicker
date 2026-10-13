// Kettlebrook: the home village, the Lantern Fair plaza and Beacon Hill.
import { fbm } from '../../core/rng';
import type { SetDef } from '../../render/stage';
import { edgeBarrier, fill, forest, house, lampPost, path, pond, scatter, stall, topY, carve, fence } from '../kit';

/** Key locations (x, z) used by scripts. Ground level in the plaza is y = 11. */
export const KB = {
  plaza: [48, 48] as [number, number],
  workshopDoor: [33.5, 46.5] as [number, number],
  workbench: [27.5, 45.5] as [number, number],
  entryBench: [44.5, 41.5] as [number, number],
  bramDoor: [61, 46.5] as [number, number],
  hallDoor: [48.5, 61.5] as [number, number],
  nanaDoor: [35.5, 60.5] as [number, number],
  stage: [48, 31] as [number, number],
  wrenEntry: [41, 40] as [number, number],
  bramEntry: [57, 40] as [number, number],
  junoStall: [37, 34] as [number, number],
  pond: [22, 30] as [number, number],
  hillPath: [48, 24] as [number, number],
  beacon: [48, 12] as [number, number],
  east: [80, 50] as [number, number],
};

const G = 10; // plaza ground block y (stand at 11)

function height(x: number, z: number) {
  // Beacon hill to the north: a flat plateau (y = 22) with a slope around it
  const dh = Math.hypot(x - 48, (z - 12) * 1.1);
  const hill = dh < 5 ? 1 : dh < 24 ? Math.pow(1 - (dh - 5) / 19, 1.2) : 0;
  let h = G + (fbm(x / 22, z / 22, 3) - 0.5) * 6 * (1 - hill);
  // flatten the village
  const dv = Math.hypot((x - 48) / 34, (z - 50) / 26);
  const f = Math.max(0, Math.min(1, (1.25 - dv) * 2.5));
  h = h * (1 - f) + G * f;
  h += 12 * hill;
  return Math.round(h);
}

export const kettlebrook: SetDef = {
  id: 'kettlebrook',
  size: [96, 48, 96],
  sky: 'morning',
  beam: [48.5, 37, 12.5],
  cams: {
    wide: { pos: [64, 22, 78], look: [47, 12, 46] },
    plaza: { pos: [48, 16, 59], look: [48, 12, 42] },
    workshop: { pos: [38, 14, 54], look: [30, 12, 47] },
    stage: { pos: [48, 15, 44], look: [48, 13, 31] },
    crowd: { pos: [48, 15, 26], look: [48, 12, 40] },
    entry: { pos: [44, 14, 47], look: [41, 14, 40] },
    beacon: { pos: [50, 14, 44], look: [48, 30, 12] },
    hill: { pos: [56, 20, 32], look: [48, 22, 16] },
    east: { pos: [64, 17, 56], look: [84, 13, 50] },
    sky: { pos: [48, 13, 50], look: [60, 40, 10] },
    pond: { pos: [28, 14, 38], look: [22, 11, 30] },
  },
  lights: [
    { at: [41.5, 14.5, 40.5], color: '#ffd080', intensity: 4, dist: 7 },
    { at: [48.5, 14, 48.5], color: '#ffb060', intensity: 3, dist: 10 },
  ],
  build(w, flags) {
    const ruined = !!flags.kb_ruined;
    const rebuilt = !!flags.kb_rebuilt;
    // terrain
    for (let z = 0; z < w.sz; z++) for (let x = 0; x < w.sx; x++) {
      const h = height(x, z);
      for (let y = 0; y <= h; y++) w.put(x, y, z, y === h ? 'grass' : y > h - 3 ? 'dirt' : 'stone');
    }
    // pond
    carve(w, KB.pond[0], KB.pond[1], 6, 4, 3);
    pond(w, 15, 25, 29, 35, G - 1);
    scatter(w, 15, 24, 30, 36, 5, 0.12, ['reeds'], 'grass');
    // plaza
    for (let z = 34; z <= 58; z++) for (let x = 35; x <= 61; x++) {
      const d = Math.hypot((x - 48) / 13.5, (z - 46) / 12.5);
      if (d < 1) w.put(x, G, z, d < 0.35 ? 'cobble' : 'path');
    }
    fill(w, 46, G, 44, 50, G, 48, 'cobble');
    // fountain-ish lantern well in the middle
    fill(w, 47, G + 1, 47, 49, G + 1, 49, 'cobble');
    w.put(48, G + 1, 48, 'water');
    fill(w, 48, G + 2, 48, 48, G + 3, 48, 'planks_dark');
    w.put(48, G + 4, 48, 'lantern');
    // judging stage
    fill(w, 43, G + 1, 29, 53, G + 1, 33, 'planks');
    fill(w, 43, G + 1, 29, 53, G + 1, 29, 'planks_dark');
    for (const x of [43, 53]) { fill(w, x, G + 2, 29, x, G + 5, 29, 'log'); w.put(x, G + 6, 29, 'lantern'); }
    fill(w, 44, G + 5, 29, 52, G + 5, 29, 'banner_red');
    fill(w, 46, G + 2, 30, 50, G + 2, 30, 'table');
    // Wren's entry: a lantern statue frame (core slot at 41,13,40 starts empty)
    fill(w, 39, G + 1, 38, 43, G + 1, 42, 'planks_dark');
    fill(w, 40, G + 2, 39, 42, G + 4, 41, 'planks_pale');
    fill(w, 40, G + 3, 39, 42, G + 3, 41, 'glass');
    for (const [x, z] of [[40, 39], [42, 39], [40, 41], [42, 41]]) fill(w, x, G + 2, z, x, G + 5, z, 'log');
    w.put(41, G + 3, 40, flags.core_in ? 'lantern' : 'air');
    fill(w, 40, G + 5, 39, 42, G + 5, 41, 'roof_red');
    w.put(41, G + 6, 40, 'planks_dark');
    if (flags.lantern === 'fox') { w.put(40, G + 6, 39, 'wool_orange'); w.put(42, G + 6, 39, 'wool_orange'); w.put(40, G + 7, 39, 'wool_orange'); w.put(42, G + 7, 39, 'wool_orange'); }
    if (flags.lantern === 'tower') { fill(w, 41, G + 6, 40, 41, G + 9, 40, 'planks_dark'); w.put(41, G + 10, 40, 'roof_red'); }
    if (flags.lantern === 'star') { w.put(41, G + 7, 40, 'gold'); w.put(40, G + 7, 40, 'gold'); w.put(42, G + 7, 40, 'gold'); w.put(41, G + 8, 40, 'gold'); w.put(41, G + 6, 40, 'gold'); }
    w.put(44, G + 1, 40, 'workbench');
    // Bram's entry: a tall timber lantern tower
    fill(w, 55, G + 1, 38, 59, G + 1, 42, 'planks_dark');
    for (const [x, z] of [[55, 38], [59, 38], [55, 42], [59, 42]]) fill(w, x, G + 2, z, x, G + 8, z, 'log');
    fill(w, 56, G + 4, 39, 58, G + 6, 41, 'planks');
    fill(w, 56, G + 5, 39, 58, G + 5, 41, 'glowblock');
    fill(w, 55, G + 9, 38, 59, G + 9, 42, 'roof_green');
    fill(w, 56, G + 10, 39, 58, G + 10, 41, 'roof_green');
    w.put(57, G + 11, 40, 'lantern');
    // Juno's scavenger stall
    stall(w, 36, G + 1, 33, 'awning_b');
    w.put(35, G + 1, 32, 'crate'); w.put(39, G + 1, 32, 'crate'); w.put(39, G + 2, 32, 'crate'); w.put(34, G + 1, 33, 'iron');
    // food stall + games stall
    stall(w, 58, G + 1, 33, 'awning');
    w.put(57, G + 1, 32, 'hay'); w.put(61, G + 1, 32, 'crate');
    stall(w, 37, G + 1, 55, 'awning');
    // houses
    house(w, 24, G + 1, 43, 9, 8, 5, { wall: 'planks', roof: 'roof_red', door: 'e', interior: false });
    // workshop interior
    w.put(26, G + 1, 45, 'workbench'); w.put(26, G + 1, 47, 'crate'); w.put(25, G + 1, 49, 'bookshelf'); w.put(25, G + 2, 49, 'bookshelf');
    w.put(29, G + 1, 44, 'iron'); w.put(30, G + 1, 44, 'copper'); w.put(25, G + 4, 44, 'lantern'); w.put(30, G + 4, 49, 'lantern');
    fill(w, 27, G + 1, 49, 30, G + 1, 49, 'sparkwire');
    house(w, 62, G + 1, 43, 9, 8, 5, { wall: 'planks_pale', frame: 'log', roof: 'roof_green', door: 'w' });
    house(w, 41, G + 1, 63, 15, 9, 6, { wall: 'brick', frame: 'stone', roof: 'roof_blue', door: 'n', doorW: 2, floor: 'marble_tile' });
    w.put(47, G + 4, 62, 'banner_blue'); w.put(50, G + 4, 62, 'banner_blue');
    house(w, 28, G + 1, 58, 7, 6, 4, { wall: 'planks_pale', roof: 'roof_red', door: 'e' });
    // east houses (fray targets)
    house(w, 75, G + 1, 44, 7, 7, 4, { wall: 'planks', roof: 'roof_red', door: 'w' });
    house(w, 75, G + 1, 56, 7, 7, 4, { wall: 'planks_pale', roof: 'roof_blue', door: 'w' });
    // farm fields east
    for (let z = 66; z <= 80; z++) for (let x = 70; x <= 86; x++) if (topY(w, x, z) === G) w.put(x, G, z, z % 3 === 0 ? 'water' : 'dirt');
    scatter(w, 70, 66, 86, 80, 11, 0.9, ['tallgrass', 'hay'], 'dirt');
    fence(w, 69, 65, 87, 65, G + 1);
    // paths
    path(w, [[48, 34], [48, 26], [47, 20], [48, 16]], 3, 'path');
    path(w, [[33, 46], [40, 46]], 2, 'path');
    path(w, [[60, 46], [62, 46]], 2, 'path');
    path(w, [[48, 58], [48, 62]], 3, 'path');
    path(w, [[61, 50], [74, 50], [86, 50]], 2, 'path');
    path(w, [[38, 54], [35, 60]], 2, 'path');
    // Beacon at the hill top
    const by = topY(w, 48, 12);
    fill(w, 45, by - 1, 9, 51, by, 15, 'marble_tile');
    for (let y = by + 1; y <= by + 12; y++) for (let z = 10; z <= 14; z++) for (let x = 46; x <= 50; x++) {
      const edge = x === 46 || x === 50 || z === 10 || z === 14;
      const corner = (x === 46 || x === 50) && (z === 10 || z === 14);
      if (corner) continue;
      if (edge || y > by + 10) w.put(x, y, z, (y - by) % 4 === 0 ? 'gold' : 'marble');
    }
    fill(w, 48, by + 1, 14, 48, by + 2, 14, 'air'); // door
    fill(w, 47, by + 13, 11, 49, by + 13, 13, 'marble');
    w.put(48, by + 14, 12, ruined || flags.beacon_dark ? 'beacon_dead' : 'beacon_core');
    for (const [x, z] of [[46, 10], [50, 10], [46, 14], [50, 14]]) fill(w, x, by + 1, z, x, by + 13, z, 'marble_tile');
    // lamps
    for (const [x, z] of [[38, 44], [58, 44], [38, 52], [58, 52], [46, 28], [50, 28], [44, 58], [52, 58], [47, 22], [49, 18]]) {
      const t = topY(w, x, z);
      lampPost(w, x, t + 1, z, 2);
    }
    // nature
    scatter(w, 0, 0, 95, 95, 21, 0.06, ['tallgrass', 'tallgrass', 'flower_red', 'flower_yellow', 'flower_blue']);
    const avoid = (x: number, z: number) => {
      if (Math.hypot((x - 48) / 30, (z - 50) / 24) < 1) return true;
      if (Math.abs(x - 48) < 6 && z < 36) return true;
      if (x > 66 && z > 40 && z < 84 && x < 90) return true;
      if (Math.hypot(x - 22, z - 30) < 8) return true;
      return false;
    };
    forest(w, 2, 2, 92, 92, 77, 0.55, ['oak', 'oak', 'birch', 'autumn'], avoid);
    if (ruined) {
      // the east edge is simply gone; frayed scars creep inward
      for (let z = 0; z < w.sz; z++) for (let x = 0; x < w.sx; x++) {
        const edge = 80 + Math.round((fbm(z / 8, 3, 9) - 0.5) * 8);
        if (x >= edge) for (let y = 0; y < w.sy; y++) w.put(x, y, z, 'air');
        else if (x >= edge - 4) {
          const t = topY(w, x, z);
          if (t >= 0 && fbm(x / 3, z / 3, 4) > 0.45) w.put(x, t, z, 'frayed');
        }
      }
      // broken stalls and debris
      fill(w, 58, G + 4, 31, 62, G + 4, 33, 'air');
      for (const [x, z] of [[52, 40], [44, 52], [60, 54], [36, 42]]) w.put(x, G + 1, z, 'frayed');
      fill(w, 45, G + 5, 29, 52, G + 5, 29, 'air');
    }
    if (rebuilt) {
      // garlands of lanterns across the plaza
      for (let x = 38; x <= 58; x += 4) w.put(x, G + 6, 46, 'lantern');
      fill(w, 38, G + 6, 46, 58, G + 6, 46, 'wool_yellow');
      for (let x = 38; x <= 58; x += 4) w.put(x, G + 6, 46, 'lantern');
    }
    edgeBarrier(w, 1, 1, 94, 94, 0, 30);
  },
};
