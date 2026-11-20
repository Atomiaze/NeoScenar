import type { DragEvent } from 'react'
import { importThumbnailFromBytes, importThumbnailFromPath } from './thumbnailActions'

// Images glissées depuis le Finder (ou l'Explorateur) sur la zone vignette ou une carte plan.

/** Vrai si ce qu'on glisse contient des fichiers (et pas une carte ou du texte). */
export function isFileDrag(event: DragEvent): boolean {
  return event.dataTransfer.types.includes('Files')
}

/** Importe la première image déposée dans le plan. */
export async function importDroppedFile(shotId: string, event: DragEvent): Promise<void> {
  const file = event.dataTransfer.files[0]
  if (!file) return
  const path = window.neoscenar.pathForFile(file)
  // Image venant d'une autre application, sans fichier sur le disque : on prend ses octets.
  if (path) await importThumbnailFromPath(shotId, path)
  else await importThumbnailFromBytes(shotId, new Uint8Array(await file.arrayBuffer()))
}
