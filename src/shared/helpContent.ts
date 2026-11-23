// Contenu de la fenêtre « Aide » d'un module : des onglets faits de blocs simples (paragraphe,
// tableau, liste, exemple). Les textes eux-mêmes sont dans `fr.ts`. Dans un texte, `**gras**`
// et `` `code` `` sont les deux seules mises en forme (voir `inlineParts`).

/** Élément de liste : un texte, éventuellement suivi d'une sous-liste. */
export type HelpListItem = string | { readonly text: string; readonly items: readonly string[] }

export type HelpBlock =
  | { readonly kind: 'paragraph'; readonly text: string }
  | {
      readonly kind: 'table'
      readonly head: readonly string[]
      readonly rows: readonly (readonly string[])[]
    }
  | { readonly kind: 'list'; readonly ordered?: boolean; readonly items: readonly HelpListItem[] }
  | { readonly kind: 'example'; readonly text: string }

export interface HelpTab {
  /** Titre court de l'onglet. */
  readonly tab: string
  /** Titre complet de la rubrique, en tête de l'onglet. */
  readonly title: string
  readonly blocks: readonly HelpBlock[]
}

export type InlinePart = { readonly kind: 'text' | 'bold' | 'code'; readonly text: string }

/**
 * Découpe un texte en morceaux : texte simple, `**gras**`, `` `code` ``. Un marqueur sans sa
 * fermeture reste affiché tel quel.
 */
export function inlineParts(text: string): InlinePart[] {
  const parts: InlinePart[] = []
  const pattern = /\*\*(.+?)\*\*|`([^`]+)`/g
  let last = 0
  for (const match of text.matchAll(pattern)) {
    const start = match.index ?? 0
    if (start > last) parts.push({ kind: 'text', text: text.slice(last, start) })
    if (match[1] !== undefined) parts.push({ kind: 'bold', text: match[1] })
    else parts.push({ kind: 'code', text: match[2] })
    last = start + match[0].length
  }
  if (last < text.length) parts.push({ kind: 'text', text: text.slice(last) })
  return parts
}
