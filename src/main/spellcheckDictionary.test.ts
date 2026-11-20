import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  configureSpellchecker,
  DICTIONARY_FILE,
  dictionaryTarget,
  installDictionary,
  type SpellcheckSession
} from './spellcheckDictionary'

const SHIPPED = path.join(__dirname, '..', '..', 'resources', 'dictionnaires', DICTIONARY_FILE)

describe('dictionaryTarget', () => {
  it('rien sur Mac (correcteur du système)', () => {
    expect(dictionaryTarget('darwin', '/Users/eleve/Library/NeoScenar')).toBeNull()
  })

  it('Linux : sous-dossier Dictionaries des données', () => {
    expect(dictionaryTarget('linux', '/home/eleve/.config/NeoScenar', path.posix)).toBe(
      '/home/eleve/.config/NeoScenar/Dictionaries/fr-FR-3-0.bdic'
    )
  })

  it('Windows : directement dans les données (le dossier du .exe peut être interdit en écriture)', () => {
    expect(
      dictionaryTarget('win32', 'C:\\Users\\eleve\\AppData\\Roaming\\NeoScenar', path.win32)
    ).toBe('C:\\Users\\eleve\\AppData\\Roaming\\NeoScenar\\fr-FR-3-0.bdic')
  })
})

describe('dictionnaire livré', () => {
  it('est un vrai fichier BDic de Chromium', () => {
    const data = readFileSync(SHIPPED)
    expect(data.subarray(0, 4).toString('latin1')).toBe('BDic')
    expect(data.length).toBeGreaterThan(500_000)
  })
})

describe('installDictionary', () => {
  let dir: string
  let source: string
  let target: string

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'neoscenar-dico-'))
    source = path.join(dir, 'source.bdic')
    writeFileSync(source, 'BDic contenu')
    target = path.join(dir, 'donnees', 'Dictionaries', DICTIONARY_FILE)
  })
  afterEach(() => rmSync(dir, { recursive: true, force: true }))

  it('copie le fichier absent, en créant le dossier', () => {
    expect(installDictionary(source, target)).toBe('installed')
    expect(readFileSync(target, 'utf8')).toBe('BDic contenu')
    expect(existsSync(`${target}.tmp`)).toBe(false)
  })

  it('ne réécrit pas un fichier identique', () => {
    installDictionary(source, target)
    expect(installDictionary(source, target)).toBe('unchanged')
  })

  it('remplace un fichier abîmé ou ancien', () => {
    mkdirSync(path.dirname(target), { recursive: true })
    writeFileSync(target, 'abîmé')
    expect(installDictionary(source, target)).toBe('installed')
    expect(readFileSync(target, 'utf8')).toBe('BDic contenu')
  })

  it('source manquante : échec signalé, sans exception', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(installDictionary(path.join(dir, 'absent.bdic'), target)).toBe('failed')
    expect(existsSync(target)).toBe(false)
  })
})

describe('configureSpellchecker', () => {
  function fakeSession(): SpellcheckSession & { url?: string; languages?: string[] } {
    const fake: SpellcheckSession & { url?: string; languages?: string[] } = {
      setSpellCheckerDictionaryDownloadURL(url) {
        fake.url = url
      },
      setSpellCheckerLanguages(languages) {
        fake.languages = languages
      },
      on: () => fake
    }
    return fake
  }

  it('Mac : ne touche à rien', () => {
    const session = fakeSession()
    configureSpellchecker(session, 'darwin', '/Applications/NeoScenar.app/Contents/Resources')
    expect(session.url).toBeUndefined()
    expect(session.languages).toBeUndefined()
  })

  it.each(['linux', 'win32'] as const)(
    '%s : français imposé, téléchargement jamais vers internet',
    (platform) => {
      const session = fakeSession()
      configureSpellchecker(session, platform, path.join(dir(), 'dictionnaires'))
      expect(session.languages).toEqual(['fr-FR'])
      expect(session.url).toMatch(/^file:\/\/.*\/dictionnaires\/$/)
    }
  )

  it('langue refusée : pas de plantage', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const session = fakeSession()
    session.setSpellCheckerLanguages = () => {
      throw new Error('Invalid language code provided')
    }
    expect(() => configureSpellchecker(session, 'linux', dir())).not.toThrow()
  })

  function dir(): string {
    return tmpdir()
  }
})
