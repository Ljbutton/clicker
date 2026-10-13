// Helpers for building voxel sets.
import { fbm, mulberry32 } from '../core/rng';
import type { VoxelWorld } from '../render/voxels';

export type W = VoxelWorld;

export function fill(w: W, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, b: string) {
  for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++)
    for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++)
      for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) w.put(x, y, z, b);
}

export function hollow(w: W, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, b: string) {
  fill(w, x0, y0, z0, x1, y1, z1, b);
  fill(w, x0 + 1, y0 + 1, z0 + 1, x1 - 1, y1 - 1, z1 - 1, 'air');
}

/** Topmost solid block y at column (or -1). */
export function topY(w: W, x: number, z: number): number {
  for (let y = w.sy - 1; y >= 0; y--) if (w.get(x, y, z) && w.solid(x, y, z)) return y;
  return -1;
}

export interface TerrainOpts {
  base: number;
  amp?: number;
  scale?: number;
  seed?: number;
  top?: string;
  under?: string;
  deep?: string;
  /** Optional flat area: returns weight 0..1 for flattening towards base */
  flat?: (x: number, z: number) => number;
  x0?: number; z0?: number; x1?: number; z1?: number;
}

export function terrain(w: W, o: TerrainOpts) {
  const x0 = o.x0 ?? 0, z0 = o.z0 ?? 0, x1 = o.x1 ?? w.sx - 1, z1 = o.z1 ?? w.sz - 1;
  for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
    let h = o.base + (fbm(x / (o.scale ?? 24), z / (o.scale ?? 24), o.seed ?? 1) - 0.5) * 2 * (o.amp ?? 3);
    if (o.flat) { const f = o.flat(x, z); h = h * (1 - f) + o.base * f; }
    const hi = Math.round(h);
    for (let y = 0; y <= hi; y++) {
      const b = y === hi ? (o.top ?? 'grass') : y > hi - 3 ? (o.under ?? 'dirt') : (o.deep ?? 'stone');
      w.put(x, y, z, b);
    }
  }
}

export function tree(w: W, x: number, y: number, z: number, kind: 'oak' | 'birch' | 'glow' | 'autumn' | 'pink' | 'pine' = 'oak', h = 5, seed = x * 31 + z) {
  const r = mulberry32(seed);
  const trunk = kind === 'birch' ? 'birch' : kind === 'glow' ? 'log' : 'log';
  const leaves = kind === 'glow' ? 'leaves_glow' : kind === 'autumn' ? 'leaves_autumn' : kind === 'pink' ? 'leaves_pink' : 'leaves';
  for (let i = 0; i < h; i++) w.put(x, y + i, z, trunk);
  if (kind === 'pine') {
    for (let layer = 0; layer < 4; layer++) {
      const rad = 3 - layer;
      const ly = y + h - 3 + layer * 1;
      for (let dz = -rad; dz <= rad; dz++) for (let dx = -rad; dx <= rad; dx++) if (Math.abs(dx) + Math.abs(dz) <= rad + 1 && !(dx === 0 && dz === 0 && layer < 3)) if (!w.get(x + dx, ly, z + dz)) w.put(x + dx, ly, z + dz, 'leaves');
    }
    w.put(x, y + h + 1, z, 'leaves');
    return;
  }
  const cy = y + h - 1;
  for (let dy = -2; dy <= 2; dy++) for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
    const rr = dy >= 1 ? 1 : 2;
    if (Math.abs(dx) > rr || Math.abs(dz) > rr) continue;
    if (Math.abs(dx) === rr && Math.abs(dz) === rr && r() < 0.6) continue;
    if (!w.get(x + dx, cy + dy, z + dz)) w.put(x + dx, cy + dy, z + dz, leaves);
  }
  if (!w.get(x, cy + 3, z)) w.put(x, cy + 3, z, leaves);
}

export interface HouseOpts {
  wall?: string; frame?: string; roof?: string; floor?: string;
  door?: 'n' | 's' | 'e' | 'w'; windows?: boolean; roofAxis?: 'x' | 'z'; interior?: boolean; doorW?: number;
}

/** A simple house with corner posts, windows, a door and a stepped gable roof.
 *  (x0,z0) is a corner, w x d footprint, walls of height h on ground y. */
export function house(w: W, x0: number, y: number, z0: number, wd: number, dp: number, h: number, o: HouseOpts = {}) {
  const wall = o.wall ?? 'planks', frame = o.frame ?? 'log', roof = o.roof ?? 'roof_red', floor = o.floor ?? 'planks_dark';
  const x1 = x0 + wd - 1, z1 = z0 + dp - 1;
  fill(w, x0, y - 1, z0, x1, y - 1, z1, floor);
  hollow(w, x0, y, z0, x1, y + h - 1, z1, wall);
  fill(w, x0 + 1, y + h - 1, z0 + 1, x1 - 1, y + h - 1, z1 - 1, 'air');
  for (const [cx, cz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) fill(w, cx, y, cz, cx, y + h - 1, cz, frame);
  // windows
  if (o.windows !== false) {
    for (let x = x0 + 2; x < x1 - 1; x += 3) { w.put(x, y + 1, z0, 'glass'); w.put(x, y + 1, z1, 'glass'); }
    for (let z = z0 + 2; z < z1 - 1; z += 3) { w.put(x0, y + 1, z, 'glass'); w.put(x1, y + 1, z, 'glass'); }
  }
  // door
  const door = o.door ?? 's';
  const dw = o.doorW ?? 1;
  const mx = Math.floor((x0 + x1) / 2), mz = Math.floor((z0 + z1) / 2);
  for (let k = 0; k < dw; k++) {
    if (door === 's') fill(w, mx + k, y, z1, mx + k, y + 1, z1, 'air');
    if (door === 'n') fill(w, mx + k, y, z0, mx + k, y + 1, z0, 'air');
    if (door === 'e') fill(w, x1, y, mz + k, x1, y + 1, mz + k, 'air');
    if (door === 'w') fill(w, x0, y, mz + k, x0, y + 1, mz + k, 'air');
  }
  // roof
  const axis = o.roofAxis ?? (wd >= dp ? 'x' : 'z');
  const ry = y + h;
  if (axis === 'x') {
    const half = Math.ceil((dp + 2) / 2);
    for (let i = 0; i < half; i++) {
      const za = z0 - 1 + i, zb = z1 + 1 - i;
      fill(w, x0 - 1, ry + i, za, x1 + 1, ry + i, za, roof);
      fill(w, x0 - 1, ry + i, zb, x1 + 1, ry + i, zb, roof);
      if (za < zb - 1) { fill(w, x0, ry + i, za + 1, x0, ry + i, zb - 1, wall); fill(w, x1, ry + i, za + 1, x1, ry + i, zb - 1, wall); }
    }
  } else {
    const half = Math.ceil((wd + 2) / 2);
    for (let i = 0; i < half; i++) {
      const xa = x0 - 1 + i, xb = x1 + 1 - i;
      fill(w, xa, ry + i, z0 - 1, xa, ry + i, z1 + 1, roof);
      fill(w, xb, ry + i, z0 - 1, xb, ry + i, z1 + 1, roof);
      if (xa < xb - 1) { fill(w, xa + 1, ry + i, z0, xb - 1, ry + i, z0, wall); fill(w, xa + 1, ry + i, z1, xb - 1, ry + i, z1, wall); }
    }
  }
  if (o.interior !== false) {
    w.put(x0 + 1, y, z0 + 1, 'crate');
    w.put(x1 - 1, y, z0 + 1, 'bookshelf');
    w.put(x1 - 1, y + 1, z0 + 1, 'bookshelf');
    w.put(x0 + 1, y + h - 2, z0 + 1, 'lantern');
  }
}

export function lampPost(w: W, x: number, y: number, z: number, h = 3) {
  for (let i = 0; i < h; i++) w.put(x, y + i, z, 'planks_dark');
  w.put(x, y + h, z, 'lantern');
}

export function scatter(w: W, x0: number, z0: number, x1: number, z1: number, seed: number, density: number, blocks: string[], on = 'grass') {
  const r = mulberry32(seed);
  for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
    if (r() > density) continue;
    const t = topY(w, x, z);
    if (t < 0 || w.name(x, t, z) !== on) continue;
    if (w.get(x, t + 1, z)) continue;
    w.put(x, t + 1, z, blocks[Math.floor(r() * blocks.length)]);
  }
}

export function forest(w: W, x0: number, z0: number, x1: number, z1: number, seed: number, density: number, kinds: Array<Parameters<typeof tree>[4]>, avoid?: (x: number, z: number) => boolean) {
  const r = mulberry32(seed);
  for (let z = z0; z <= z1; z += 3) for (let x = x0; x <= x1; x += 3) {
    if (r() > density) continue;
    const tx = x + Math.floor(r() * 3), tz = z + Math.floor(r() * 3);
    if (avoid?.(tx, tz)) continue;
    const t = topY(w, tx, tz);
    if (t < 0) continue;
    const nm = w.name(tx, t, tz);
    if (nm !== 'grass' && nm !== 'dirt' && nm !== 'snow') continue;
    tree(w, tx, t + 1, tz, kinds[Math.floor(r() * kinds.length)], 4 + Math.floor(r() * 3), Math.floor(r() * 1e6));
  }
}

/** Paint a path of `block` along a polyline on the surface. */
export function path(w: W, pts: Array<[number, number]>, width: number, block = 'path') {
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
    const n = Math.max(Math.abs(bx - ax), Math.abs(bz - az));
    for (let k = 0; k <= n; k++) {
      const x = Math.round(ax + ((bx - ax) * k) / n), z = Math.round(az + ((bz - az) * k) / n);
      for (let dz = -Math.floor(width / 2); dz <= Math.floor((width - 1) / 2); dz++)
        for (let dx = -Math.floor(width / 2); dx <= Math.floor((width - 1) / 2); dx++) {
          const t = topY(w, x + dx, z + dz);
          if (t < 0) continue;
          const nm = w.name(x + dx, t, z + dz);
          if (['grass', 'dirt', 'path', 'gravel', 'sand', 'snow', 'stone'].includes(nm)) {
            w.put(x + dx, t, z + dz, block);
            // clear plants above
            const above = w.name(x + dx, t + 1, z + dz);
            if (['tallgrass', 'flower_red', 'flower_yellow', 'flower_blue', 'mushroom'].includes(above)) w.put(x + dx, t + 1, z + dz, 'air');
          }
        }
    }
  }
}

export function island(w: W, cx: number, cy: number, cz: number, r: number, depth: number, seed = 7, top = 'grass') {
  const rnd = mulberry32(seed);
  for (let z = -r; z <= r; z++) for (let x = -r; x <= r; x++) {
    const d = Math.hypot(x, z) / r;
    if (d > 1) continue;
    const n = fbm((cx + x) / 6, (cz + z) / 6, seed);
    const down = Math.round((1 - d) * depth * (0.6 + n * 0.8)) + 1;
    for (let k = 0; k < down; k++) w.put(cx + x, cy - k, cz + z, k === 0 ? top : k < 3 ? 'dirt' : 'stone');
    if (d > 0.85 && rnd() < 0.3) w.put(cx + x, cy, cz + z, 'dirt');
  }
}

export function sphere(w: W, cx: number, cy: number, cz: number, r: number, b: string, shell = false, onlyUpper = false) {
  for (let y = -r; y <= r; y++) for (let z = -r; z <= r; z++) for (let x = -r; x <= r; x++) {
    if (onlyUpper && y < 0) continue;
    const d = Math.hypot(x, y, z);
    if (d > r + 0.5) continue;
    if (shell && d < r - 0.5) continue;
    w.put(cx + x, cy + y, cz + z, b);
  }
}

export function cylinder(w: W, cx: number, y0: number, cz: number, r: number, h: number, b: string, shell = false) {
  for (let y = y0; y < y0 + h; y++) for (let z = -r; z <= r; z++) for (let x = -r; x <= r; x++) {
    const d = Math.hypot(x, z);
    if (d > r + 0.5) continue;
    if (shell && d < r - 0.5) continue;
    w.put(cx + x, y, cz + z, b);
  }
}

export function stall(w: W, x: number, y: number, z: number, awning = 'awning', facing: 'z' | 'x' = 'z') {
  // 3 wide counter with posts and an awning
  if (facing === 'z') {
    fill(w, x, y, z, x + 2, y, z, 'planks');
    for (const px of [x, x + 2]) { w.put(px, y + 1, z - 1, 'planks_dark'); w.put(px, y + 2, z - 1, 'planks_dark'); }
    fill(w, x - 1, y + 3, z - 2, x + 3, y + 3, z, awning);
  } else {
    fill(w, x, y, z, x, y, z + 2, 'planks');
    for (const pz of [z, z + 2]) { w.put(x - 1, y + 1, pz, 'planks_dark'); w.put(x - 1, y + 2, pz, 'planks_dark'); }
    fill(w, x - 2, y + 3, z - 1, x, y + 3, z + 3, awning);
  }
}

export function fence(w: W, x0: number, z0: number, x1: number, z1: number, y: number, b = 'log') {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(z1 - z0));
  for (let k = 0; k <= n; k += 1) {
    const x = Math.round(x0 + ((x1 - x0) * k) / n), z = Math.round(z0 + ((z1 - z0) * k) / n);
    w.put(x, y, z, k % 3 === 0 ? b : 'planks_dark');
  }
}

/** Water body: fills air below level within region whose columns are below level. */
export function pond(w: W, x0: number, z0: number, x1: number, z1: number, level: number, bed = 'sand') {
  for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
    const t = topY(w, x, z);
    if (t >= level) continue;
    if (t >= 0) w.put(x, t, z, bed);
    for (let y = t + 1; y <= level; y++) w.put(x, y, z, 'water');
  }
}

/** Carve a bowl into terrain (for ponds/lakes). */
export function carve(w: W, cx: number, cz: number, rx: number, rz: number, depth: number) {
  for (let z = -rz; z <= rz; z++) for (let x = -rx; x <= rx; x++) {
    const d = Math.hypot(x / rx, z / rz);
    if (d > 1) continue;
    const t = topY(w, cx + x, cz + z);
    const dd = Math.round((1 - d * d) * depth);
    for (let y = t; y > t - dd; y--) w.put(cx + x, y, cz + z, 'air');
  }
}

/** Invisible walls along the set edges so players can't walk off. */
export function edgeBarrier(w: W, x0: number, z0: number, x1: number, z1: number, y0: number, y1: number) {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) { if (!w.get(x, y, z0)) w.put(x, y, z0, 'barrier'); if (!w.get(x, y, z1)) w.put(x, y, z1, 'barrier'); }
    for (let z = z0; z <= z1; z++) { if (!w.get(x0, y, z)) w.put(x0, y, z, 'barrier'); if (!w.get(x1, y, z)) w.put(x1, y, z, 'barrier'); }
  }
}
