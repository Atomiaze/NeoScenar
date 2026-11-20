import { useEffect, useState } from 'react'
import type { ProjectSummary } from '../../shared/api'
import { sameAspect, type FormatCatalog } from '../../shared/imageFormat'
import { countMismatchedThumbnails, thumbnailPaths } from '../../shared/thumbnail/status'
import { cardsStore } from '../cards/cardsStore'
import { sizesOf } from '../cards/thumbnails/sizesStore'
import { fr } from '../i18n/fr'
import { Dialog } from './Dialog'
import { FormatFields } from './FormatFields'
import { checkDraft, draftFromSettings, type FormatDraft } from './formatDraft'

/** Réglages du projet ouvert : format de l'image et cadence. */
export function ProjectSettingsDialog({
  project,
  onClose
}: {
  project: ProjectSummary
  onClose(): void
}) {
  const [formats, setFormats] = useState<FormatCatalog | null>(null)
  const [draft, setDraft] = useState<FormatDraft | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /** Nombre de vignettes qui n'auront plus les bonnes proportions (avertissement affiché). */
  const [warning, setWarning] = useState<number | null>(null)

  useEffect(() => {
    window.neoscenar.getFormatCatalog().then((result) => {
      if (!result.ok) {
        setError(result.error)
        return
      }
      setFormats(result.value)
      setDraft(draftFromSettings(result.value, project.settings))
    })
    // Les réglages de départ sont ceux du projet à l'ouverture de la fenêtre.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const settings = draft ? checkDraft(draft).settings : null

  /** Vignettes concernées par un changement de proportions (jamais modifiées automatiquement). */
  const countAffected = async (): Promise<number> => {
    const decoupage = cardsStore.get().history?.present
    if (!settings || !decoupage) return 0
    if (sameAspect(settings.resolution, project.settings.resolution)) return 0
    const sizes = await sizesOf(thumbnailPaths(decoupage))
    return countMismatchedThumbnails(decoupage, sizes, settings.resolution)
  }

  const save = async (): Promise<void> => {
    if (!settings || saving) return
    setSaving(true)
    setError(null)
    if (warning === null) {
      const affected = await countAffected()
      if (affected > 0) {
        setWarning(affected)
        setSaving(false)
        return
      }
    }
    const result = await window.neoscenar.updateProjectSettings(settings)
    if (result.ok) {
      onClose()
    } else {
      setError(result.error)
      setSaving(false)
    }
  }

  return (
    <Dialog
      title={fr.settings.title}
      onClose={onClose}
      actions={
        <>
          <button onClick={onClose}>{fr.common.cancel}</button>
          <button className="primary" disabled={!settings || saving} onClick={save}>
            {saving
              ? fr.settings.saving
              : warning !== null
                ? fr.settings.continue
                : fr.settings.save}
          </button>
        </>
      }
    >
      <form
        className="form"
        onSubmit={(event) => {
          event.preventDefault()
          void save()
        }}
      >
        {formats && draft && (
          <FormatFields
            catalog={formats}
            draft={draft}
            onChange={(next) => {
              setDraft(next)
              setWarning(null)
            }}
          />
        )}
        {warning !== null && (
          <p className="warning-text" role="alert">
            {fr.settings.thumbnailsWarning(warning)}
          </p>
        )}
        {error && <p className="error-text">{error}</p>}
      </form>
    </Dialog>
  )
}
