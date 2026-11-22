import { readFile, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { makeTempDir, removeDir } from '../project/testHelpers'
import { ProjectTexts } from './projectTexts'

let dataDir: string
let texts: ProjectTexts

beforeEach(async () => {
  dataDir = await makeTempDir()
  texts = new ProjectTexts({ dataDir, onStatus: () => undefined, delayMs: 1 })
})

afterEach(() => removeDir(dataDir))

describe('ProjectTexts', () => {
  it('lit un fichier absent comme un texte vide, sans le créer', async () => {
    expect(await texts.read('synopsis')).toBe('')
    await expect(stat(join(dataDir, 'synopsis.md'))).rejects.toThrow()
  })

  it('ne crée pas de fichier pour un texte vide', async () => {
    texts.write('pitch', '')
    expect(await texts.flush()).toBe(true)
    await expect(stat(join(dataDir, 'pitch.md'))).rejects.toThrow()
  })

  it('écrit chaque document dans son propre fichier', async () => {
    texts.write('synopsis', '# Titre\n\nDu **gras**.')
    texts.write('intention', 'Mon intention')
    await texts.flush()
    expect(await readFile(join(dataDir, 'synopsis.md'), 'utf8')).toBe('# Titre\n\nDu **gras**.')
    expect(await readFile(join(dataDir, 'note-intention.md'), 'utf8')).toBe('Mon intention')
    await expect(stat(join(dataDir, 'pitch.md'))).rejects.toThrow()
  })

  it('relit un fichier modifié ailleurs', async () => {
    texts.write('pitch', 'Avant')
    await texts.flush()
    await writeFile(join(dataDir, 'pitch.md'), 'Écrit dans Obsidian', 'utf8')
    expect(await texts.read('pitch')).toBe('Écrit dans Obsidian')
  })

  it('refuse un nom inconnu', async () => {
    await expect(texts.read('../projet')).rejects.toThrow()
    expect(() => texts.write('projet', 'x')).toThrow()
  })

  it('accepte log line et tag line, refuse un nom inconnu', async () => {
    texts.write('logLine', '## Version 1\n\nUn père.\n')
    await texts.flush()
    expect(await readFile(join(dataDir, 'log-line.md'), 'utf8')).toContain('Un père.')
    expect(() => texts.write('toString', 'x')).toThrow()
    expect(await texts.read('tagLine')).toBe('')
  })
})
