// Episode 2: The Sunken Archive
import type { Episode, Option, Step } from '../../core/types';
import { registerItems } from '../items';
import { AR, archiveCrack, archiveFall, archiveFlood } from '../sets/ep2';

registerItems({
  peg: { name: "Bram's Peg", tile: 'planks', desc: 'A hand-carved oak peg. Bram puts them in everything.' },
  scarf_scrap: { name: 'Scrap of Red Scarf', tile: 'wool_red', desc: "Torn from Juno's scarf. On purpose." },
  tome_tide: { name: "'Salt and Current'", tile: 'bookshelf', desc: 'A history of tides. Damp.' },
  tome_ember: { name: "'Kindling Theory, Vol. 2'", tile: 'bookshelf', desc: 'The cover is oddly warm.' },
  tome_root: { name: "'Of Seeds and Patience'", tile: 'bookshelf', desc: 'Lightly chewed.' },
});

/** Branch on which friend Wren saved on the bridge. */
const J = (juno: Step[], bram: Step[]): Step => ({ if: 'saved=juno', then: juno, else: bram });
/** Give the partner their weapon. */
const ARM: Step = J([{ hold: 'partner', item: 'pickaxe' }], [{ hold: 'partner', item: 'hammer' }]);

// ---------- the shelf puzzle in the Archive ----------

type Book = 'tide' | 'ember' | 'root';
const TITLES: Record<Book, string> = { tide: "'Salt and Current'", ember: "'Kindling Theory'", root: "'Of Seeds and Patience'" };
const RIGHT: Record<Book, string> = {
  tide: 'Salt and Current, home with the Tide. Good.',
  ember: 'Kindling Theory, back beside the Ember. Warm, isn\'t it?',
  root: 'Seeds and Patience, on the Root shelf. Patience is rewarded. Eventually.',
};
const WRONG: Record<Book, string> = {
  tide: 'Salt water on that shelf? The other books will complain for a month.',
  ember: 'Kindling, there? You want the whole Archive to catch fire?',
  root: 'Seeds want soil, child. Not that shelf.',
};
const SHELF_COLOR: Record<string, string> = { tide: '#4fc8ff', ember: '#ff8a3a', root: '#7ad85a', gale: '#e8f4ff' };

function shelf(kind: 'tide' | 'ember' | 'root' | 'gale', at: [number, number]): Step[] {
  const pos: [number, number, number] = [at[0] + 0.5, 15.5, at[1] + 0.5];
  const opt = (b: Book): Option => ({
    text: `Shelve ${TITLES[b]}.`,
    when: `item.tome_${b}`,
    steps: b === kind
      ? [
        { anim: 'wren', name: 'build' },
        { take: `tome_${b}` },
        { set: { [`shelf_${b}`]: true } },
        { fx: 'glow', at: pos, radius: 1, color: SHELF_COLOR[b] },
        { sfx: 'chime' },
        { say: 'ysolde', text: RIGHT[b], mood: 'smug' },
      ]
      : [
        { set: { shelf_wrong: true } },
        { sfx: 'fail' },
        { say: 'ysolde', text: kind === 'gale' ? "Nothing goes on the Gale shelf now. Nothing's moved there since its light went quiet." : WRONG[b], mood: 'neutral' },
      ],
  });
  return [
    { choice: [opt('tide'), opt('ember'), opt('root'), { text: 'Not this shelf.', steps: [] }], prompt: `The shelf under the ${kind === 'gale' ? 'pale' : kind === 'tide' ? 'blue' : kind === 'ember' ? 'orange' : 'green'} crystal` },
  ];
}
const HOLDING = 'item.tome_tide || item.tome_ember || item.tome_root';

export const ep2: Episode = {
  id: 'ep2',
  number: 2,
  title: 'The Sunken Archive',
  blurb: 'Through the glowing Glimmerwood and down to the bottom of Glasswater Lake, to find the Keeper who knows what the Beacon really needs.',
  start: 'wood',
  scenes: [
    // ------------------------------------------------------------------
    {
      id: 'wood',
      title: 'The Glimmerwood',
      set: 'glimmerwood',
      sky: 'night',
      music: 'night',
      cast: {
        wren: { at: [48.5, 84.5], face: 180 },
        ostin: { at: [47.0, 86.2], face: 180 },
        partner: { at: [50.1, 86.0], face: 180 },
        pepper: { at: [49.3, 82.8], face: 180 },
      },
      steps: [
        { fx: 'seams' },
        { hold: 'wren', item: 'pickaxe' },
        ARM,
        { shot: 'wide' },
        {
          if: 'leave=dawn',
          then: [{ narrate: 'They set out at first light. By nightfall, Kettlebrook was a long day behind them.' }],
          else: [{ narrate: 'They left that same night, and kept walking until the road ran out.' }],
        },
        { narrate: 'The Glimmerwood. Where the trees glow, and nobody lives on purpose.' },
        { shot: 'trail', dur: 2.5 },
        { wait: 2.5 },
        { say: 'ostin', text: 'Okay. Fun fact. The trees are glowing.', mood: 'worried' },
        { say: 'ostin', text: "Less fun fact. I don't know WHY the trees are glowing.", mood: 'worried' },
        J([
          { say: 'juno', text: "It's glowmoss. Grows on the bark. Harmless.", mood: 'neutral' },
          { say: 'juno', text: "Mostly harmless. Don't lick it.", mood: 'smug' },
          { say: 'ostin', text: 'Why would I lick it?', mood: 'worried' },
          { say: 'juno', text: "You licked a battery once. I was there.", mood: 'smug' },
        ], [
          { say: 'bram', text: "Nana says glowmoss means the ground is happy.", mood: 'happy' },
          { say: 'bram', text: "...I don't know if that's true. It's a nice thing to think, though.", mood: 'neutral' },
        ]),
        { say: 'wren', text: "Tibbet's map says Glasswater Lake is north. Straight through the trees.", mood: 'determined' },
        {
          choice: [
            { text: 'We keep moving. No stopping.', rel: { partner: 1 }, steps: [
              J([{ say: 'juno', text: 'Finally. Someone with legs and sense.', mood: 'smug' }], [{ say: 'bram', text: 'Right behind you. Like, very close behind you.', mood: 'determined' }]),
            ] },
            { text: 'Stay close. Everyone.', rel: { ostin: 1 }, steps: [
              { say: 'ostin', text: "Closest. I'm the closest. Look at me, being close.", mood: 'worried' },
            ] },
            { text: 'Ostin, is it really that bad?', steps: [
              { say: 'ostin', text: "The trees glow and the sky is cracked. I'd say seven out of ten on the bad scale.", mood: 'worried' },
              { say: 'ostin', text: 'Eight if something growls.', mood: 'worried' },
            ] },
          ],
          timer: 9,
        },
        { place: 'ostin', at: [45.2, 75.4], face: 0 },
        { place: 'partner', at: [50.9, 60.6], face: 180 },
        {
          explore: {
            objective: 'Find the way through the Glimmerwood',
            hotspots: [
              {
                id: 'e2_marker', at: [41.5, 10.5, 72.5], label: 'Old waymarker', verb: 'Look', required: true,
                steps: [
                  { place: 'ostin', at: [43.6, 74.4], face: -60 },
                  { shot: 'marker', dur: 1 },
                  { think: 'A waymarker. Older than Kettlebrook, maybe. Somebody carved it to last.' },
                  { say: 'ostin', text: "There's writing! Builder's runes, like the ones at the Beacon.", anim: 'point', mood: 'surprised' },
                  { say: 'ostin', text: "'North to the glass water. Keep the light behind you.'", mood: 'neutral' },
                  { say: 'ostin', text: "Keep the light behind you. That's the Beacon. We're on the right road!", mood: 'happy' },
                  { fx: 'glow', at: [41.5, 11, 72.5], radius: 0.6, color: '#7ff2e4' },
                  { sfx: 'heart' },
                  { think: "The Keystone's warm. Like it's been this way before." },
                  { say: 'ostin', text: "Except the light behind us isn't on anymore. So, technically, we're keeping the dark behind us.", mood: 'worried' },
                  { say: 'ostin', text: "I'm going to stop reading things.", mood: 'sad' },
                ],
              },
              {
                id: 'e2_token', at: [53.5, 9.8, 57.5], label: 'Thornbush', verb: 'Look', required: true,
                steps: [
                  { place: 'pepper', at: [53.4, 58.6], face: 90 },
                  { place: 'partner', at: [51.4, 59.2], face: 60 },
                  { anim: 'pepper', name: 'bark' },
                  { say: 'pepper', text: 'Wuff! Wuff wuff!', anim: 'bark' },
                  { anim: 'pepper', name: 'dig' },
                  { shot: { close: 'pepper', dist: 2.4, side: 0.5 } },
                  J([
                    { think: 'A wooden peg. Hand-carved, snagged in the thorns.' },
                    { give: 'peg' },
                    { say: 'juno', text: "That's Bram's. He pegs everything. Tables. Fences. Probably his socks.", mood: 'neutral' },
                    { say: 'juno', text: "There's another one on that root. And another, further on.", mood: 'surprised', anim: 'point' },
                    { say: 'juno', text: 'That big idiot is leaving us a trail.', mood: 'happy' },
                    { say: 'juno', text: "...Don't look at me like that. I've got glowmoss in my eye.", mood: 'hurt' },
                  ], [
                    { think: 'A strip of red wool, caught on a thorn. Torn clean.' },
                    { give: 'scarf_scrap' },
                    { say: 'bram', text: "That's Juno's scarf. She never lets anybody touch that scarf.", mood: 'surprised' },
                    { say: 'bram', text: "She tore it on purpose. Look, another bit on that branch! She's leaving a trail!", mood: 'happy', anim: 'point' },
                    { say: 'bram', text: "She's okay. She's okay enough to be clever. That's Juno all over.", mood: 'happy' },
                  ]),
                  { shot: 'tracks', dur: 1.5 },
                  { wait: 1.5 },
                  { say: 'wren', text: 'The trail heads east. Away from the lake.', mood: 'worried' },
                  { say: 'partner', text: 'Then we go east. Right now.', mood: 'determined' },
                  {
                    choice: [
                      { text: 'We follow the trail.', rel: { partner: 1 }, set: { trail: 'follow' }, remember: '{partner} will remember that.', steps: [
                        { say: 'ostin', text: 'Into the dark. With the monsters. Off the map. Great. Love that.', mood: 'worried' },
                        { say: 'ostin', text: "Wait. Look where it goes. Straight into that grey patch.", mood: 'surprised', anim: 'point' },
                        { say: 'partner', text: "...The Fray. You can't track anything through that.", mood: 'hurt' },
                      ] },
                      { text: 'The Keeper first. Then we know where they took {captive}.', rel: { ostin: 1 }, set: { trail: 'map' }, steps: [
                        J([
                          { say: 'juno', text: "Fine. But if this Keeper's a dud, I'm going east alone.", mood: 'angry' },
                        ], [
                          { say: 'bram', text: "...Okay. You're right. I hate it, but you're right.", mood: 'sad' },
                        ]),
                      ] },
                      { text: "Both. I'll mark it on the map, and we come back.", set: { trail: 'marked' }, steps: [
                        { anim: 'wren', name: 'build' },
                        { say: 'ostin', text: "Marked. Smart. We'll come back for it with answers.", mood: 'happy' },
                        { say: 'partner', text: '...Yeah. Okay. Marked.', mood: 'neutral' },
                      ] },
                    ],
                    timer: 10,
                    prompt: '{captive} left a trail',
                  },
                ],
              },
              {
                id: 'e2_scar', at: [60.5, 9.8, 66.5], label: 'Grey ground', verb: 'Look', required: true,
                steps: [
                  { place: 'partner', at: [57.4, 65.2], face: 70 },
                  { place: 'ostin', at: [56.8, 67.6], face: 80 },
                  { shot: 'scar', dur: 1.2 },
                  { fx: 'motes', at: [62.5, 9.5, 66.5], radius: 3 },
                  { sfx: 'fray' },
                  { think: 'Grey ground. Dead trees. Little motes of light drifting up, like the ground is evaporating.' },
                  J([
                    { say: 'juno', text: "The Fray. This is how it starts. A patch here. A patch there.", mood: 'hurt' },
                    { say: 'juno', text: 'Then one morning your whole street is a hole in the sky.', mood: 'hurt' },
                    {
                      choice: [
                        { text: 'Is that what happened to Lowmere?', when: 'knows_lowmere', steps: [
                          { say: 'juno', text: "...Yeah. It had a bakery. Best bread in the world. That's all you get.", mood: 'sad' },
                        ] },
                        { text: 'Juno. Where did you grow up?', when: '!knows_lowmere', steps: [
                          { say: 'juno', text: 'Somewhere that looked like this, eventually. Drop it.', mood: 'angry' },
                        ] },
                        { text: "We won't let it happen to Kettlebrook.", rel: { juno: 1 }, steps: [
                          { say: 'juno', text: "Big promise. ...I'll hold you to it.", mood: 'neutral' },
                        ] },
                      ],
                      timer: 8,
                    },
                  ], [
                    { say: 'bram', text: "It's like the east fields back home. Just... gone grey.", mood: 'sad' },
                    { say: 'bram', text: "Nana's porch is twenty steps from the edge now. I counted. Twice.", mood: 'sad' },
                  ]),
                  { say: 'ostin', text: 'There are tracks. Square ones. A lot of square ones.', mood: 'worried', anim: 'point' },
                  { say: 'ostin', text: "Gloamlings. Recently. Like, very recently. Like now-ish.", mood: 'surprised' },
                ],
              },
              {
                id: 'e2_ring', at: [36.5, 9.6, 61.5], label: 'Ring of glowcaps', verb: 'Look',
                steps: [
                  { place: 'ostin', at: [39.6, 62.4], face: -90 },
                  { think: 'A ring of glowing mushrooms. Perfectly round. Too round.' },
                  { say: 'ostin', text: "Don't step in the ring. My gran said rings like that are where the forest keeps its secrets." },
                  {
                    choice: [
                      { text: 'Step in the ring.', steps: [
                        { anim: 'wren', name: 'jump' },
                        { fx: 'glow', at: [36.5, 9.5, 61.5], radius: 1.5, color: '#7ff2e4' },
                        { sfx: 'chime' },
                        { say: 'ostin', text: 'WREN.', mood: 'surprised' },
                        { say: 'ostin', text: '...Nothing happened. Okay. Good. My heart is fine. My heart is a drum.', mood: 'worried' },
                      ] },
                      { text: 'Leave it be.', rel: { ostin: 1 }, steps: [
                        { say: 'ostin', text: 'Thank you. Respect the mushrooms.', mood: 'happy' },
                      ] },
                    ],
                  },
                ],
              },
              {
                id: 'e2_back', at: [49.5, 10, 90.5], label: 'Look back toward home', verb: 'Look',
                steps: [
                  { shot: { pos: [49.5, 12, 84], look: [52, 18, 120] }, dur: 1.5 },
                  { wait: 1.5 },
                  { think: 'Somewhere back there is Kettlebrook. No Beacon light on the hill. Just the cracks in the sky.' },
                  { think: "Nana's probably on her porch right now. Waiting." },
                ],
              },
              {
                id: 'e2_ostin', actor: 'ostin', label: 'Ostin', verb: 'Talk',
                steps: [
                  { say: 'ostin', text: "Did you know glowing trees glow brighter when it's cold? I read that. Or I made it up. I'm tired.", mood: 'neutral' },
                  {
                    choice: [
                      { text: 'How are you holding up?', rel: { ostin: 1 }, steps: [
                        { say: 'ostin', text: 'Fine! Great! My boots are full of moss and I can hear my own heartbeat.', mood: 'worried' },
                      ] },
                      { text: 'Keep the facts coming.', steps: [
                        { say: 'ostin', text: "Fact: owls can't move their eyes. Fact: I'm not an owl. Fact: I'd like to be one right now.", mood: 'happy' },
                      ] },
                    ],
                  },
                ],
              },
              {
                id: 'e2_partner', actor: 'partner', label: '{partner}', verb: 'Talk',
                steps: [
                  J([
                    { say: 'juno', text: "Eyes on the trees, not on me. I'm fine.", mood: 'neutral' },
                    { say: 'juno', text: "I keep hearing Bram humming. He always hums when he walks. Badly.", mood: 'sad' },
                    { say: 'juno', text: "Turns out quiet is worse.", mood: 'hurt' },
                  ], [
                    { say: 'bram', text: "I keep turning round to say something to Juno. Then she isn't there.", mood: 'sad' },
                    { say: 'bram', text: "She'd be saying something mean about my walking. I'd give anything for something mean.", mood: 'sad' },
                  ]),
                ],
              },
            ],
          },
        },
        // the scouts
        { sfx: 'gloam' },
        { fx: 'shake', radius: 1 },
        { say: 'partner', text: 'Wren! Behind you!', mood: 'surprised' },
        { place: 'wren', at: [47.5, 64.5], face: 90 },
        { place: 'partner', at: [46.2, 66.2], face: 90 },
        { place: 'ostin', at: [45.4, 63.0], face: 90 },
        { place: 'pepper', at: [48.6, 63.0], face: 90 },
        { spawn: 'gloam#1', kind: 'gloam', at: [53.5, 63.5], face: 'wren' },
        { spawn: 'gloam#2', kind: 'gloam', at: [52.5, 66.6], face: 'partner' },
        { spawn: 'gloam#3', kind: 'gloam', at: [51.5, 60.8], face: 'pepper' },
        { shot: 'fight' },
        { music: 'action' },
        { say: 'ostin', text: "Gloamlings! Three! Three is too many! One is too many!", mood: 'surprised', anim: 'scared' },
        {
          action: [
            { place: 'wren', at: [47.5, 64.5], face: 90 },
            { place: 'partner', at: [46.2, 66.2], face: 90 },
            { place: 'ostin', at: [45.4, 63.0], face: 90 },
            { place: 'pepper', at: [48.6, 63.0], face: 90 },
            { place: 'gloam#1', at: [53.5, 63.5], face: 'wren' },
            { place: 'gloam#2', at: [52.5, 66.6], face: 'partner' },
            { place: 'gloam#3', at: [51.5, 60.8], face: 'pepper' },
            { hold: 'wren', item: 'pickaxe' },
            ARM,
            { shot: { ots: ['wren', 'gloam#1'] } },
            { move: 'gloam#1', to: [48.7, 64.3], speed: 6 },
            { qte: { kind: 'dir', key: 'right', text: 'Dodge!', on: 'wren', time: 1.3, ok: [{ anim: 'wren', name: 'dodge' }, { place: 'wren', at: [47.3, 65.4] }] } },
            { face: 'wren', to: 'gloam#1' },
            { shot: { two: ['wren', 'gloam#1'] } },
            { qte: { kind: 'press', key: 'action', text: 'Strike!', on: 'gloam#1', time: 1.3, ok: [
              { anim: 'wren', name: 'swing' }, { sfx: 'hit' }, { fx: 'poof', at: 'gloam#1' }, { hide: 'gloam#1' },
            ] } },
            { shot: { two: ['partner', 'gloam#2'] } },
            { move: 'gloam#2', to: [47.5, 66.4], speed: 5, wait: true },
            J([
              { say: 'juno', text: 'Nettle. Say hello.', mood: 'determined' },
            ], [
              { say: 'bram', text: 'Sorry! Sorry. Not sorry!', mood: 'determined' },
            ]),
            { anim: 'partner', name: 'swing' }, { sfx: 'hit' }, { fx: 'poof', at: 'gloam#2' }, { hide: 'gloam#2' },
            { move: 'gloam#3', to: [49.6, 62.4], speed: 5 },
            { anim: 'pepper', name: 'scared' },
            { shot: { close: 'pepper', dist: 2.6 } },
            { say: 'ostin', text: "It's got Pepper cornered!", mood: 'surprised' },
            { qte: { kind: 'seq', keys: ['up', 'left', 'action'], text: 'Get to Pepper!', on: 'gloam#3', time: 1.4, ok: [
              { place: 'wren', at: [48.4, 63.4], face: 'gloam#3' },
              { anim: 'wren', name: 'swing' }, { sfx: 'hit' }, { fx: 'poof', at: 'gloam#3' }, { hide: 'gloam#3' },
            ] } },
          ],
        },
        { music: 'night' },
        { anim: 'pepper', name: 'jump' },
        { say: 'pepper', text: 'Wuff!', anim: 'bark' },
        { spawn: 'gloam#4', kind: 'gloam', at: [56.5, 63.5], face: 'wren' },
        { shot: { two: ['wren', 'gloam#4'] } },
        { say: 'ostin', text: "There's another one! It's... running away?", mood: 'surprised', anim: 'point' },
        { move: 'gloam#4', to: [72.5, 55.5], run: true },
        { shot: 'tracks', dur: 1.2 },
        { wait: 1.2 },
        { hide: 'gloam#4' },
        J([
          { say: 'juno', text: "A scout. It'll go tell whoever's in charge exactly where we are.", mood: 'angry' },
        ], [
          { say: 'bram', text: 'Should we chase it? It looked like it was late for something.', mood: 'worried' },
        ]),
        { say: 'wren', text: "Then let's not be here when it gets back. There's a clearing up ahead. We rest there.", mood: 'determined' },
        { fade: 'out', dur: 0.8 },
        { scene: 'camp' },
      ],
    },
    // ------------------------------------------------------------------
    {
      id: 'camp',
      title: 'Campfire',
      set: 'glimmerwood',
      sky: 'night',
      music: 'night',
      cast: {
        wren: { at: [39.2, 38.4], face: 60 },
        ostin: { at: [42.5, 33.4], face: 0 },
        partner: { at: [45.4, 36.5], face: -90 },
        pepper: { at: [40.6, 39.6], face: 30 },
      },
      steps: [
        { fx: 'seams' },
        { anim: 'ostin', name: 'sit' },
        { anim: 'partner', name: 'sit' },
        { shot: 'above' },
        { shot: 'camp', dur: 3 },
        { narrate: 'They made camp just off the trail, where the glowing trees thinned out.' },
        { fx: 'embers', at: [42.5, 9.6, 36.5], radius: 0.5 },
        { shot: { pos: [44, 11.2, 35], look: [46, 10.2, 31.5] } },
        { say: 'ostin', text: "I built us a camp lantern. Spare parts. It's our fair entry, but tiny.", mood: 'happy' },
        {
          if: 'lantern=fox',
          then: [{ say: 'ostin', text: "Fox ears and everything. Her name is Little Fox. Don't laugh.", mood: 'happy' }],
          else: [{
            if: 'lantern=tower',
            then: [{ say: 'ostin', text: 'A little spire, like the Beacon. Except this one stays on.', mood: 'happy' }],
            else: [{ say: 'ostin', text: "A little gold star. For luck. We need luck. I checked.", mood: 'happy' }],
          }],
        },
        { if: 'lantern_name', then: [{ say: 'ostin', text: '{lantern_name}, the Second. Smaller. Braver.', mood: 'happy' }] },
        J([
          { say: 'juno', text: "It's cute. I hate that it's cute.", mood: 'smug' },
        ], [
          { say: 'bram', text: "Ostin, it's beautiful. Look at the joinery. Look at the little joinery!", mood: 'happy' },
        ]),
        { shot: 'camp', dur: 1 },
        {
          explore: {
            objective: 'Talk with your friends',
            cam: { dist: 6, height: 3.4, yaw: 200 },
            hotspots: [
              {
                id: 'c_ostin', actor: 'ostin', label: 'Ostin', verb: 'Talk', required: true,
                steps: [
                  { shot: { two: ['wren', 'ostin'] } },
                  { say: 'ostin', text: 'Hey. Can I say a thing? A quiet thing?', mood: 'worried' },
                  { say: 'wren', text: 'Always.' },
                  { say: 'ostin', text: "On the bridge. When it broke. I didn't do anything. I just stood there.", mood: 'sad' },
                  { say: 'ostin', text: 'And back there, with the gloamlings? I hid behind a tree. A thin tree.', mood: 'sad' },
                  { say: 'ostin', text: "I'm scared, Wren. All the time. Every step. I'm not like you.", mood: 'hurt' },
                  {
                    choice: [
                      { text: "I'm scared too. I just walk anyway.", label: 'Admitted you were scared too', rel: { ostin: 2 }, set: { camp_ostin: 'shared' }, remember: 'Ostin will remember that.', steps: [
                        { say: 'ostin', text: "You? You're scared?", mood: 'surprised' },
                        { say: 'wren', text: 'Every single step.', mood: 'neutral' },
                        { say: 'ostin', text: "...Huh. Okay. Then I'll walk anyway too. Next to you. Slightly behind you.", mood: 'happy' },
                      ] },
                      { text: "Being scared means you're paying attention.", label: 'Told Ostin his fear is useful', rel: { ostin: 1 }, set: { camp_ostin: 'useful' }, steps: [
                        { say: 'ostin', text: "So I'm the most attentive person who ever lived.", mood: 'neutral' },
                        { say: 'ostin', text: "That's... actually a nice way to put it. I'm keeping it.", mood: 'happy' },
                      ] },
                      { text: 'You can head home. Nobody would blame you.', label: 'Offered to send Ostin home', rel: { ostin: -1 }, set: { camp_ostin: 'home' }, remember: 'Ostin will remember that.', steps: [
                        { say: 'ostin', text: "Home. Right. Where I'd sit in the workshop and wonder if you're okay. Every minute.", mood: 'hurt' },
                        { say: 'ostin', text: "No. I'm scared. I'm not leaving. Those are different things.", mood: 'determined' },
                      ] },
                    ],
                    timer: 12,
                    prompt: 'Ostin admits he is scared',
                    major: { id: 'camp_ostin', title: 'At camp, Ostin admitted he was scared' },
                  },
                  {
                    if: 'rel.ostin>=3',
                    then: [{ say: 'ostin', text: "You've always had my back. Ever since the bakery fire. Which was not my fault. Mostly.", mood: 'happy' }],
                    else: [{ say: 'ostin', text: "Thanks for listening. I'll stop talking now. ...I won't. But I'll try.", mood: 'happy' }],
                  },
                ],
              },
              {
                id: 'c_partner', actor: 'partner', label: '{partner}', verb: 'Talk', required: true,
                steps: [
                  { shot: { two: ['wren', 'partner'] } },
                  J([
                    { say: 'juno', text: "If you're here to talk about feelings, I'm asleep.", mood: 'smug' },
                    { say: 'wren', text: "You're sitting up. With your eyes open.", mood: 'happy' },
                    { say: 'juno', text: "Scavengers sleep with their eyes open. It's a whole thing.", mood: 'smug' },
                    { say: 'juno', text: '...', mood: 'sad' },
                    { say: 'juno', text: 'Why me? On the bridge. Bram was right there. Everybody likes Bram.', mood: 'hurt' },
                  ], [
                    { say: 'bram', text: "Hey, Wren. Sit. The log's warm on this side.", mood: 'happy' },
                    { say: 'bram', text: "I keep thinking about Juno out there. She hates being told what to do.", mood: 'sad' },
                    { say: 'bram', text: 'Can I ask you something? On the bridge. Why me?', mood: 'hurt' },
                    { say: 'bram', text: "Juno would have a plan by now. I don't have a plan. I have a hammer.", mood: 'sad' },
                  ]),
                  {
                    choice: [
                      { text: 'You were closer. That was all.', label: 'Said it was only distance', set: { camp_partner: 'closer' }, steps: [
                        J([
                          { say: 'juno', text: "That's all. Good. Easy. I can live with easy.", mood: 'hurt' },
                          { say: 'juno', text: 'Easy is good.', mood: 'sad' },
                        ], [
                          { say: 'bram', text: 'Oh. Right. Yeah. That makes sense.', mood: 'sad' },
                          { say: 'bram', text: "That's okay. Really. I'm totally fine. Look at my fine face.", mood: 'hurt' },
                          { think: 'Bram is a terrible liar.' },
                        ]),
                      ] },
                      { text: "Because I couldn't lose you.", label: "Said you couldn't lose them", rel: { partner: 2 }, set: { camp_partner: 'couldnt' }, remember: '{partner} will remember that.', steps: [
                        J([
                          { say: 'juno', text: "Don't. Don't say things like that out loud.", mood: 'surprised' },
                          { say: 'juno', text: '...Thanks.', mood: 'happy' },
                        ], [
                          { say: 'bram', text: "Wren. You can't just SAY that. I'm going to cry into the fire.", mood: 'happy' },
                          { say: 'bram', text: "And then the fire goes out, and it's your fault.", mood: 'happy' },
                        ]),
                      ] },
                      { text: "I don't know. I still don't know.", label: 'Admitted you still did not know', rel: { partner: 1 }, set: { camp_partner: 'unsure' }, steps: [
                        J([
                          { say: 'juno', text: 'Honest. Annoying. But honest.', mood: 'neutral' },
                        ], [
                          { say: 'bram', text: "That's okay. I don't think there was a right answer. Nana says that about lots of things.", mood: 'neutral' },
                        ]),
                      ] },
                    ],
                    timer: 12,
                    prompt: '{partner} asks why you saved them',
                    major: { id: 'camp_partner', title: 'At camp, {partner} asked why you saved them' },
                  },
                  J([
                    { if: 'helped_nana', then: [{ say: 'juno', text: 'You went for Nana instead of the crystal, back at the fair. Stupid. ...Good stupid.', mood: 'neutral' }] },
                    { if: 'helped_nana=false', then: [{ say: 'juno', text: "You grabbed the crystal while Nana was on the ground. I'd have done the same. That's what bothers me.", mood: 'neutral' }] },
                    { if: 'owes_juno', then: [{ say: 'juno', text: "And don't think any of this gets you out of the favour you owe me.", mood: 'smug' }] },
                    { say: 'juno', text: "When we find him, I'm going to call him an idiot for getting caught. Then I'm going to hug him. Once.", mood: 'determined' },
                    { say: 'juno', text: 'Tell anyone and I drop you in the lake.', mood: 'smug' },
                  ], [
                    { if: 'helped_nana', then: [{ say: 'bram', text: 'You saved Nana at the fair. I never said thank you. So. Thank you. Forever.', mood: 'happy' }] },
                    { if: 'helped_nana=false', then: [
                      { say: 'bram', text: 'At the fair... you went for the crystal. Not Nana.', mood: 'hurt' },
                      { say: 'bram', text: "I'm not angry. I just keep seeing it. I'm trying to stop.", mood: 'sad' },
                    ] },
                    { say: 'bram', text: "We'll get her back. And then she'll yell at me for taking so long.", mood: 'happy' },
                    { say: 'bram', text: "I'm really looking forward to being yelled at.", mood: 'happy' },
                  ]),
                ],
              },
              {
                id: 'c_pepper', actor: 'pepper', label: 'Pepper', verb: 'Pet',
                steps: [
                  { anim: 'wren', name: 'crouch' },
                  { anim: 'pepper', name: 'jump' },
                  { say: 'pepper', text: 'Wuff.', anim: 'bark' },
                  { think: 'Pepper flops over for belly rubs. Then her ears go up, and she stares into the trees.' },
                  { anim: 'wren', name: 'stand' },
                ],
              },
              {
                id: 'c_lantern', at: [46.5, 10.6, 31.5], label: 'Camp lantern', verb: 'Look',
                steps: [
                  { think: "Ostin's little lantern. It flickers every time the Keystone hums." },
                  { sfx: 'heart' },
                  { fx: 'glow', at: [46.5, 10.6, 31.5], radius: 0.5, color: '#ffd080' },
                  { think: 'There. It did it again.' },
                ],
              },
              {
                id: 'c_sky', at: [42.5, 10.5, 41.5], label: 'The cracked sky', verb: 'Look',
                steps: [
                  { shot: 'sky', dur: 1.5 },
                  { wait: 1.5 },
                  { think: 'The cracks are wider tonight. Like someone is picking at a seam, one stitch at a time.' },
                ],
              },
              {
                id: 'c_tent', at: [37.5, 10, 31.5], label: 'Tent', verb: 'Look',
                steps: [
                  { shot: 'tent', dur: 1 },
                  { think: "One tent. Three people and a dog. Somebody is sleeping on Ostin's elbows tonight." },
                ],
              },
            ],
          },
        },
        { shot: 'camp', dur: 2 },
        { narrate: 'One by one, they fall asleep. Wren takes first watch.' },
        { place: 'wren', at: [39.4, 36.5], face: 90 },
        { anim: 'wren', name: 'sit' },
        { place: 'pepper', at: [40.2, 38.2], face: 60 },
        { anim: 'ostin', name: 'fall' },
        { shot: 'fire' },
        { fx: 'embers', at: [42.5, 9.6, 36.5], radius: 0.5 },
        { think: 'Somewhere out there, {captive} is looking at the same cracked sky.' },
        { sfx: 'heart' },
        { fx: 'glow', at: 'wren', radius: 0.4, color: '#7ff2e4' },
        { think: 'The Keystone. Every night it gets a little warmer.' },
        { music: 'tension' },
        { mood: 'pepper', is: 'angry' },
        { anim: 'pepper', name: 'bark' },
        { say: 'pepper', text: 'Grrrrr...', anim: 'bark' },
        { spawn: 'gloam#1', kind: 'gloam', at: [31.5, 31.5], face: 'wren' },
        { shot: { pos: [39.5, 10.8, 37.5], look: [31.5, 9.8, 31.5] }, dur: 1 },
        { wait: 1 },
        {
          choice: [
            { text: 'Throw a stick at it.', steps: [
              { anim: 'wren', name: 'swing' },
              { sfx: 'whoosh' },
              { fx: 'poof', at: 'gloam#1' },
              { hide: 'gloam#1' },
              { think: "Gone. It didn't fight. It didn't even flinch." },
            ] },
            { text: 'Stay perfectly still.', steps: [
              { wait: 1.2 },
              { fx: 'poof', at: 'gloam#1' },
              { hide: 'gloam#1' },
              { think: 'It blinked. And then it simply was not there.' },
            ] },
            { text: 'Wake the others.', steps: [
              { anim: 'ostin', name: 'stand' },
              { say: 'ostin', text: 'Wha? Monsters? Where? I have a wrench! Somewhere!', mood: 'surprised' },
              { fx: 'poof', at: 'gloam#1' },
              { hide: 'gloam#1' },
              { say: 'partner', text: "It's gone. Go back to sleep, Ostin.", mood: 'neutral' },
              { anim: 'ostin', name: 'fall' },
            ] },
          ],
          timer: 6,
          prompt: 'Something is watching the camp',
        },
        { mood: 'pepper', is: 'neutral' },
        { think: "It wasn't hunting. It was watching. Like someone wanted to know where we were going." },
        { fade: 'out', dur: 1.4 },
        { scene: 'lake' },
      ],
    },
    // ------------------------------------------------------------------
    {
      id: 'lake',
      title: 'Glasswater Lake',
      set: 'glasswater',
      sky: 'dawn',
      music: 'wonder',
      cast: {
        wren: { at: [47.5, 79.5], face: 180 },
        ostin: { at: [46.0, 81.0], face: 180 },
        partner: { at: [49.2, 80.8], face: 180 },
        pepper: { at: [48.6, 78.0], face: 180 },
      },
      steps: [
        { shot: 'wide' },
        { title: 'Glasswater Lake', sub: 'Where the Keeper keeps' },
        { move: 'ostin', to: [45.6, 70.0], speed: 3 },
        { move: 'partner', to: [49.6, 69.8], speed: 3 },
        { move: 'pepper', to: [48.4, 66.8], speed: 3.4 },
        { shot: 'shore', dur: 3.5 },
        { move: 'wren', to: [47.5, 68.5], speed: 3, wait: true },
        { face: 'wren', to: 180 },
        { say: 'ostin', text: "That's it. Glasswater Lake. Very lake-shaped. Very... wet.", mood: 'happy' },
        J([
          { say: 'juno', text: "So where's this Archive? I don't see a building. I see a shed.", mood: 'smug' },
        ], [
          { say: 'bram', text: 'Is the Archive... in the boathouse? It seems like a small boathouse for a whole archive.', mood: 'neutral' },
        ]),
        { say: 'wren', text: "Tibbet said 'beneath the lake.' The Sunken Archive.", mood: 'neutral' },
        { shot: 'domeTop', dur: 1.5 },
        { wait: 1.5 },
        { sfx: 'chime' },
        { think: 'There. Under the water. A dome of glass, lit from the inside.' },
        { say: 'ostin', text: "There's a building. At the bottom of the lake. A whole glass building. UNDER the water.", mood: 'surprised' },
        { say: 'ostin', text: "That's either the best thing I've ever seen or the worst.", mood: 'surprised' },
        J([
          { say: 'juno', text: 'Great. How do we get down there? I swim like a brick.', mood: 'angry' },
        ], [
          { say: 'bram', text: 'I can hold my breath for... about four seconds. Five, if Nana is cooking cabbage.', mood: 'worried' },
        ]),
        { shot: { two: ['wren', 'ostin'] } },
        { say: 'ostin', text: 'Bubble helms. Glass for the bowl, wool to seal the neck, sparkwire to pump in fresh air.', mood: 'neutral', anim: 'think' },
        { say: 'ostin', text: "I've drawn them a hundred times. In theory.", mood: 'neutral' },
        { say: 'ostin', text: "In practice I've only drawn them.", mood: 'worried' },
        {
          choice: [
            { text: "Then today's the day you build one.", rel: { ostin: 1 }, steps: [
              { say: 'ostin', text: "Today's the day. Okay. Deep breath. Not literally. We're still on land.", mood: 'determined' },
            ] },
            { text: 'Will they actually work?', steps: [
              { say: 'ostin', text: "Probably! Seventy percent. Sixty. Let's say a confident sixty.", mood: 'worried' },
            ] },
            { text: 'What do you need?', steps: [
              { say: 'ostin', text: 'Everything. Nothing. Three things! I need three things.', mood: 'happy' },
            ] },
          ],
          timer: 8,
        },
        { say: 'ostin', text: "Glass from that boathouse window. Wool from... somewhere. And sparkwire, from that old lamp on the jetty!", anim: 'point' },
        {
          explore: {
            objective: 'Gather glass, wool and sparkwire for bubble helms',
            until: 'got_glass && got_wool && got_wire',
            hotspots: [
              {
                id: 'l_window', at: [59.5, 28.2, 69.3], label: 'Boathouse window', verb: 'Take', required: true,
                steps: [
                  { shot: 'boathouse', dur: 1 },
                  { think: "An old boathouse. Nobody's rowed out of here in years." },
                  { anim: 'wren', name: 'reach' },
                  { sfx: 'break' },
                  { blocks: [[59, 28, 68, 'air']] },
                  { set: { took_window: true, got_glass: true } },
                  { give: 'glass' },
                  { anim: 'wren', name: 'idle' },
                  { think: "Sorry, boathouse. It's for science." },
                ],
              },
              {
                id: 'l_bedroll', at: [36.8, 27.2, 69.5], label: 'Bedroll', verb: 'Take', required: true,
                steps: [
                  { place: 'ostin', at: [39.2, 71.0], face: 'wren' },
                  { think: "Ostin's bedroll. Thick, soft, and very much made of wool." },
                  { say: 'ostin', text: 'Is that my bedroll? Why are you looking at my bedroll like that?', mood: 'worried' },
                  {
                    choice: [
                      { text: 'For science.', steps: [
                        { say: 'ostin', text: "...Science. Fine. Goodbye, bedroll. You were soft and I loved you.", mood: 'sad' },
                      ] },
                      { text: "You'll get it back. Mostly.", steps: [
                        { say: 'ostin', text: "'Mostly.' That's what you said about my good boots.", mood: 'hurt' },
                      ] },
                      { text: 'Would you rather drown?', rel: { ostin: -1 }, steps: [
                        { say: 'ostin', text: "I'd rather not be asked that before breakfast. But no. Take it.", mood: 'worried' },
                      ] },
                    ],
                    timer: 8,
                  },
                  { anim: 'wren', name: 'crouch' },
                  { blocks: [[36, 26, 69, 'grass'], [37, 26, 69, 'grass']] },
                  { set: { took_bedroll: true, got_wool: true } },
                  { give: 'wool' },
                  { anim: 'wren', name: 'stand' },
                ],
              },
              {
                id: 'l_coil', at: [47.5, 27.4, 51.6], label: 'Coil of sparkwire', verb: 'Take', required: true,
                steps: [
                  { shot: 'jetty', dur: 1 },
                  { think: "The old jetty lamp. Its sparkwire is coiled at the base, still warm." },
                  { anim: 'wren', name: 'crouch' },
                  { fx: 'sparks', at: [47.5, 27.2, 51.5] },
                  { sfx: 'chime' },
                  { blocks: [[47, 27, 51, 'air']] },
                  { set: { got_wire: true } },
                  { give: 'sparkwire' },
                  { anim: 'wren', name: 'stand' },
                  { think: 'Somebody kept this lamp burning for a long, long time.' },
                ],
              },
              {
                id: 'l_look', at: [48.5, 27.8, 56.5], label: 'Look into the water', verb: 'Look',
                steps: [
                  { shot: { pos: [50.6, 31.5, 52.2], look: [48, 15, 37] }, dur: 1 },
                  { wait: 1 },
                  { think: 'Down between the weeds: shelves. Hundreds of shelves.' },
                  { think: "And something moving between them. Slowly. Like it's got all the time in the world." },
                ],
              },
              {
                id: 'l_sign', at: [44.5, 28.6, 62.6], label: 'Old sign', verb: 'Look',
                steps: [
                  { think: "'NO SWIMMING. NO FISHING. NO SHOUTING. By order of the Keeper.'" },
                  { say: 'ostin', text: 'No shouting? Who complains about shouting at a lake?', mood: 'neutral' },
                  { think: 'Someone who lives under it, maybe.' },
                ],
              },
              {
                id: 'l_boat', at: [53.5, 27.4, 70.5], label: 'Upturned rowboat', verb: 'Look',
                steps: [
                  { think: "An upturned rowboat. Someone carved two letters into the hull, a long time ago. 'Y' and 'S'." },
                  { think: 'The S has been scratched out. Hard.' },
                ],
              },
              {
                id: 'l_ostin', actor: 'ostin', label: 'Ostin', verb: 'Talk',
                steps: [
                  { say: 'ostin', text: 'Helm, version one: glass bowl, wool collar, sparkwire pump. Version two: same, but works.', mood: 'happy' },
                  {
                    if: 'camp_ostin=shared',
                    then: [{ say: 'ostin', text: "I'm still scared. But I'm walking anyway. See? Walking. Look at me go.", mood: 'determined' }],
                    else: [{ say: 'ostin', text: "If you need me, I'll be here. Worrying. Productively.", mood: 'worried' }],
                  },
                ],
              },
              {
                id: 'l_partner', actor: 'partner', label: '{partner}', verb: 'Talk',
                steps: [
                  J([
                    { say: 'juno', text: "I'm not scared of water. Water should stay where it is, and I'll stay where I am. That's all.", mood: 'angry' },
                  ], [
                    { say: 'bram', text: 'Nana taught me to swim in the mill pond. Mostly she threw me in and shouted encouragement.', mood: 'happy' },
                    { say: 'bram', text: "Juno said that explains a lot. I still don't know what she meant.", mood: 'neutral' },
                  ]),
                ],
              },
              {
                id: 'l_pepper', actor: 'pepper', label: 'Pepper', verb: 'Pet',
                steps: [
                  { anim: 'pepper', name: 'jump' },
                  { fx: 'splash', at: 'pepper', radius: 1 },
                  { sfx: 'splash' },
                  { think: 'Pepper is trying to bite the lake. The lake is winning.' },
                ],
              },
            ],
          },
        },
        { think: 'Glass, wool and sparkwire. Back to the bench.' },
        { fade: 'out', dur: 0.4 },
        { place: 'wren', at: [41.5, 68.7], face: 180 },
        { place: 'pepper', at: [39.6, 69.8], face: 120 },
        { place: 'ostin', at: [43.2, 68.6], face: 'wren' },
        { shot: 'bench' },
        { fade: 'in', dur: 0.4 },
        { say: 'ostin', text: 'Glass makes the bowl. Wool seals your neck. Sparkwire at the bottom pumps the air. You have the steady hands.', mood: 'neutral', anim: 'point' },
        {
          craft: {
            title: 'Bubble Helm',
            recipe: ['.G.', 'G.G', 'WSW'],
            key: { G: 'glass', W: 'wool', S: 'sparkwire' },
            extras: ['stone', 'sand'],
            result: 'helm',
            hint: 'An arch of glass with room for your head in the middle. Wool in both bottom corners to seal it, sparkwire between them to pump the air.',
          },
        },
        { take: 'glass' }, { take: 'wool' }, { take: 'sparkwire' },
        { hold: 'wren', item: 'helm' },
        { say: 'ostin', text: "It works! I mean, it's a bowl. But it's a bowl that breathes!", mood: 'happy', anim: 'cheer' },
        { say: 'ostin', text: 'Give me ten minutes and I can copy it. One each. And a tiny one for Pepper.', mood: 'happy' },
        { fade: 'out', dur: 0.8 },
        { place: 'wren', at: [48.5, 52.8], face: 180 },
        { place: 'ostin', at: [47.6, 54.2], face: 180 },
        { place: 'partner', at: [49.4, 54.1], face: 180 },
        { place: 'pepper', at: [48.4, 55.4], face: 180 },
        { hold: 'ostin', item: 'helm' },
        { hold: 'partner', item: 'helm' },
        { shot: 'jetty' },
        { narrate: 'Twenty-five minutes later.' },
        { fade: 'in', dur: 0.8 },
        { say: 'ostin', text: "I said ten. I'm counting the other fifteen as quality.", mood: 'smug' },
        J([
          { say: 'juno', text: "If I drown, I'm haunting you, Ostin. You specifically.", mood: 'angry' },
        ], [
          { say: 'bram', text: 'If I sink, just leave a peg on my head so you can find me again.', mood: 'worried' },
        ]),
        { say: 'ostin', text: "Helms on. Breathe normally. Don't panic. I'm going to panic, but you don't.", mood: 'worried' },
        {
          choice: [
            { text: 'On three. One, two...', steps: [
              { say: 'ostin', text: 'You said THREE!', mood: 'surprised' },
            ] },
            { text: 'Pepper. Show them how it is done.', steps: [
              { anim: 'pepper', name: 'jump' },
              { say: 'pepper', text: 'Wuff!', anim: 'bark' },
              { sfx: 'splash' },
              { say: 'partner', text: 'The dog went first. The DOG went first.', mood: 'surprised' },
            ] },
            { text: 'Hold hands. All of us.', rel: { ostin: 1, partner: 1 }, steps: [
              J([
                { say: 'juno', text: "...Fine. But I'm not swinging them. No swinging.", mood: 'smug' },
              ], [
                { say: 'bram', text: 'Yes. Good. Nobody gets left behind. Not again.', mood: 'determined' },
              ]),
            ] },
          ],
          timer: 8,
        },
        { anim: 'wren', name: 'jump' },
        { sfx: 'splash' },
        { fx: 'splash', at: [48.5, 25.6, 51.5], radius: 3 },
        { hide: 'wren' }, { hide: 'ostin' }, { hide: 'partner' }, { hide: 'pepper' },
        { wait: 0.6 },
        { fade: 'out', dur: 0.5 },
        { sky: 'underwater' },
        { music: 'mystery' },
        { hold: 'wren', item: null }, { hold: 'ostin', item: null }, { hold: 'partner', item: null },
        { place: 'wren', at: [52.5, 10, 51.2], face: -150 },
        { place: 'ostin', at: [51.2, 10, 52.4], face: -150 },
        { place: 'partner', at: [53.8, 10, 52.2], face: -150 },
        { place: 'pepper', at: [52.6, 10, 50.0], face: -150 },
        { shot: 'under' },
        { fade: 'in', dur: 0.8 },
        { fx: 'bubbles', at: 'wren', radius: 0.5 },
        { fx: 'bubbles', at: 'ostin', radius: 0.5 },
        { think: 'Cold. Quiet. Green-blue in every direction. And then... light.' },
        { fx: 'bubbles', at: 'partner', radius: 0.5 },
        { say: 'ostin', text: "It works! I'm breathing! Underwater! Somebody write that down!", mood: 'happy', anim: 'cheer', shot: 'under' },
        J([
          { say: 'juno', text: "Stop shouting inside the helm. My ears are ringing.", mood: 'angry', shot: 'under' },
          { say: 'juno', text: '...Okay. It works. Good job. Never tell anyone I said that.', mood: 'happy' },
        ], [
          { say: 'bram', text: "Ostin, you're a genius! A genius in a bowl!", mood: 'happy', shot: 'under' },
        ]),
        { fx: 'bubbles', at: 'pepper', radius: 0.5 },
        { move: 'wren', to: [48.5, 47.6], speed: 2 },
        { move: 'ostin', to: [47.6, 48.8], speed: 2 },
        { move: 'partner', to: [49.4, 48.8] },
        { move: 'pepper', to: [48.5, 46.4] },
        { shot: 'tunnel', dur: 2.5 },
        { wait: 2.5 },
        { fade: 'out', dur: 1 },
        { scene: 'archive' },
      ],
    },
    // ------------------------------------------------------------------
    {
      id: 'archive',
      title: 'The Sunken Archive',
      set: 'archive',
      sky: 'underwater',
      music: 'mystery',
      cast: {
        wren: { at: [32.5, 11, 52.6], face: 180 },
        ostin: { at: [31.5, 11, 53.9], face: 180 },
        partner: { at: [33.5, 11, 53.8], face: 180 },
        pepper: { at: [32.4, 11, 51.3], face: 180 },
        ysolde: { at: [24.5, 11, 38.5], face: 45, hidden: true },
      },
      steps: [
        { shot: { pos: [32.5, 12.8, 49.2], look: [32.5, 11.8, 54] } },
        { fx: 'bubbles', at: [32.5, 11.5, 53], radius: 1.5 },
        { sfx: 'drip' },
        { narrate: 'Water drains away through grates in the floor. Somewhere, old gears grind. The inner door is open.' },
        { say: 'ostin', text: "Air. There's air in here. Helms off? Helms off. Ow. Helm off.", mood: 'surprised', shot: 'lock' },
        { move: 'ostin', to: [31.0, 44.6], speed: 3 },
        { move: 'partner', to: [34.0, 44.4], speed: 3 },
        { move: 'pepper', to: [33.0, 42.4], speed: 3.4 },
        { shot: 'entry', dur: 1 },
        { move: 'wren', to: [32.5, 43.6], speed: 3, wait: true },
        { wait: 0.4 },
        { shot: 'wide', dur: 0 },
        { title: 'The Sunken Archive' },
        { shot: 'hall', dur: 3 },
        { say: 'ostin', text: 'Oh. Oh, wow.', mood: 'surprised' },
        { say: 'ostin', text: "Books. On every wall. Books up to the ceiling. And the ceiling is a LAKE.", mood: 'surprised', anim: 'point' },
        J([
          { say: 'juno', text: 'Great. A library. My favourite place to be told to be quiet.', mood: 'smug' },
        ], [
          { say: 'bram', text: "Nana would cry. She'd cry, and then she'd dust everything.", mood: 'happy' },
        ]),
        { think: 'It smells like old paper. And rain.' },
        { show: 'ysolde', at: [24.5, 11, 38.5], face: 'wren' },
        { say: 'ysolde', text: "You're dripping on my floor.", shot: { close: 'ysolde' } },
        { anim: 'ostin', name: 'scared' },
        { say: 'ostin', text: 'AH! A person! A floor person!', mood: 'surprised' },
        { move: 'ysolde', to: [30.5, 41.4], wait: true },
        { face: 'ysolde', to: 'wren' },
        { say: 'ysolde', text: "Four visitors in one morning. Three, and a dog. That's more than the last hundred years put together.", mood: 'smug' },
        { say: 'ysolde', text: 'I am Ysolde, Keeper of the Sunken Archive. And you, I assume, are lost.', mood: 'neutral' },
        {
          choice: [
            { text: 'We came looking for you.', steps: [
              { say: 'ysolde', text: "Nobody looks for me. People look for answers, and find me standing in the way.", mood: 'smug' },
            ] },
            { text: "Mayor Tibbet's grandmother sent us. Sort of.", rel: { ysolde: 1 }, steps: [
              { say: 'ysolde', text: 'Ah. Marigold Tibbet. She borrowed a book in her youth and never brought it back.', mood: 'smug' },
              { say: 'ysolde', text: 'Tell her family it is very overdue.', mood: 'smug' },
            ] },
            { text: 'Are you a ghost?', steps: [
              { say: 'ysolde', text: "Not yet. Though I've been practising the sighing.", mood: 'smug' },
            ] },
          ],
          timer: 9,
        },
        { sfx: 'heart' },
        { fx: 'glow', at: 'wren', radius: 0.4, color: '#7ff2e4' },
        { say: 'ysolde', text: "...And you're carrying THAT.", mood: 'surprised' },
        { say: 'ysolde', text: 'Show me.', mood: 'neutral' },
        { anim: 'wren', name: 'reach' },
        { hold: 'wren', item: 'keystone' },
        { shot: { two: ['wren', 'ysolde'] } },
        { say: 'ysolde', text: 'The Keystone. Lost for two hundred years, and it turns up in the pocket of a child with wet socks.', mood: 'surprised' },
        { if: 'touched_core', then: [{ say: 'ysolde', text: 'You held it to the Beacon, did you not? I felt the whole lake shiver.', mood: 'neutral' }] },
        { anim: 'wren', name: 'idle' },
        { hold: 'wren', item: null },
        { say: 'wren', text: 'The Beacon went dark. The Fray ate half our village. Gloamlings took our friend.', mood: 'determined' },
        { say: 'wren', text: "The Beacon said 'the Keeper holds the way.' So. Show us the way.", mood: 'determined' },
        { say: 'ysolde', text: 'Hm. Straight to the point. I like that in a reader.', mood: 'smug' },
        { say: 'ysolde', text: "But the Archive doesn't open itself to visitors. Only to readers.", mood: 'neutral' },
        { say: 'ysolde', text: 'Three books have wandered off their shelves this week. Readers. They never put anything back.', mood: 'neutral' },
        { say: 'ysolde', text: "Return them where they belong, and I'll know you can read.", mood: 'neutral' },
        J([
          { say: 'juno', text: "A test. You're giving us chores. While Bram is out there with those things.", mood: 'angry' },
          { say: 'ysolde', text: 'You have more time than you think, and less than you would like. Shelve the books, scarf girl.', mood: 'smug' },
        ], [
          { say: 'bram', text: "I'm good at tidying! Nana once made me tidy the whole workshop. With a toothbrush.", mood: 'happy' },
          { say: 'ysolde', text: 'A grandmother after my own heart.', mood: 'smug' },
        ]),
        { say: 'ysolde', text: 'Look for the crystals above the shelves. Every book knows its home, if you read the title.', mood: 'neutral', anim: 'point' },
        { place: 'ysolde', at: [31.5, 11, 38.6], face: 0 },
        { place: 'pepper', at: [27.5, 11, 25.5], face: 30 },
        { place: 'ostin', at: [36.2, 11, 37.8], face: -120 },
        { place: 'partner', at: [27.8, 11, 37.2], face: 120 },
        {
          explore: {
            objective: 'Return the three books to their shelves',
            until: 'shelf_tide && shelf_ember && shelf_root',
            hotspots: [
              {
                id: 'a_book_flood', at: [41.5, 11.8, 32.5], label: 'Book on a sunken table', verb: 'Take', required: true,
                steps: [
                  { shot: 'wing', dur: 1 },
                  { think: "A book on a half-drowned table. 'Salt and Current: A History of Tides.'" },
                  { give: 'tome_tide' },
                  { think: 'Damp. Very damp. The Keeper is going to have words.' },
                ],
              },
              {
                id: 'a_book_table', at: [22.5, 12.2, 32.5], label: 'Book on a reading table', verb: 'Take', required: true,
                steps: [
                  { think: "'Kindling Theory, Volume Two.' The cover is warm, as if somebody left it by a fire." },
                  { give: 'tome_ember' },
                ],
              },
              {
                id: 'a_book_pepper', actor: 'pepper', label: 'Pepper (chewing something)', verb: 'Take', required: true,
                steps: [
                  { anim: 'wren', name: 'crouch' },
                  { think: 'Pepper has a book. Pepper has been chewing the book.' },
                  { say: 'ysolde', text: "Is your dog eating 'Of Seeds and Patience'?", mood: 'surprised' },
                  { say: 'wren', text: "She's... reading it. Very closely.", mood: 'worried' },
                  { say: 'ysolde', text: 'With her teeth.', mood: 'smug' },
                  { give: 'tome_root' },
                  { anim: 'wren', name: 'stand' },
                  { anim: 'pepper', name: 'jump' },
                  { say: 'pepper', text: 'Wuff!', anim: 'bark' },
                ],
              },
              { id: 'a_shelf_ember', at: [AR.ember[0] + 2, 12.4, AR.ember[1] + 2], label: 'Shelf (orange crystal)', verb: 'Use', once: false, when: HOLDING, steps: shelf('ember', AR.ember) },
              { id: 'a_shelf_gale', at: [AR.gale[0] - 1, 12.4, AR.gale[1] + 2], label: 'Shelf (pale crystal)', verb: 'Use', once: false, when: HOLDING, steps: shelf('gale', AR.gale) },
              { id: 'a_shelf_root', at: [AR.root[0] + 2, 12.4, AR.root[1] - 1], label: 'Shelf (green crystal)', verb: 'Use', once: false, when: HOLDING, steps: shelf('root', AR.root) },
              { id: 'a_shelf_tide', at: [AR.tide[0] - 1, 12.4, AR.tide[1] - 1], label: 'Shelf (blue crystal)', verb: 'Use', once: false, when: HOLDING, steps: shelf('tide', AR.tide) },
              {
                id: 'a_ysolde', actor: 'ysolde', label: 'Keeper Ysolde', verb: 'Talk',
                steps: [
                  { say: 'ysolde', text: 'Each shelf wears a crystal like a hat. Ember is orange. Tide is blue. Root is green. Gale is pale.', mood: 'neutral' },
                  { say: 'ysolde', text: 'The rest is reading. Read the titles.', mood: 'smug' },
                  {
                    choice: [
                      { text: 'How long have you been down here?', steps: [
                        { say: 'ysolde', text: 'Long enough that the fish know me by name. Not long enough to finish the shelves.', mood: 'smug' },
                      ] },
                      { text: 'Do you ever get lonely?', rel: { ysolde: 1 }, steps: [
                        { say: 'ysolde', text: '...I have eleven thousand books. And one very old argument with someone who left.', mood: 'sad' },
                        { say: 'ysolde', text: 'Shelve your books, child.', mood: 'neutral' },
                      ] },
                    ],
                  },
                ],
              },
              {
                id: 'a_desk', at: [32.5, 12.6, 23.2], label: "Keeper's desk", verb: 'Look',
                steps: [
                  { shot: 'desk', dur: 1 },
                  { think: "A half-written letter. 'S. I know you are out there. I know what you're doing. Stop.'" },
                  { think: "The rest is crossed out. Again and again, until the paper tore." },
                ],
              },
              {
                id: 'a_orrery', at: [32.5, 13.2, 33.5], label: 'Strange model', verb: 'Look',
                steps: [
                  { shot: 'orrery', dur: 1 },
                  { think: 'A model of the Beacon, with four crystals around it. Two of them are dark as coal.' },
                  { say: 'ostin', text: "Don't touch it. I'm saying that mostly to myself.", mood: 'worried' },
                ],
              },
              {
                id: 'a_ostin', actor: 'ostin', label: 'Ostin', verb: 'Talk',
                steps: [
                  { say: 'ostin', text: "The whole dome is held up by pressure and stubbornness. Mostly stubbornness. I love it here.", mood: 'happy' },
                  { say: 'ostin', text: "If I'd known there was a library at the bottom of a lake, I'd have learned to swim years ago.", mood: 'happy' },
                ],
              },
              {
                id: 'a_partner', actor: 'partner', label: '{partner}', verb: 'Talk',
                steps: [
                  J([
                    { say: 'juno', text: 'Eleven thousand books, and not one on how to get a friend back. I checked the titles.', mood: 'sad' },
                  ], [
                    { say: 'bram', text: 'Everything is so neat down here. It makes me want to build a shelf. A small one. For Nana.', mood: 'happy' },
                  ]),
                ],
              },
            ],
          },
        },
        { take: 'tome_tide' }, { take: 'tome_ember' }, { take: 'tome_root' },
        { place: 'ysolde', at: [32.5, 11, 37.6], face: 0 },
        { place: 'wren', at: [32.5, 11, 40.2], face: 180 },
        { place: 'ostin', at: [30.6, 11, 40.8], face: 160 },
        { place: 'partner', at: [34.4, 11, 40.6], face: -160 },
        { place: 'pepper', at: [31.6, 11, 39.2], face: 180 },
        { shot: { two: ['wren', 'ysolde'] } },
        {
          if: 'shelf_wrong',
          then: [{ say: 'ysolde', text: 'Took you a few tries. My last apprentice took a week, and sulked for two.', mood: 'smug' }],
          else: [
            { say: 'ysolde', text: 'Not a single book in the wrong place. Do you know how rare that is?', mood: 'surprised' },
            { rel: { ysolde: 1 } },
          ],
        },
        { say: 'ysolde', text: 'One last question. Then I answer yours.', mood: 'neutral' },
        { say: 'ysolde', text: 'What does a Keeper keep?', mood: 'neutral' },
        {
          choice: [
            { text: 'Books.', steps: [
              { say: 'ysolde', text: 'Books keep themselves. Mostly. No.', mood: 'smug' },
            ] },
            { text: 'Secrets.', steps: [
              { say: 'ysolde', text: 'Ha. Too many. But no.', mood: 'smug' },
            ] },
            { text: 'The way.', rel: { ysolde: 1 }, set: { keeper_way: true }, steps: [
              { say: 'ysolde', text: "...The way. You read the Beacon's wall.", mood: 'surprised' },
            ] },
            { text: 'Her temper?', steps: [
              { say: 'ysolde', text: 'Barely.', mood: 'smug' },
              { anim: 'ostin', name: 'facepalm' },
            ] },
          ],
          timer: 12,
          prompt: 'What does a Keeper keep?',
        },
        { if: '!keeper_way', then: [{ say: 'ysolde', text: "The answer is 'the way.' It is written on the Beacon itself. Somebody should read it.", mood: 'neutral' }] },
        { say: 'ysolde', text: 'The way the world was put together. Written down, so nobody forgets how.', mood: 'neutral' },
        { say: 'ysolde', text: 'Come. Look.', mood: 'neutral' },
        { move: 'ysolde', to: [32.5, 36.2] },
        { shot: 'orrery', dur: 1.5 },
        { wait: 1.5 },
        { say: 'ysolde', text: 'This is the Beacon. A model of it. And these four are its Anchors.', mood: 'neutral', anim: 'point' },
        { say: 'ysolde', text: 'Ember. Tide. Root. Gale. Crystals set in the deep places of the world, before your village had a name.', mood: 'neutral' },
        { say: 'ostin', text: "'Four Anchors feed the light.' That's what the Beacon's wall said!", mood: 'surprised' },
        { say: 'ysolde', text: 'Feed. Yes. The Beacon draws on them, the way a lamp draws oil.', mood: 'neutral' },
        { say: 'wren', text: 'So if an Anchor gets taken, the Beacon goes dark.', mood: 'neutral' },
        { say: 'ysolde', text: '...Something like that.', mood: 'neutral' },
        { think: "She's not telling us everything." },
        { shot: 'orreryTop', dur: 1.5 },
        { say: 'ysolde', text: 'Look at the Gale. And the Root. Both dark.', mood: 'sad' },
        { say: 'ysolde', text: 'Someone has been pulling Anchors out of the world. Carefully. One by one.', mood: 'angry' },
        J([
          { say: 'juno', text: 'The masked one. With the staff.', mood: 'angry' },
        ], [
          { say: 'bram', text: 'The masked person on the floating rock! With the staff!', mood: 'angry' },
        ]),
        { say: 'wren', text: 'They control the gloamlings. They took {captive}.', mood: 'angry' },
        { shot: { close: 'ysolde', dist: 2 } },
        { say: 'ysolde', text: 'A staff. Long, dark wood. A violet stone at the top.', mood: 'neutral' },
        { say: 'wren', text: 'You know them.', mood: 'surprised' },
        { say: 'ysolde', text: 'I know a great many things, child. Most of them are books.', mood: 'neutral' },
        { think: "That wasn't a no." },
        { say: 'ysolde', text: "Someone I learned from used to say that every map is a promise about what you're willing to leave out.", mood: 'sad' },
        { say: 'ysolde', text: "...Never mind. An old woman's rambling.", mood: 'neutral' },
        { shot: 'orrery', dur: 0.8 },
        { blocks: [[35, 12, 35, 'basalt']] },
        { wait: 0.3 },
        { blocks: [[35, 12, 35, 'tide']] },
        { wait: 0.3 },
        { blocks: [[35, 12, 35, 'basalt']] },
        { wait: 0.4 },
        { blocks: [[35, 12, 35, 'tide']] },
        { say: 'ostin', text: "That one's flickering. The blue one.", mood: 'worried', anim: 'point' },
        { say: 'ysolde', text: 'The Tide is my concern. Not yours.', mood: 'angry' },
        { say: 'ysolde', text: 'But the Ember. The Ember still burns. And it burns where it should not.', mood: 'neutral' },
        { fx: 'embers', at: [29.5, 12.5, 29.5], radius: 0.6 },
        { say: 'ysolde', text: 'A year ago, miners dug it out of an old forge-ruin. They thought it was a very pretty rock.', mood: 'neutral' },
        { say: 'ysolde', text: 'They sold it. And it was bought by Mags Gristle, boss of Iron Hollow.', mood: 'neutral' },
        { say: 'ostin', text: 'Iron Hollow? The mining city under the mountains? Where they make the really good rails?', mood: 'surprised' },
        { say: 'ysolde', text: 'And the really bad tempers. Mags Gristle never sells anything she has bought. Not to anyone.', mood: 'smug' },
        { say: 'ysolde', text: 'Which is the only reason your masked friend has not got it. Yet.', mood: 'neutral' },
        J([
          { shot: { two: ['ysolde', 'juno'] } },
          { say: 'ysolde', text: 'That scarf. Lowmere weave.', mood: 'surprised' },
          { say: 'juno', text: 'How do you know that?', mood: 'angry' },
          { say: 'ysolde', text: "I've read everything, girl. Lowmere included.", mood: 'sad' },
          { say: 'juno', text: "Lowmere's gone.", mood: 'hurt' },
          { say: 'ysolde', text: 'Yes. I know. I am sorry.', mood: 'sad' },
        ], [
          { shot: { two: ['ysolde', 'bram'] } },
          { say: 'ysolde', text: 'That hammer. Pegged joints in the handle.', mood: 'neutral' },
          { say: 'bram', text: "My Nana's work. She taught me.", mood: 'happy' },
          { say: 'ysolde', text: "Good hands in that family. Don't waste them.", mood: 'smug' },
        ]),
        {
          choice: [
            { text: 'Then we get to the Ember first.', rel: { partner: 1 }, steps: [
              J([
                { say: 'juno', text: 'Now you sound like me. Good.', mood: 'determined' },
              ], [
                { say: 'bram', text: "Yes! First! We'll be so first.", mood: 'determined' },
              ]),
            ] },
            { text: 'Why are you helping us, Keeper?', rel: { ysolde: 1 }, steps: [
              { say: 'ysolde', text: "Because you put the books back. And because I am tired of watching the lights go out.", mood: 'sad' },
            ] },
            { text: 'What does the Keystone have to do with all this?', set: { keystone_lore: true }, steps: [
              { say: 'ysolde', text: 'The Keystone is the Beacon\'s key. Whoever holds it can wake the light... or shut it for good.', mood: 'neutral' },
              { say: 'ysolde', text: 'Which is why everyone will want it. Hold it tighter.', mood: 'neutral' },
            ] },
          ],
          timer: 10,
          prompt: 'What now?',
        },
        // they followed us
        { sfx: 'gloam' },
        { fx: 'shake', radius: 1.5 },
        { spawn: 'gloam#1', kind: 'gloam', at: [46.5, 21.5], face: 'wren' },
        { spawn: 'gloam#2', kind: 'gloam', at: [48.5, 25.5], face: 'wren' },
        { spawn: 'gloam#3', kind: 'gloam', at: [44.5, 17.5], face: 'wren' },
        { music: 'tension' },
        { shot: 'crack', dur: 1 },
        { say: 'ostin', text: 'Um. Keeper? There are faces. On the outside. Of the glass.', mood: 'worried' },
        { say: 'ysolde', text: "They've never come down here. Never. Not once in three hundred years.", mood: 'surprised' },
        { sfx: 'thud' },
        { fx: 'shake', radius: 1 },
        { think: 'The scout. The one that ran. It led them straight to us.' },
        { sfx: 'thud' },
        { fx: 'shake', radius: 1.5 },
        { say: 'ysolde', text: 'The glass is old. It will not hold.', mood: 'worried' },
        { scene: 'flood' },
      ],
    },
    // ------------------------------------------------------------------
    {
      id: 'flood',
      title: 'The Flood',
      set: 'archive',
      sky: 'underwater',
      music: 'tension',
      cast: {
        wren: { at: [32.5, 11, 40.2], face: 0 },
        ostin: { at: [30.6, 11, 40.8], face: 0 },
        partner: { at: [34.4, 11, 40.6], face: 0 },
        pepper: { at: [31.6, 11, 39.2], face: 0 },
        ysolde: { at: [32.5, 11, 36.2], face: 180 },
        'gloam#1': { at: [46.5, 21.5], face: 225 },
        'gloam#2': { at: [48.5, 25.5], face: 225 },
        'gloam#3': { at: [44.5, 17.5], face: 225 },
      },
      steps: [
        { shot: 'crack' },
        { blocks: archiveCrack('frayed') },
        { sfx: 'fray' },
        { fx: 'shake', radius: 2 },
        { wait: 1 },
        { sfx: 'break' },
        { blocks: archiveCrack('water') },
        { fx: 'splash', at: [42.5, 20, 22.5], radius: 3 },
        { blocks: archiveFall() },
        { sfx: 'splash' },
        { hide: 'gloam#1' }, { hide: 'gloam#2' }, { hide: 'gloam#3' },
        { music: 'action' },
        { say: 'ysolde', text: 'The lock! South! Everyone, NOW!', mood: 'angry', shot: { close: 'ysolde' } },
        { blocks: archiveFlood(11) },
        { fx: 'shake', radius: 1 },
        { anim: 'ostin', name: 'fall' },
        { say: 'ostin', text: "Ow! I'm fine! I'm not fine! My foot's caught!", mood: 'surprised', shot: { pos: [34, 13.4, 43.6], look: [30.8, 11.2, 40.6] } },
        { shot: 'atlas', dur: 1 },
        { think: 'The Atlas. On its stand by the desk. The water is already around its feet.' },
        { say: 'ysolde', text: 'Leave the books! Books can be rewritten!', mood: 'angry' },
        {
          choice: [
            { text: 'Grab the Atlas.', label: 'Took the Atlas', set: { atlas: 'taken' }, steps: [
              { hold: 'wren', item: 'pickaxe' },
              {
                action: [
                  { place: 'wren', at: [32.5, 11, 26.5], face: 180 },
                  { shot: { pos: [35.5, 13.5, 24.5], look: [32.5, 11.8, 20] } },
                  { move: 'wren', to: [32.5, 23.6], run: true, wait: true },
                  { sfx: 'break' },
                  { fx: 'splash', at: [33.5, 13, 23.5], radius: 1.5 },
                  { qte: { kind: 'dir', key: 'left', text: 'Glass!', on: 'wren', time: 1.2, ok: [{ anim: 'wren', name: 'dodge' }, { place: 'wren', at: [31.4, 11, 23.4] }] } },
                  { move: 'wren', to: [31.6, 19.4], run: true, wait: true },
                  { qte: { kind: 'press', key: 'action', text: 'Grab it!', on: 'wren', time: 1.3, ok: [
                    { anim: 'wren', name: 'reach' },
                    { blocks: [[AR.atlas[0], 12, AR.atlas[1], 'air']] },
                    { carry: 'wren', item: 'atlas' },
                    { give: 'atlas' },
                  ] } },
                ],
              },
              { anim: 'wren', name: 'idle' },
              { carry: 'wren', item: 'atlas' },
              { say: 'ysolde', text: '...You took it. Of course you did.', mood: 'surprised', shot: { close: 'ysolde' } },
              { say: 'ysolde', text: 'The last person who lifted that Atlas off its stand was my teacher. Keep it drier than she did.', mood: 'sad' },
              { say: 'partner', text: "I've got Ostin! Go, go!", mood: 'determined' },
              { anim: 'ostin', name: 'stand' },
            ] },
            { text: 'Leave it. Help Ostin.', label: 'Left the Atlas to help Ostin', set: { atlas: 'left' }, rel: { ostin: 1 }, remember: 'Ostin will remember that.', steps: [
              { place: 'wren', at: [31.4, 11, 40.4], face: 'ostin' },
              { anim: 'wren', name: 'crouch' },
              { shot: { close: 'ostin', dist: 2.2 } },
              { qte: { kind: 'mash', key: 'action', text: 'Pull him free!', count: 8, time: 3.2, on: 'ostin', ok: [], fail: [
                { say: 'partner', text: 'Here! Together. PULL!', mood: 'determined' },
              ] } },
              { anim: 'wren', name: 'stand' },
              { anim: 'ostin', name: 'stand' },
              { say: 'ostin', text: "You picked me over a magic book. I'm putting that on a banner. A big one.", mood: 'happy' },
              { say: 'ysolde', text: "Good. It's only paper. Go!", mood: 'neutral' },
            ] },
            { text: 'Leave it.', timeout: true, set: { atlas: 'left' }, steps: [
              { think: "I can't... There's no time." },
              { sfx: 'break' },
              { fx: 'splash', at: [32.5, 13, 18.5], radius: 2 },
              { blocks: [[AR.atlas[0], 12, AR.atlas[1], 'air']] },
              { think: 'The water took it. Gone.' },
              { say: 'partner', text: "Wren! Help me with Ostin! MOVE!", mood: 'angry' },
              { anim: 'ostin', name: 'stand' },
            ] },
          ],
          timer: 8,
          prompt: 'The Archive is flooding',
          major: { id: 'atlas', title: 'As the Archive flooded, the Atlas sat on its stand' },
        },
        { hold: 'wren', item: 'pickaxe' },
        ARM,
        {
          action: [
            { place: 'wren', at: [32.5, 11, 38.0], face: 0 },
            { place: 'ostin', at: [31.0, 11, 38.8], face: 0 },
            { place: 'partner', at: [34.0, 11, 38.6], face: 0 },
            { place: 'pepper', at: [32.0, 11, 39.6], face: 0 },
            { place: 'ysolde', at: [30.4, 11, 40.2], face: 0 },
            { spawn: 'gloam#4', kind: 'gloam', at: [38.5, 11, 37.5], face: 'wren' },
            { hold: 'wren', item: 'pickaxe' },
            { say: 'partner', text: "One got in! It's inside!", mood: 'surprised' },
            { shot: { ots: ['wren', 'gloam#4'] } },
            { move: 'gloam#4', to: [33.6, 38.2], speed: 6 },
            { qte: { kind: 'dir', key: 'left', text: 'Dodge!', on: 'wren', time: 1.2, ok: [{ anim: 'wren', name: 'dodge' }, { place: 'wren', at: [31.8, 11, 38.4] }] } },
            { face: 'wren', to: 'gloam#4' },
            { qte: { kind: 'press', key: 'action', text: 'Strike!', on: 'gloam#4', time: 1.2, ok: [
              { anim: 'wren', name: 'swing' }, { sfx: 'hit' }, { fx: 'poof', at: 'gloam#4' }, { hide: 'gloam#4' },
            ] } },
            { move: 'wren', to: [32.5, 41.0], run: true },
            { move: 'ostin', to: [31.2, 41.8], run: true },
            { move: 'partner', to: [33.8, 41.8], run: true },
            { move: 'ysolde', to: [30.2, 41.2], run: true },
            { move: 'pepper', to: [35.6, 40.4], run: true },
            { sfx: 'break' },
            { fx: 'shake', radius: 1.5 },
            { blocks: [[30, 11, 43, 'bookshelf'], [31, 11, 43, 'bookshelf'], [32, 11, 43, 'bookshelf'], [33, 11, 43, 'bookshelf'], [34, 11, 43, 'bookshelf'], [32, 12, 43, 'bookshelf']] },
            { fx: 'dust', at: [32.5, 11.5, 43.5], radius: 1.5 },
            { shot: { pos: [32.5, 13.8, 47], look: [32.5, 11.4, 40.5] } },
            { say: 'ostin', text: "A shelf came down! It's blocking the way to the lock!", mood: 'surprised' },
            { say: 'ostin', text: "I'm scared! I'm pushing anyway!", mood: 'determined', anim: 'build' },
            { qte: { kind: 'mash', key: 'action', text: 'Shove it!', count: 10, time: 3.4, on: 'wren', ok: [
              { anim: 'wren', name: 'build' },
              { blocks: [[31, 11, 43, 'air'], [32, 11, 43, 'air'], [33, 11, 43, 'air'], [32, 12, 43, 'air']] },
              { sfx: 'thud' },
              { fx: 'dust', at: [32.5, 11.5, 43.5], radius: 1 },
            ] } },
            { fx: 'splash', at: 'pepper', radius: 1 },
            { move: 'pepper', to: [37.6, 39.4], speed: 3 },
            { say: 'partner', text: "Pepper! The water's dragging her off!", mood: 'surprised' },
            { qte: { kind: 'dir', key: 'right', text: 'Grab Pepper!', on: 'pepper', time: 1.3, ok: [
              { anim: 'wren', name: 'reach' },
              { place: 'pepper', at: [33.4, 11, 42.2], face: 180 },
              { anim: 'pepper', name: 'jump' },
            ] } },
            { qte: { kind: 'seq', keys: ['up', 'up', 'action'], text: 'Run for the lock!', on: 'wren', time: 1.3, ok: [
              { place: 'wren', at: [32.5, 11, 45.2], face: 180 },
              { place: 'ostin', at: [31.4, 11, 46.4], face: 180 },
              { place: 'partner', at: [33.6, 11, 46.2], face: 180 },
              { place: 'pepper', at: [32.6, 11, 47.6], face: 180 },
              { place: 'ysolde', at: [30.0, 11, 45.0], face: 180 },
            ] } },
          ],
        },
        { music: 'tension' },
        { place: 'wren', at: [32.5, 11, 45.2], face: -90 },
        { place: 'ysolde', at: [29.6, 11, 44.6], face: 180 },
        { shot: { pos: [34.6, 13.4, 47.6], look: [29.5, 12, 44.5] } },
        { anim: 'ysolde', name: 'reach' },
        { say: 'ysolde', text: 'This lever opens the outer door. But only while somebody holds it down.', mood: 'neutral' },
        { say: 'ysolde', text: 'Let go, and both doors slam shut, and the Archive seals itself. Whatever is inside stays inside.', mood: 'neutral' },
        { say: 'wren', text: 'Then who holds it?', mood: 'worried' },
        { say: 'ysolde', text: "I've held these doors for three hundred years. I can manage three more minutes.", mood: 'smug' },
        J([
          { say: 'juno', text: 'No. No more people getting left behind. Not one more.', mood: 'angry' },
        ], [
          { say: 'bram', text: "We're not leaving you! That's not how it works! That's not how any of this works!", mood: 'angry' },
        ]),
        {
          choice: [
            { text: 'Come with us. Please. We need you.', label: 'Begged Ysolde to come', set: { ysolde: 'came' }, rel: { ysolde: 2 }, remember: 'Ysolde will remember that.', steps: [
              { say: 'ysolde', text: "Need me. Nobody's needed me in a hundred years.", mood: 'surprised' },
              { say: 'ysolde', text: '...And the lever? Somebody still has to hold it.', mood: 'neutral' },
              { say: 'ostin', text: "Not somebody. Something. Hang on. HANG ON.", mood: 'determined' },
              { hold: 'ostin', item: 'wrench' },
              { move: 'ostin', to: [29.6, 45.4], run: true, wait: true },
              { anim: 'ostin', name: 'build' },
              { sfx: 'place' },
              { fx: 'sparks', at: [29.5, 12.5, 46.5] },
              { say: 'ostin', text: "Wrench. Wedged. Jammed tight. It'll hold! Probably! Mostly!", mood: 'happy' },
              { say: 'ysolde', text: 'Clever boy.', mood: 'smug' },
              { say: 'ysolde', text: 'But if the doors never close, my Archive drowns.', mood: 'sad' },
              { say: 'wren', text: 'Books can be rewritten. You said so.', mood: 'determined' },
              { say: 'ysolde', text: '...I did say that. Insufferable child.', mood: 'happy' },
              { set: { ostin_jam: true } },
            ] },
            { text: 'Thank you, Keeper.', label: 'Let Ysolde hold the doors', set: { ysolde: 'stayed' }, rel: { ysolde: 1 }, steps: [
              { say: 'ysolde', text: "Don't thank me. Just don't waste it.", mood: 'neutral' },
              { say: 'ysolde', text: 'Go to Iron Hollow. Find the Ember before they do.', mood: 'determined' },
              { say: 'ysolde', text: "And Wren. If you meet the one with the staff, don't believe everything they draw.", mood: 'sad' },
            ] },
          ],
          prompt: 'Ysolde means to stay behind',
          major: { id: 'ysolde', title: 'Keeper Ysolde offered to hold the doors' },
        },
        { sfx: 'door' },
        { fill: { from: [31, 11, 56], to: [33, 13, 56], block: 'air' } },
        { fx: 'bubbles', at: [32.5, 12, 55.5], radius: 2 },
        { sfx: 'splash' },
        { shot: 'lock' },
        {
          if: 'ysolde=came',
          then: [
            { move: 'ysolde', to: [32.0, 51.6], run: true },
            { move: 'ostin', to: [31.4, 52.8], run: true },
            { move: 'partner', to: [33.4, 52.4], run: true },
            { move: 'pepper', to: [32.6, 53.6], run: true },
            { move: 'wren', to: [32.5, 50.2], run: true, wait: true },
            { shot: 'wide' },
            { sfx: 'splash' },
            { blocks: archiveFlood(12) },
            { wait: 0.8 },
            { blocks: archiveFlood(13) },
            { fx: 'shake', radius: 1 },
            { think: "Behind us, the Archive fills with water. Every shelf. Every lamp. Ysolde doesn't look back." },
          ],
          else: [
            { move: 'ostin', to: [31.4, 52.8], run: true },
            { move: 'partner', to: [33.4, 52.4], run: true },
            { move: 'pepper', to: [32.6, 53.6], run: true },
            { move: 'wren', to: [32.5, 50.2], run: true, wait: true },
            { face: 'wren', to: 0 },
            { shot: { pos: [32.5, 12.6, 52.5], look: [31, 11.8, 44.5] } },
            { say: 'ysolde', text: 'Go on. Shoo. You are dripping on my floor again.', mood: 'smug' },
            { sfx: 'door' },
            { fill: { from: [31, 11, 47], to: [33, 13, 47], block: 'iron' } },
            { fx: 'shake', radius: 1 },
            { think: 'The door slammed. The last thing I saw was her hand, steady on the lever.' },
          ],
        },
        { set: { dome_broken: true } },
        { fade: 'out', dur: 1.2 },
        { scene: 'shore' },
      ],
    },
    // ------------------------------------------------------------------
    {
      id: 'shore',
      title: 'The Shore',
      set: 'glasswater',
      sky: 'dusk',
      music: 'sad',
      cast: {
        wren: { at: [45.5, 64.6], face: 180 },
        ostin: { at: [43.6, 65.8], face: 160 },
        partner: { at: [47.4, 65.4], face: -160 },
        pepper: { at: [44.6, 63.4], face: 180 },
        ysolde: { at: [42.0, 64.4], face: 150, hidden: true },
        seren: { at: [48.5, 27, 51.5], face: 0, hidden: true, item: 'staff' },
        captive: { at: [62.4, 27, 48.2], face: -35, hidden: true },
        'gloam#1': { at: [61.2, 27, 46.4], face: -35, hidden: true },
        'gloam#2': { at: [64.2, 27, 47.4], face: -35, hidden: true },
        'gloam#3': { at: [47.4, 27, 53.0], face: 0, hidden: true },
        'gloam#4': { at: [49.6, 27, 53.2], face: 0, hidden: true },
      },
      steps: [
        { if: 'ysolde=came', then: [{ show: 'ysolde' }] },
        { shot: 'surface' },
        { sfx: 'splash' },
        { fx: 'splash', at: [46, 25.6, 61], radius: 3 },
        { narrate: 'They broke the surface at sunset, gasping, and swam until their feet found sand.' },
        { anim: 'pepper', name: 'spin' },
        { fx: 'splash', at: 'pepper', radius: 1 },
        { shot: { two: ['wren', 'ostin'] } },
        { say: 'ostin', text: "Air. Actual air. I'm never complaining about air again.", mood: 'happy' },
        { if: 'atlas=taken', then: [
          { carry: 'wren', item: 'atlas' },
          { think: "The Atlas is soaked through. But it's whole." },
        ] },
        {
          if: 'ysolde=came',
          then: [
            { say: 'ysolde', text: "The sky. I'd forgotten how much of it there is.", mood: 'surprised', shot: { close: 'ysolde' } },
            { say: 'ysolde', text: 'It looks smaller than I remember. And more cracked.', mood: 'sad' },
            { shot: 'lake' },
            { wait: 1.5 },
            { say: 'ysolde', text: 'My Archive...', mood: 'sad' },
            {
              choice: [
                { text: "We'll rebuild it. Someday. I promise.", rel: { ysolde: 1 }, steps: [
                  { say: 'ysolde', text: 'Builders. Always promising to rebuild things. ...Thank you.', mood: 'sad' },
                ] },
                { text: "I'm sorry, Keeper.", steps: [
                  { say: 'ysolde', text: "Don't be. A library is only paper. The readers are what matter. Annoyingly.", mood: 'neutral' },
                ] },
              ],
              timer: 8,
            },
          ],
          else: [
            { shot: 'lake' },
            { wait: 1.5 },
            { think: 'Down there, through the dark water... one light. Still burning.' },
            { say: 'partner', text: "She's still down there. Holding it.", mood: 'sad' },
            { say: 'wren', text: "She'll hold. She said so.", mood: 'determined' },
          ],
        },
        // the Cartographer
        { sfx: 'gloam' },
        { music: 'tension' },
        { show: 'captive' }, { show: 'gloam#1' }, { show: 'gloam#2' },
        { shot: 'islet', dur: 1.5 },
        { wait: 1.5 },
        J([
          { say: 'bram', text: "Wren! Hi! Over here! I'm okay! Mostly okay!", mood: 'happy', anim: 'wave', shot: 'islet' },
          { say: 'juno', text: 'Bram!', mood: 'surprised', shot: { close: 'juno' } },
        ], [
          { say: 'juno', text: 'Wren! Took you long enough! Did you stop for a picnic?', mood: 'angry', anim: 'wave', shot: 'islet' },
          { say: 'bram', text: 'Juno! JUNO!', mood: 'surprised', shot: { close: 'bram' } },
        ]),
        { move: 'partner', to: [47.6, 63.0], run: true },
        { show: 'seren', at: [48.5, 27, 51.5], face: 0 },
        { fx: 'poof', at: 'seren', radius: 1.5 },
        { sfx: 'whoosh' },
        { show: 'gloam#3' }, { show: 'gloam#4' },
        { shot: 'jetty' },
        { move: 'seren', to: [48.5, 58.4], wait: true },
        { move: 'gloam#3', to: [47.4, 56.6] },
        { move: 'gloam#4', to: [49.6, 56.8] },
        { face: 'seren', to: 'wren' },
        { shot: 'standoff', dur: 1 },
        { say: 'seren', text: "That's far enough, I think. For both of us." },
        { say: 'seren', text: "Wren of Kettlebrook. You've been reading.", shot: { close: 'seren', dist: 2.6 } },
        { say: 'ostin', text: "That's them. The staff. The mask. The general... aura.", mood: 'worried' },
        {
          if: 'told_stranger',
          then: [
            { say: 'seren', text: "You told me yourself, at the fair. 'A crystal. It hums.' You were very helpful." },
            { think: 'The grey traveler. It was them. All along.' },
            J([
              { say: 'juno', text: 'You TOLD them? You told a stranger about it?', mood: 'angry' },
            ], [
              { say: 'bram', text: 'Wren... you showed them? At the fair?', mood: 'hurt' },
            ]),
            {
              choice: [
                { text: "I didn't know who they were!", steps: [
                  { say: 'partner', text: "...Yeah. None of us did.", mood: 'sad' },
                ] },
                { text: 'Not now.', rel: { partner: -1 }, steps: [
                  { say: 'partner', text: 'Fine. Later. But we ARE talking about it.', mood: 'angry' },
                ] },
                { text: '...Yeah. I did.', rel: { partner: 1 }, steps: [
                  { say: 'partner', text: 'At least you own it.', mood: 'neutral' },
                ] },
              ],
              timer: 7,
            },
          ],
          else: [
            { say: 'seren', text: "At the fair, you wouldn't tell me what your dog dug up. Well done. It bought you almost a week." },
            { think: 'The grey traveler. The one who asked about the shard. It was them.' },
          ],
        },
        {
          if: 'ysolde=came',
          then: [
            { face: 'seren', to: 'ysolde' },
            { say: 'seren', text: "Keeper. Out in the air at last. Still guarding other people's books?", shot: { two: ['seren', 'ysolde'] } },
            { say: 'ysolde', text: "Still drawing other people's borders?", mood: 'angry' },
            { say: 'seren', text: 'Someone has to.' },
            { think: "They know each other. They REALLY know each other." },
            { face: 'seren', to: 'wren' },
          ],
        },
        { say: 'seren', text: 'I will be brief. The world is coming apart at the edges, and the light on your hill is not the cure.' },
        { say: 'seren', text: 'I am drawing something better. Smaller. Steadier. For that, I need the Keystone.' },
        { say: 'seren', text: 'You want {captive}. I want the crystal in your pocket.' },
        { say: 'seren', text: 'Give it to me, and {captive} walks across this water to you. Tonight. Unharmed.' },
        { shot: 'islet' },
        J([
          { say: 'bram', text: "Wren, don't! I mean, I'd love to come home. But DON'T. It's not worth it!", mood: 'worried', shot: 'islet' },
        ], [
          { say: 'juno', text: "Don't you DARE, Wren! It's a trap! Everything in a mask is a trap!", mood: 'angry', shot: 'islet' },
        ]),
        { shot: { two: ['wren', 'partner'] } },
        J([
          { say: 'juno', text: "Wren. Bram's right there.", mood: 'hurt' },
          { say: 'juno', text: "Don't look at me. I can't make this one for you.", mood: 'hurt' },
        ], [
          { say: 'bram', text: "We could have her back. Right now. Tonight.", mood: 'sad' },
          { say: 'bram', text: "...But she'd never forgive us. She'd never forgive ME.", mood: 'hurt' },
        ]),
        { sfx: 'heart' },
        { fx: 'glow', at: 'wren', radius: 0.4, color: '#7ff2e4' },
        { shot: { close: 'wren', dist: 2.2, side: -0.4 } },
        { think: "The Keystone is so warm it almost hurts." },
        {
          choice: [
            { text: "No deal. We'll take {captive} back ourselves.", label: 'Refused, defiantly', set: { answer: 'defiant' }, rel: { seren: -1, captive: 1 }, remember: '{captive} will remember that.', steps: [
              { say: 'wren', text: "And when we do, you'd better be somewhere far away.", mood: 'angry' },
              { say: 'seren', text: "Brave. Brave is easy, when it's someone else in the cage." },
              J([
                { say: 'bram', text: "Yeah! YEAH! ...Wait, was that the right answer? It FELT like the right answer!", mood: 'happy' },
              ], [
                { say: 'juno', text: "THAT'S what I'm talking about!", mood: 'happy' },
              ]),
            ] },
            { text: 'Let {captive} go first. Then we talk.', label: 'Tried to bargain', set: { answer: 'bargain' }, rel: { seren: 1 }, steps: [
              { say: 'seren', text: 'Ha. A trader. You would do well in Iron Hollow.' },
              { say: 'seren', text: 'But no. Trust is the one thing I have never been able to draw.' },
              J([
                { say: 'bram', text: "Wren? You weren't really going to... were you?", mood: 'worried' },
              ], [
                { say: 'juno', text: "Wren! Don't you dare bargain for me!", mood: 'angry' },
              ]),
            ] },
            { text: '[Say nothing. Hold the Keystone tight.]', label: 'Said nothing', set: { answer: 'silent' }, rel: { seren: 1 }, steps: [
              { wait: 1.2 },
              { say: 'seren', text: "Silence. Good. You're thinking. Most people never do." },
              { say: 'seren', text: 'Think harder, Wren. Think about what that light on your hill is really for.' },
            ] },
            { text: '...', timeout: true, set: { answer: 'silent' }, rel: { seren: 1 }, steps: [
              { wait: 1.2 },
              { say: 'seren', text: "Silence. Good. You're thinking. Most people never do." },
              { say: 'seren', text: 'Think harder, Wren. Think about what that light on your hill is really for.' },
            ] },
          ],
          timer: 14,
          prompt: 'The Cartographer wants the Keystone',
          major: { id: 'answer', title: 'On the shore, the Cartographer offered a trade' },
        },
        { face: 'seren', to: 90 },
        { shot: 'east', dur: 2 },
        { say: 'seren', text: 'Very well. There is more than one way to empty a lamp.' },
        { face: 'seren', to: 'wren' },
        { say: 'seren', text: 'Iron Hollow, then.', shot: { close: 'seren', dist: 2.4 } },
        { anim: 'seren', name: 'cast' },
        { sfx: 'whoosh' },
        { shot: 'islet' },
        J([
          { say: 'bram', text: "Wren! Tell Nana I'm eating my vegetab—", mood: 'surprised', shot: 'islet' },
        ], [
          { say: 'juno', text: 'Wren! Find the—', mood: 'surprised', shot: 'islet' },
        ]),
        { fx: 'poof', at: 'captive', radius: 2 },
        { fx: 'poof', at: 'gloam#1', radius: 1.5 },
        { fx: 'poof', at: 'gloam#2', radius: 1.5 },
        { hide: 'captive' }, { hide: 'gloam#1' }, { hide: 'gloam#2' },
        { shot: 'jetty' },
        { fx: 'poof', at: 'seren', radius: 2 },
        { fx: 'poof', at: 'gloam#3', radius: 1.5 },
        { fx: 'poof', at: 'gloam#4', radius: 1.5 },
        { hide: 'seren' }, { hide: 'gloam#3' }, { hide: 'gloam#4' },
        { wait: 1 },
        { music: 'sad' },
        { shot: { close: 'partner' } },
        J([
          { say: 'juno', text: 'Bram... BRAM!', mood: 'hurt' },
          { say: 'juno', text: "...He waved. The idiot waved at us. Like it was a fair day.", mood: 'sad' },
        ], [
          { say: 'bram', text: 'Juno...', mood: 'sad' },
          { say: 'bram', text: 'She was so close. I could have thrown a peg at her.', mood: 'sad' },
        ]),
        {
          if: 'ysolde=came',
          then: [
            { say: 'ysolde', text: "She's going for the Ember.", mood: 'worried', shot: { close: 'ysolde' } },
            { say: 'ysolde', text: "...They. They're going for the Ember.", mood: 'neutral' },
            { think: "She said 'she.'" },
          ],
          else: [
            { say: 'ostin', text: "Iron Hollow. They're going for the Ember Anchor. Before we can.", mood: 'worried' },
          ],
        },
        {
          if: 'answer=defiant',
          then: [{ say: 'partner', text: 'You told them no. To their mask. I keep thinking about it.', mood: 'determined' }],
          else: [{
            if: 'answer=bargain',
            then: [{ say: 'partner', text: "You'd have traded with them. ...I don't know how I feel about that yet.", mood: 'neutral' }],
            else: [{ say: 'partner', text: "You didn't say a word. Why? What were you thinking?", mood: 'worried' }],
          }],
        },
        { say: 'ostin', text: "Okay. Okay okay okay. Iron Hollow is a week's walk east. Through the mountains. With the rails.", mood: 'worried' },
        {
          if: 'camp_ostin=shared',
          then: [{ say: 'ostin', text: "And I'm scared. And I'm coming. Both. At the same time. Like you said.", mood: 'determined' }],
          else: [{ say: 'ostin', text: "Which is terrifying. Obviously. I'm coming anyway. Obviously.", mood: 'determined' }],
        },
        {
          choice: [
            { text: 'Then we beat them there.', rel: { partner: 1 }, steps: [
              { say: 'partner', text: 'Then we beat them there.', mood: 'determined' },
            ] },
            { text: "And this time, we bring {captive} home.", rel: { partner: 1, ostin: 1 }, steps: [
              J([
                { say: 'juno', text: "This time. Yeah. And I'm still hugging him only once.", mood: 'determined' },
              ], [
                { say: 'bram', text: "This time. I'm bringing extra pegs.", mood: 'determined' },
              ]),
            ] },
            { text: "First, somebody's making a fire. I'm freezing.", steps: [
              { say: 'ostin', text: "Finally. A plan I fully understand.", mood: 'happy' },
            ] },
          ],
          timer: 9,
        },
        { shot: 'east', dur: 3 },
        { anim: 'pepper', name: 'bark' },
        { say: 'pepper', text: 'Wuff!', anim: 'bark' },
        { say: 'wren', text: 'Hold on, {captive}. Iron Hollow, then.', mood: 'determined' },
        { fade: 'out', dur: 1.5 },
        { title: 'To be continued…', sub: 'Next: Iron Hollow' },
        { end: true },
      ],
    },
  ],
};
