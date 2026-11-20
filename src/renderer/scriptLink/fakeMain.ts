import { vi } from 'vitest'
import type { Decoupage } from '../../shared/projectTypes'

// Outil des tests : faux processus principal qui retient ce que l'interface lui envoie.

export interface FakeMain {
  scenario: string
  decoupage: Decoupage
  backups: string[]
  sentScenario: string[]
  sentDecoupage: Decoupage[]
  backupFails: boolean
  /** Fichier modifié dans un autre logiciel : relu au prochain « checkScenario ». */
  external: string | null
}

export function installFakeMain(
  scenario: string,
  decoupage: Decoupage,
  backupFails = false
): FakeMain {
  const main: FakeMain = {
    scenario,
    decoupage,
    backups: [],
    sentScenario: [],
    sentDecoupage: [],
    backupFails,
    external: null
  }
  const ok = <T>(value: T) => Promise.resolve({ ok: true as const, value })
  vi.stubGlobal('window', {
    neoscenar: {
      getDecoupage: () => ok(main.decoupage),
      getScenario: () => ok(main.scenario),
      checkScenario: () => {
        const text = main.external
        main.external = null
        return Promise.resolve(text)
      },
      getVocabulary: () => Promise.resolve({ ok: false, error: 'absent' }),
      getContinuedMarks: () => Promise.resolve(false),
      getPdfOptions: () => Promise.resolve({ ok: false, error: 'absent' }),
      setUndoState: () => Promise.resolve(),
      updateDecoupage: (decoupage: Decoupage) => {
        main.sentDecoupage.push(decoupage)
        return ok(undefined)
      },
      updateScenario: (text: string) => {
        main.sentScenario.push(text)
        return ok(undefined)
      },
      // Copie des vignettes d'un plan dupliqué : prend un peu de temps, comme sur le disque.
      copyThumbnailFiles: (shotId: string, files: { thumbnail: string | null }) =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                value: {
                  thumbnail: files.thumbnail && `storyboard/vignettes/${shotId}.png`,
                  thumbnailSource: null
                }
              }),
            5
          )
        ),
      backupLinkFiles: (kind: string) => {
        if (main.backupFails) return Promise.resolve({ ok: false, error: 'Disque plein.' })
        main.backups.push(kind)
        return ok(`sauvegardes/avant_${kind === 'link' ? 'liaison' : 'rapprochement'}_x`)
      }
    }
  })
  return main
}
