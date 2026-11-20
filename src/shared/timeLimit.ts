// Seuil des tests chronométrés : inchangé sur la machine de David, triplé sur les serveurs
// d'intégration continue (GitHub Actions, variable CI), plus lents et partagés.
const ON_CI = Boolean((globalThis as { process?: { env?: { CI?: string } } }).process?.env?.CI)

export const CI_TIME_FACTOR = 3

/** Seuil, en millisecondes, à utiliser dans `expect(durée).toBeLessThan(timeLimit(60))`. */
export function timeLimit(localMs: number): number {
  return ON_CI ? localMs * CI_TIME_FACTOR : localMs
}
