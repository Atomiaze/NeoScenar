// Panneau des révisions (18C-8) : masque le navigateur de scènes quand la page A4 ne tient plus, et le
// rend dès qu'il y a de nouveau la place. Un geste de l'élève (bouton ou menu) l'emporte jusqu'à la
// fin du mode révision.

import { useEffect } from 'react'
import { navigatorStore, resetNavigatorSqueeze, setNavigatorAutoHidden } from './navigatorStore'
import { nextAutoHidden } from './squeeze'

/**
 * @param revisionMode palette de révision ouverte (début et fin remettent tout à zéro)
 * @param panelShown panneau des révisions affiché à côté de la page
 * @param version éditeur recréé : la page à observer change
 */
export function useNavigatorSqueeze(
  revisionMode: boolean,
  panelShown: boolean,
  version: number
): void {
  useEffect(() => {
    resetNavigatorSqueeze()
    return resetNavigatorSqueeze
  }, [revisionMode])

  const active = revisionMode && panelShown
  useEffect(() => {
    if (!active) return
    const evaluate = (): void => {
      const state = navigatorStore.get()
      const scroller = document.querySelector<HTMLElement>('.cm-scroller')
      const content = document.querySelector<HTMLElement>('.cm-content')
      if (!state.shown || state.suppressed || state.keepShown || !scroller || !content) {
        setNavigatorAutoHidden(false)
        return
      }
      setNavigatorAutoHidden(
        nextAutoHidden(state.autoHidden, {
          clientWidth: scroller.clientWidth,
          pageWidth: content.offsetWidth
        })
      )
    }
    // La zone du scénario change de taille avec la fenêtre et les panneaux ; la page, avec le zoom.
    const observer = new ResizeObserver(evaluate)
    const body = document.querySelector('.script-body')
    const content = document.querySelector('.cm-content')
    if (body) observer.observe(body)
    if (content) observer.observe(content)
    const stop = navigatorStore.subscribe(evaluate)
    evaluate()
    return () => {
      observer.disconnect()
      stop()
      setNavigatorAutoHidden(false)
    }
  }, [active, version])
}
