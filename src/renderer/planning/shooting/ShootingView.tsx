import { useEffect, useMemo } from 'react'
import { readShooting } from '../../../shared/planning/shootingData'
import type { BreakdownScene, ShootingWarning } from '../../../shared/planning/shootingTypes'
import { dayViews, shootingWarnings, unplannedScenes } from '../../../shared/planning/shootingView'
import type { Planning } from '../../../shared/planning/types'
import { cardsStore } from '../../cards/cardsStore'
import { fr } from '../../i18n/fr'
import { useStore } from '../../state/createStore'
import {
  clearFocusDay,
  computeBreakdown,
  loadShootingSheets,
  shootingStore
} from '../shootingStore'
import { ShootingDayColumn } from './ShootingDayColumn'
import { ShootingSceneList } from './ShootingSceneList'
import { ShootingScenePanel } from './ShootingScenePanel'

const t = fr.shooting

/** Vue « Tournage » : scènes à planifier à gauche, une colonne par jour à droite (étape 15D-2). */
export function ShootingView({ planning }: { planning: Planning }) {
  const cards = useStore(cardsStore, (state) => state.history?.present.scenes ?? null)
  const sheets = useStore(shootingStore, (state) => state.sheets)
  const filter = useStore(shootingStore, (state) => state.filter)
  const grouped = useStore(shootingStore, (state) => state.grouped)
  const scenePanel = useStore(shootingStore, (state) => state.scenePanel)
  const focusDayId = useStore(shootingStore, (state) => state.focusDayId)
  const scriptRevision = useStore(shootingStore, (state) => state.scriptRevision)

  // Les fiches (interprètes) sont relues à chaque ouverture de la vue.
  useEffect(() => {
    void loadShootingSheets()
  }, [])

  const shooting = readShooting(planning)
  const muetsKey = JSON.stringify(shooting.muets)
  const scenes = useMemo<BreakdownScene[] | null>(
    () => (cards && sheets ? computeBreakdown(cards, sheets, planning) : null),
    // Recalcul quand les cartes, les fiches ou les muets changent, après chaque enregistrement du
    // scénario et chaque retour dans NeoScenar (`scriptRevision`), pas à chaque jour déplacé.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cards, sheets, muetsKey, scriptRevision]
  )

  // Jour demandé (clic dans le Gantt, jour créé) : amené à l'écran et mis en évidence un instant.
  useEffect(() => {
    if (focusDayId === null) return
    const element = document.querySelector<HTMLElement>(`[data-day-id="${focusDayId}"]`)
    element?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
    const timer = window.setTimeout(clearFocusDay, 1500)
    return () => window.clearTimeout(timer)
  }, [focusDayId, scenes])

  if (scenes === null || cards === null)
    return <p className="cards-message muted shooting-loading">{t.loading}</p>

  const views = dayViews(shooting, scenes, cards)
  const unplanned = unplannedScenes(scenes, shooting)
  const warnings = shootingWarnings(shooting, scenes, cards)
  const twice = new Set(warnings.flatMap((w) => (w.kind === 'twice' ? [w.cardId] : [])))
  const listed = warnings.filter((w) => w.kind !== 'unplanned')
  const panelScene = scenes.find((scene) => scene.cardId === scenePanel) ?? null
  const panelKnown =
    scenePanel !== null &&
    (panelScene !== null || views.some((view) => view.day.scenes.includes(scenePanel)))

  return (
    <div className="shooting-view" data-planning="shooting">
      <div className="shooting-main">
        {listed.length > 0 && (
          <details className="shooting-warnings" data-warnings={listed.length}>
            <summary>{t.warningsTitle(listed.length)}</summary>
            <ul>
              {listed.map((warning, index) => (
                <li key={index}>{warningText(warning)}</li>
              ))}
            </ul>
          </details>
        )}
        <div className="shooting-board">
          <ShootingSceneList
            all={scenes}
            unplanned={unplanned}
            filter={filter}
            grouped={grouped}
            selectedCardId={scenePanel}
          />
          <div className="shooting-days" data-shooting="days">
            {views.length === 0 && <p className="muted shooting-no-days">{t.noDays}</p>}
            {views.map((view, index) => (
              <ShootingDayColumn
                key={view.day.id}
                view={view}
                rank={index + 1}
                twice={twice}
                selectedCardId={scenePanel}
                focused={focusDayId === view.day.id}
              />
            ))}
          </div>
        </div>
      </div>
      {panelKnown && scenePanel !== null && (
        <ShootingScenePanel
          cardId={scenePanel}
          scene={panelScene}
          days={views}
          sheets={sheets ?? []}
        />
      )}
    </div>
  )
}

function warningText(warning: ShootingWarning): string {
  switch (warning.kind) {
    case 'twice':
      return t.warningTwice(warning.label, warning.dayIds.length)
    case 'missing':
      return t.warningMissing(warning.label ?? t.missingNoCard)
    case 'no-interpreter':
      return t.warningNoInterpreter(warning.nom, warning.labels.join(', '))
    case 'no-sheet':
      return t.warningNoSheet(warning.nom, warning.labels.join(', '))
    case 'unplanned':
      return t.toPlanCount(warning.count)
  }
}
