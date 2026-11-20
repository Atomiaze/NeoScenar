import { sameAspect } from '../../../shared/imageFormat'
import type { StoredOriginal, UndoAction } from '../../../shared/api'
import { updateShot } from '../../../shared/decoupage'
import type { Shot, ThumbnailCrop } from '../../../shared/projectTypes'
import { defaultCrop, FULL_FRAME, rotatedSize } from '../../../shared/thumbnail/geometry'
import { fr } from '../../i18n/fr'
import {
  cardsStore,
  closeDialog,
  commitDecoupage,
  openDialog,
  type CropRequest
} from '../cardsStore'
import { bitmapSize, decodeImage, renderThumbnailPng } from './drawing'
import {
  fileBaseName,
  planBatchImport,
  selectedShotsInOrder,
  type BatchPlan
} from '../../../shared/thumbnail/batch'

// Importer, recadrer et retirer la vignette d'un plan. Les fichiers sont toujours nouveaux :
// annuler revient simplement aux anciens chemins dans le découpage.

function findShot(shotId: string): Shot | null {
  const decoupage = cardsStore.get().history?.present
  for (const scene of decoupage?.scenes ?? []) {
    const shot = scene.shots.find((item) => item.id === shotId)
    if (shot) return shot
  }
  return null
}

function showError(message: string): void {
  openDialog({ kind: 'message', title: fr.thumbnail.errorTitle, message })
}

function projectSize() {
  return cardsStore.get().settings.resolution
}

/** Enregistre les nouveaux chemins dans le découpage (une étape d'annulation). */
function commitThumbnail(
  shotId: string,
  thumbnail: Pick<Shot, 'thumbnail' | 'thumbnailSource' | 'thumbnailCrop'>,
  label: UndoAction
): void {
  const decoupage = cardsStore.get().history?.present
  if (!decoupage) return
  const result = updateShot(decoupage, shotId, thumbnail)
  // Le plan a pu être supprimé pendant la fabrication de la vignette : rien à enregistrer.
  if (result.ok) commitDecoupage(result.decoupage, { label })
}

async function withBusy<T>(shotId: string, task: () => Promise<T>): Promise<T | null> {
  if (cardsStore.get().busyShotId) return null
  cardsStore.set({ busyShotId: shotId })
  try {
    return await task()
  } finally {
    cardsStore.set({ busyShotId: null })
  }
}

async function loadImage(path: string): Promise<ImageBitmap | null> {
  const bytes = await window.neoscenar.readProjectImage(path)
  if (!bytes.ok) {
    showError(bytes.error)
    return null
  }
  try {
    return await decodeImage(bytes.value)
  } catch {
    showError(fr.images.decodeFailed)
    return null
  }
}

/** Fabrique et enregistre la vignette, puis l'attache au plan. */
async function finish(request: CropRequest): Promise<void> {
  try {
    const png = await renderThumbnailPng(request.image, request.crop, projectSize())
    const stored = await window.neoscenar.storeThumbnail(request.shotId, png)
    if (!stored.ok) {
      showError(stored.error)
      return
    }
    commitThumbnail(
      request.shotId,
      { thumbnail: stored.value, thumbnailSource: request.source, thumbnailCrop: request.crop },
      request.label
    )
  } finally {
    request.image.close()
  }
}

/**
 * Nouvelle image d'origine déjà copiée dans le projet : aux bonnes proportions (à 1 % près),
 * elle devient directement la vignette ; sinon la fenêtre de recadrage s'ouvre.
 */
async function useOriginal(shotId: string, original: StoredOriginal): Promise<void> {
  const image = await loadImage(original.path)
  if (!image) return
  const size = bitmapSize(image)
  const target = projectSize()
  const label: UndoAction = findShot(shotId)?.thumbnail ? 'replaceThumbnail' : 'importThumbnail'
  const crop = defaultCrop(size, target)
  const request: CropRequest = { shotId, source: original.path, image, crop, label }
  if (sameAspect(size, target)) await finish({ ...request, crop: { ...crop, frame: FULL_FRAME } })
  else openDialog({ kind: 'crop', request })
}

/** Image choisie ou glissée depuis le Finder. */
export function importThumbnailFromPath(shotId: string, sourcePath: string): Promise<void | null> {
  return withBusy(shotId, async () => {
    const stored = await window.neoscenar.storeOriginalFile(shotId, sourcePath)
    if (stored.ok) await useOriginal(shotId, stored.value)
    else showError(stored.error)
  })
}

/** Image collée depuis le presse-papiers. */
export function importThumbnailFromBytes(shotId: string, bytes: Uint8Array): Promise<void | null> {
  return withBusy(shotId, async () => {
    const stored = await window.neoscenar.storeOriginalBytes(shotId, bytes)
    if (stored.ok) await useOriginal(shotId, stored.value)
    else showError(stored.error)
  })
}

/** « Importer une image… » et « Remplacer… ». */
export async function chooseThumbnail(shotId: string): Promise<void> {
  const [path] = await window.neoscenar.chooseImageFiles(false)
  if (path) await importThumbnailFromPath(shotId, path)
}

/** « Recadrer… » : rouvre la fenêtre sur l'image d'origine, avec le dernier cadre. */
export function recropThumbnail(shotId: string): Promise<void | null> {
  return withBusy(shotId, async () => {
    const shot = findShot(shotId)
    if (!shot?.thumbnailSource) return
    const image = await loadImage(shot.thumbnailSource)
    if (!image) return
    const crop: ThumbnailCrop =
      shot.thumbnailCrop ?? defaultCrop(rotatedSize(bitmapSize(image), 0), projectSize())
    openDialog({
      kind: 'crop',
      request: { shotId, source: shot.thumbnailSource, image, crop, label: 'recropThumbnail' }
    })
  })
}

/** « Valider » dans la fenêtre de recadrage. Le badge « À vérifier » disparaît. */
export function validateCrop(request: CropRequest, crop: ThumbnailCrop): Promise<void | null> {
  closeDialog()
  return withBusy(request.shotId, () => finish({ ...request, crop: { ...crop, auto: false } }))
}

export function cancelCrop(request: CropRequest): void {
  closeDialog()
  request.image.close()
}

/** « Retirer la vignette » : le fichier reste sur le disque (rangé à la fermeture du projet). */
export function removeThumbnail(shotId: string): void {
  commitThumbnail(
    shotId,
    { thumbnail: null, thumbnailSource: null, thumbnailCrop: null },
    'removeThumbnail'
  )
}

/** Une image du lot : copiée, recadrée au centre si besoin, et enregistrée. */
async function prepareBatchImage(
  shotId: string,
  path: string
): Promise<Pick<Shot, 'thumbnail' | 'thumbnailSource' | 'thumbnailCrop'>> {
  const stored = await window.neoscenar.storeOriginalFile(shotId, path)
  if (!stored.ok) throw new Error(stored.error)
  const bytes = await window.neoscenar.readProjectImage(stored.value.path)
  if (!bytes.ok) throw new Error(bytes.error)
  let image: ImageBitmap
  try {
    image = await decodeImage(bytes.value)
  } catch {
    throw new Error(fr.images.decodeFailed)
  }
  try {
    const size = bitmapSize(image)
    const target = projectSize()
    // Pas de fenêtre pour chaque image : recadrage automatique au centre, signalé « À vérifier ».
    const crop: ThumbnailCrop = sameAspect(size, target)
      ? { ...defaultCrop(size, target), frame: FULL_FRAME }
      : { ...defaultCrop(size, target), auto: true }
    const png = await renderThumbnailPng(image, crop, target)
    const thumbnail = await window.neoscenar.storeThumbnail(shotId, png)
    if (!thumbnail.ok) throw new Error(thumbnail.error)
    return { thumbnail: thumbnail.value, thumbnailSource: stored.value.path, thumbnailCrop: crop }
  } finally {
    image.close()
  }
}

async function runBatch(plan: BatchPlan): Promise<void> {
  if (cardsStore.get().busyShotId || cardsStore.get().importProgress) return
  const total = plan.pairs.length
  cardsStore.set({ importProgress: { done: 0, total } })
  const prepared: Record<string, Pick<Shot, 'thumbnail' | 'thumbnailSource' | 'thumbnailCrop'>> = {}
  const failures: string[] = []
  try {
    for (const [index, pair] of plan.pairs.entries()) {
      try {
        prepared[pair.shotId] = await prepareBatchImage(pair.shotId, pair.path)
      } catch (error) {
        failures.push(fr.thumbnail.batchFailure(fileBaseName(pair.path), (error as Error).message))
      }
      cardsStore.set({ importProgress: { done: index + 1, total } })
    }
  } finally {
    cardsStore.set({ importProgress: null })
  }
  // Toutes les images en une seule étape d'annulation.
  let decoupage = cardsStore.get().history?.present
  if (decoupage) {
    for (const [shotId, fields] of Object.entries(prepared)) {
      const result = updateShot(decoupage, shotId, fields)
      if (result.ok) decoupage = result.decoupage
    }
    commitDecoupage(decoupage, { label: 'importThumbnails' })
  }
  const notes = [
    ...(plan.ignored > 0 ? [fr.thumbnail.batchIgnored(plan.ignored)] : []),
    ...failures
  ]
  if (notes.length > 0) showError(notes.join('\n'))
}

/** « Importer des images… » : une image par plan sélectionné, dans l'ordre du film. */
export async function importImagesForSelection(): Promise<void> {
  const { history, selection } = cardsStore.get()
  if (!history) return
  const shots = selectedShotsInOrder(history.present, selection.ids)
  if (shots.length === 0) return
  const paths = await window.neoscenar.chooseImageFiles(true)
  if (paths.length === 0) return
  const plan = planBatchImport(paths, shots)
  if (plan.replacing === 0) {
    await runBatch(plan)
    return
  }
  openDialog({
    kind: 'confirm',
    title: fr.thumbnail.replaceConfirm(plan.replacing),
    confirmLabel: fr.thumbnail.replaceConfirmButton,
    onConfirm: () => void runBatch(plan)
  })
}
