// Versions du scénario (étape 13C) : une version est un dossier de neoscenar/versions/ qui contient
// scenario.fountain, decoupage.json, projet.json et version.json (nom, note, date, pages, durée).
// Ce fichier ne contient que des calculs purs (noms, lecture de version.json, tri).

import { sanitizeFolderName } from '../folderName'

/** Dossier des versions, dans neoscenar/. */
export const VERSIONS_FOLDER = 'versions'

/** Fichier de description d'une version. */
export const VERSION_FILE = 'version.json'

/** Version du format de version.json. */
export const VERSION_FORMAT = 1

/** Longueurs maximales (garde-fous contre un fichier abîmé ou une saisie démesurée). */
export const MAX_VERSION_NAME = 120
export const MAX_VERSION_NOTE = 4000

/** Contenu de version.json. */
export interface VersionData {
  formatVersion: number
  name: string
  note: string
  /** Date ISO 8601. */
  createdAt: string
  pages: number
  /** Durée estimée, en secondes. */
  seconds: number
}

/** Version listée dans la fenêtre : `folder` est le nom de son dossier dans versions/. */
export type VersionEntry =
  ({ folder: string; broken: false } & VersionData) | { folder: string; broken: true }

/** « 20261119-143205 » : l'ordre alphabétique suit le temps. */
export function versionStamp(date: Date): string {
  const two = (value: number): string => String(value).padStart(2, '0')
  return (
    `${date.getFullYear()}${two(date.getMonth() + 1)}${two(date.getDate())}-` +
    `${two(date.getHours())}${two(date.getMinutes())}${two(date.getSeconds())}`
  )
}

/** « 19/11/2026 14:32 », dans l'heure locale. */
export function formatVersionDate(date: Date): string {
  const two = (value: number): string => String(value).padStart(2, '0')
  return (
    `${two(date.getDate())}/${two(date.getMonth() + 1)}/${date.getFullYear()} ` +
    `${two(date.getHours())}:${two(date.getMinutes())}`
  )
}

/**
 * Nom du dossier d'une version : « 20261119-143205_Version_1 ». Sans accent ni espace ; si le nom
 * ne garde aucune lettre utilisable, seule la date reste. `taken` : dossiers déjà présents.
 */
export function versionFolderName(date: Date, name: string, taken: ReadonlySet<string>): string {
  const clean = sanitizeFolderName(name).slice(0, 60).replace(/_+$/, '')
  const base = clean === '' ? versionStamp(date) : `${versionStamp(date)}_${clean}`
  let folder = base
  for (let i = 2; taken.has(folder); i++) folder = `${base}_${i}`
  return folder
}

/** Nom proposé : « Version N », N étant un de plus que le plus grand « Version k » existant. */
export function suggestVersionName(names: readonly string[]): string {
  let highest = 0
  for (const name of names) {
    const match = /^Version (\d+)$/.exec(name.trim())
    if (match) highest = Math.max(highest, Number(match[1]))
  }
  return `Version ${Math.max(highest, names.length) + 1}`
}

/** Nom saisi : espaces superflus retirés ; vide = refusé (null). */
export function cleanVersionName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const name = raw.replace(/\s+/g, ' ').trim().slice(0, MAX_VERSION_NAME)
  return name === '' ? null : name
}

export function cleanVersionNote(raw: unknown): string {
  return typeof raw === 'string' ? raw.trim().slice(0, MAX_VERSION_NOTE) : ''
}

/** Lit le contenu de version.json ; null s'il est abîmé. */
export function parseVersionData(raw: unknown): VersionData | null {
  if (typeof raw !== 'object' || raw === null) return null
  const value = raw as Record<string, unknown>
  const name = cleanVersionName(value.name)
  const createdAt = typeof value.createdAt === 'string' ? value.createdAt : ''
  const number = (field: unknown): number | null =>
    typeof field === 'number' && Number.isFinite(field) && field >= 0 ? field : null
  const pages = number(value.pages)
  const seconds = number(value.seconds)
  if (name === null || Number.isNaN(Date.parse(createdAt)) || pages === null || seconds === null)
    return null
  return {
    formatVersion: typeof value.formatVersion === 'number' ? value.formatVersion : VERSION_FORMAT,
    name,
    note: cleanVersionNote(value.note),
    createdAt,
    pages,
    seconds
  }
}

/** Plus récentes en premier ; les versions abîmées à la fin, par nom de dossier. */
export function sortVersions(entries: readonly VersionEntry[]): VersionEntry[] {
  return [...entries].sort((a, b) => {
    if (a.broken !== b.broken) return a.broken ? 1 : -1
    if (!a.broken && !b.broken && a.createdAt !== b.createdAt)
      return a.createdAt < b.createdAt ? 1 : -1
    return a.folder < b.folder ? 1 : a.folder > b.folder ? -1 : 0
  })
}

/** Nom de dossier acceptable pour une version (évite « ../ » venu de l'interface). */
export function isVersionFolderName(folder: unknown): folder is string {
  return (
    typeof folder === 'string' &&
    /^[A-Za-z0-9_-]+$/.test(folder) &&
    folder.length <= 120 &&
    !folder.startsWith('.')
  )
}

/** Dossier proposé pour un duplicata : « Mon_Film_Version_2 ». */
export function duplicateFolderName(filmFolder: string, versionName: string): string {
  const suffix = sanitizeFolderName(versionName).slice(0, 60).replace(/_+$/, '')
  return suffix === '' ? `${filmFolder}_copie` : `${filmFolder}_${suffix}`
}
