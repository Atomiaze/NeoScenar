import {
  acceptCompletion,
  autocompletion,
  closeCompletion,
  pickedCompletion,
  startCompletion,
  type Completion,
  type CompletionContext,
  type CompletionResult
} from '@codemirror/autocomplete'
import { Facet, Prec, type EditorState, type Extension } from '@codemirror/state'
import { keymap, type EditorView } from '@codemirror/view'
import { fr } from '../../i18n/fr'
import { analysisField } from '../editor/analysis'
import { effectiveType } from '../editing/pendingTypes'
import { mergeNameLists } from './nameLists'
import {
  characterProposals,
  headingProposals,
  namesInScript,
  type NameLists,
  type Proposal
} from './proposals'

/**
 * Source de noms proposés (lieux, personnages, moments). Le scénario et le vocabulaire du cours en
 * sont deux ; les fiches personnages et lieux du module Recherches en sont une troisième (étape 10C).
 */
export type NameSource = (state: EditorState, lineNumber: number) => Partial<NameLists>

export const nameSources = Facet.define<NameSource>()

/** Lieux et personnages déjà écrits dans le scénario. */
export const scriptNames: NameSource = (state, lineNumber) =>
  namesInScript(state.field(analysisField).doc, lineNumber)

function collectNames(state: EditorState, lineNumber: number): NameLists {
  return mergeNameLists(state.facet(nameSources).map((source) => source(state, lineNumber)))
}

/** Propositions pour la position du curseur : en-tête de scène ou personnage, sinon aucune. */
export function proposalsAt(state: EditorState, pos: number): Proposal[] {
  const line = state.doc.lineAt(pos)
  const type = effectiveType(state, line.number)
  if (type !== 'scene_heading' && type !== 'character') return []
  const before = line.text.slice(0, pos - line.from)
  const lists = collectNames(state, line.number)
  return type === 'scene_heading'
    ? headingProposals(before, lists)
    : characterProposals(before, lists)
}

function toCompletion(proposal: Proposal, rank: number): Completion {
  if (proposal.kind === 'keep') {
    // Ligne discrète en bas de la liste : la choisir revient à appuyer sur Échap.
    return {
      label: proposal.label,
      displayLabel: fr.script.keepTyped(proposal.label),
      type: 'keep',
      boost: -99,
      apply: (view: EditorView) => closeCompletion(view)
    }
  }
  const completion: Completion = {
    label: proposal.label,
    type: proposal.kind,
    // L'ordre des listes est voulu (proposition identique, préfixes, moments du cours…) : on le garde.
    boost: -rank,
    apply: (view: EditorView, _completion: Completion, _from: number, to: number) => {
      const from = view.state.doc.lineAt(to).from + proposal.from
      view.dispatch({
        changes: { from, to, insert: proposal.insert },
        selection: { anchor: from + proposal.insert.length },
        annotations: pickedCompletion.of(completion),
        userEvent: 'input.complete'
      })
      // Après « INT. », la liste des lieux s'ouvre aussitôt.
      if (proposal.kind === 'prefix') setTimeout(() => startCompletion(view), 0)
    }
  }
  return completion
}

function completionSource(context: CompletionContext): CompletionResult | null {
  const proposals = proposalsAt(context.state, context.pos)
  if (proposals.length === 0) return null
  const lineFrom = context.state.doc.lineAt(context.pos).from
  return {
    from: lineFrom + Math.max(...proposals.map((proposal) => proposal.from)),
    filter: false,
    options: proposals.map(toCompletion)
  }
}

/** Assistant d'en-tête et autocomplétion des personnages : Entrée ou Tab valide, Échap ferme. */
export function scriptCompletion(sources: readonly NameSource[]): Extension {
  return [
    nameSources.of(scriptNames),
    sources.map((source) => nameSources.of(source)),
    autocompletion({
      override: [completionSource],
      icons: false,
      closeOnBlur: true,
      optionClass: (completion) => (completion.type === 'keep' ? 'script-completion-keep' : '')
    }),
    Prec.highest(keymap.of([{ key: 'Tab', run: acceptCompletion }]))
  ]
}
