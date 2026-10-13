import type { Episode } from '../../core/types';
import { ep1 } from './ep1';
import { ep2 } from './ep2';
import { ep3 } from './ep3';
import { ep4 } from './ep4';

/** Episodes in order. Stubs with no scenes are hidden. */
export const EPISODES: Episode[] = [ep1, ep2, ep3, ep4].filter((e) => e.scenes.length > 0);
