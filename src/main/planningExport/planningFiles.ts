import { stat } from 'node:fs/promises'
import { join } from 'node:path'
import type { PlanningExportKind } from '../../shared/planningExport'
import { safePart, safeTitle } from '../pdfExport/pdfFileName'

// Noms et emplacement des fichiers de l'export du planning (étape 15E-2).

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

/**
 * « <Titre>_planning_AAAA-MM-JJ.pdf », « <Titre>_plan_de_tournage_AAAA-MM-JJ.pdf »,
 * « <Titre>_planning.ics ». Avec « Tâches de : Léa », le nom s'ajoute : « …_planning_Lea_… ».
 * Sans accent ni espace ; le Plan de tournage ne tient pas compte de la personne.
 */
export function planningFileName(
  kind: PlanningExportKind,
  title: string,
  person: string | null,
  date: Date
): string {
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  const name = safeTitle(title)
  const who = person === null ? '' : safePart(person)
  const suffix = who === '' ? '' : `_${who}`
  if (kind === 'tournage') return `${name}_plan_de_tournage_${day}.pdf`
  if (kind === 'calendrier') return `${name}_planning${suffix}.ics`
  return `${name}_planning${suffix}_${day}.pdf`
}

async function isDirectory(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory()
  } catch {
    return false
  }
}

/**
 * Dossier des exports : `01_Production/Planning/` si le film a un dossier `01_Production`, sinon
 * `neoscenar/exports/`. Le sous-dossier `Planning` est créé à l'enregistrement.
 */
export async function planningExportDir(rootDir: string, dataDir: string): Promise<string> {
  const production = join(rootDir, '01_Production')
  return (await isDirectory(production)) ? join(production, 'Planning') : join(dataDir, 'exports')
}
