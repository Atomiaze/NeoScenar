/** « 2026-12-01 » → « 1 déc. 2026 » (jour sans heure, pas de décalage de fuseau). */
export function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}
