// Retour à la ligne sans jamais réduire la police ni couper le texte : un champ prend autant de
// lignes que nécessaire. Un mot plus long qu'une ligne entière est coupé entre deux caractères.

/** Largeur disponible pour la ligne n (la première ligne d'un champ suit son libellé). */
export type LineWidth = (lineIndex: number) => number

export function wrapText(
  text: string,
  width: LineWidth,
  measure: (text: string) => number
): string[] {
  const lines: string[] = []
  const paragraphs = text.replace(/\r\n?/g, '\n').replace(/\t/g, ' ').split('\n')
  // Les lignes vides de la fin n'ajoutent rien : on les retire, celles du milieu sont gardées.
  while (paragraphs.length > 0 && paragraphs[paragraphs.length - 1].trim() === '') paragraphs.pop()
  for (const paragraph of paragraphs) {
    const words = paragraph.split(' ').filter((word) => word !== '')
    let current = ''
    if (words.length === 0) {
      lines.push('')
      continue
    }
    for (const word of words) {
      const candidate = current === '' ? word : `${current} ${word}`
      if (measure(candidate) <= width(lines.length)) {
        current = candidate
        continue
      }
      if (current !== '') lines.push(current)
      current = breakLongWord(word, width, measure, lines)
    }
    lines.push(current)
  }
  return lines
}

/** Pose les morceaux complets d'un mot trop long dans `lines` et rend le dernier morceau. */
function breakLongWord(
  word: string,
  width: LineWidth,
  measure: (text: string) => number,
  lines: string[]
): string {
  let piece = ''
  for (const char of Array.from(word)) {
    if (piece !== '' && measure(piece + char) > width(lines.length)) {
      lines.push(piece)
      piece = ''
    }
    piece += char
  }
  return piece
}
