// Static checks for episode scripts: scene links, labels, actors, sets, cams, items.
declare const process: { exit(code: number): never };
// Run: npx vite-node scripts/validate.ts
import { CHARS } from '../src/content/cast';
import { EPISODES } from '../src/content/episodes';
import { ITEMS } from '../src/content/items';
import { allSets } from '../src/content/sets';
import type { Option, Scene, ShotSpec, Step } from '../src/core/types';

const errors: string[] = [];
const warnings: string[] = [];
const sets = allSets();
const ALIASES = new Set(['partner', 'captive']);
const MUSIC = new Set(['village', 'wonder', 'mystery', 'tension', 'action', 'sad', 'triumph', 'night', 'cave', 'void', 'none']);
const SFX = new Set(['blip', 'select', 'hover', 'remember', 'tick', 'qte', 'ok', 'fail', 'hit', 'swing', 'whoosh', 'break', 'place', 'step', 'craft', 'item', 'bark', 'rumble', 'fray', 'gloam', 'chime', 'splash', 'door', 'beacon', 'powerdown', 'thud', 'cheer', 'drip', 'mash', 'heart']);
const PROPS = new Set(['pickaxe', 'hammer', 'sword', 'staff', 'lantern', 'keystone', 'ember', 'map', 'atlas', 'book', 'torch', 'wrench', 'core', 'helm', 'bone', 'flower', 'letter']);

function actorOk(id: string, where: string, spawned: Set<string>) {
  if (ALIASES.has(id)) return;
  const kind = id.split('#')[0];
  if (!CHARS[kind]) errors.push(`${where}: unknown actor "${id}"`);
  else if (id.includes('#') && !spawned.has(id)) warnings.push(`${where}: "${id}" used before spawn/cast`);
}

function shotOk(sh: ShotSpec, sc: Scene, where: string, spawned: Set<string>) {
  if (typeof sh === 'string') { if (!sets[sc.set]?.cams[sh]) errors.push(`${where}: set "${sc.set}" has no cam "${sh}"`); return; }
  if ('close' in sh) actorOk(sh.close, where, spawned);
  if ('two' in sh) sh.two.forEach((a) => actorOk(a, where, spawned));
  if ('ots' in sh) sh.ots.forEach((a) => actorOk(a, where, spawned));
  if ('orbit' in sh) actorOk(sh.orbit, where, spawned);
}

function walk(steps: Step[] | undefined, sc: Scene, ep: string, labels: Set<string>, sceneIds: Set<string>, spawned: Set<string>, path: string) {
  if (!steps) return;
  steps.forEach((s, i) => {
    const where = `${ep}/${sc.id}${path}[${i}]`;
    if (typeof s !== 'object' || !s) { errors.push(`${where}: bad step`); return; }
    if ('say' in s) { actorOk(s.say, where, spawned); if (s.to) actorOk(s.to, where, spawned); if (s.shot) shotOk(s.shot, sc, where, spawned); if (!s.text) errors.push(`${where}: empty line`); }
    if ('goto' in s && !labels.has(s.goto)) errors.push(`${where}: goto unknown label "${s.goto}"`);
    if ('scene' in s && typeof s.scene === 'string' && !sceneIds.has(s.scene)) errors.push(`${where}: unknown scene "${s.scene}"`);
    if ('shot' in s && !('say' in s) && !('choice' in s)) shotOk(s.shot as ShotSpec, sc, where, spawned);
    for (const k of ['move', 'place', 'anim', 'hide', 'hold', 'carry'] as const) if (k in s && !('say' in s)) actorOk((s as Record<string, string>)[k], where, spawned);
    if ('face' in s && 'to' in s) { actorOk(s.face, where, spawned); if (typeof s.to === 'string' && s.to !== 'camera') actorOk(s.to, where, spawned); }
    if ('mood' in s && 'is' in s) actorOk(s.mood, where, spawned);
    if ('show' in s) { actorOk(s.show, where, new Set([...spawned, s.show])); spawned.add(s.show); }
    if ('spawn' in s) { if (!CHARS[s.kind]) errors.push(`${where}: unknown kind ${s.kind}`); spawned.add(s.spawn); }
    if ('give' in s && !ITEMS[s.give]) errors.push(`${where}: unknown item "${s.give}"`);
    if ('take' in s && !ITEMS[s.take]) errors.push(`${where}: unknown item "${s.take}"`);
    if ('music' in s && !MUSIC.has(s.music)) errors.push(`${where}: unknown music "${s.music}"`);
    if ('sfx' in s && !SFX.has(s.sfx)) errors.push(`${where}: unknown sfx "${s.sfx}"`);
    if (('hold' in s || 'carry' in s) && 'item' in s && s.item && !PROPS.has(s.item)) errors.push(`${where}: unknown prop "${s.item}"`);
    if ('fx' in s && typeof s.at === 'string') actorOk(s.at, where, spawned);
    if ('qte' in s) { if (s.qte.on) actorOk(s.qte.on, where, spawned); walk(s.qte.ok, sc, ep, labels, sceneIds, spawned, path + `[${i}].ok`); walk(s.qte.fail, sc, ep, labels, sceneIds, spawned, path + `[${i}].fail`); }
    if ('craft' in s) {
      const c = s.craft;
      if (c.recipe.length !== 3 || c.recipe.some((r) => r.length !== 3)) errors.push(`${where}: recipe must be 3x3`);
      for (const ch of c.recipe.join('')) if (ch !== '.' && !c.key[ch]) errors.push(`${where}: recipe char "${ch}" not in key`);
      for (const it of [...Object.values(c.key), ...(c.extras ?? []), c.result]) if (!ITEMS[it]) errors.push(`${where}: unknown item "${it}"`);
    }
    if ('choice' in s) {
      if (s.shot) shotOk(s.shot, sc, where, spawned);
      const vis = s.choice.filter((o: Option) => !o.timeout);
      if (vis.length < 1 || vis.length > 4) errors.push(`${where}: choices must have 1-4 visible options`);
      s.choice.forEach((o: Option, k: number) => walk(o.steps, sc, ep, labels, sceneIds, spawned, path + `[${i}].choice[${k}]`));
    }
    if ('if' in s) { walk(s.then, sc, ep, labels, sceneIds, spawned, path + `[${i}].then`); walk(s.else, sc, ep, labels, sceneIds, spawned, path + `[${i}].else`); }
    if ('action' in s) walk(s.action, sc, ep, labels, sceneIds, spawned, path + `[${i}].action`);
    if ('parallel' in s) walk(s.parallel, sc, ep, labels, sceneIds, spawned, path + `[${i}].parallel`);
    if ('explore' in s) {
      const ids = new Set<string>();
      for (const h of s.explore.hotspots) {
        if (ids.has(h.id)) errors.push(`${where}: duplicate hotspot id ${h.id}`);
        ids.add(h.id);
        if (!h.at && !h.actor) errors.push(`${where}: hotspot ${h.id} needs at or actor`);
        if (h.actor) actorOk(h.actor, where, spawned);
        walk(h.steps, sc, ep, labels, sceneIds, spawned, path + `[${i}].hotspot:${h.id}`);
      }
      if (!s.explore.until && !s.explore.hotspots.some((h) => h.required || h.ends)) errors.push(`${where}: explore has no way to finish (needs until, required or ends)`);
    }
  });
}

for (const ep of EPISODES) {
  const sceneIds = new Set(ep.scenes.map((s) => s.id));
  if (!sceneIds.has(ep.start)) errors.push(`${ep.id}: start scene "${ep.start}" missing`);
  const reached = new Set<string>([ep.start]);
  for (const sc of ep.scenes) {
    if (!sets[sc.set]) { errors.push(`${ep.id}/${sc.id}: unknown set "${sc.set}"`); continue; }
    if (sc.music && !MUSIC.has(sc.music)) errors.push(`${ep.id}/${sc.id}: unknown music "${sc.music}"`);
    const labels = new Set(sc.steps.filter((s): s is { label: string } => 'label' in s).map((s) => s.label));
    const spawned = new Set(Object.keys(sc.cast));
    for (const id of Object.keys(sc.cast)) actorOk(id, `${ep.id}/${sc.id}/cast`, spawned);
    walk(sc.steps, sc, ep.id, labels, sceneIds, spawned, '');
    JSON.stringify(sc.steps, (k, v) => { if (k === 'scene' && typeof v === 'string') reached.add(v); return v; });
  }
  for (const id of sceneIds) if (!reached.has(id)) warnings.push(`${ep.id}: scene "${id}" is never reached`);
  const hasEnd = JSON.stringify(ep.scenes).includes('"end":true');
  if (!hasEnd) errors.push(`${ep.id}: no { end: true } step`);
}

for (const w of warnings) console.log('warn:', w);
for (const e of errors) console.log('ERROR:', e);
console.log(`${EPISODES.length} episodes, ${errors.length} errors, ${warnings.length} warnings`);
process.exit(errors.length ? 1 : 0);
