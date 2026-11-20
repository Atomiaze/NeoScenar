import { fr } from '../../renderer/i18n/fr'

/** Erreur prévue, dont le message en français peut être montré tel quel à l'élève. */
export class ProjectError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ProjectError'
  }
}

/** Message à afficher pour n'importe quelle erreur, prévue ou non. */
export function toUserMessage(error: unknown): string {
  if (error instanceof ProjectError) return error.message
  const detail = error instanceof Error ? error.message : String(error)
  return fr.errors.unexpected(detail)
}

/** Vrai si l'erreur système signale un fichier ou dossier inexistant. */
export function isNotFoundError(error: unknown): boolean {
  return (error as NodeJS.ErrnoException | null)?.code === 'ENOENT'
}

/**
 * Message clair pour un échec d'écriture sur le disque (enregistrement automatique). Les causes
 * courantes sont expliquées simplement ; les autres gardent le détail technique.
 */
export function describeWriteError(error: unknown): string {
  const code = (error as NodeJS.ErrnoException | null)?.code
  switch (code) {
    case 'EACCES':
    case 'EPERM':
    case 'EROFS':
      return fr.errors.writeNotAllowed
    case 'ENOSPC':
      return fr.errors.diskFull
    case 'ENAMETOOLONG':
      return fr.fileNames.pathTooLong
    case 'ENOENT':
    case 'ENODEV':
    case 'EIO':
      return fr.errors.folderUnavailable
    default:
      return toUserMessage(error)
  }
}
