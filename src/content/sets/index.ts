import type { SetDef } from '../../render/stage';
import { beacon } from './beacon';
import { ep2Sets } from './ep2';
import { ep3Sets } from './ep3';
import { ep4Sets } from './ep4';
import { kettlebrook } from './kettlebrook';

const SETS: Record<string, SetDef> = { kettlebrook, beacon };
for (const s of [...ep2Sets, ...ep3Sets, ...ep4Sets]) SETS[s.id] = s;

export function getSet(id: string): SetDef {
  const s = SETS[id];
  if (!s) throw new Error(`Unknown set "${id}"`);
  return s;
}

export function allSets() { return SETS; }
