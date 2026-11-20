import { describe, expect, it } from 'vitest'
import {
  addLogos,
  addMusic,
  addRubric,
  addedRubrics,
  moveLogo,
  moveRubric,
  namesFromText,
  patchMusic,
  patchRubric,
  removeLogo,
  removeMusic,
  setBlockShown,
  setDisplayName
} from './creditsEdit'
import { defaultCreditsData } from './creditsData'
import type { TemplateBlock } from './types'

const block: TemplateBlock = {
  id: 'image',
  titre: 'Image',
  rubriques: [{ id: 'image.chef-op', intitule: 'Directeur de la photographie' }]
}

describe('creditsEdit', () => {
  it('lit une zone un-nom-par-ligne sans lignes vides', () => {
    expect(namesFromText(' Léa \r\n\n Tom\n')).toEqual(['Léa', 'Tom'])
  })

  it('crée une rubrique du modèle au premier nom, et la retire quand elle redevient vide', () => {
    const filled = patchRubric(defaultCreditsData(), 'image.chef-op', { noms: ['Léa'] })
    expect(filled.rubriques).toEqual([{ id: 'image.chef-op', intitule: null, noms: ['Léa'] }])
    expect(patchRubric(filled, 'image.chef-op', { noms: [] }).rubriques).toEqual([])
  })

  it('garde une rubrique vide si elle a un intitulé corrigé', () => {
    const data = patchRubric(defaultCreditsData(), 'image.chef-op', { intitule: 'Image' })
    expect(data.rubriques).toHaveLength(1)
  })

  it('ajoute des rubriques avec des identifiants uniques, les déplace et ne bouge que les ajoutées', () => {
    let data = addRubric(addRubric(defaultCreditsData(), 'image'), 'image')
    expect(addedRubrics(data, block).map((r) => r.id)).toEqual(['perso-1', 'perso-2'])
    data = moveRubric(data, block, 'perso-2', -1)
    expect(addedRubrics(data, block).map((r) => r.id)).toEqual(['perso-2', 'perso-1'])
    expect(moveRubric(data, block, 'perso-2', -1)).toBe(data)
    data = addRubric(data, 'image')
    expect(addedRubrics(data, block).map((r) => r.id)).toContain('perso-3')
  })

  it('affiche et masque un bloc facultatif', () => {
    const shown = setBlockShown(defaultCreditsData(), 'animation', true)
    expect(shown.options.blocsAffiches).toEqual(['animation'])
    expect(setBlockShown(shown, 'animation', false).options.blocsAffiches).toEqual([])
  })

  it('corrige et rétablit le nom affiché d’un personnage', () => {
    const data = setDisplayName(defaultCreditsData(), 'MARIE', 'Marie-Jo')
    expect(data.acteurs.nomsAffiches).toEqual({ MARIE: 'Marie-Jo' })
    expect(setDisplayName(data, 'MARIE', ' ').acteurs.nomsAffiches).toEqual({})
  })

  it('gère les musiques', () => {
    let data = patchMusic(addMusic(defaultCreditsData()), 0, { titre: 'Clair de lune' })
    expect(data.musiques[0].titre).toBe('Clair de lune')
    data = removeMusic(data, 0)
    expect(data.musiques).toEqual([])
  })

  it('gère les logos : sans doublon, ordre, retrait', () => {
    let data = addLogos(defaultCreditsData(), ['a.png', 'b.png', 'a.png'])
    data = addLogos(data, ['b.png', 'c.png'])
    expect(data.logos).toEqual(['a.png', 'b.png', 'c.png'])
    data = moveLogo(data, 2, -1)
    expect(data.logos).toEqual(['a.png', 'c.png', 'b.png'])
    expect(moveLogo(data, 0, -1)).toBe(data)
    expect(removeLogo(data, 1).logos).toEqual(['a.png', 'b.png'])
  })
})
