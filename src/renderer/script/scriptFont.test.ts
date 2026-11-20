import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

// La page du scénario utilise Courier Prime, livrée avec l'application (script.css) : le même
// caractère sur Mac, Windows et Linux. La mise en page Final Draft suppose 0,6 em par caractère.

const FONT_DIR = path.join(__dirname, '..', '..', '..', 'resources', 'polices', 'courier-prime')
const STYLES = [
  'CourierPrime-Regular.ttf',
  'CourierPrime-Bold.ttf',
  'CourierPrime-Italic.ttf',
  'CourierPrime-BoldItalic.ttf'
]

/** Unités par em (table head) et largeurs d'avance (table hmtx) d'une police TrueType. */
function metrics(file: string): { unitsPerEm: number; advances: Set<number> } {
  const data = readFileSync(file)
  const tables = new Map<string, number>()
  const count = data.readUInt16BE(4)
  for (let i = 0; i < count; i++) {
    const entry = 12 + 16 * i
    tables.set(data.toString('latin1', entry, entry + 4), data.readUInt32BE(entry + 8))
  }
  const head = tables.get('head')!
  const hhea = tables.get('hhea')!
  const hmtx = tables.get('hmtx')!
  const advanceCount = data.readUInt16BE(hhea + 34)
  const advances = new Set<number>()
  for (let i = 0; i < advanceCount; i++) {
    const advance = data.readUInt16BE(hmtx + 4 * i)
    if (advance > 0) advances.add(advance)
  }
  return { unitsPerEm: data.readUInt16BE(head + 18), advances }
}

describe('police du scénario', () => {
  it.each(STYLES)('%s : tous les caractères font 0,6 em', (style) => {
    const { unitsPerEm, advances } = metrics(path.join(FONT_DIR, style))
    expect(advances.size).toBe(1)
    const [advance] = [...advances]
    expect(advance / unitsPerEm).toBeCloseTo(0.6, 3)
  })

  it('la feuille de style charge les quatre fichiers livrés', () => {
    const css = readFileSync(path.join(__dirname, 'script.css'), 'utf8')
    for (const style of STYLES) expect(css).toContain(`polices/courier-prime/${style}`)
  })
})
