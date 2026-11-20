// Export PDF du storyboard : échanges entre la fenêtre d'export (interface) et le processus principal.

/** Options de l'export, mémorisées dans projet.json (`exportStoryboard`). */
export interface StoryboardExportOptions {
  /** « planches » : à dessiner, sans vignettes ; « storyboard » : avec les vignettes. */
  kind: 'planches' | 'storyboard'
  /** « all » : tout le film ; « scenes » : seulement les scènes de `sceneNumbers`. */
  scope: 'all' | 'scenes'
  /**
   * Numéros affichés des scènes choisies (« S_0030 », « S_0030A »). Une scène qui n'existe plus est
   * ignorée ; si une renumérotation change les numéros, la sélection suit les numéros.
   */
  sceneNumbers: string[]
  /** Commencer chaque scène sur une nouvelle page. */
  newPagePerScene: boolean
}

export const DEFAULT_STORYBOARD_OPTIONS: StoryboardExportOptions = {
  kind: 'planches',
  scope: 'all',
  sceneNumbers: [],
  newPagePerScene: false
}

/** Scène proposée dans la fenêtre (les scènes orphelines et sans plan n'y figurent pas). */
export interface StoryboardSceneInfo {
  /** « S_0030 ». */
  number: string
  heading: string
  name: string
  shotCount: number
}

/** Ce que la fenêtre reçoit à l'ouverture : ses options relues et les scènes du film. */
export interface StoryboardExportInfo {
  options: StoryboardExportOptions
  scenes: StoryboardSceneInfo[]
}

export interface StoryboardPreview {
  /** Octets du PDF réel ; null quand il n'y a aucun plan à exporter. */
  bytes: Uint8Array | null
  pageCount: number
  shotCount: number
  /** Plans qui ont une vignette lue sans erreur (type Storyboard seulement). */
  thumbnailCount: number
  /** Plans dont la vignette est illisible ou introuvable : « S_0030 · P_0010 ». */
  unreadable: string[]
}
