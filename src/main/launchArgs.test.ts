import { posix, win32 } from 'node:path'
import { describe, expect, it } from 'vitest'
import { projectFileFromArgs } from './launchArgs'

describe('projet passé au lancement (Windows et Linux)', () => {
  it('double-clic sous Windows : chemin complet, quelle que soit la casse', () => {
    const args = [
      'C:\\Program Files\\NeoScenar\\NeoScenar.exe',
      'D:\\Films\\Mon_Film\\Mon_Film.NEOSCENAR'
    ]
    expect(projectFileFromArgs(args.slice(1), 'C:\\Windows\\system32', win32)).toBe(
      'D:\\Films\\Mon_Film\\Mon_Film.NEOSCENAR'
    )
  })

  it('terminal Linux : chemin relatif lu depuis le dossier de lancement', () => {
    expect(projectFileFromArgs(['Mon Film/Mon_Film.neoscenar'], '/home/eleve', posix)).toBe(
      '/home/eleve/Mon Film/Mon_Film.neoscenar'
    )
  })

  it('ignore les options de Chromium et l’absence de projet', () => {
    expect(projectFileFromArgs(['--flag=x.neoscenar', '.'], '/home/eleve', posix)).toBeNull()
  })
})
