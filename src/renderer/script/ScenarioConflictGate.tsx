import { useStore } from '../state/createStore'
import { ConflictDialog } from './ConflictDialog'
import { scriptStore } from './scriptStore'

/**
 * Fenêtre de conflit, quel que soit le module affiché : depuis l'étape 8, une action des cartes
 * modifie aussi le scénario. Si scenario.fountain a été modifié dans un autre logiciel, le processus
 * principal refuse de l'écraser et l'élève choisit, même sans l'éditeur affiché.
 */
export function ScenarioConflictGate() {
  const conflict = useStore(scriptStore, (state) => state.status.state === 'conflict')
  return conflict ? <ConflictDialog /> : null
}
