import { describe, expect, it } from 'vitest'
import { parse, plainTitle, readTitlePage, splitTitlePage, updateTitlePage } from '../src/index.ts'
import { readExample } from './helpers.ts'

const PAGE =
  "Title: _**LE DERNIER BUS**_\nCredit: Drame\nRevision: 2\nAuthor:\n    Atelier d'écriture\n    Classe de 5e\nContact: contact@example.com\n\n"

/** Relit les valeurs d'une page de titre par l'analyseur Fountain. */
const reread = (titlePage: string) => readTitlePage(titlePage)

describe('page de titre : lecture', () => {
  it('lit les champs de la fenêtre, valeurs sur plusieurs lignes comprises', () => {
    expect(readTitlePage(PAGE)).toEqual({
      Title: '_**LE DERNIER BUS**_',
      Credit: 'Drame',
      Author: "Atelier d'écriture\nClasse de 5e",
      Source: '',
      Contact: 'contact@example.com',
      'Draft date': '',
      Notes: ''
    })
  })

  it('reconnaît les clés sans tenir compte de la casse (« Draft Date »)', () => {
    expect(readTitlePage('Draft Date: 2025\n\n')['Draft date']).toBe('2025')
  })
})

describe('page de titre : écriture', () => {
  it('rien ne change si les valeurs sont identiques : texte gardé à l’octet près', () => {
    expect(updateTitlePage(PAGE, readTitlePage(PAGE))).toBe(PAGE)
    const crlf = PAGE.replace(/\n/g, '\r\n')
    expect(updateTitlePage(crlf, readTitlePage(crlf))).toBe(crlf)
  })

  it('modifie une clé à sa place ; garde les autres et la clé inconnue telles quelles', () => {
    const result = updateTitlePage(PAGE, { ...readTitlePage(PAGE), Credit: 'Court métrage' })
    expect(result).toBe(PAGE.replace('Credit: Drame', 'Credit: Court métrage'))
    expect(result).toContain('Revision: 2\n')
  })

  it('valeur sur plusieurs lignes : « Clé: » seul, puis chaque ligne en retrait de 3 espaces', () => {
    const result = updateTitlePage(PAGE, {
      ...readTitlePage(PAGE),
      Contact: 'contact@example.com\n04 123 45 67'
    })
    expect(result).toContain('Contact:\n   contact@example.com\n   04 123 45 67\n')
    expect(reread(result).Contact).toBe('contact@example.com\n04 123 45 67')
  })

  it('ajoute les clés nouvelles après les clés existantes, dans l’ordre des champs', () => {
    const result = updateTitlePage(PAGE, {
      ...readTitlePage(PAGE),
      Notes: 'Version de travail',
      Source: 'Scénario original'
    })
    expect(
      result.endsWith(
        'Contact: contact@example.com\nSource: Scénario original\nNotes: Version de travail\n\n'
      )
    ).toBe(true)
  })

  it('un champ vidé supprime sa clé', () => {
    const result = updateTitlePage(PAGE, { ...readTitlePage(PAGE), Credit: '  ' })
    expect(result).toBe(PAGE.replace('Credit: Drame\n', ''))
  })

  it('crée la page de titre en tête quand il n’y en a pas, suivie d’une ligne vide', () => {
    expect(updateTitlePage('', { Title: 'La clé', Author: 'Chloé' })).toBe(
      'Title: La clé\nAuthor: Chloé\n\n'
    )
    expect(updateTitlePage('﻿', { Title: 'La clé' })).toBe('﻿Title: La clé\n\n')
  })

  it('aucune page de titre si tous les champs sont vides', () => {
    expect(updateTitlePage('', { Title: '', Author: '' })).toBe('')
    expect(updateTitlePage('Title: X\nAuthor: Y\n\n', { Title: '', Author: '' })).toBe('')
  })

  it('le corps du scénario est inchangé et la page de titre relue donne les valeurs saisies', () => {
    const file = readExample('le-dernier-bus.fountain')
    const { titlePage, body } = splitTitlePage(file)
    const values = {
      ...readTitlePage(titlePage),
      Title: '_**LE PREMIER BUS**_',
      Notes: 'Ligne 1\nLigne 2'
    }
    const result = updateTitlePage(titlePage, values) + body
    expect(splitTitlePage(result).body).toBe(body)
    expect(readTitlePage(splitTitlePage(result).titlePage)).toEqual(values)
    const elements = (text: string) =>
      parse(text).elements.map((element) => [element.type, element.text])
    expect(elements(result)).toEqual(elements(file))
  })
})

describe('titre sans marqueurs', () => {
  it('retire la mise en forme : « _**LE DERNIER BUS**_ » → « LE DERNIER BUS »', () => {
    expect(plainTitle('_**LE DERNIER BUS**_')).toBe('LE DERNIER BUS')
    expect(plainTitle('La clé [[provisoire]]')).toBe('La clé')
  })
})
