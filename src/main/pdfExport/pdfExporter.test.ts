import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createProject } from '../project/createProject'
import type { LoadedProject } from '../project/readProject'
import {
  fixedSources,
  loadTestTemplate,
  makeTempDir,
  removeDir,
  request
} from '../project/testHelpers'
import { DEFAULT_PDF_OPTIONS, type PdfExportOptions } from '../../shared/pdfExport'
import type { ProjectTextName } from '../../shared/projectTexts'
import { PdfExporter, parsePdfRequest } from './pdfExporter'

const ROOT = join(import.meta.dirname, '..', '..', '..', 'resources')
const TEXT = 'Title: Essai\nAuthor: Élève\n\n\nINT. MAISON - NUIT #10#\n\nIl pleut.\n'

let location: string
let loaded: LoadedProject
let texts: Partial<Record<ProjectTextName, string>>

const opts = (changes: Partial<PdfExportOptions> = {}): PdfExportOptions => ({
  ...DEFAULT_PDF_OPTIONS,
  ...changes
})

function exporter(): PdfExporter {
  return new PdfExporter({
    current: () => loaded,
    fontsDir: join(ROOT, 'polices', 'courier-prime'),
    layoutPath: join(ROOT, 'mise-en-page', 'final-draft-a4.json'),
    readText: async (name) => texts[name] ?? '',
    now: () => new Date(2026, 10, 18)
  })
}

beforeEach(async () => {
  texts = {}
  location = await makeTempDir()
  loaded = await createProject(request(location), await loadTestTemplate(), fixedSources())
})

afterEach(() => removeDir(location))

describe('export PDF du scénario', () => {
  it('compte une page de plus avec la page de titre', async () => {
    const withTitle = await exporter().preview({
      text: TEXT,
      options: opts({ pageDeTitre: true, numerotation: 'fountain', nouvellePageParActe: false }),
      continued: false
    })
    const without = await exporter().preview({
      text: TEXT,
      options: opts({ pageDeTitre: false, numerotation: 'fountain', nouvellePageParActe: false }),
      continued: false
    })
    expect(withTitle.pageCount).toBe(without.pageCount + 1)
    expect(Buffer.from(withTitle.bytes.slice(0, 5)).toString()).toBe('%PDF-')
  })

  it('enregistre dans exports/ avec le nom prévu, et remplace le fichier du même nom', async () => {
    const options = opts({ numerotation: 'continue' })
    const first = await exporter().save({ text: TEXT, options, continued: false }, null)
    const second = await exporter().save(
      { text: TEXT + '\nEncore.\n', options, continued: false },
      null
    )
    expect(second.path).toBe(first.path)
    expect(first.relativePath).toBe('neoscenar/exports/Mon_Film_d_ete_scenario_2026-11-18.pdf')
    const bytes = await readFile(first.path)
    expect(bytes.subarray(0, 5).toString()).toBe('%PDF-')
  })

  it('mémorise les options dans projet.json', async () => {
    await exporter().save(
      {
        text: TEXT,
        options: opts({ pageDeTitre: false, numerotation: 'continue', nouvellePageParActe: true }),
        continued: false
      },
      null
    )
    const saved = JSON.parse(await readFile(join(loaded.dataDir, 'projet.json'), 'utf8'))
    expect(saved.exportPdf).toEqual({
      pageDeTitre: false,
      numerotation: 'continue',
      nouvellePageParActe: true,
      scenario: true,
      synopsis: false,
      pitch: false,
      noteIntention: false
    })
  })

  it('refuse un fichier qui ne finit pas par .pdf', async () => {
    await expect(
      exporter().save(
        {
          text: TEXT,
          options: opts({
            pageDeTitre: true,
            numerotation: 'fountain',
            nouvellePageParActe: false
          }),
          continued: false
        },
        join(location, 'x.txt')
      )
    ).rejects.toThrow('.pdf')
  })

  it('vérifie la demande venue de l’interface', () => {
    expect(() => parsePdfRequest({ text: 1, options: {} })).toThrow()
    expect(() =>
      parsePdfRequest({ text: 'a', options: { pageDeTitre: true, numerotation: 'autre' } })
    ).toThrow()
    const options = opts({ pageDeTitre: true, numerotation: 'fountain', nouvellePageParActe: true })
    expect(() => parsePdfRequest({ text: 'a', options })).toThrow() // (SUITE) manquant
    expect(parsePdfRequest({ text: 'a', options, continued: true })).toEqual({
      text: 'a',
      options,
      continued: true
    })
  })

  it('applique (SUITE) et la nouvelle page par acte', async () => {
    const text = '# Un\n\nMARIE\nA.\n\nElle sort.\n\nMARIE\nB.\n\n# Deux\n\nFin.\n'
    const preview = (nouvellePageParActe: boolean, continued: boolean) =>
      exporter().preview({
        text,
        options: opts({ pageDeTitre: false, nouvellePageParActe }),
        continued
      })
    expect((await preview(false, false)).pageCount).toBe(1)
    expect((await preview(true, false)).pageCount).toBe(2)
    expect((await preview(false, true)).bytes.length).not.toBe(
      (await preview(false, false)).bytes.length
    )
  })

  it('ajoute les documents cochés et non vides, avec leur titre, avant le scénario', async () => {
    texts = { synopsis: '# Début\n\nLéa **entre**.', intention: 'Pourquoi.', pitch: '   \n' }
    const preview = await exporter().preview({
      text: TEXT,
      options: opts({ synopsis: true, pitch: true, noteIntention: true }),
      continued: false
    })
    // Page de titre, synopsis, note d'intention (le pitch est vide), scénario.
    expect(preview.pageCount).toBe(4)
    expect(preview.available).toEqual({
      pageDeTitre: true,
      scenario: true,
      synopsis: true,
      pitch: false,
      noteIntention: true
    })
  })

  it('n’imprime que les documents si le scénario est décoché', async () => {
    texts = { synopsis: 'Texte.' }
    const preview = await exporter().preview({
      text: TEXT,
      options: opts({ pageDeTitre: false, scenario: false, synopsis: true }),
      continued: false
    })
    expect(preview.pageCount).toBe(1)
  })

  it('une log line retenue suffit à faire une page de titre', async () => {
    const text = 'INT. MAISON - NUIT\n\nIl pleut.\n'
    const before = await exporter().preview({ text, options: opts(), continued: false })
    expect(before.available.pageDeTitre).toBe(false)
    texts = { logLine: '## Version 1\n\nUn.\n\n## Version 2 (retenue)\n\nDeux.\n' }
    const after = await exporter().preview({ text, options: opts(), continued: false })
    expect(after.available.pageDeTitre).toBe(true)
    expect(after.pageCount).toBe(before.pageCount + 1)
  })

  it('refuse d’enregistrer quand rien n’est à exporter', async () => {
    await expect(
      exporter().save(
        {
          text: TEXT,
          options: opts({ pageDeTitre: false, scenario: false, synopsis: true }),
          continued: false
        },
        null
      )
    ).rejects.toThrow('Rien à exporter')
  })
})
