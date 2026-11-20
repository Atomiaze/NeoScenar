// Règles de noms de fichiers, les mêmes sur les trois systèmes : un nom refusé par Windows est
// refusé partout, pour qu'un projet créé sur Mac ou Linux s'ouvre sur un PC de l'école.

/** Caractères interdits par Windows (et « / » partout), plus les caractères de contrôle. */
// eslint-disable-next-line no-control-regex
const FORBIDDEN_CHAR = /[<>:"/\\|?*\u0000-\u001f]/

/** Noms réservés par Windows, avec ou sans extension (« CON », « con.txt », « COM1.md »…). */
const RESERVED = /^(con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])$/i

/**
 * Au-delà, l'Explorateur de fichiers, Blender ou d'autres logiciels de Windows ne savent plus
 * ouvrir le fichier (limite historique de 260 caractères, fin de chaîne comprise).
 */
export const MAX_PATH_LENGTH = 259

/** Ce qui ne va pas dans un nom de fichier ou de dossier, ou null s'il convient partout. */
export type FileNameProblem =
  | { kind: 'empty' }
  | { kind: 'forbidden-char'; char: string }
  | { kind: 'reserved' }
  | { kind: 'trailing' }
  | { kind: 'leading-dot' }

/** Vrai pour un nom réservé par Windows : la partie avant le premier point compte seule. */
export function isReservedName(name: string): boolean {
  const stem = name.split('.')[0].replace(/ +$/, '')
  return RESERVED.test(stem)
}

/** Vérifie un nom tapé par l'élève (dossier, note…), extension comprise. */
export function fileNameProblem(name: string): FileNameProblem | null {
  if (name === '') return { kind: 'empty' }
  const forbidden = FORBIDDEN_CHAR.exec(name)
  if (forbidden) return { kind: 'forbidden-char', char: forbidden[0] }
  if (/[. ]$/.test(name)) return { kind: 'trailing' }
  if (name.startsWith('.')) return { kind: 'leading-dot' }
  if (isReservedName(name)) return { kind: 'reserved' }
  return null
}

/**
 * Rend utilisable un nom qui vient d'ailleurs (scénario, titre) : un nom réservé reçoit « _ »
 * avant son premier point (« CON » → « CON_ », « AUX.b » → « AUX_.b »). Les caractères
 * interdits sont traités par l'appelant.
 */
export function avoidReservedName(name: string): string {
  return isReservedName(name) ? name.replace(/^([^.]*?) *(?=\.|$)/, '$1_') : name
}

/** Vrai si ce chemin complet dépasse ce que Windows sait ouvrir partout. */
export function isPathTooLong(path: string): boolean {
  return path.length > MAX_PATH_LENGTH
}
