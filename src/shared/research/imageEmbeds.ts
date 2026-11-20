// Images insérées dans le texte d'une fiche. NeoScenar écrit le Markdown standard
// « ![](images/marie-1.jpg) » ; il lit aussi la forme d'Obsidian « ![[marie-1.jpg]] ».

// Chemin entre chevrons (« <images/mon image.jpg> ») ou sans espace, titre facultatif.
const MARKDOWN_EMBED = /!\[[^\]]*\]\(\s*(?:<([^>]*)>|([^)\s]+))(?:\s+"[^"]*")?\s*\)/g
// « ![[nom.jpg]] », « ![[nom.jpg|200]] ».
const WIKI_EMBED = /!\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]/g

interface Embed {
  ref: string
  /** Position du texte de l'insertion dans la ligne. */
  start: number
  end: number
}

function decode(ref: string): string {
  try {
    return decodeURI(ref)
  } catch {
    return ref
  }
}

function embedsOf(line: string): Embed[] {
  const found: Embed[] = []
  for (const match of line.matchAll(MARKDOWN_EMBED)) {
    const ref = match[1] ?? decode(match[2])
    found.push({ ref: ref.trim(), start: match.index, end: match.index + match[0].length })
  }
  for (const match of line.matchAll(WIKI_EMBED)) {
    found.push({ ref: match[1].trim(), start: match.index, end: match.index + match[0].length })
  }
  return found.sort((a, b) => a.start - b.start)
}

/** Chemins des images insérées dans ces lignes, dans l'ordre, sans doublon. */
export function listEmbeds(lines: string[]): string[] {
  const refs = lines.flatMap((line) => embedsOf(line).map((embed) => embed.ref))
  return [...new Set(refs.filter((ref) => ref !== ''))]
}

/** Texte Markdown standard d'une image ; chevrons si le chemin contient espaces ou parenthèses. */
export function embedText(ref: string): string {
  return /[\s()<>]/.test(ref) ? `![](<${ref}>)` : `![](${ref})`
}

/**
 * Applique une nouvelle liste d'images aux lignes de la section : les images retirées disparaissent
 * de leur ligne (la ligne aussi si elle devient vide), les nouvelles sont ajoutées après la
 * dernière image. Le reste du texte de la section ne bouge pas.
 */
export function applyEmbeds(lines: string[], wanted: string[]): string[] {
  const keep = new Set(wanted)
  const present = new Set(listEmbeds(lines))
  const result: string[] = []
  let lastEmbedLine = -1
  for (const line of lines) {
    const embeds = embedsOf(line)
    const removed = embeds.filter((embed) => !keep.has(embed.ref))
    let kept = line
    for (const embed of [...removed].reverse()) {
      kept = kept.slice(0, embed.start) + kept.slice(embed.end)
    }
    if (removed.length > 0 && kept.trim() === '') continue
    result.push(removed.length > 0 ? kept.replace(/\s+$/, '') : kept)
    if (embeds.length > removed.length) lastEmbedLine = result.length - 1
  }
  const added = wanted.filter((ref) => !present.has(ref)).map(embedText)
  if (added.length === 0) return result
  if (lastEmbedLine >= 0) {
    result.splice(lastEmbedLine + 1, 0, ...added)
    return result
  }
  // Pas encore d'image : après le texte de la section, suivies d'une ligne vide.
  let end = result.length
  while (end > 0 && result[end - 1].trim() === '') end--
  return [...result.slice(0, end), '', ...added, '', ...result.slice(end).slice(1)]
}
