// Chemins relatifs enregistrés dans les fichiers du projet : toujours avec « / », jamais absolus.

/**
 * Vrai pour un chemin relatif sûr sur les trois systèmes : segments non vides, sans « . » ni
 * « .. », sans « \ » (séparateur de Windows) ni « : » (lecteur « C: » ou flux de fichier Windows).
 */
export function isSafeRelativePath(path: string): boolean {
  if (path === '') return false
  return path
    .split('/')
    .every(
      (segment) => segment !== '' && segment !== '.' && segment !== '..' && !/[\\:]/.test(segment)
    )
}
