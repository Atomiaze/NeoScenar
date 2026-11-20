import { useMemo } from 'react'
import { creditsCharacter, isBlockShown } from '../../shared/credits/assembleCredits'
import {
  addedRubrics,
  addRubric,
  findRubric,
  moveRubric,
  patchRubric,
  removeRubric,
  setBlockShown
} from '../../shared/credits/creditsEdit'
import type {
  CreditsContent,
  CreditsRubricData,
  TemplateBlock,
  TemplateRubric
} from '../../shared/credits/types'
import { fr } from '../i18n/fr'
import { useStore } from '../state/createStore'
import { CreditsCast } from './CreditsCast'
import { Check, NamesField, TextField } from './CreditsFields'
import { CreditsLogos } from './CreditsLogos'
import { CreditsMentions, CreditsMusic } from './CreditsMusicAndMentions'
import { openCreditsExport } from '../credits/creditsExportStore'
import { changeCredits, creditsStore } from './creditsStore'
import { researchStore } from './researchStore'

const t = fr.research.credits

interface RubricProps {
  /** Rubrique du modèle, ou null pour une rubrique ajoutée. */
  rubric: TemplateRubric | null
  id: string
  stored: CreditsRubricData | undefined
  revision: number
  /** Commandes d'une rubrique ajoutée. */
  added?: { block: TemplateBlock }
  children?: React.ReactNode
}

function Rubric({ rubric, id, stored, revision, added, children }: RubricProps) {
  const original = rubric?.intitule ?? ''
  const hasNames = rubric === null || rubric.source !== 'acteurs'
  return (
    <div className="credits-rubric">
      <div className="credits-rubric-bar">
        <TextField
          label={t.titleLabel}
          value={stored?.intitule ?? ''}
          placeholder={rubric ? original : t.newRubricTitle}
          hint={rubric ? t.titleHint(original) : undefined}
          onChange={(intitule) =>
            changeCredits((data) =>
              patchRubric(data, id, { intitule: rubric && intitule === '' ? null : intitule })
            )
          }
        />
        {added && (
          <>
            <button
              type="button"
              className="tool-button"
              title={t.moveUp}
              aria-label={t.moveUp}
              onClick={() => changeCredits((data) => moveRubric(data, added.block, id, -1))}
            >
              ↑
            </button>
            <button
              type="button"
              className="tool-button"
              title={t.moveDown}
              aria-label={t.moveDown}
              onClick={() => changeCredits((data) => moveRubric(data, added.block, id, 1))}
            >
              ↓
            </button>
            <button
              type="button"
              className="tool-button"
              onClick={() => changeCredits((data) => removeRubric(data, id))}
            >
              {t.removeRubric}
            </button>
          </>
        )}
      </div>
      {children}
      {hasNames && (
        <NamesField
          key={`${id}/${revision}`}
          label={t.namesLabel}
          names={stored?.noms ?? []}
          onChange={(noms) => changeCredits((data) => patchRubric(data, id, { noms }))}
        />
      )}
      {rubric?.source === 'figurants' && <span className="field-help">{t.extrasHint}</span>}
    </div>
  )
}

function Block({
  block,
  content,
  revision
}: {
  block: TemplateBlock
  content: CreditsContent
  revision: number
}) {
  const { data, projectType, template } = content
  const sheets = useStore(researchStore, (state) => state.sheets.personnages)
  const script = useStore(creditsStore, (state) => state.script)
  const shown = isBlockShown(block, data, projectType)
  const forced = (block.afficheSiType ?? []).includes(projectType)
  const sources = useMemo(
    () => ({
      template,
      data,
      characters: sheets.map(creditsCharacter),
      script,
      projectType,
      today: new Date()
    }),
    [template, data, sheets, script, projectType]
  )

  return (
    <details className="credits-block" open={!block.facultatif || shown}>
      <summary>
        <span className="credits-block-head">{block.titre}</span>
      </summary>
      {block.facultatif && (
        <Check
          label={t.show}
          checked={shown}
          onChange={(on) => !forced && changeCredits((d) => setBlockShown(d, block.id, on))}
        />
      )}
      {!shown && <p className="field-help">{t.optionalHidden}</p>}
      {shown && (
        <>
          {block.rubriques.map((rubric) => (
            <Rubric
              key={rubric.id}
              rubric={rubric}
              id={rubric.id}
              stored={findRubric(data, rubric.id)}
              revision={revision}
            >
              {rubric.source === 'acteurs' && <CreditsCast data={data} sources={sources} />}
            </Rubric>
          ))}
          {addedRubrics(data, block).map((rubric) => (
            <Rubric
              key={rubric.id}
              rubric={null}
              id={rubric.id}
              stored={rubric}
              revision={revision}
              added={{ block }}
            />
          ))}
          <button
            type="button"
            className="tool-button"
            onClick={() => changeCredits((d) => addRubric(d, block.id))}
          >
            {t.addRubric}
          </button>
          {block.special === 'musiques' && <CreditsMusic data={data} />}
          {block.special === 'mentions' && (
            <>
              <CreditsMentions data={data} template={template} />
              <CreditsLogos data={data} />
            </>
          )}
        </>
      )}
    </details>
  )
}

/** Générique du film : un bloc repliable par bloc du modèle, enregistrement automatique. */
export function CreditsView() {
  const content = useStore(creditsStore, (state) => state.content)
  const revision = useStore(creditsStore, (state) => state.revision)
  if (!content) return <p className="panel-empty">{t.loading}</p>
  return (
    <article className="sheet research-form" aria-label={t.title}>
      <header className="research-sheet-header">
        <h2>{t.title}</h2>
        <button
          type="button"
          className="tool-button"
          title={fr.creditsExport.toolbarTitle}
          onClick={openCreditsExport}
        >
          {fr.creditsExport.toolbar}
        </button>
      </header>
      <p className="field-help">{t.intro}</p>
      {content.template.blocs.map((block) => (
        <Block key={block.id} block={block} content={content} revision={revision} />
      ))}
    </article>
  )
}
