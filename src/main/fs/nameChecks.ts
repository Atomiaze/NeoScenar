import { fr } from '../../renderer/i18n/fr'
import { fileNameProblem, isPathTooLong } from '../../shared/fileNameRules'
import { ProjectError } from '../project/errors'

// Refus, avec un message clair, des noms et chemins que Windows n'accepterait pas.

/** Message pour un nom tapé par l'élève qui ne conviendrait pas à tous les systèmes, ou null. */
export function typedNameError(name: string): string | null {
  const problem = fileNameProblem(name)
  if (problem === null) return null
  switch (problem.kind) {
    case 'empty':
      return fr.research.emptyName
    case 'forbidden-char':
      return problem.char < ' '
        ? fr.fileNames.controlChar
        : fr.fileNames.forbiddenChar(problem.char)
    case 'reserved':
      return fr.fileNames.reserved(name)
    case 'trailing':
      return fr.fileNames.trailing
    case 'leading-dot':
      return fr.fileNames.leadingDot
  }
}

/** Lève une erreur montrable à l'élève si ce nom ne convient pas. */
export function checkTypedName(name: string): void {
  const error = typedNameError(name)
  if (error !== null) throw new ProjectError(error)
}

/** Lève une erreur montrable à l'élève si ce chemin complet est trop long pour Windows. */
export function checkPathLength(path: string): void {
  if (isPathTooLong(path)) throw new ProjectError(fr.fileNames.pathTooLong)
}
