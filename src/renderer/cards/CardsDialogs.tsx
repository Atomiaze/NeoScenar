import { useState, type FormEvent } from 'react'
import { MAX_BATCH } from '../../shared/decoupage'
import { formatSceneNumber } from '../../shared/numbering'
import type { Decoupage } from '../../shared/projectTypes'
import { Dialog } from '../components/Dialog'
import { fr } from '../i18n/fr'
import { useStore } from '../state/createStore'
import { addMany, renumber, selectedSceneId, type AddManyKind, type AddManyWhere } from './actions'
import { cardsStore, closeDialog, type CardsDialog } from './cardsStore'
import { CropDialog } from './thumbnails/CropDialog'
import { projectImageUrl } from '../../shared/thumbnail/files'

/**
 * Fenêtres des actions des cartes, quel que soit le module affiché : une action des cartes peut
 * être lancée depuis le Scénario (Dupliquer la scène), et sa fenêtre (plus de numéro libre,
 * message…) doit s'afficher là où l'élève se trouve. Placé dans la fenêtre du projet.
 */
export function CardsDialogsLayer() {
  const decoupage = useStore(cardsStore, (state) => state.history?.present ?? null)
  return decoupage ? <CardsDialogs decoupage={decoupage} /> : null
}

/** Affiche la fenêtre ouverte par une action des cartes, s'il y en a une. */
function CardsDialogs({ decoupage }: { decoupage: Decoupage }) {
  const dialog = useStore(cardsStore, (state) => state.dialog)
  if (!dialog) return null
  switch (dialog.kind) {
    case 'confirm':
      return <ConfirmDialog dialog={dialog} />
    case 'message':
      return (
        <Dialog
          title={dialog.title}
          onClose={closeDialog}
          role="alertdialog"
          actions={
            <button className="primary" autoFocus onClick={closeDialog}>
              {fr.common.close}
            </button>
          }
        >
          <p>{dialog.message}</p>
        </Dialog>
      )
    case 'add-many':
      return <AddManyDialog decoupage={decoupage} />
    case 'renumber':
      return <RenumberDialog decoupage={decoupage} />
    case 'crop':
      return <CropDialog request={dialog.request} />
    case 'image':
      return (
        <Dialog
          title={dialog.title}
          className="image-dialog"
          onClose={closeDialog}
          actions={
            <button className="primary" autoFocus onClick={closeDialog}>
              {fr.common.close}
            </button>
          }
        >
          <img className="image-view" src={projectImageUrl(dialog.path)} alt={dialog.title} />
        </Dialog>
      )
  }
}

function ConfirmDialog({ dialog }: { dialog: Extract<CardsDialog, { kind: 'confirm' }> }) {
  const confirm = (): void => {
    closeDialog()
    dialog.onConfirm()
  }
  return (
    <Dialog
      title={dialog.title}
      onClose={closeDialog}
      role="alertdialog"
      actions={
        <>
          <button onClick={closeDialog}>{dialog.cancelLabel ?? fr.common.cancel}</button>
          <button className={dialog.danger ? 'danger' : 'primary'} autoFocus onClick={confirm}>
            {dialog.confirmLabel}
          </button>
        </>
      }
    >
      {dialog.message && <p>{dialog.message}</p>}
    </Dialog>
  )
}

function AddManyDialog({ decoupage }: { decoupage: Decoupage }) {
  const hasSelection = useStore(cardsStore, (state) => state.selection.anchor !== null)
  const [countText, setCountText] = useState('10')
  const [kind, setKind] = useState<AddManyKind>('shots')
  const [where, setWhere] = useState<AddManyWhere>(hasSelection ? 'selection' : 'end')

  const count = Number(countText)
  const countValid = /^\d+$/.test(countText.trim()) && count >= 1 && count <= MAX_BATCH
  const noScene = kind === 'shots' && decoupage.scenes.length === 0

  const submit = (event: FormEvent): void => {
    event.preventDefault()
    if (!countValid || noScene) return
    closeDialog()
    addMany(kind, where, count)
  }

  return (
    <Dialog
      title={fr.addMany.title}
      onClose={closeDialog}
      actions={
        <>
          <button onClick={closeDialog}>{fr.common.cancel}</button>
          <button
            className="primary"
            type="submit"
            form="add-many"
            disabled={!countValid || noScene}
          >
            {fr.addMany.add}
          </button>
        </>
      }
    >
      <form id="add-many" className="sentence-form" onSubmit={submit}>
        <span>{fr.addMany.add}</span>
        <input
          type="number"
          min={1}
          max={MAX_BATCH}
          aria-label={fr.addMany.count}
          value={countText}
          autoFocus
          onFocus={(event) => event.target.select()}
          onChange={(event) => setCountText(event.target.value)}
        />
        <select value={kind} onChange={(event) => setKind(event.target.value as AddManyKind)}>
          <option value="shots">{fr.addMany.shots}</option>
          <option value="scenes">{fr.addMany.scenes}</option>
        </select>
        <select value={where} onChange={(event) => setWhere(event.target.value as AddManyWhere)}>
          <option value="selection" disabled={!hasSelection}>
            {fr.addMany.afterSelection}
          </option>
          <option value="end">{fr.addMany.atEnd}</option>
        </select>
      </form>
      {!countValid && <p className="field-error">{fr.addMany.countError}</p>}
      {noScene && <p className="field-error">{fr.addMany.noSceneForShots}</p>}
    </Dialog>
  )
}

function RenumberDialog({ decoupage }: { decoupage: Decoupage }) {
  const sceneId = selectedSceneId()
  const scene = decoupage.scenes.find((item) => item.id === sceneId)
  const [scope, setScope] = useState<'scene' | 'project'>(scene ? 'scene' : 'project')

  const submit = (event: FormEvent): void => {
    event.preventDefault()
    closeDialog()
    renumber(scope)
  }

  return (
    <Dialog
      title={fr.renumberDialog.title}
      onClose={closeDialog}
      actions={
        <>
          <button onClick={closeDialog}>{fr.common.cancel}</button>
          <button className="primary" type="submit" form="renumber" autoFocus>
            {fr.renumberDialog.submit}
          </button>
        </>
      }
    >
      <p>{fr.renumberDialog.intro}</p>
      <form id="renumber" className="form" onSubmit={submit}>
        <label className="radio">
          <input
            type="radio"
            name="scope"
            checked={scope === 'scene'}
            disabled={!scene}
            onChange={() => setScope('scene')}
          />
          {scene
            ? fr.renumberDialog.scene(formatSceneNumber(scene.number, scene.letter))
            : fr.renumberDialog.sceneNone}
        </label>
        <label className="radio">
          <input
            type="radio"
            name="scope"
            checked={scope === 'project'}
            onChange={() => setScope('project')}
          />
          {fr.renumberDialog.project}
        </label>
      </form>
    </Dialog>
  )
}
