// Inside the Beacon's upper chamber, and the old sky-bridge to Watch Rock.
import type { SetDef } from '../../render/stage';
import { cylinder, fill, island, edgeBarrier, scatter } from '../kit';
import { fbm } from '../../core/rng';

/** Chamber floor is y = 30 (stand at 31). Bridge runs along z = 31..33 from x = 32 to 69. */
export const BC = {
  center: [24, 32] as [number, number],
  pedestal: [24, 32] as [number, number],
  inscription: [24, 26] as [number, number],
  door: [31, 32] as [number, number],
  bridgeMid: [50, 32] as [number, number],
  rock: [76, 32] as [number, number],
  far: [62, 6] as [number, number],
};

export const beacon: SetDef = {
  id: 'beacon',
  size: [96, 56, 64],
  sky: 'storm',
  cams: {
    wide: { pos: [28.5, 34.5, 37.5], look: [22, 32, 28] },
    inscription: { pos: [24, 33, 30], look: [24, 33, 25] },
    pedestal: { pos: [28, 34, 36], look: [24, 32, 32] },
    up: { pos: [27, 31.8, 37], look: [22, 39, 27] },
    door: { pos: [26, 33, 36], look: [34, 32, 32] },
    bridge: { pos: [50, 34, 42], look: [50, 30, 32] },
    bridgeLow: { pos: [44, 27, 38], look: [52, 31, 32] },
    rock: { pos: [64, 34, 40], look: [76, 32, 32] },
    far: { pos: [56, 33, 34], look: [62, 40, 6] },
    under: { pos: [50, 22, 40], look: [50, 30, 32] },
  },
  lights: [{ at: [24.5, 33, 32.5], color: '#7ff2e4', intensity: 3, dist: 10 }],
  build(w, flags) {
    // Kettlebrook far below, mostly lost in the haze
    for (let z = 0; z < w.sz; z++) for (let x = 0; x < w.sx; x++) {
      const h = 3 + Math.round(fbm(x / 14, z / 14, 2) * 4);
      for (let y = 0; y <= h; y++) w.put(x, y, z, y === h ? 'grass' : 'dirt');
    }
    // the tower shaft
    cylinder(w, 24, 4, 32, 8, 26, 'marble');
    cylinder(w, 24, 30, 32, 8, 1, 'marble_tile');
    cylinder(w, 24, 31, 32, 8, 10, 'marble', true);
    // gold bands
    cylinder(w, 24, 34, 32, 8, 1, 'gold', true);
    cylinder(w, 24, 40, 32, 8, 1, 'gold', true);
    // window slits
    for (const [x, z] of [[16, 32], [24, 24], [24, 40], [18, 26], [30, 38], [18, 38]]) fill(w, x, 32, z, x, 33, z, 'glass');
    // open top with ring
    cylinder(w, 24, 41, 32, 9, 1, 'marble_tile', true);
    // pedestal and the dark core
    fill(w, 23, 31, 31, 25, 31, 33, 'gold');
    fill(w, 24, 32, 32, 24, 32, 32, 'marble');
    w.put(24, 33, 32, flags.beacon_lit ? 'beacon_core' : 'beacon_dead');
    // the inscription: glowing lines on the north wall
    fill(w, 21, 32, 24, 27, 35, 24, 'marble_tile');
    for (const [x, y] of [[21, 35], [22, 35], [23, 35], [25, 35], [26, 35], [27, 35], [21, 33], [22, 33], [24, 33], [26, 33], [27, 33], [23, 34], [25, 34]]) w.put(x, y, 24, 'glowblock');
    // four anchor sockets on the floor
    for (const [x, z, b] of [[20, 28, 'ember'], [28, 28, 'tide'], [20, 36, 'root'], [28, 36, 'gale']] as const) {
      w.put(x, 30, z, flags.sockets_empty ? 'basalt' : b);
    }
    // doorway to the bridge
    fill(w, 32, 31, 31, 32, 33, 33, 'air');
    fill(w, 31, 31, 31, 31, 33, 33, 'air');
    // the old sky-bridge
    for (let x = 32; x <= 69; x++) {
      fill(w, x, 30, 31, x, 30, 33, x % 5 === 0 ? 'planks_dark' : 'planks');
      if (x % 4 === 0) { w.put(x, 31, 30, 'log'); w.put(x, 31, 34, 'log'); }
      w.put(x, 30, 30, 'planks_dark'); w.put(x, 30, 34, 'planks_dark');
    }
    if (flags.bridge_broken) fill(w, 47, 29, 30, 54, 31, 34, 'air');
    // Watch Rock
    island(w, 76, 30, 32, 8, 10, 4);
    scatter(w, 68, 24, 86, 40, 3, 0.2, ['tallgrass', 'flower_yellow']);
    w.put(78, 31, 30, 'log'); w.put(78, 32, 30, 'log'); w.put(78, 33, 30, 'leaves'); w.put(77, 33, 30, 'leaves'); w.put(79, 33, 30, 'leaves'); w.put(78, 34, 30, 'leaves');
    // the far floating island (where the masked figure stands)
    island(w, 62, 38, 6, 4, 6, 9, 'voidstone');
    // keep players on walkable bits
    edgeBarrier(w, 9, 17, 90, 47, 31, 34);
  },
};
