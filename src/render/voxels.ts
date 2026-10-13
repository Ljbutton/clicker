// Chunked voxel world with baked ambient occlusion, block light and a
// simple sky-cover term, rendered with a small custom shader.
import * as THREE from 'three';
import { BLOCKS, BLOCK_ID, blockId, buildAtlas, tileUV } from './blocks';

const CS = 16;

export const voxelUniforms = {
  uAtlas: { value: null as THREE.Texture | null },
  uAmbient: { value: new THREE.Color(1, 1, 1) },
  uShadow: { value: 0.42 },
  uLamp: { value: new THREE.Color(1.0, 0.78, 0.45) },
  uFogColor: { value: new THREE.Color(0.7, 0.85, 1) },
  uFogNear: { value: 40 },
  uFogFar: { value: 110 },
  uTime: { value: 0 },
};

const vert = /* glsl */ `
attribute float aShade;
attribute float aSky;
attribute float aLight;
attribute float aEmit;
varying vec2 vUv;
varying float vShade;
varying float vSky;
varying float vLight;
varying float vEmit;
varying float vDepth;
uniform float uTime;
void main() {
  vUv = uv;
  vShade = aShade; vSky = aSky; vLight = aLight; vEmit = aEmit;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}`;

const frag = /* glsl */ `
uniform sampler2D uAtlas;
uniform vec3 uAmbient;
uniform float uShadow;
uniform vec3 uLamp;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
uniform float uAlphaCut;
uniform float uOpacity;
varying vec2 vUv;
varying float vShade;
varying float vSky;
varying float vLight;
varying float vEmit;
varying float vDepth;
void main() {
  vec4 tex = texture2D(uAtlas, vUv);
  if (tex.a < uAlphaCut) discard;
  float l = vLight * vLight;
  vec3 light = uAmbient * mix(uShadow, 1.0, vSky) * vShade + uLamp * l * (0.55 + 0.45 * vShade);
  light = max(light, vec3(vEmit));
  vec3 col = tex.rgb * light;
  float f = smoothstep(uFogNear, uFogFar, vDepth);
  col = mix(col, uFogColor, f);
  gl_FragColor = vec4(col, tex.a * uOpacity);
}`;

function makeMaterial(pass: 'opaque' | 'cutout' | 'trans') {
  const m = new THREE.ShaderMaterial({
    uniforms: { ...voxelUniforms, uAlphaCut: { value: pass === 'trans' ? 0.01 : 0.5 }, uOpacity: { value: 1 } },
    vertexShader: vert,
    fragmentShader: frag,
    transparent: pass === 'trans',
    depthWrite: pass !== 'trans',
    side: pass === 'cutout' ? THREE.DoubleSide : THREE.FrontSide,
  });
  return m;
}

let materials: Record<string, THREE.ShaderMaterial> | null = null;
function getMaterials() {
  if (!materials) {
    const tex = new THREE.CanvasTexture(buildAtlas());
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    tex.colorSpace = THREE.SRGBColorSpace;
    voxelUniforms.uAtlas.value = tex;
    materials = { opaque: makeMaterial('opaque'), cutout: makeMaterial('cutout'), trans: makeMaterial('trans') };
  }
  return materials;
}

// face: normal, 4 corners (ccw from outside), shade
const FACES = [
  { n: [1, 0, 0], c: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]], s: 0.8, k: 'side' },
  { n: [-1, 0, 0], c: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], s: 0.8, k: 'side' },
  { n: [0, 1, 0], c: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], s: 1.0, k: 'top' },
  { n: [0, -1, 0], c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], s: 0.5, k: 'bottom' },
  { n: [0, 0, 1], c: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], s: 0.9, k: 'side' },
  { n: [0, 0, -1], c: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], s: 0.7, k: 'side' },
] as const;

class Buf {
  pos: number[] = []; uv: number[] = []; shade: number[] = []; sky: number[] = []; light: number[] = []; emit: number[] = []; idx: number[] = [];
  n = 0;
  quad(p: number[][], uv: number[][], sh: number[], sk: number[], li: number[], em: number, flip = false) {
    for (let i = 0; i < 4; i++) {
      this.pos.push(p[i][0], p[i][1], p[i][2]);
      this.uv.push(uv[i][0], uv[i][1]);
      this.shade.push(sh[i]); this.sky.push(sk[i]); this.light.push(li[i]); this.emit.push(em);
    }
    const n = this.n;
    if (flip) this.idx.push(n, n + 1, n + 3, n + 1, n + 2, n + 3);
    else this.idx.push(n, n + 1, n + 2, n, n + 2, n + 3);
    this.n += 4;
  }
  geometry() {
    if (!this.n) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('aShade', new THREE.Float32BufferAttribute(this.shade, 1));
    g.setAttribute('aSky', new THREE.Float32BufferAttribute(this.sky, 1));
    g.setAttribute('aLight', new THREE.Float32BufferAttribute(this.light, 1));
    g.setAttribute('aEmit', new THREE.Float32BufferAttribute(this.emit, 1));
    g.setIndex(this.idx);
    g.computeBoundingSphere();
    return g;
  }
}

export class VoxelWorld {
  data: Uint8Array;
  lightData: Uint8Array;
  top: Int16Array;
  group = new THREE.Group();
  chunks = new Map<string, THREE.Mesh[]>();
  dirty = new Set<string>();
  lightDirty = false;
  constructor(public sx: number, public sy: number, public sz: number) {
    this.data = new Uint8Array(sx * sy * sz);
    this.lightData = new Uint8Array(sx * sy * sz);
    this.top = new Int16Array(sx * sz).fill(-1);
  }

  inside(x: number, y: number, z: number) {
    return x >= 0 && y >= 0 && z >= 0 && x < this.sx && y < this.sy && z < this.sz;
  }
  idx(x: number, y: number, z: number) { return (y * this.sz + z) * this.sx + x; }
  get(x: number, y: number, z: number) {
    if (!this.inside(x, y, z)) return 0;
    return this.data[this.idx(x, y, z)];
  }
  name(x: number, y: number, z: number) { return BLOCKS[this.get(x, y, z)].name; }
  /** Raw set without dirty-tracking (used while building a set). */
  put(x: number, y: number, z: number, b: number | string) {
    x = Math.floor(x); y = Math.floor(y); z = Math.floor(z);
    if (!this.inside(x, y, z)) return;
    this.data[this.idx(x, y, z)] = typeof b === 'string' ? blockId(b) : b;
  }
  /** Set and mark for rebuild. */
  set(x: number, y: number, z: number, b: number | string) {
    x = Math.floor(x); y = Math.floor(y); z = Math.floor(z);
    if (!this.inside(x, y, z)) return;
    const id = typeof b === 'string' ? blockId(b) : b;
    const old = this.data[this.idx(x, y, z)];
    if (old === id) return;
    this.data[this.idx(x, y, z)] = id;
    this.updateTop(x, z);
    const L = this.lightData;
    let nearLight = BLOCKS[old].light > 0 || BLOCKS[id].light > 0;
    if (!nearLight) for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1], [0, 0, 0]]) {
      if (this.inside(x + dx, y + dy, z + dz) && L[this.idx(x + dx, y + dy, z + dz)] > 1) { nearLight = true; break; }
    }
    if (nearLight) this.lightDirty = true;
    const r = nearLight ? 16 : 1;
    const keys = new Set<string>();
    for (const dx of [-r, 0, r]) for (const dy of [-r, 0, r]) for (const dz of [-r, 0, r]) {
      keys.add(`${Math.floor((x + dx) / CS)},${Math.floor((y + dy) / CS)},${Math.floor((z + dz) / CS)}`);
    }
    for (const k of keys) this.dirty.add(k);
  }
  solid(x: number, y: number, z: number) {
    return BLOCKS[this.get(Math.floor(x), Math.floor(y), Math.floor(z))].solid;
  }
  occ(x: number, y: number, z: number) { return BLOCKS[this.get(x, y, z)].occludes; }

  /** Top of the highest solid block at/below fromY in column. Returns y of standing surface. */
  groundY(x: number, z: number, fromY = this.sy - 1) {
    const xi = Math.floor(x), zi = Math.floor(z);
    for (let y = Math.min(this.sy - 1, Math.floor(fromY)); y >= 0; y--) {
      if (this.solid(xi, y, zi)) return y + 1;
    }
    return 0;
  }
  /** Highest walkable surface at column (no fromY). */
  surface(x: number, z: number) { return this.groundY(x, z); }

  updateTop(x: number, z: number) {
    let t = -1;
    for (let y = this.sy - 1; y >= 0; y--) if (this.occ(x, y, z)) { t = y; break; }
    this.top[z * this.sx + x] = t;
  }
  computeTops() { for (let z = 0; z < this.sz; z++) for (let x = 0; x < this.sx; x++) this.updateTop(x, z); }

  /** Sky exposure 0..1 for an air cell. Averages nearby columns for softness. */
  sky(x: number, y: number, z: number) {
    let open = 0, n = 0;
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      const cx = x + dx, cz = z + dz;
      n++;
      if (cx < 0 || cz < 0 || cx >= this.sx || cz >= this.sz) { open++; continue; }
      if (this.top[cz * this.sx + cx] < y) open += (dx === 0 && dz === 0) ? 1 : 1;
    }
    const centerOpen = (x < 0 || z < 0 || x >= this.sx || z >= this.sz) || this.top[z * this.sx + x] < y;
    const v = open / n;
    return centerOpen ? 0.55 + 0.45 * v : 0.6 * v;
  }

  computeLight() {
    const L = this.lightData;
    L.fill(0);
    const q: number[] = [];
    for (let y = 0; y < this.sy; y++) for (let z = 0; z < this.sz; z++) for (let x = 0; x < this.sx; x++) {
      const b = BLOCKS[this.data[this.idx(x, y, z)]];
      if (b.light) { L[this.idx(x, y, z)] = b.light; q.push(x, y, z); }
    }
    let h = 0;
    while (h < q.length) {
      const x = q[h++], y = q[h++], z = q[h++];
      const lv = L[this.idx(x, y, z)];
      if (lv <= 1) continue;
      const nb = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
      for (const [dx, dy, dz] of nb) {
        const nx = x + dx, ny = y + dy, nz = z + dz;
        if (!this.inside(nx, ny, nz)) continue;
        const i = this.idx(nx, ny, nz);
        if (BLOCKS[this.data[i]].occludes) continue;
        if (L[i] < lv - 1) { L[i] = lv - 1; q.push(nx, ny, nz); }
      }
    }
    this.lightDirty = false;
  }
  lightAt(x: number, y: number, z: number) {
    if (!this.inside(x, y, z)) return 0;
    return this.lightData[this.idx(x, y, z)];
  }

  /** Build all chunk meshes. */
  buildAll() {
    this.computeTops();
    this.computeLight();
    for (const meshes of this.chunks.values()) for (const m of meshes) { this.group.remove(m); m.geometry.dispose(); }
    this.chunks.clear();
    for (let cy = 0; cy < Math.ceil(this.sy / CS); cy++)
      for (let cz = 0; cz < Math.ceil(this.sz / CS); cz++)
        for (let cx = 0; cx < Math.ceil(this.sx / CS); cx++) this.buildChunk(cx, cy, cz);
    this.dirty.clear();
  }

  /** Rebuild dirty chunks (call each frame). */
  flush(maxChunks = 6) {
    if (!this.dirty.size) return;
    if (this.lightDirty) this.computeLight();
    let n = 0;
    for (const key of [...this.dirty]) {
      this.dirty.delete(key);
      const [cx, cy, cz] = key.split(',').map(Number);
      if (cx < 0 || cy < 0 || cz < 0 || cx * CS >= this.sx || cy * CS >= this.sy || cz * CS >= this.sz) continue;
      this.buildChunk(cx, cy, cz);
      if (++n >= maxChunks) break;
    }
  }

  private buildChunk(cx: number, cy: number, cz: number) {
    const key = `${cx},${cy},${cz}`;
    const old = this.chunks.get(key);
    if (old) for (const m of old) { this.group.remove(m); m.geometry.dispose(); }
    const bufs = { opaque: new Buf(), cutout: new Buf(), trans: new Buf() };
    const x1 = Math.min(this.sx, (cx + 1) * CS), y1 = Math.min(this.sy, (cy + 1) * CS), z1 = Math.min(this.sz, (cz + 1) * CS);
    for (let y = cy * CS; y < y1; y++) for (let z = cz * CS; z < z1; z++) for (let x = cx * CS; x < x1; x++) {
      const id = this.data[this.idx(x, y, z)];
      if (!id) continue;
      const b = BLOCKS[id];
      if (b.name === 'barrier') continue;
      const buf = bufs[b.pass];
      if (b.shape === 'cube') this.cube(buf, x, y, z, id);
      else if (b.shape === 'cross') this.cross(buf, x, y, z, id);
      else this.flat(buf, x, y, z, id);
    }
    const mats = getMaterials();
    const meshes: THREE.Mesh[] = [];
    for (const pass of ['opaque', 'cutout', 'trans'] as const) {
      const g = bufs[pass].geometry();
      if (!g) continue;
      const m = new THREE.Mesh(g, mats[pass]);
      m.renderOrder = pass === 'trans' ? 2 : 0;
      this.group.add(m);
      meshes.push(m);
    }
    this.chunks.set(key, meshes);
  }

  private cube(buf: Buf, x: number, y: number, z: number, id: number) {
    const b = BLOCKS[id];
    for (const f of FACES) {
      const nx = x + f.n[0], ny = y + f.n[1], nz = z + f.n[2];
      const nid = this.get(nx, ny, nz);
      const nb = BLOCKS[nid];
      if (nb.occludes) continue;
      if (b.pass !== 'opaque' && nid === id) continue; // merge glass/water/leaves interiors
      if (b.name === 'water' && nb.name !== 'air' && nb.pass !== 'cutout' && !(f.n[1] === 1)) { if (nb.solid) continue; }
      const tile = f.k === 'top' ? b.top : f.k === 'bottom' ? b.bottom : b.side;
      const [u0, v0, u1, v1] = tileUV(tile);
      const uvs = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
      const pts: number[][] = [];
      const sh: number[] = [], sk: number[] = [], li: number[] = [];
      const lightHere = this.lightAt(nx, ny, nz) / 15;
      const skyHere = this.sky(nx, ny, nz);
      const waterTop = b.name === 'water' && f.n[1] === 1 && BLOCKS[this.get(x, y + 1, z)].name !== 'water';
      for (const c of f.c) {
        const py = y + c[1] - (waterTop && c[1] === 1 ? 0.12 : 0);
        pts.push([x + c[0], py, z + c[2]]);
        // AO: sample the 3 neighbours around this vertex on the face's outer side
        const ao = this.ao(x, y, z, f.n, c);
        sh.push(f.s * ao);
        // smooth light: average of the outer cell and neighbours
        sk.push(skyHere);
        li.push(Math.max(lightHere, this.vertexLight(x, y, z, f.n, c)));
      }
      const flip = sh[0] + sh[2] < sh[1] + sh[3];
      buf.quad(pts, uvs, sh, sk, li, b.light >= 10 ? 1 : b.light ? 0.6 : 0, flip);
    }
  }

  private ao(x: number, y: number, z: number, n: readonly number[], c: readonly number[]) {
    // axes perpendicular to normal
    const ox = x + n[0], oy = y + n[1], oz = z + n[2];
    const d = [c[0] * 2 - 1, c[1] * 2 - 1, c[2] * 2 - 1];
    const axes: number[][] = [];
    for (let i = 0; i < 3; i++) if (n[i] === 0) { const a = [0, 0, 0]; a[i] = d[i]; axes.push(a); }
    const s1 = this.occ(ox + axes[0][0], oy + axes[0][1], oz + axes[0][2]) ? 1 : 0;
    const s2 = this.occ(ox + axes[1][0], oy + axes[1][1], oz + axes[1][2]) ? 1 : 0;
    const cr = this.occ(ox + axes[0][0] + axes[1][0], oy + axes[0][1] + axes[1][1], oz + axes[0][2] + axes[1][2]) ? 1 : 0;
    const v = s1 && s2 ? 0 : 3 - (s1 + s2 + cr);
    return 0.55 + 0.15 * v;
  }

  private vertexLight(x: number, y: number, z: number, n: readonly number[], c: readonly number[]) {
    const ox = x + n[0], oy = y + n[1], oz = z + n[2];
    const d = [c[0] * 2 - 1, c[1] * 2 - 1, c[2] * 2 - 1];
    let m = 0, cnt = 0;
    for (let i = 0; i < 3; i++) if (n[i] === 0) {
      const a = [0, 0, 0]; a[i] = d[i];
      m += this.lightAt(ox + a[0], oy + a[1], oz + a[2]); cnt++;
    }
    return (m / Math.max(1, cnt)) / 15 * 0.9;
  }

  private cross(buf: Buf, x: number, y: number, z: number, id: number) {
    const b = BLOCKS[id];
    const [u0, v0, u1, v1] = tileUV(b.side);
    const uvs = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
    const li = this.lightAt(x, y, z) / 15;
    const sk = this.sky(x, y, z);
    const e = 0.15;
    const quads = [
      [[x + e, y, z + e], [x + 1 - e, y, z + 1 - e], [x + 1 - e, y + 1, z + 1 - e], [x + e, y + 1, z + e]],
      [[x + 1 - e, y, z + e], [x + e, y, z + 1 - e], [x + e, y + 1, z + 1 - e], [x + 1 - e, y + 1, z + e]],
    ];
    for (const q of quads) buf.quad(q, uvs, [0.75, 0.75, 0.95, 0.95], [sk, sk, sk, sk], [li, li, li, li], b.light >= 10 ? 1 : b.light ? 0.6 : 0);
  }

  private flat(buf: Buf, x: number, y: number, z: number, id: number) {
    const b = BLOCKS[id];
    const [u0, v0, u1, v1] = tileUV(b.top);
    const uvs = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
    const li = this.lightAt(x, y, z) / 15;
    const sk = this.sky(x, y, z);
    const h = y + 0.04;
    // orient rails along the axis with more rail neighbours
    const alongX = BLOCKS[this.get(x - 1, y, z)].name === b.name || BLOCKS[this.get(x + 1, y, z)].name === b.name;
    const q = [[x, h, z + 1], [x + 1, h, z + 1], [x + 1, h, z], [x, h, z]];
    const uvr = alongX ? [uvs[1], uvs[2], uvs[3], uvs[0]] : uvs;
    buf.quad(q, uvr, [1, 1, 1, 1], [sk, sk, sk, sk], [li, li, li, li], b.light ? 0.8 : 0);
  }

  /** Raycast through voxels; returns hit block and the face normal. */
  raycast(origin: THREE.Vector3, dir: THREE.Vector3, maxDist = 80): { x: number; y: number; z: number; n: number[] } | null {
    let x = Math.floor(origin.x), y = Math.floor(origin.y), z = Math.floor(origin.z);
    const sx = Math.sign(dir.x), sy = Math.sign(dir.y), sz = Math.sign(dir.z);
    const tdx = Math.abs(1 / dir.x), tdy = Math.abs(1 / dir.y), tdz = Math.abs(1 / dir.z);
    let tx = (sx > 0 ? x + 1 - origin.x : origin.x - x) * tdx;
    let ty = (sy > 0 ? y + 1 - origin.y : origin.y - y) * tdy;
    let tz = (sz > 0 ? z + 1 - origin.z : origin.z - z) * tdz;
    let n = [0, 0, 0];
    let t = 0;
    while (t < maxDist) {
      const id = this.get(x, y, z);
      if (id && BLOCKS[id].solid) return { x, y, z, n };
      if (tx < ty && tx < tz) { x += sx; t = tx; tx += tdx; n = [-sx, 0, 0]; }
      else if (ty < tz) { y += sy; t = ty; ty += tdy; n = [0, -sy, 0]; }
      else { z += sz; t = tz; tz += tdz; n = [0, 0, -sz]; }
      if (y < -2 && sy < 0) return null;
    }
    return null;
  }

  dispose() {
    for (const meshes of this.chunks.values()) for (const m of meshes) m.geometry.dispose();
    this.chunks.clear();
  }
}

export { BLOCK_ID };
