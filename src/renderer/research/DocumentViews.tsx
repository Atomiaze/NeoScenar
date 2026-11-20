import { useEffect, useRef, useState } from 'react'
import type { DocumentFolder, DocumentNote } from '../../shared/research/documents'
import { fr } from '../i18n/fr'
import { addDocumentImages, removeDocumentImage } from './documentsActions'
import { selectDocument, showResearchError } from './researchStore'
import { ImageGallery } from './SheetGallery'

const t = fr.research

/** Dossier ouvert : ses sous-dossiers, ses notes et sa galerie d'images. */
export function DocumentFolderView({ folder }: { folder: DocumentFolder }) {
  const isRoot = folder.path === ''
  return (
    <article className="sheet research-form" aria-label={folder.name || t.docs.rootTitle}>
      <header className="research-sheet-header">
        <h2>{isRoot ? t.docs.rootTitle : folder.name}</h2>
      </header>
      {isRoot && <p className="field-help">{t.docs.rootHint}</p>}
      <div className="research-fields">
        <div className="field">
          <span className="field-label">{t.docs.foldersHeading}</span>
          {folder.folders.length === 0 ? (
            <span className="field-help">{t.docs.noFolders}</span>
          ) : (
            <ul className="doc-links">
              {folder.folders.map((child) => (
                <li key={child.path}>
                  <button
                    type="button"
                    className="tool-button"
                    onClick={() => selectDocument({ type: 'folder', path: child.path })}
                  >
                    {child.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="field">
          <span className="field-label">{t.docs.notesHeading}</span>
          {folder.notes.length === 0 ? (
            <span className="field-help">{t.docs.noNotes}</span>
          ) : (
            <ul className="doc-links">
              {folder.notes.map((note) => (
                <li key={note.path}>
                  <button
                    type="button"
                    className="tool-button"
                    onClick={() => selectDocument({ type: 'note', path: note.path })}
                  >
                    {note.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <ImageGallery
          images={folder.images.map((image) => ({
            key: image.fileName,
            label: image.fileName,
            path: image.path
          }))}
          removeTitle={t.docs.removeImage}
          dropHint={t.docs.imagesDropHint}
          onAdd={(files) => void addDocumentImages(folder.path, files)}
          onRemove={(fileName) => void removeDocumentImage(folder.path, fileName)}
        />
      </div>
    </article>
  )
}

/** Note ouverte : texte simple, enregistré automatiquement, relu au retour dans l'application. */
export function DocumentNoteView({ note }: { note: DocumentNote }) {
  const [text, setText] = useState<string | null>(null)
  const latest = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async (): Promise<void> => {
      const result = await window.neoscenar.readDocumentNote(note.path)
      if (cancelled) return
      if (!result.ok) {
        showResearchError(result.error)
        return
      }
      // Modifiée ailleurs (Obsidian…) : le texte du disque remplace celui de l'écran.
      if (result.value !== latest.current) {
        latest.current = result.value
        setText(result.value)
      }
    }
    void load()
    const reload = (): void => void load()
    window.addEventListener('focus', reload)
    return () => {
      cancelled = true
      window.removeEventListener('focus', reload)
    }
  }, [note.path])

  const change = (value: string): void => {
    latest.current = value
    setText(value)
    void window.neoscenar.writeDocumentNote(note.path, value).then((result) => {
      if (!result.ok) showResearchError(result.error)
    })
  }

  return (
    <article className="sheet research-form" aria-label={note.name}>
      <header className="research-sheet-header">
        <h2>{note.name}</h2>
      </header>
      <label className="field">
        <span className="field-label">{t.docs.noteLabel}</span>
        <textarea
          className="doc-note-text"
          rows={22}
          disabled={text === null}
          value={text ?? ''}
          onChange={(event) => change(event.target.value)}
        />
        <span className="field-help">{t.docs.noteHint}</span>
      </label>
    </article>
  )
}
