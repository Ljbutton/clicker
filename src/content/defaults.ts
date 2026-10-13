import type { FlagVal } from '../core/types';

/** Flags assumed when an episode is started from the menu without having
 *  played the earlier ones. */
export const EPISODE_DEFAULTS: Record<string, Record<string, FlagVal>> = {
  ep1: {},
  ep2: { told_stranger: false, lantern: 'star', saved: 'juno' },
  ep3: { told_stranger: false, lantern: 'star', saved: 'juno', atlas: 'taken', ysolde: 'came', answer: 'defiant' },
  ep4: { told_stranger: false, lantern: 'star', saved: 'juno', atlas: 'taken', ysolde: 'came', answer: 'defiant', plan: 'rails', mags: 'spared', forgiven: true },
};

export const ITEM_DEFAULTS: Record<string, string[]> = {
  ep1: [],
  ep2: ['keystone', 'map'],
  ep3: ['keystone', 'map'],
  ep4: ['keystone', 'map'],
};
