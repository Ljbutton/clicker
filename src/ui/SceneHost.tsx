import { useEffect, useRef, useState } from 'preact/hooks'
import { game, frame, preview, requestSeasonCard, sheet } from './store'
import { createScene, type SceneHandle } from '@/scene/scene'
import { shareBlob } from './share'
import { toast } from './primitives'

/** Hosts the canvas scene and its DOM overlays: the "Now" pill, bough-jump dots, and the try-on/season-card hooks. */
export function SceneHost() {
  const ref = useRef<HTMLCanvasElement>(null)
  const handle = useRef<SceneHandle | null>(null)
  const [away, setAway] = useState(false)
  void frame.value
  useEffect(() => {
    const c = ref.current!
    const h = createScene(c, game, { reducedMotion: game.s.settings.reducedMotion })
    handle.current = h
    const onResize = () => h.resize()
    window.addEventListener('resize', onResize)
    const unsub = preview.subscribe((id) => h.preview(id))
    const unsubCard = requestSeasonCard.subscribe(async (n) => {
      if (!n) return
      const blob = await h.renderSeasonCard()
      if (blob) await shareBlob(blob, `hollowspire-season-${game.s.prestige.count + 1}.png`)
      else toast('Could not render the Season Card', 'bad')
    })
    return () => { window.removeEventListener('resize', onResize); unsub(); unsubCard(); h.destroy() }
  }, [])
  useEffect(() => { handle.current?.setQuality(sheet.value ? 'low' : game.s.settings.fps30 ? 'low' : 'high') }, [sheet.value])
  const boughs = game.ci.bands.filter((b) => game.s.boughs.includes(b.id))
  return (
    <div class="scene">
      <canvas ref={ref} class="scene-canvas" data-testid="tap-target" aria-label="The tree. Tap the trunk to strike." />
      {boughs.length > 1 && (
        <div class="bough-dots" aria-label="Jump to bough">
          {boughs.map((b) => <button key={b.id} class="bough-dot" title={b.name} onClick={() => { handle.current?.jumpToBough(b.id); setAway(true) }}>{b.glyph}</button>)}
        </div>
      )}
      {away && <button class="now-pill" onClick={() => { handle.current?.scrollToTip(); setAway(false) }}>Now ↑</button>}
    </div>
  )
}
