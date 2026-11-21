// État d'affichage du formulaire du générique : quels blocs sont ouverts (étape 17C).
// Réglage d'affichage, gardé dans les préférences de l'application, jamais dans le projet.

/** Blocs ouverts, par projet. L'ordre des clés va du plus ancien au plus récent. */
export type CreditsOpenByProject = Record<string, string[]>

export const MAX_CREDITS_OPEN_PROJECTS = 50

/** Identifiant du projet s'il existe, sinon son chemin. */
export function creditsOpenKey(projectId: string | undefined, projectFilePath: string): string {
  return projectId ? projectId : projectFilePath
}

/** Un projet sans état enregistré a tous ses blocs repliés. */
export function openBlocksOf(state: CreditsOpenByProject, key: string): string[] {
  return state[key] ?? []
}

export function toggleBlock(open: string[], blockId: string, isOpen: boolean): string[] {
  const without = open.filter((id) => id !== blockId)
  return isOpen ? [...without, blockId] : without
}

/** Range le projet en dernier (le plus récent) et ne garde que les 50 derniers. */
export function withProjectOpen(
  state: CreditsOpenByProject,
  key: string,
  open: string[]
): CreditsOpenByProject {
  const rest = Object.entries(state).filter(([other]) => other !== key)
  return Object.fromEntries([...rest, [key, open]].slice(-MAX_CREDITS_OPEN_PROJECTS))
}

/** Lecture prudente d'un fichier de préférences : ignore tout ce qui n'a pas la bonne forme. */
export function parseCreditsOpen(raw: unknown): CreditsOpenByProject {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return {}
  const entries = Object.entries(raw as Record<string, unknown>)
    .filter(
      (entry): entry is [string, string[]] =>
        Array.isArray(entry[1]) && entry[1].every((id) => typeof id === 'string')
    )
    .slice(-MAX_CREDITS_OPEN_PROJECTS)
  return Object.fromEntries(entries)
}
