import { describe, expect, it } from 'vitest'
import { parse } from '@neoscenar/fountain'
import {
  characterProposals,
  headingProposals,
  namesInScript,
  type NameLists,
  type Proposal
} from './proposals'

const LISTS: NameLists = {
  locations: ['MAISON - CUISINE', 'MAISON - GRENIER', 'RUE SAINT-LUC', 'ÉCOLE'],
  characters: ['CHLOÉ', 'FRANÇOIS', 'ÉLODIE'],
  times: ['JOUR', 'NUIT', 'MATIN', 'SOIR', 'AUBE', 'CRÉPUSCULE', 'PLUS TARD', 'CONTINU']
}

/** Libellés affichés ; la ligne discrète « garder » est notée « garder « … » ». */
const labels = (proposals: Proposal[]): string[] =>
  proposals.map((p) => (p.kind === 'keep' ? `garder « ${p.label} »` : p.label))

describe('assistant d’en-tête de scène', () => {
  it('1. taper « i » ou « e » propose les préfixes', () => {
    expect(labels(headingProposals('i', LISTS))).toEqual(['INT.', 'INT./EXT.'])
    expect(labels(headingProposals('e', LISTS))).toEqual(['EXT.'])
    expect(headingProposals('int', LISTS)[0]).toEqual({
      label: 'INT.',
      kind: 'prefix',
      from: 0,
      insert: 'INT. '
    })
  })

  it('rien sur une ligne vide', () => {
    expect(headingProposals('', LISTS)).toEqual([])
  })

  it('2. après le préfixe et une espace : les lieux déjà utilisés', () => {
    expect(labels(headingProposals('INT. ', LISTS))).toEqual(LISTS.locations)
    expect(labels(headingProposals('INT. ma', LISTS))).toEqual([
      'MAISON - CUISINE',
      'MAISON - GRENIER',
      'garder « ma »'
    ])
    // Sans tenir compte des accents.
    expect(labels(headingProposals('EXT. eco', LISTS))).toEqual(['ÉCOLE', 'garder « eco »'])
    expect(headingProposals('INT. ma', LISTS)[0]).toMatchObject({
      from: 5,
      insert: 'MAISON - CUISINE'
    })
  })

  it('3. après « - » : les moments, puis les lieux composés qui commencent pareil', () => {
    expect(labels(headingProposals('EXT. RUE SAINT-LUC - ', LISTS))).toEqual(LISTS.times)
    expect(labels(headingProposals('EXT. RUE SAINT-LUC - n', LISTS))).toEqual([
      'NUIT',
      'garder « n »'
    ])
    expect(labels(headingProposals('INT. MAISON - ', LISTS))).toEqual([
      ...LISTS.times,
      'MAISON - CUISINE',
      'MAISON - GRENIER'
    ])
    expect(headingProposals('INT. MAISON - CUISINE - j', LISTS)[0]).toEqual({
      label: 'JOUR',
      kind: 'time',
      from: 24,
      insert: 'JOUR'
    })
  })

  it('le moment écrit en entier n’est plus proposé (Entrée passe alors à l’action)', () => {
    expect(headingProposals('INT. ÉCOLE - JOUR', LISTS)).toEqual([])
  })

  it('fonctionne aussi avec INT./EXT. et un en-tête forcé par un point', () => {
    expect(labels(headingProposals('INT./EXT. RUE', LISTS))).toEqual([
      'RUE SAINT-LUC',
      'garder « RUE »'
    ])
    expect(labels(headingProposals('.RUE', LISTS))).toEqual(['RUE SAINT-LUC', 'garder « RUE »'])
  })
})

describe('autocomplétion des personnages', () => {
  it('propose les personnages déjà présents', () => {
    expect(labels(characterProposals('f', LISTS))).toEqual(['FRANÇOIS', 'garder « f »'])
    expect(labels(characterProposals('e', LISTS))).toEqual(['ÉLODIE', 'garder « e »'])
    expect(characterProposals('@ch', LISTS)[0]).toMatchObject({ from: 1, insert: 'CHLOÉ' })
  })

  it('après « ( » : les extensions', () => {
    expect(labels(characterProposals('CHLOÉ (', LISTS))).toEqual([
      'V.O.',
      'O.S.',
      'O.C.',
      'SOUS-TITRE',
      'SUITE'
    ])
    expect(characterProposals('CHLOÉ (o', LISTS)).toEqual([
      { label: 'O.S.', kind: 'extension', from: 7, insert: 'O.S.)' },
      { label: 'O.C.', kind: 'extension', from: 7, insert: 'O.C.)' }
    ])
  })

  it('rien après une extension refermée', () => {
    expect(characterProposals('CHLOÉ (V.O.) ', LISTS)).toEqual([])
  })
})

describe('texte tapé identique à une proposition, ou début d’une proposition', () => {
  const PEOPLE: NameLists = { ...LISTS, characters: ['LÉA-ROSE', 'LÉA', 'PAUL'] }
  const PLACES: NameLists = { ...LISTS, locations: ['ÉCOLE SAINT-LUC', 'ÉCOLE'] }

  it('personnage : la proposition identique passe en tête (Entrée la garde)', () => {
    expect(labels(characterProposals('léa', PEOPLE))).toEqual(['LÉA', 'LÉA-ROSE'])
    expect(characterProposals('LEA', PEOPLE)[0]).toMatchObject({ kind: 'character', insert: 'LÉA' })
  })

  it('personnage : un simple début ajoute en bas la ligne « garder »', () => {
    const onlyLonger = { ...PEOPLE, characters: ['LÉA-ROSE'] }
    expect(labels(characterProposals('LÉA', onlyLonger))).toEqual(['LÉA-ROSE', 'garder « LÉA »'])
    expect(characterProposals('LÉA', onlyLonger)[1]).toEqual({
      label: 'LÉA',
      kind: 'keep',
      from: 0,
      insert: 'LÉA'
    })
  })

  it('lieu : la proposition identique passe en tête, sinon la ligne « garder »', () => {
    expect(labels(headingProposals('INT. école', PLACES))).toEqual(['ÉCOLE', 'ÉCOLE SAINT-LUC'])
    expect(labels(headingProposals('INT. ÉCOLE SAINT', PLACES))).toEqual([
      'ÉCOLE SAINT-LUC',
      'garder « ÉCOLE SAINT »'
    ])
  })

  it('rien quand seule la proposition identique reste : Entrée passe à l’élément suivant', () => {
    expect(characterProposals('PAUL', PEOPLE)).toEqual([])
    expect(headingProposals('INT. ÉCOLE SAINT-LUC', PLACES)).toEqual([])
  })
})

describe('découpage lieu / moment sur « espace-tiret-espace »', () => {
  it('« INT. ÉCOLE SAINT-LUC - APRÈS-MIDI » : lieu ÉCOLE SAINT-LUC, moment APRÈS-MIDI', () => {
    const lists: NameLists = { ...LISTS, times: ['APRÈS-MIDI', 'AUBE'], locations: [] }
    // Le tiret de SAINT-LUC ne coupe rien : on en est encore au lieu, aucun moment proposé.
    expect(headingProposals('INT. ÉCOLE SAINT-', lists)).toEqual([])
    expect(headingProposals('INT. ÉCOLE SAINT-LUC - APR', lists)).toEqual([
      { label: 'APRÈS-MIDI', kind: 'time', from: 23, insert: 'APRÈS-MIDI' },
      { label: 'APR', kind: 'keep', from: 23, insert: 'APR' }
    ])
    const doc = parse('INT. ÉCOLE SAINT-LUC - APRÈS-MIDI\n\nAction.\n', { titlePage: false })
    expect(doc.elements[0].scene).toMatchObject({
      location: 'ÉCOLE SAINT-LUC',
      time: 'APRÈS-MIDI'
    })
    expect(namesInScript(doc, 0).locations).toEqual(['ÉCOLE SAINT-LUC'])
  })

  it('l’en-tête provisoire des cartes (.SCÈNE À ÉCRIRE) n’est pas proposé comme lieu', () => {
    const doc = parse('.SCÈNE À ÉCRIRE #10#\n\nINT. GRENIER - NUIT #20#\n', { titlePage: false })
    expect(namesInScript(doc, 0).locations).toEqual(['GRENIER'])
  })

  it('« MAISON - CUISINE - NUIT » : lieu MAISON - CUISINE, moment NUIT', () => {
    const doc = parse('INT. MAISON - CUISINE - NUIT\n\nAction.\n', { titlePage: false })
    expect(doc.elements[0].scene).toMatchObject({ location: 'MAISON - CUISINE', time: 'NUIT' })
    expect(namesInScript(doc, 0).locations).toEqual(['MAISON - CUISINE'])
    expect(headingProposals('INT. MAISON - CUISINE - NU', LISTS)[0]).toMatchObject({
      label: 'NUIT',
      kind: 'time',
      from: 24
    })
  })
})

describe('noms déjà présents dans le scénario', () => {
  const doc = parse(
    'INT. MAISON - CUISINE - JOUR\n\nCHLOÉ\nBonjour.\n\nEXT. RUE - NUIT\n\nFRANÇOIS (O.S.)\nSalut.\n\nINT. MAI\n',
    { titlePage: false }
  )

  it('extrait les lieux (règle du dernier « - ») et les personnages sans extension', () => {
    expect(namesInScript(doc, 0)).toEqual({
      locations: ['MAISON - CUISINE', 'RUE', 'MAI'],
      characters: ['CHLOÉ', 'FRANÇOIS']
    })
  })

  it('ne propose pas la ligne en cours d’écriture', () => {
    expect(namesInScript(doc, 11).locations).toEqual(['MAISON - CUISINE', 'RUE'])
  })
})
