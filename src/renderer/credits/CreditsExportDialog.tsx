import { useCallback, useMemo, useState } from 'react'
import {
  advisedDuration,
  cardFileName,
  MAX_PNG_HEIGHT,
  rollFileName,
  splitRoll
} from '../../shared/credits/creditsLayout'
import { creditsToText } from '../../shared/credits/creditsText'
import {
  START_CARDS,
  type CreditsData,
  type CreditsLayout,
  type CreditsSize,
  type StartCardKind,
  type TextPresentation
} from '../../shared/credits/types'
import { Dialog } from '../components/Dialog'
import { fr } from '../i18n/fr'
import { changeCredits } from '../research/creditsStore'
import { renderPng } from './creditsDrawing'
import { closeCreditsExport } from './creditsExportStore'
import { CardsPreview, RollPreview } from './CreditsPreview'
import { useCreditsExport, type CreditsExportState } from './useCreditsExport'
import './creditsExport.css'

const t = fr.creditsExport

type ExportKind = 'png' | 'texte'

/** État de la fenêtre, avec le format du projet (l'écran sur lequel le générique défile). */
type ExportView = CreditsExportState & { screen: { width: number; height: number } }

function Radios<T extends string>({
  name,
  label,
  value,
  options,
  onChange,
  inline = false
}: {
  inline?: boolean
  name: string
  label: string
  value: T
  options: Record<T, string>
  onChange(value: T): void
}) {
  return (
    <fieldset className={inline ? 'credits-export-group inline' : 'credits-export-group'}>
      <legend>{label}</legend>
      {(Object.keys(options) as T[]).map((key) => (
        <label key={key} className="field-inline">
          <input type="radio" name={name} checked={value === key} onChange={() => onChange(key)} />
          <span>{options[key]}</span>
        </label>
      ))}
    </fieldset>
  )
}

const setOption = <K extends keyof CreditsData['options']>(
  key: K,
  value: CreditsData['options'][K]
) =>
  changeCredits((data) =>
    data.options[key] === value ? data : { ...data, options: { ...data.options, [key]: value } }
  )

function toggleCard(kind: StartCardKind, on: boolean): void {
  changeCredits((data) => ({
    ...data,
    cartonsDebut: START_CARDS.filter((card) =>
      card === kind ? on : data.cartonsDebut.includes(card)
    )
  }))
}

/** Fichiers PNG à écrire : le déroulant (en parties si besoin), puis les cartons. */
async function pngFiles(state: CreditsExportState): Promise<{ name: string; bytes: Uint8Array }[]> {
  const files: { name: string; bytes: Uint8Array }[] = []
  if (state.roll.items.length > 0) {
    const parts = splitRoll(state.roll.height, state.roll.cuts, state.roll.lineCuts)
    for (const [index, part] of parts.entries())
      files.push({
        name: rollFileName(index, parts.length),
        bytes: await renderPng(state.roll, state.logos, part.top, part.height)
      })
  }
  for (const [index, { card, layout }] of state.cards.entries())
    files.push({
      name: cardFileName(card.kind, index),
      bytes: await renderPng(layout, state.logos)
    })
  return files
}

function PngOptions({ state, data }: { state: ExportView; data: CreditsData }) {
  const { roll } = state
  const parts = splitRoll(roll.height, roll.cuts, roll.lineCuts).length
  return (
    <>
      <Radios<CreditsSize>
        name="credits-size"
        inline
        label={t.size}
        value={data.options.taille}
        options={t.sizes}
        onChange={(value) => setOption('taille', value)}
      />
      <Radios<CreditsLayout>
        name="credits-layout"
        label={t.layout}
        value={data.options.disposition}
        options={t.layouts}
        onChange={(value) => setOption('disposition', value)}
      />
      <fieldset className="credits-export-group">
        <legend>{t.cards}</legend>
        {START_CARDS.map((kind) => (
          <label key={kind} className="field-inline">
            <input
              type="checkbox"
              checked={data.cartonsDebut.includes(kind)}
              onChange={(event) => toggleCard(kind, event.target.checked)}
            />
            <span>
              {t.cardNames[kind]}
              {!state.available.has(kind) && <span className="muted"> {t.cardEmpty}</span>}
            </span>
          </label>
        ))}
      </fieldset>
      {roll.items.length > 0 && (
        <>
          <p className="muted">{t.rollSize(roll.width, roll.height)}</p>
          <p className="credits-duration" role="status">
            {t.duration(advisedDuration(roll.height, state.screen.height))}
          </p>
          <p className="muted">{t.durationHint}</p>
        </>
      )}
      {roll.height > MAX_PNG_HEIGHT && (
        <p className="warning-text">{t.tooHigh(roll.height, parts)}</p>
      )}
    </>
  )
}

/** Fenêtre « Exporter le générique » : PNG mis en page ou texte brut. */
export function CreditsExportDialog({
  resolution
}: {
  resolution: { width: number; height: number }
}) {
  const [error, setError] = useState<string | null>(null)
  const onError = useCallback((message: string) => setError(message), [])
  const loaded = useCreditsExport(resolution, onError)
  const [kind, setKind] = useState<ExportKind>('png')
  const [presentation, setPresentation] = useState<TextPresentation>('dessus')
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState<{ folder: string; names: string[] } | null>(null)
  const [copied, setCopied] = useState(false)

  const state = loaded && { ...loaded, screen: resolution }
  const text = useMemo(
    () => (loaded ? creditsToText(loaded.assembled, presentation) : ''),
    [loaded, presentation]
  )
  const isEmpty = !state || (state.roll.items.length === 0 && state.cards.length === 0)

  const save = async (): Promise<void> => {
    if (!state || busy) return
    setBusy(true)
    setError(null)
    try {
      if (kind === 'texte') {
        const result = await window.neoscenar.saveCreditsText(text)
        if (!result.ok) setError(result.error)
        else {
          const slash = result.value.lastIndexOf('/')
          setSaved({ folder: result.value.slice(0, slash), names: [result.value.slice(slash + 1)] })
        }
      } else {
        const files = await pngFiles(state)
        const result = await window.neoscenar.saveCreditsPngs(files)
        if (!result.ok) setError(result.error)
        else setSaved({ folder: result.value, names: files.map((file) => file.name) })
      }
    } catch {
      setError(t.drawFailed)
    }
    setBusy(false)
  }

  const copy = async (): Promise<void> => {
    await window.neoscenar.copyText(text)
    setCopied(true)
  }

  if (saved) {
    const reveal = async (): Promise<void> => {
      const result = await window.neoscenar.revealCreditsExport()
      if (!result.ok) setError(result.error)
    }
    return (
      <Dialog
        title={t.savedTitle}
        onClose={closeCreditsExport}
        actions={
          <>
            <button onClick={() => void reveal()}>{t.reveal}</button>
            <button className="primary" onClick={closeCreditsExport}>
              {fr.common.close}
            </button>
          </>
        }
      >
        <p>{t.savedFiles(saved.folder, saved.names)}</p>
        {error && <p className="error-text">{error}</p>}
      </Dialog>
    )
  }

  return (
    <Dialog
      title={t.title}
      className="credits-export-dialog"
      onClose={closeCreditsExport}
      actions={
        <>
          <button onClick={closeCreditsExport}>{fr.common.cancel}</button>
          <button className="primary" disabled={isEmpty || busy} onClick={() => void save()}>
            {busy ? t.saving : t.save}
          </button>
        </>
      }
    >
      {!state ? (
        <p className="muted">{t.preparing}</p>
      ) : (
        <CreditsExportBody
          state={state}
          kind={kind}
          setKind={setKind}
          presentation={presentation}
          setPresentation={(value) => {
            setPresentation(value)
            setCopied(false)
          }}
          text={text}
          copied={copied}
          onCopy={() => void copy()}
          isEmpty={isEmpty}
        />
      )}
      {error && <p className="error-text">{error}</p>}
    </Dialog>
  )
}

function CreditsExportBody({
  state,
  kind,
  setKind,
  presentation,
  setPresentation,
  text,
  copied,
  onCopy,
  isEmpty
}: {
  state: ExportView
  kind: ExportKind
  setKind(kind: ExportKind): void
  presentation: TextPresentation
  setPresentation(value: TextPresentation): void
  text: string
  copied: boolean
  onCopy(): void
  isEmpty: boolean
}) {
  const data = state.data
  const cards = state.cards.map(({ card, layout }, index) => ({
    name: cardFileName(card.kind, index),
    layout
  }))
  return (
    <div className="credits-export">
      <div className="credits-export-preview">
        {isEmpty ? (
          <p className="muted">{t.empty}</p>
        ) : kind === 'png' ? (
          <>
            {state.roll.items.length > 0 && (
              <RollPreview layout={state.roll} logos={state.logos} screen={state.screen} />
            )}
            <CardsPreview cards={cards} logos={state.logos} />
          </>
        ) : (
          <textarea className="credits-text-preview" readOnly value={text} aria-label={t.preview} />
        )}
      </div>
      <div className="form credits-export-options">
        <Radios<ExportKind>
          name="credits-kind"
          inline
          label={t.kindLabel}
          value={kind}
          options={{ png: t.png, texte: t.text }}
          onChange={setKind}
        />
        <p className="muted">{kind === 'png' ? t.pngHint : t.textHint}</p>
        {kind === 'png' ? (
          <PngOptions state={state} data={data} />
        ) : (
          <>
            <Radios<TextPresentation>
              name="credits-presentation"
              label={t.presentation}
              value={presentation}
              options={t.presentations}
              onChange={setPresentation}
            />
            <button type="button" disabled={isEmpty} onClick={onCopy}>
              {t.copy}
            </button>
            {copied && (
              <p className="muted" role="status">
                {t.copied}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
