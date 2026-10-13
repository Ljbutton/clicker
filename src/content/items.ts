import { hasTile, tileCanvas } from '../render/blocks';

export interface ItemDef { name: string; tile: string; desc?: string }

export const ITEMS: Record<string, ItemDef> = {
  plank: { name: 'Plank', tile: 'planks' },
  log: { name: 'Log', tile: 'log_side' },
  stick: { name: 'Stick', tile: 'torch' },
  glass: { name: 'Glass', tile: 'glass' },
  wool: { name: 'Wool', tile: 'wool_white' },
  wool_red: { name: 'Red Wool', tile: 'wool_red' },
  iron: { name: 'Iron', tile: 'iron' },
  gold: { name: 'Gold', tile: 'gold' },
  copper: { name: 'Copper', tile: 'copper' },
  sparkwire: { name: 'Sparkwire', tile: 'sparkwire' },
  glowblock: { name: 'Glowblock', tile: 'glowblock' },
  shard: { name: 'Strange Shard', tile: 'keystone', desc: 'A teal crystal that hums when you hold it.' },
  keystone: { name: 'The Keystone', tile: 'keystone' },
  core: { name: 'Lantern Core', tile: 'lantern' },
  lantern: { name: 'Lantern', tile: 'lantern' },
  map: { name: 'Old Map', tile: 'map' },
  atlas: { name: 'The Atlas', tile: 'bookshelf' },
  helm: { name: 'Bubble Helm', tile: 'glass' },
  paper: { name: 'Paper', tile: 'paper' },
  letter: { name: 'Letter', tile: 'paper' },
  stone: { name: 'Stone', tile: 'stone' },
  cobble: { name: 'Cobblestone', tile: 'cobble' },
  coal: { name: 'Coal', tile: 'basalt' },
  ember: { name: 'Ember Anchor', tile: 'ember' },
  tide: { name: 'Tide Anchor', tile: 'tide' },
  root: { name: 'Root Anchor', tile: 'root' },
  gale: { name: 'Gale Anchor', tile: 'gale' },
  flower: { name: 'Flower', tile: 'flower_red' },
  bone: { name: 'Bone', tile: 'marble' },
  string: { name: 'String', tile: 'wool_white' },
  hook: { name: 'Grapple Hook', tile: 'iron' },
  pickaxe: { name: 'Pickaxe', tile: 'iron' },
  ticket: { name: 'Arena Token', tile: 'gold' },
  key: { name: 'Vault Key', tile: 'gold' },
  rail: { name: 'Rail', tile: 'rail' },
  lever: { name: 'Lever', tile: 'planks_dark' },
  book: { name: 'Book', tile: 'bookshelf' },
  stitcher: { name: 'Seam Stitcher', tile: 'keystone' },
  sand: { name: 'Sand', tile: 'sand' },
  leaves: { name: 'Leaves', tile: 'leaves' },
  mushroom: { name: 'Mushroom', tile: 'mushroom' },
  torch: { name: 'Torch', tile: 'torch' },
  crystal: { name: 'Crystal', tile: 'gale' },
  basalt: { name: 'Basalt', tile: 'basalt' },
};

export function itemDef(id: string): ItemDef {
  return ITEMS[id] ?? { name: id, tile: hasTile(id) ? id : 'paper' };
}

const iconCache = new Map<string, HTMLCanvasElement>();
export function itemIcon(id: string, size = 40): HTMLCanvasElement {
  const key = `${id}@${size}`;
  let c = iconCache.get(key);
  if (!c) { c = tileCanvas(itemDef(id).tile, size); iconCache.set(key, c); }
  return c;
}

/** Episodes can add their own items without editing this file. */
export function registerItems(defs: Record<string, ItemDef>) {
  Object.assign(ITEMS, defs);
}
