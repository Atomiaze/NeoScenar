// Nom du fichier PDF : « <Titre>_scenario_AAAA-MM-JJ.pdf » (sans accent ni espace, comme tous les
// fichiers créés par l'application).

/** Texte sans accents ni caractères interdits ; les espaces deviennent des « _ ». Vide si rien ne reste. */
export function safePart(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9 _-]+/g, ' ')
    .trim()
    .replace(/[ _]+/g, '_')
    .replace(/^[_-]+|[_-]+$/g, '')
}

/** Titre du film pour un nom de fichier. */
export function safeTitle(title: string): string {
  return safePart(title) || 'Scenario'
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

export function pdfFileName(
  title: string,
  date: Date,
  kind: 'scenario' | 'planches' | 'storyboard' = 'scenario'
): string {
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  return `${safeTitle(title)}_${kind}_${day}.pdf`
}
