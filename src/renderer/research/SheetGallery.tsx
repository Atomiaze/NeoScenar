import { useState, type DragEvent } from 'react'
import { sheetImageUrl } from '../../shared/research/sheetImages'
import type { Sheet } from '../../shared/research/types'
import { Icon } from '../components/Icon'
import { fr } from '../i18n/fr'
import { addImages, setImages, showImage } from './researchStore'

const t = fr.research

function isFileDrag(event: DragEvent): boolean {
  return event.dataTransfer.types.includes('Files')
}

export interface GalleryImage {
  /** Identifie l'image pour le retrait. */
  key: string
  /** Texte alternatif et info-bulle. */
  label: string
  /** Chemin relatif à neoscenar/ ; null si le fichier est introuvable. */
  path: string | null
}

interface ImageGalleryProps {
  images: GalleryImage[]
  disabled?: boolean
  removeTitle: string
  dropHint: string
  onAdd(files: (string | File)[]): void
  onRemove(key: string): void
  /** Si présent, des flèches changent l'ordre des images. */
  onMove?(key: string, step: -1 | 1): void
  moveLabels?: { before: string; after: string }
}

/** Galerie d'images : ajout (bouton ou glisser-déposer), aperçu en grand, retrait. Partagée par
 * les fiches et les dossiers de documents. */
export function ImageGallery({
  images,
  disabled,
  removeTitle,
  dropHint,
  onAdd,
  onRemove,
  onMove,
  moveLabels
}: ImageGalleryProps) {
  const [dragOver, setDragOver] = useState(false)

  const chooseImages = async (): Promise<void> => {
    const paths = await window.neoscenar.chooseImageFiles(true)
    if (paths.length > 0) onAdd(paths)
  }

  const onDrop = (event: DragEvent): void => {
    if (!isFileDrag(event)) return
    event.preventDefault()
    setDragOver(false)
    // Fichier du Finder : son chemin ; image venant d'une autre application : ses octets.
    onAdd([...event.dataTransfer.files].map((file) => window.neoscenar.pathForFile(file) || file))
  }

  return (
    <div className="field">
      <span className="field-label">{t.fields.images}</span>
      <div
        className={`research-gallery${dragOver ? ' drag-over' : ''}`}
        onDragOver={(event) => {
          if (!isFileDrag(event) || disabled) return
          event.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => !disabled && onDrop(event)}
      >
        {images.map((image) => (
          <figure key={image.key} className="research-image">
            {image.path ? (
              <button
                type="button"
                className="research-image-open"
                title={image.label}
                onClick={() => image.path && showImage(image.path)}
              >
                <img src={sheetImageUrl(image.path)} alt={image.label} draggable={false} />
              </button>
            ) : (
              <div className="research-image-missing">{t.missingImage(image.label)}</div>
            )}
            <button
              type="button"
              className="research-image-remove"
              title={removeTitle}
              aria-label={removeTitle}
              onClick={() => onRemove(image.key)}
            >
              ×
            </button>
            {onMove && (
              <div className="research-image-move">
                <button
                  type="button"
                  className="tool-button"
                  title={moveLabels?.before}
                  aria-label={moveLabels?.before}
                  onClick={() => onMove(image.key, -1)}
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="tool-button"
                  title={moveLabels?.after}
                  aria-label={moveLabels?.after}
                  onClick={() => onMove(image.key, 1)}
                >
                  ›
                </button>
              </div>
            )}
          </figure>
        ))}
        <div className="research-gallery-add">
          <button type="button" className="tool-button" onClick={() => void chooseImages()}>
            <Icon name="image" size={18} />
            <span>{t.addImages}</span>
          </button>
          <span className="field-help">{dropHint}</span>
        </div>
      </div>
    </div>
  )
}

/** Images de la fiche : liste de la section « Images », ajout, aperçu, retrait du lien. */
export function SheetGallery({ sheet }: { sheet: Sheet }) {
  return (
    <ImageGallery
      images={sheet.images.map((image) => ({
        key: image.ref,
        label: image.ref,
        path: image.path
      }))}
      disabled={sheet.unreadable}
      removeTitle={t.removeImage}
      dropHint={t.dropImages}
      onAdd={(files) => void addImages(sheet.fileName, files)}
      onRemove={(ref) =>
        setImages(
          sheet,
          sheet.images.filter((image) => image.ref !== ref)
        )
      }
    />
  )
}
