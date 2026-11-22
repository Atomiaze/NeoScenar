// Affichage du panneau des révisions (étape 18C-8), par projet. Réglage d'affichage gardé dans les
// préférences de l'application, jamais dans le projet. Affiché par défaut : on ne retient que les
// projets où l'élève l'a masqué (clé = identifiant du projet, sinon son chemin, comme le générique).

export const MAX_REVISION_PANEL_PROJECTS = 50

export function isRevisionPanelShown(hidden: readonly string[], key: string): boolean {
  return !hidden.includes(key)
}

/** Range le projet en dernier (le plus récent) s'il est masqué, et ne garde que les 50 derniers. */
export function withRevisionPanelShown(
  hidden: readonly string[],
  key: string,
  shown: boolean
): string[] {
  const rest = hidden.filter((other) => other !== key)
  return (shown ? rest : [...rest, key]).slice(-MAX_REVISION_PANEL_PROJECTS)
}

/** Lecture prudente d'un fichier de préférences : ignore tout ce qui n'a pas la bonne forme. */
export function parseRevisionPanelHidden(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((key): key is string => typeof key === 'string' && key !== '')
    .slice(-MAX_REVISION_PANEL_PROJECTS)
}
