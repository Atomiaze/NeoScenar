import { mkdir, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { displayPathInFilm } from '../portablePath'
import { paginate, parse, resolveLayout, type ResolvedLayout } from '@neoscenar/fountain'
import { exportScenarioPdf, planPages, type PdfFonts, type PdfInput } from '@neoscenar/pdf-scenario'
import { fr } from '../../renderer/i18n/fr'
import type {
  PdfExportOptions,
  PdfExportRequest,
  PdfPreview,
  PdfSavedFile
} from '../../shared/pdfExport'
import { PROJECT_FILES } from '../../shared/projectTypes'
import { writeFileSafely, writeJsonSafely } from '../fs/safeWrite'
import { describeWriteError, ProjectError } from '../project/errors'
import type { LoadedProject } from '../project/readProject'
import { pdfFileName } from './pdfFileName'

export interface PdfExporterDeps {
  current(): LoadedProject
  fontsDir: string
  layoutPath: string
  now?(): Date
}

/** Garde-fou : un scénario de 120 pages fait environ 200 000 caractères. */
const MAX_TEXT_LENGTH = 20_000_000

/** Vérifie les options reçues de l'interface (rien n'est écrit sans cela). */
export function parsePdfRequest(raw: unknown): PdfExportRequest {
  const value = raw as Partial<PdfExportRequest> | null
  const options = value?.options as Partial<PdfExportOptions> | undefined
  if (
    typeof value?.text !== 'string' ||
    value.text.length > MAX_TEXT_LENGTH ||
    typeof options?.pageDeTitre !== 'boolean' ||
    (options.numerotation !== 'fountain' && options.numerotation !== 'continue') ||
    typeof options.nouvellePageParActe !== 'boolean' ||
    typeof value.continued !== 'boolean'
  ) {
    throw new ProjectError(fr.pdfExport.invalidRequest)
  }
  return {
    text: value.text,
    options: {
      pageDeTitre: options.pageDeTitre,
      numerotation: options.numerotation,
      nouvellePageParActe: options.nouvellePageParActe
    },
    continued: value.continued
  }
}

/** Export PDF : le même texte et la même pagination que l'éditeur, dessinés par pdf-scenario. */
export class PdfExporter {
  private resources: { fonts: PdfFonts; layout: ResolvedLayout } | null = null

  constructor(private readonly deps: PdfExporterDeps) {}

  private async loadResources(): Promise<{ fonts: PdfFonts; layout: ResolvedLayout }> {
    if (this.resources) return this.resources
    const font = async (name: string): Promise<Uint8Array> =>
      new Uint8Array(await readFile(join(this.deps.fontsDir, `CourierPrime-${name}.ttf`)))
    const [regular, bold, italic, boldItalic] = await Promise.all([
      font('Regular'),
      font('Bold'),
      font('Italic'),
      font('BoldItalic')
    ])
    const layout = resolveLayout(JSON.parse(await readFile(this.deps.layoutPath, 'utf8')))
    this.resources = { fonts: { regular, bold, italic, boldItalic }, layout }
    return this.resources
  }

  private async input(request: PdfExportRequest): Promise<PdfInput> {
    const { fonts, layout } = await this.loadResources()
    const document = parse(request.text)
    return {
      document,
      // Mêmes règles qu'à l'écran : (SUITE) selon la préférence, nouvelle page par acte selon le projet.
      pagination: paginate(document, layout, {
        continued: request.continued,
        newPageForActs: request.options.nouvellePageParActe
      }),
      layout,
      fonts,
      options: request.options
    }
  }

  async preview(request: PdfExportRequest): Promise<PdfPreview> {
    const input = await this.input(request)
    return { bytes: await exportScenarioPdf(input), pageCount: planPages(input).length }
  }

  /** Options mémorisées dans projet.json. */
  options(): PdfExportOptions {
    return this.deps.current().project.exportPdf
  }

  /** Mémorise les options si elles ont changé. */
  async rememberOptions(options: PdfExportOptions): Promise<void> {
    const current = this.deps.current()
    const saved = current.project.exportPdf
    if (
      saved.pageDeTitre === options.pageDeTitre &&
      saved.numerotation === options.numerotation &&
      saved.nouvellePageParActe === options.nouvellePageParActe
    ) {
      return
    }
    const project = { ...current.project, exportPdf: options, modifiedAt: new Date().toISOString() }
    await writeJsonSafely(join(current.dataDir, PROJECT_FILES.project), project)
    current.project = project
  }

  /** Emplacement proposé : exports/ du projet. Un fichier du même nom est remplacé. */
  defaultPath(): string {
    const { dataDir, project } = this.deps.current()
    return join(dataDir, 'exports', pdfFileName(project.title, this.deps.now?.() ?? new Date()))
  }

  /** Écrit le PDF à `targetPath` (ou à l'emplacement proposé). */
  async save(request: PdfExportRequest, targetPath: string | null): Promise<PdfSavedFile> {
    const path = targetPath ?? this.defaultPath()
    if (!path.toLowerCase().endsWith('.pdf')) throw new ProjectError(fr.pdfExport.notPdf)
    const bytes = await exportScenarioPdf(await this.input(request))
    try {
      await mkdir(dirname(path), { recursive: true })
      await writeFileSafely(path, bytes)
    } catch (error) {
      throw new ProjectError(describeWriteError(error))
    }
    await this.rememberOptions(request.options)
    const { rootDir } = this.deps.current()
    return { path, relativePath: displayPathInFilm(rootDir, path) }
  }
}
