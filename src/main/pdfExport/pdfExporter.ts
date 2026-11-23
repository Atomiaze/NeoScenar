import { mkdir, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { displayPathInFilm } from '../portablePath'
import { paginate, parse, resolveLayout, type ResolvedLayout } from '@neoscenar/fountain'
import { withoutDrafts } from '../../shared/scriptLink/draftScene'
import {
  exportScenarioPdf,
  hasTitlePage,
  planPages,
  type PdfFonts,
  type PdfInput,
  type PdfTextDocument
} from '@neoscenar/pdf-scenario'
import { fr } from '../../renderer/i18n/fr'
import {
  PDF_PARTS,
  hasSomethingToExport,
  type PdfExportOptions,
  type PdfExportRequest,
  type PdfPartsAvailable,
  type PdfPreview,
  type PdfSavedFile
} from '../../shared/pdfExport'
import type { MarkdownTextName, ProjectTextName } from '../../shared/projectTexts'
import { parseVersions, retainedText } from '../../shared/versionedTexts'
import { PROJECT_FILES } from '../../shared/projectTypes'
import { writeFileSafely, writeJsonSafely } from '../fs/safeWrite'
import { describeWriteError, ProjectError } from '../project/errors'
import type { LoadedProject } from '../project/readProject'
import { markdownLines } from './markdownLines'
import { pdfFileName } from './pdfFileName'

export interface PdfExporterDeps {
  current(): LoadedProject
  fontsDir: string
  layoutPath: string
  /** Texte d'un document du projet (synopsis, log line…), après enregistrement de la saisie en cours. */
  readText(name: ProjectTextName): Promise<string>
  now?(): Date
}

/** Documents imprimés entre la page de titre et le scénario, dans cet ordre, avec leur titre automatique. */
const DOCUMENTS: {
  part: 'synopsis' | 'pitch' | 'noteIntention'
  name: MarkdownTextName
  title: string
}[] = [
  { part: 'synopsis', name: 'synopsis', title: fr.pdfExport.documentTitles.synopsis },
  { part: 'pitch', name: 'pitch', title: fr.pdfExport.documentTitles.pitch },
  { part: 'noteIntention', name: 'intention', title: fr.pdfExport.documentTitles.noteIntention }
]

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
    PDF_PARTS.some((part) => typeof options[part] !== 'boolean') ||
    typeof value.continued !== 'boolean'
  ) {
    throw new ProjectError(fr.pdfExport.invalidRequest)
  }
  return {
    text: value.text,
    options: {
      pageDeTitre: options.pageDeTitre,
      numerotation: options.numerotation,
      nouvellePageParActe: options.nouvellePageParActe,
      scenario: options.scenario === true,
      synopsis: options.synopsis === true,
      pitch: options.pitch === true,
      noteIntention: options.noteIntention === true
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

  /**
   * Entrée du PDF, et parties qui ont quelque chose à imprimer. Une partie cochée mais vide n'est
   * simplement pas imprimée.
   */
  private async input(
    request: PdfExportRequest
  ): Promise<{ input: PdfInput; available: PdfPartsAvailable }> {
    const { fonts, layout } = await this.loadResources()
    const { options } = request
    // Les scènes brouillon ne sont pas imprimées (18C-13).
    const document = withoutDrafts(parse(request.text))
    // Mêmes règles qu'à l'écran : (SUITE) selon la préférence, nouvelle page par acte selon le projet.
    const pagination = paginate(document, layout, {
      continued: request.continued,
      newPageForActs: options.nouvellePageParActe
    })
    const [logLine, tagLine, ...texts] = await Promise.all([
      this.deps.readText('logLine'),
      this.deps.readText('tagLine'),
      ...DOCUMENTS.map((doc) => this.deps.readText(doc.name))
    ])
    const titleExtras = {
      logLine: retainedText(parseVersions(logLine)),
      tagLine: retainedText(parseVersions(tagLine))
    }
    const documents = DOCUMENTS.map((doc, i): PdfTextDocument => ({
      title: doc.title,
      lines: markdownLines(texts[i])
    }))
    const available: PdfPartsAvailable = {
      pageDeTitre: hasTitlePage({ document, layout, titleExtras }),
      scenario: pagination.pages.some((page) => page.fragments.length > 0),
      synopsis: documents[0].lines.length > 0,
      pitch: documents[1].lines.length > 0,
      noteIntention: documents[2].lines.length > 0
    }
    const input: PdfInput = {
      document,
      pagination,
      layout,
      fonts,
      options: { ...options, scenario: options.scenario && available.scenario },
      documents: documents.filter((doc, i) => options[DOCUMENTS[i].part] && doc.lines.length > 0),
      titleExtras
    }
    return { input, available }
  }

  async preview(request: PdfExportRequest): Promise<PdfPreview> {
    const { input, available } = await this.input(request)
    return {
      bytes: await exportScenarioPdf(input),
      pageCount: planPages(input).length,
      available
    }
  }

  /** Options mémorisées dans projet.json. */
  options(): PdfExportOptions {
    return this.deps.current().project.exportPdf
  }

  /** Mémorise les options si elles ont changé. */
  async rememberOptions(options: PdfExportOptions): Promise<void> {
    const current = this.deps.current()
    const saved = current.project.exportPdf
    const keys = Object.keys(options) as (keyof PdfExportOptions)[]
    if (keys.every((key) => saved[key] === options[key])) return
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
    const { input, available } = await this.input(request)
    if (!hasSomethingToExport(request.options, available)) {
      throw new ProjectError(fr.pdfExport.nothingToExport)
    }
    const bytes = await exportScenarioPdf(input)
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
