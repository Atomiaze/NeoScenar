import { useState } from 'react'
import { Dialog } from '../components/Dialog'
import { fr } from '../i18n/fr'
import { resolveConflict } from './scriptStore'

const t = fr.script.conflict

/**
 * scenario.fountain a été modifié dans un autre logiciel : rien n'est écrit tant que l'élève n'a pas
 * choisi. Échap ne ferme pas la fenêtre, il faut choisir.
 */
export function ConflictDialog() {
  const [busy, setBusy] = useState(false)
  const choose = (choice: 'reload' | 'keep'): void => {
    setBusy(true)
    void resolveConflict(choice).finally(() => setBusy(false))
  }
  return (
    <Dialog
      title={t.title}
      role="alertdialog"
      onClose={() => undefined}
      actions={
        <>
          <button disabled={busy} title={t.reloadHint} onClick={() => choose('reload')}>
            {t.reload}
          </button>
          <button
            className="primary"
            disabled={busy}
            title={t.keepHint}
            onClick={() => choose('keep')}
          >
            {t.keep}
          </button>
        </>
      }
    >
      <p>{t.message}</p>
      <ul className="conflict-choices">
        <li>
          <strong>{t.reload}</strong> : {t.reloadHint}
        </li>
        <li>
          <strong>{t.keep}</strong> : {t.keepHint}
        </li>
      </ul>
    </Dialog>
  )
}
