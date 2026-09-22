import { useEffect } from 'preact/hooks'
import { boot, frame, tab, sheet, game, goTo, type Tab } from './store'
import { Toasts } from './primitives'
import { fmt, fmtRate, fmtDuration } from '@/engine/numbers'
import { bandProgress, nextBand } from '@/systems/grow'
import { SceneHost } from './SceneHost'
import { GrowTab } from './tabs/GrowTab'
import { FolkTab } from './tabs/FolkTab'
import { CraftTab } from './tabs/CraftTab'
import { SeasonTab } from './tabs/SeasonTab'
import { MoreTab } from './tabs/MoreTab'
import { Sheets } from './Sheets'

const TABS: { id: Tab; label: string; glyph: string; testid: string }[] = [
  { id: 'grow', label: 'Grow', glyph: '🌳', testid: 'tab-grow' },
  { id: 'folk', label: 'Folk', glyph: '🏠', testid: 'tab-build' },
  { id: 'craft', label: 'Craft', glyph: '⚒️', testid: 'tab-craft' },
  { id: 'season', label: 'Season', glyph: '🍂', testid: 'tab-ascend' },
  { id: 'more', label: 'More', glyph: '✨', testid: 'tab-shop' },
]

export function App() {
  useEffect(() => { boot() }, [])
  void frame.value
  return (
    <div class="app">
      <TopBar />
      <SceneHost />
      <Compass />
      <div class="panel" data-tab={tab.value}>
        {tab.value === 'grow' && <GrowTab />}
        {tab.value === 'folk' && <FolkTab />}
        {tab.value === 'craft' && <CraftTab />}
        {tab.value === 'season' && <SeasonTab />}
        {tab.value === 'more' && <MoreTab />}
      </div>
      <nav class="nav">
        {TABS.map((t) => (
          <button key={t.id} class={`nav-btn${tab.value === t.id ? ' active' : ''}`} data-testid={t.testid} onClick={() => goTo(t.id)} aria-label={t.label}>
            <span class="nav-glyph">{t.glyph}</span><span class="nav-label">{t.label}</span>
          </button>
        ))}
      </nav>
      <Toasts />
      <Sheets />
    </div>
  )
}

function TopBar() {
  const s = game.s
  const band = game.band
  const nb = nextBand(game.ci, s.height)
  const prog = bandProgress(game.ci, s.height)
  const shown = game.ci.raw.resources.filter((r) => r.id !== game.base && !r.persistent && (s.res[r.id] ?? 0) > 0).sort((a, b) => b.tier - a.tier).slice(0, 3)
  return (
    <header class="topbar">
      <div class="top-row">
        <div class="height" onClick={() => (sheet.value = 'stats')}>
          <span class="height-glyph">{band.glyph}</span>
          <div>
            <div class="height-val num">{Math.floor(s.height)} m</div>
            <div class="height-band">{band.name}{nb ? ` → ${nb.name} ${Math.round(prog * 100)}%` : ''}</div>
          </div>
        </div>
        <div class="sap">
          <div class="sap-val num" data-testid="sap">{fmt(s.res[game.base] ?? 0)} <span class="sap-glyph">💧</span></div>
          <div class="sap-rate num">{fmtRate(game.baseRate)}</div>
        </div>
      </div>
      <div class="band-bar"><div class="band-fill" style={{ width: `${prog * 100}%`, background: band.leaf }} /></div>
      {shown.length > 0 && (
        <div class="res-row">
          {shown.map((r) => <span key={r.id} class="res-chip num" title={r.name}>{r.glyph} {fmt(s.res[r.id] ?? 0)}</span>)}
          {s.cosmetics.petals > 0 && <span class="res-chip num petals">🌸 {s.cosmetics.petals}</span>}
        </div>
      )}
    </header>
  )
}

function Compass() {
  const g = game.goals.primary
  if (!g) return <div class="compass compass-empty">Tap the trunk to begin</div>
  const bn = g.bottleneck
  const res = game.ci.resources.get(bn.id)
  const pct = bn.need > 0 ? Math.min(1, bn.have / bn.need) : 1
  const tabFor: Record<string, Tab> = { grow: 'grow', hatch: 'folk', craft: 'craft', tree: 'season' }
  return (
    <button class={`compass${g.ready ? ' ready' : ''}`} onClick={() => goTo(tabFor[g.tab] ?? 'grow', g.id)} data-testid="compass">
      <span class="compass-glyph">{g.glyph}</span>
      <span class="compass-body">
        <span class="compass-name">{g.ready ? '✓ ' : ''}{g.name}</span>
        <span class="compass-bar"><span class="compass-fill" style={{ width: `${pct * 100}%` }} /></span>
        <span class="compass-meta num">{res?.glyph} {fmt(bn.have, { int: true })}/{fmt(bn.need, { int: true })}{g.hint ? ` · ${g.hint}` : ''}</span>
      </span>
      <span class="compass-eta num">{g.ready ? 'Ready' : Number.isFinite(g.eta) ? `~${fmtDuration(g.eta)}` : '—'}</span>
    </button>
  )
}
