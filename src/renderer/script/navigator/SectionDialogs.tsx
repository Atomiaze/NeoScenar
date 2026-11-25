// Fenêtres des sections du navigateur (18C-15) : titre (insérer, ajouter, renommer) et confirmation
// de la suppression d'une section qui a une description.

import { useState } from 'react'
import { Dialog } from '../../components/Dialog'
import { fr } from '../../i18n/fr'
import { createStore, useStore } from '../../state/createStore'
import {
  addSectionAbove,
  addSectionAtEnd,
  deleteSectionAt,
  deletionNeedsConfirm,
  renameSectionAt
} from './sectionActions'

const t = fr.script.navigator

export type SectionDialog =
  | { kind: 'insert'; from: number }
  | { kind: 'append' }
  | { kind: 'rename'; from: number; title: string }
  | { kind: 'delete'; from: number; title: string }

const dialogStore = createStore<{ dialog: SectionDialog | null }>({ dialog: null })

export function openSectionDialog(dialog: SectionDialog): void {
  dialogStore.set({ dialog })
}

/** Supprime la section, après confirmation seulement si elle a une description. */
export function requestSectionDeletion(from: number, title: string): void {
  if (deletionNeedsConfirm(from)) openSectionDialog({ kind: 'delete', from, title })
  else deleteSectionAt(from)
}

const close = (): void => dialogStore.set({ dialog: null })

export function SectionDialogs() {
  const dialog = useStore(dialogStore, (state) => state.dialog)
  if (!dialog) return null
  if (dialog.kind === 'delete') {
    return (
      <Dialog
        title={t.deleteDialog.title}
        role="alertdialog"
        onClose={close}
        actions={
          <>
            <button onClick={close}>{fr.common.cancel}</button>
            <button
              className="danger"
              autoFocus
              onClick={() => {
                close()
                deleteSectionAt(dialog.from)
              }}
            >
              {t.deleteDialog.confirm}
            </button>
          </>
        }
      >
        <p>{t.deleteDialog.message(dialog.title)}</p>
      </Dialog>
    )
  }
  return <TitleDialog key={JSON.stringify(dialog)} dialog={dialog} />
}

function TitleDialog({ dialog }: { dialog: Exclude<SectionDialog, { kind: 'delete' }> }) {
  const [title, setTitle] = useState(dialog.kind === 'rename' ? dialog.title : '')
  const valid = title.trim() !== ''
  const validate = (): void => {
    if (!valid) return
    close()
    if (dialog.kind === 'insert') addSectionAbove(dialog.from, title)
    else if (dialog.kind === 'append') addSectionAtEnd(title)
    else renameSectionAt(dialog.from, title)
  }
  return (
    <Dialog
      title={t.sectionDialog[dialog.kind]}
      onClose={close}
      actions={
        <>
          <button onClick={close}>{fr.common.cancel}</button>
          <button className="primary" disabled={!valid} onClick={validate}>
            {t.sectionDialog.validate}
          </button>
        </>
      }
    >
      <label className="field">
        <span className="field-label">{t.sectionDialog.label}</span>
        <input
          type="text"
          value={title}
          placeholder={t.sectionDialog.placeholder}
          autoFocus
          onFocus={(event) => event.target.select()}
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              validate()
            }
          }}
        />
      </label>
    </Dialog>
  )
}
