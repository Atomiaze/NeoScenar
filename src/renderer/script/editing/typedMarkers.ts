// Symboles Fountain tapés en début de ligne (18C-11). Un symbole écrit par l'élève dit le type
// voulu : il l'emporte sur le type choisi par Entrée ou Tab, si Fountain lit bien la ligne ainsi.

import type { ElementType } from '@neoscenar/fountain'

/**
 * Type annoncé par le symbole qui ouvre la ligne (ou par une note seule sur sa ligne), ou null. Mêmes règles que l'analyseur :
 * « > texte » est une transition, « > texte < » un texte centré ; un point n'ouvre un en-tête que
 * suivi d'une lettre (« ... » et « .5 » ne sont pas des symboles, voir `startsWithLooseDot`).
 */
export function markedType(line: string): ElementType | null {
  const start = line.trimStart()
  const trimmed = start.trimEnd()
  if (/^\[\[[\s\S]*\]\]$/.test(trimmed)) return 'note'
  if (/^={3,}$/.test(trimmed)) return 'page_break'
  if (start.startsWith('!')) return 'action'
  if (/^\.\p{L}/u.test(start)) return 'scene_heading'
  if (start.startsWith('@')) return 'character'
  if (start.startsWith('>')) {
    return trimmed.length > 1 && trimmed.endsWith('<') ? 'centered' : 'transition'
  }
  if (start.startsWith('~')) return 'lyrics'
  if (start.startsWith('#')) return 'section'
  if (start.startsWith('=')) return 'synopsis'
  return null
}

/**
 * Ligne qui commence par un point non suivi d'une lettre : « ... et puis », « .5 seconde ». Pour
 * l'élève, c'est une action. Fountain lit pourtant « .5 » comme un en-tête forcé (point suivi d'un
 * chiffre) : une telle action est donc écrite « !.5 » dans le fichier.
 */
export function startsWithLooseDot(line: string): boolean {
  return /^\.(?!\p{L})/u.test(line.trimStart())
}
