import type { CharDef, Look } from '../core/types';

/** The three looks the player can choose for Wren. */
export const WREN_LOOKS: Look[] = [
  { skin: '#e8b98f', hair: '#6b3a1e', hairStyle: 'short', shirt: '#3f7fbf', shirt2: '#2f5f8f', pants: '#4a3f35', shoes: '#2b2420', extras: ['belt', 'freckles'] },
  { skin: '#9a6440', hair: '#1e1612', hairStyle: 'braid', shirt: '#4f9a5a', shirt2: '#3a7444', pants: '#3b3f52', shoes: '#22202a', extras: ['belt'], accent: '#e8c23a' },
  { skin: '#f2d2b6', hair: '#d9a83a', hairStyle: 'spiky', shirt: '#c26a2a', shirt2: '#94501f', pants: '#35485e', shoes: '#2a2a30', extras: ['belt', 'blush'] },
];

export const CHARS: Record<string, CharDef> = {
  wren: { id: 'wren', name: 'Wren', kind: 'human', look: WREN_LOOKS[0], voice: 1.1 },
  pepper: { id: 'pepper', name: 'Pepper', kind: 'dog', look: { skin: '#fff', hair: '#fff', hairStyle: 'none', shirt: '#a8713f', shirt2: '#f2ece0', pants: '#a8713f', shoes: '#a8713f', extras: ['bandana'], accent: '#c0392b' }, voice: 1.6 },
  ostin: { id: 'ostin', name: 'Ostin', kind: 'human', look: { skin: '#c98b5e', hair: '#2b1d14', hairStyle: 'curly', shirt: '#d9c27a', shirt2: '#8a6a44', pants: '#5a4a3a', shoes: '#3a2a1a', extras: ['goggles', 'apron', 'glasses'], accent: '#7a5a3a' }, voice: 1.35 },
  juno: { id: 'juno', name: 'Juno', kind: 'human', look: { skin: '#f0c8a8', hair: '#2a2a3a', hairStyle: 'long', shirt: '#4a4a5a', shirt2: '#353542', pants: '#2f3a4a', shoes: '#1e1e26', extras: ['scarf', 'belt'], accent: '#c0392b', eyes: '#3a5a3a' }, voice: 1.15 },
  bram: { id: 'bram', name: 'Bram', kind: 'human', look: { skin: '#b07a52', hair: '#7a3a1a', hairStyle: 'short', shirt: '#6a8a3a', shirt2: '#4f6a2a', pants: '#5a4030', shoes: '#33241a', extras: ['beard', 'belt'] }, voice: 0.75, scale: 1.14 },
  tibbet: { id: 'tibbet', name: 'Mayor Tibbet', kind: 'human', look: { skin: '#f2c8a8', hair: '#9a9a9a', hairStyle: 'tophat', shirt: '#6a2a4a', shirt2: '#c9a03a', pants: '#2a2a3a', shoes: '#1a1a1a', extras: ['beard'], accent: '#c9a03a' }, voice: 0.9 },
  nana: { id: 'nana', name: 'Nana Oakhart', kind: 'human', look: { skin: '#c08a62', hair: '#e8e8e8', hairStyle: 'bun', shirt: '#7a4a8a', shirt2: '#5a3a6a', pants: '#5a3a6a', shoes: '#2a1a2a', extras: ['glasses', 'robe'], accent: '#c9a03a' }, voice: 1.25, scale: 0.86 },
  stranger: { id: 'stranger', name: 'Grey Traveler', kind: 'human', look: { skin: '#d8b8a0', hair: '#6a6a72', hairStyle: 'hood', shirt: '#6a6a72', shirt2: '#55555c', pants: '#45454c', shoes: '#2a2a30', extras: ['cape'], accent: '#5a5a62' }, voice: 0.95 },
  seren: { id: 'seren', name: 'The Cartographer', kind: 'human', look: { skin: '#d8b8a0', hair: '#5a5a66', hairStyle: 'hood', shirt: '#4a4a56', shirt2: '#a26cff', pants: '#35353f', shoes: '#1e1e26', extras: ['mask', 'cape', 'belt'], accent: '#3a3a46' }, voice: 0.95 },
  seren_unmasked: { id: 'seren_unmasked', name: 'Seren', kind: 'human', look: { skin: '#e8c0a0', hair: '#2a2a3a', hairStyle: 'long', shirt: '#4a4a56', shirt2: '#a26cff', pants: '#35353f', shoes: '#1e1e26', extras: ['cape', 'belt'], accent: '#3a3a46', eyes: '#3a5a3a' }, voice: 1.0 },
  ysolde: { id: 'ysolde', name: 'Keeper Ysolde', kind: 'human', look: { skin: '#e0c0a8', hair: '#d8dce8', hairStyle: 'long', shirt: '#2f6a7a', shirt2: '#c9a03a', pants: '#24505c', shoes: '#1a2a30', extras: ['robe', 'glasses'], accent: '#c9a03a', eyes: '#2a6a7a' }, voice: 1.05 },
  mags: { id: 'mags', name: 'Mags Gristle', kind: 'human', look: { skin: '#a8724c', hair: '#c94a2a', hairStyle: 'bun', shirt: '#7a7f86', shirt2: '#4a4d51', pants: '#3a3a3e', shoes: '#1a1a1a', extras: ['goggles', 'belt', 'eyepatch'], accent: '#c94a2a' }, voice: 0.85, scale: 1.05 },
  villager: { id: 'villager', name: 'Villager', kind: 'villager', look: { skin: '#e8b98f', hair: '#5a3a1e', hairStyle: 'cap', shirt: '#b8a36a', pants: '#5a4a3a', shoes: '#2a2018', extras: ['apron'], accent: '#8a6a44' }, voice: 1 },
  villager2: { id: 'villager2', name: 'Villager', kind: 'villager', look: { skin: '#9a6440', hair: '#1e1612', hairStyle: 'bun', shirt: '#8a4a6a', pants: '#3a3a4a', shoes: '#22202a' }, voice: 1.2 },
  villager3: { id: 'villager3', name: 'Villager', kind: 'villager', look: { skin: '#f2d2b6', hair: '#c9a03a', hairStyle: 'short', shirt: '#4a7a8a', pants: '#4a3f35', shoes: '#2b2420', extras: ['freckles'] }, voice: 1.05 },
  miner: { id: 'miner', name: 'Miner', kind: 'villager', look: { skin: '#c98b5e', hair: '#e8c23a', hairStyle: 'cap', shirt: '#6a5a4a', pants: '#3a3a3e', shoes: '#1a1a1a', extras: ['belt'], accent: '#c9a03a' }, voice: 0.9 },
  miner2: { id: 'miner2', name: 'Miner', kind: 'villager', look: { skin: '#e8b98f', hair: '#3a2a1a', hairStyle: 'cap', shirt: '#4a5a6a', pants: '#3a3a3e', shoes: '#1a1a1a', extras: ['beard', 'belt'], accent: '#e8c23a' }, voice: 0.8 },
  gloam: { id: 'gloam', name: 'Gloamling', kind: 'gloam', look: { skin: '#000', hair: '#000', hairStyle: 'none', shirt: '#000', pants: '#000', shoes: '#000' }, voice: 0.5 },
  unmaker: { id: 'unmaker', name: 'The Unmaker', kind: 'giant', look: { skin: '#000', hair: '#000', hairStyle: 'none', shirt: '#000', pants: '#000', shoes: '#000' }, voice: 0.4, scale: 1.6 },
};

/** Name tag colors in the dialogue box. */
export const NAME_COLORS: Record<string, string> = {
  wren: '#7fc8ff', pepper: '#e8a66a', ostin: '#f2d07a', juno: '#ff7a6a', bram: '#9ad86a', tibbet: '#d89ad8', nana: '#c8a0f0',
  stranger: '#b8b8c8', seren: '#c79bff', seren_unmasked: '#c79bff', ysolde: '#6ad8d0', mags: '#ff9a5a', villager: '#d8d0b8', villager2: '#d8d0b8', villager3: '#d8d0b8',
  miner: '#d8d0b8', miner2: '#d8d0b8', gloam: '#a26cff', unmaker: '#d7b4ff',
};

/** Episodes can add their own characters without editing this file. */
export function registerChars(defs: Record<string, CharDef>, colors: Record<string, string> = {}) {
  Object.assign(CHARS, defs);
  Object.assign(NAME_COLORS, colors);
}
