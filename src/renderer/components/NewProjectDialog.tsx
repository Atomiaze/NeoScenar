import { useEffect, useMemo, useState } from 'react'
import type { CreationData } from '../../shared/api'
import { sanitizeFolderName } from '../../shared/folderName'
import { defaultFoldersFor } from '../../shared/folderTemplate'
import { PROJECT_TYPES, type ProjectType } from '../../shared/projectTypes'
import { fr } from '../i18n/fr'
import { Dialog } from './Dialog'
import { FolderChecklist, toggleInSet } from './FolderChecklist'
import { FormatFields } from './FormatFields'
import { checkDraft, draftFromSettings, type FormatDraft } from './formatDraft'
import { defaultSettings, type FormatCatalog } from '../../shared/imageFormat'

const DEFAULT_TYPE: ProjectType = 'film'

export function NewProjectDialog({ onClose }: { onClose(): void }) {
  const [data, setData] = useState<CreationData | null>(null)
  const [title, setTitle] = useState('')
  const [location, setLocation] = useState('')
  const [projectType, setProjectType] = useState<ProjectType>(DEFAULT_TYPE)
  const [folders, setFolders] = useState<ReadonlySet<string>>(new Set())
  const [withReadme, setWithReadme] = useState(true)
  const [formats, setFormats] = useState<FormatCatalog | null>(null)
  const [format, setFormat] = useState<FormatDraft | null>(null)
  const [available, setAvailable] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    window.neoscenar.getCreationData().then((result) => {
      if (!result.ok) {
        setError(result.error)
        return
      }
      setData(result.value)
      setLocation(result.value.defaultLocation)
      setFolders(new Set(defaultFoldersFor(result.value.template, DEFAULT_TYPE)))
    })
    window.neoscenar.getFormatCatalog().then((result) => {
      if (!result.ok) {
        setError(result.error)
        return
      }
      setFormats(result.value)
      setFormat(draftFromSettings(result.value, defaultSettings(result.value)))
    })
  }, [])

  const folderName = useMemo(() => sanitizeFolderName(title), [title])

  // Vérifie en direct qu'aucun dossier du même nom n'existe déjà à cet emplacement.
  useEffect(() => {
    let cancelled = false
    if (location === '' || folderName === '') return
    window.neoscenar.isFolderAvailable(location, folderName).then((free) => {
      if (!cancelled) setAvailable(free)
    })
    return () => {
      cancelled = true
    }
  }, [location, folderName])

  const chooseType = (type: ProjectType): void => {
    setProjectType(type)
    if (data) setFolders(new Set(defaultFoldersFor(data.template, type)))
  }

  const chooseLocation = async (): Promise<void> => {
    const chosen = await window.neoscenar.chooseLocation(location)
    if (chosen) setLocation(chosen)
  }

  const nameMessage =
    title.trim() === ''
      ? null
      : folderName === ''
        ? fr.create.invalidName
        : available
          ? null
          : fr.create.folderExists(folderName)
  const settings = format ? checkDraft(format).settings : null
  const canSubmit =
    data !== null &&
    settings !== null &&
    folderName !== '' &&
    available &&
    location !== '' &&
    !submitting

  const submit = async (): Promise<void> => {
    if (!canSubmit || !settings) return
    setSubmitting(true)
    setError(null)
    const result = await window.neoscenar.createProject({
      title,
      location,
      projectType,
      folders: [...folders],
      withReadme,
      settings
    })
    // En cas de succès, le processus principal annonce le projet ouvert et la fenêtre se ferme.
    if (!result.ok) {
      setError(result.error)
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      title={fr.create.title}
      onClose={onClose}
      actions={
        <>
          <button onClick={onClose}>{fr.common.cancel}</button>
          <button className="primary" disabled={!canSubmit} onClick={submit}>
            {submitting ? fr.create.creating : fr.create.submit}
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
          <span className="field-label">{fr.create.nameLabel}</span>
          <input
            type="text"
            value={title}
            placeholder={fr.create.namePlaceholder}
            onChange={(event) => setTitle(event.target.value)}
            autoFocus
          />
          <span className="field-hint">{folderName && fr.create.folderPreview(folderName)}</span>
          {nameMessage && <span className="field-error">{nameMessage}</span>}
        </label>

        <div className="field">
          <span className="field-label">{fr.create.locationLabel}</span>
          <div className="location-row">
            <span className="location-path" title={location}>
              {location}
            </span>
            <button type="button" onClick={chooseLocation}>
              {fr.create.chooseLocation}
            </button>
          </div>
        </div>

        <fieldset className="field">
          <legend className="field-label">{fr.create.typeLabel}</legend>
          <div className="type-row">
            {PROJECT_TYPES.map((type) => (
              <label key={type} className="radio">
                <input
                  type="radio"
                  name="project-type"
                  checked={projectType === type}
                  onChange={() => chooseType(type)}
                />
                {fr.projectTypes[type]}
              </label>
            ))}
          </div>
        </fieldset>

        {formats && format && (
          <FormatFields catalog={formats} draft={format} onChange={setFormat} />
        )}

        <fieldset className="field">
          <legend className="field-label">{fr.create.foldersLabel}</legend>
          {data && (
            <FolderChecklist
              folders={data.template.folders}
              checked={folders}
              onToggle={(name) => setFolders((current) => toggleInSet(current, name))}
            />
          )}
        </fieldset>

        <label className="checkbox">
          <input
            type="checkbox"
            checked={withReadme}
            onChange={(event) => setWithReadme(event.target.checked)}
          />
          {fr.create.readmeOption}
        </label>

        {error && <p className="error-text">{error}</p>}
      </form>
    </Dialog>
  )
}
