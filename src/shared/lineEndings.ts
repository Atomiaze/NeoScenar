// NeoScenar lit les fichiers retouchés sous Windows : fins de ligne « \r\n » (Bloc-notes),
// anciennes fins du Mac (« \r ») et marque BOM. Il écrit toujours « \n », sans BOM ajoutée.

/** Texte avec des fins de ligne « \n » seulement. */
export function toLf(text: string): string {
  return text.replace(/\r\n?/g, '\n')
}

/** Vrai si les deux textes ne diffèrent que par leurs fins de ligne (rien à réécrire). */
export function sameIgnoringLineEndings(a: string, b: string): boolean {
  return a === b || toLf(a) === toLf(b)
}

/** Texte JSON lu sur le disque, sans la marque BOM que le Bloc-notes de Windows peut ajouter. */
export function parseJsonText(text: string): unknown {
  return JSON.parse(text.replace(/^\uFEFF/, ''))
}
