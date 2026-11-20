// Chemins des images des fiches (séparateur « / », relatifs au dossier neoscenar/).

import { CREDITS_LOGOS_FOLDER } from '../credits/types'
import { isSafeRelativePath } from '../relativePath'
import { IMAGE_PROTOCOL } from '../thumbnail/files'
import { DOCUMENTS_FOLDER } from './documents'
import { SHEET_IMAGES_FOLDER, SHEET_SCHEMAS, type SheetKind } from './types'

/** Formats affichés dans la galerie (Obsidian peut en insérer d'autres que PNG et JPEG). */
const DISPLAYED_EXTENSIONS = /\.(png|jpe?g|gif|webp)$/i

function isSheetKind(value: string): value is SheetKind {
  return Object.hasOwn(SHEET_SCHEMAS, value)
}

/** Vrai pour un nom de fichier d'image affichable dans une galerie. */
export function isDisplayedImageName(name: string): boolean {
  return DISPLAYED_EXTENSIONS.test(name)
}

/** Chemin propre (sans « . » ni « .. ») ; null s'il sortirait du dossier de départ. */
function normalize(segments: string[]): string[] | null {
  const result: string[] = []
  for (const segment of segments) {
    if (segment === '' || segment === '.') continue
    if (segment === '..') {
      if (result.length === 0) return null
      result.pop()
    } else result.push(segment)
  }
  return result
}

/**
 * Chemins possibles (relatifs à neoscenar/) d'une image insérée dans une fiche, du plus probable
 * au moins probable ; vide pour une adresse web ou un chemin qui sortirait du dossier des fiches.
 * « ![[photo.jpg]] » d'Obsidian ne donne que le nom : on cherche aussi dans images/.
 */
export function imageCandidates(kind: SheetKind, ref: string): string[] {
  if (/^[a-z][a-z0-9+.-]*:/i.test(ref) || ref.startsWith('/')) return []
  const segments = normalize([kind, ...ref.replace(/\\/g, '/').split('/')])
  if (!segments || segments[0] !== kind || segments.length < 2) return []
  const direct = segments.join('/')
  if (!DISPLAYED_EXTENSIONS.test(direct) || !isSafeRelativePath(direct)) return []
  return /[\\/]/.test(ref) ? [direct] : [direct, `${kind}/${SHEET_IMAGES_FOLDER}/${ref}`]
}

/** Logo du générique : generique/logos/<fichier>. */
function isLogoPath(segments: string[]): boolean {
  return segments.length === 3 && segments.slice(0, 2).join('/') === CREDITS_LOGOS_FOLDER
}

/** Vrai pour une image affichable d'un dossier de fiches ou de documents (protocole d'images). */
export function isSheetImagePath(path: string): boolean {
  const segments = path.split('/')
  const clean = normalize(segments)
  return (
    clean !== null &&
    clean.length === segments.length &&
    isSafeRelativePath(path) &&
    clean.length >= 2 &&
    (isSheetKind(clean[0]) || clean[0] === DOCUMENTS_FOLDER || isLogoPath(clean)) &&
    DISPLAYED_EXTENSIONS.test(path)
  )
}

/** Adresse d'une image de fiche pour une balise <img> (espaces et accents encodés). */
export function sheetImageUrl(path: string): string {
  return `${IMAGE_PROTOCOL}://projet/${path.split('/').map(encodeURIComponent).join('/')}`
}
