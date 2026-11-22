// Textes du projet écrits en Markdown dans neoscenar/ (lot 2 des retours) : jamais dans le Fountain.

export const MARKDOWN_TEXTS = ['synopsis', 'pitch', 'intention'] as const

export type MarkdownTextName = (typeof MARKDOWN_TEXTS)[number]

/** Nom du fichier dans neoscenar/ : sans accent ni espace (règle des fichiers créés par l'application). */
export const MARKDOWN_TEXT_FILES: Record<MarkdownTextName, string> = {
  synopsis: 'synopsis.md',
  pitch: 'pitch.md',
  intention: 'note-intention.md'
}

export const MAX_TEXT_LENGTH = 5_000_000

export function isMarkdownTextName(value: unknown): value is MarkdownTextName {
  return typeof value === 'string' && (MARKDOWN_TEXTS as readonly string[]).includes(value)
}
