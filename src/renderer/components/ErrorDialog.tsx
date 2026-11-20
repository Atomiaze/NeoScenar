import { fr } from '../i18n/fr'
import { Dialog } from './Dialog'

export function ErrorDialog({ message, onClose }: { message: string; onClose(): void }) {
  return (
    <Dialog
      title={fr.errors.title}
      onClose={onClose}
      role="alertdialog"
      actions={
        <button className="primary" onClick={onClose} autoFocus>
          {fr.common.close}
        </button>
      }
    >
      <p className="error-text">{message}</p>
    </Dialog>
  )
}
