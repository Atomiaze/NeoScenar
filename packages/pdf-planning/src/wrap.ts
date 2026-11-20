// Retour à la ligne sans réduire la police : un texte prend autant de lignes que nécessaire. Un mot
// plus long qu'une ligne entière est coupé entre deux caractères. (Même règle que le storyboard.)

export function wrapText(text: string, width: number, measure: (text: string) => number): string[] {
  const lines: string[] = []
  const paragraphs = text.replace(/\r\n?/g, '\n').replace(/\t/g, ' ').split('\n')
  while (paragraphs.length > 0 && paragraphs[paragraphs.length - 1].trim() === '') paragraphs.pop()
  for (const paragraph of paragraphs) {
    const words = paragraph.split(' ').filter((word) => word !== '')
    if (words.length === 0) {
      lines.push('')
      continue
    }
    let current = ''
    for (const word of words) {
      const candidate = current === '' ? word : `${current} ${word}`
      if (measure(candidate) <= width) {
        current = candidate
        continue
      }
      if (current !== '') lines.push(current)
      current = ''
      for (const char of Array.from(word)) {
        if (current !== '' && measure(current + char) > width) {
          lines.push(current)
          current = ''
        }
        current += char
      }
    }
    lines.push(current)
  }
  return lines
}

/** Texte raccourci avec « … » pour tenir dans `width` (étiquettes de la ligne du temps seulement). */
export function truncate(text: string, width: number, measure: (text: string) => number): string {
  if (measure(text) <= width) return text
  const chars = Array.from(text)
  while (chars.length > 0 && measure(`${chars.join('').trimEnd()}…`) > width) chars.pop()
  return chars.length === 0 ? '' : `${chars.join('').trimEnd()}…`
}
