import { describe, expect, it } from 'vitest'
import { parse, splitTitlePage } from '../src/index.ts'
import { exampleNames, readExample } from './helpers.ts'

describe('splitTitlePage', () => {
  it('sépare la page de titre et ses lignes vides du corps', () => {
    const text = 'Title: Essai\nAuthor: Classe\n\n\nINT. CUISINE - JOUR\n'
    expect(splitTitlePage(text)).toEqual({
      titlePage: 'Title: Essai\nAuthor: Classe\n\n\n',
      body: 'INT. CUISINE - JOUR\n'
    })
  })

  it('ne prend pas le « : » d’une note pour une clé de page de titre', () => {
    const text = 'Il [[R:jaune]]pleut[[/R]] fort.\n\nINT. CUISINE - JOUR\n'
    expect(splitTitlePage(text).titlePage).toBe('')
    expect(splitTitlePage('Title: Essai [[à revoir: oui]]\n\nIl pleut.\n').titlePage).not.toBe('')
  })

  it('sans page de titre, tout est dans le corps', () => {
    expect(splitTitlePage('\nINT. CUISINE - JOUR\n')).toEqual({
      titlePage: '',
      body: '\nINT. CUISINE - JOUR\n'
    })
  })

  it('garde la marque BOM avec la page de titre', () => {
    expect(splitTitlePage('﻿INT. A - JOUR\n')).toEqual({ titlePage: '﻿', body: 'INT. A - JOUR\n' })
    expect(splitTitlePage('﻿Title: X\n\nAction.\n').titlePage).toBe('﻿Title: X\n\n')
  })

  it('page de titre + corps redonne exactement chaque fichier d’exemple', () => {
    for (const name of exampleNames()) {
      const text = readExample(name)
      const { titlePage, body } = splitTitlePage(text)
      expect(titlePage + body, name).toBe(text)
    }
  })

  it('le corps relu sans page de titre donne les mêmes éléments que le fichier entier', () => {
    const text = readExample('exemple-complet.fountain')
    const { body } = splitTitlePage(text)
    const whole = parse(text).elements.map((element) => [element.type, element.text])
    const alone = parse(body, { titlePage: false }).elements.map((element) => [
      element.type,
      element.text
    ])
    expect(alone).toEqual(whole)
  })
})

describe('parse sans page de titre', () => {
  it('une première ligne « Clé: valeur » reste une action dans le corps', () => {
    expect(parse('Lieu: la cuisine.\n', { titlePage: false }).elements.map((e) => e.type)).toEqual([
      'action'
    ])
    expect(parse('Lieu: la cuisine.\n').titlePage).not.toBeNull()
  })
})
