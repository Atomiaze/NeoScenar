import { describe, expect, it } from 'vitest'
import { parseCharacterLine, parseSceneHeading, parseInline } from '../src/index.ts'

describe('parseSceneHeading', () => {
  it('lieu composé et moment : le moment est le dernier segment', () => {
    expect(parseSceneHeading('INT. MAISON - CUISINE - JOUR')).toEqual({
      prefix: 'INT.',
      location: 'MAISON - CUISINE',
      time: 'JOUR',
      number: null
    })
  })

  it('sans « - », le moment est vide', () => {
    expect(parseSceneHeading('EXT. PARC')).toMatchObject({ location: 'PARC', time: '' })
  })

  it('un tiret dans un mot ne coupe pas le lieu', () => {
    expect(parseSceneHeading('EXT. RUE SAINT-LUC - NUIT')).toMatchObject({
      location: 'RUE SAINT-LUC',
      time: 'NUIT'
    })
  })

  it('un tiret final sans moment (en cours de frappe) ne reste pas dans le lieu', () => {
    for (const heading of ['INT. MAISON -', 'INT. MAISON - ', 'INT. MAISON –', 'INT. MAISON --']) {
      expect(parseSceneHeading(heading)).toMatchObject({ location: 'MAISON', time: '' })
    }
    expect(parseSceneHeading('INT. MAISON - CUISINE -')).toMatchObject({
      location: 'MAISON - CUISINE',
      time: ''
    })
    expect(parseSceneHeading('INT. RUE SAINT-')).toMatchObject({ location: 'RUE SAINT' })
  })

  it('accepte le tiret long', () => {
    expect(parseSceneHeading('INT. GARE – SOIR')).toMatchObject({ location: 'GARE', time: 'SOIR' })
  })

  it('reconnaît tous les préfixes', () => {
    const prefixes = ['INT.', 'EXT.', 'EST.', 'INT./EXT.', 'INT/EXT', 'I/E', 'int.', 'INT']
    for (const prefix of prefixes) {
      expect(parseSceneHeading(`${prefix} LIEU - JOUR`)?.prefix, prefix).toBe(prefix)
    }
  })

  it('numéro de scène en fin de ligne', () => {
    expect(parseSceneHeading('INT. MAISON - JOUR #12A#')).toMatchObject({
      number: '12A',
      time: 'JOUR'
    })
    expect(parseSceneHeading('EXT. PARC #I-1-A#')?.number).toBe('I-1-A')
    expect(parseSceneHeading('EXT. PARC #10#')?.location).toBe('PARC')
  })

  it('en-tête forcé sans préfixe', () => {
    expect(parseSceneHeading('.SOUVENIR - GRENIER')).toEqual({
      prefix: '',
      location: 'SOUVENIR',
      time: 'GRENIER',
      number: null
    })
  })

  it('ignore les notes pour le lieu et le moment', () => {
    expect(parseSceneHeading('INT. CAVE [[à confirmer]] - NUIT')).toMatchObject({
      location: 'CAVE',
      time: 'NUIT'
    })
  })

  it('renvoie null pour une ligne qui n’est pas un en-tête', () => {
    expect(parseSceneHeading('Marie entre.')).toBeNull()
    expect(parseSceneHeading('...et le silence')).toBeNull()
  })
})

describe('parseCharacterLine', () => {
  it('ÉLODIE (V.O.) : nom ÉLODIE, extension V.O.', () => {
    expect(parseCharacterLine('ÉLODIE (V.O.)')).toEqual({
      name: 'ÉLODIE',
      extensions: ['V.O.'],
      dual: false
    })
  })

  it('plusieurs extensions, dont SUITE', () => {
    expect(parseCharacterLine('FRANÇOIS (O.S.) (SUITE)')?.extensions).toEqual(['O.S.', 'SUITE'])
    expect(parseCharacterLine("MARIE (CONT'D)")?.extensions).toEqual(["CONT'D"])
  })

  it('dialogue simultané', () => {
    expect(parseCharacterLine('CHLOÉ ^')).toEqual({ name: 'CHLOÉ', extensions: [], dual: true })
    expect(parseCharacterLine('CHLOÉ (V.O.)^')).toMatchObject({ name: 'CHLOÉ', dual: true })
  })

  it('forcé par « @ », minuscules permises', () => {
    expect(parseCharacterLine('@McCLANE')).toEqual({ name: 'McCLANE', extensions: [], dual: false })
  })

  it('renvoie null pour une ligne avec des minuscules hors extensions', () => {
    expect(parseCharacterLine('Marie')).toBeNull()
    expect(parseCharacterLine('123')).toBeNull()
  })
})

describe('parseInline', () => {
  const plain = { bold: false, italic: false, underline: false }

  it('texte simple', () => {
    expect(parseInline('Bonjour')).toEqual([{ type: 'text', text: 'Bonjour', ...plain }])
  })

  it('italique, gras, gras italique, souligné', () => {
    expect(parseInline('*a* **b** ***c*** _d_')).toEqual([
      { type: 'text', text: 'a', ...plain, italic: true },
      { type: 'text', text: ' ', ...plain },
      { type: 'text', text: 'b', ...plain, bold: true },
      { type: 'text', text: ' ', ...plain },
      { type: 'text', text: 'c', ...plain, bold: true, italic: true },
      { type: 'text', text: ' ', ...plain },
      { type: 'text', text: 'd', ...plain, underline: true }
    ])
  })

  it('mises en forme imbriquées', () => {
    expect(parseInline('_**gras souligné**_')).toEqual([
      { type: 'text', text: 'gras souligné', bold: true, italic: false, underline: true }
    ])
  })

  it('échappement par barre oblique inverse', () => {
    expect(parseInline('\\*pas italique\\*')).toEqual([
      { type: 'text', text: '*pas italique*', ...plain }
    ])
  })

  it('marqueur orphelin conservé comme texte', () => {
    expect(parseInline('5 * 3')).toEqual([{ type: 'text', text: '5 * 3', ...plain }])
  })

  it('notes et texte mis de côté', () => {
    expect(parseInline('Elle sort. [[plan serré]] /*vieux*/')).toEqual([
      { type: 'text', text: 'Elle sort. ', ...plain },
      { type: 'note', text: 'plan serré', ...plain },
      { type: 'text', text: ' ', ...plain },
      { type: 'boneyard', text: 'vieux', ...plain }
    ])
  })

  it('note non refermée : du texte', () => {
    expect(parseInline('a [[ b')).toEqual([{ type: 'text', text: 'a [[ b', ...plain }])
  })
})
