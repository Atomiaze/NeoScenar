import { useEffect, useRef, useState } from 'react'
import { SECONDS_PER_SCREEN, type PlacedLayout } from '../../shared/credits/creditsLayout'
import { fr } from '../i18n/fr'
import { drawItems } from './creditsDrawing'

const t = fr.creditsExport

/** Largeur de l'écran d'aperçu, en pixels de l'interface. */
const SCREEN_WIDTH = 440

/** Dessine une mise en page réduite à `width` pixels (nets sur un écran Retina). */
function LayoutCanvas({
  layout,
  logos,
  width,
  label
}: {
  layout: PlacedLayout
  logos: Map<string, ImageBitmap>
  width: number
  label: string
}) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const scale = width / layout.width
  const height = Math.max(1, Math.round(layout.height * scale))
  useEffect(() => {
    const element = canvas.current
    const context = element?.getContext('2d')
    if (!element || !context) return
    const ratio = window.devicePixelRatio || 1
    element.width = Math.round(width * ratio)
    element.height = Math.round(height * ratio)
    context.clearRect(0, 0, element.width, element.height)
    drawItems(context, layout.items, logos, { scale: scale * ratio })
  }, [layout, logos, width, height, scale])
  return (
    <canvas
      ref={canvas}
      role="img"
      aria-label={label}
      style={{ width: `${width}px`, height: `${height}px` }}
    />
  )
}

/**
 * Écran au format du projet où le déroulant passe de bas en haut, à la vitesse réelle (une ligne
 * traverse l'écran en 8 s). On peut aussi faire défiler à la main.
 */
export function RollPreview({
  layout,
  logos,
  screen
}: {
  layout: PlacedLayout
  logos: Map<string, ImageBitmap>
  screen: { width: number; height: number }
}) {
  const scroller = useRef<HTMLDivElement>(null)
  const [playing, setPlaying] = useState(false)
  const screenHeight = Math.round((SCREEN_WIDTH * screen.height) / screen.width)

  useEffect(() => {
    if (!playing) return
    const element = scroller.current
    if (!element) return
    const speed = screenHeight / SECONDS_PER_SCREEN // pixels de l'aperçu par seconde
    let last = performance.now()
    let position = element.scrollTop
    let frame = requestAnimationFrame(function step(now) {
      position += ((now - last) / 1000) * speed
      last = now
      element.scrollTop = position
      if (position >= element.scrollHeight - element.clientHeight) setPlaying(false)
      else frame = requestAnimationFrame(step)
    })
    return () => cancelAnimationFrame(frame)
  }, [playing, screenHeight])

  const play = (): void => {
    const element = scroller.current
    if (!playing && element && element.scrollTop >= element.scrollHeight - element.clientHeight - 1)
      element.scrollTop = 0
    setPlaying(!playing)
  }

  return (
    <div className="credits-preview">
      <div
        ref={scroller}
        className="credits-screen"
        style={{ width: `${SCREEN_WIDTH}px`, height: `${screenHeight}px` }}
        onWheel={() => setPlaying(false)}
      >
        {/* Le déroulant entre par le bas et sort par le haut : un écran vide avant et après. */}
        <div style={{ height: `${screenHeight}px` }} />
        <LayoutCanvas layout={layout} logos={logos} width={SCREEN_WIDTH} label={t.preview} />
        <div style={{ height: `${screenHeight}px` }} />
      </div>
      <button type="button" className="tool-button" onClick={play}>
        {playing ? t.pause : t.play}
      </button>
    </div>
  )
}

/** Vignettes des cartons de début, sur un fond qui montre la transparence. */
export function CardsPreview({
  cards,
  logos
}: {
  cards: { name: string; layout: PlacedLayout }[]
  logos: Map<string, ImageBitmap>
}) {
  if (cards.length === 0) return null
  return (
    <div className="credits-cards-preview" aria-label={t.previewCards}>
      {cards.map(({ name, layout }) => (
        <figure key={name} className="credits-card-thumb">
          <LayoutCanvas layout={layout} logos={logos} width={136} label={name} />
          <figcaption>{name}</figcaption>
        </figure>
      ))}
    </div>
  )
}
