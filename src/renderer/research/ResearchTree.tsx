import { useMemo, useState } from 'react'
import { presentKeys, sheetUsage } from '../../shared/research/scriptSheets'
import { isHexColor, sortCharacters, sortPlaces } from '../../shared/research/sheetNames'
import type { Sheet, SheetKind } from '../../shared/research/types'
import { Icon } from '../components/Icon'
import { DocumentsBranch } from './DocumentsTree'
import { fr } from '../i18n/fr'
import { useStore } from '../state/createStore'
import {
  openResearchDialog,
  researchStore,
  selectBranch,
  selectCredits,
  selectSheet
} from './researchStore'

interface BranchProps {
  kind: SheetKind
  label: string
  sheets: Sheet[]
  emptyText: string
}

/** Une branche de l'arbre : titre repliable et liste des fiches. */
function SheetBranch({ kind, label, sheets, emptyText }: BranchProps) {
  const loaded = useStore(researchStore, (state) => state.loaded)
  const activeKind = useStore(researchStore, (state) => state.kind)
  const section = useStore(researchStore, (state) => state.section)
  const selected = useStore(researchStore, (state) => state.selected)
  const names = useStore(researchStore, (state) => state.scriptNames)
  const [open, setOpen] = useState(true)
  const isActive = section === 'sheets' && activeKind === kind
  // Avant le premier rapprochement, on ne sait pas encore quelles fiches le scénario nomme.
  const present = useMemo(() => (names ? presentKeys(names[kind]) : null), [names, kind])

  return (
    <li className="research-branch">
      <button
        className={`research-branch-title${isActive && selected === null ? ' active' : ''}`}
        aria-expanded={open}
        onClick={() => {
          setOpen(!open || !isActive)
          selectBranch(kind)
        }}
      >
        <Icon name={open ? 'chevronDown' : 'chevronRight'} size={14} />
        {label}
        <span className="research-count">{sheets.length}</span>
      </button>
      {open && (
        <ul className="sheet-list" role="listbox" aria-label={label}>
          {!loaded && <li className="sheet-list-empty muted">{fr.research.loading}</li>}
          {loaded && sheets.length === 0 && <li className="sheet-list-empty muted">{emptyText}</li>}
          {sheets.map((sheet) => {
            const color = sheet.props.couleur ?? ''
            const current = isActive && sheet.fileName === selected
            const usage = present ? sheetUsage(sheet, present) : 'used'
            return (
              <li
                key={sheet.fileName}
                role="option"
                aria-selected={current}
                className={`sheet-row${current ? ' selected' : ''}${usage === 'unused' ? ' unused' : ''}`}
                title={usage === 'unused' ? fr.research.unusedSheet : undefined}
                onClick={() => selectSheet(kind, sheet.fileName)}
              >
                {kind === 'personnages' && (
                  <span
                    className="sheet-dot"
                    style={isHexColor(color) ? { background: color } : undefined}
                    aria-hidden="true"
                  />
                )}
                <span className="sheet-row-text">
                  <span className="sheet-row-name">{sheet.nom}</span>
                  {sheet.props.resume && (
                    <span className="sheet-row-summary">{sheet.props.resume}</span>
                  )}
                  {usage === 'absent' && (
                    <span className="sheet-row-absent">{fr.research.absentSheet}</span>
                  )}
                </span>
                {usage === 'unused' && (
                  <button
                    className="sheet-row-delete"
                    title={fr.research.deleteUnusedTitle(sheet.nom)}
                    onClick={(event) => {
                      event.stopPropagation()
                      selectSheet(kind, sheet.fileName)
                      openResearchDialog({ kind: 'delete', fileName: sheet.fileName })
                    }}
                  >
                    {fr.research.deleteUnused}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </li>
  )
}

/** Colonne de gauche : Personnages et Lieux (avec la liste des fiches), Documents. */
export function ResearchTree() {
  const sheets = useStore(researchStore, (state) => state.sheets)
  const characters = useMemo(() => sortCharacters(sheets.personnages), [sheets.personnages])
  const places = useMemo(() => sortPlaces(sheets.lieux), [sheets.lieux])

  return (
    <nav className="research-tree" aria-label={fr.research.tree}>
      <ul>
        <SheetBranch
          kind="personnages"
          label={fr.research.characters}
          sheets={characters}
          emptyText={fr.research.emptyCharacters}
        />
        <SheetBranch
          kind="lieux"
          label={fr.research.places}
          sheets={places}
          emptyText={fr.research.emptyPlaces}
        />
        <DocumentsBranch />
        <CreditsEntry />
      </ul>
    </nav>
  )
}

/** Entrée « Générique », sous Documents : ouvre le formulaire du générique. */
function CreditsEntry() {
  const section = useStore(researchStore, (state) => state.section)
  return (
    <li className="research-branch">
      <button
        className={`research-branch-title${section === 'credits' ? ' active' : ''}`}
        onClick={selectCredits}
      >
        {fr.research.credits.branch}
      </button>
    </li>
  )
}
