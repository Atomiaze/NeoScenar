import {
  closeSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  rmSync,
  writeSync
} from 'node:fs'
import nodePath, { type PlatformPath } from 'node:path'
import { pathToFileURL } from 'node:url'

// Dictionnaire français livré avec l'application (correcteur hors ligne sous Windows et Linux).
//
// Sur Mac, Electron utilise le correcteur du système : rien à faire. Sous Linux, Chromium utilise
// Hunspell et télécharge le dictionnaire s'il ne le trouve pas : on le dépose d'avance là où il le
// cherche. Sous Windows, Chromium 156 prend le correcteur de Windows quand le français y est installé
// (impossible de l'en empêcher) et ne passe par Hunspell qu'autrement : notre fichier sert alors.
// Source et licence : resources/dictionnaires/LISEZMOI.md.

/** Nom attendu par Chromium 156 (Electron 45) : langue + version du format. À revoir si Electron change. */
export const DICTIONARY_FILE = 'fr-FR-3-0.bdic'
/** Langue imposée au correcteur, quelle que soit la langue du système. */
export const SPELLCHECK_LANGUAGE = 'fr-FR'

/**
 * Emplacement où Chromium cherche le dictionnaire, ou null sur Mac.
 * Linux : <données>/Dictionaries/. Windows : le dossier « Dictionaries » à côté du .exe, puis, s'il
 * manque, <données>/ directement (seul endroit où l'élève peut écrire sur un PC de l'école).
 */
export function dictionaryTarget(
  platform: NodeJS.Platform,
  userDataDir: string,
  p: PlatformPath = nodePath
): string | null {
  if (platform === 'darwin') return null
  if (platform === 'win32') return p.join(userDataDir, DICTIONARY_FILE)
  return p.join(userDataDir, 'Dictionaries', DICTIONARY_FILE)
}

export type InstallResult = 'unchanged' | 'installed' | 'failed'

/**
 * Copie le dictionnaire livré vers l'emplacement de Chromium s'il y manque ou diffère (fichier abîmé,
 * ancienne version). Écriture sûre : fichier temporaire puis renommage. Une erreur ne bloque jamais
 * le lancement : le correcteur sera seulement absent.
 */
export function installDictionary(source: string, target: string): InstallResult {
  try {
    const wanted = readFileSync(source)
    let current: Buffer | null = null
    try {
      current = readFileSync(target)
    } catch {
      current = null
    }
    if (current !== null && current.equals(wanted)) return 'unchanged'
    mkdirSync(nodePath.dirname(target), { recursive: true })
    const temporary = `${target}.tmp`
    const handle = openSync(temporary, 'w')
    try {
      writeSync(handle, wanted)
    } finally {
      closeSync(handle)
    }
    try {
      renameSync(temporary, target)
    } catch (error) {
      rmSync(temporary, { force: true })
      throw error
    }
    return 'installed'
  } catch (error) {
    console.error('Dictionnaire du correcteur non installé :', error)
    return 'failed'
  }
}

/** Ce que l'on utilise de la session d'Electron (remplaçable dans les tests). */
export interface SpellcheckSession {
  setSpellCheckerDictionaryDownloadURL(url: string): void
  setSpellCheckerLanguages(languages: string[]): void
  on(
    event:
      | 'spellcheck-dictionary-download-begin'
      | 'spellcheck-dictionary-download-success'
      | 'spellcheck-dictionary-download-failure',
    listener: (event: unknown, languageCode: string) => void
  ): unknown
}

/**
 * Règle le correcteur sous Windows et Linux : français imposé, et adresse de téléchargement tournée
 * vers le dossier de l'application (jamais internet) au cas où le fichier déposé serait refusé.
 */
export function configureSpellchecker(
  session: SpellcheckSession,
  platform: NodeJS.Platform,
  dictionariesDir: string
): void {
  if (platform === 'darwin') return
  // La barre finale est exigée par Electron (adresse = base + nom du fichier).
  session.setSpellCheckerDictionaryDownloadURL(`${pathToFileURL(dictionariesDir).href}/`)
  try {
    session.setSpellCheckerLanguages([SPELLCHECK_LANGUAGE])
  } catch (error) {
    console.error('Langue du correcteur refusée :', error)
  }
  session.on('spellcheck-dictionary-download-begin', (_event, language) =>
    console.warn(`Correcteur : téléchargement demandé pour ${language} (dictionnaire non trouvé).`)
  )
  session.on('spellcheck-dictionary-download-failure', (_event, language) =>
    console.warn(`Correcteur : dictionnaire ${language} indisponible.`)
  )
}
