// Lien scénario ↔ cartes dans l'interface (étape 8) : à l'ouverture du projet, le scénario et le
// découpage sont chargés ensemble et rapprochés avant d'afficher le moindre module ; ensuite,
// l'éditeur rapproche après chaque modification et les cartes suivent.

import type { IdSource } from '../../shared/decoupage'
import { DATA_FOLDER_NAME, type Decoupage, type Scene } from '../../shared/projectTypes'
import { numberKey } from '../../shared/decoupage/order'
import {
  applyTextChanges,
  firstLinkLines,
  orphanedLine,
  readScriptScenes,
  reconcile,
  sceneLabel,
  summaryLines,
  type ReconcileResult
} from '../../shared/scriptLink'
import { cardsStore, loadProject, setLinkedDecoupage } from '../cards/cardsStore'
import {
  configureEditorLink,
  loadScenario,
  replaceBodyBeforeEditing,
  scriptStore
} from '../script/scriptStore'
import { createStore } from '../state/createStore'
import type { Resemblance } from '../../shared/research/scriptSheets'
import type { SheetKind } from '../../shared/research/types'

/** Ce que montre la fenêtre de première liaison. */
export interface FirstLinkReport {
  /** « S_0010 ↔ INT. CUISINE - JOUR ». */
  pairs: string[]
  /** En-têtes de carte remplacés par ceux du scénario. */
  differences: string[]
  /** Autres faits (en-têtes ajoutés à la fin du scénario…). */
  notes: string[]
  cardCount: number
  sceneCount: number
  /** Dossier de la copie de sécurité (« neoscenar/sauvegardes/avant_liaison_… »). */
  backupFolder: string
}

interface LinkState {
  projectId: string | null
  /** Rapprochement de l'ouverture terminé : les modules peuvent s'afficher. */
  ready: boolean
  /** L'éditeur rapproche après chaque modification. Faux si la copie de sécurité a échoué. */
  active: boolean
  /** Fenêtre de première liaison à montrer, ou null. */
  report: FirstLinkReport | null
  /** La copie de sécurité a échoué : message, ou null. */
  backupError: string | null
  /** Bandeau de résumé d'un rapprochement (ouverture, fichier rechargé), ou null. */
  banner: LinkBanner | null
}

/** Ce que montre le bandeau de résumé. */
export interface LinkBanner {
  lines: string[]
  /**
   * Première carte qui vient de devenir orpheline (bouton « Voir »), ou null. Le bandeau reste alors
   * affiché jusqu'à ce qu'on le ferme ; sinon il disparaît seul.
   */
  orphanId: string | null
  /** Fiches du module Recherches (étape 10C), ou null. */
  sheets: SheetsBanner | null
}

/** Fiche nommée dans le bandeau (lien qui l'ouvre). */
export interface SheetLink {
  kind: SheetKind
  fileName: string
  nom: string
}

/** Partie « fiches » du bandeau. */
export interface SheetsBanner {
  created: SheetLink[]
  /** Noms sans fiche qui ressemblent à une fiche : le bandeau reste affiché tant qu'il en reste. */
  resemblances: Resemblance[]
  /** Dernier remplacement fait depuis le bandeau (bouton « Annuler »), ou null. */
  replaced: { kind: SheetKind; name: string; sheet: string; count: number } | null
  /** Dernier renommage d'une fiche (étape 10D, bouton « Annuler »), ou null. */
  renamed: RenamedSheet | null
}

/** Renommage d'une fiche, résumé dans le bandeau. */
export interface RenamedSheet {
  from: string
  to: string
  /** Remplacements faits dans le scénario. */
  count: number
  /** Personnage : en-têtes qui contiennent l'ancien nom (non modifiés). */
  headings: number
  /** L'annulation n'est plus possible (scénario modifié depuis) : message affiché. */
  undoImpossible: boolean
}

export const linkStore = createStore<LinkState>({
  projectId: null,
  ready: false,
  active: false,
  report: null,
  backupError: null,
  banner: null
})

const ids: IdSource = { newId: () => crypto.randomUUID() }

/**
 * Cartes vides supprimées pendant la séance parce que leur scène a disparu du texte. Si l'en-tête
 * revient (Annuler dans l'éditeur), la scène retrouve la même carte (même identifiant).
 */
const removedCards = new Map<string, Scene>()

function rememberRemoved(before: Decoupage, after: Decoupage): void {
  const kept = new Set(after.scenes.map((scene) => scene.id))
  for (const scene of before.scenes) {
    if (!kept.has(scene.id)) removedCards.set(numberKey(scene), scene)
  }
  for (const scene of after.scenes) removedCards.delete(numberKey(scene))
}

/** Cartes connues récemment, pour qu'une scène qui revient retrouve sa carte (voir reconcile). */
export function knownCards(): Scene[] {
  return [...removedCards.values()]
}

/** Note les cartes retirées par un rapprochement (entre `before` et `after`). */
export function noteRemovedCards(before: Decoupage, after: Decoupage): void {
  rememberRemoved(before, after)
}

/** Identifiants des nouvelles cartes. */
export const linkIds = ids

function currentDecoupage(): Decoupage | null {
  return cardsStore.get().history?.present ?? null
}

configureEditorLink({
  beforeReload: linkAfterReload,
  source: {
    current: () => {
      const decoupage = currentDecoupage()
      if (!linkStore.get().active || !decoupage) return null
      return { decoupage, knownCards: [...removedCards.values()] }
    },
    ids
  },
  onLink: (result: ReconcileResult) => {
    const before = currentDecoupage()
    if (before) rememberRemoved(before, result.decoupage)
    setLinkedDecoupage(result.decoupage)
  }
})

/** Ouvre le lien d'un projet : charge les deux fichiers, puis les rapproche. */
export async function openLink(projectId: string): Promise<void> {
  if (linkStore.get().projectId === projectId) return
  removedCards.clear()
  closeBanner()
  linkStore.set({ projectId, ready: false, active: false, report: null, backupError: null })
  await Promise.all([loadProject(projectId), loadScenario(projectId)])
  if (linkStore.get().projectId !== projectId) return
  const decoupage = currentDecoupage()
  const parts = scriptStore.get().parts
  // Un fichier illisible : chaque module affiche son erreur, rien n'est relié.
  if (!decoupage || !parts) {
    linkStore.set({ ready: true })
    return
  }
  await linkAtOpening(projectId, decoupage, parts.body)
}

async function linkAtOpening(projectId: string, decoupage: Decoupage, body: string): Promise<void> {
  const result = reconcile(body, decoupage, {}, ids)
  if (result.textChanges.length === 0 && result.decoupage === decoupage) {
    linkStore.set({ ready: true, active: true })
    return
  }

  // Avant toute modification des fichiers : une copie de sécurité. Sans elle, rien n'est modifié.
  const firstLink = !decoupage.scriptLinked
  const backup = await window.neoscenar.backupLinkFiles(firstLink ? 'link' : 'reconcile')
  if (linkStore.get().projectId !== projectId) return
  if (!backup.ok) {
    linkStore.set({ ready: true, active: false, backupError: backup.error })
    return
  }

  replaceBodyBeforeEditing(applyTextChanges(body, result.textChanges))
  setLinkedDecoupage(result.decoupage)
  const report = firstLink ? firstLinkReport(result, decoupage, body, backup.value) : null
  linkStore.set({ ready: true, active: true, report })
  if (!firstLink) showBanner(result)
}

/**
 * scenario.fountain a été modifié dans un autre logiciel et vient d'être relu : on le rapproche des
 * cartes comme à l'ouverture, après une copie de sécurité. Renvoie le corps à utiliser (avec les
 * numéros écrits), ou le corps relu tel quel si rien ne change ou si le lien n'est pas actif.
 */
async function linkAfterReload(body: string): Promise<string> {
  const { projectId, active } = linkStore.get()
  const decoupage = currentDecoupage()
  if (!active || !decoupage) return body
  const result = reconcile(body, decoupage, { knownCards: knownCards() }, ids)
  if (result.textChanges.length === 0 && result.decoupage === decoupage) return body

  const backup = await window.neoscenar.backupLinkFiles('reconcile')
  if (linkStore.get().projectId !== projectId) return body
  if (!backup.ok) {
    // Sans copie, rien n'est modifié : le lien est suspendu, comme à l'ouverture.
    linkStore.set({ active: false, backupError: backup.error })
    return body
  }
  // Le découpage a pu changer pendant la copie : le rapprochement est refait sur l'état du moment.
  const now = currentDecoupage() ?? decoupage
  const final = now === decoupage ? result : reconcile(body, now, { knownCards: knownCards() }, ids)
  noteRemovedCards(now, final.decoupage)
  setLinkedDecoupage(final.decoupage)
  showBanner(final)
  return applyTextChanges(body, final.textChanges)
}

const BANNER_DURATION_MS = 10_000
let bannerTimer: ReturnType<typeof setTimeout> | null = null

/**
 * Cartes nommées par la ligne « devenue(s) orpheline(s) » du bandeau affiché, et cette ligne. Quand
 * l'une est supprimée ou reconnectée, la ligne est réécrite (ou retirée) : le bandeau ne signale
 * jamais une carte qui n'est plus orpheline.
 */
let bannerOrphans: { ids: string[]; line: string } | null = null

function settleBannerOrphans(): void {
  const banner = linkStore.get().banner
  if (!banner || !bannerOrphans) return
  const scenes = cardsStore.get().history?.present.scenes ?? []
  const next = orphanedLine(bannerOrphans.ids, scenes)
  if (next.ids.length === bannerOrphans.ids.length && next.line === bannerOrphans.line) return
  const previous = bannerOrphans.line
  bannerOrphans = next.line === null ? null : { ids: next.ids, line: next.line }
  setBanner({
    ...banner,
    lines: banner.lines.flatMap((line) =>
      line !== previous ? [line] : next.line === null ? [] : [next.line]
    ),
    orphanId: next.ids[0] ?? null
  })
}
cardsStore.subscribe(settleBannerOrphans)

/** Le bandeau reste affiché tant qu'il y a une carte orpheline ou une ressemblance à trancher. */
function isSticky(banner: LinkBanner): boolean {
  return banner.orphanId !== null || (banner.sheets?.resemblances.length ?? 0) > 0
}

function isEmptyBanner(banner: LinkBanner): boolean {
  const sheets = banner.sheets
  return (
    banner.lines.length === 0 &&
    (!sheets ||
      (sheets.created.length === 0 &&
        sheets.resemblances.length === 0 &&
        !sheets.replaced &&
        !sheets.renamed))
  )
}

function setBanner(banner: LinkBanner): void {
  if (bannerTimer) clearTimeout(bannerTimer)
  bannerTimer = null
  if (isEmptyBanner(banner)) {
    closeBanner()
    return
  }
  linkStore.set({ banner })
  if (!isSticky(banner)) bannerTimer = setTimeout(closeBanner, BANNER_DURATION_MS)
}

/** Résumé d'un rapprochement dans le bandeau, s'il y a quelque chose à signaler. */
function showBanner(result: ReconcileResult): void {
  const lines = summaryLines(result.summary)
  if (lines.length === 0) return
  // Dans l'ordre du résumé : la ligne recalculée est alors identique à celle affichée.
  const orphans = result.summary.orphaned.flatMap((label) => {
    const scene = result.decoupage.scenes.find((s) => s.orphan && sceneLabel(s) === label)
    return scene ? [scene] : []
  })
  const tracked = orphanedLine(
    orphans.map((scene) => scene.id),
    result.decoupage.scenes
  )
  bannerOrphans = tracked.line === null ? null : { ids: tracked.ids, line: tracked.line }
  setBanner({
    lines,
    orphanId: orphans[0]?.id ?? null,
    sheets: linkStore.get().banner?.sheets ?? null
  })
}

/**
 * Partie « fiches » du bandeau (étape 10C), à côté du résumé du rapprochement des cartes s'il est
 * affiché. `change` reçoit la partie actuelle (ou une partie vide) et renvoie la nouvelle.
 */
export function updateSheetsBanner(change: (sheets: SheetsBanner) => SheetsBanner): void {
  const current = linkStore.get().banner
  const sheets = change(
    current?.sheets ?? { created: [], resemblances: [], replaced: null, renamed: null }
  )
  setBanner({ lines: current?.lines ?? [], orphanId: current?.orphanId ?? null, sheets })
}

export function closeBanner(): void {
  if (bannerTimer) clearTimeout(bannerTimer)
  bannerTimer = null
  bannerOrphans = null
  if (linkStore.get().banner) linkStore.set({ banner: null })
}

function firstLinkReport(
  result: ReconcileResult,
  before: Decoupage,
  body: string,
  backupFolder: string
): FirstLinkReport {
  return {
    ...firstLinkLines(result.summary),
    notes: summaryLines(result.summary),
    cardCount: before.scenes.length,
    sceneCount: readScriptScenes(body).length,
    backupFolder: `${DATA_FOLDER_NAME}/${backupFolder}`
  }
}

export function closeLinkReport(): void {
  linkStore.set({ report: null, backupError: null })
}

export function unloadLink(): void {
  removedCards.clear()
  closeBanner()
  linkStore.set({ projectId: null, ready: false, active: false, report: null, backupError: null })
}
