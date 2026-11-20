import { describe, expect, it } from 'vitest'
import {
  cleanVersionName,
  duplicateFolderName,
  isVersionFolderName,
  parseVersionData,
  sortVersions,
  suggestVersionName,
  versionFolderName,
  type VersionEntry
} from './versions'

const date = new Date(2026, 10, 19, 14, 32, 5)

describe('noms des versions', () => {
  it('dossier daté, sans accent ni espace', () => {
    expect(versionFolderName(date, 'Après la lecture d’été', new Set())).toBe(
      '20261119-143205_Apres_la_lecture_d_ete'
    )
  })

  it('nom sans lettre utilisable : la date seule', () => {
    expect(versionFolderName(date, '!!!', new Set())).toBe('20261119-143205')
  })

  it('deux versions du même nom à la même seconde : dossiers distincts', () => {
    const taken = new Set(['20261119-143205_Version_1'])
    expect(versionFolderName(date, 'Version 1', taken)).toBe('20261119-143205_Version_1_2')
  })

  it('nom proposé : un de plus que le plus grand « Version N »', () => {
    expect(suggestVersionName([])).toBe('Version 1')
    expect(suggestVersionName(['Version 1', 'Version 4', 'Lecture prof'])).toBe('Version 5')
    expect(suggestVersionName(['Premier jet', 'Lecture'])).toBe('Version 3')
  })

  it('nom obligatoire', () => {
    expect(cleanVersionName('   ')).toBeNull()
    expect(cleanVersionName('  Version   2 ')).toBe('Version 2')
  })

  it('dossier refusé s’il sort de versions/', () => {
    expect(isVersionFolderName('20261119-143205_Version_1')).toBe(true)
    expect(isVersionFolderName('../projet')).toBe(false)
    expect(isVersionFolderName('a/b')).toBe(false)
    expect(isVersionFolderName('.cache')).toBe(false)
  })

  it('dossier du duplicata', () => {
    expect(duplicateFolderName('Mon_Film', 'Version 2 (été)')).toBe('Mon_Film_Version_2_ete')
    expect(duplicateFolderName('Mon_Film', '???')).toBe('Mon_Film_copie')
  })
})

describe('version.json', () => {
  it('lu et vérifié', () => {
    const data = parseVersionData({
      formatVersion: 1,
      name: 'Version 1',
      note: 'Avant la lecture',
      createdAt: '2026-11-19T13:32:05.000Z',
      pages: 12,
      seconds: 700
    })
    expect(data?.name).toBe('Version 1')
  })

  it('abîmé : null', () => {
    expect(parseVersionData(null)).toBeNull()
    expect(parseVersionData({ name: '', createdAt: 'x', pages: 1, seconds: 1 })).toBeNull()
    expect(
      parseVersionData({ name: 'V', createdAt: '2026-11-19T13:32:05Z', pages: -1, seconds: 1 })
    ).toBeNull()
  })

  it('tri : plus récentes d’abord, abîmées à la fin', () => {
    const entry = (folder: string, createdAt: string): VersionEntry => ({
      folder,
      broken: false,
      formatVersion: 1,
      name: folder,
      note: '',
      createdAt,
      pages: 1,
      seconds: 60
    })
    const sorted = sortVersions([
      { folder: 'abime', broken: true },
      entry('a', '2026-11-18T10:00:00Z'),
      entry('b', '2026-11-19T10:00:00Z')
    ])
    expect(sorted.map((item) => item.folder)).toEqual(['b', 'a', 'abime'])
  })
})
