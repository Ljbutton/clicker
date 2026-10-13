// Block registry and procedurally painted 16x16 texture atlas.
import { mulberry32 } from '../core/rng';

export type Shape = 'cube' | 'cross' | 'flat';
export type Pass = 'opaque' | 'cutout' | 'trans';

export interface BlockDef {
  id: number;
  name: string;
  top: number;
  side: number;
  bottom: number;
  shape: Shape;
  pass: Pass;
  /** Emitted block light 0..15 */
  light: number;
  /** Blocks movement */
  solid: boolean;
  /** Hides neighbouring faces */
  occludes: boolean;
}

const TILE = 16;
const COLS = 16;
export const ATLAS_SIZE = TILE * COLS;

type Painter = (p: Pix, r: () => number) => void;

class Pix {
  data: Uint8ClampedArray;
  constructor(public ctx: CanvasRenderingContext2D, public ox: number, public oy: number) {
    this.data = new Uint8ClampedArray(TILE * TILE * 4);
  }
  set(x: number, y: number, c: string | number[], a = 255) {
    if (x < 0 || y < 0 || x >= TILE || y >= TILE) return;
    const rgb = typeof c === 'string' ? hex(c) : c;
    const i = (y * TILE + x) * 4;
    this.data[i] = rgb[0]; this.data[i + 1] = rgb[1]; this.data[i + 2] = rgb[2]; this.data[i + 3] = a;
  }
  get(x: number, y: number) {
    const i = (y * TILE + x) * 4;
    return [this.data[i], this.data[i + 1], this.data[i + 2], this.data[i + 3]];
  }
  fill(c: string, a = 255) { for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) this.set(x, y, c, a); }
  noise(palette: string[], r: () => number, weights?: number[]) {
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) this.set(x, y, pick(palette, r, weights));
  }
  rect(x: number, y: number, w: number, h: number, c: string, a = 255) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, c, a);
  }
  shade(x: number, y: number, k: number) {
    const [r, g, b, a] = this.get(x, y);
    this.set(x, y, [r * k, g * k, b * k], a);
  }
  commit() {
    const img = new ImageData(this.data as unknown as Uint8ClampedArray<ArrayBuffer>, TILE, TILE);
    this.ctx.putImageData(img, this.ox, this.oy);
  }
}

function hex(c: string): number[] {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function pick(p: string[], r: () => number, w?: number[]) {
  if (!w) return p[Math.floor(r() * p.length)];
  let t = r() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < p.length; i++) { t -= w[i]; if (t <= 0) return p[i]; }
  return p[p.length - 1];
}

// ---------- tile painters ----------
const T: Record<string, Painter> = {};

T.grass_top = (p, r) => p.noise(['#5fa83a', '#6bb843', '#559a33', '#74c24b', '#4f9030'], r, [3, 3, 2, 1, 1]);
T.dirt = (p, r) => p.noise(['#8a5a36', '#7a4e2e', '#946541', '#6e4428', '#9c6c48'], r, [3, 3, 2, 1, 1]);
T.grass_side = (p, r) => {
  T.dirt(p, r);
  for (let x = 0; x < 16; x++) {
    const h = 3 + Math.floor(r() * 3);
    for (let y = 0; y < h; y++) p.set(x, y, pick(['#5fa83a', '#6bb843', '#559a33'], r));
  }
};
T.stone = (p, r) => {
  p.noise(['#8a8d91', '#7e8185', '#95989c', '#74777b'], r, [3, 3, 2, 1]);
  for (let i = 0; i < 4; i++) {
    let x = Math.floor(r() * 16), y = Math.floor(r() * 16);
    for (let k = 0; k < 4; k++) { p.set(x, y, '#666a6e'); x += r() < 0.5 ? 1 : 0; y += 1; }
  }
};
T.cobble = (p, r) => {
  p.fill('#55585c');
  const stones = [[1, 1, 5, 4], [7, 0, 5, 4], [13, 1, 3, 5], [0, 6, 4, 5], [5, 5, 6, 5], [12, 7, 4, 4], [1, 12, 6, 4], [8, 11, 5, 5], [14, 12, 2, 4]];
  for (const [x, y, w, h] of stones) {
    const c = pick(['#8e9195', '#9a9da1', '#828589', '#a3a6aa'], r);
    p.rect(x, y, w, h, c);
    for (let i = 0; i < w; i++) p.shade(x + i, y + h - 1, 0.75);
    for (let i = 0; i < w - 1; i++) p.shade(x + i, y, 1.15);
  }
};
T.mossy = (p, r) => {
  T.cobble(p, r);
  for (let i = 0; i < 40; i++) p.set(Math.floor(r() * 16), Math.floor(r() * 16), pick(['#4f8a35', '#5c9a3e', '#3f7529'], r));
};
const planks = (base: string[], line: string): Painter => (p, r) => {
  for (let b = 0; b < 4; b++) {
    const c = base[Math.floor(r() * base.length)];
    for (let y = b * 4; y < b * 4 + 4; y++) for (let x = 0; x < 16; x++) {
      p.set(x, y, c);
      if (r() < 0.12) p.shade(x, y, 0.9);
    }
    for (let x = 0; x < 16; x++) p.set(x, b * 4 + 3, line);
    const cut = Math.floor(r() * 12) + 2;
    for (let y = b * 4; y < b * 4 + 3; y++) p.set(cut, y, line);
  }
};
T.planks = planks(['#b5884f', '#a87c47', '#bf9258'], '#7d5a30');
T.planks_dark = planks(['#6b4a2b', '#5f4126', '#734f2e'], '#3e2a17');
T.planks_pale = planks(['#d8c49a', '#cdb88c', '#e0cda4'], '#a08a62');
T.log_side = (p, r) => {
  for (let x = 0; x < 16; x++) {
    const c = pick(['#6e4f2c', '#5f4325', '#7a5832'], r);
    for (let y = 0; y < 16; y++) p.set(x, y, r() < 0.15 ? '#4f381e' : c);
  }
};
T.log_top = (p, r) => {
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
    p.set(x, y, d > 6.5 ? '#5f4325' : Math.floor(d) % 2 ? '#b9925a' : '#a27c49');
  }
};
T.birch_side = (p, r) => {
  p.noise(['#e8e4da', '#dcd8cc', '#f0ece2'], r);
  for (let i = 0; i < 6; i++) { const x = Math.floor(r() * 14), y = Math.floor(r() * 16); p.rect(x, y, 2 + Math.floor(r() * 3), 1, '#3b3631'); }
};
const leaves = (pal: string[], hole = 0.12): Painter => (p, r) => {
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    if (r() < hole) p.set(x, y, '#000000', 0);
    else p.set(x, y, pick(pal, r));
  }
};
T.leaves = leaves(['#3f8a2e', '#4a9a35', '#357a26', '#56a83e']);
T.leaves_autumn = leaves(['#d9822b', '#c96a1f', '#e8a23a', '#b85a1a']);
T.leaves_glow = leaves(['#2f7f86', '#3aa0a0', '#57d3c2', '#27646e'], 0.18);
T.leaves_pink = leaves(['#e79ac0', '#d982ae', '#f2b5d2', '#c96f9c']);
T.glass = (p) => {
  p.fill('#cfefff', 40);
  for (let i = 0; i < 16; i++) { p.set(i, 0, '#e8f8ff', 200); p.set(i, 15, '#e8f8ff', 200); p.set(0, i, '#e8f8ff', 200); p.set(15, i, '#e8f8ff', 200); }
  for (let i = 3; i < 7; i++) p.set(i, 10 - i, '#ffffff', 170);
  for (let i = 6; i < 9; i++) p.set(i, 12 - i, '#ffffff', 140);
};
T.water = (p, r) => {
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const w = Math.sin((x + y * 0.5) * 0.8) * 0.5 + 0.5;
    p.set(x, y, w > 0.8 ? '#5aa7e8' : r() < 0.5 ? '#3d7fd0' : '#3a78c6', 180);
  }
};
T.sand = (p, r) => p.noise(['#e3d29b', '#dbc88e', '#ecdca8', '#d2be82'], r);
T.gravel = (p, r) => p.noise(['#8a8582', '#6f6a67', '#9e9996', '#5d5856'], r);
T.brick = (p, r) => {
  p.fill('#b9b2a6');
  for (let row = 0; row < 4; row++) {
    const off = row % 2 ? 4 : 0;
    for (let b = -1; b < 3; b++) {
      const c = pick(['#a3473a', '#9a3f33', '#b0503f', '#8f3a2f'], r);
      p.rect(b * 8 + off + 1, row * 4 + 1, 7, 3, c);
    }
  }
};
const wool = (c: string[]): Painter => (p, r) => {
  p.noise(c, r, [4, 2, 1]);
  for (let y = 0; y < 16; y += 2) for (let x = (y / 2) % 2; x < 16; x += 2) p.shade(x, y, 0.94);
};
T.wool_white = wool(['#ecebe6', '#dfded8', '#f6f5f0']);
T.wool_red = wool(['#b8342f', '#a52d29', '#c64038']);
T.wool_blue = wool(['#2f5fb8', '#2a54a5', '#3a6dc6']);
T.wool_yellow = wool(['#e8c23a', '#d9b22d', '#f2cf4a']);
T.wool_green = wool(['#4c8a2e', '#437c28', '#579a36']);
T.wool_purple = wool(['#7a3fb0', '#6c35a0', '#8a4cc0']);
T.wool_orange = wool(['#e07a2a', '#d06c22', '#ec8a36']);
T.wool_black = wool(['#262329', '#1e1b21', '#2f2b33']);
T.wool_pink = wool(['#e58fb4', '#d97ea5', '#f0a2c3']);
T.wool_teal = wool(['#2b9a97', '#238784', '#36aca8']);
T.lantern = (p, r) => {
  p.fill('#4a2f18');
  p.rect(2, 2, 12, 12, '#ffd56a');
  p.rect(4, 4, 8, 8, '#fff2b8');
  p.rect(6, 6, 4, 4, '#ffffff');
  for (let i = 2; i < 14; i++) { p.set(i, 7, '#4a2f18'); p.set(7, i, '#4a2f18'); }
};
T.lantern_top = (p) => { p.fill('#4a2f18'); p.rect(5, 5, 6, 6, '#ffd56a'); };
T.glowblock = (p, r) => {
  p.noise(['#f6d27a', '#ffe7a3', '#e8b85a', '#fff4cf'], r);
  for (let i = 0; i < 16; i++) { p.set(i, 0, '#c99540'); p.set(0, i, '#c99540'); }
};
T.iron = (p, r) => {
  p.noise(['#d6d8db', '#cdd0d3', '#e2e4e6'], r);
  for (let i = 0; i < 16; i++) { p.set(i, 15, '#a9acb0'); p.set(15, i, '#a9acb0'); p.set(i, 0, '#eef0f2'); p.set(0, i, '#eef0f2'); }
};
T.gold = (p, r) => {
  p.noise(['#f2c94c', '#e6b93a', '#fbd968'], r);
  for (let i = 0; i < 16; i++) { p.set(i, 15, '#b8862a'); p.set(15, i, '#b8862a'); p.set(i, 0, '#fff0a0'); p.set(0, i, '#fff0a0'); }
};
T.bookshelf = (p, r) => {
  p.fill('#7d5a30');
  for (const sy of [1, 9]) {
    let x = 1;
    while (x < 15) {
      const w = 1 + Math.floor(r() * 2);
      const h = 5 + Math.floor(r() * 2);
      p.rect(x, sy + (6 - h), w, h, pick(['#9b2f2f', '#2f5f9b', '#2f8a4c', '#c9a03a', '#6d3f9b', '#c0c0b0'], r));
      x += w;
    }
    p.rect(0, sy + 6, 16, 1, '#4e3519');
  }
  p.rect(0, 0, 16, 1, '#4e3519');
};
T.crate = (p, r) => {
  T.planks(p, r);
  for (let i = 0; i < 16; i++) { p.set(i, 0, '#5a3e1f'); p.set(i, 15, '#5a3e1f'); p.set(0, i, '#5a3e1f'); p.set(15, i, '#5a3e1f'); p.set(i, i, '#5a3e1f'); p.set(15 - i, i, '#5a3e1f'); }
};
T.voidstone = (p, r) => {
  p.noise(['#2a1d3a', '#231832', '#33244a', '#1c1428'], r);
  for (let i = 0; i < 6; i++) p.set(Math.floor(r() * 16), Math.floor(r() * 16), '#a26cff');
};
T.frayed = (p, r) => {
  p.noise(['#7a6e8a', '#6a5e7c', '#8c7fa0', '#5c5070'], r);
  for (let i = 0; i < 3; i++) {
    let x = Math.floor(r() * 16), y = 0;
    while (y < 16) { p.set(x, y, '#c9a2ff'); y++; x += Math.floor(r() * 3) - 1; }
  }
};
T.basalt = (p, r) => {
  for (let x = 0; x < 16; x++) {
    const c = pick(['#3b3a3f', '#333237', '#44434a'], r);
    for (let y = 0; y < 16; y++) p.set(x, y, r() < 0.1 ? '#2a292e' : c);
  }
};
T.snow = (p, r) => p.noise(['#f5f8fb', '#e8eef4', '#ffffff'], r);
T.ice = (p, r) => {
  p.noise(['#a9d4f5', '#9cc9ee', '#b7ddf8'], r);
  for (let i = 2; i < 10; i++) p.set(i, 12 - i, '#e4f4ff');
};
T.path = (p, r) => p.noise(['#a07a4a', '#94703f', '#ab8655', '#8b673a'], r);
T.hay = (p, r) => {
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, pick(['#d9b23f', '#c9a033', '#e6c454'], r));
  for (const y of [3, 12]) for (let x = 0; x < 16; x++) p.set(x, y, '#9a3a2a');
};
T.roof_red = (p, r) => {
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const row = Math.floor(y / 4);
    const c = (y % 4 === 3) ? '#6e2420' : pick(['#b5463a', '#a83f34', '#c05043'], r);
    p.set((x + row * 2) % 16, y, c);
  }
};
T.roof_blue = (p, r) => {
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const c = (y % 4 === 3) ? '#1f3654' : pick(['#3d5f8f', '#36557f', '#46699a'], r);
    p.set(x, y, c);
  }
};
T.roof_green = (p, r) => {
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const c = (y % 4 === 3) ? '#24452a' : pick(['#4c7f4f', '#447347', '#558a58'], r);
    p.set(x, y, c);
  }
};
T.marble = (p, r) => {
  p.noise(['#ecebe8', '#e2e0dc', '#f4f3f0'], r);
  let x = 2, y = 0;
  while (y < 16) { p.set(x, y, '#c8c4bd'); y++; x += Math.floor(r() * 3) - 1; }
};
T.marble_tile = (p, r) => {
  T.marble(p, r);
  for (let i = 0; i < 16; i++) { p.set(i, 0, '#bdb8b0'); p.set(0, i, '#bdb8b0'); }
};
const crystal = (pal: string[], dark: string): Painter => (p, r) => {
  p.noise(pal, r);
  for (let i = 0; i < 16; i++) { p.set(i, i, dark); p.set(15 - i, i, dark); }
  p.rect(5, 5, 6, 6, '#ffffff', 230);
  p.rect(6, 6, 4, 4, pal[0]);
};
T.keystone = crystal(['#4fe3d2', '#38c9b9', '#7ff2e4'], '#1f8a80');
T.ember = crystal(['#ff8a3a', '#ff6a1a', '#ffb066'], '#a83a10');
T.tide = crystal(['#4a8cff', '#3270e8', '#7ab0ff'], '#1a3f9a');
T.root = crystal(['#7ad04a', '#5cb535', '#a2e872'], '#2d6b1a');
T.gale = crystal(['#e6e9ff', '#c9cff5', '#ffffff'], '#7a82b8');
const ore = (dot: string[]): Painter => (p, r) => {
  T.stone(p, r);
  for (let i = 0; i < 5; i++) {
    const x = Math.floor(r() * 13) + 1, y = Math.floor(r() * 13) + 1;
    p.rect(x, y, 2, 2, pick(dot, r));
    p.set(x + 1, y + 1, dot[0]);
  }
};
T.ore_iron = ore(['#d8a07a', '#c88c66', '#e4b896']);
T.ore_gold = ore(['#f5d04a', '#e6bb33', '#fff08a']);
T.ore_spark = ore(['#ff9a2a', '#ff7a10', '#ffc070']);
T.lava = (p, r) => {
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const v = Math.sin(x * 0.7 + y * 0.4) + Math.sin(y * 0.9 - x * 0.3);
    p.set(x, y, v > 1 ? '#ffe066' : v > 0 ? '#ff9a2a' : pick(['#e8571c', '#d84a14'], r));
  }
};
T.rail = (p) => {
  p.fill('#000000', 0);
  for (const y of [1, 5, 9, 13]) p.rect(1, y, 14, 2, '#6b4a2b');
  for (let y = 0; y < 16; y++) { p.set(3, y, '#a9acb0'); p.set(12, y, '#a9acb0'); p.set(4, y, '#7c7f83'); p.set(11, y, '#7c7f83'); }
};
T.sparkwire = (p) => {
  p.fill('#000000', 0);
  for (let y = 0; y < 16; y++) { p.set(7, y, '#ffb347'); p.set(8, y, '#ff8a1a'); }
  for (let x = 0; x < 16; x++) { p.set(x, 7, '#ffb347'); p.set(x, 8, '#ff8a1a'); }
  p.rect(6, 6, 4, 4, '#fff0b0');
};
const cross = (stem: string, head: string[], tall = 9): Painter => (p, r) => {
  p.fill('#000000', 0);
  for (let y = 16 - tall; y < 16; y++) p.set(7, y, stem);
  p.set(6, 12, stem); p.set(8, 11, stem);
  const hy = 16 - tall - 2;
  p.rect(6, hy, 3, 3, head[0]);
  p.set(7, hy + 1, head[1] ?? head[0]);
  p.set(5, hy + 1, head[0]); p.set(9, hy + 1, head[0]);
};
T.flower_red = cross('#3e7d28', ['#d63a3a', '#ffd84a']);
T.flower_yellow = cross('#3e7d28', ['#f2d03a', '#b5651d']);
T.flower_blue = cross('#3e7d28', ['#4a7ae8', '#ffffff']);
T.flower_glow = cross('#2a6b6b', ['#7ff2e4', '#ffffff'], 7);
T.tallgrass = (p, r) => {
  p.fill('#000000', 0);
  for (let i = 0; i < 9; i++) {
    const x = 1 + Math.floor(r() * 14);
    const h = 5 + Math.floor(r() * 9);
    for (let y = 16 - h; y < 16; y++) p.set(x, y, pick(['#5fa83a', '#4f9030', '#6bb843'], r));
  }
};
T.mushroom = (p) => {
  p.fill('#000000', 0);
  p.rect(7, 10, 2, 6, '#e8e0cc');
  p.rect(4, 7, 8, 3, '#c0392b');
  p.rect(5, 6, 6, 1, '#c0392b');
  p.set(6, 7, '#ffffff'); p.set(9, 8, '#ffffff');
};
T.torch = (p) => {
  p.fill('#000000', 0);
  p.rect(7, 6, 2, 10, '#6b4a2b');
  p.rect(6, 3, 4, 3, '#ffb347');
  p.rect(7, 2, 2, 2, '#fff0b0');
};
T.reeds = (p, r) => {
  p.fill('#000000', 0);
  for (const x of [3, 7, 11]) { for (let y = 2; y < 16; y++) p.set(x + (y < 6 ? 1 : 0), y, '#6a8f3a'); p.rect(x, 1, 2, 4, '#7a4e2e'); }
};
T.coral = (p, r) => {
  p.fill('#000000', 0);
  const c = pick(['#e85a8a', '#f29a3a', '#b05ae8'], r);
  for (let y = 4; y < 16; y++) { p.set(7, y, c); if (y % 3 === 0) { p.set(5, y - 1, c); p.set(9, y - 2, c); p.set(4, y - 2, c); p.set(10, y - 3, c); } }
};
T.copper = (p, r) => {
  p.noise(['#c47a4a', '#b86e40', '#d08a58', '#6aa58f'], r, [4, 3, 2, 1]);
  for (let i = 0; i < 16; i++) { p.set(i, 15, '#8a4f2a'); p.set(15, i, '#8a4f2a'); }
};
T.pipe = (p, r) => {
  p.noise(['#7c7f83', '#6f7276', '#888b8f'], r);
  for (let i = 0; i < 16; i++) { p.set(i, 0, '#4a4d51'); p.set(i, 15, '#4a4d51'); p.set(i, 7, '#9a9da1'); }
  p.rect(2, 2, 2, 2, '#4a4d51'); p.rect(12, 2, 2, 2, '#4a4d51'); p.rect(2, 12, 2, 2, '#4a4d51'); p.rect(12, 12, 2, 2, '#4a4d51');
};
T.paper = (p, r) => {
  p.noise(['#efe6cf', '#e6dcc2', '#f6eedb'], r);
  for (let y = 3; y < 14; y += 3) for (let x = 2; x < 14; x++) if (r() < 0.7) p.set(x, y, '#8f8572');
};
T.map = (p, r) => {
  p.noise(['#e8d9b0', '#dfcea2', '#efe2bf'], r);
  let x = 2, y = 3;
  for (let i = 0; i < 20; i++) { p.set(x, y, '#9a3a2a'); x = Math.min(13, x + (r() < 0.6 ? 1 : 0)); y = Math.min(13, y + (r() < 0.5 ? 1 : 0)); }
  p.rect(10, 10, 3, 3, '#3a6b9a');
};
T.banner_red = (p, r) => { p.noise(['#b8342f', '#a52d29'], r); p.rect(6, 4, 4, 8, '#f2d03a'); p.rect(7, 6, 2, 4, '#b8342f'); };
T.banner_blue = (p, r) => { p.noise(['#2f5fb8', '#2a54a5'], r); p.rect(5, 5, 6, 6, '#ecebe6'); p.rect(7, 7, 2, 2, '#2f5fb8'); };
T.cloud = (p) => p.fill('#ffffff', 230);
T.obsid = (p, r) => {
  p.noise(['#1a1424', '#140f1c', '#221a2e'], r);
  for (let i = 0; i < 8; i++) p.set(Math.floor(r() * 16), Math.floor(r() * 16), '#4a3a6a');
};
T.table_top = (p, r) => { T.planks(p, r); for (let i = 0; i < 16; i++) { p.set(i, 0, '#5a3e1f'); p.set(0, i, '#5a3e1f'); p.set(i, 15, '#5a3e1f'); p.set(15, i, '#5a3e1f'); } };
T.workbench_top = (p, r) => {
  T.planks(p, r);
  for (let i = 1; i < 15; i++) for (const k of [5, 10]) { p.set(i, k, '#4e3519'); p.set(k, i, '#4e3519'); }
};
T.workbench_side = (p, r) => {
  T.planks(p, r);
  p.rect(2, 3, 2, 6, '#9aa0a6'); p.rect(2, 2, 4, 2, '#9aa0a6');
  p.rect(10, 4, 4, 1, '#6b4a2b'); p.rect(11, 5, 2, 6, '#5a3e1f');
};
T.stall_awning = (p) => { for (let x = 0; x < 16; x++) for (let y = 0; y < 16; y++) p.set(x, y, Math.floor(x / 4) % 2 ? '#ecebe6' : '#c0392b'); };
T.stall_awning_b = (p) => { for (let x = 0; x < 16; x++) for (let y = 0; y < 16; y++) p.set(x, y, Math.floor(x / 4) % 2 ? '#ecebe6' : '#2f8a8a'); };
T.beacon_core = (p, r) => {
  p.fill('#2d2a38');
  p.rect(2, 2, 12, 12, '#7ff2e4');
  p.rect(4, 4, 8, 8, '#e8fffb');
  for (let i = 0; i < 16; i++) { p.set(i, 0, '#14111c'); p.set(0, i, '#14111c'); p.set(i, 15, '#14111c'); p.set(15, i, '#14111c'); }
};
T.beacon_dead = (p, r) => {
  p.fill('#2d2a38');
  p.rect(2, 2, 12, 12, '#4a5a66');
  p.rect(4, 4, 8, 8, '#5d6e7a');
};
T.carpet_red = (p, r) => { p.noise(['#a52d29', '#b8342f'], r); for (let i = 0; i < 16; i++) { p.set(i, 1, '#f2d03a'); p.set(i, 14, '#f2d03a'); } };

// ---------- block definitions ----------

const tileIndex: Record<string, number> = {};
const tileOrder: string[] = Object.keys(T);
tileOrder.forEach((k, i) => (tileIndex[k] = i));

interface BlockOpts { top?: string; side?: string; bottom?: string; all?: string; shape?: Shape; pass?: Pass; light?: number; solid?: boolean }

export const BLOCKS: BlockDef[] = [];
export const BLOCK_ID: Record<string, number> = {};

function def(name: string, o: BlockOpts = {}) {
  const all = o.all ?? name;
  const side = o.side ?? all;
  const top = o.top ?? all;
  const bottom = o.bottom ?? o.top ?? all;
  for (const t of [side, top, bottom]) if (!(t in tileIndex)) throw new Error(`missing tile ${t}`);
  const shape = o.shape ?? 'cube';
  const pass = o.pass ?? (shape === 'cube' ? 'opaque' : 'cutout');
  const b: BlockDef = {
    id: BLOCKS.length,
    name,
    top: tileIndex[top],
    side: tileIndex[side],
    bottom: tileIndex[bottom],
    shape,
    pass,
    light: o.light ?? 0,
    solid: o.solid ?? shape === 'cube',
    occludes: shape === 'cube' && pass === 'opaque',
  };
  BLOCKS.push(b);
  BLOCK_ID[name] = b.id;
}

def('air', { all: 'cloud', solid: false });
BLOCKS[0].occludes = false;
def('grass', { top: 'grass_top', side: 'grass_side', bottom: 'dirt' });
def('dirt');
def('stone');
def('cobble');
def('mossy');
def('planks');
def('planks_dark');
def('planks_pale');
def('log', { side: 'log_side', top: 'log_top' });
def('birch', { side: 'birch_side', top: 'log_top' });
def('leaves', { pass: 'cutout' });
def('leaves_autumn', { pass: 'cutout' });
def('leaves_glow', { pass: 'cutout', light: 6 });
def('leaves_pink', { pass: 'cutout' });
def('glass', { pass: 'trans' });
def('water', { pass: 'trans', solid: false });
def('sand');
def('gravel');
def('brick');
for (const c of ['white', 'red', 'blue', 'yellow', 'green', 'purple', 'orange', 'black', 'pink', 'teal']) def(`wool_${c}`);
def('lantern', { side: 'lantern', top: 'lantern_top', light: 14 });
def('glowblock', { light: 15 });
def('iron');
def('gold');
def('bookshelf', { top: 'planks', side: 'bookshelf' });
def('crate');
def('voidstone', { light: 2 });
def('frayed');
def('basalt');
def('snow');
def('ice', { pass: 'trans' });
def('path', { top: 'path', side: 'dirt' });
def('hay');
def('roof_red');
def('roof_blue');
def('roof_green');
def('marble');
def('marble_tile');
def('keystone', { light: 12 });
def('ember', { light: 15 });
def('tide', { light: 13 });
def('root', { light: 12 });
def('gale', { light: 13 });
def('ore_iron');
def('ore_gold');
def('ore_spark', { light: 5 });
def('lava', { light: 15, solid: false });
def('rail', { shape: 'flat', solid: false });
def('sparkwire', { shape: 'flat', solid: false, light: 7 });
def('flower_red', { shape: 'cross' });
def('flower_yellow', { shape: 'cross' });
def('flower_blue', { shape: 'cross' });
def('flower_glow', { shape: 'cross', light: 7 });
def('tallgrass', { shape: 'cross' });
def('mushroom', { shape: 'cross' });
def('torch', { shape: 'cross', light: 13 });
def('reeds', { shape: 'cross' });
def('coral', { shape: 'cross' });
def('copper');
def('pipe');
def('paper');
def('map');
def('banner_red');
def('banner_blue');
def('obsid');
def('table', { top: 'table_top', side: 'planks_dark' });
def('workbench', { top: 'workbench_top', side: 'workbench_side', bottom: 'planks' });
def('awning', { all: 'stall_awning' });
def('awning_b', { all: 'stall_awning_b' });
def('beacon_core', { light: 15 });
def('beacon_dead', { all: 'beacon_dead' });
def('carpet', { all: 'carpet_red' });
def('barrier', { all: 'cloud', pass: 'trans' }); // invisible wall
BLOCKS[BLOCK_ID.barrier].occludes = false;

export function blockId(name: string): number {
  const id = BLOCK_ID[name];
  if (id === undefined) throw new Error(`Unknown block "${name}"`);
  return id;
}

let atlasCanvas: HTMLCanvasElement | null = null;

export function buildAtlas(): HTMLCanvasElement {
  if (atlasCanvas) return atlasCanvas;
  const c = document.createElement('canvas');
  c.width = ATLAS_SIZE;
  c.height = ATLAS_SIZE;
  const ctx = c.getContext('2d')!;
  tileOrder.forEach((name, i) => {
    const p = new Pix(ctx, (i % COLS) * TILE, Math.floor(i / COLS) * TILE);
    T[name](p, mulberry32(i * 9187 + 13));
    p.commit();
  });
  atlasCanvas = c;
  return c;
}

/** UV rect for a tile, inset slightly to avoid bleeding. */
export function tileUV(i: number): [number, number, number, number] {
  const u0 = (i % COLS) / COLS, v0 = Math.floor(i / COLS) / COLS;
  const e = 0.02 / COLS;
  // Flip V since canvas y goes down; texture has flipY = true by default
  return [u0 + e, 1 - (v0 + 1 / COLS) + e, u0 + 1 / COLS - e, 1 - v0 - e];
}

/** Draw a tile into a small canvas (for item icons). */
export function tileCanvas(name: string, size = 32): HTMLCanvasElement {
  const atlas = buildAtlas();
  const i = tileIndex[name];
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(atlas, (i % COLS) * TILE, Math.floor(i / COLS) * TILE, TILE, TILE, 0, 0, size, size);
  return c;
}
export function hasTile(name: string) { return name in tileIndex; }
