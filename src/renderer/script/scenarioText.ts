import { splitTitlePage } from '@neoscenar/fountain'

/** scenario.fountain découpé pour l'éditeur, qui ne montre que le corps du scénario. */
export interface ScenarioParts {
  /** Page de titre exacte (marque BOM et lignes vides comprises), conservée telle quelle. */
  titlePage: string
  /** Corps du scénario, fins de ligne ramenées à « \n » (celles de l'éditeur). */
  body: string
}

export function splitScenario(fileText: string): ScenarioParts {
  const { titlePage, body } = splitTitlePage(fileText)
  return { titlePage, body: body.replace(/\r\n?/g, '\n') }
}

/**
 * Texte complet à enregistrer : page de titre d'origine, puis le corps. Toujours écrit avec des
 * fins de ligne « \n », même si le fichier lu avait celles de Windows (étape 16A).
 */
export function joinScenario(parts: ScenarioParts, body: string): string {
  return (parts.titlePage + body).replace(/\r\n?/g, '\n')
}
