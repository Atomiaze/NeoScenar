import { describe, expect, it } from 'vitest'
import { sameIgnoringLineEndings } from '../lineEndings'
import { applySheetPatch, newSheetText, parseSheet } from './sheetEngine'

const MARIE = `---
type: personnage
nom: MARIE
interprete: Léa Dupont
age: 16
role: principal        # principal | secondaire | figurant
couleur: "#E07A5F"
resume: Lycéenne qui veut quitter sa ville.
auto: false
---

## Description

Description longue, texte libre.

## Objectifs

## Relations

## Images

![](images/marie-1.jpg)
`

// La même fiche, retouchée dans Obsidian : propriétés, section et texte libre en plus.
const FROM_OBSIDIAN = `---
type: personnage
nom: MARIE
tags:
  - lycée
  - héroïne
interprete: Léa Dupont
age: 16
role: principal        # principal | secondaire | figurant
couleur: "#E07A5F"
resume: Lycéenne qui veut quitter sa ville.
auto: false
aliases: [Mimi]
---
Note libre avant les sections, avec un [[lien]].

## Description

Description longue, texte libre.

### Enfance

Née à Liège.

## Costumes

- Veste rouge
- Baskets

## Objectifs

## Relations

## Images

Photo de repérage :
![](images/marie-1.jpg)
![[marie-obsidian.png]]
`

describe('parseSheet', () => {
  it('lit les propriétés, les sections et les images', () => {
    const sheet = parseSheet(MARIE, 'personnages')
    expect(sheet.nom).toBe('MARIE')
    expect(sheet.props).toEqual({
      interprete: 'Léa Dupont',
      age: '16',
      role: 'principal',
      couleur: '#E07A5F',
      resume: 'Lycéenne qui veut quitter sa ville.'
    })
    expect(sheet.auto).toBe(false)
    expect(sheet.sections).toEqual({
      description: 'Description longue, texte libre.',
      objectifs: '',
      relations: ''
    })
    expect(sheet.images).toEqual(['images/marie-1.jpg'])
    expect(sheet.unreadable).toBe(false)
  })

  it("garde les sous-titres dans la section et lit les images d'Obsidian", () => {
    const sheet = parseSheet(FROM_OBSIDIAN, 'personnages')
    expect(sheet.sections.description).toBe(
      'Description longue, texte libre.\n\n### Enfance\n\nNée à Liège.'
    )
    expect(sheet.images).toEqual(['images/marie-1.jpg', 'marie-obsidian.png'])
  })

  it('lit une fiche sans propriétés, ou aux propriétés illisibles', () => {
    expect(parseSheet('## Description\n\nCoucou\n', 'personnages')).toMatchObject({
      nom: '',
      unreadable: false,
      sections: { description: 'Coucou' }
    })
    expect(parseSheet('---\nnom: [MARIE\n---\n', 'personnages').unreadable).toBe(true)
  })

  it('lit les chemins entre chevrons ou encodés', () => {
    const raw = '## Images\n\n![](<images/mon image.jpg>)\n![x](images/autre%20image.png "titre")\n'
    expect(parseSheet(raw, 'personnages').images).toEqual([
      'images/mon image.jpg',
      'images/autre image.png'
    ])
  })
})

describe('applySheetPatch', () => {
  it('ne change rien quand les valeurs sont identiques', () => {
    const sheet = parseSheet(FROM_OBSIDIAN, 'personnages')
    const same = applySheetPatch(FROM_OBSIDIAN, 'personnages', {
      props: sheet.props,
      auto: sheet.auto,
      sections: sheet.sections,
      images: sheet.images
    })
    expect(same).toBe(FROM_OBSIDIAN)
  })

  it("modifie un champ sans rien perdre de ce qu'Obsidian a ajouté", () => {
    const result = applySheetPatch(FROM_OBSIDIAN, 'personnages', {
      props: { interprete: 'Zoé Martin', role: 'secondaire' },
      sections: { objectifs: 'Partir à Bruxelles.' }
    })
    expect(result).toContain('tags:\n  - lycée\n  - héroïne')
    expect(result).toContain('aliases: [ Mimi ]')
    expect(result).toContain('role: secondaire # principal | secondaire | figurant')
    expect(result).toContain('interprete: Zoé Martin')
    expect(result).toContain('Note libre avant les sections, avec un [[lien]].')
    expect(result).toContain('## Costumes\n\n- Veste rouge\n- Baskets\n\n## Objectifs')
    expect(result).toContain('## Objectifs\n\nPartir à Bruxelles.\n\n## Relations')
    const reread = parseSheet(result, 'personnages')
    expect(reread.sections.description).toContain('Née à Liège.')
    expect(reread.images).toEqual(['images/marie-1.jpg', 'marie-obsidian.png'])
  })

  it("écrit l'âge comme un nombre et la couleur entre guillemets", () => {
    const result = applySheetPatch(MARIE, 'personnages', {
      props: { age: '17', couleur: '#3D85C6' }
    })
    expect(result).toContain('age: 17\n')
    expect(result).toContain('couleur: "#3D85C6"')
    expect(parseSheet(result, 'personnages').props.age).toBe('17')
    const text = applySheetPatch(MARIE, 'personnages', { props: { age: 'environ 40' } })
    expect(parseSheet(text, 'personnages').props.age).toBe('environ 40')
  })

  it('garde le texte libre de la section Images en ajoutant et retirant des images', () => {
    const added = applySheetPatch(FROM_OBSIDIAN, 'personnages', {
      images: ['images/marie-1.jpg', 'marie-obsidian.png', 'images/marie 2.jpg']
    })
    expect(added).toContain(
      'Photo de repérage :\n![](images/marie-1.jpg)\n![[marie-obsidian.png]]\n![](<images/marie 2.jpg>)\n'
    )
    const removed = applySheetPatch(added, 'personnages', {
      images: ['marie-obsidian.png', 'images/marie 2.jpg']
    })
    expect(removed).toContain('Photo de repérage :\n![[marie-obsidian.png]]\n')
    expect(removed).not.toContain('marie-1.jpg')
  })

  it('ajoute les sections qui manquent à leur place habituelle', () => {
    const raw = '---\nnom: PAUL\n---\n\n## Images\n'
    const result = applySheetPatch(raw, 'personnages', {
      sections: { relations: 'Frère de Marie.', objectifs: '' },
      images: ['images/paul.png']
    })
    expect(result).toBe(
      '---\nnom: PAUL\n---\n\n## Relations\n\nFrère de Marie.\n\n## Images\n\n![](images/paul.png)\n'
    )
  })

  it('crée les propriétés et les sections dans une fiche qui n’en a pas', () => {
    const result = applySheetPatch('Texte libre.\n', 'personnages', {
      props: { resume: 'Voisin bavard.' },
      sections: { description: 'Grand et maigre.' }
    })
    expect(result).toBe(
      '---\nresume: Voisin bavard.\n---\nTexte libre.\n\n## Description\n\nGrand et maigre.\n'
    )
  })

  it('lit une fiche de Windows (CRLF, BOM) et la réécrit avec « \\n » (étape 16A)', () => {
    const raw = '\uFEFF' + MARIE.replace(/\n/g, '\r\n')
    expect(parseSheet(raw, 'personnages')).toEqual(parseSheet(MARIE, 'personnages'))
    const result = applySheetPatch(raw, 'personnages', { sections: { relations: 'Amie de Paul.' } })
    expect(result).toContain('## Relations\n\nAmie de Paul.\n\n## Images')
    expect(result).not.toContain('\r')
    expect(result.startsWith('\uFEFF')).toBe(true)
    // Sans modification réelle, seules les fins de ligne changeraient : rien à réécrire.
    expect(sameIgnoringLineEndings(applySheetPatch(raw, 'personnages', {}), raw)).toBe(true)
  })

  it('refuse de modifier les propriétés illisibles', () => {
    expect(() => applySheetPatch('---\nnom: [X\n---\n', 'personnages', { auto: true })).toThrow()
  })
})

describe('newSheetText', () => {
  it('écrit une fiche complète au format de la spécification', () => {
    const text = newSheetText('personnages', 'MARIE', { couleur: '#E07A5F' })
    expect(text).toBe(`---
type: personnage
nom: MARIE
interprete: ""
age: ""
role: ""
couleur: "#E07A5F"
resume: ""
auto: false
---

## Description

## Objectifs

## Relations

## Images
`)
    expect(parseSheet(text, 'personnages')).toMatchObject({ nom: 'MARIE', auto: false })
  })
})

describe('fiche de lieu', () => {
  const PLACE = `---
type: lieu
nom: MAISON - CUISINE
resume: Cuisine étroite, années 70.
auto: false
---

## Description

## Repérage

## Images
`

  it('lit les champs du lieu', () => {
    const content = parseSheet(PLACE, 'lieux')
    expect(content.nom).toBe('MAISON - CUISINE')
    expect(content.props.resume).toBe('Cuisine étroite, années 70.')
    expect(content.unreadable).toBe(false)
  })

  it('crée un lieu sans couleur, avec ses sections', () => {
    const text = newSheetText('lieux', 'MAISON - CUISINE', { couleur: '#E07A5F' })
    expect(text).toContain('type: lieu')
    expect(text).not.toContain('couleur')
    expect(text).toContain('## Repérage')
  })

  it('garde ce qu’Obsidian a ajouté en écrivant le repérage', () => {
    const edited =
      PLACE.replace('auto: false', 'auto: false\ntags: [intérieur]') + '\n## Notes\n\nÀ revoir.\n'
    const out = applySheetPatch(edited, 'lieux', { sections: { reperage: 'Lundi 9 h.' } })
    expect(out).toContain('## Repérage\n\nLundi 9 h.')
    expect(out).toMatch(/tags: \[ ?intérieur ?\]/)
    expect(out).toContain('## Notes\n\nÀ revoir.')
  })
})
