import type { Cond, FlagVal } from './types';

export interface MajorRecord {
  id: string;
  title: string;
  options: string[];
  chosen: number;
}

export interface GameState {
  flags: Record<string, FlagVal>;
  rel: Record<string, number>;
  items: string[];
  seen: Record<string, boolean>;
  /** Major choices by episode id */
  majors: Record<string, MajorRecord[]>;
  episode: string;
  scene: string;
  /** Episodes finished */
  done: string[];
}

export function newState(): GameState {
  return { flags: {}, rel: {}, items: [], seen: {}, majors: {}, episode: '', scene: '', done: [] };
}

export function cloneState(s: GameState): GameState {
  return JSON.parse(JSON.stringify(s));
}

/** Evaluate a condition shorthand. */
export function test(cond: Cond | undefined, s: GameState): boolean {
  if (cond === undefined) return true;
  if (typeof cond === 'function') return cond(s);
  const ors = cond.split('||');
  return ors.some((part) => part.split('&&').every((atom) => testAtom(atom.trim(), s)));
}

function lookup(name: string, s: GameState): FlagVal | undefined {
  if (name.startsWith('rel.')) return s.rel[name.slice(4)] ?? 0;
  if (name.startsWith('seen.')) return !!s.seen[name.slice(5)];
  if (name.startsWith('item.')) return s.items.includes(name.slice(5));
  return s.flags[name];
}

function parseVal(v: string): FlagVal {
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (v !== '' && !isNaN(Number(v))) return Number(v);
  return v;
}

function testAtom(atom: string, s: GameState): boolean {
  if (atom.startsWith('!')) return !testAtom(atom.slice(1), s);
  const m = atom.match(/^([\w.]+)\s*(>=|<=|!=|=|>|<)\s*(.+)$/);
  if (!m) {
    const v = lookup(atom, s);
    return !!v;
  }
  const [, name, op, raw] = m;
  const a = lookup(name, s);
  const b = parseVal(raw.trim());
  switch (op) {
    case '=': return a === b || String(a) === String(b);
    case '!=': return !(a === b || String(a) === String(b));
    case '>=': return Number(a ?? 0) >= Number(b);
    case '<=': return Number(a ?? 0) <= Number(b);
    case '>': return Number(a ?? 0) > Number(b);
    case '<': return Number(a ?? 0) < Number(b);
  }
  return false;
}

// ---------- persistence ----------

const SAVE_KEY = 'blockbound.save.v1';
const SETTINGS_KEY = 'blockbound.settings.v1';

export interface Settings {
  textSpeed: number; // chars per second, 0 = instant
  timers: boolean;
  music: number;
  sfx: number;
  qteAssist: boolean;
}

export const defaultSettings: Settings = { textSpeed: 55, timers: true, music: 0.5, sfx: 0.7, qteAssist: false };

function safeGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function safeSet(key: string, val: string) {
  try { localStorage.setItem(key, val); } catch { /* storage unavailable */ }
}

export function loadSave(): GameState | null {
  const raw = safeGet(SAVE_KEY);
  if (!raw) return null;
  try { return { ...newState(), ...JSON.parse(raw) }; } catch { return null; }
}
export function writeSave(s: GameState) { safeSet(SAVE_KEY, JSON.stringify(s)); }
export function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ } }

export function loadSettings(): Settings {
  const raw = safeGet(SETTINGS_KEY);
  if (!raw) return { ...defaultSettings };
  try { return { ...defaultSettings, ...JSON.parse(raw) }; } catch { return { ...defaultSettings }; }
}
export function writeSettings(s: Settings) { safeSet(SETTINGS_KEY, JSON.stringify(s)); }
