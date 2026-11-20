import { StateField, type Text } from '@codemirror/state'
import {
  continuedCharacters,
  dualDialogues,
  getSectionEnds,
  getScenes,
  parse,
  type ElementType,
  type FountainDocument,
  type SectionEnd
} from '@neoscenar/fountain'
import { CARD_PALETTE } from '../../../shared/palette'
import { numberKey } from '../../../shared/decoupage/order'
import { parseSceneNumber, sceneLabel } from '../../../shared/scriptLink'
import {
  findRevisionMarks,
  revisionMarkerStarts,
  type RevisionMark
} from '../../../shared/revision/revisionMarks'

/**
 * Numéro d'une scène tel qu'affiché (« S_0030 ») et sa clé (« 30 »), d'après le `#30#` de son
 * en-tête ; null s'il est absent ou invalide : rien n'est affiché (étape 8).
 */
export function displayedSceneNumber(raw: string | null): { label: string; key: string } | null {
  const number = raw === null ? null : parseSceneNumber(raw)
  return number ? { label: sceneLabel(number), key: numberKey(number) } : null
}

/** Ce que l'éditeur sait du texte, recalculé à chaque modification (quelques millisecondes). */
export interface ScriptAnalysis {
  doc: FountainDocument
  /** Numéro affiché devant chaque en-tête (« S_0030 »), par index d'élément ; absent sans numéro valide. */
  sceneNumbers: Map<number, string>
  /** Couleur du bandeau de chaque section, par index d'élément. */
  sectionColors: Map<number, string>
  sectionEnds: SectionEnd[]
  /** Type de l'élément de chaque ligne (index = numéro de ligne à partir de 1), null pour une ligne vide. */
  lineTypes: (ElementType | null)[]
  /** Personnages (index d'élément) qui reçoivent (SUITE) quand la préférence est cochée. */
  continued: Set<number>
  /**
   * Éléments des dialogues simultanés, affichés l'un sous l'autre avec une barre : « first » pour le
   * personnage qui ouvre la paire (mention « simultané » dans la marge), « member » pour les autres.
   */
  dualElements: Map<number, 'first' | 'member'>
  /** Marques de révision (étape 13E), dans l'ordre du texte. */
  revisionMarks: RevisionMark[]
  /** Débuts des notes qui servent de marqueurs de révision : elles ne sont pas des notes vertes. */
  revisionMarkers: Set<number>
}

// Couleurs des actes attribuées automatiquement (le choix par l'élève viendra plus tard).
const SECTION_COLORS = CARD_PALETTE.filter((color) => color.shade === 'pastel').map(
  (color) => color.hex
)

/**
 * Couleur de chaque section (par index d'élément), dans l'ordre des sections. Seule attribution des
 * couleurs d'actes : les bandeaux de l'éditeur et le navigateur de scènes l'utilisent tous deux.
 */
export function sectionColorsOf(doc: FountainDocument): Map<number, string> {
  const colors = new Map<number, string>()
  doc.elements.forEach((element, index) => {
    if (element.type === 'section') {
      colors.set(index, SECTION_COLORS[colors.size % SECTION_COLORS.length])
    }
  })
  return colors
}

export function analyze(text: string, lineCount: number): ScriptAnalysis {
  const doc = parse(text, { titlePage: false })
  const lineTypes = new Array<ElementType | null>(lineCount + 1).fill(null)
  for (const element of doc.elements) {
    const position = element.position
    if (!position) continue
    for (let n = position.startLine; n <= position.endLine; n++) lineTypes[n] = element.type
  }
  const sceneNumbers = new Map<number, string>()
  for (const scene of getScenes(doc)) {
    const shown = displayedSceneNumber(scene.info.number)
    if (shown) sceneNumbers.set(scene.index, shown.label)
  }
  const sectionColors = sectionColorsOf(doc)
  const dualElements = new Map<number, 'first' | 'member'>()
  for (const pair of dualDialogues(doc)) {
    for (const index of [...pair.left, ...pair.right]) dualElements.set(index, 'member')
    dualElements.set(pair.left[0], 'first')
  }
  const revisionMarks = findRevisionMarks(doc)
  return {
    doc,
    revisionMarks,
    revisionMarkers: revisionMarkerStarts(revisionMarks),
    sceneNumbers,
    sectionColors,
    sectionEnds: getSectionEnds(doc),
    lineTypes,
    continued: continuedCharacters(doc),
    dualElements
  }
}

function analyzeDoc(doc: Text): ScriptAnalysis {
  return analyze(doc.toString(), doc.lines)
}

export const analysisField = StateField.define<ScriptAnalysis>({
  create: (state) => analyzeDoc(state.doc),
  update: (value, transaction) => (transaction.docChanged ? analyzeDoc(transaction.newDoc) : value)
})
