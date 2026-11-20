import { useCallback, useState } from 'react'
import { sheetImageUrl } from '../../shared/research/sheetImages'
import { Dialog } from '../components/Dialog'
import { fr } from '../i18n/fr'
import { useStore } from '../state/createStore'
import {
  createSheet,
  currentSheet,
  deleteSheet,
  openResearchDialog,
  researchStore,
  showImage,
  type RenameDialog
} from './researchStore'
import { DocumentDialogs } from './DocumentDialogs'
import { confirmRename } from './sheetRename'

const t = fr.research

function NewSheetDialog() {
  const kind = useStore(researchStore, (state) => state.kind)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const close = useCallback(() => openResearchDialog(null), [])

  const submit = async (): Promise<void> => {
    if (busy) return
    setBusy(true)
    setError(await createSheet(name))
    setBusy(false)
  }

  return (
    <Dialog
      title={kind === 'lieux' ? t.newPlaceTitle : t.newCharacterTitle}
      onClose={close}
      actions={
        <>
          <button onClick={close}>{t.cancel}</button>
          <button
            className="primary"
            disabled={busy || name.trim() === ''}
            onClick={() => void submit()}
          >
            {t.create}
          </button>
        </>
      }
    >
      <form
        className="form"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <label className="field">
          <span className="field-label">{t.nameLabel}</span>
          <input
            type="text"
            autoFocus
            value={name}
            aria-invalid={error !== null}
            onChange={(event) => {
              setName(event.target.value)
              setError(null)
            }}
          />
          <span className="field-help">{kind === 'lieux' ? t.placeNameHint : t.nameHint}</span>
          {error && <span className="field-error">{error}</span>}
        </label>
      </form>
    </Dialog>
  )
}

function DeleteSheetDialog({ fileName }: { fileName: string }) {
  const sheet = useStore(researchStore, currentSheet)
  const close = useCallback(() => openResearchDialog(null), [])
  return (
    <Dialog
      title={t.deleteTitle}
      role="alertdialog"
      onClose={close}
      actions={
        <>
          <button onClick={close}>{t.cancel}</button>
          <button className="danger" onClick={() => void deleteSheet(fileName)}>
            {t.confirmDelete}
          </button>
        </>
      }
    >
      <p>{t.deleteMessage(sheet?.nom ?? fileName)}</p>
    </Dialog>
  )
}

function RenameSheetDialog({ dialog }: { dialog: RenameDialog }) {
  const [withText, setWithText] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const close = useCallback(() => openResearchDialog(null), [])
  const isPlace = researchStore.get().kind === 'lieux'

  const submit = async (): Promise<void> => {
    if (busy) return
    setBusy(true)
    setError(await confirmRename(dialog, withText))
    setBusy(false)
  }

  return (
    <Dialog
      title={t.renameTitle}
      onClose={close}
      actions={
        <>
          <button onClick={close}>{t.cancel}</button>
          <button className="primary" autoFocus disabled={busy} onClick={() => void submit()}>
            {t.renameConfirm}
          </button>
        </>
      }
    >
      <div className="form">
        <p>{t.renameQuestion(dialog.from, dialog.to)}</p>
        {dialog.always > 0 && (
          <p>{t.renameAlways(isPlace ? 'lieux' : 'personnages', dialog.always)}</p>
        )}
        {dialog.inText > 0 && (
          <label className="checkbox">
            <input
              type="checkbox"
              checked={withText}
              onChange={(event) => setWithText(event.target.checked)}
            />
            {t.renameInText(dialog.inText)}
          </label>
        )}
        {dialog.headings > 0 && (
          <p className="warning-text">{t.renameHeadings(dialog.headings, dialog.from)}</p>
        )}
        <p className="field-help">{t.renameBackup}</p>
        {error && <p className="field-error">{error}</p>}
      </div>
    </Dialog>
  )
}

function ImagePreview({ path }: { path: string }) {
  const close = useCallback(() => showImage(null), [])
  return (
    <Dialog
      title={path.split('/').at(-1) ?? path}
      className="image-dialog"
      onClose={close}
      actions={<button onClick={close}>{t.closePreview}</button>}
    >
      <img className="image-view" src={sheetImageUrl(path)} alt="" />
    </Dialog>
  )
}

/** Fenêtres du module Recherches : nouvelle fiche, renommage, suppression, image en grand. */
export function ResearchDialogs() {
  const dialog = useStore(researchStore, (state) => state.dialog)
  const preview = useStore(researchStore, (state) => state.preview)
  return (
    <>
      {dialog?.kind === 'new' && <NewSheetDialog />}
      {dialog?.kind === 'delete' && <DeleteSheetDialog fileName={dialog.fileName} />}
      {dialog?.kind === 'rename' && <RenameSheetDialog dialog={dialog} />}
      <DocumentDialogs />
      {preview && <ImagePreview path={preview} />}
    </>
  )
}
