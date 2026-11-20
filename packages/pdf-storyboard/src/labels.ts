// Textes imprimés sur la planche (ceux de la planche papier du cours). Le module étant indépendant
// de l'application, ils sont regroupés ici plutôt que dans src/renderer/i18n/fr.ts.

export const LABELS = {
  title: 'Titre :',
  pageNumber: 'N° de page :',
  scene: 'Scène :',
  shot: 'Plan :',
  verso: 'Verso :',
  duration: 'Durée :',
  cameraMovement: 'Mvt de cam :',
  music: 'Musique :',
  shotSize: 'Échelle de plan :',
  sound: 'Sons, bruitages, dialogues :',
  cameraAngle: 'Angle PV :',
  description: 'Description du plan :',
  continued: '(suite)',
  pdfTitle: { planches: 'planches à dessiner', storyboard: 'storyboard' }
} as const

/** « S_0030 · P_0010 », comme partout dans NeoScenar. */
export function shotLabel(sceneLabel: string, shot: string): string {
  return `${sceneLabel} · ${shot}`
}

/** « 4 s », « 2,5 s » ; chaîne vide si la durée n'est pas connue. */
export function formatDuration(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds)) return ''
  return `${String(seconds).replace('.', ',')} s`
}
