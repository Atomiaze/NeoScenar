import { useMemo, useState } from 'react'
import {
  compareScripts,
  type ComparedItem,
  type ScriptComparison
} from '../../shared/versions/compareScripts'
import { formatVersionDate, type VersionEntry } from '../../shared/versions/versions'
import { Dialog } from '../components/Dialog'
import { fr } from '../i18n/fr'
import { useVersionScript } from './useVersionScript'

const t = fr.versions

// Valeur du choix « Scénario actuel » dans les listes (un nom de dossier n'est jamais vide).
const CURRENT = ''

/**
 * « Comparer » : une version avec le scénario actuel, ou deux versions entre elles. À gauche, les
 * scènes qui ont changé ; à droite, le texte de la scène choisie, mot par mot.
 */
export function VersionCompare({
  versions,
  initial,
  onBack
}: {
  versions: VersionEntry[]
  initial: string
  onBack(): void
}) {
  const [beforeChoice, setBefore] = useState(initial)
  const [afterChoice, setAfter] = useState(CURRENT)
  const before = useVersionScript(beforeChoice === CURRENT ? null : beforeChoice)
  const after = useVersionScript(afterChoice === CURRENT ? null : afterChoice)

  const comparison = useMemo<ScriptComparison | null>(
    () =>
      before.state === 'ready' && after.state === 'ready'
        ? compareScripts(before.script, after.script)
        : null,
    [before, after]
  )
  const usable = versions.filter((entry) => !entry.broken)
  const error =
    before.state === 'error' ? before.message : after.state === 'error' ? after.message : null

  return (
    <Dialog
      title={t.compareTitle}
      onClose={onBack}
      className="versions-large"
      actions={<button onClick={onBack}>{t.back}</button>}
    >
      <div className="versions-compare-choices">
        <Choice
          label={t.compareBefore}
          value={beforeChoice}
          versions={usable}
          onChange={setBefore}
        />
        <Choice label={t.compareAfter} value={afterChoice} versions={usable} onChange={setAfter} />
      </div>
      {error && <p className="error-text">{error}</p>}
      {!error && comparison === null && <p className="muted">{t.loading}</p>}
      {comparison && (
        // Recréé à chaque comparaison : la scène choisie revient à la première.
        <ComparisonView key={`${beforeChoice}|${afterChoice}`} comparison={comparison} />
      )}
    </Dialog>
  )
}

function Choice({
  label,
  value,
  versions,
  onChange
}: {
  label: string
  value: string
  versions: VersionEntry[]
  onChange(value: string): void
}) {
  return (
    <label className="field versions-compare-choice">
      <span className="field-label">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value={CURRENT}>{t.currentScript}</option>
        {versions.map(
          (entry) =>
            !entry.broken && (
              <option key={entry.folder} value={entry.folder}>
                {`${entry.name} — ${formatVersionDate(new Date(entry.createdAt))}`}
              </option>
            )
        )}
      </select>
    </label>
  )
}

function ComparisonView({ comparison }: { comparison: ScriptComparison }) {
  const [selected, setSelected] = useState(0)
  const { items, counts } = comparison
  const item = items[selected] ?? null

  if (items.length === 0) return <p className="muted">{t.noDifference}</p>
  return (
    <>
      <p className="muted">{t.compareSummary(counts)}</p>
      <div className="versions-compare">
        <ul className="versions-compare-list" role="listbox" aria-label={t.compareListLabel}>
          {items.map((entry, index) => (
            <li
              key={index}
              role="option"
              aria-selected={index === selected}
              className={index === selected ? 'selected' : undefined}
              onClick={() => setSelected(index)}
            >
              <span className="versions-compare-name">{itemTitle(entry)}</span>
              <span className="versions-compare-badges">
                {itemBadges(entry).map((badge) => (
                  <span key={badge} className={`versions-badge ${badge}`}>
                    {t.badges[badge]}
                  </span>
                ))}
              </span>
            </li>
          ))}
        </ul>
        <div className="versions-compare-detail" aria-label={t.compareDetailLabel}>
          {item && <ItemDetail item={item} />}
        </div>
      </div>
    </>
  )
}

function ItemDetail({ item }: { item: ComparedItem }) {
  if (!item.modified) return <p className="muted">{t.movedOnly}</p>
  return (
    <pre className="versions-diff">
      {item.parts.map((part, index) =>
        part.kind === 'same' ? (
          <span key={index}>{part.text}</span>
        ) : part.kind === 'added' ? (
          <ins key={index}>{part.text}</ins>
        ) : (
          <del key={index}>{part.text}</del>
        )
      )}
    </pre>
  )
}

function itemTitle(item: ComparedItem): string {
  if (item.kind === 'titlePage') return t.titlePageItem
  if (item.kind === 'opening') return t.openingItem
  const label = item.previousLabel === '' ? item.label : `${item.previousLabel} → ${item.label}`
  return label === '' ? item.heading : `${label}  ${item.heading}`
}

type Badge = keyof typeof t.badges

function itemBadges(item: ComparedItem): Badge[] {
  if (item.status === 'added') return ['added']
  if (item.status === 'removed') return ['removed']
  const badges: Badge[] = []
  if (item.moved) badges.push('moved')
  if (item.modified) badges.push('modified')
  return badges
}
