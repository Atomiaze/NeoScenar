import { mkdir, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { displayPathInFilm } from '../portablePath'
import { countPdfPages, exportPlanningPdf, exportShootingPdf } from '@neoscenar/pdf-planning'
import { fr } from '../../renderer/i18n/fr'
import { buildIcs } from '../../shared/planning/ics'
import type { PdfSavedFile } from '../../shared/pdfExport'
import {
  DEFAULT_PLANNING_EXPORT_OPTIONS,
  PLANNING_EXPORT_KINDS,
  type PlanningExportInfo,
  type PlanningExportOptions,
  type PlanningExportPreview,
  type PlanningExportRequest
} from '../../shared/planningExport'
import { PROJECT_FILES } from '../../shared/projectTypes'
import { writeFileSafely, writeJsonSafely } from '../fs/safeWrite'
import { describeWriteError, ProjectError } from '../project/errors'
import type { LoadedProject } from '../project/readProject'
import { planningFileStamp } from '../planning/planningFile'
import { planningExportDir, planningFileName } from './planningFiles'

export interface PlanningExporterDeps {
  current(): LoadedProject
  /** Écrit d'abord le planning en attente : la date du fichier sert au calendrier. */
  flush(): Promise<void>
  /** Dossier des polices Inter. */
  fontsDir: string
  now?(): Date
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Vérifie la demande reçue de l'interface (rien n'est dessiné ni écrit sans cela). */
export function parsePlanningExportRequest(raw: unknown): PlanningExportRequest {
  const invalid = new ProjectError(fr.planningExport.invalidRequest)
  if (!isRecord(raw) || !isRecord(raw['data'])) throw invalid
  const kind = PLANNING_EXPORT_KINDS.find((k) => k === raw['kind'])
  const person = raw['person']
  if (!kind || !(person === null || typeof person === 'string')) throw invalid
  const data = raw['data']
  if (kind === 'planning' && !(Array.isArray(data['phases']) && isRecord(data['range'])))
    throw invalid
  if (kind === 'tournage' && !Array.isArray(data['days'])) throw invalid
  if (kind === 'calendrier' && !(Array.isArray(data['events']) && typeof data['name'] === 'string'))
    throw invalid
  return raw as unknown as PlanningExportRequest
}

/** Export du planning : PDF « Planning », PDF « Plan de tournage » et calendrier .ics. */
export class PlanningExporter {
  private fonts: { regular: Uint8Array; bold: Uint8Array } | null = null

  constructor(private readonly deps: PlanningExporterDeps) {}

  private async loadFonts(): Promise<{ regular: Uint8Array; bold: Uint8Array }> {
    if (this.fonts) return this.fonts
    const font = async (name: string): Promise<Uint8Array> =>
      new Uint8Array(await readFile(join(this.deps.fontsDir, `Inter-${name}.ttf`)))
    this.fonts = { regular: await font('Regular'), bold: await font('Bold') }
    return this.fonts
  }

  info(): PlanningExportInfo {
    const saved = this.deps.current().project.exportPlanning
    return { options: saved ?? { ...DEFAULT_PLANNING_EXPORT_OPTIONS } }
  }

  private fileName(request: PlanningExportRequest): string {
    const { project } = this.deps.current()
    return planningFileName(
      request.kind,
      project.title,
      request.person,
      this.deps.now?.() ?? new Date()
    )
  }

  private relativeToFilm(path: string): string {
    const { rootDir } = this.deps.current()
    return displayPathInFilm(rootDir, path)
  }

  /** Contenu du fichier : PDF dessiné ou texte du calendrier. */
  private async render(
    request: PlanningExportRequest
  ): Promise<{ bytes: Uint8Array; pageCount: number; eventCount: number }> {
    const { project } = this.deps.current()
    if (request.kind === 'calendrier') {
      await this.deps.flush()
      const now = this.deps.now?.() ?? new Date()
      const stamp = await planningFileStamp(this.deps.current().dataDir)
      const text = buildIcs({
        ...request.data,
        stamp: now,
        modifiedAt: stamp === 0 ? now : new Date(stamp)
      })
      return {
        bytes: new TextEncoder().encode(text),
        pageCount: 0,
        eventCount: request.data.events.length
      }
    }
    const fonts = await this.loadFonts()
    const bytes =
      request.kind === 'planning'
        ? await exportPlanningPdf({ ...request.data, title: project.title, fonts })
        : await exportShootingPdf({ ...request.data, title: project.title, fonts })
    return { bytes, pageCount: await countPdfPages(bytes), eventCount: 0 }
  }

  async preview(request: PlanningExportRequest): Promise<PlanningExportPreview> {
    const { rootDir, dataDir } = this.deps.current()
    const { bytes, pageCount, eventCount } = await this.render(request)
    return {
      bytes: request.kind === 'calendrier' ? null : bytes,
      pageCount,
      eventCount,
      folder: this.relativeToFilm(await planningExportDir(rootDir, dataDir)),
      fileName: this.fileName(request)
    }
  }

  /** Mémorise le genre d'export et la personne si cela a changé. */
  async rememberOptions(options: PlanningExportOptions): Promise<void> {
    const current = this.deps.current()
    const saved = current.project.exportPlanning ?? DEFAULT_PLANNING_EXPORT_OPTIONS
    if (saved.kind === options.kind && saved.person === options.person) return
    const project = {
      ...current.project,
      exportPlanning: { kind: options.kind, person: options.person },
      modifiedAt: new Date().toISOString()
    }
    await writeJsonSafely(join(current.dataDir, PROJECT_FILES.project), project)
    current.project = project
  }

  /** Emplacement proposé : 01_Production/Planning/ ou exports/. Un fichier du même nom est remplacé. */
  async defaultPath(request: PlanningExportRequest): Promise<string> {
    const { rootDir, dataDir } = this.deps.current()
    return join(await planningExportDir(rootDir, dataDir), this.fileName(request))
  }

  async save(request: PlanningExportRequest, targetPath: string | null): Promise<PdfSavedFile> {
    const path = targetPath ?? (await this.defaultPath(request))
    const extension = request.kind === 'calendrier' ? '.ics' : '.pdf'
    if (!path.toLowerCase().endsWith(extension)) {
      throw new ProjectError(
        request.kind === 'calendrier' ? fr.planningExport.notIcs : fr.pdfExport.notPdf
      )
    }
    if (request.kind === 'calendrier' && request.data.events.length === 0) {
      throw new ProjectError(fr.planningExport.noEvents)
    }
    const { bytes } = await this.render(request)
    try {
      await mkdir(dirname(path), { recursive: true })
      await writeFileSafely(path, bytes)
    } catch (error) {
      throw new ProjectError(describeWriteError(error))
    }
    await this.rememberOptions({ kind: request.kind, person: request.person })
    return { path, relativePath: this.relativeToFilm(path) }
  }
}
