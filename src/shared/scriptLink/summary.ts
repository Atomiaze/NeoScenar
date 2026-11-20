import { fr } from '../../renderer/i18n/fr'
import type { Scene } from '../projectTypes'
import type { ReconcileSummary } from './reconcile'
import { sceneLabel } from './sceneNumber'

const t = fr.scriptLink

/**
 * Faits marquants d'un rapprochement, en français, dans l'ordre d'affichage. Les paires de la
 * première liaison et les différences d'en-tête sont à part (fenêtre de première liaison).
 * Liste vide : rien à signaler.
 */
export function summaryLines(summary: ReconcileSummary): string[] {
  const lines: string[] = []
  if (summary.numbered.length > 0) lines.push(t.numbered(summary.numbered))
  if (summary.corrected.length > 0) {
    lines.push(
      t.corrected(summary.corrected.map((item) => t.change(`#${item.written}#`, item.number)))
    )
  }
  if (summary.duplicates.length > 0) {
    lines.push(
      t.duplicates(summary.duplicates.map((item) => t.change(`#${item.written}#`, item.number)))
    )
  }
  if (summary.moved.length > 0) {
    lines.push(t.moved(summary.moved.map((item) => t.change(item.from, item.to))))
  }
  if (summary.appended.length > 0) lines.push(t.appended(summary.appended))
  if (summary.deleted.length > 0) lines.push(t.deleted(summary.deleted))
  if (summary.orphaned.length > 0) lines.push(t.orphaned(summary.orphaned))
  if (summary.reconnected.length > 0) lines.push(t.reconnected(summary.reconnected))
  return lines
}

/** Fenêtre de première liaison : « S_0010 ↔ INT. CUISINE - JOUR », puis les en-têtes remplacés. */
export function firstLinkLines(summary: ReconcileSummary): {
  pairs: string[]
  differences: string[]
} {
  return {
    pairs: (summary.firstLink ?? []).map((pair) => t.pair(pair.number, pair.heading)),
    differences: summary.headingDifferences.map((item) =>
      t.headingDifference(item.number, item.card, item.script)
    )
  }
}

/**
 * Ligne « carte(s) devenue(s) orpheline(s) » du bandeau, recalculée sur les cartes actuelles : une
 * carte supprimée depuis, ou reconnectée à sa scène, n'y figure plus. `line` null : plus aucune.
 */
export function orphanedLine(
  ids: readonly string[],
  scenes: readonly Scene[]
): { ids: string[]; line: string | null } {
  const byId = new Map(scenes.map((scene) => [scene.id, scene]))
  const still = ids.flatMap((id) => {
    const scene = byId.get(id)
    return scene?.orphan ? [scene] : []
  })
  return {
    ids: still.map((scene) => scene.id),
    line: still.length > 0 ? t.orphaned(still.map(sceneLabel)) : null
  }
}
