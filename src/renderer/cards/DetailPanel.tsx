import { useEffect, useId, useRef, useState, type Ref } from 'react'
import { formatDuration, sceneDuration, type ShotPatch } from '../../shared/decoupage'
import { formatFullShotId, formatSceneNumber } from '../../shared/numbering'
import type { Decoupage, Scene, Shot } from '../../shared/projectTypes'
import { Icon } from '../components/Icon'
import { fr } from '../i18n/fr'
import { useStore } from '../state/createStore'
import { sceneDescription } from '../../shared/scriptLink'
import { linkedText } from '../scriptLink/cardsLink'
import { linkStore } from '../scriptLink/linkStore'
import { scriptStore } from '../script/scriptStore'
import {
  colorSelection,
  deleteSelection,
  editScene,
  editSceneDescription,
  editShot,
  recreateHeading
} from './actions'
import { cardsStore, endTyping, togglePanel } from './cardsStore'
import { HeadingCombobox } from './HeadingCombobox'
import { ColorChoices } from './ColorChoices'
import { formatDurationInput, parseDurationInput } from './durationInput'
import type { Selection } from './selection'
import { mergedTerms } from '../../shared/customVocabulary'
import { TermCombobox } from './TermCombobox'
import { ThumbnailZone } from './thumbnails/ThumbnailZone'

interface DetailPanelProps {
  decoupage: Decoupage
  selection: Selection
  open: boolean
}

type Selected = { kind: 'scene'; scene: Scene } | { kind: 'shot'; scene: Scene; shot: Shot }

function findSelected(decoupage: Decoupage, id: string): Selected | null {
  for (const scene of decoupage.scenes) {
    if (scene.id === id) return { kind: 'scene', scene }
    const shot = scene.shots.find((item) => item.id === id)
    if (shot) return { kind: 'shot', scene, shot }
  }
  return null
}

/** Panneau de droite, repliable : fiche de la scène ou du plan sélectionné. */
export function DetailPanel({ decoupage, selection, open }: DetailPanelProps) {
  if (!open) {
    return (
      <aside className="detail-panel collapsed">
        <button
          className="panel-toggle"
          title={fr.panel.expand}
          aria-label={fr.panel.expand}
          onClick={togglePanel}
        >
          <Icon name="chevronLeft" size={18} />
        </button>
      </aside>
    )
  }

  const selected = selection.ids.length === 1 ? findSelected(decoupage, selection.ids[0]) : null
  const title = !selected
    ? ''
    : selected.kind === 'scene'
      ? formatSceneNumber(selected.scene.number, selected.scene.letter)
      : formatFullShotId(selected.scene, selected.shot)

  return (
    <aside className="detail-panel">
      <header className="panel-header">
        <h2>{title}</h2>
        <button
          className="panel-toggle"
          title={fr.panel.collapse}
          aria-label={fr.panel.collapse}
          onClick={togglePanel}
        >
          <Icon name="chevronRight" size={18} />
        </button>
      </header>
      <div className="panel-body">
        {selection.ids.length === 0 && <p className="panel-empty">{fr.panel.empty}</p>}
        {selection.ids.length > 1 && <MultipleSheet decoupage={decoupage} ids={selection.ids} />}
        {/* La clé recrée la fiche à chaque changement d'élément (champs remis à zéro). */}
        {selected?.kind === 'scene' && (
          <SceneSheet key={selected.scene.id} scene={selected.scene} decoupage={decoupage} />
        )}
        {selected?.kind === 'shot' && <ShotSheet key={selected.shot.id} shot={selected.shot} />}
      </div>
    </aside>
  )
}

let handledFocusRequest = 0

/** Place le curseur dans le champ « Nom » quand on le demande (double-clic, Entrée). */
function useNameFocus(): Ref<HTMLInputElement> {
  const input = useRef<HTMLInputElement>(null)
  const request = useStore(cardsStore, (state) => state.nameFocusRequest)
  useEffect(() => {
    if (request > handledFocusRequest && input.current) {
      handledFocusRequest = request
      input.current.focus()
      input.current.select()
    }
  }, [request])
  return input
}

interface TextFieldProps {
  label: string
  value: string
  onChange(value: string): void
  multiline?: boolean
  help?: string
  placeholder?: string
  inputRef?: Ref<HTMLInputElement>
  className?: string
}

function TextField({
  label,
  value,
  onChange,
  multiline,
  help,
  placeholder,
  inputRef,
  className
}: TextFieldProps) {
  const id = useId()
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      {multiline ? (
        <textarea
          id={id}
          rows={4}
          value={value}
          placeholder={placeholder}
          aria-describedby={help ? `${id}-help` : undefined}
          onChange={(event) => onChange(event.target.value)}
          onBlur={endTyping}
        />
      ) : (
        <input
          id={id}
          ref={inputRef}
          type="text"
          className={className}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          onBlur={endTyping}
        />
      )}
      {help && (
        <p className="field-help" id={`${id}-help`}>
          {help}
        </p>
      )}
    </div>
  )
}

function ShotSheet({ shot }: { shot: Shot }) {
  const vocabulary = useStore(cardsStore, (state) => state.vocabulary)
  const vocabularyError = useStore(cardsStore, (state) => state.vocabularyError)
  const custom = useStore(cardsStore, (state) => state.customVocabulary)
  const nameRef = useNameFocus()
  const set =
    <K extends keyof ShotPatch>(field: K) =>
    (value: ShotPatch[K]) =>
      editShot(shot.id, { [field]: value } as ShotPatch, field)
  // Liste vide ou texte effacé : on enregistre « pas de valeur » (null).
  const setTerm = (field: 'shotSize' | 'cameraMovement' | 'cameraAngle') => (value: string) =>
    set(field)(value.trim() === '' ? null : value)

  return (
    <form className="sheet" onSubmit={(event) => event.preventDefault()}>
      <ThumbnailZone shot={shot} />
      <TextField
        label={fr.panel.name}
        value={shot.name}
        onChange={set('name')}
        inputRef={nameRef}
      />
      <DurationField shot={shot} />
      {vocabularyError && <p className="field-error">{vocabularyError}</p>}
      <TermCombobox
        label={fr.panel.shotSize}
        value={shot.shotSize ?? ''}
        terms={mergedTerms(vocabulary?.shotSizes ?? [], custom.shotSizes)}
        onChange={setTerm('shotSize')}
        onBlur={endTyping}
      />
      <TermCombobox
        label={fr.panel.cameraMovement}
        value={shot.cameraMovement ?? ''}
        terms={mergedTerms(vocabulary?.cameraMovements ?? [], custom.cameraMovements)}
        onChange={setTerm('cameraMovement')}
        onBlur={endTyping}
      />
      <TermCombobox
        label={fr.panel.cameraAngle}
        value={shot.cameraAngle ?? ''}
        terms={mergedTerms(vocabulary?.cameraAngles ?? [], custom.cameraAngles)}
        onChange={setTerm('cameraAngle')}
        onBlur={endTyping}
      />
      <TextField label={fr.panel.sound} value={shot.sound} onChange={set('sound')} multiline />
      <TextField label={fr.panel.music} value={shot.music} onChange={set('music')} />
      <TextField
        label={fr.panel.description}
        value={shot.description}
        onChange={set('description')}
        multiline
        help={fr.panel.descriptionHelp}
      />
      <div className="field">
        <span className="field-label">{fr.panel.color}</span>
        <ColorChoices current={shot.color} onChoose={colorSelection} />
      </div>
    </form>
  )
}

/** Durée : on garde le texte tapé (« 3, » en cours de saisie) et on enregistre dès qu'il est valide. */
function DurationField({ shot }: { shot: Shot }) {
  const id = useId()
  const [text, setText] = useState(formatDurationInput(shot.duration))
  const [lastDuration, setLastDuration] = useState(shot.duration)
  const parsed = parseDurationInput(text)

  // Durée changée ailleurs (annulation) : le champ suit, sauf s'il dit déjà la même chose.
  if (shot.duration !== lastDuration) {
    setLastDuration(shot.duration)
    if (!(parsed.ok && parsed.value === shot.duration)) setText(formatDurationInput(shot.duration))
  }

  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {fr.panel.duration}
      </label>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        className="duration-input"
        placeholder={fr.panel.durationPlaceholder}
        value={text}
        aria-invalid={!parsed.ok}
        onChange={(event) => {
          setText(event.target.value)
          const value = parseDurationInput(event.target.value)
          if (value.ok) editShot(shot.id, { duration: value.value }, 'duration')
        }}
        onBlur={() => {
          // Texte invalide en quittant le champ : on revient à la dernière durée valable.
          if (!parsed.ok) setText(formatDurationInput(shot.duration))
          endTyping()
        }}
      />
      {!parsed.ok && <p className="field-error">{fr.panel.durationError}</p>}
    </div>
  )
}

function SceneSheet({ scene, decoupage }: { scene: Scene; decoupage: Decoupage }) {
  const nameRef = useNameFocus()
  return (
    <form className="sheet" onSubmit={(event) => event.preventDefault()}>
      {scene.orphan && <OrphanBox scene={scene} />}
      <TextField
        label={fr.panel.name}
        value={scene.name}
        onChange={(name) => editScene(scene.id, { name }, 'name')}
        inputRef={nameRef}
      />
      <HeadingCombobox scene={scene} decoupage={decoupage} />
      <DescriptionField scene={scene} />
      <div className="field">
        <span className="field-label">{fr.panel.color}</span>
        <ColorChoices current={scene.color} onChoose={colorSelection} />
      </div>
      <div className="field">
        <span className="field-label">{fr.panel.information}</span>
        <dl className="sheet-info">
          <dt>{fr.panel.shotCount}</dt>
          <dd>{scene.shots.length}</dd>
          <dt>{fr.panel.totalDuration}</dt>
          <dd>{formatDuration(sceneDuration(scene))}</dd>
        </dl>
      </div>
    </form>
  )
}

/** Carte orpheline : ce qui se passe, et les deux façons d'en sortir. */
function OrphanBox({ scene }: { scene: Scene }) {
  const linked = useStore(linkStore, (state) => state.active)
  return (
    <div className="orphan-box" role="note">
      <strong>{fr.scriptLink.orphanTitle}</strong>
      <p>{fr.scriptLink.orphanExplanation}</p>
      <div className="orphan-actions">
        <button
          type="button"
          className="primary"
          disabled={!linked}
          title={fr.scriptLink.recreateHeadingHint}
          onClick={() => recreateHeading(scene.id)}
        >
          {fr.scriptLink.recreateHeading}
        </button>
        <button type="button" onClick={deleteSelection}>
          {fr.scriptLink.deleteOrphan}
        </button>
      </div>
    </div>
  )
}

/**
 * Description de la scène : c'est son synopsis Fountain (lignes « = » sous l'en-tête), le même que
 * dans le navigateur. Il est lu dans le texte et y est écrit (étape 8). Pendant la saisie, le champ
 * garde ce qui est tapé (lignes vides comprises), le texte n'en garde que les lignes écrites.
 */
function DescriptionField({ scene }: { scene: Scene }) {
  const id = useId()
  const [draft, setDraft] = useState<string | null>(null)
  // Relue à chaque modification du texte (éditeur, autre action des cartes, annulation).
  useStore(scriptStore, (state) => state.textRevision)
  const text = linkedText()
  const shown = text === null ? null : sceneDescription(text, scene)
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {fr.scriptLink.descriptionLabel}
      </label>
      <textarea
        id={id}
        rows={4}
        value={draft ?? shown ?? ''}
        disabled={shown === null}
        spellCheck
        lang="fr"
        aria-describedby={`${id}-help`}
        onFocus={() => setDraft(shown ?? '')}
        onChange={(event) => {
          setDraft(event.target.value)
          editSceneDescription(scene.id, event.target.value)
        }}
        onBlur={() => {
          setDraft(null)
          endTyping()
        }}
      />
      <p className="field-help" id={`${id}-help`}>
        {shown === null ? fr.scriptLink.descriptionOrphan : fr.scriptLink.descriptionHint}
      </p>
    </div>
  )
}

/** Plusieurs éléments sélectionnés : on peut changer leur couleur en une fois. */
function MultipleSheet({ decoupage, ids }: { decoupage: Decoupage; ids: readonly string[] }) {
  const wanted = new Set(ids)
  const colors = new Set(
    decoupage.scenes.flatMap((scene) => [
      ...(wanted.has(scene.id) ? [scene.color] : []),
      ...scene.shots.filter((shot) => wanted.has(shot.id)).map((shot) => shot.color)
    ])
  )
  // Même couleur partout : on la met en évidence ; sinon, aucune.
  const current = colors.size === 1 ? [...colors][0] : undefined
  return (
    <div className="sheet">
      <p className="panel-empty">{fr.panel.multiple(ids.length)}</p>
      <div className="field">
        <span className="field-label">{fr.panel.colorForSelection(ids.length)}</span>
        <ColorChoices current={current} onChoose={colorSelection} />
      </div>
    </div>
  )
}
