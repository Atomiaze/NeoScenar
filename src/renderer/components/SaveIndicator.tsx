import type { ScenarioSaveStatus } from '../../shared/api'
import { fr } from '../i18n/fr'
import { Icon } from './Icon'

/** État de l'enregistrement automatique, dans la barre d'outils d'un module. */
export function SaveIndicator({ status }: { status: ScenarioSaveStatus }) {
  if (status.state === 'error' || status.state === 'conflict') {
    return (
      <span className="save-indicator error" role="status">
        <Icon name="warning" size={16} />
        {status.state === 'error' ? fr.save.error : fr.script.conflict.status}
      </span>
    )
  }
  return (
    <span className="save-indicator" role="status">
      {status.state === 'saved' && <Icon name="check" size={16} />}
      {status.state === 'saved' ? fr.save.saved : fr.save.saving}
    </span>
  )
}
