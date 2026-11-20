// Coupure des mots d'une ligne selon une largeur en caractères (police à chasse fixe).

const TAB = '    '

/**
 * Coupure possible après un trait d'union placé entre deux lettres (« rendez-|vous », « APRÈS-|MIDI »),
 * comme KIT Scenarist et le navigateur. Pas après un tiret isolé (« MAISON - JOUR ») ni devant un
 * chiffre (« semi-9mm »).
 */
const HYPHEN_BREAK = /(?<=\p{L}-)(?=\p{L})/u

interface Piece {
  text: string
  /** Espace qui précède le morceau ; vide pour la suite d'un mot coupé après un trait d'union. */
  glue: string
}

function pieces(text: string): { indent: string; pieces: Piece[] } {
  const tokens = text.replace(/\t/g, TAB).match(/\s+|\S+/g) ?? []
  let indent = ''
  let glue = ''
  const result: Piece[] = []
  tokens.forEach((token, index) => {
    if (/^\s/.test(token)) {
      if (index === 0) indent = token
      else glue = token
      return
    }
    token.split(HYPHEN_BREAK).forEach((part, i) => {
      result.push({ text: part, glue: i === 0 ? glue : '' })
    })
    glue = ''
  })
  return { indent, pieces: result }
}

/**
 * Découpe une ligne (sans « \n ») en lignes d'au plus `width` caractères.
 * Coupe entre les mots, ou après un trait d'union entre deux lettres ; un mot plus long que la ligne
 * est coupé net. Le retrait de début de ligne est gardé, les espaces à l'endroit d'une coupure
 * disparaissent. Une ligne vide donne une ligne vide.
 */
export function wrapLine(text: string, width: number): string[] {
  const max = Math.max(1, Math.floor(width))
  const { indent, pieces: parts } = pieces(text)
  const lines: string[] = []
  let line = indent

  for (const piece of parts) {
    const separator = line.trim() === '' ? '' : piece.glue
    if ((line + separator + piece.text).length <= max) {
      line += separator + piece.text
      continue
    }
    if (line.trim() !== '') lines.push(line)
    // Un retrait trop large pour le mot qui suit est abandonné plutôt que de couper le mot.
    line = line.trim() === '' && (line + piece.text).length <= max ? line : ''
    let word = piece.text
    while (line.length + word.length > max) {
      lines.push(word.slice(0, max))
      word = word.slice(max)
    }
    line += word
  }
  if (line !== '' || lines.length === 0) lines.push(line)
  return lines
}
