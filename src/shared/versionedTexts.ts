// Log line et tag line : plusieurs versions courtes dans un fichier Markdown lisible à la main
// (## Version 1, ## Version 2 (retenue)…). Fonctions pures : lecture tolérante, écriture normalisée.

export interface TextVersion {
  text: string
  /** Version retenue pour la page de titre du PDF (une seule au plus). */
  retained: boolean
}

const HEADING = /^##[ \t]+Version\b(.*)$/i
const RETAINED = /\(\s*retenue\s*\)/i

/** Lit le fichier. Sans titre « ## Version », tout le texte forme une seule version. */
export function parseVersions(source: string): TextVersion[] {
  const lines = source.replace(/\r\n?/g, '\n').split('\n')
  const versions: TextVersion[] = []
  let current: { lines: string[]; retained: boolean } | null = null
  const preamble: string[] = []
  for (const line of lines) {
    const heading = HEADING.exec(line)
    if (heading) {
      if (current) versions.push(finish(current))
      current = { lines: [], retained: RETAINED.test(heading[1]) }
    } else if (current) current.lines.push(line)
    else preamble.push(line)
  }
  if (current) versions.push(finish(current))
  // Un texte écrit avant le premier titre ne se perd pas : il devient la première version.
  const before = preamble.join('\n').trim()
  if (before !== '') versions.unshift({ text: before, retained: false })
  // Plusieurs « (retenue) » : la première l'emporte.
  let seen = false
  return versions.map((version) => {
    const retained = version.retained && !seen
    if (retained) seen = true
    return { ...version, retained }
  })
}

function finish(block: { lines: string[]; retained: boolean }): TextVersion {
  return { text: block.lines.join('\n').trim(), retained: block.retained }
}

/** Écrit le fichier : versions renumérotées 1, 2, 3 ; une seule « (retenue) ». Aucune version = fichier vide. */
export function writeVersions(versions: readonly TextVersion[]): string {
  let retainedSeen = false
  const blocks = versions.map((version, index) => {
    const retained = version.retained && !retainedSeen
    if (retained) retainedSeen = true
    const title = `## Version ${index + 1}${retained ? ' (retenue)' : ''}`
    return `${title}\n\n${version.text.trim()}\n`
  })
  return blocks.join('\n')
}

/** Version retenue (texte non vide), pour la page de titre du PDF. */
export function retainedText(versions: readonly TextVersion[]): string | null {
  const found = versions.find((version) => version.retained && version.text.trim() !== '')
  return found ? found.text.trim() : null
}
