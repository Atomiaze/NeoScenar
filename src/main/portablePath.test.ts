import { posix, win32 } from 'node:path'
import { describe, expect, it } from 'vitest'
import { isSafeRelativePath } from '../shared/relativePath'
import { isSheetImagePath, imageCandidates } from '../shared/research/sheetImages'
import {
  displayPathInFilm,
  isInsideFolder,
  isSameOrInside,
  resolveRelative,
  toPortableRelative
} from './portablePath'

describe('chemins relatifs du projet', () => {
  it('accepte les chemins ordinaires, accents et espaces compris', () => {
    expect(isSafeRelativePath('storyboard/vignettes/P_0010_1.png')).toBe(true)
    expect(isSafeRelativePath('personnages/images/mon image été.jpg')).toBe(true)
  })

  it('refuse ce qui sortirait du dossier ou serait lu autrement par Windows', () => {
    for (const bad of [
      '',
      '/a',
      'a//b',
      './a',
      'a/../b',
      '..',
      'a\\b',
      '..\\..\\x',
      'C:/x',
      'a/b:c'
    ]) {
      expect(isSafeRelativePath(bad), bad).toBe(false)
    }
  })
})

describe('chemins Windows (path.win32)', () => {
  const film = 'C:\\Users\\Élève\\Documents\\Mon Film'

  it('résout un chemin relatif avec des « \\ »', () => {
    expect(resolveRelative(film, 'storyboard/vignettes/a.png', win32)).toBe(
      'C:\\Users\\Élève\\Documents\\Mon Film\\storyboard\\vignettes\\a.png'
    )
    expect(() => resolveRelative(film, '..\\..\\secret.png', win32)).toThrow()
    expect(() => resolveRelative(film, 'D:/secret.png', win32)).toThrow()
  })

  it('reconnaît un fichier du film, même écrit avec d’autres majuscules', () => {
    expect(isInsideFolder(film, `${film}\\06_Blender\\a.blend`, win32)).toBe(true)
    expect(isInsideFolder(film, 'c:\\users\\élève\\documents\\mon film\\a.blend', win32)).toBe(true)
    expect(isInsideFolder(film, film, win32)).toBe(false)
    expect(isSameOrInside(film, film, win32)).toBe(true)
  })

  it('un autre disque n’est jamais « dans le film »', () => {
    expect(isSameOrInside(film, 'D:\\Exports\\x.pdf', win32)).toBe(false)
    expect(displayPathInFilm(film, 'D:\\Exports\\x.pdf', win32)).toBe('D:\\Exports\\x.pdf')
  })

  it('un dossier voisin au nom proche n’est pas dans le film', () => {
    expect(isSameOrInside(film, `${film}_copie\\x.pdf`, win32)).toBe(false)
    expect(isSameOrInside(film, 'C:\\Users\\Élève\\Documents\\..Mon Film\\x', win32)).toBe(false)
  })

  it('écrit toujours les chemins relatifs avec « / »', () => {
    expect(displayPathInFilm(film, `${film}\\01_Production\\Planning\\p.pdf`, win32)).toBe(
      '01_Production/Planning/p.pdf'
    )
    expect(
      toPortableRelative(`${film}\\neoscenar\\blender`, `${film}\\06_Blender\\a.blend`, win32)
    ).toBe('../../06_Blender/a.blend')
  })

  it('lecteur réseau (UNC)', () => {
    const unc = '\\\\serveur\\eleves\\Mon_Film'
    expect(displayPathInFilm(unc, `${unc}\\exports\\x.pdf`, win32)).toBe('exports/x.pdf')
    expect(isSameOrInside(unc, '\\\\serveur\\autres\\x.pdf', win32)).toBe(false)
  })
})

describe('chemins Linux (path.posix)', () => {
  const film = '/home/eleve/Mon Film'

  it('distingue les majuscules, contrairement au Mac et à Windows', () => {
    expect(isInsideFolder(film, '/home/eleve/Mon Film/a.blend', posix)).toBe(true)
    expect(isInsideFolder(film, '/home/eleve/mon film/a.blend', posix)).toBe(false)
  })

  it('chemin relatif et chemin affiché', () => {
    expect(resolveRelative(film, 'storyboard/vignettes/a.png', posix)).toBe(
      '/home/eleve/Mon Film/storyboard/vignettes/a.png'
    )
    expect(displayPathInFilm(film, '/media/cle/x.pdf', posix)).toBe('/media/cle/x.pdf')
    expect(displayPathInFilm(film, `${film}/exports/x.pdf`, posix)).toBe('exports/x.pdf')
  })
})

describe('images des fiches servies à l’interface', () => {
  it('refuse « \\ » et « : » (Windows les lirait comme un chemin ou un flux)', () => {
    expect(isSheetImagePath('personnages/images/a.png')).toBe(true)
    expect(isSheetImagePath('personnages/..\\..\\..\\secret.png')).toBe(false)
    expect(isSheetImagePath('personnages/images/a.png:flux.png')).toBe(false)
  })

  it('un lien écrit avec « \\ » (Obsidian sous Windows) est lu comme avec « / »', () => {
    expect(imageCandidates('personnages', 'images\\a.png')).toEqual(['personnages/images/a.png'])
    expect(imageCandidates('personnages', 'a:b.png')).toEqual([])
  })
})
