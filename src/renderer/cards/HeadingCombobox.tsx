import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { Decoupage, Scene } from '../../shared/projectTypes'
import { fr } from '../i18n/fr'
import { researchStore } from '../research/researchStore'
import { headingProposals, type Proposal } from '../script/completion/proposals'
import { getSceneTimes, loadSceneTimes } from '../script/scriptStore'
import { useStore } from '../state/createStore'
import { editScene } from './actions'
import { endTyping } from './cardsStore'
import { headingNameLists } from './headingNames'

/**
 * En-tête de scène avec la même aide à la frappe que l'éditeur de scénario (préfixes, lieux, moments).
 * Le texte est mis en majuscules pendant la frappe sans déplacer le curseur. Il n'est écrit dans le
 * scénario (étape 8) qu'à la validation (perte du focus, ou Entrée liste fermée) : un en-tête à
 * moitié tapé (« IN ») ne doit ni créer de fiche Lieux ni changer le Fountain. Une validation est
 * une seule étape d'annulation des cartes.
 */
export function HeadingCombobox({ scene, decoupage }: { scene: Scene; decoupage: Decoupage }) {
  const id = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const nextCursor = useRef<number | null>(null)
  const [draft, setDraftState] = useState<string | null>(null)
  // Dernier texte tapé, lisible aussi à la fermeture du composant.
  const draftRef = useRef<string | null>(null)
  const commitRef = useRef<() => void>(() => {})
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [active, setActive] = useState(0)
  const [times, setTimes] = useState(getSceneTimes)
  const sheets = useStore(researchStore, (state) => state.sheets.lieux)

  const setDraft = (text: string | null): void => {
    draftRef.current = text
    setDraftState(text)
  }

  // Écrit l'en-tête s'il a changé (le scénario le relit ensuite sans espaces superflus).
  const commit = (): void => {
    const text = draftRef.current
    if (text !== null && text !== scene.heading) {
      editScene(scene.id, { heading: text }, 'heading')
    }
  }

  // La fermeture du composant utilise la version la plus récente de `commit`.
  useEffect(() => {
    commitRef.current = commit
  })

  useEffect(() => {
    void loadSceneTimes().then(setTimes)
  }, [])

  // Le champ se ferme sans perte de focus (menu, scène supprimée…) : rien n'est perdu en silence.
  useEffect(
    () => () => {
      commitRef.current()
    },
    []
  )

  // Après une proposition acceptée, le curseur se place à la fin du texte inséré.
  useLayoutEffect(() => {
    if (nextCursor.current === null) return
    inputRef.current?.setSelectionRange(nextCursor.current, nextCursor.current)
    nextCursor.current = null
  })

  const update = (text: string, cursor: number): void => {
    const upper = text.toLocaleUpperCase('fr')
    setDraft(upper)
    const lists = headingNameLists(
      decoupage,
      scene.id,
      sheets.map((sheet) => sheet.nom),
      times
    )
    setProposals(headingProposals(upper.slice(0, cursor), lists))
    setActive(0)
  }

  const accept = (proposal: Proposal): void => {
    if (proposal.kind === 'keep') {
      setProposals([])
      return
    }
    const text = draft ?? scene.heading
    const cursor = inputRef.current?.selectionStart ?? text.length
    const insert = proposal.insert.toLocaleUpperCase('fr')
    nextCursor.current = proposal.from + insert.length
    update(text.slice(0, proposal.from) + insert + text.slice(cursor), nextCursor.current)
  }

  const onKeyDown = (event: KeyboardEvent): void => {
    if (proposals.length === 0) {
      // Liste fermée : Entrée valide l'en-tête (le champ garde le focus).
      if (event.key === 'Enter') {
        event.preventDefault()
        commit()
        endTyping()
      }
      return
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const step = event.key === 'ArrowDown' ? 1 : -1
      setActive((index) => (index + step + proposals.length) % proposals.length)
    } else if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault()
      accept(proposals[active])
    } else if (event.key === 'Escape') {
      event.stopPropagation()
      setProposals([])
    }
  }

  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {fr.panel.heading}
      </label>
      <div className="combobox">
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={proposals.length > 0}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          autoComplete="off"
          value={draft ?? scene.heading}
          placeholder={fr.panel.headingPlaceholder}
          onFocus={() => setDraft(scene.heading)}
          onChange={(event) => update(event.target.value, event.target.selectionStart ?? 0)}
          onKeyDown={onKeyDown}
          onBlur={() => {
            commit()
            setDraft(null)
            setProposals([])
            endTyping()
          }}
        />
        {proposals.length > 0 && (
          <ul
            className="combobox-list"
            id={`${id}-list`}
            role="listbox"
            aria-label={fr.panel.heading}
          >
            {proposals.map((proposal, index) => (
              <li
                key={`${proposal.kind}-${proposal.label}`}
                role="option"
                aria-selected={index === active}
                className={index === active ? 'active' : undefined}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActive(index)}
                onClick={() => accept(proposal)}
              >
                {proposal.kind === 'keep' ? fr.script.keepTyped(proposal.label) : proposal.label}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
