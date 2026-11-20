import { useState } from 'react'
import {
  countDocuments,
  findFolder,
  findNote,
  lastSegment,
  noteDisplayName
} from '../../shared/research/documents'
import { Dialog } from '../components/Dialog'
import { fr } from '../i18n/fr'
import { useStore } from '../state/createStore'
import { createDocument, deleteDocument, renameDocument } from './documentsActions'
import { openResearchDialog, researchStore, type DocSelection } from './researchStore'

const t = fr.research
const close = (): void => openResearchDialog(null)

/** Nom affiché d'un dossier ou d'une note. */
function entryName(entry: DocSelection): string {
  const segment = lastSegment(entry.path)
  return entry.type === 'note' ? noteDisplayName(segment) : segment.normalize('NFC')
}

interface NameDialogProps {
  title: string
  initial: string
  confirm: string
  help?: string
  submit(name: string): Promise<string | null>
}

/** Fenêtre à un seul champ « Nom » (création et renommage). */
function NameDialog({ title, initial, confirm, help, submit }: NameDialogProps) {
  const [name, setName] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const send = async (): Promise<void> => {
    if (busy) return
    setBusy(true)
    setError(await submit(name))
    setBusy(false)
  }

  return (
    <Dialog
      title={title}
      onClose={close}
      actions={
        <>
          <button onClick={close}>{t.cancel}</button>
          <button
            className="primary"
            disabled={busy || name.trim() === ''}
            onClick={() => void send()}
          >
            {confirm}
          </button>
        </>
      }
    >
      <form
        className="form"
        onSubmit={(event) => {
          event.preventDefault()
          void send()
        }}
      >
        <label className="field">
          <span className="field-label">{t.nameLabel}</span>
          <input
            type="text"
            autoFocus
            value={name}
            aria-invalid={error !== null}
            onFocus={(event) => event.target.select()}
            onChange={(event) => {
              setName(event.target.value)
              setError(null)
            }}
          />
          {help && <span className="field-help">{help}</span>}
          {error && <span className="field-error">{error}</span>}
        </label>
      </form>
    </Dialog>
  )
}

function DeleteDialog({ entry }: { entry: DocSelection }) {
  const documents = useStore(researchStore, (state) => state.documents)
  const name = entryName(entry)
  const folder = entry.type === 'folder' && documents ? findFolder(documents, entry.path) : null
  const count = folder ? countDocuments(folder) : 0
  const gone = !documents || (entry.type === 'note' && !findNote(documents, entry.path))
  return (
    <Dialog
      title={entry.type === 'folder' ? t.docs.deleteFolderTitle : t.docs.deleteNoteTitle}
      role="alertdialog"
      onClose={close}
      actions={
        <>
          <button onClick={close}>{t.cancel}</button>
          <button className="danger" disabled={gone} onClick={() => void deleteDocument(entry)}>
            {t.confirmDelete}
          </button>
        </>
      }
    >
      <p>
        {entry.type === 'folder'
          ? t.docs.deleteFolderMessage(name, count)
          : t.docs.deleteNoteMessage(name)}
      </p>
      <p className="field-help">{t.docs.deleteBackup}</p>
    </Dialog>
  )
}

/** Fenêtres de la branche Documents : nouveau dossier, nouvelle note, renommage, suppression. */
export function DocumentDialogs() {
  const dialog = useStore(researchStore, (state) => state.dialog)
  if (dialog?.kind === 'docNew') {
    const parentName = dialog.parent === '' ? '' : lastSegment(dialog.parent).normalize('NFC')
    return (
      <NameDialog
        title={dialog.what === 'folder' ? t.docs.newFolderTitle : t.docs.newNoteTitle}
        initial=""
        confirm={t.create}
        help={parentName === '' ? t.docs.newAtRoot : t.docs.newFolderIn(parentName)}
        submit={(name) => createDocument(dialog.what, dialog.parent, name)}
      />
    )
  }
  if (dialog?.kind === 'docRename') {
    const { entry } = dialog
    return (
      <NameDialog
        title={entry.type === 'folder' ? t.docs.renameFolderTitle : t.docs.renameNoteTitle}
        initial={entryName(entry)}
        confirm={t.docs.renameConfirm}
        submit={(name) => renameDocument(entry, name)}
      />
    )
  }
  if (dialog?.kind === 'docDelete') return <DeleteDialog entry={dialog.entry} />
  return null
}
