import { useEffect, useState } from 'react'
import type { FolderStatus } from '../../shared/api'
import { fr } from '../i18n/fr'
import { Dialog } from './Dialog'
import { FolderChecklist, toggleInSet } from './FolderChecklist'

interface CompleteStructureDialogProps {
  onClose(): void
  onError(message: string): void
}

export function CompleteStructureDialog({ onClose, onError }: CompleteStructureDialogProps) {
  const [folders, setFolders] = useState<FolderStatus[] | null>(null)
  const [checked, setChecked] = useState<ReadonlySet<string>>(new Set())
  const [withReadme, setWithReadme] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    window.neoscenar.getStructureStatus().then((result) => {
      if (result.ok) setFolders(result.value)
      else {
        onClose()
        onError(result.error)
      }
    })
  }, [onClose, onError])

  const existing = new Set(folders?.filter((folder) => folder.exists).map((folder) => folder.name))
  const allPresent = folders !== null && existing.size === folders.length

  const submit = async (): Promise<void> => {
    setSubmitting(true)
    const result = await window.neoscenar.completeStructure({
      folders: [...checked],
      withReadme
    })
    setSubmitting(false)
    if (!result.ok) onError(result.error)
    onClose()
  }

  return (
    <Dialog
      title={fr.complete.title}
      onClose={onClose}
      actions={
        <>
          <button onClick={onClose}>{fr.common.cancel}</button>
          <button className="primary" disabled={checked.size === 0 || submitting} onClick={submit}>
            {fr.complete.submit}
          </button>
        </>
      }
    >
      <p>{allPresent ? fr.complete.nothingToAdd : fr.complete.intro}</p>
      {folders && (
        <FolderChecklist
          folders={folders}
          checked={checked}
          locked={existing}
          lockedNote={fr.complete.alreadyPresent}
          onToggle={(name) => setChecked((current) => toggleInSet(current, name))}
        />
      )}
      <label className="checkbox">
        <input
          type="checkbox"
          checked={withReadme}
          onChange={(event) => setWithReadme(event.target.checked)}
        />
        {fr.create.readmeOption}
      </label>
    </Dialog>
  )
}
