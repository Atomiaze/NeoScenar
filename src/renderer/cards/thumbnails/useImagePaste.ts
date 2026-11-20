import { useEffect } from 'react'
import { cardsStore } from '../cardsStore'
import { isTypingTarget } from '../typingTarget'
import { importThumbnailFromBytes } from './thumbnailActions'

/** Première image du presse-papiers (copiée depuis Aperçu, un navigateur…), ou null. */
function clipboardImage(event: ClipboardEvent): File | null {
  for (const item of event.clipboardData?.items ?? []) {
    if (item.kind === 'file' && item.type.startsWith('image/')) return item.getAsFile()
  }
  return null
}

/**
 * Cmd + V avec un plan sélectionné (hors champ de texte) : l'image du presse-papiers devient sa
 * vignette. Et une image lâchée ailleurs que sur un plan est ignorée (pas de page ouverte).
 */
export function useImagePaste(): void {
  useEffect(() => {
    const onPaste = (event: ClipboardEvent): void => {
      if (isTypingTarget(document.activeElement)) return
      const { selection, dialog, history, drawing } = cardsStore.get()
      const anchor = selection.anchor
      if (!history || dialog || drawing || anchor?.kind !== 'shot' || selection.ids.length !== 1)
        return
      const image = clipboardImage(event)
      if (!image) return
      event.preventDefault()
      void image
        .arrayBuffer()
        .then((buffer) => importThumbnailFromBytes(anchor.id, new Uint8Array(buffer)))
    }
    const ignoreStrayDrop = (event: DragEvent): void => {
      if (event.defaultPrevented) return
      event.preventDefault()
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'none'
    }
    window.addEventListener('paste', onPaste)
    window.addEventListener('dragover', ignoreStrayDrop)
    window.addEventListener('drop', ignoreStrayDrop)
    return () => {
      window.removeEventListener('paste', onPaste)
      window.removeEventListener('dragover', ignoreStrayDrop)
      window.removeEventListener('drop', ignoreStrayDrop)
    }
  }, [])
}
