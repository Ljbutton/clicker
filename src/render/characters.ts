// Blocky character models with procedurally drawn pixel faces and clothes.
import * as THREE from 'three';
import type { AnimName, CharDef, Look, Mood } from '../core/types';
import type { VoxelWorld } from './voxels';

const PX = 16;

function canvas(w = PX, h = PX) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;
  return { c, ctx };
}
function tex(c: HTMLCanvasElement) {
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function shadeHex(hex: string, k: number) {
  const c = new THREE.Color(hex);
  c.multiplyScalar(k);
  return '#' + c.getHexString();
}
function mat(c: HTMLCanvasElement | string, emissive?: string) {
  if (typeof c === 'string') return new THREE.MeshLambertMaterial({ color: c, emissive: emissive ?? '#000000' });
  return new THREE.MeshLambertMaterial({ map: tex(c), emissive: emissive ?? '#000000', transparent: false });
}
function solidCanvas(color: string, noise = 0.06, seed = 1) {
  const { c, ctx } = canvas();
  let s = seed;
  for (let y = 0; y < PX; y++) for (let x = 0; x < PX; x++) {
    s = (s * 9301 + 49297) % 233280;
    const k = 1 - noise + (s / 233280) * noise * 2;
    ctx.fillStyle = shadeHex(color, k);
    ctx.fillRect(x, y, 1, 1);
  }
  return c;
}

// ---------- faces ----------

export interface FaceState { mood: Mood; mouth: number; blink: boolean; look: number }

function drawFace(ctx: CanvasRenderingContext2D, look: Look, f: FaceState, kind: CharDef['kind']) {
  const skin = look.skin;
  ctx.fillStyle = skin; ctx.fillRect(0, 0, PX, PX);
  // subtle skin noise
  for (let i = 0; i < 18; i++) { ctx.fillStyle = shadeHex(skin, 0.95); ctx.fillRect((i * 7) % 16, (i * 5) % 16, 1, 1); }
  const ex = look.extras ?? [];
  const hairStyle = look.hairStyle;
  const hair = look.hair;
  // fringe
  if (!['bald', 'none', 'hood', 'tophat', 'cap'].includes(hairStyle)) {
    ctx.fillStyle = hair;
    ctx.fillRect(0, 0, 16, 3);
    ctx.fillRect(0, 3, 2, 3); ctx.fillRect(14, 3, 2, 3);
    if (hairStyle === 'spiky') { ctx.fillRect(4, 3, 2, 1); ctx.fillRect(9, 3, 3, 1); }
    else if (hairStyle === 'long' || hairStyle === 'braid') { ctx.fillRect(2, 3, 4, 1); ctx.fillRect(0, 6, 2, 6); ctx.fillRect(14, 6, 2, 6); }
    else if (hairStyle === 'curly') { ctx.fillRect(2, 3, 3, 1); ctx.fillRect(11, 3, 3, 1); ctx.fillRect(7, 3, 2, 1); }
    else ctx.fillRect(10, 3, 4, 1);
  } else if (hairStyle === 'hood') {
    ctx.fillStyle = hair; ctx.fillRect(0, 0, 16, 2); ctx.fillRect(0, 0, 2, 16); ctx.fillRect(14, 0, 2, 16);
  } else if (hairStyle === 'cap' || hairStyle === 'tophat') {
    ctx.fillStyle = shadeHex(hair, 1); ctx.fillRect(0, 0, 16, 2);
  }
  if (ex.includes('mask')) {
    ctx.fillStyle = '#d9d6cf'; ctx.fillRect(2, 3, 12, 12);
    ctx.fillStyle = '#b8b4ab'; ctx.fillRect(2, 14, 12, 1); ctx.fillRect(7, 3, 2, 12);
    ctx.fillStyle = '#1a1424'; ctx.fillRect(4, 7, 3, 2); ctx.fillRect(9, 7, 3, 2);
    ctx.fillStyle = '#a26cff'; ctx.fillRect(5, 7, 1, 1); ctx.fillRect(10, 7, 1, 1);
    ctx.fillStyle = '#7a756c'; ctx.fillRect(5, 11, 6, 1);
    return;
  }
  const eye = look.eyes ?? '#2b2a33';
  const ey = 7;
  // brows by mood
  ctx.fillStyle = shadeHex(hair === '#000000' ? '#333' : hair, 0.75);
  const brow = (x: number, tilt: number) => {
    ctx.fillRect(x, ey - 2 + (tilt > 0 ? 1 : 0), 1, 1);
    ctx.fillRect(x + 1, ey - 2, 1, 1);
    ctx.fillRect(x + 2, ey - 2 + (tilt < 0 ? 1 : 0), 1, 1);
  };
  const m = f.mood;
  if (m === 'angry' || m === 'determined') { brow(3, -1); brow(10, 1); }
  else if (m === 'worried' || m === 'sad' || m === 'hurt') { brow(3, 1); brow(10, -1); }
  else if (m === 'surprised') { ctx.fillRect(3, ey - 3, 3, 1); ctx.fillRect(10, ey - 3, 3, 1); }
  else if (m === 'smug') { brow(3, 0); ctx.fillRect(10, ey - 3, 3, 1); }
  else { ctx.fillRect(3, ey - 2, 3, 1); ctx.fillRect(10, ey - 2, 3, 1); }
  // eyes
  if (f.blink || (m === 'happy' && f.mouth === 0 && false)) {
    ctx.fillStyle = shadeHex(skin, 0.7); ctx.fillRect(3, ey + 1, 3, 1); ctx.fillRect(10, ey + 1, 3, 1);
  } else if (m === 'happy') {
    ctx.fillStyle = eye;
    ctx.fillRect(3, ey + 1, 1, 1); ctx.fillRect(4, ey, 1, 1); ctx.fillRect(5, ey + 1, 1, 1);
    ctx.fillRect(10, ey + 1, 1, 1); ctx.fillRect(11, ey, 1, 1); ctx.fillRect(12, ey + 1, 1, 1);
  } else {
    const h = m === 'surprised' ? 3 : 2;
    ctx.fillStyle = '#f4f4f4';
    ctx.fillRect(3, ey, 3, h); ctx.fillRect(10, ey, 3, h);
    ctx.fillStyle = eye;
    const lk = f.look; // -1 left, 0 center, 1 right
    ctx.fillRect(4 + lk, ey, 1, h); ctx.fillRect(11 + lk, ey, 1, h);
    if (m === 'sad' || m === 'hurt') { ctx.fillStyle = shadeHex(skin, 0.8); ctx.fillRect(3, ey, 3, 1); ctx.fillRect(10, ey, 3, 1); }
    if (m === 'smug') { ctx.fillStyle = shadeHex(skin, 0.8); ctx.fillRect(3, ey, 3, 1); }
  }
  if (ex.includes('glasses')) {
    ctx.fillStyle = '#3a3a44';
    ctx.strokeStyle = '#3a3a44';
    ctx.fillRect(2, ey - 1, 5, 1); ctx.fillRect(2, ey + 2, 5, 1); ctx.fillRect(2, ey - 1, 1, 4); ctx.fillRect(6, ey - 1, 1, 4);
    ctx.fillRect(9, ey - 1, 5, 1); ctx.fillRect(9, ey + 2, 5, 1); ctx.fillRect(9, ey - 1, 1, 4); ctx.fillRect(13, ey - 1, 1, 4);
    ctx.fillRect(7, ey, 2, 1);
  }
  if (ex.includes('eyepatch')) { ctx.fillStyle = '#1e1b21'; ctx.fillRect(9, ey - 1, 5, 4); ctx.fillRect(0, ey - 2, 16, 1); }
  if (ex.includes('freckles')) { ctx.fillStyle = shadeHex(skin, 0.78); for (const [x, y] of [[3, 10], [5, 11], [11, 10], [12, 11], [4, 11]]) ctx.fillRect(x, y, 1, 1); }
  if (ex.includes('blush') || m === 'happy') { ctx.fillStyle = 'rgba(230,110,110,0.45)'; ctx.fillRect(2, 10, 2, 1); ctx.fillRect(12, 10, 2, 1); }
  // nose
  ctx.fillStyle = shadeHex(skin, 0.85); ctx.fillRect(7, ey + 2, 2, 1);
  // mouth
  const my = 12;
  ctx.fillStyle = '#5a2a2a';
  if (f.mouth > 0) {
    const h = f.mouth > 1 ? 2 : 1;
    ctx.fillRect(6, my, 4, h);
    ctx.fillStyle = '#c44'; ctx.fillRect(7, my + h - 1, 2, 1);
  } else if (m === 'happy') { ctx.fillRect(5, my, 1, 1); ctx.fillRect(6, my + 1, 4, 1); ctx.fillRect(10, my, 1, 1); }
  else if (m === 'sad' || m === 'hurt') { ctx.fillRect(5, my + 1, 1, 1); ctx.fillRect(6, my, 4, 1); ctx.fillRect(10, my + 1, 1, 1); }
  else if (m === 'angry') ctx.fillRect(5, my, 6, 1);
  else if (m === 'surprised') ctx.fillRect(7, my, 2, 2);
  else if (m === 'smug') { ctx.fillRect(6, my, 4, 1); ctx.fillRect(10, my - 1, 1, 1); }
  else if (m === 'worried') { ctx.fillRect(6, my, 1, 1); ctx.fillRect(7, my + 1, 2, 1); ctx.fillRect(9, my, 1, 1); }
  else ctx.fillRect(6, my, 4, 1);
  if (ex.includes('beard')) {
    ctx.fillStyle = hair; ctx.fillRect(2, 11, 12, 5); ctx.fillRect(1, 9, 2, 4); ctx.fillRect(13, 9, 2, 4);
    ctx.fillStyle = '#5a2a2a'; ctx.fillRect(6, my, 4, f.mouth > 0 ? 2 : 1);
  }
  if (ex.includes('goggles')) {
    ctx.fillStyle = '#5a3a1e'; ctx.fillRect(0, 2, 16, 2);
    ctx.fillStyle = '#c9a03a'; ctx.fillRect(3, 1, 4, 4); ctx.fillRect(9, 1, 4, 4);
    ctx.fillStyle = '#8fd8ff'; ctx.fillRect(4, 2, 2, 2); ctx.fillRect(10, 2, 2, 2);
  }
  void kind;
}

function hairSide(look: Look, side: 'side' | 'back' | 'top') {
  const { c, ctx } = canvas();
  const s = look.hairStyle;
  ctx.fillStyle = look.skin; ctx.fillRect(0, 0, 16, 16);
  const hair = look.hair;
  ctx.fillStyle = hair;
  if (side === 'top') { if (s !== 'bald') ctx.fillRect(0, 0, 16, 16); else { ctx.fillStyle = shadeHex(look.skin, 0.95); ctx.fillRect(0, 0, 16, 16); } }
  else if (s === 'bald') { ctx.fillStyle = hair; if (side === 'back') ctx.fillRect(0, 9, 16, 3); }
  else if (s === 'none') { /* skin */ }
  else if (side === 'back') {
    const h = s === 'long' || s === 'braid' || s === 'hood' ? 16 : s === 'curly' ? 13 : 10;
    ctx.fillRect(0, 0, 16, h);
  } else {
    const h = s === 'long' || s === 'hood' ? 16 : s === 'curly' ? 12 : 6;
    ctx.fillRect(0, 0, 16, h);
    if (s !== 'hood' && s !== 'long') { ctx.fillRect(10, 0, 6, h + 3); ctx.fillStyle = shadeHex(look.skin, 0.85); ctx.fillRect(5, 8, 2, 3); }
  }
  if ((look.extras ?? []).includes('goggles') && side !== 'top') { ctx.fillStyle = '#5a3a1e'; ctx.fillRect(0, 2, 16, 2); }
  return c;
}

function torsoCanvas(look: Look, side: 'front' | 'back' | 'side' | 'top') {
  const { c, ctx } = canvas();
  ctx.drawImage(solidCanvas(look.shirt, 0.07, side.length), 0, 0);
  const ex = look.extras ?? [];
  const s2 = look.shirt2 ?? shadeHex(look.shirt, 0.75);
  if (side === 'front') {
    // collar + seam
    ctx.fillStyle = look.skin; ctx.fillRect(6, 0, 4, 2);
    ctx.fillStyle = s2; ctx.fillRect(7, 2, 2, 14);
    if (look.shirt2) { ctx.fillRect(0, 0, 3, 16); ctx.fillRect(13, 0, 3, 16); }
    if (ex.includes('apron')) { ctx.fillStyle = look.accent ?? '#8a6a44'; ctx.fillRect(3, 5, 10, 11); ctx.fillStyle = shadeHex(look.accent ?? '#8a6a44', 0.8); ctx.fillRect(5, 9, 6, 3); }
    if (ex.includes('scarf')) { ctx.fillStyle = look.accent ?? '#c0392b'; ctx.fillRect(2, 0, 12, 3); ctx.fillRect(9, 3, 3, 6); ctx.fillStyle = shadeHex(look.accent ?? '#c0392b', 0.8); ctx.fillRect(9, 8, 3, 1); }
    if (ex.includes('robe')) { ctx.fillStyle = look.accent ?? '#b8a36a'; ctx.fillRect(7, 0, 2, 16); }
  }
  if (side === 'back' && ex.includes('scarf')) { ctx.fillStyle = look.accent ?? '#c0392b'; ctx.fillRect(2, 0, 12, 3); }
  if (ex.includes('belt') && side !== 'top') { ctx.fillStyle = '#4a2f18'; ctx.fillRect(0, 13, 16, 2); if (side === 'front') { ctx.fillStyle = '#c9a03a'; ctx.fillRect(7, 13, 2, 2); } }
  return c;
}

function limbCanvas(top: string, bottom: string, split: number, skinEnd = false) {
  const { c, ctx } = canvas();
  ctx.drawImage(solidCanvas(top, 0.07, 3), 0, 0);
  ctx.fillStyle = bottom;
  ctx.fillRect(0, split, 16, 16 - split);
  if (skinEnd) { ctx.fillStyle = shadeHex(bottom, 0.9); ctx.fillRect(0, 15, 16, 1); }
  return c;
}

function boxMats(front: HTMLCanvasElement | string, side: HTMLCanvasElement | string, back: HTMLCanvasElement | string, top: HTMLCanvasElement | string, bottom: HTMLCanvasElement | string) {
  // order: +x, -x, +y, -y, +z(front), -z(back)
  const s = mat(side);
  return [s, s, mat(top), mat(bottom), mat(front), mat(back)];
}

// ---------- held props ----------

export function makeProp(name: string): THREE.Object3D {
  const g = new THREE.Group();
  const box = (w: number, h: number, d: number, color: string, x = 0, y = 0, z = 0, emissive?: string) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color, emissive: emissive ?? '#000' }));
    m.position.set(x, y, z);
    g.add(m);
    return m;
  };
  switch (name) {
    case 'pickaxe':
      box(0.06, 0.7, 0.06, '#6b4a2b', 0, 0.2, 0);
      box(0.5, 0.08, 0.08, '#9aa0a6', 0, 0.55, 0);
      box(0.08, 0.08, 0.08, '#9aa0a6', 0.25, 0.5, 0);
      box(0.08, 0.08, 0.08, '#9aa0a6', -0.25, 0.5, 0);
      break;
    case 'hammer':
      box(0.07, 0.65, 0.07, '#6b4a2b', 0, 0.2, 0);
      box(0.28, 0.18, 0.18, '#7c7f83', 0, 0.55, 0);
      break;
    case 'sword':
      box(0.06, 0.18, 0.06, '#6b4a2b', 0, 0.05, 0);
      box(0.22, 0.05, 0.08, '#c9a03a', 0, 0.16, 0);
      box(0.08, 0.6, 0.03, '#d6d8db', 0, 0.48, 0);
      break;
    case 'staff':
      box(0.07, 1.5, 0.07, '#3a2a4a', 0, 0.45, 0);
      box(0.18, 0.18, 0.18, '#a26cff', 0, 1.25, 0, '#6a2cc0');
      break;
    case 'lantern':
      box(0.25, 0.3, 0.25, '#4a2f18', 0, -0.1, 0);
      box(0.18, 0.22, 0.18, '#ffd56a', 0, -0.1, 0.04, '#ffb040');
      box(0.04, 0.12, 0.04, '#4a2f18', 0, 0.1, 0);
      break;
    case 'keystone':
      box(0.16, 0.24, 0.16, '#4fe3d2', 0, 0.05, 0, '#1fa898');
      break;
    case 'ember':
      box(0.22, 0.32, 0.22, '#ff8a3a', 0, 0.08, 0, '#c84a10');
      break;
    case 'map':
    case 'atlas':
      box(0.32, 0.4, 0.06, name === 'atlas' ? '#5a2a6a' : '#e8d9b0', 0, 0.05, 0.05);
      break;
    case 'book':
      box(0.28, 0.36, 0.08, '#9b2f2f', 0, 0.05, 0.05);
      break;
    case 'torch':
      box(0.06, 0.45, 0.06, '#6b4a2b', 0, 0.12, 0);
      box(0.1, 0.1, 0.1, '#ffb347', 0, 0.38, 0, '#ff8a1a');
      break;
    case 'wrench':
      box(0.06, 0.5, 0.06, '#9aa0a6', 0, 0.15, 0);
      box(0.18, 0.08, 0.06, '#9aa0a6', 0, 0.42, 0);
      break;
    case 'core':
      box(0.3, 0.3, 0.3, '#c9a03a', 0, 0.05, 0);
      box(0.2, 0.2, 0.32, '#4fe3d2', 0, 0.05, 0, '#1fa898');
      break;
    case 'helm':
      box(0.36, 0.36, 0.36, '#cfefff', 0, 0.05, 0);
      break;
    case 'bone':
      box(0.08, 0.3, 0.08, '#efe6cf', 0, 0.05, 0);
      break;
    case 'flower':
      box(0.04, 0.3, 0.04, '#3e7d28', 0, 0.05, 0);
      box(0.12, 0.1, 0.12, '#d63a3a', 0, 0.22, 0);
      break;
    case 'letter':
      box(0.3, 0.22, 0.03, '#efe6cf', 0, 0.05, 0.05);
      break;
    default:
      box(0.2, 0.2, 0.2, '#ff00ff', 0, 0, 0);
  }
  g.name = name;
  return g;
}

// ---------- animation ----------

export interface Pose {
  bodyY: number; bodyRX: number; bodyRZ: number; bodyRY: number;
  headRX: number; headRY: number; headRZ: number;
  armLX: number; armLZ: number; armRX: number; armRZ: number;
  legLX: number; legRX: number;
  rootY: number; rootRX: number; rootRZ: number;
}
const zeroPose = (): Pose => ({ bodyY: 0, bodyRX: 0, bodyRZ: 0, bodyRY: 0, headRX: 0, headRY: 0, headRZ: 0, armLX: 0, armLZ: 0, armRX: 0, armRZ: 0, legLX: 0, legRX: 0, rootY: 0, rootRX: 0, rootRZ: 0 });

const ease = (t: number) => t * t * (3 - 2 * t);
const bump = (t: number) => Math.sin(Math.PI * Math.min(1, Math.max(0, t)));

interface AnimDef { dur: number; hold?: boolean; f: (t: number, p: Pose) => void }
const ANIMS: Record<AnimName, AnimDef> = {
  idle: { dur: 0.01, f: () => {} },
  wave: { dur: 1.4, f: (t, p) => { const b = bump(t); p.armRZ = 2.6 * Math.min(1, b * 2); p.armRX = 0; p.armRZ += Math.sin(t * 22) * 0.25 * b; } },
  nod: { dur: 0.7, f: (t, p) => { p.headRX = Math.sin(t * Math.PI * 2) * 0.35; } },
  shake: { dur: 0.8, f: (t, p) => { p.headRY = Math.sin(t * Math.PI * 4) * 0.4 * bump(t); } },
  shrug: { dur: 0.9, f: (t, p) => { const b = bump(t); p.armLZ = -0.5 * b; p.armRZ = 0.5 * b; p.armLX = -0.6 * b; p.armRX = -0.6 * b; p.headRZ = 0.15 * b; } },
  point: { dur: 1.2, f: (t, p) => { const b = Math.min(1, bump(t) * 2); p.armRX = -1.5 * b; } },
  cheer: { dur: 1.2, f: (t, p) => { const b = Math.min(1, bump(t) * 2); p.armLZ = -2.7 * b; p.armRZ = 2.7 * b; p.rootY = Math.abs(Math.sin(t * Math.PI * 3)) * 0.3; } },
  swing: { dur: 0.55, f: (t, p) => { p.armRX = t < 0.35 ? -2.8 * ease(t / 0.35) : -2.8 + 3.4 * ease((t - 0.35) / 0.65); p.bodyRY = Math.sin(t * Math.PI) * -0.4; } },
  dodge: { dur: 0.6, f: (t, p) => { const b = bump(t); p.rootRZ = 0.5 * b; p.bodyY = -0.25 * b; } },
  hit: { dur: 0.5, f: (t, p) => { const b = bump(t); p.bodyRX = -0.4 * b; p.headRX = -0.4 * b; p.armLX = -0.8 * b; p.armRX = -0.8 * b; } },
  fall: { dur: 0.8, hold: true, f: (t, p) => { const e = ease(Math.min(1, t * 1.3)); p.rootRX = -1.45 * e; p.rootY = 0.15 * e; } },
  crouch: { dur: 0.4, hold: true, f: (t, p) => { const e = ease(t); p.bodyY = -0.3 * e; p.legLX = -0.9 * e; p.legRX = -0.9 * e; p.bodyRX = 0.3 * e; } },
  stand: { dur: 0.4, f: (t, p) => { const e = 1 - ease(t); p.rootRX = -1.45 * e; p.bodyY = -0.3 * e; } },
  jump: { dur: 0.7, f: (t, p) => { p.rootY = bump(t) * 0.8; p.armLZ = -1.2 * bump(t); p.armRZ = 1.2 * bump(t); } },
  think: { dur: 1.6, f: (t, p) => { const b = Math.min(1, bump(t) * 3); p.armRX = -2.2 * b; p.armRZ = -0.5 * b; p.headRX = 0.15 * b; p.headRZ = 0.12 * b; } },
  facepalm: { dur: 1.4, f: (t, p) => { const b = Math.min(1, bump(t) * 3); p.armRX = -2.5 * b; p.armRZ = -0.3 * b; p.headRX = 0.35 * b; } },
  bark: { dur: 0.5, f: (t, p) => { p.headRX = -Math.sin(t * Math.PI * 4) * 0.3; p.rootY = bump(t) * 0.1; } },
  cast: { dur: 1.0, f: (t, p) => { const b = Math.min(1, bump(t) * 2); p.armRX = -2.6 * b; p.armLX = -1.2 * b; p.headRX = -0.2 * b; } },
  hug: { dur: 1.8, f: (t, p) => { const b = Math.min(1, bump(t) * 2.5); p.armLX = -1.4 * b; p.armRX = -1.4 * b; p.armLZ = 0.4 * b; p.armRZ = -0.4 * b; } },
  reach: { dur: 1.2, hold: true, f: (t, p) => { const e = ease(Math.min(1, t * 2)); p.armRX = -1.8 * e; p.armLX = -1.6 * e; p.bodyRX = 0.35 * e; } },
  dig: { dur: 1.2, f: (t, p) => { p.bodyRX = 0.5 * bump(t); p.headRX = 0.4 * bump(t); p.armLX = -0.8 + Math.sin(t * 25) * 0.6; p.armRX = -0.8 - Math.sin(t * 25) * 0.6; } },
  build: { dur: 1.2, f: (t, p) => { p.armRX = -1.4 + Math.sin(t * 18) * 0.7; p.bodyRX = 0.1; } },
  scared: { dur: 1.0, f: (t, p) => { const b = Math.min(1, bump(t) * 2); p.armLX = -1.8 * b; p.armRX = -1.8 * b; p.armLZ = 0.3 * b; p.armRZ = -0.3 * b; p.bodyRX = -0.15 * b; p.bodyY = -0.1 * b; } },
  sit: { dur: 0.5, hold: true, f: (t, p) => { const e = ease(t); p.legLX = -1.5 * e; p.legRX = -1.5 * e; p.rootY = -0.42 * e; } },
  roar: { dur: 1.4, f: (t, p) => { const b = bump(t); p.headRX = -0.5 * b; p.armLZ = -1.5 * b; p.armRZ = 1.5 * b; p.bodyRX = -0.2 * b; } },
  spin: { dur: 0.8, f: (t, p) => { p.bodyRY = ease(t) * Math.PI * 2; } },
};

// ---------- the model ----------

export class CharModel {
  root = new THREE.Group();
  body = new THREE.Group();
  head = new THREE.Group();
  armL = new THREE.Group();
  armR = new THREE.Group();
  legL = new THREE.Group();
  legR = new THREE.Group();
  extra: THREE.Object3D[] = [];
  hand = new THREE.Group();
  handL = new THREE.Group();
  carryPoint = new THREE.Group();
  cape?: THREE.Object3D;
  tail?: THREE.Object3D;
  faceCanvas?: HTMLCanvasElement;
  faceTex?: THREE.CanvasTexture;
  face: FaceState = { mood: 'neutral', mouth: 0, blink: false, look: 0 };
  faceKey = '';
  headHeight = 1.6;
  eyeHeight = 1.5;
  height = 1.8;
  anim: { name: AnimName; t: number; def: AnimDef } | null = null;
  held: AnimName | null = null;
  heldPose = 1;
  walkPhase = 0;
  speed = 0;
  time = Math.random() * 10;
  talking = false;
  blinkTimer = 2 + Math.random() * 3;
  glowMats: THREE.Material[] = [];

  constructor(public def: CharDef) {
    this.root.add(this.body);
    const k = def.kind;
    if (k === 'dog') this.buildDog();
    else if (k === 'gloam') this.buildGloam();
    else if (k === 'giant') this.buildGiant();
    else this.buildHuman();
    const s = def.scale ?? 1;
    this.root.scale.setScalar(s);
    this.headHeight *= s; this.eyeHeight *= s; this.height *= s;
    this.root.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; } });
  }

  private buildHuman() {
    const L = this.def.look;
    const ex = L.extras ?? [];
    const legH = 0.66, torsoH = 0.62, headS = 0.54;
    const torsoW = 0.5, torsoD = 0.28, limbW = 0.2;
    // legs
    const legMat = boxMats(limbCanvas(L.pants, L.shoes, 12), limbCanvas(L.pants, L.shoes, 12), limbCanvas(L.pants, L.shoes, 12), L.pants, L.shoes);
    for (const [g, x] of [[this.legL, -0.12], [this.legR, 0.12]] as const) {
      g.position.set(x, legH, 0);
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.22, legH, 0.24), legMat);
      m.position.y = -legH / 2;
      g.add(m);
      this.body.add(g);
    }
    // torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(torsoW, torsoH, torsoD), boxMats(torsoCanvas(L, 'front'), torsoCanvas(L, 'side'), torsoCanvas(L, 'back'), torsoCanvas(L, 'top'), L.shirt));
    torso.position.y = legH + torsoH / 2;
    this.body.add(torso);
    if (ex.includes('robe')) {
      const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.5, 0.34), mat(L.shirt));
      skirt.position.y = legH - 0.18;
      this.body.add(skirt);
    }
    // arms
    const sleeveTop = L.shirt;
    const armMat = boxMats(limbCanvas(sleeveTop, L.skin, 9), limbCanvas(sleeveTop, L.skin, 9), limbCanvas(sleeveTop, L.skin, 9), sleeveTop, L.skin);
    for (const [g, x] of [[this.armL, -(torsoW / 2 + limbW / 2)], [this.armR, torsoW / 2 + limbW / 2]] as const) {
      g.position.set(x, legH + torsoH - 0.08, 0);
      const m = new THREE.Mesh(new THREE.BoxGeometry(limbW, 0.6, 0.22), armMat);
      m.position.y = -0.26;
      g.add(m);
      this.body.add(g);
    }
    this.hand.position.set(0, -0.56, 0.02);
    this.hand.rotation.x = Math.PI / 2;
    this.armR.add(this.hand);
    this.handL.position.set(0, -0.56, 0.02);
    this.handL.rotation.x = Math.PI / 2;
    this.armL.add(this.handL);
    // head
    this.head.position.set(0, legH + torsoH, 0);
    this.body.add(this.head);
    const fc = canvas();
    this.faceCanvas = fc.c;
    this.faceTex = tex(fc.c);
    drawFace(fc.ctx, L, this.face, 'human');
    this.faceTex.needsUpdate = true;
    const headMats = [
      mat(hairSide(L, 'side')), mat(hairSide(L, 'side')), mat(hairSide(L, 'top')), mat(L.skin),
      new THREE.MeshLambertMaterial({ map: this.faceTex }), mat(hairSide(L, 'back')),
    ];
    // flip one side texture horizontally for symmetry
    const hm = new THREE.Mesh(new THREE.BoxGeometry(headS, headS, headS), headMats);
    hm.position.y = headS / 2;
    this.head.add(hm);
    this.headHeight = legH + torsoH + headS;
    this.eyeHeight = legH + torsoH + headS * 0.55;
    this.height = this.headHeight;
    const hb = (w: number, h: number, d: number, x: number, y: number, z: number, color: string) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
      m.position.set(x, y, z);
      this.head.add(m);
      return m;
    };
    const hs = L.hairStyle, hair = L.hair;
    if (hs === 'bun') hb(0.22, 0.2, 0.2, 0, headS + 0.02, -0.18, hair);
    if (hs === 'spiky') { for (const [x, z] of [[-0.15, 0.05], [0.05, 0.12], [0.18, -0.08], [-0.05, -0.15], [0.12, 0.2]]) hb(0.14, 0.16, 0.14, x, headS + 0.06, z, hair); }
    if (hs === 'curly') { hb(headS + 0.08, 0.16, headS + 0.08, 0, headS - 0.02, -0.02, hair); hb(headS + 0.08, 0.3, 0.1, 0, headS - 0.2, -headS / 2 - 0.03, hair); }
    if (hs === 'long') hb(headS + 0.02, 0.42, 0.08, 0, 0.0, -headS / 2 - 0.03, hair);
    if (hs === 'braid') { hb(0.12, 0.5, 0.12, 0, -0.08, -headS / 2 - 0.05, hair); hb(0.08, 0.06, 0.08, 0, -0.35, -headS / 2 - 0.05, L.accent ?? '#c0392b'); }
    if (hs === 'hood') { hb(headS + 0.08, headS + 0.08, 0.06, 0, headS / 2, -headS / 2 - 0.03, hair); hb(headS + 0.08, 0.06, headS + 0.06, 0, headS + 0.03, 0, hair); hb(0.06, headS + 0.08, headS + 0.06, -headS / 2 - 0.03, headS / 2, 0, hair); hb(0.06, headS + 0.08, headS + 0.06, headS / 2 + 0.03, headS / 2, 0, hair); }
    if (hs === 'cap') { hb(headS + 0.04, 0.1, headS + 0.04, 0, headS + 0.03, 0, hair); hb(headS * 0.9, 0.04, 0.22, 0, headS - 0.01, headS / 2 + 0.1, shadeHex(hair, 0.85)); }
    if (hs === 'tophat') { hb(headS + 0.18, 0.04, headS + 0.18, 0, headS + 0.02, 0, hair); hb(headS * 0.8, 0.42, headS * 0.8, 0, headS + 0.24, 0, hair); hb(headS * 0.82, 0.07, headS * 0.82, 0, headS + 0.08, 0, L.accent ?? '#c0392b'); }
    if (ex.includes('scarf')) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(torsoW + 0.06, 0.12, torsoD + 0.08), mat(L.accent ?? '#c0392b'));
      s.position.y = legH + torsoH - 0.03; this.body.add(s);
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.34, 0.05), mat(L.accent ?? '#c0392b'));
      tail.position.set(0.12, -0.17, 0);
      const tp = new THREE.Group(); tp.position.set(0, legH + torsoH - 0.05, -torsoD / 2 - 0.04); tp.add(tail);
      this.body.add(tp); this.tail = tp;
    }
    if (ex.includes('cape')) {
      const cp = new THREE.Group();
      cp.position.set(0, legH + torsoH - 0.02, -torsoD / 2 - 0.03);
      const c = new THREE.Mesh(new THREE.BoxGeometry(torsoW + 0.1, torsoH + legH * 0.85, 0.04), mat(L.accent ?? '#5a5a6a'));
      c.position.y = -(torsoH + legH * 0.85) / 2;
      cp.add(c); this.body.add(cp); this.cape = cp;
    }
    if (ex.includes('backpack')) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.42, 0.18), mat(L.accent ?? '#7a5832'));
      b.position.set(0, legH + torsoH / 2 + 0.04, -torsoD / 2 - 0.09); this.body.add(b);
    }
    if (ex.includes('goggles')) hb(0.12, 0.1, 0.06, 0, headS - 0.1, headS / 2 + 0.03, '#c9a03a');
  }

  private buildDog() {
    const L = this.def.look;
    const fur = L.shirt, spot = L.shirt2 ?? '#ffffff';
    const bodyM = boxMats(solidCanvas(fur, 0.08, 5), solidCanvas(fur, 0.08, 6), solidCanvas(fur, 0.08, 7), solidCanvas(spot, 0.06, 8), solidCanvas(spot, 0.06, 9));
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.32, 0.66), bodyM);
    torso.position.y = 0.42;
    this.body.add(torso);
    // legs
    const legs: THREE.Group[] = [];
    for (const [x, z] of [[-0.12, 0.24], [0.12, 0.24], [-0.12, -0.24], [0.12, -0.24]]) {
      const g = new THREE.Group(); g.position.set(x, 0.3, z);
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.3, 0.11), mat(z > 0 ? spot : fur));
      m.position.y = -0.15; g.add(m); this.body.add(g); legs.push(g);
    }
    this.legL = legs[0]; this.legR = legs[1]; this.armL = legs[2]; this.armR = legs[3];
    // head
    this.head.position.set(0, 0.56, 0.32);
    this.body.add(this.head);
    const fc = canvas();
    this.faceCanvas = fc.c; this.faceTex = tex(fc.c);
    this.redrawDogFace();
    const hm = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.32, 0.3), [mat(fur), mat(fur), mat(fur), mat(fur), new THREE.MeshLambertMaterial({ map: this.faceTex }), mat(fur)]);
    hm.position.set(0, 0.1, 0.06);
    this.head.add(hm);
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.13, 0.14), mat(spot));
    snout.position.set(0, 0.02, 0.27); this.head.add(snout);
    const nose = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.03), mat('#222'));
    nose.position.set(0, 0.07, 0.35); this.head.add(nose);
    for (const x of [-0.13, 0.13]) {
      const ear = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 0.06), mat(shadeHex(fur, 0.7)));
      ear.position.set(x, 0.24, 0.02); ear.rotation.z = x > 0 ? -0.3 : 0.3; this.head.add(ear);
    }
    if ((L.extras ?? []).includes('bandana')) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.1, 0.12), mat(L.accent ?? '#c0392b'));
      b.position.set(0, 0.52, 0.28); this.body.add(b);
      const t = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.04), mat(L.accent ?? '#c0392b'));
      t.position.set(0, 0.44, 0.34); this.body.add(t);
    }
    const tail = new THREE.Group(); tail.position.set(0, 0.52, -0.33);
    const tm = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.26), mat(fur)); tm.position.z = -0.12; tm.rotation.x = 0.6;
    tail.add(tm); this.body.add(tail); this.tail = tail;
    this.hand.position.set(0, 0.0, 0.3); this.head.add(this.hand);
    this.headHeight = 0.8; this.eyeHeight = 0.7; this.height = 0.8;
  }

  private redrawDogFace() {
    const ctx = this.faceCanvas!.getContext('2d')!;
    const L = this.def.look;
    ctx.fillStyle = L.shirt; ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = L.shirt2 ?? '#fff'; ctx.fillRect(5, 6, 6, 10);
    if (this.face.blink) { ctx.fillStyle = '#222'; ctx.fillRect(3, 7, 3, 1); ctx.fillRect(10, 7, 3, 1); }
    else {
      ctx.fillStyle = '#222'; ctx.fillRect(3, 5, 3, 3); ctx.fillRect(10, 5, 3, 3);
      ctx.fillStyle = '#fff'; ctx.fillRect(4, 5, 1, 1); ctx.fillRect(11, 5, 1, 1);
    }
    if (this.face.mood === 'angry') { ctx.fillStyle = '#3a2a1a'; ctx.fillRect(3, 3, 3, 1); ctx.fillRect(10, 3, 3, 1); }
    this.faceTex!.needsUpdate = true;
  }

  private buildGloam() {
    const eyeMat = new THREE.MeshBasicMaterial({ color: '#c79bff' });
    const { c, ctx } = canvas();
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const v = Math.random();
      ctx.fillStyle = v < 0.2 ? '#3a2850' : v < 0.6 ? '#1c1428' : '#251a34';
      ctx.fillRect(x, y, 1, 1);
    }
    const bodyMat = new THREE.MeshLambertMaterial({ map: tex(c), emissive: '#120a1e' });
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.72, 0.72), bodyMat);
    torso.position.y = 0.62;
    this.head.position.set(0, 0, 0);
    this.body.add(torso);
    this.body.add(this.head);
    for (const x of [-0.17, 0.17]) {
      const e = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.02), eyeMat);
      e.position.set(x, 0.72, 0.37); this.head.add(e);
    }
    this.glowMats.push(eyeMat);
    for (const [g, x] of [[this.legL, -0.18], [this.legR, 0.18]] as const) {
      g.position.set(x, 0.26, 0);
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.26, 0.16), bodyMat);
      m.position.y = -0.13; g.add(m); this.body.add(g);
    }
    for (const [g, x] of [[this.armL, -0.42], [this.armR, 0.42]] as const) {
      g.position.set(x, 0.75, 0);
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.42, 0.12), bodyMat);
      m.position.y = -0.2; g.add(m); this.body.add(g);
    }
    // wisps
    for (let i = 0; i < 5; i++) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), new THREE.MeshBasicMaterial({ color: '#7a4cc0', transparent: true, opacity: 0.8 }));
      w.position.set((Math.random() - 0.5) * 0.7, 1.05 + Math.random() * 0.2, (Math.random() - 0.5) * 0.7);
      w.userData.wisp = Math.random() * 6;
      this.body.add(w); this.extra.push(w);
    }
    this.headHeight = 1.0; this.eyeHeight = 0.72; this.height = 1.0;
  }

  private buildGiant() {
    // The Unmaker: a heap of frayed blocks around a burning violet core.
    const blockMat = (c: string) => new THREE.MeshLambertMaterial({ color: c, emissive: '#1a0f2a' });
    const core = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), new THREE.MeshBasicMaterial({ color: '#d7b4ff' }));
    core.position.set(0, 2.6, 0.3);
    this.body.add(core); this.extra.push(core);
    const cols = ['#2a1d3a', '#3a2850', '#6a5e7c', '#1c1428', '#4a3a6a'];
    const add = (x: number, y: number, z: number, s: number, parent: THREE.Object3D = this.body) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), blockMat(cols[Math.floor(Math.random() * cols.length)]));
      m.position.set(x, y, z); m.rotation.set(Math.random() * 0.3, Math.random() * 0.3, Math.random() * 0.3);
      parent.add(m);
      return m;
    };
    for (let i = 0; i < 26; i++) {
      const a = Math.random() * Math.PI * 2, r = 0.6 + Math.random() * 0.5;
      add(Math.cos(a) * r, 1.4 + Math.random() * 2.4, Math.sin(a) * r * 0.7 - 0.1, 0.5 + Math.random() * 0.4);
    }
    this.head.position.set(0, 4.2, 0);
    this.body.add(this.head);
    add(0, 0.3, 0, 1.2, this.head);
    const eyeMat = new THREE.MeshBasicMaterial({ color: '#f0d8ff' });
    for (const x of [-0.3, 0.3]) { const e = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.14, 0.05), eyeMat); e.position.set(x, 0.38, 0.62); this.head.add(e); }
    for (const [g, x] of [[this.armL, -1.3], [this.armR, 1.3]] as const) {
      g.position.set(x, 3.6, 0);
      for (let i = 0; i < 4; i++) add(0, -0.5 - i * 0.6, 0, 0.6 - i * 0.05, g);
      this.body.add(g);
    }
    for (const [g, x] of [[this.legL, -0.6], [this.legR, 0.6]] as const) {
      g.position.set(x, 1.4, 0);
      for (let i = 0; i < 3; i++) add(0, -0.3 - i * 0.45, 0, 0.6, g);
      this.body.add(g);
    }
    this.headHeight = 5.0; this.eyeHeight = 4.6; this.height = 5.2;
  }

  setMood(m: Mood) { this.face.mood = m; this.refreshFace(); }

  refreshFace() {
    if (!this.faceCanvas) return;
    const key = `${this.face.mood}${this.face.mouth}${this.face.blink}${this.face.look}`;
    if (key === this.faceKey) return;
    this.faceKey = key;
    if (this.def.kind === 'dog') { this.redrawDogFace(); return; }
    drawFace(this.faceCanvas.getContext('2d')!, this.def.look, this.face, this.def.kind);
    this.faceTex!.needsUpdate = true;
  }

  play(name: AnimName) {
    const def = ANIMS[name];
    if (!def) return 0;
    this.anim = { name, t: 0, def };
    if (name === 'stand' || name === 'idle') this.held = null;
    return def.dur;
  }

  setHeld(item: string | null, left = false) {
    const h = left ? this.handL : this.hand;
    for (const c of [...h.children]) h.remove(c);
    if (item) h.add(makeProp(item));
  }

  update(dt: number) {
    this.time += dt;
    const p = zeroPose();
    // idle breathing
    const breathe = Math.sin(this.time * 2.2);
    p.bodyY += breathe * 0.008;
    p.armLZ += -0.05 - breathe * 0.02;
    p.armRZ += 0.05 + breathe * 0.02;
    // walking
    if (this.speed > 0.05) {
      this.walkPhase += dt * (4 + this.speed * 2.2);
      const sw = Math.sin(this.walkPhase) * Math.min(1, this.speed / 2) * 0.9;
      if (this.def.kind === 'dog') {
        p.legLX = sw; p.legRX = -sw; p.armLX = -sw; p.armRX = sw;
      } else {
        p.legLX = sw; p.legRX = -sw; p.armLX = -sw * 0.8; p.armRX = sw * 0.8;
        p.rootY += Math.abs(Math.cos(this.walkPhase)) * 0.05 * Math.min(1, this.speed);
      }
    }
    // talking
    if (this.talking) {
      p.headRX += Math.sin(this.time * 7) * 0.04;
      p.headRY += Math.sin(this.time * 2.3) * 0.06;
      p.armRX += Math.sin(this.time * 3) * -0.12 - 0.12;
    }
    // held pose (e.g. fallen)
    if (this.held && !this.anim) ANIMS[this.held].f(1, p);
    // one-shot
    if (this.anim) {
      this.anim.t += dt / this.anim.def.dur;
      const t = Math.min(1, this.anim.t);
      this.anim.def.f(t, p);
      if (this.anim.t >= 1) {
        if (this.anim.def.hold) this.held = this.anim.name;
        this.anim = null;
      }
    }
    // gloam bob
    if (this.def.kind === 'gloam') {
      p.bodyY += Math.sin(this.time * 4) * 0.05;
      for (const w of this.extra) { const u = w.userData.wisp + this.time; w.position.y = 1.05 + ((u * 0.4) % 0.6); (w as THREE.Mesh).scale.setScalar(1 - ((u * 0.4) % 0.6) / 0.6); }
    }
    if (this.def.kind === 'giant') {
      const core = this.extra[0];
      if (core) core.scale.setScalar(1 + Math.sin(this.time * 5) * 0.08);
      p.bodyY += Math.sin(this.time * 1.5) * 0.08;
    }
    // dog tail wag
    if (this.tail && this.def.kind === 'dog') this.tail.rotation.y = Math.sin(this.time * 12) * 0.5;
    if (this.tail && this.def.kind !== 'dog') this.tail.rotation.x = 0.1 + Math.sin(this.time * 2) * 0.05 + this.speed * 0.15;
    if (this.cape) this.cape.rotation.x = 0.05 + this.speed * 0.15 + Math.sin(this.time * 1.7) * 0.03;
    // blink
    this.blinkTimer -= dt;
    if (this.blinkTimer < 0) { this.face.blink = true; if (this.blinkTimer < -0.12) { this.face.blink = false; this.blinkTimer = 2 + Math.random() * 4; } }
    this.refreshFace();
    // apply
    this.body.position.y = p.bodyY;
    this.body.rotation.set(p.bodyRX, p.bodyRY, p.bodyRZ);
    this.head.rotation.set(p.headRX, p.headRY, p.headRZ);
    this.armL.rotation.set(p.armLX, 0, p.armLZ);
    this.armR.rotation.set(p.armRX, 0, p.armRZ);
    this.legL.rotation.x = p.legLX;
    this.legR.rotation.x = p.legRX;
    this.pose = p;
  }
  pose: Pose = zeroPose();
}

// ---------- Actor: model + position/movement in the world ----------

export class Actor {
  model: CharModel;
  pos = new THREE.Vector3();
  yaw = 0;
  targetYaw = 0;
  path: THREE.Vector3[] = [];
  moveSpeed = 2.4;
  onArrive: (() => void) | null = null;
  visible = true;
  fly = false;
  constructor(public id: string, public def: CharDef, public world: () => VoxelWorld | null) {
    this.model = new CharModel(def);
  }
  get object() { return this.model.root; }

  place(x: number, z: number, y?: number) {
    const w = this.world();
    this.pos.set(x, y ?? (w ? w.groundY(x, z, 200) : 0), z);
    this.path = [];
    this.sync();
  }
  placeOnGroundNear(x: number, z: number, fromY: number) {
    const w = this.world();
    this.pos.set(x, w ? w.groundY(x, z, fromY + 1.5) : fromY, z);
    this.path = [];
    this.sync();
  }
  faceTo(yaw: number, instant = false) {
    this.targetYaw = yaw;
    if (instant) this.yaw = yaw;
  }
  facePoint(x: number, z: number, instant = false) {
    const dx = x - this.pos.x, dz = z - this.pos.z;
    if (Math.abs(dx) + Math.abs(dz) < 1e-3) return;
    this.faceTo(Math.atan2(dx, dz), instant);
  }
  walkTo(x: number, z: number, speed = 2.4): Promise<void> {
    this.path = [new THREE.Vector3(x, 0, z)];
    this.moveSpeed = speed;
    return new Promise((res) => { this.onArrive = res; });
  }
  stop() {
    this.path = [];
    this.model.speed = 0;
    const cb = this.onArrive; this.onArrive = null; cb?.();
  }

  update(dt: number) {
    const w = this.world();
    if (this.path.length) {
      const t = this.path[0];
      const dx = t.x - this.pos.x, dz = t.z - this.pos.z;
      const d = Math.hypot(dx, dz);
      const step = this.moveSpeed * dt;
      if (d <= step || d < 0.02) {
        this.pos.x = t.x; this.pos.z = t.z;
        this.path.shift();
        if (!this.path.length) { this.model.speed = 0; const cb = this.onArrive; this.onArrive = null; cb?.(); }
      } else {
        this.pos.x += (dx / d) * step; this.pos.z += (dz / d) * step;
        this.targetYaw = Math.atan2(dx, dz);
        this.model.speed = this.moveSpeed;
      }
    } else if (this.model.speed > 0 && !this.manual) this.model.speed = 0;
    // ground follow
    if (w && !this.fly) {
      const g = w.groundY(this.pos.x, this.pos.z, this.pos.y + 1.2);
      if (Math.abs(g - this.pos.y) < 1.3) this.pos.y += (g - this.pos.y) * Math.min(1, dt * 14);
      else if (g < this.pos.y) this.pos.y = Math.max(g, this.pos.y - dt * 9);
    }
    // turn
    let dy = this.targetYaw - this.yaw;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    this.yaw += dy * Math.min(1, dt * 10);
    this.model.update(dt);
    this.sync();
  }
  manual = false;

  sync() {
    const r = this.model.root;
    r.position.set(this.pos.x, this.pos.y + this.model.pose.rootY, this.pos.z);
    r.rotation.set(this.model.pose.rootRX, this.yaw, this.model.pose.rootRZ, 'YXZ');
    r.visible = this.visible;
  }

  headWorld(): THREE.Vector3 {
    return new THREE.Vector3(this.pos.x, this.pos.y + this.model.eyeHeight, this.pos.z);
  }
  forward(): THREE.Vector3 { return new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw)); }
}
