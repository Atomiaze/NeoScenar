// Documents du module Recherches : vrais dossiers dans neoscenar/documents/ (étape 10E).

import { cleanSheetName, safeFileStem, SHEET_EXTENSION } from './sheetNames'

export const DOCUMENTS_FOLDER = 'documents'

/** Une image posée directement dans un dossier de documents. */
export interface DocumentImage {
  fileName: string
  /** Relatif à neoscenar/ (« documents/Repérages été/plage.jpg »), pour le protocole d'images. */
  path: string
}

export interface DocumentNote {
  /** Relatif à neoscenar/documents/, séparateur « / » (« Repérages été/Plage.md »). */
  path: string
  /** Nom affiché : sans « .md », accents en NFC. */
  name: string
}

export interface DocumentFolder {
  /** Relatif à neoscenar/documents/ ; vide pour la racine. */
  path: string
  name: string
  folders: DocumentFolder[]
  notes: DocumentNote[]
  images: DocumentImage[]
}

/** Nom comparé sans tenir compte de la casse ni de la forme Unicode (le Mac écrit parfois en NFD). */
export function documentKey(name: string): string {
  return cleanSheetName(name.normalize('NFC')).toLocaleLowerCase('fr')
}

/** Nom propre d'un dossier (accents et espaces conservés, caractères interdits remplacés). */
export function documentFolderName(name: string): string {
  return safeFileStem(name.normalize('NFC'))
}

/** Nom du fichier d'une note. */
export function documentNoteFileName(name: string): string {
  return `${documentFolderName(name)}${SHEET_EXTENSION}`
}

/** Nom affiché d'une note : sans extension. */
export function noteDisplayName(fileName: string): string {
  return fileName.slice(0, -SHEET_EXTENSION.length).normalize('NFC')
}

/** Dernier segment d'un chemin « a/b/c ». */
export function lastSegment(path: string): string {
  return path.split('/').at(-1) ?? path
}

/** Dossier qui contient ce chemin (« a/b/c » → « a/b » ; « a » → vide). */
export function parentPath(path: string): string {
  const index = path.lastIndexOf('/')
  return index < 0 ? '' : path.slice(0, index)
}

export function joinPath(parent: string, name: string): string {
  return parent === '' ? name : `${parent}/${name}`
}

/** Le dossier de ce chemin dans l'arbre (la racine pour un chemin vide), ou null. */
export function findFolder(root: DocumentFolder, path: string): DocumentFolder | null {
  if (path === '') return root
  let current: DocumentFolder | undefined = root
  for (const segment of path.split('/')) {
    current = current.folders.find((folder) => lastSegment(folder.path) === segment)
    if (!current) return null
  }
  return current
}

export function findNote(root: DocumentFolder, path: string): DocumentNote | null {
  return findFolder(root, parentPath(path))?.notes.find((note) => note.path === path) ?? null
}

/** Nombre de dossiers et de notes de l'arbre (la racine non comptée). */
export function countDocuments(folder: DocumentFolder): number {
  return folder.folders.reduce(
    (total, child) => total + 1 + countDocuments(child),
    folder.notes.length
  )
}
