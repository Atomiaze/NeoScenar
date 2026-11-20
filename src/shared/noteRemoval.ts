// Retrait d'une note `[[ ]]` (ou de toute autre portion de texte) dans une ligne, sans laisser d'espaces
// en trop. Fonction pure, sans lien avec l'éditeur : elle servira aussi à effacer les marques du mode
// révision (étape 13E).

export interface Range {
  from: number
  to: number
}

const SPACES = /^[ \t]+/
const TRAILING_SPACES = /[ \t]+$/

/**
 * Retire `[from, to)` du texte. Règles, sur la ligne où se trouve la coupure :
 * - jamais d'espace en début ni en fin de ligne ;
 * - deux espaces qui se rejoignent n'en font qu'un ;
 * - les retours à la ligne ne sont jamais touchés (les lignes ne se rejoignent pas) ;
 * - les espaces déjà présents ailleurs dans le texte restent tels quels.
 */
export function removeRange(text: string, { from, to }: Range): string {
  let left = text.slice(0, from)
  let right = text.slice(to)
  const atLineStart = left === '' || left.endsWith('\n')
  const atLineEnd = right === '' || right.startsWith('\n') || right.startsWith('\r')
  if (atLineStart) right = right.replace(SPACES, '')
  else if (atLineEnd) left = left.replace(TRAILING_SPACES, '')
  else if (/[ \t]$/.test(left)) right = right.replace(SPACES, '')
  return left + right
}

/** Retire plusieurs portions (qui ne se chevauchent pas), de la dernière à la première. */
export function removeRanges(text: string, ranges: readonly Range[]): string {
  return [...ranges]
    .sort((a, b) => b.from - a.from)
    .reduce((current, range) => removeRange(current, range), text)
}
