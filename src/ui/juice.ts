/** Non-scene feedback: toasts, haptics, audio, unlock cards. Installed once. */
import type { Game } from '@/engine/game'
import { toast } from './primitives'
import { haptic } from '@/engine/haptics'
import { audio, unlockAudio } from '@/engine/audio'
import { raiseCard } from './Sheets'
import { goTo, sheet } from './store'
import { fmt } from '@/engine/numbers'

let installed = false
export function installJuice(game: Game) {
  if (installed) return
  installed = true
  const ci = game.ci
  let lastStrikeHaptic = 0
  const on = game.events.on.bind(game.events)
  document.addEventListener('pointerdown', unlockAudio, { once: true })
  on('strike', (e) => { const t = performance.now(); if (t - lastStrikeHaptic > 60) { lastStrikeHaptic = t; haptic(e.crit ? 'heavy' : 'light') } if (e.crit) audio.crit(); else audio.strike(e.thrum) })
  on('resonance', () => { haptic('medium'); audio.resonance() })
  on('grow', () => { haptic('medium'); audio.grow() })
  on('line', (e) => { haptic('heavy'); toast(`${e.name} — the sky changes`, 'reward', '🌄', 3200) })
  on('ritual', (e) => { haptic('heavy'); audio.ritual(); toast(`${e.name} opens!`, 'reward', '🌳', 3500) })
  on('goal', (e) => { if (!e.got) return; audio.chime('goal'); const parts: string[] = []; if (e.got.fireflies) parts.push(`+${e.got.fireflies} ✨`); if (e.got.glimmer) parts.push(`+${e.got.glimmer} 🫙`); if (e.got.chest) parts.push('chest dropped'); if (e.got.landmark) parts.push(`landmark: ${ci.landmarks.get(e.got.landmark)?.name}`); toast(`✓ ${e.goal.name}${parts.length ? ' · ' + parts.join(' ') : ''}`, 'good', '📍') })
  on('milestone', (e) => { if (e.def.celebration !== 'small') { haptic('medium'); audio.chime('milestone') } const parts: string[] = []; if (e.got.fireflies) parts.push(`+${e.got.fireflies} ✨`); if (e.got.glimmer) parts.push(`+${e.got.glimmer} 🫙`); if (e.got.token) parts.push('x2 for 10 min'); toast(`${e.def.glyph} ${e.def.name}${parts.length ? ' · ' + parts.join(' ') : ''}`, 'reward') })
  on('chest', (e) => { haptic('heavy'); audio.chime('chest'); const g = e.got; const parts: string[] = []; if (g.resources?.[game.base]) parts.push(`+${fmt(g.resources[game.base]!)} 💧`); if (g.fireflies) parts.push(`+${g.fireflies} ✨`); if (g.glimmer) parts.push(`+${g.glimmer} 🫙`); if (g.token) parts.push('x2 token'); toast(`${e.tier} chest: ${parts.join(' · ')}`, 'reward', '🎁', 3200) })
  on('chestDropped', (e) => toast(`A ${e.tier} chest dropped on the tree — tap it 3 times`, 'info', '🎁'))
  on('cosmetic', (e) => { const c = ci.cosmetics.get(e.id); if (!c) return; if (e.how === 'earned' || e.how === 'crafted') { haptic('success'); audio.chime('unlock'); raiseCard(`${c.glyph} New: ${c.name}`, c.desc || 'A new cosmetic for your tree.', { label: 'Equip', run: () => game.equip(e.id) }) } })
  on('workshop', (e) => { const w = ci.workshops.get(e.id); if (w) { haptic('success'); audio.chime('unlock'); toast(`${w.glyph} ${w.name} built — tap its hut to craft`, 'good') } })
  on('producer', (e) => { if (e.foreman) { haptic('success'); audio.chime('unlock'); const p = ci.producers.get(e.id); raiseCard('👷 Foreman hired', `${ci.workshops.get(p?.station ?? '')?.name ?? 'The workshop'} now crafts on its own. Taps boost — Folk build.`) } })
  on('milestoneMult', (e) => { haptic('medium'); toast(`${ci.producers.get(e.id)?.name} reaches ${e.count} — output jumps!`, 'reward', '🎉') })
  on('rune', (e) => { haptic('success'); toast(`${ci.runes.get(e.id)?.name} carved (tier ${e.tier})`, 'good', '🔷') })
  on('annex', (e) => { if (e.level <= 1) { haptic('success'); toast(`${ci.annexes.get(e.id)?.name} built on a new limb`, 'good', '🌿') } })
  on('handcraft', (e) => { if (e.masterwork) { haptic('success'); audio.chime('masterwork') } else haptic('light') })
  on('discovery', (e) => { if (e.success) { haptic('success'); audio.chime('discovery') } })
  on('setpiece', (e) => { if (e.kind === 'spawned') toast(`${ci.setPieces.get(e.id ?? '')?.name ?? 'Something'} appears — tap it!`, 'info', ci.setPieces.get(e.id ?? '')?.glyph); if (e.kind === 'done') { haptic('success'); audio.chime('chest'); const g = e.got; toast(`${ci.setPieces.get(e.id ?? '')?.name}: ${g?.resources ? Object.entries(g.resources).map(([r, n]) => `+${fmt(n)} ${ci.resources.get(r)?.glyph}`).join(' ') : 'done!'}`, 'reward') } })
  on('turn', (e) => { haptic('heavy'); audio.turn(); raiseCard(`🌀 Season ${e.count + 1}: ${e.seasonName}`, `+${e.gained} Rings. Spend them in the Ring Tree.`, { label: 'Ring Tree', run: () => goTo('season', 'limb:roots') }) })
  on('offline', (b) => { const m = b.morningDew; if (m) toast(`Morning Dew: +${m.glimmer} 🫙 +${m.fireflies} ✨`, 'reward', '🌅', 4000); toast('Dawn Rush: strikes x3 for a minute', 'info', '☀️', 4000) })
  on('bloom', () => toast('The trunk blooms — a chest drops', 'reward', '🌸'))
  on('droplet', (e) => { if (e.caught) toast('Amber droplet: crafting x2 for 30 s', 'reward', '🟠') })
  on('wish', (e) => { haptic('success'); toast(`Wish granted: +${e.fireflies} ✨`, 'reward', '🌠') })
  on('firefly', (e) => { haptic('light'); if (e.count === 1) toast('Fireflies! Tap them at night for ✨', 'info', '✨') })
  on('thaw', (e) => { haptic('heavy'); toast(`Thawed: +${fmt(e.sap)} 💧`, 'reward', '🧊') })
  on('season', (e) => { if (e.kind === 'caravan_dock') { toast('A caravan docks at the stump', 'info', '🐫'); raiseCard('🐫 Caravan', 'Three offers for five minutes.', { label: 'Trade', run: () => (sheet.value = 'caravan') }) } else if (e.kind === 'storm_start') toast('A storm rolls in — the Rod charges', 'info', '🌩️'); else if (e.kind === 'bloom_start') toast('A blossom wave climbs the tree — tap the front to push it', 'info', '🌸'); else if (e.kind === 'snow') toast('Snowfall: crafting x2', 'info', '❄️'); else if (e.kind === 'gust') toast('A gust! Tap the leaves', 'info', '🍂') })
  on('kite', () => toast('A kite came home with a package', 'reward', '🪁'))
  on('expedition', (e) => { if (e.kind === 'sent') toast(`Expedition sent — back in ${e.hours} h`, 'info', '🧭'); else { haptic('success'); audio.chime('chest'); toast(`The expedition returned with a ${e.tier} chest`, 'reward', '🧭', 3500) } })
  on('chart', (e) => { haptic('success'); toast(`Sailing under ${e.id === 'raw' ? 'The Gatherer' : e.id === 'craft' ? 'The Loom' : e.id === 'night' ? 'The Lantern' : 'The Hammer'}`, 'reward', '🔭') })
  on('steward', (e) => { if (e.dialed.length) toast('The Head Steward adjusted feed dials', 'info', '🧑‍🌾') })
  on('night', (e) => { if (e.night) toast('Night falls — lanterns light, fireflies drift', 'info', '🌙') })
}
export default installJuice
