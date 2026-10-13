// Free-roam sections: walk Wren around, interact with hotspots.
import * as THREE from 'three';
import { audio } from '../audio/audio';
import type { Actor } from '../render/characters';
import { auto, sleep } from '../ui/hud';
import type { Runner } from './runner';
import { test } from './state';
import type { ExploreSpec, Hotspot } from './types';

export class Explorer {
  active = false;
  private keys = new Set<string>();
  private abortFn: (() => void) | null = null;
  private yaw = 0;
  private busy = false;
  constructor(private r: Runner) {
    window.addEventListener('keydown', (e) => { if (this.active) this.keys.add(e.code); });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
  }

  abort() { this.abortFn?.(); }

  hotspotPos(h: Hotspot): THREE.Vector3 | null {
    if (h.actor) {
      const a = this.r.actor(h.actor);
      if (!a || !a.visible) return null;
      return a.pos.clone().add(new THREE.Vector3(0, a.model.height + 0.2, 0));
    }
    if (h.at) return new THREE.Vector3(h.at[0], h.at[1], h.at[2]);
    return null;
  }

  async run(spec: ExploreSpec) {
    const r = this.r;
    const st = r.stage;
    const hud = r.hud;
    const player = r.mustActor(spec.player ?? 'wren');
    const seen = r.state.seen;
    const avail = () => spec.hotspots.filter((h) => test(h.when, r.state) && !(isOnce(h) && seen[h.id]));
    const isDone = () => {
      if (spec.until && test(spec.until, r.state)) return true;
      const req = spec.hotspots.filter((h) => h.required);
      if (!spec.until && req.length && req.every((h) => seen[h.id])) return true;
      return false;
    };
    const isOnce = (h: Hotspot) => h.once ?? (h.verb === 'Take' || h.verb === 'Use' || h.verb === 'Open' || h.ends);

    // ---- automated play: visit hotspots in order until done ----
    if (auto.on) {
      let guard = 0;
      while (!isDone() && guard++ < 60) {
        const list = avail();
        const next = list.find((h) => h.required && !seen[h.id]) ?? list.find((h) => !seen[h.id]) ?? list.find((h) => h.ends);
        if (!next) break;
        seen[next.id] = true;
        await r.run(next.steps);
        if (next.ends) break;
      }
      // also visit remaining optional ones occasionally to exercise their scripts
      for (const h of avail()) if (!seen[h.id] && !h.ends && auto.rng() < 0.5) { seen[h.id] = true; await r.run(h.steps); }
      if (!isDone() && !spec.hotspots.some((h) => h.ends && seen[h.id])) {
        const req = spec.hotspots.filter((h) => h.required && !seen[h.id]).map((h) => h.id);
        if (req.length) throw new Error(`Explore stuck in ${r.scene.id}: unreachable ${req.join(',')} (${spec.objective})`);
      }
      return;
    }

    this.active = true;
    player.manual = true;
    hud.setObjective(r.text(spec.objective));
    // camera yaw: look along the set's wide shot by default
    const wide = st.set?.cams.wide;
    this.yaw = spec.cam?.yaw !== undefined ? (spec.cam.yaw * Math.PI) / 180
      : wide ? Math.atan2(wide.look[0] - wide.pos[0], wide.look[2] - wide.pos[2]) : 0;
    const dist = spec.cam?.dist ?? 6.5, height = spec.cam?.height ?? 3.6;
    st.followCam(player.pos, this.yaw, dist, height, 0, true);

    let near: Hotspot | null = null;
    let finished = false;
    let moveTarget: THREE.Vector3 | null = null;
    let pendingHotspot: Hotspot | null = null;
    const labelEls = new Map<string, HTMLDivElement>();

    const interact = async (h: Hotspot) => {
      if (this.busy || finished) return;
      this.busy = true;
      moveTarget = null; pendingHotspot = null;
      player.model.speed = 0;
      const hp = this.hotspotPos(h);
      if (hp) player.facePoint(hp.x, hp.z);
      if (h.actor) { const a = r.actor(h.actor); if (a && a.def.kind !== 'giant') a.facePoint(player.pos.x, player.pos.z); }
      hud.labels.innerHTML = ''; labelEls.clear();
      hud.setObjective(null);
      audio.sfx('select');
      seen[h.id] = true;
      r.lastSpeaker = null;
      try {
        await r.run(h.steps);
      } finally {
        this.busy = false;
      }
      r.hideTalking();
      if (h.ends || isDone()) { finished = true; return; }
      hud.setObjective(r.text(spec.objective));
      st.followCam(player.pos, this.yaw, dist, height, 0, false);
    };

    const onPointer = (e: PointerEvent) => {
      if (this.busy || finished || r.paused) return;
      const t = e.target as HTMLElement;
      if (t.closest('button, .choice, .qte-btn, .craft')) return;
      const lab = t.closest('.label') as HTMLElement | null;
      if (lab) {
        const h = spec.hotspots.find((x) => x.id === lab.dataset.id);
        if (h) {
          const p = this.hotspotPos(h);
          if (h === near) { void interact(h); return; }
          if (p) { moveTarget = new THREE.Vector3(p.x, 0, p.z); pendingHotspot = h; }
        }
        return;
      }
      const g = st.pickGround(e.clientX, e.clientY);
      if (g) { moveTarget = g; pendingHotspot = null; }
    };
    hud.root.addEventListener('pointerdown', onPointer);
    const onKey = (e: KeyboardEvent) => {
      if (this.busy || finished || r.paused) return;
      if ((e.code === 'KeyE' || e.code === 'Enter' || e.code === 'Space') && near) { e.preventDefault(); void interact(near); }
    };
    window.addEventListener('keydown', onKey);

    const canStand = (x: number, z: number, fromY: number) => {
      const w = st.world!;
      if (spec.bounds) {
        const [x0, z0, x1, z1] = spec.bounds;
        if (x < x0 || x > x1 || z < z0 || z > z1) return null;
      }
      const g = w.groundY(x, z, fromY + 1.1);
      if (g - fromY > 1.05) return null; // too high to step
      if (fromY - g > 3.5) return null; // don't walk off cliffs
      if (w.solid(x, g, z) || w.solid(x, g + 1, z)) return null;
      // block water/lava/void
      const below = w.name(Math.floor(x), g - 1, Math.floor(z));
      if (below === 'lava' || below === 'water') return null;
      if (g <= 0) return null;
      return g;
    };

    const move = (p: Actor, dx: number, dz: number) => {
      const nx = p.pos.x + dx, nz = p.pos.z + dz;
      const r2 = 0.28;
      const ok = (x: number, z: number) => canStand(x + Math.sign(dx) * r2, z, p.pos.y) !== null && canStand(x, z + Math.sign(dz) * r2, p.pos.y) !== null && canStand(x, z, p.pos.y) !== null;
      if (ok(nx, nz)) { p.pos.x = nx; p.pos.z = nz; return true; }
      if (dx && ok(nx, p.pos.z)) { p.pos.x = nx; return true; }
      if (dz && ok(p.pos.x, nz)) { p.pos.z = nz; return true; }
      return false;
    };

    let stepT = 0;
    await new Promise<void>((resolve) => {
      this.abortFn = () => { finished = true; };
      const tick = (dt: number) => {
        if (finished) { st.onUpdate = null; resolve(); return; }
        if (this.busy || r.paused) return;
        // input
        let ix = 0, iz = 0;
        const k = this.keys;
        if (k.has('KeyW') || k.has('ArrowUp')) iz += 1;
        if (k.has('KeyS') || k.has('ArrowDown')) iz -= 1;
        if (k.has('KeyA') || k.has('ArrowLeft')) ix += 1;
        if (k.has('KeyD') || k.has('ArrowRight')) ix -= 1;
        if (k.has('KeyZ') || k.has('KeyQ')) this.yaw += dt * 1.6;
        if (k.has('KeyC')) this.yaw -= dt * 1.6;
        const speed = k.has('ShiftLeft') || k.has('ShiftRight') ? 5.2 : 3.4;
        let mx = 0, mz = 0;
        if (ix || iz) {
          moveTarget = null; pendingHotspot = null;
          const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
          // forward = (fx,fz), left = (fz,-fx)
          mx = fx * iz + fz * ix; mz = fz * iz - fx * ix;
          const l = Math.hypot(mx, mz); mx /= l; mz /= l;
        } else if (moveTarget) {
          const dx = moveTarget.x - player.pos.x, dz = moveTarget.z - player.pos.z;
          const d = Math.hypot(dx, dz);
          const stopAt = pendingHotspot ? (pendingHotspot.radius ?? 2.2) * 0.6 : 0.15;
          if (d < stopAt) {
            moveTarget = null;
            if (pendingHotspot) { const h = pendingHotspot; pendingHotspot = null; void interact(h); return; }
          } else { mx = dx / d; mz = dz / d; }
        }
        if (mx || mz) {
          const moved = move(player, mx * speed * dt, mz * speed * dt);
          if (!moved) moveTarget = null;
          player.targetYaw = Math.atan2(mx, mz);
          player.model.speed = moved ? speed : 0;
          stepT += dt;
          if (moved && stepT > 0.32) { stepT = 0; audio.sfx('step'); }
        } else player.model.speed = 0;
        // companions trail behind loosely (Pepper)
        const pep = r.stage.actor('pepper');
        if (pep && pep.visible && !spec.hotspots.some((h) => h.actor === 'pepper' && !seen[h.id])) {
          const d = pep.pos.distanceTo(player.pos);
          if (d > 3.2 && !pep.path.length) pep.walkTo(player.pos.x - Math.sin(player.yaw) * 1.4, player.pos.z - Math.cos(player.yaw) * 1.4, 4.2);
        }
        // camera
        st.followCam(player.pos, this.yaw, dist, height, dt);
        // hotspots
        const list = avail();
        let best: Hotspot | null = null, bestD = Infinity;
        const seenIds = new Set<string>();
        for (const h of list) {
          const p = this.hotspotPos(h);
          if (!p) continue;
          const d = Math.hypot(p.x - player.pos.x, p.z - player.pos.z) - (h.actor ? 0.2 : 0);
          const rad = h.radius ?? 2.2;
          if (d < rad && d < bestD && Math.abs(p.y - player.pos.y) < 4) { best = h; bestD = d; }
          if (d > 16) continue;
          seenIds.add(h.id);
          let e = labelEls.get(h.id);
          if (!e) {
            e = document.createElement('div');
            e.className = 'label';
            e.dataset.id = h.id;
            e.innerHTML = `<span class="label-dot"></span><span class="label-key">E</span><span class="label-verb"></span><span class="label-text"></span>`;
            (e.querySelector('.label-verb') as HTMLElement).textContent = h.verb ?? 'Look';
            (e.querySelector('.label-text') as HTMLElement).textContent = r.text(h.label);
            hud.labels.appendChild(e);
            labelEls.set(h.id, e);
          }
          const s = st.worldToScreen(p);
          e.style.display = s.visible ? '' : 'none';
          e.style.transform = `translate(${s.x}px, ${s.y}px)`;
          e.classList.toggle('required', !!h.required && !seen[h.id]);
          e.classList.toggle('visited', !!seen[h.id]);
        }
        for (const [id, e] of labelEls) if (!seenIds.has(id)) { e.remove(); labelEls.delete(id); }
        near = best;
        for (const [id, e] of labelEls) e.classList.toggle('near', near?.id === id);
      };
      st.onUpdate = tick;
    });
    st.onUpdate = null;
    this.abortFn = null;
    hud.root.removeEventListener('pointerdown', onPointer);
    window.removeEventListener('keydown', onKey);
    hud.labels.innerHTML = '';
    hud.setObjective(null);
    player.manual = false;
    player.model.speed = 0;
    this.active = false;
    this.keys.clear();
    await sleep(10);
  }
}
