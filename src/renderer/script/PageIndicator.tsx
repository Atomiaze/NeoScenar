import { formatDuration } from '../../shared/decoupage'
import { fr } from '../i18n/fr'
import { useStore } from '../state/createStore'
import { navigatorStore } from './navigator/navigatorStore'
import { scriptStore } from './scriptStore'

/** « Page 3 / 6 · 5:40 » : page du curseur, nombre de pages et durée estimée totale. */
export function PageIndicator() {
  const page = useStore(scriptStore, (state) => state.cursorPage)
  const pages = useStore(scriptStore, (state) => state.pageCount)
  const seconds = useStore(navigatorStore, (state) => state.tree?.totalSeconds ?? 0)
  return (
    <span className="page-indicator" title={fr.script.pageIndicatorTitle}>
      {fr.script.pageIndicator(Math.min(page, pages), pages, formatDuration(seconds))}
    </span>
  )
}
