import { useState } from 'preact/hooks'
import { game, frame, sheet, preview, requestSeasonCard } from '../store'
import { Card, Row, Small, BuyButton } from '../cards'
import { toast } from '../primitives'
import { CATEGORIES, categoryLabel, swatch } from '../helpers'
import { products, purchase, applyPurchase, restore } from '@/engine/iap'
import type { CosmeticCategory, CosmeticDef } from '@/content/types'
import { DYE_COST } from '@/engine/game'

type Section = 'wardrobe' | 'market' | 'shop'

export function MoreTab() {
  void frame.value
  const [sec, setSec] = useState<Section>('wardrobe')
  const s = game.s
  return (
    <div class="tab-body">
      <div class="seg wide">
        {(['wardrobe', 'market', 'shop'] as Section[]).map((x) => <button key={x} class={`seg-btn${sec === x ? ' on' : ''}`} onClick={() => setSec(x)}>{x === 'wardrobe' ? '🏮 Wardrobe' : x === 'market' ? `✨ Market · ${s.fireflies}` : `🫙 Shop · ${s.glimmer}`}</button>)}
      </div>
      {sec === 'wardrobe' && <Wardrobe />}
      {sec === 'market' && <Market />}
      {sec === 'shop' && <Shop />}
      <Row class="wrap">
        <button class="btn" onClick={() => (sheet.value = 'waystone')}>🧭 Road ahead</button>
        <button class="btn" onClick={() => (sheet.value = 'stats')}>📊 Stats &amp; Codex</button>
        <button class="btn" onClick={() => (sheet.value = 'settings')}>⚙️ Settings</button>
        <button class="btn" onClick={() => { requestSeasonCard.value++ ; toast('Rendering your Season Card…', 'info', '🖼️') }}>🖼️ Season Card</button>
      </Row>
    </div>
  )
}

function Item({ c, action }: { c: CosmeticDef; action?: preact.ComponentChildren }) {
  const sw = swatch(c.params)
  const owned = game.ownsCosmetic(c.id)
  const equipped = game.s.cosmetics.equipped[c.category] === c.id
  return (
    <Row class="item" >
      <span class="swatch" style={sw ? { background: sw } : undefined}>{c.glyph}</span>
      <div class="grow1" onPointerDown={() => (preview.value = c.id)} onPointerUp={() => (preview.value = null)} onPointerLeave={() => (preview.value = null)}>
        <div>{c.name} {equipped && <span class="chip good">equipped</span>}{owned && !equipped && <span class="chip">owned</span>}</div>
        <Small>{c.desc}{!owned && c.earnedBy ? ` · ${c.earnedBy.startsWith('m_') || c.earnedBy.startsWith('g') ? 'earned in play' : c.earnedBy}` : ''}</Small>
      </div>
      {action}
    </Row>
  )
}

function Wardrobe() {
  const s = game.s, ci = game.ci
  const owned = ci.raw.cosmetics.filter((c) => s.cosmetics.owned.includes(c.id))
  const cats = CATEGORIES.filter((k) => owned.some((c) => c.category === k))
  const [catPick, setCat] = useState<CosmeticCategory | null>(null)
  const cat = catPick && cats.includes(catPick) ? catPick : cats[0] ?? 'tree'
  const list = owned.filter((c) => c.category === cat)
  return (
    <Card id="wardrobe">
      <div class="title">🏮 Wardrobe <span class="chip">{owned.length} owned</span></div>
      <Small>Hold an item to try it on the tree.</Small>
      <div class="chips">{cats.map((k) => <button key={k} class={`chip btnchip${cat === k ? ' on' : ''}`} onClick={() => setCat(k)}>{categoryLabel(k)}</button>)}</div>
      {list.length === 0 && <Small>Nothing here yet — play to earn cosmetics.</Small>}
      {list.map((c) => <Item key={c.id} c={c} action={s.cosmetics.equipped[c.category] === c.id ? <button class="btn sm" onClick={() => game.unequip(c.category)}>Unequip</button> : <button class="btn sm btn-primary" onClick={() => game.equip(c.id)}>Equip</button>} />)}
    </Card>
  )
}

function Market() {
  const s = game.s, ci = game.ci
  const featured = new Set(game.marketFeatured())
  const items = ci.raw.cosmetics.filter((c) => c.fireflyPrice != null && !s.cosmetics.owned.includes(c.id)).sort((a, b) => Number(featured.has(b.id)) - Number(featured.has(a.id)) || (a.fireflyPrice! - b.fireflyPrice!))
  const kites = ci.raw.cosmetics.filter((c) => c.craft && !s.cosmetics.owned.includes(c.id))
  return (
    <>
      <Card id="market">
        <div class="title">✨ Firefly Market <span class="chip">{s.fireflies} Fireflies</span></div>
        <Small>Earned only. Weekly featured picks marked ★. Every category always in stock.</Small>
        {items.map((c) => <Item key={c.id} c={c} action={<BuyButton label={`${featured.has(c.id) ? '★ ' : ''}${c.fireflyPrice} ✨`} disabled={s.fireflies < c.fireflyPrice!} onClick={() => { if (!game.buyCosmetic(c.id, 'fireflies')) toast('Not enough Fireflies', 'bad') }} />} />)}
      </Card>
      {Object.values(s.limbs).some((l) => l.includes('kite_yard')) && (
        <Card id="kiteyard"><div class="title">🪁 Kite Yard</div>
          <Small>Kites fly every 30 minutes and return with a package. Dye your lanterns any hue for {DYE_COST.lacquer} Lacquer.</Small>
          <Dye />
          {kites.map((c) => <Item key={c.id} c={c} action={<BuyButton label={`Craft · ${c.craft!.fireflies} ✨`} sub={Object.entries(c.craft!.cost).map(([r, n]) => `${ci.resources.get(r)?.glyph}${n}`).join(' ')} disabled={!game.canAfford(c.craft!.cost) || s.fireflies < c.craft!.fireflies} onClick={() => game.craftKite(c.id, c.craft!.cost, c.craft!.fireflies)} />} />)}
        </Card>
      )}
    </>
  )
}

function Shop() {
  const s = game.s, ci = game.ci
  const items = ci.raw.cosmetics.filter((c) => c.price != null && !s.cosmetics.owned.includes(c.id)).sort((a, b) => a.price! - b.price!)
  const [initials, setInitials] = useState(s.cosmetics.initials)
  const buy = async (sku: string) => { const p = products.find((x) => x.sku === sku)!; const r = await purchase(sku); if (r.ok) { applyPurchase(game, p, r.receipt, initials); toast(p.supporter ? 'Thank you, Keeper!' : `+${p.glimmer} Glimmer`, 'reward', '🫙') } else toast('Purchase not completed', 'info') }
  return (
    <>
      <Card id="shop">
        <div class="title">🫙 Glimmer Shop <span class="chip">{s.glimmer} Glimmer</span></div>
        <Small><b>Nothing here affects progress.</b> Glimmer buys cosmetics only. <button class="link" onClick={() => toast(`${restore(game).length} purchase(s) restored`, 'info')}>Restore purchases</button></Small>
        <Row class="wrap">{products.filter((p) => !p.supporter).map((p) => <button key={p.sku} class="btn" onClick={() => buy(p.sku)}>{p.title}<br /><small>{p.price}</small></button>)}</Row>
        {!s.cosmetics.supporter && <Row><div class="grow1"><div>🕯️ {products[4]!.title}</div><Small>{products[4]!.desc}</Small><input class="input" maxLength={3} placeholder="Initials for the plaque" value={initials} onInput={(e) => setInitials((e.target as HTMLInputElement).value)} /></div><button class="btn btn-primary" onClick={() => buy('supporter')}>{products[4]!.price}</button></Row>}
        <Small>Store integration is a placeholder on the web build (see src/engine/iap.ts).</Small>
      </Card>
      <Card id="bundles"><div class="title">🎁 Bundles</div>
        {ci.raw.bundles.map((b) => { const missing = b.items.filter((i) => !s.cosmetics.owned.includes(i))
          return <Row key={b.id}><div class="grow1"><div>{b.glyph} {b.name}</div><Small>{b.items.map((i) => ci.cosmetics.get(i)?.name).join(', ')}</Small></div><BuyButton label={missing.length ? `${b.price} 🫙` : 'Owned'} disabled={!missing.length || s.glimmer < b.price} onClick={() => game.buyBundle(b.id)} /></Row> })}
      </Card>
      <Card id="shopitems">{items.map((c) => <Item key={c.id} c={c} action={<BuyButton label={`${c.price} 🫙`} disabled={s.glimmer < c.price!} onClick={() => { if (!game.buyCosmetic(c.id, 'glimmer')) toast('Not enough Glimmer', 'bad') }} />} />)}</Card>
    </>
  )
}

function Dye() {
  const s = game.s
  const [hue, setHue] = useState(s.cosmetics.dyeHue)
  return (
    <Row><span class="swatch" style={{ background: hue }}>🏮</span><input class="grow1" type="color" value={hue} onInput={(e) => { const v = (e.target as HTMLInputElement).value; setHue(v); preview.value = null }} aria-label="Lantern hue" />
      <BuyButton label="Dye" sub={`🎨${DYE_COST.lacquer}`} disabled={(s.res.lacquer ?? 0) < DYE_COST.lacquer} onClick={() => { if (game.dyeLantern(hue)) toast('Lanterns dyed', 'reward', '🎨'); else toast('Not enough Lacquer', 'bad') }} /></Row>
  )
}
