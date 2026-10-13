import '@fontsource/pixelify-sans/500.css';
import '@fontsource/pixelify-sans/700.css';
import '@fontsource/nunito/600.css';
import '@fontsource/nunito/800.css';
import './styles.css';
import * as THREE from 'three';
import { audio } from './audio/audio';
import { mulberry32 } from './core/rng';
import { Runner } from './core/runner';
import { clearSave, loadSave, loadSettings, newState, writeSave, writeSettings, type GameState, type Settings } from './core/state';
import { CHARS, WREN_LOOKS } from './content/cast';
import { EPISODE_DEFAULTS, ITEM_DEFAULTS } from './content/defaults';
import { EPISODES } from './content/episodes';
import { getSet } from './content/sets';
import { CharModel } from './render/characters';
import { Stage } from './render/stage';
import { auto, Hud } from './ui/hud';
import { Menu } from './ui/menu';

const app = document.getElementById('app')!;
const stage = new Stage(app);
const hud = new Hud(app);
const menu = new Menu(app);
const runner = new Runner(stage, hud);
let settings: Settings = loadSettings();

function applySettings() {
  hud.textSpeed = settings.textSpeed;
  hud.timersOn = settings.timers;
  hud.qteAssist = settings.qteAssist;
  audio.setVolumes(settings.music, settings.sfx);
}
applySettings();

// ---------- main loop ----------
let last = performance.now();
let loopOn = true;
function frame(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (loopOn) stage.update(runner.paused ? 0 : dt);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// ---------- title backdrop ----------
function titleBackdrop() {
  const set = getSet('kettlebrook');
  stage.loadSet(set, {});
  stage.setSky('dusk');
  stage.fx('beam', new THREE.Vector3(48.5, 35, 12.5));
  const pivot = new THREE.Vector3(48, 16, 36);
  let t = 0.3;
  stage.onUpdate = (dt) => {
    t += dt * 0.04;
    stage.camPos.set(pivot.x + Math.sin(t) * 40, 34, pivot.z + Math.cos(t) * 40);
    stage.camLook.copy(pivot);
    stage.camT = 1;
  };
  hud.fadeInstant('in');
}

function lookPreviews(): string[] {
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.setSize(180, 240);
  r.outputColorSpace = THREE.SRGBColorSpace;
  const out: string[] = [];
  for (let i = 0; i < WREN_LOOKS.length; i++) {
    const sc = new THREE.Scene();
    sc.add(new THREE.HemisphereLight('#ffffff', '#6a5a4a', 2.2));
    const dl = new THREE.DirectionalLight('#ffffff', 1.4); dl.position.set(2, 3, 4); sc.add(dl);
    const m = new CharModel({ ...CHARS.wren, look: WREN_LOOKS[i] });
    m.setMood('happy');
    m.update(0.01);
    m.root.rotation.y = 0.35;
    sc.add(m.root);
    const cam = new THREE.PerspectiveCamera(30, 180 / 240, 0.1, 50);
    cam.position.set(0, 1.25, 4.6); cam.lookAt(0, 0.95, 0);
    r.render(sc, cam);
    out.push(r.domElement.toDataURL());
  }
  r.dispose();
  return out;
}

function saveInfo(s: GameState): string {
  const ep = EPISODES.find((e) => e.id === s.episode);
  if (!ep) return '';
  const sc = ep.scenes.find((x) => x.id === s.scene);
  return `Episode ${ep.number}: ${ep.title}${sc?.title ? ` · ${sc.title}` : ''}`;
}

function stateFor(epId: string, base: GameState | null): GameState {
  const s = base ? JSON.parse(JSON.stringify(base)) as GameState : newState();
  for (const [k, v] of Object.entries(EPISODE_DEFAULTS[epId] ?? {})) if (!(k in s.flags)) s.flags[k] = v;
  for (const it of ITEM_DEFAULTS[epId] ?? []) if (!s.items.includes(it)) s.items.push(it);
  s.seen = {};
  return s;
}

async function playFrom(epId: string, state: GameState, scene?: string) {
  let ep = EPISODES.find((e) => e.id === epId);
  while (ep) {
    menu.clear();
    stage.onUpdate = null;
    hud.root.classList.add('playing');
    // carry items into the episode
    const result = await runner.playEpisode(ep, state, scene);
    scene = undefined;
    hud.root.classList.remove('playing');
    hud.hideAll();
    if (result === 'quit') { hud.fadeInstant('in'); return; }
    const idx = EPISODES.indexOf(ep);
    const next = EPISODES[idx + 1] ?? null;
    titleBackdrop();
    audio.play(next ? 'wonder' : 'triumph');
    const choice = await menu.summary(ep, state, next);
    if (!next && choice === 'menu') { await menu.credits(); return; }
    if (choice !== 'next' || !next) return;
    // move on: keep the state, mark the save as the start of the next episode
    state = stateFor(next.id, state);
    state.episode = next.id;
    state.scene = next.start;
    writeSave(state);
    ep = next;
  }
}

async function titleLoop() {
  while (true) {
    titleBackdrop();
    audio.play('wonder');
    const save = loadSave();
    const hasSave = !!(save && save.episode && (save.scene || EPISODES.some((e) => e.id === save.episode)));
    const a = await menu.title(hasSave, save ? saveInfo(save) : '');
    if (a === 'settings') { settings = await menu.settings(settings); writeSettings(settings); applySettings(); continue; }
    if (a === 'continue' && save) {
      const ep = EPISODES.find((e) => e.id === save.episode);
      if (!ep) continue;
      const st = stateFor(ep.id, save);
      await playFrom(ep.id, st, save.scene || ep.start);
      continue;
    }
    if (a === 'new') {
      const look = await menu.pickLook(lookPreviews());
      clearSave();
      const s = newState();
      s.flags.look = look;
      await playFrom('ep1', stateFor('ep1', s));
      continue;
    }
    if (a === 'episodes') {
      const save2 = loadSave();
      const id = await menu.episodes(EPISODES, save2?.done ?? []);
      if (!id) continue;
      let base = save2;
      if (!base) { base = newState(); base.flags.look = 0; }
      // starting an episode from the menu uses the saved choices if this save got that far
      const st = stateFor(id, base);
      st.majors[id] = [];
      await playFrom(id, st);
      continue;
    }
  }
}

hud.onPause = async () => {
  if (runner.paused || !hud.root.classList.contains('playing')) return;
  runner.setPaused(true);
  while (true) {
    const a = await menu.pause();
    if (a === 'resume') break;
    if (a === 'settings') { settings = await menu.settings(settings); writeSettings(settings); applySettings(); continue; }
    if (a === 'quit') { menu.clear(); runner.quit(); return; }
  }
  menu.clear();
  runner.setPaused(false);
};

// ---------- automated playthrough (used by scripts/autoplay.mjs) ----------
const params = new URLSearchParams(location.search);
declare global { interface Window { __auto?: { done: boolean; error?: string; log: string[]; state?: GameState } } }

async function autoRun() {
  auto.on = true;
  const seed = Number(params.get('seed') ?? 1);
  auto.rng = mulberry32(seed);
  auto.failRate = Number(params.get('fail') ?? 0.15);
  window.__auto = { done: false, log: auto.log };
  const eps = (params.get('ep') ?? 'all') === 'all' ? EPISODES.map((e) => e.id) : params.get('ep')!.split(',');
  let st = newState();
  st.flags.look = seed % 3;
  try {
    for (const id of eps) {
      st = stateFor(id, st);
      const ep = EPISODES.find((e) => e.id === id);
      if (!ep) throw new Error(`no episode ${id}`);
      auto.log.push(`##### ${id}`);
      await runner.playEpisode(ep, st, params.get('scene') ?? undefined);
    }
    window.__auto.state = st;
  } catch (e) {
    window.__auto.error = (e as Error).stack ?? String(e);
    console.error(e);
  }
  window.__auto.done = true;
}

if (params.get('auto')) void autoRun();
else if (params.get('ep')) {
  // developer shortcut: ?ep=ep1&scene=fair
  const id = params.get('ep')!;
  const s = stateFor(id, loadSave() ?? newState());
  hud.fadeInstant('out');
  window.addEventListener('pointerdown', () => audio.unlock(), { once: true });
  window.addEventListener('keydown', () => audio.unlock(), { once: true });
  void playFrom(id, s, params.get('scene') ?? undefined).then(titleLoop);
} else void titleLoop();

void loopOn;
