// Emplacement et noms des fichiers de vignettes, relatifs au dossier neoscenar/ (séparateur « / »).

export const THUMBNAILS_DIR = 'storyboard/vignettes'
export const ORIGINALS_DIR = 'storyboard/originaux'
/** Fichiers devenus inutiles : déplacés ici à la fermeture du projet, jamais supprimés. */
export const RETIRED_DIR = 'sauvegardes/vignettes_retirees'

export type ImageExtension = 'png' | 'jpg'

/** Identifiant du plan réduit aux lettres, chiffres et tirets (aucun accent ni espace). */
export function fileSafeId(id: string): string {
  const safe = id.replace(/[^A-Za-z0-9-]/g, '_').slice(0, 64)
  return safe === '' ? 'plan' : safe
}

const pad = (value: number, length = 2): string => String(value).padStart(length, '0')

/** « 20261117-143012-042 » (heure universelle, pour ne pas dépendre du fuseau). */
export function fileTimestamp(date: Date): string {
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}-` +
    `${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}-` +
    pad(date.getUTCMilliseconds(), 3)
  )
}

/**
 * Nom d'un nouveau fichier : « <idPlan>_<horodatage>.png ». `attempt` (2, 3…) départage deux
 * fichiers créés dans la même milliseconde.
 */
export function imageFileName(
  shotId: string,
  date: Date,
  extension: ImageExtension,
  attempt = 1
): string {
  const suffix = attempt > 1 ? `-${attempt}` : ''
  return `${fileSafeId(shotId)}_${fileTimestamp(date)}${suffix}.${extension}`
}

/** Vrai pour un chemin de vignette ou d'image d'origine créé par NeoScenar. */
export function isStoryboardImagePath(path: string): boolean {
  return /^storyboard\/(vignettes|originaux)\/[A-Za-z0-9_-]+\.(png|jpg)$/.test(path)
}

/** Protocole interne qui sert les images du projet ouvert à l'interface (affichage seulement). */
export const IMAGE_PROTOCOL = 'neoscenar-image'

/** Adresse d'une image du projet pour une balise <img>. */
export function projectImageUrl(path: string): string {
  return `${IMAGE_PROTOCOL}://projet/${path}`
}

/** Adresse de l'aperçu réduit d'une vignette (cartes du tableau). */
export function previewImageUrl(path: string): string {
  return `${IMAGE_PROTOCOL}://apercu/${path}`
}
