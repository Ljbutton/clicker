// Interprets episode scripts against the stage and HUD.
import * as THREE from 'three';
import { audio } from '../audio/audio';
import { CHARS, NAME_COLORS, WREN_LOOKS } from '../content/cast';
import { itemDef, itemIcon } from '../content/items';
import { getSet } from '../content/sets';
import type { Actor } from '../render/characters';
import type { Stage } from '../render/stage';
import { runCraft } from '../ui/craft';
import { auto, Hud, sleep } from '../ui/hud';
import { Explorer } from './explore';
import { cloneState, test, writeSave, type GameState } from './state';
import type { AnimName, CastEntry, Episode, Option, QteKey, Scene, ShotSpec, Step, Vec2, Vec3 } from './types';

export class GotoSignal { constructor(public label: string) {} }
export class SceneSignal { constructor(public id: string) {} }
export class EndSignal {}
export class QteFail {}
export class QuitSignal {}

export class Runner {
  state!: GameState;
  episode!: Episode;
  scene!: Scene;
  lastSpeaker: string | null = null;
  exchange = 0;
  explorer: Explorer;
  quitting = false;
  paused = false;
  private pauseWaiters: Array<() => void> = [];

  constructor(public stage: Stage, public hud: Hud) {
    this.explorer = new Explorer(this);
  }

  // ---------- ids, text ----------

  /** Resolve aliases like partner/captive to real character ids. */
  rid(id: string): string {
    if (id === 'partner') return String(this.state.flags.saved ?? 'juno');
    if (id === 'captive') return this.state.flags.saved === 'bram' ? 'juno' : 'bram';
    return id;
  }
  kindOf(id: string) { return id.split('#')[0]; }
  actor(id: string): Actor | undefined { return this.stage.actor(this.rid(id)); }
  charName(id: string): string {
    const r = this.rid(id);
    return CHARS[this.kindOf(r)]?.name ?? r;
  }
  text(s: string): string {
    return s
      .replace(/\{partner\}/g, this.charName('partner'))
      .replace(/\{captive\}/g, this.charName('captive'))
      .replace(/\{(\w+)\}/g, (m, k) => (CHARS[k] ? CHARS[k].name : String(this.state.flags[k] ?? m)));
  }

  // ---------- pause ----------

  async checkPause() {
    if (this.quitting) throw new QuitSignal();
    if (!this.paused) return;
    await new Promise<void>((r) => this.pauseWaiters.push(r));
    if (this.quitting) throw new QuitSignal();
  }
  setPaused(p: boolean) {
    this.paused = p;
    if (!p) { const w = this.pauseWaiters; this.pauseWaiters = []; w.forEach((f) => f()); }
  }
  quit() { this.quitting = true; this.setPaused(false); this.explorer.abort(); }

  // ---------- episode ----------

  async playEpisode(ep: Episode, state: GameState, startScene?: string): Promise<'done' | 'quit'> {
    this.episode = ep;
    this.state = state;
    this.quitting = false;
    state.episode = ep.id;
    let sceneId = startScene ?? ep.start;
    let firstScene = !startScene || startScene === ep.start;
    try {
      while (true) {
        const sc = ep.scenes.find((s) => s.id === sceneId);
        if (!sc) throw new Error(`Scene ${sceneId} not found in ${ep.id}`);
        try {
          if (firstScene) {
            this.hud.fadeInstant('out');
            this.prepScene(sc);
            this.hud.fadeInstant('out');
            await this.hud.title(ep.title, `Episode ${ep.number}`, 3);
            firstScene = false;
          } else this.prepScene(sc);
          await this.hud.fade('in', 0.8);
          await this.runTop(sc.steps);
          // falling off the end of a scene without a transition ends the episode
          throw new EndSignal();
        } catch (e) {
          if (e instanceof SceneSignal) {
            await this.hud.fade('out', 0.6);
            sceneId = e.id;
            continue;
          }
          throw e;
        }
      }
    } catch (e) {
      this.explorer.abort();
      if (e instanceof EndSignal) {
        await this.hud.fade('out', 1);
        if (!state.done.includes(ep.id)) state.done.push(ep.id);
        state.scene = '';
        writeSave(state);
        return 'done';
      }
      if (e instanceof QuitSignal) return 'quit';
      throw e;
    }
  }

  prepScene(sc: Scene) {
    this.scene = sc;
    this.state.scene = sc.id;
    if (!auto.on) writeSave(cloneState(this.state));
    this.hud.hideAll();
    const set = getSet(sc.set);
    this.stage.loadSet(set, this.state.flags);
    if (sc.sky) this.stage.setSky(sc.sky);
    if (sc.music) audio.play(sc.music);
    this.lastSpeaker = null;
    this.exchange = 0;
    this.camKey = '';
    // Wren's look
    CHARS.wren.look = WREN_LOOKS[Number(this.state.flags.look ?? 0)] ?? WREN_LOOKS[0];
    for (const [id, entry] of Object.entries(sc.cast)) this.placeCast(id, entry);
    this.refreshItems();
  }

  placeCast(id: string, e: CastEntry) {
    const real = this.rid(id);
    const def = CHARS[this.kindOf(real)];
    if (!def) throw new Error(`Unknown character ${real}`);
    const a = this.stage.addActor(real, def);
    this.position(a, e.at, e.face);
    a.visible = !e.hidden;
    if (e.item) a.model.setHeld(e.item);
    a.sync();
  }

  position(a: Actor, at: Vec2 | Vec3, face?: number | string) {
    if (at.length === 3) a.placeOnGroundNear(at[0], at[2], at[1]);
    else a.place(at[0], at[1]);
    if (face !== undefined) this.faceActor(a, face, true);
  }

  faceActor(a: Actor, to: number | string, instant = false) {
    if (typeof to === 'number') { a.faceTo((to * Math.PI) / 180, instant); return; }
    if (to === 'camera') { a.facePoint(this.stage.camera.position.x, this.stage.camera.position.z, instant); return; }
    const b = this.actor(to);
    if (b) a.facePoint(b.pos.x, b.pos.z, instant);
  }

  refreshItems() {
    this.hud.setItems(this.state.items.map((id) => ({ id, name: itemDef(id).name, icon: itemIcon(id, 32) })));
  }

  // ---------- execution ----------

  /** Run a scene's top-level steps, handling labels/goto. */
  async runTop(steps: Step[]) {
    let pc = 0;
    while (pc < steps.length) {
      try {
        await this.exec(steps[pc]);
        pc++;
      } catch (e) {
        if (e instanceof GotoSignal) {
          const i = steps.findIndex((s) => 'label' in s && s.label === e.label);
          if (i < 0) throw new Error(`Label ${e.label} not found in scene ${this.scene.id}`);
          pc = i + 1;
          continue;
        }
        throw e;
      }
    }
  }

  async run(steps: Step[] | undefined) {
    if (!steps) return;
    for (const s of steps) await this.exec(s);
  }

  async exec(s: Step): Promise<void> {
    await this.checkPause();
    const st = this.stage;
    if ('say' in s) return this.say(s.say, s.text, s);
    if ('narrate' in s) { this.hideTalking(); return this.hud.narrate(this.text(s.narrate)); }
    if ('think' in s) return this.hud.say('Wren', this.text(s.think), NAME_COLORS.wren, 1, undefined, true);
    if ('choice' in s) return this.choice(s);
    if ('if' in s) return this.run(test(s.if, this.state) ? s.then : s.else);
    if ('label' in s) return;
    if ('goto' in s) throw new GotoSignal(s.goto);
    if ('set' in s) { Object.assign(this.state.flags, s.set); return; }
    if ('rel' in s) { this.addRel(s.rel); return; }
    if ('remember' in s) { this.hud.notice(this.text(s.remember)); return; }
    if ('shot' in s) { this.applyShot(s.shot, s.dur ?? 0); this.camKey = ''; return; }
    if ('move' in s) {
      const a = this.mustActor(s.move);
      const p = a.walkTo(s.to[0], s.to[1], s.speed ?? (s.run ? 5 : 2.4));
      if (auto.on) { a.stop(); a.place(s.to[0], s.to[1]); return; }
      if (s.wait) await p;
      return;
    }
    if ('place' in s) { const a = this.mustActor(s.place); this.position(a, s.at, s.face); a.visible = true; a.sync(); return; }
    if ('anim' in s) {
      const a = this.mustActor(s.anim);
      const d = a.model.play(s.name as AnimName);
      if (s.name === 'bark') audio.sfx('bark');
      if (s.name === 'swing') audio.sfx('swing');
      if (s.wait && !auto.on) await sleep(d * 1000);
      return;
    }
    if ('mood' in s) { this.mustActor(s.mood).model.setMood(s.is); return; }
    if ('show' in s) {
      let a = this.actor(s.show);
      if (!a) { const real = this.rid(s.show); a = st.addActor(real, CHARS[this.kindOf(real)]); }
      if (s.at) this.position(a, s.at, s.face);
      else if (s.face !== undefined) this.faceActor(a, s.face, true);
      a.visible = true; a.sync();
      return;
    }
    if ('hide' in s) { const a = this.actor(s.hide); if (a) { a.visible = false; a.stop(); a.sync(); } return; }
    if ('spawn' in s) {
      const def = CHARS[s.kind];
      if (!def) throw new Error(`Unknown kind ${s.kind}`);
      st.removeActor(s.spawn);
      const a = st.addActor(s.spawn, def);
      this.position(a, s.at, s.face);
      if (s.kind === 'gloam') { st.fx('poof', a.headWorld(), 1.5); audio.sfx('gloam'); }
      return;
    }
    if ('face' in s && 'to' in s) { const a = this.mustActor(s.face); this.faceActor(a, s.to); return; }
    if ('wait' in s) { if (!auto.on) await sleep(s.wait * 1000); return; }
    if ('sfx' in s) { audio.sfx(s.sfx); return; }
    if ('music' in s) { audio.play(s.music); return; }
    if ('fx' in s) {
      const at = typeof s.at === 'string' ? this.actor(s.at)?.headWorld() : s.at ? new THREE.Vector3(...s.at) : undefined;
      st.fx(s.fx, at, s.radius ?? 2, s.dur ?? 0.5, s.color);
      if (s.fx === 'shake') audio.sfx('rumble');
      if (s.fx === 'seams') audio.sfx('fray');
      return;
    }
    if ('fill' in s) {
      const w = st.world!;
      const { from, to, block } = s.fill;
      for (let y = Math.min(from[1], to[1]); y <= Math.max(from[1], to[1]); y++)
        for (let z = Math.min(from[2], to[2]); z <= Math.max(from[2], to[2]); z++)
          for (let x = Math.min(from[0], to[0]); x <= Math.max(from[0], to[0]); x++) w.set(x, y, z, block);
      return;
    }
    if ('blocks' in s) { for (const [x, y, z, b] of s.blocks) st.world!.set(x, y, z, b); return; }
    if ('fray' in s) { st.fray(s.fray.from, s.fray.to, s.fray.dur ?? 3); audio.sfx('fray'); return; }
    if ('sky' in s) { st.setSky(s.sky); return; }
    if ('qte' in s) return this.qte(s.qte);
    if ('action' in s) return this.action(s.action);
    if ('explore' in s) return this.explorer.run(s.explore);
    if ('craft' in s) {
      this.hideTalking();
      this.hud.sub.classList.add('hidden');
      await runCraft(this.hud.root, s.craft);
      this.give(s.craft.result);
      return;
    }
    if ('title' in s) return this.hud.title(this.text(s.title), s.sub ? this.text(s.sub) : undefined);
    if ('scene' in s) throw new SceneSignal(s.scene);
    if ('end' in s) throw new EndSignal();
    if ('give' in s) { this.give(s.give); return; }
    if ('take' in s) { this.state.items = this.state.items.filter((i) => i !== s.take); this.refreshItems(); return; }
    if ('parallel' in s) { await Promise.all(s.parallel.map((x) => this.exec(x))); return; }
    if ('fade' in s) return this.hud.fade(s.fade, s.dur ?? 0.6);
    if ('hold' in s) { this.mustActor(s.hold).model.setHeld(s.item); return; }
    if ('carry' in s) { this.mustActor(s.carry).model.setHeld(s.item, true); return; }
    console.warn('Unknown step', s);
  }

  give(id: string) {
    if (!this.state.items.includes(id)) this.state.items.push(id);
    this.hud.notice(`Got: ${itemDef(id).name}`, 'item');
    this.refreshItems();
  }

  addRel(r: Record<string, number>) {
    for (const [k, v] of Object.entries(r)) {
      const id = this.rid(k);
      this.state.rel[id] = (this.state.rel[id] ?? 0) + v;
    }
  }

  mustActor(id: string): Actor {
    const a = this.actor(id);
    if (!a) {
      // create on demand (hidden by default until placed)
      const real = this.rid(id);
      const def = CHARS[this.kindOf(real)];
      if (!def) throw new Error(`No actor ${id} in scene ${this.scene.id}`);
      const na = this.stage.addActor(real, def);
      na.place(0, 0);
      na.visible = false;
      return na;
    }
    return a;
  }

  hideTalking() { for (const a of this.stage.actors.values()) { a.model.talking = false; a.model.face.mouth = 0; } }

  applyShot(spec: ShotSpec, dur = 0) {
    const fix = (x: string) => this.rid(x);
    let s: ShotSpec = spec;
    if (typeof spec === 'object') {
      if ('close' in spec) s = { ...spec, close: fix(spec.close) };
      else if ('two' in spec) s = { ...spec, two: [fix(spec.two[0]), fix(spec.two[1])] };
      else if ('ots' in spec) s = { ...spec, ots: [fix(spec.ots[0]), fix(spec.ots[1])] };
      else if ('orbit' in spec) s = { ...spec, orbit: fix(spec.orbit) };
    }
    this.stage.shot(s, dur);
  }

  // ---------- dialogue ----------

  async say(who: string, raw: string, s: { mood?: import('./types').Mood; shot?: ShotSpec; anim?: AnimName; to?: string }) {
    const id = this.rid(who);
    const a = this.actor(id);
    const text = this.text(raw);
    const visible = a && a.visible;
    // facing
    const listenerId = s.to ? this.rid(s.to) : this.lastSpeaker && this.lastSpeaker !== id ? this.lastSpeaker : null;
    const listener = listenerId ? this.stage.actor(listenerId) : undefined;
    if (visible && listener && listener.visible && !a.path.length) {
      a.facePoint(listener.pos.x, listener.pos.z);
      if (!listener.path.length && !listener.manual) listener.facePoint(a.pos.x, a.pos.z);
    }
    // camera
    if (s.shot) { this.applyShot(s.shot); this.camKey = ''; }
    else if (visible && !this.explorer.active) this.autoCam(id, listener && listener.visible ? listener.id : null);
    if (visible && s.mood) a.model.setMood(s.mood);
    if (visible && s.anim) { a.model.play(s.anim); if (s.anim === 'bark') audio.sfx('bark'); }
    if (visible) a.model.talking = true;
    this.lastSpeaker = id;
    const def = CHARS[this.kindOf(id)];
    const name = def?.name ?? id;
    await this.hud.say(name, text, NAME_COLORS[this.kindOf(id)] ?? '#fff', def?.voice ?? 1, (m) => { if (a) a.model.face.mouth = m; });
    if (a) { a.model.talking = false; a.model.face.mouth = 0; }
  }

  private camKey = '';
  autoCam(speaker: string, listener: string | null) {
    const sp = this.stage.actor(speaker);
    if (!sp) return;
    // keep the shot while the same speaker keeps talking from the same spot
    const key = `${speaker}|${listener}|${Math.round(sp.targetYaw * 4)}|${Math.round(sp.pos.x)},${Math.round(sp.pos.z)}`;
    if (key === this.camKey && this.exchange > 0) return;
    this.camKey = key;
    this.exchange++;
    if (listener && this.exchange % 5 === 0) { this.stage.shot({ two: [speaker, listener] }); return; }
    if (listener) {
      const l = this.stage.actor(listener)!;
      const d = l.pos.distanceTo(sp.pos);
      if (d < 7 && l.def.kind !== 'giant' && sp.def.kind !== 'giant') { this.stage.shot({ ots: [listener, speaker], side: this.exchange % 2 ? -1 : 1 }); return; }
    }
    this.stage.shot({ close: speaker, side: this.exchange % 2 ? 0.35 : -0.35 });
  }

  // ---------- choices ----------

  async choice(s: Extract<Step, { choice: Option[] }>) {
    const opts = s.choice.filter((o) => test(o.when, this.state));
    if (s.shot) this.applyShot(s.shot);
    const visible = opts.filter((o) => !o.timeout);
    const timeoutOpt = opts.find((o) => o.timeout);
    let i = await this.hud.choose(visible.map((o) => this.text(o.text)), s.timer ?? 0, s.prompt ? this.text(s.prompt) : undefined);
    let picked: Option | undefined;
    if (i < 0) picked = timeoutOpt ?? { text: '...', steps: [] };
    else picked = visible[i];
    if (s.major) {
      const list = (this.state.majors[this.episode.id] ??= []);
      const options = visible.map((o) => this.text(o.label ?? o.text));
      let chosen = i;
      if (i < 0 && timeoutOpt) {
        // a meaningful timeout: show its label (or match a visible option with the same text)
        const lab = this.text(timeoutOpt.label ?? timeoutOpt.text);
        chosen = options.indexOf(lab);
        if (chosen < 0) { options.push(lab); chosen = options.length - 1; }
      }
      const rec = { id: s.major.id, title: this.text(s.major.title), options, chosen };
      const k = list.findIndex((m) => m.id === s.major!.id);
      if (k >= 0) list[k] = rec; else list.push(rec);
    }
    if (picked.set) Object.assign(this.state.flags, picked.set);
    if (picked.rel) this.addRel(picked.rel);
    if (picked.remember) this.hud.notice(this.text(picked.remember));
    if (i < 0 && !picked.steps?.length && !timeoutOpt) {
      // silent: Wren says nothing
      await this.hud.say('Wren', '...', NAME_COLORS.wren, 1);
    }
    await this.run(picked.steps);
  }

  // ---------- action ----------

  async qte(q: import('./types').QteSpec) {
    this.hud.sub.classList.add('hidden');
    const keys: QteKey[] = q.keys ?? [q.key ?? (q.kind === 'dir' ? 'left' : 'action')];
    const time = q.time ?? (q.kind === 'mash' ? 3 : q.kind === 'seq' ? 1.4 : 1.5);
    const anchor = q.on ? this.actor(q.on) : undefined;
    const pos = () => {
      if (!anchor) return { x: window.innerWidth / 2, y: window.innerHeight * 0.55 };
      const p = this.stage.worldToScreen(anchor.headWorld().add(new THREE.Vector3(0, 0.4, 0)));
      return p.visible ? p : { x: window.innerWidth / 2, y: window.innerHeight * 0.55 };
    };
    const label = q.text ?? (q.kind === 'mash' ? 'Mash!' : q.kind === 'dir' ? 'Dodge!' : 'Now!');
    const ok = await this.hud.qte(q.kind, keys, time, this.text(label), q.count ?? 10, pos);
    if (ok) return this.run(q.ok);
    if (q.fail) return this.run(q.fail);
    throw new QteFail();
  }

  async action(steps: Step[]) {
    // snapshot actor transforms so a failed attempt can rewind
    const snap = [...this.stage.actors.values()].map((a) => ({ id: a.id, pos: a.pos.clone(), yaw: a.yaw, vis: a.visible, held: a.model.hand.children[0]?.name ?? null, carried: a.model.handL.children[0]?.name ?? null }));
    const flags = JSON.stringify(this.state.flags);
    let tries = 0;
    while (true) {
      try {
        await this.run(steps);
        return;
      } catch (e) {
        if (!(e instanceof QteFail)) throw e;
        tries++;
        if (auto.on && tries > 3) auto.failRate = 0;
        await this.hud.failScreen();
        this.hud.fadeInstant('out');
        this.state.flags = JSON.parse(flags);
        for (const id of [...this.stage.actors.keys()]) if (!snap.find((x) => x.id === id)) this.stage.removeActor(id);
        for (const sn of snap) {
          const a = this.stage.actor(sn.id);
          if (!a) continue;
          a.stop();
          a.pos.copy(sn.pos); a.yaw = sn.yaw; a.targetYaw = sn.yaw; a.visible = sn.vis;
          a.model.play('idle'); a.model.held = null; a.model.anim = null;
          a.model.setHeld(sn.held); a.model.setHeld(sn.carried, true);
          a.sync();
        }
        await this.hud.fade('in', 0.5);
      }
    }
  }
}
