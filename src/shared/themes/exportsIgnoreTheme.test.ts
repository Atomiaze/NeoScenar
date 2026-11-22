// Les exports n'utilisent jamais le thème : page blanche, texte noir, Courier (étape 14).
// Le planning (15E) a son propre test « mêmes octets » : src/renderer/planning/planningExport.test.ts.
// Le moteur PDF ne reçoit aucune couleur de thème ; on le vérifie de deux façons.

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { paginate, parse, resolveLayout, type LayoutProfile } from '@neoscenar/fountain'
import { exportScenarioPdf } from '@neoscenar/pdf-scenario'

const ROOT = join(import.meta.dirname, '..', '..', '..')
const read = (...parts: string[]): string => readFileSync(join(ROOT, ...parts), 'utf8')
const font = (name: string): Uint8Array =>
  new Uint8Array(
    readFileSync(join(ROOT, 'resources', 'polices', 'courier-prime', `CourierPrime-${name}.ttf`))
  )

async function pdfOfExample(): Promise<Buffer> {
  const layout = resolveLayout(
    JSON.parse(read('resources', 'mise-en-page', 'final-draft-a4.json')) as LayoutProfile
  )
  const document = parse(
    read('packages', 'fountain', 'tests', 'exemples', 'le-dernier-bus.fountain')
  )
  const bytes = await exportScenarioPdf({
    document,
    pagination: paginate(document, layout, { continued: true }),
    layout,
    fonts: {
      regular: font('Regular'),
      bold: font('Bold'),
      italic: font('Italic'),
      boldItalic: font('BoldItalic')
    },
    options: { pageDeTitre: true, numerotation: 'fountain', scenario: true }
  })
  return Buffer.from(bytes)
}

function sourceFiles(folder: string): string[] {
  return readdirSync(folder, { withFileTypes: true, recursive: true })
    .filter((e) => e.isFile() && /\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name))
    .map((e) => join(e.parentPath, e.name))
}

describe('les exports ignorent le thème', () => {
  afterEach(() => vi.useRealTimers())

  it('PDF de « Le Dernier Bus » identique octet par octet, à date fixée', async () => {
    vi.useFakeTimers({ now: new Date('2026-11-19T10:00:00Z'), toFake: ['Date'] })
    const before = await pdfOfExample()
    const after = await pdfOfExample()
    expect(after.equals(before)).toBe(true)
  })

  it('aucun moteur ni exporteur ne lit le thème ni les variables CSS', () => {
    const folders = [
      join(ROOT, 'packages', 'pdf-scenario', 'src'),
      join(ROOT, 'packages', 'pdf-storyboard', 'src'),
      join(ROOT, 'packages', 'pdf-planning', 'src'),
      join(ROOT, 'src', 'main', 'pdfExport'),
      join(ROOT, 'src', 'main', 'storyboardExport'),
      join(ROOT, 'src', 'main', 'blender'),
      join(ROOT, 'src', 'main', 'credits'),
      join(ROOT, 'src', 'renderer', 'credits')
    ]
    for (const file of folders.flatMap(sourceFiles)) {
      const text = readFileSync(file, 'utf8')
      expect(text, file).not.toMatch(/themes\/themes|getComputedStyle|var\(--|prefs.*theme/)
    }
  })
})
