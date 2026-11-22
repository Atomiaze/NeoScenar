// Textes du projet écrits en Markdown dans neoscenar/ (lot 2 des retours) : jamais dans le Fountain.

export const MARKDOWN_TEXTS = ['synopsis', 'pitch', 'intention'] as const

export type MarkdownTextName = (typeof MARKDOWN_TEXTS)[number]

/** Textes à versions (log line, tag line) : même dossier, format dans versionedTexts.ts. */
export const VERSIONED_TEXTS = ['logLine', 'tagLine'] as const

export type VersionedTextName = (typeof VERSIONED_TEXTS)[number]

export type ProjectTextName = MarkdownTextName | VersionedTextName

/** Nom du fichier dans neoscenar/ : sans accent ni espace (règle des fichiers créés par l'application). */
export const PROJECT_TEXT_FILES: Record<ProjectTextName, string> = {
  synopsis: 'synopsis.md',
  pitch: 'pitch.md',
  intention: 'note-intention.md',
  logLine: 'log-line.md',
  tagLine: 'tag-line.md'
}

export const MAX_TEXT_LENGTH = 5_000_000

export function isProjectTextName(value: unknown): value is ProjectTextName {
  return typeof value === 'string' && Object.hasOwn(PROJECT_TEXT_FILES, value)
}
