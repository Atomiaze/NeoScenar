import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { loadVocabulary, parseVocabulary } from './vocabulary'

const SHIPPED = join(__dirname, '..', '..', 'resources', 'vocabulaire', 'saint-luc.json')

describe('vocabulaire du cours', () => {
  it('le fichier livré est valide et contient les listes du cours', async () => {
    const vocabulary = await loadVocabulary(SHIPPED)
    expect(vocabulary.shotSizes.map((term) => term.label)).toEqual([
      "Plan d'ensemble",
      'Plan demi-ensemble',
      'Plan moyen',
      'Plan américain',
      'Plan rapproché taille',
      'Plan rapproché poitrine',
      'Gros plan',
      'Très gros plan'
    ])
    expect(vocabulary.cameraMovements).toHaveLength(5)
    expect(vocabulary.cameraAngles).toHaveLength(7)
    expect(vocabulary.cameraAngles[1]).toEqual({
      label: 'Plongée',
      definition:
        "Caméra en hauteur pointant vers le bas ; réduit l'importance du sujet, vulnérabilité."
    })
  })

  it('le fichier livré contient les moments de l’en-tête de scène', async () => {
    const vocabulary = await loadVocabulary(SHIPPED)
    expect(vocabulary.sceneTimes).toEqual(
      expect.arrayContaining(['JOUR', 'NUIT', 'CRÉPUSCULE', 'PLUS TARD'])
    )
  })

  it('un ancien fichier sans moments reste lisible ; un moment invalide est refusé', () => {
    const raw = {
      formatVersion: 1,
      id: 'x',
      name: 'x',
      shotSizes: [],
      cameraMovements: [],
      cameraAngles: []
    }
    expect(parseVocabulary(raw, 'x.json').sceneTimes).toEqual([])
    expect(() => parseVocabulary({ ...raw, sceneTimes: ['JOUR', 3] }, 'x.json')).toThrow(
      '« sceneTimes[1] »'
    )
  })

  it('un terme sans définition est refusé avec un message clair', () => {
    const raw = {
      formatVersion: 1,
      id: 'x',
      name: 'x',
      shotSizes: [{ label: 'Gros plan' }],
      cameraMovements: [],
      cameraAngles: []
    }
    expect(() => parseVocabulary(raw, 'x.json')).toThrow('« shotSizes[0].definition »')
  })

  it('fichier introuvable : message pour l’enseignant', async () => {
    await expect(loadVocabulary(join(__dirname, 'absent.json'))).rejects.toThrow('vocabulaire')
  })
})
