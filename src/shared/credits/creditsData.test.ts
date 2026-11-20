import { describe, expect, it } from 'vitest'
import {
  creditsFileVersion,
  defaultCreditsData,
  mergeCreditsData,
  parseCreditsData,
  serializeCreditsData
} from './creditsData'

describe('parseCreditsData', () => {
  it('donne un générique vide pour un contenu vide', () => {
    expect(parseCreditsData({})).toEqual(defaultCreditsData())
    expect(parseCreditsData(null)).toEqual(defaultCreditsData())
  })

  it('reprend la valeur par défaut d’un champ abîmé à la main', () => {
    const data = parseCreditsData({
      options: { ordreActeurs: 'au hasard', taille: 'grande' },
      rubriques: [{ id: 'image.cadre', noms: ['Léa', 3] }, { noms: ['sans id'] }, 'texte'],
      mentions: { fiction: 'oui', copyrightAnnee: 2025.5 },
      cartonsDebut: ['titre', 'inconnu']
    })
    expect(data.options.ordreActeurs).toBe('importance')
    expect(data.options.taille).toBe('grande')
    expect(data.rubriques).toEqual([{ id: 'image.cadre', intitule: null, noms: ['Léa'] }])
    expect(data.mentions.fiction).toBe(true)
    expect(data.mentions.copyrightAnnee).toBeNull()
    expect(data.cartonsDebut).toEqual(['titre'])
  })

  it('garde le bloc des rubriques ajoutées', () => {
    const data = parseCreditsData({
      rubriques: [{ id: 'perso-1', bloc: 'image', intitule: 'Lumière d’appoint', noms: ['Tom'] }]
    })
    expect(data.rubriques[0]).toEqual({
      id: 'perso-1',
      bloc: 'image',
      intitule: 'Lumière d’appoint',
      noms: ['Tom']
    })
  })
})

describe('creditsFileVersion', () => {
  it('lit la version écrite dans le fichier', () => {
    expect(creditsFileVersion({ version: 3 })).toBe(3)
    expect(creditsFileVersion({})).toBe(0)
  })
})

describe('mergeCreditsData', () => {
  it('conserve les clés inconnues à la racine, dans les objets et dans les listes', () => {
    const original = {
      version: 1,
      noteDuProf: 'à revoir',
      options: { ordreActeurs: 'apparition', police: 'Inter' },
      mentions: { fiction: true, remarque: 'x' },
      rubriques: [
        { id: 'image.cadre', intitule: null, noms: ['Léa'], couleur: 'rouge' },
        { id: 'son.perchman', intitule: null, noms: ['Tom'] }
      ],
      musiques: [{ titre: 'A', interprete: '', auteurs: '', autorisation: '', duree: '3:12' }]
    }
    const data = parseCreditsData(original)
    data.rubriques[0].noms = ['Léa', 'Zoé']
    data.rubriques.splice(1, 1)
    data.options.ordreActeurs = 'importance'
    const merged = mergeCreditsData(original, data)
    expect(merged.noteDuProf).toBe('à revoir')
    expect(merged.options).toMatchObject({ ordreActeurs: 'importance', police: 'Inter' })
    expect(merged.mentions).toMatchObject({ remarque: 'x' })
    expect(merged.rubriques).toEqual([
      { id: 'image.cadre', intitule: null, noms: ['Léa', 'Zoé'], couleur: 'rouge' }
    ])
    expect(merged.musiques).toEqual([
      { titre: 'A', interprete: '', auteurs: '', autorisation: '', duree: '3:12' }
    ])
  })

  it('écrit un JSON lisible qui se relit à l’identique', () => {
    const data = defaultCreditsData()
    data.rubriques.push({ id: 'son.perchman', intitule: 'Perche', noms: ['Tom'] })
    const text = serializeCreditsData({}, data)
    expect(text.endsWith('}\n')).toBe(true)
    expect(text).toContain('\n  "version": 1,')
    expect(parseCreditsData(JSON.parse(text))).toEqual(data)
  })
})
