import { parse } from '@neoscenar/fountain'
import { describe, expect, it } from 'vitest'
import { applyTextChanges } from '../scriptLink/textChanges'
import { renameInScript } from './scriptRename'
import {
  isEmptySheet,
  namesLookAlike,
  planSheets,
  presentKeys,
  scriptNames,
  sheetNameAtLine,
  sheetUsage
} from './scriptSheets'
import type { Sheet } from './types'

const SCRIPT = [
  'INT. MAISON - CUISINE - JOUR #10#',
  '',
  'MARIE (V.O.)',
  'Bonjour.',
  '',
  '@Paul ^',
  'Salut.',
  '',
  'MARIE (SUITE)',
  'Ça va ?',
  '',
  'EXT. RUE SAINT-LUC - NUIT #20#',
  '',
  'LÉA',
  'Où es-tu ?',
  '',
  '.SCÈNE À ÉCRIRE #30#',
  ''
].join('\n')

const doc = (text = SCRIPT) => parse(text, { titlePage: false })

function sheet(nom: string, changes: Partial<Sheet> = {}): Sheet {
  return {
    kind: 'personnages',
    fileName: `${nom}.md`,
    nom,
    props: { interprete: '', age: '', role: '', couleur: '#E07A5F', resume: '' },
    sections: { description: '', objectifs: '', relations: '' },
    auto: true,
    images: [],
    unreadable: false,
    ...changes
  }
}

describe('scriptNames', () => {
  it('liste les personnages sans extensions ni marques, et les lieux sans le moment', () => {
    const names = scriptNames(doc())
    expect(names.personnages).toEqual([
      { name: 'MARIE', count: 2 },
      { name: 'Paul', count: 1 },
      { name: 'LÉA', count: 1 }
    ])
    expect(names.lieux).toEqual([
      { name: 'MAISON - CUISINE', count: 1 },
      { name: 'RUE SAINT-LUC', count: 1 }
    ])
  })

  it('ignore la ligne en cours de frappe', () => {
    expect(scriptNames(doc(), 14).personnages.map(({ name }) => name)).toEqual(['MARIE', 'Paul'])
    expect(scriptNames(doc(), 1).lieux.map(({ name }) => name)).toEqual(['RUE SAINT-LUC'])
  })
})

describe('namesLookAlike', () => {
  it('une lettre de différence ou un nom contenu dans l’autre', () => {
    expect(namesLookAlike('personnages', 'MARI', 'MARIE')).toBe(true)
    expect(namesLookAlike('personnages', 'MARIE', 'MARYE')).toBe(true)
    expect(namesLookAlike('personnages', 'ÉLODIE', 'ELODIE')).toBe(true)
    expect(namesLookAlike('personnages', 'MARIE', 'MARIE-ANNE')).toBe(true)
    expect(namesLookAlike('personnages', 'JEAN', 'JEAN-PIERRE')).toBe(true)
  })

  it('lieux : une lettre de différence seulement, MAISON / MAISON - CUISINE est voulu', () => {
    expect(namesLookAlike('lieux', 'CUISIN', 'CUISINE')).toBe(true)
    expect(namesLookAlike('lieux', 'MAISON', 'MAISON - CUISINE')).toBe(false)
    expect(namesLookAlike('lieux', 'A', 'C')).toBe(false)
    expect(namesLookAlike('lieux', 'BAR', 'BAL')).toBe(false)
  })

  it('pas en dessous de 4 lettres, ni pour deux noms différents ou identiques', () => {
    expect(namesLookAlike('personnages', 'LÉA', 'LÉO')).toBe(false)
    expect(namesLookAlike('personnages', 'LUC', 'LUCA')).toBe(false)
    expect(namesLookAlike('personnages', 'MARIE', 'MARC')).toBe(false)
    expect(namesLookAlike('personnages', 'Marie', 'MARIE')).toBe(false)
    expect(namesLookAlike('personnages', 'MARIE', 'MRAIE')).toBe(false)
  })
})

describe('planSheets', () => {
  const names = (...list: [string, number][]) => list.map(([name, count]) => ({ name, count }))

  it('crée une fiche par nom nouveau (sans tenir compte de la casse)', () => {
    const plan = planSheets('personnages', names(['MARIE', 2], ['Paul', 1]), ['paul'])
    expect(plan).toEqual({ create: ['MARIE'], resemblances: [] })
  })

  it('ne crée pas un nom qui ressemble à une fiche existante', () => {
    const plan = planSheets('personnages', names(['MARI', 1]), ['MARIE'])
    expect(plan).toEqual({
      create: [],
      resemblances: [{ kind: 'personnages', name: 'MARI', sheet: 'MARIE' }]
    })
  })

  it('entre deux nouveaux noms proches, le plus fréquent reçoit la fiche', () => {
    const plan = planSheets('personnages', names(['MARI', 1], ['MARIE', 5]), [])
    expect(plan.create).toEqual(['MARIE'])
    expect(plan.resemblances).toEqual([{ kind: 'personnages', name: 'MARI', sheet: 'MARIE' }])
  })

  it('une ressemblance déjà signalée n’est ni créée ni répétée', () => {
    const plan = planSheets('personnages', names(['MARI', 1]), ['MARIE'], new Set(['MARI']))
    expect(plan).toEqual({ create: [], resemblances: [] })
  })
})

describe('sheetUsage', () => {
  const present = presentKeys([{ name: 'Marie', count: 1 }])

  it('présente, inutilisée ou absente du scénario', () => {
    expect(sheetUsage(sheet('MARIE'), present)).toBe('used')
    expect(sheetUsage(sheet('PAUL'), present)).toBe('unused')
    expect(sheetUsage(sheet('PAUL', { auto: false }), present)).toBe('absent')
    const written = sheet('PAUL', { props: { ...sheet('X').props, resume: 'Le frère' } })
    expect(sheetUsage(written, present)).toBe('absent')
  })

  it('la couleur proposée ne compte pas comme du contenu, une image oui', () => {
    expect(isEmptySheet(sheet('PAUL'))).toBe(true)
    expect(isEmptySheet(sheet('PAUL', { images: [{ ref: 'images/a.jpg', path: null }] }))).toBe(
      false
    )
    expect(isEmptySheet(sheet('PAUL', { unreadable: true }))).toBe(false)
  })
})

describe('sheetNameAtLine', () => {
  it('trouve le personnage ou le lieu de la ligne', () => {
    expect(sheetNameAtLine(doc(), 1)).toEqual({ kind: 'lieux', name: 'MAISON - CUISINE' })
    expect(sheetNameAtLine(doc(), 6)).toEqual({ kind: 'personnages', name: 'Paul' })
    expect(sheetNameAtLine(doc(), 4)).toBeNull()
    expect(sheetNameAtLine(doc(), 17)).toBeNull()
  })
})

describe('renameInScript', () => {
  it('remplace les éléments Personnage en gardant extensions et marques, pas le dialogue', () => {
    const text = 'MARI (V.O.)\nMARI est là.\n\n@Mari ^\nOui.\n'
    const result = applyTextChanges(
      text,
      renameInScript(text, doc(text), 'personnages', 'MARI', 'MARIE')
    )
    expect(result).toBe('MARIE (V.O.)\nMARI est là.\n\n@MARIE ^\nOui.\n')
  })

  it('remplace le lieu des en-têtes sans toucher au préfixe ni au moment', () => {
    const text = 'INT. CUISIN - JOUR #10#\n\nAction dans la CUISIN.\n\nEXT. CUISIN - NUIT\n'
    const result = applyTextChanges(
      text,
      renameInScript(text, doc(text), 'lieux', 'cuisin', 'CUISINE')
    )
    expect(result).toBe(
      'INT. CUISINE - JOUR #10#\n\nAction dans la CUISIN.\n\nEXT. CUISINE - NUIT\n'
    )
  })
})

describe('noms avec accents : NFD (macOS) et NFC (Windows)', () => {
  const nfc = 'ÉLIOTT'.normalize('NFC')
  const nfd = 'ÉLIOTT'.normalize('NFD')
  const script = `INT. CAFÉ - JOUR #10#\n\n${nfc}\nSalut.\n`

  it('les deux écritures sont bien différentes en mémoire', () => {
    expect(nfc).not.toBe(nfd)
  })

  it.each([
    ['fiche NFD, scénario NFC', nfd],
    ['fiche NFC, scénario NFC', nfc]
  ])('lie la fiche au personnage (%s)', (_label, sheetName) => {
    const names = scriptNames(doc(script))
    expect(sheetUsage(sheet(sheetName), presentKeys(names.personnages))).toBe('used')
  })

  it('lie une fiche NFC à un scénario écrit en NFD', () => {
    const names = scriptNames(doc(script.replace(nfc, nfd)))
    expect(sheetUsage(sheet(nfc), presentKeys(names.personnages))).toBe('used')
  })

  it('ne crée pas de seconde fiche pour le même nom', () => {
    expect(planSheets('personnages', [{ name: nfc, count: 1 }], [nfd]).create).toEqual([])
    expect(planSheets('personnages', [{ name: nfd, count: 1 }], [nfc]).create).toEqual([])
  })

  it('le renommage trouve le nom quelle que soit l’écriture', () => {
    const changes = renameInScript(script, doc(script), 'personnages', nfd, 'ÉLIOT')
    expect(changes.length).toBeGreaterThan(0)
  })
})
