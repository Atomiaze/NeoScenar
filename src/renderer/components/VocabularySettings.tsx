import { useEffect, useState } from 'react'
import {
  CUSTOM_LISTS,
  addTerm,
  removeTerm,
  renameTerm,
  type CustomList,
  type EditResult,
  type TermProblem
} from '../../shared/customVocabulary'
import { cardsStore, loadVocabulary, saveCustomVocabulary } from '../cards/cardsStore'
import { fr } from '../i18n/fr'
import { useStore } from '../state/createStore'

const t = fr.appSettings.vocabulary

/** Section « Vocabulaire des plans » des Réglages : entrées du cours (figées) et personnelles. */
export function VocabularySettings() {
  const course = useStore(cardsStore, (state) => state.vocabulary)
  const custom = useStore(cardsStore, (state) => state.customVocabulary)
  const courseError = useStore(cardsStore, (state) => state.vocabularyError)

  useEffect(() => {
    void loadVocabulary()
  }, [])

  return (
    <fieldset className="settings-group">
      <legend>{t.title}</legend>
      <small className="muted">{t.note}</small>
      {courseError && <small role="alert">{courseError}</small>}
      {course &&
        CUSTOM_LISTS.map((list) => (
          <VocabularyList
            key={list}
            list={list}
            apply={(edit) => {
              const result = edit(custom, course)
              if (result.ok) saveCustomVocabulary(result.value)
              return result
            }}
          />
        ))}
    </fieldset>
  )
}

type Edit = (
  custom: Parameters<typeof addTerm>[0],
  course: Parameters<typeof addTerm>[1]
) => EditResult

function VocabularyList({ list, apply }: { list: CustomList; apply(edit: Edit): EditResult }) {
  const course = useStore(cardsStore, (state) => state.vocabulary)
  const custom = useStore(cardsStore, (state) => state.customVocabulary[list])
  const [label, setLabel] = useState('')
  const [definition, setDefinition] = useState('')
  const [editing, setEditing] = useState<number | null>(null)
  const [problem, setProblem] = useState<TermProblem | null>(null)

  const reset = (): void => {
    setLabel('')
    setDefinition('')
    setEditing(null)
    setProblem(null)
  }

  const submit = (): void => {
    const result = apply((all, voc) =>
      editing === null
        ? addTerm(all, voc, list, label, definition)
        : renameTerm(all, voc, list, editing, label, definition)
    )
    if (result.ok) reset()
    else setProblem(result.problem)
  }

  return (
    <details className="vocab-list">
      <summary>
        {t.lists[list]} <small className="muted">({t.customCount(custom.length)})</small>
      </summary>
      <ul className="vocab-terms">
        {(course?.[list] ?? []).map((term) => (
          <li key={`c-${term.label}`} title={term.definition} className="vocab-course">
            <span>{term.label}</span>
            <small className="muted">{t.courseTag}</small>
          </li>
        ))}
        {custom.map((term, index) => (
          <li key={`p-${term.label}`} title={term.definition || undefined}>
            <span>{term.label}</span>
            <button
              type="button"
              onClick={() => {
                setEditing(index)
                setLabel(term.label)
                setDefinition(term.definition)
                setProblem(null)
              }}
            >
              {t.rename}
            </button>
            <button
              type="button"
              onClick={() => {
                apply((all) => ({ ok: true, value: removeTerm(all, list, index) }))
                if (editing !== null) reset()
              }}
            >
              {t.remove}
            </button>
          </li>
        ))}
      </ul>
      <div className="vocab-form">
        <input
          type="text"
          aria-label={t.labelField}
          placeholder={t.labelField}
          value={label}
          onChange={(event) => {
            setLabel(event.target.value)
            setProblem(null)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              submit()
            }
          }}
        />
        <input
          type="text"
          aria-label={t.definitionField}
          placeholder={t.definitionField}
          value={definition}
          onChange={(event) => setDefinition(event.target.value)}
        />
        <button type="button" onClick={submit}>
          {editing === null ? t.add : t.save}
        </button>
        {editing !== null && (
          <button type="button" onClick={reset}>
            {t.cancel}
          </button>
        )}
      </div>
      {problem && (
        <small role="alert" className="settings-welcome-error">
          {problem === 'empty' ? t.errorEmpty : t.errorDuplicate}
        </small>
      )}
      {editing !== null && <small className="muted">{t.renameNote}</small>}
    </details>
  )
}
