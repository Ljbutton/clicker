// The 3D stage: renderer, sky, camera shots, particles, actors and set loading.
import * as THREE from 'three';
import type { CharDef, ShotSpec, SkyName, Vec3 } from '../core/types';
import { Actor } from './characters';
import { VoxelWorld, voxelUniforms } from './voxels';
import { BLOCKS } from './blocks';

export interface SetDef {
  id: string;
  size: [number, number, number];
  sky: SkyName;
  build(w: VoxelWorld, flags: Record<string, unknown>): void;
  cams: Record<string, { pos: Vec3; look: Vec3 }>;
  lights?: Array<{ at: Vec3; color?: string; intensity?: number; dist?: number }>;
  beam?: Vec3 | null;
  bounds?: [number, number, number, number];
  /** Background color below horizon (for floating islands) */
  voidBelow?: boolean;
}

interface SkyPreset {
  top: string; horizon: string; bottom?: string; fog: string; ambient: [number, number, number]; shadow: number;
  near: number; far: number; hemiSky: string; hemiGround: string; hemi: number; sun: number; sunColor: string; stars: number; lamp: [number, number, number];
}

export const SKIES: Record<SkyName, SkyPreset> = {
  day: { top: '#4f93e6', horizon: '#c4e6ff', fog: '#c4e6ff', ambient: [1.05, 1.05, 1.05], shadow: 0.45, near: 45, far: 120, hemiSky: '#e6f3ff', hemiGround: '#6b5a3a', hemi: 1.6, sun: 1.6, sunColor: '#fff6e0', stars: 0, lamp: [1, 0.8, 0.5] },
  morning: { top: '#6aa6e8', horizon: '#ffdcb8', fog: '#f4dcc4', ambient: [1.05, 0.97, 0.9], shadow: 0.45, near: 40, far: 115, hemiSky: '#ffe8d0', hemiGround: '#6b5a3a', hemi: 1.5, sun: 1.5, sunColor: '#ffe2b8', stars: 0, lamp: [1, 0.8, 0.5] },
  dusk: { top: '#2e3470', horizon: '#f2946a', fog: '#c87a6a', ambient: [0.82, 0.66, 0.66], shadow: 0.4, near: 35, far: 105, hemiSky: '#ffb090', hemiGround: '#3a2a3a', hemi: 1.2, sun: 1.0, sunColor: '#ff9a6a', stars: 0.3, lamp: [1.1, 0.8, 0.45] },
  night: { top: '#050816', horizon: '#1a2246', fog: '#121a36', ambient: [0.3, 0.36, 0.58], shadow: 0.5, near: 25, far: 90, hemiSky: '#6a80c0', hemiGround: '#1a1a2a', hemi: 0.8, sun: 0.35, sunColor: '#a0b4ff', stars: 1, lamp: [1.25, 0.9, 0.5] },
  cave: { top: '#0b0a0f', horizon: '#18141e', fog: '#141018', ambient: [0.34, 0.31, 0.36], shadow: 0.85, near: 14, far: 60, hemiSky: '#8a7a9a', hemiGround: '#2a2020', hemi: 0.8, sun: 0.25, sunColor: '#ffb070', stars: 0, lamp: [1.3, 0.85, 0.5] },
  underwater: { top: '#06304c', horizon: '#13628a', fog: '#0f5478', ambient: [0.45, 0.68, 0.9], shadow: 0.6, near: 8, far: 42, hemiSky: '#7ac0f0', hemiGround: '#1a3a4a', hemi: 1.0, sun: 0.6, sunColor: '#9ad8ff', stars: 0, lamp: [0.9, 0.95, 0.9] },
  void: { top: '#07030f', horizon: '#3b1a5e', bottom: '#12061f', fog: '#2a1446', ambient: [0.62, 0.52, 0.78], shadow: 0.5, near: 40, far: 140, hemiSky: '#c0a0ff', hemiGround: '#2a1a3a', hemi: 1.1, sun: 0.7, sunColor: '#d7b4ff', stars: 1, lamp: [1.1, 0.8, 0.6] },
  storm: { top: '#26243a', horizon: '#5a4f6e', fog: '#4a4460', ambient: [0.62, 0.58, 0.7], shadow: 0.5, near: 30, far: 95, hemiSky: '#b0a8c8', hemiGround: '#2a2430', hemi: 1.1, sun: 0.6, sunColor: '#c0b0ff', stars: 0, lamp: [1.1, 0.8, 0.5] },
  dawn: { top: '#3d4f94', horizon: '#ffb49a', fog: '#e0a89a', ambient: [0.92, 0.84, 0.86], shadow: 0.45, near: 40, far: 115, hemiSky: '#ffd0c0', hemiGround: '#4a3a3a', hemi: 1.3, sun: 1.2, sunColor: '#ffc0a0', stars: 0.15, lamp: [1, 0.8, 0.5] },
};

interface Particle { i: number; life: number; max: number; v: THREE.Vector3; p: THREE.Vector3; g: number; s: number; color: THREE.Color; spin: number }

export class Stage {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera: THREE.PerspectiveCamera;
  world: VoxelWorld | null = null;
  set: SetDef | null = null;
  actors = new Map<string, Actor>();
  hemi = new THREE.HemisphereLight('#fff', '#444', 1.5);
  sun = new THREE.DirectionalLight('#fff', 1.5);
  skyMesh: THREE.Mesh;
  skyMat: THREE.ShaderMaterial;
  stars: THREE.Points;
  seams = new THREE.Group();
  clouds = new THREE.Group();
  pointLights: THREE.PointLight[] = [];
  beam: THREE.Group | null = null;
  // camera
  camPos = new THREE.Vector3(0, 10, 10);
  camLook = new THREE.Vector3();
  camFrom = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
  camTo = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
  camT = 1;
  camDur = 0;
  dynamicShot: ShotSpec | null = null;
  shakeAmt = 0;
  sway = 1;
  // particles
  pMesh: THREE.InstancedMesh;
  particles: Particle[] = [];
  freeIdx: number[] = [];
  frayJobs: Array<{ t: number; x: number; y: number; z: number; phase: number }> = [];
  time = 0;
  rainOn = false;
  flashEl: HTMLDivElement;
  onUpdate: ((dt: number) => void) | null = null;
  skyName: SkyName = 'day';

  constructor(public container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 400);
    this.scene.add(this.hemi, this.sun, this.sun.target);
    this.sun.position.set(30, 60, 20);

    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { top: { value: new THREE.Color() }, horizon: { value: new THREE.Color() }, bottom: { value: new THREE.Color() } },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 horizon; uniform vec3 bottom; varying vec3 vP; void main(){ float h = vP.y; vec3 c = h > 0.0 ? mix(horizon, top, pow(min(1.0,h*1.4), 0.7)) : mix(horizon, bottom, min(1.0,-h*3.0)); gl_FragColor = vec4(c,1.0); }',
      side: THREE.BackSide, depthWrite: false,
    });
    this.skyMesh = new THREE.Mesh(new THREE.SphereGeometry(300, 24, 16), this.skyMat);
    this.skyMesh.renderOrder = -10;
    this.scene.add(this.skyMesh);
    // stars
    const sp: number[] = [];
    for (let i = 0; i < 700; i++) {
      const v = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.9 + 0.05, Math.random() - 0.5).normalize().multiplyScalar(280);
      sp.push(v.x, v.y, v.z);
    }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: '#ffffff', size: 1.6, sizeAttenuation: false, transparent: true, opacity: 1, depthWrite: false }));
    this.scene.add(this.stars, this.seams, this.clouds);
    this.buildClouds();

    // particles: instanced little cubes
    const N = 900;
    this.pMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: '#fff', transparent: true, opacity: 0.95 }), N);
    this.pMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.pMesh.frustumCulled = false;
    const m = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < N; i++) { this.pMesh.setMatrixAt(i, m); this.pMesh.setColorAt(i, new THREE.Color('#fff')); this.freeIdx.push(i); }
    this.scene.add(this.pMesh);

    this.flashEl = document.createElement('div');
    this.flashEl.className = 'flash';
    container.appendChild(this.flashEl);

    window.addEventListener('resize', () => this.resize());
    this.resize();
    this.setSky('day');
  }

  resize() {
    const w = this.container.clientWidth || window.innerWidth, h = this.container.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.fov = w / h < 0.8 ? 68 : 50;
    this.camera.updateProjectionMatrix();
  }

  private buildClouds() {
    const mat = new THREE.MeshLambertMaterial({ color: '#ffffff', transparent: true, opacity: 0.85, emissive: '#555' });
    for (let i = 0; i < 26; i++) {
      const g = new THREE.Group();
      const n = 2 + Math.floor(Math.random() * 4);
      for (let k = 0; k < n; k++) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(6 + Math.random() * 10, 2, 5 + Math.random() * 8), mat);
        b.position.set(k * 5 - n * 2.5, 0, (Math.random() - 0.5) * 6);
        g.add(b);
      }
      const a = Math.random() * Math.PI * 2, r = 60 + Math.random() * 120;
      g.position.set(Math.cos(a) * r, 55 + Math.random() * 25, Math.sin(a) * r);
      g.userData.speed = 0.5 + Math.random();
      this.clouds.add(g);
    }
  }

  setSky(name: SkyName) {
    const s = SKIES[name] ?? SKIES.day;
    this.skyName = name;
    this.skyMat.uniforms.top.value.set(s.top);
    this.skyMat.uniforms.horizon.value.set(s.horizon);
    this.skyMat.uniforms.bottom.value.set(s.bottom ?? (this.set?.voidBelow ? '#0c0616' : s.fog));
    voxelUniforms.uAmbient.value.setRGB(...s.ambient);
    voxelUniforms.uShadow.value = s.shadow;
    voxelUniforms.uFogColor.value.set(s.fog);
    voxelUniforms.uFogNear.value = s.near;
    voxelUniforms.uFogFar.value = s.far;
    voxelUniforms.uLamp.value.setRGB(...s.lamp);
    this.hemi.color.set(s.hemiSky); this.hemi.groundColor.set(s.hemiGround); this.hemi.intensity = s.hemi;
    this.sun.color.set(s.sunColor); this.sun.intensity = s.sun;
    (this.stars.material as THREE.PointsMaterial).opacity = s.stars;
    this.stars.visible = s.stars > 0;
    this.clouds.visible = name === 'day' || name === 'morning' || name === 'dusk' || name === 'dawn' || name === 'storm';
    const cm = (this.clouds.children[0] as THREE.Group)?.children[0] as THREE.Mesh | undefined;
    if (cm) (cm.material as THREE.MeshLambertMaterial).color.set(name === 'storm' ? '#77708a' : name === 'dusk' ? '#ffc8b0' : '#ffffff');
    this.scene.background = new THREE.Color(s.fog);
  }

  loadSet(def: SetDef, flags: Record<string, unknown>) {
    this.clearSet();
    const w = new VoxelWorld(def.size[0], def.size[1], def.size[2]);
    def.build(w, flags);
    w.buildAll();
    this.world = w;
    this.set = def;
    this.scene.add(w.group);
    this.setSky(def.sky);
    for (const l of def.lights ?? []) {
      const p = new THREE.PointLight(l.color ?? '#ffb060', l.intensity ?? 6, l.dist ?? 9, 1.6);
      p.position.set(...l.at);
      this.scene.add(p);
      this.pointLights.push(p);
    }
    if (def.beam) this.setBeam(def.beam);
    const c = def.cams.wide;
    this.cut({ pos: c.pos, look: c.look });
  }

  clearSet() {
    if (this.world) { this.scene.remove(this.world.group); this.world.dispose(); this.world = null; }
    for (const p of this.pointLights) this.scene.remove(p);
    this.pointLights = [];
    for (const a of this.actors.values()) this.scene.remove(a.object);
    this.actors.clear();
    this.setBeam(null);
    this.clearSeams();
    this.frayJobs = [];
    this.rainOn = false;
    for (const p of this.particles) this.killParticle(p);
    this.particles = [];
  }

  addActor(id: string, def: CharDef): Actor {
    const existing = this.actors.get(id);
    if (existing) return existing;
    const a = new Actor(id, def, () => this.world);
    this.actors.set(id, a);
    this.scene.add(a.object);
    return a;
  }
  removeActor(id: string) {
    const a = this.actors.get(id);
    if (!a) return;
    this.scene.remove(a.object);
    this.actors.delete(id);
  }
  actor(id: string) { return this.actors.get(id); }

  // ---------- camera ----------

  cut(shot: { pos: Vec3 | THREE.Vector3; look: Vec3 | THREE.Vector3 }) {
    const p = Array.isArray(shot.pos) ? new THREE.Vector3(...shot.pos) : shot.pos.clone();
    const l = Array.isArray(shot.look) ? new THREE.Vector3(...shot.look) : shot.look.clone();
    this.camPos.copy(p); this.camLook.copy(l);
    this.camTo.pos.copy(p); this.camTo.look.copy(l);
    this.camT = 1;
    this.dynamicShot = null;
  }
  glide(shot: { pos: THREE.Vector3; look: THREE.Vector3 }, dur: number) {
    if (dur <= 0) { this.cut(shot); return; }
    this.camFrom.pos.copy(this.camPos); this.camFrom.look.copy(this.camLook);
    this.camTo.pos.copy(shot.pos); this.camTo.look.copy(shot.look);
    this.camT = 0; this.camDur = dur;
    this.dynamicShot = null;
  }

  /** Resolve a shot spec into a camera position/look. */
  resolveShot(spec: ShotSpec): { pos: THREE.Vector3; look: THREE.Vector3 } | null {
    if (typeof spec === 'string') {
      const c = this.set?.cams[spec];
      if (!c) { console.warn('unknown cam', spec); return null; }
      return { pos: new THREE.Vector3(...c.pos), look: new THREE.Vector3(...c.look) };
    }
    if ('pos' in spec) return { pos: new THREE.Vector3(...spec.pos), look: new THREE.Vector3(...spec.look) };
    if ('close' in spec) {
      const a = this.actors.get(spec.close);
      if (!a) return null;
      const head = a.headWorld();
      const dist = (spec.dist ?? 2.3) * (a.def.scale ?? 1) * (a.def.kind === 'dog' ? 0.8 : 1);
      const side = spec.side ?? 0.35;
      const f = a.forward();
      const right = new THREE.Vector3(f.z, 0, -f.x);
      const pos = head.clone().addScaledVector(f, dist).addScaledVector(right, side * dist).add(new THREE.Vector3(0, (spec.height ?? 0.1), 0));
      const look = head.clone().add(new THREE.Vector3(0, -0.12, 0));
      return this.avoidWalls(look, pos);
    }
    if ('two' in spec) {
      const a = this.actors.get(spec.two[0]), b = this.actors.get(spec.two[1]);
      if (!a || !b) return null;
      const ha = a.headWorld(), hb = b.headWorld();
      const mid = ha.clone().add(hb).multiplyScalar(0.5);
      const ab = hb.clone().sub(ha); ab.y = 0;
      const sep = Math.max(1.2, ab.length());
      ab.normalize();
      let perp = new THREE.Vector3(-ab.z, 0, ab.x);
      // choose the side that the two are (on average) facing
      const fa = a.forward().add(b.forward());
      if (perp.dot(fa) < 0) perp.negate();
      if (spec.side && spec.side < 0) perp.negate();
      const dist = (spec.dist ?? 1) * (sep * 1.05 + 1.6);
      const pos = mid.clone().addScaledVector(perp, dist).add(new THREE.Vector3(0, 0.35, 0));
      return this.avoidWalls(mid.clone().add(new THREE.Vector3(0, -0.2, 0)), pos);
    }
    if ('ots' in spec) {
      const a = this.actors.get(spec.ots[0]), b = this.actors.get(spec.ots[1]);
      if (!a || !b) return null;
      const ha = a.headWorld(), hb = b.headWorld();
      const dir = hb.clone().sub(ha); dir.y = 0; dir.normalize();
      const right = new THREE.Vector3(dir.z, 0, -dir.x);
      const side = spec.side ?? -1;
      const pos = ha.clone().addScaledVector(dir, -1.15).addScaledVector(right, 0.55 * side).add(new THREE.Vector3(0, 0.22, 0));
      const look = hb.clone().add(new THREE.Vector3(0, -0.15, 0)).addScaledVector(right, 0.15 * side);
      return this.avoidWalls(look, pos);
    }
    if ('orbit' in spec || 'follow' in spec) {
      this.dynamicShot = spec;
      return null;
    }
    return null;
  }

  /** Pull the camera in if a wall is between it and the subject. */
  avoidWalls(look: THREE.Vector3, pos: THREE.Vector3) {
    if (!this.world) return { pos, look };
    const dir = pos.clone().sub(look);
    const len = dir.length();
    dir.normalize();
    const hit = this.world.raycast(look.clone().addScaledVector(dir, 0.3), dir, len);
    if (hit) {
      const hp = new THREE.Vector3(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5);
      const d = Math.max(0.8, hp.distanceTo(look) - 0.9);
      return { pos: look.clone().addScaledVector(dir, Math.min(len, d)), look };
    }
    return { pos, look };
  }

  shot(spec: ShotSpec, dur = 0) {
    const r = this.resolveShot(spec);
    if (!r) return;
    if (dur > 0) this.glide(r, dur);
    else this.cut(r);
  }

  shake(amt = 0.4) { this.shakeAmt = Math.max(this.shakeAmt, amt); }

  flash(color = '#ffffff', dur = 0.4) {
    this.flashEl.style.transition = 'none';
    this.flashEl.style.background = color;
    this.flashEl.style.opacity = '0.9';
    requestAnimationFrame(() => {
      this.flashEl.style.transition = `opacity ${dur}s ease-out`;
      this.flashEl.style.opacity = '0';
    });
  }

  // ---------- fx ----------

  emit(pos: THREE.Vector3, opts: { n?: number; color?: string | string[]; speed?: number; up?: number; g?: number; life?: number; size?: number; spread?: number }) {
    const n = opts.n ?? 12;
    const cols = Array.isArray(opts.color) ? opts.color : [opts.color ?? '#ffffff'];
    for (let k = 0; k < n; k++) {
      const i = this.freeIdx.pop();
      if (i === undefined) return;
      const sp = opts.speed ?? 2;
      const spr = opts.spread ?? 0.3;
      const v = new THREE.Vector3((Math.random() - 0.5) * sp, (opts.up ?? 1) * (0.5 + Math.random()) * sp * 0.6, (Math.random() - 0.5) * sp);
      const p = pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * spr, (Math.random() - 0.5) * spr, (Math.random() - 0.5) * spr));
      const life = (opts.life ?? 1) * (0.6 + Math.random() * 0.6);
      this.particles.push({ i, life, max: life, v, p, g: opts.g ?? -6, s: (opts.size ?? 0.1) * (0.6 + Math.random() * 0.8), color: new THREE.Color(cols[Math.floor(Math.random() * cols.length)]), spin: Math.random() * 6 });
    }
  }
  private killParticle(p: Particle) {
    this.pMesh.setMatrixAt(p.i, new THREE.Matrix4().makeScale(0, 0, 0));
    this.freeIdx.push(p.i);
  }

  fx(name: string, at?: THREE.Vector3, radius = 2, dur = 1, color?: string) {
    const p = at ?? this.camLook.clone();
    switch (name) {
      case 'shake': this.shake(radius * 0.25); break;
      case 'flash': this.flash(color ?? '#ffffff', dur); break;
      case 'embers': this.emit(p, { n: 30, color: ['#ffb347', '#ff7a1a', '#ffe08a'], speed: 1.5, up: 2, g: 0.6, life: 2, size: 0.07, spread: radius }); break;
      case 'motes': this.emit(p, { n: 40, color: ['#c9a2ff', '#a26cff', '#e8d8ff'], speed: 1, up: 2, g: 1, life: 2.2, size: 0.09, spread: radius }); break;
      case 'splash': this.emit(p, { n: 40, color: ['#bfe3ff', '#5aa7e8', '#ffffff'], speed: 4, up: 2, g: -9, life: 1, size: 0.1, spread: radius * 0.5 }); break;
      case 'dust': this.emit(p, { n: 26, color: ['#b8a88a', '#9a8a6a', '#d0c4a8'], speed: 2.5, up: 0.6, g: -1, life: 1.2, size: 0.14, spread: radius }); break;
      case 'sparks': this.emit(p, { n: 26, color: ['#fff0b0', '#ffb347', '#ffffff'], speed: 5, up: 1.5, g: -12, life: 0.6, size: 0.06, spread: 0.2 }); break;
      case 'poof': this.emit(p, { n: 30, color: ['#3a2850', '#1c1428', '#a26cff'], speed: 3, up: 1, g: 0.5, life: 0.8, size: 0.16, spread: radius * 0.4 }); break;
      case 'glow': this.emit(p, { n: 34, color: [color ?? '#7ff2e4', '#ffffff'], speed: 1.2, up: 1.5, g: 0.3, life: 1.6, size: 0.08, spread: radius }); break;
      case 'bubbles': this.emit(p, { n: 26, color: ['#dff4ff', '#bfe3ff'], speed: 0.6, up: 3, g: 2, life: 2.5, size: 0.08, spread: radius }); break;
      case 'confetti': this.emit(p, { n: 70, color: ['#e8c23a', '#b8342f', '#2f5fb8', '#4c8a2e', '#e58fb4'], speed: 5, up: 2.4, g: -4, life: 2.6, size: 0.1, spread: radius }); break;
      case 'seams': this.addSeams(); break;
      case 'beam': this.setBeam(at ? [at.x, at.y, at.z] : this.set?.beam ?? null); break;
      case 'beamoff': this.setBeam(null); break;
      case 'rain': this.rainOn = true; break;
      case 'stoprain': this.rainOn = false; break;
    }
  }

  addSeams() {
    const mat = new THREE.MeshBasicMaterial({ color: '#c79bff', transparent: true, opacity: 0.95, fog: false });
    const glowMat = new THREE.MeshBasicMaterial({ color: '#7a3cff', transparent: true, opacity: 0.35, fog: false });
    for (let s = 0; s < 7; s++) {
      const g = new THREE.Group();
      let x = 0, y = 0;
      const ang = Math.random() * Math.PI * 2;
      for (let k = 0; k < 9; k++) {
        const nx = x + 3 + Math.random() * 5, ny = y + (Math.random() - 0.5) * 6;
        const len = Math.hypot(nx - x, ny - y);
        const seg = new THREE.Mesh(new THREE.BoxGeometry(len, 0.5, 0.5), mat);
        seg.position.set((x + nx) / 2, (y + ny) / 2, 0);
        seg.rotation.z = Math.atan2(ny - y, nx - x);
        const gl = new THREE.Mesh(new THREE.BoxGeometry(len, 2.2, 0.4), glowMat);
        gl.position.copy(seg.position); gl.rotation.copy(seg.rotation);
        g.add(seg, gl);
        x = nx; y = ny;
      }
      g.position.set(Math.cos(ang) * 150, 70 + Math.random() * 60, Math.sin(ang) * 150);
      g.lookAt(0, 60, 0);
      g.scale.setScalar(0.01);
      g.userData.grow = 0;
      this.seams.add(g);
    }
  }
  clearSeams() { while (this.seams.children.length) this.seams.remove(this.seams.children[0]); }

  setBeam(at: Vec3 | null) {
    if (this.beam) { this.scene.remove(this.beam); this.beam = null; }
    if (!at) return;
    const g = new THREE.Group();
    const inner = new THREE.Mesh(new THREE.BoxGeometry(0.8, 300, 0.8), new THREE.MeshBasicMaterial({ color: '#d8fffa', transparent: true, opacity: 0.85, fog: false, depthWrite: false }));
    const outer = new THREE.Mesh(new THREE.BoxGeometry(2.2, 300, 2.2), new THREE.MeshBasicMaterial({ color: '#4fe3d2', transparent: true, opacity: 0.25, fog: false, depthWrite: false }));
    inner.position.y = outer.position.y = 150;
    g.add(inner, outer);
    g.position.set(at[0], at[1], at[2]);
    this.beam = g;
    this.scene.add(g);
  }

  /** Dissolve a region of blocks into the Fray over time. */
  fray(from: Vec3, to: Vec3, dur = 3) {
    if (!this.world) return;
    const [x0, x1] = [Math.min(from[0], to[0]), Math.max(from[0], to[0])];
    const [y0, y1] = [Math.min(from[1], to[1]), Math.max(from[1], to[1])];
    const [z0, z1] = [Math.min(from[2], to[2]), Math.max(from[2], to[2])];
    const total = Math.hypot(to[0] - from[0], to[2] - from[2]) || 1;
    for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
      if (!this.world.get(x, y, z)) continue;
      const d = Math.hypot(x - from[0], z - from[2]) / total;
      const t = this.time + d * dur * 0.8 + Math.random() * dur * 0.25 + (y1 - y) * 0.01;
      this.frayJobs.push({ t, x, y, z, phase: 0 });
    }
    this.frayJobs.sort((a, b) => a.t - b.t);
  }

  worldToScreen(v: THREE.Vector3): { x: number; y: number; visible: boolean } {
    const p = v.clone().project(this.camera);
    const w = this.renderer.domElement.clientWidth, h = this.renderer.domElement.clientHeight;
    return { x: (p.x * 0.5 + 0.5) * w, y: (-p.y * 0.5 + 0.5) * h, visible: p.z < 1 && p.z > -1 };
  }

  /** Ground point under a screen coordinate. */
  pickGround(sx: number, sy: number): THREE.Vector3 | null {
    if (!this.world) return null;
    const w = this.renderer.domElement.clientWidth, h = this.renderer.domElement.clientHeight;
    const ndc = new THREE.Vector2((sx / w) * 2 - 1, -(sy / h) * 2 + 1);
    const rc = new THREE.Raycaster();
    rc.setFromCamera(ndc, this.camera);
    const hit = this.world.raycast(rc.ray.origin.clone(), rc.ray.direction.clone(), 120);
    if (!hit) return null;
    if (hit.n[1] === 1) return new THREE.Vector3(hit.x + 0.5, hit.y + 1, hit.z + 0.5);
    return new THREE.Vector3(hit.x + 0.5 + hit.n[0], hit.y + 1, hit.z + 0.5 + hit.n[2]);
  }

  update(dt: number) {
    this.time += dt;
    voxelUniforms.uTime.value = this.time;
    for (const a of this.actors.values()) a.update(dt);
    this.onUpdate?.(dt);
    // fray jobs
    if (this.world) {
      let n = 0;
      while (this.frayJobs.length && this.frayJobs[0].t <= this.time && n < 120) {
        const j = this.frayJobs.shift()!;
        n++;
        if (j.phase === 0) {
          if (this.world.get(j.x, j.y, j.z)) {
            const nm = BLOCKS[this.world.get(j.x, j.y, j.z)].name;
            if (nm !== 'water') this.world.set(j.x, j.y, j.z, 'frayed');
            const next = { ...j, phase: 1, t: this.time + 0.35 + Math.random() * 0.4 };
            let k = this.frayJobs.findIndex((q) => q.t > next.t);
            if (k < 0) k = this.frayJobs.length;
            this.frayJobs.splice(k, 0, next);
          }
        } else {
          this.world.set(j.x, j.y, j.z, 'air');
          if (Math.random() < 0.35) this.emit(new THREE.Vector3(j.x + 0.5, j.y + 0.5, j.z + 0.5), { n: 2, color: ['#c9a2ff', '#a26cff', '#e8d8ff'], speed: 0.6, up: 2.5, g: 1.5, life: 1.6, size: 0.12, spread: 0.6 });
        }
      }
      this.world.flush(5);
    }
    // particles
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3();
    const e = new THREE.Euler();
    for (let k = this.particles.length - 1; k >= 0; k--) {
      const p = this.particles[k];
      p.life -= dt;
      if (p.life <= 0) { this.killParticle(p); this.particles.splice(k, 1); continue; }
      p.v.y += p.g * dt;
      p.p.addScaledVector(p.v, dt);
      const sc = p.s * Math.min(1, (p.life / p.max) * 2);
      s.set(sc, sc, sc);
      e.set(p.spin * p.life, p.spin * p.life * 0.7, 0);
      q.setFromEuler(e);
      m.compose(p.p, q, s);
      this.pMesh.setMatrixAt(p.i, m);
      this.pMesh.setColorAt(p.i, p.color);
    }
    this.pMesh.instanceMatrix.needsUpdate = true;
    if (this.pMesh.instanceColor) this.pMesh.instanceColor.needsUpdate = true;
    // rain
    if (this.rainOn && this.particles.length < 600) {
      const c = this.camera.position;
      this.emit(new THREE.Vector3(c.x + (Math.random() - 0.5) * 30, c.y + 12, c.z + (Math.random() - 0.5) * 30), { n: 6, color: ['#9ab0d8', '#c0d0f0'], speed: 0.2, up: -6, g: -20, life: 1.2, size: 0.07, spread: 8 });
    }
    // seams grow + pulse
    for (const g of this.seams.children) {
      g.userData.grow = Math.min(1, g.userData.grow + dt * 0.5);
      g.scale.setScalar(Math.max(0.01, g.userData.grow * (1 + Math.sin(this.time * 3 + g.id) * 0.03)));
    }
    if (this.beam) this.beam.children[1].scale.set(1 + Math.sin(this.time * 4) * 0.1, 1, 1 + Math.sin(this.time * 4) * 0.1);
    // clouds drift
    if (this.clouds.visible) for (const c of this.clouds.children) { c.position.x += c.userData.speed * dt; if (c.position.x > 200) c.position.x = -200; }
    // camera
    this.updateCamera(dt);
    this.renderer.render(this.scene, this.camera);
  }

  private updateCamera(dt: number) {
    const ds = this.dynamicShot;
    if (ds && typeof ds === 'object' && 'orbit' in ds) {
      const a = this.actors.get(ds.orbit);
      if (a) {
        const ang = this.time * (ds.speed ?? 0.15);
        const d = ds.dist ?? 6;
        const target = new THREE.Vector3(a.pos.x + Math.sin(ang) * d, a.pos.y + (ds.height ?? 2.5), a.pos.z + Math.cos(ang) * d);
        this.camPos.lerp(target, Math.min(1, dt * 2));
        this.camLook.lerp(a.headWorld(), Math.min(1, dt * 3));
      }
    } else if (ds && typeof ds === 'object' && 'follow' in ds) {
      // handled by explore controller via setFollow
    } else if (this.camT < 1) {
      this.camT = Math.min(1, this.camT + dt / this.camDur);
      const t = this.camT * this.camT * (3 - 2 * this.camT);
      this.camPos.lerpVectors(this.camFrom.pos, this.camTo.pos, t);
      this.camLook.lerpVectors(this.camFrom.look, this.camTo.look, t);
    }
    // gentle handheld drift
    const sw = this.sway * 0.03;
    const off = new THREE.Vector3(Math.sin(this.time * 0.7) * sw, Math.sin(this.time * 0.9) * sw * 0.6, Math.cos(this.time * 0.6) * sw);
    if (this.shakeAmt > 0.001) {
      off.add(new THREE.Vector3((Math.random() - 0.5) * this.shakeAmt, (Math.random() - 0.5) * this.shakeAmt, (Math.random() - 0.5) * this.shakeAmt));
      this.shakeAmt *= Math.pow(0.02, dt);
    }
    this.camera.position.copy(this.camPos).add(off);
    this.camera.lookAt(this.camLook);
    this.skyMesh.position.copy(this.camera.position);
    this.stars.position.copy(this.camera.position);
    this.seams.position.set(this.camera.position.x, 0, this.camera.position.z);
    this.sun.target.position.copy(this.camLook);
    this.sun.position.copy(this.camLook).add(new THREE.Vector3(30, 60, 20));
  }

  /** Follow camera used during exploration. Tries closer/lower framings when walls are in the way. */
  followCam(target: THREE.Vector3, yaw: number, dist: number, height: number, dt: number, snap = false) {
    const look = target.clone().add(new THREE.Vector3(0, 1.1, 0));
    const tries: Array<[number, number]> = [[dist, height], [dist * 0.75, height * 0.85], [dist * 0.55, height * 0.6], [dist * 0.42, height * 0.45]];
    let best: { pos: THREE.Vector3; look: THREE.Vector3 } | null = null;
    let bestLen = -1;
    for (const [d, h] of tries) {
      const pos = new THREE.Vector3(target.x - Math.sin(yaw) * d, target.y + h, target.z - Math.cos(yaw) * d);
      const r = this.avoidWalls(look, pos);
      const len = r.pos.distanceTo(look);
      const full = pos.distanceTo(look);
      if (len >= full - 0.05) { best = r; break; }
      if (len > bestLen) { bestLen = len; best = r; }
    }
    const k = snap ? 1 : Math.min(1, dt * 5);
    this.camPos.lerp(best!.pos, k);
    this.camLook.lerp(look, k);
    this.camT = 1;
    this.dynamicShot = { follow: 'player' };
  }
}
