import { describe, expect, it } from 'vitest'
import { parse } from '../src/index.ts'
import { readExample, types } from './helpers.ts'

describe('page de titre', () => {
  it('lit les paires clé/valeur dans l’ordre, avec les valeurs sur plusieurs lignes', () => {
    const doc = parse(
      'Title: Le Grenier\nCredit: écrit par\nAuthor: Léa\nContact:\n    IES Saint-Luc\n\tLiège\n\nINT. X - JOUR\n'
    )
    expect(doc.titlePage?.entries.map(({ key, value }) => [key, value])).toEqual([
      ['Title', 'Le Grenier'],
      ['Credit', 'écrit par'],
      ['Author', 'Léa'],
      ['Contact', 'IES Saint-Luc\nLiège']
    ])
    expect(doc.elements[0].type).toBe('scene_heading')
  })

  it('se termine à la première ligne vide', () => {
    const doc = parse('Title: A\n\nDraft date: pas dans la page de titre\n')
    expect(doc.titlePage?.entries).toHaveLength(1)
    expect(doc.elements[0].type).toBe('action')
  })

  it('n’existe pas si le fichier ne commence pas par une clé', () => {
    expect(parse('\nTitle: A\n').titlePage).toBeNull()
    expect(parse('Marie entre.\n').titlePage).toBeNull()
  })

  it('« FADE IN: » au début du fichier n’est pas une page de titre', () => {
    const doc = parse('FADE IN:\n\nINT. X - JOUR\n')
    expect(doc.titlePage).toBeNull()
  })

  it('fichier avec seulement une page de titre', () => {
    const doc = parse(readExample('page-de-titre-seule.fountain'))
    expect(doc.titlePage?.entries.map((entry) => entry.key)).toEqual([
      'Title',
      'Author',
      'Draft date'
    ])
    expect(doc.elements).toEqual([])
  })
})

describe('en-tête de scène', () => {
  it('reconnaît les préfixes, en majuscules ou minuscules, suivis d’un point ou d’une espace', () => {
    for (const line of [
      'INT. MAISON - JOUR',
      'EXT. PARC - NUIT',
      'EST. VILLE - AUBE',
      'INT./EXT. VOITURE - JOUR',
      'INT/EXT VOITURE - JOUR',
      'I/E VOITURE - JOUR',
      'int. salon - soir',
      'INT MAISON'
    ]) {
      expect(types(`\n${line}\n\nAction.\n`)[0], line).toBe('scene_heading')
    }
  })

  it('demande une ligne vide avant', () => {
    expect(types('Marie sort.\nINT. MAISON - JOUR\n')).toEqual(['action'])
  })

  it('ne reconnaît pas un mot qui commence seulement comme un préfixe', () => {
    expect(types('INTERIEUR MAISON\n')).toEqual(['action'])
    expect(types('Extérieur jour.\n')).toEqual(['action'])
  })

  it('est forcé par un point, mais pas par « .. »', () => {
    const doc = parse('.SOUVENIR\n\n...et le silence.\n')
    expect(doc.elements.map((element) => [element.type, element.forced])).toEqual([
      ['scene_heading', true],
      ['action', false]
    ])
    expect(doc.elements[0].text).toBe('SOUVENIR')
  })
})

describe('action', () => {
  it('est le cas par défaut et garde espaces et tabulations', () => {
    const doc = parse('\tMarie entre.   \n  Elle sourit.\n')
    expect(doc.elements).toHaveLength(1)
    expect(doc.elements[0].type).toBe('action')
    expect(doc.elements[0].text).toBe('\tMarie entre.   \n  Elle sourit.')
  })

  it('est forcée par « ! »', () => {
    const doc = parse('!MARIE CRIE.\nTout le monde sursaute.\n')
    expect(doc.elements[0].type).toBe('action')
    expect(doc.elements[0].forced).toBe(true)
    expect(doc.elements[0].text).toBe('MARIE CRIE.\nTout le monde sursaute.')
  })

  it('une ligne en majuscules suivie d’une ligne vide est une action', () => {
    expect(types('\nTOUT EST CALME.\n\nMarie dort.\n')).toEqual(['action', 'action'])
  })
})

describe('personnage, didascalie et dialogue', () => {
  it('reconnaît un bloc de dialogue complet', () => {
    expect(types('\nMARIE\n(doucement)\nBonjour.\n(un temps)\nÇa va ?\n')).toEqual([
      'character',
      'parenthetical',
      'dialogue',
      'parenthetical',
      'dialogue'
    ])
  })

  it('gère les lettres accentuées', () => {
    for (const name of ['ÉLODIE', 'FRANÇOIS', 'CHLOÉ', 'ÆLIS', 'ÑANDÚ']) {
      expect(types(`\n${name}\nSalut.\n`)[0], name).toBe('character')
    }
  })

  it('accepte des minuscules dans les extensions, pas dans le nom', () => {
    expect(types('\nMARIE (au téléphone)\nAllô ?\n')[0]).toBe('character')
    expect(types('\nMarie\nAllô ?\n')).toEqual(['action'])
  })

  it('demande une ligne vide avant et une ligne non vide après', () => {
    expect(types('Elle crie.\nMARIE\nAu secours !\n')).toEqual(['action'])
    expect(types('\nMARIE\n\nAu secours !\n')).toEqual(['action', 'action'])
  })

  it('demande au moins une lettre', () => {
    expect(types('\n123\nSalut\n')).toEqual(['action'])
    expect(types('\nR2D2\nBip.\n')[0]).toBe('character')
  })

  it('est forcé par « @ » et reconnaît le dialogue simultané « ^ »', () => {
    const doc = parse('\n@McCLANE\nYippee.\n\nMARIE ^\nNon !\n')
    expect(doc.elements[0].forced).toBe(true)
    expect(doc.elements[0].character?.name).toBe('McCLANE')
    expect(doc.elements[2].character?.dual).toBe(true)
  })

  it('une ligne de deux espaces garde une ligne vide dans le dialogue', () => {
    const doc = parse('\nMARIE\nPremière ligne.\n  \nAprès le silence.\n')
    expect(doc.elements.map((element) => element.type)).toEqual(['character', 'dialogue'])
    expect(doc.elements[1].text).toBe('Première ligne.\n\nAprès le silence.')
  })

  it('une ligne de deux espaces garde une ligne vide dans l’action (norme Fountain)', () => {
    const doc = parse('Elle attend.\n  \nRien ne vient.\n\nINT. X - JOUR\n')
    expect(doc.elements.map((element) => element.type)).toEqual(['action', 'scene_heading'])
    expect(doc.elements[0].text).toBe('Elle attend.\n\nRien ne vient.')
    expect(doc.elements[0].position).toMatchObject({ startLine: 1, endLine: 3 })
  })

  it('une ligne de deux espaces en fin d’action ne la prolonge pas', () => {
    expect(types('Elle attend.\n  \n\nINT. X - JOUR\n')).toEqual(['action', 'scene_heading'])
    expect(parse('Elle attend.\n  \n\nINT. X - JOUR\n').elements[0].text).toBe('Elle attend.')
  })

  it('le dialogue s’arrête à la ligne vide', () => {
    expect(types('\nMARIE\nBonjour.\n\nElle sort.\n')).toEqual(['character', 'dialogue', 'action'])
  })
})

describe('paroles, transition, texte centré, saut de page', () => {
  it('paroles avec « ~ », dans ou hors d’un dialogue', () => {
    expect(types('~La la la\n')).toEqual(['lyrics'])
    expect(types('\nMARIE\n~Il était un petit navire\n')).toEqual(['character', 'lyrics'])
  })

  it('transition en majuscules finissant par TO:, entourée de lignes vides', () => {
    expect(types('Fin.\n\nCUT TO:\n\nINT. X - JOUR\n')).toEqual([
      'action',
      'transition',
      'scene_heading'
    ])
  })

  it('une transition non précédée d’une ligne vide est une action', () => {
    expect(types('Marie sort.\nCUT TO:\n')).toEqual(['action'])
  })

  it('les transitions françaises ne sont reconnues que forcées par « > »', () => {
    expect(types('\nFONDU AU NOIR.\n\n')).toEqual(['action'])
    const doc = parse('>FONDU AU NOIR.\n')
    expect(doc.elements[0]).toMatchObject({
      type: 'transition',
      forced: true,
      text: 'FONDU AU NOIR.'
    })
  })

  it('texte centré entre « > » et « < »', () => {
    const doc = parse('> FIN <\n')
    expect(doc.elements[0]).toMatchObject({ type: 'centered', text: 'FIN' })
  })

  it('saut de page : trois « = » ou plus', () => {
    expect(types('===\n')).toEqual(['page_break'])
    expect(types('======\n')).toEqual(['page_break'])
    expect(types('==\n')).toEqual(['synopsis'])
  })
})

describe('sections et synopsis', () => {
  it('section avec son niveau', () => {
    const doc = parse('# Acte un\n\n## Séquence\n\n### Scène\n')
    expect(doc.elements.map((element) => [element.section?.level, element.text])).toEqual([
      [1, 'Acte un'],
      [2, 'Séquence'],
      [3, 'Scène']
    ])
  })

  it('synopsis avec « = »', () => {
    expect(parse('= Marie trouve la clé.\n').elements[0]).toMatchObject({
      type: 'synopsis',
      text: 'Marie trouve la clé.'
    })
  })
})

describe('notes et texte mis de côté', () => {
  it('note sur une ligne seule', () => {
    expect(parse('[[À vérifier]]\n').elements[0]).toMatchObject({
      type: 'note',
      text: 'À vérifier'
    })
  })

  it('note sur plusieurs lignes', () => {
    const doc = parse('[[Première ligne\nseconde ligne]]\n')
    expect(doc.elements).toHaveLength(1)
    expect(doc.elements[0]).toMatchObject({ type: 'note', text: 'Première ligne\nseconde ligne' })
    expect(doc.elements[0].position).toMatchObject({ startLine: 1, endLine: 2 })
  })

  it('note au milieu d’une ligne : repérée et conservée dans l’élément', () => {
    const text = 'Marie entre. [[plan large]] Elle sourit.\n'
    const element = parse(text).elements[0]
    expect(element.type).toBe('action')
    expect(element.text).toBe('Marie entre. [[plan large]] Elle sourit.')
    expect(element.notes).toEqual([{ start: 13, end: 27, text: 'plan large' }])
  })

  it('une note ne traverse pas une vraie ligne vide, mais traverse une ligne de deux espaces', () => {
    expect(parse('[[début\n\nfin]]\n').elements[0].notes).toEqual([])
    expect(parse('[[début\n  \nfin]]\n').elements[0].type).toBe('note')
  })

  it('une note non refermée reste du texte ordinaire', () => {
    expect(types('Texte [[ pas refermé\n')).toEqual(['action'])
  })

  it('texte mis de côté sur plusieurs lignes, même avec des lignes vides', () => {
    const doc = parse('/* Ancienne scène\n\nMARIE\nBonjour.\n*/\n\nMarie entre.\n')
    expect(doc.elements.map((element) => element.type)).toEqual(['boneyard', 'action'])
    expect(doc.elements[0].text).toBe(' Ancienne scène\n\nMARIE\nBonjour.\n')
  })

  it('un texte mis de côté non refermé reste du texte ordinaire', () => {
    expect(types('/* oublié\n\nMARIE\nBonjour.\n')).toEqual(['action', 'character', 'dialogue'])
  })

  it('une ligne de note seule ne coupe pas un bloc de dialogue', () => {
    expect(types('\nMARIE\n[[à revoir]]\nBonjour.\n')).toEqual(['character', 'note', 'dialogue'])
  })

  it('le fichier piège est classé comme attendu', () => {
    const doc = parse(readExample('pieges.fountain'))
    expect(doc.elements.map((element) => element.type)).toEqual([
      'action',
      'action',
      'scene_heading',
      'action',
      'action',
      'scene_heading',
      'action',
      'character',
      'dialogue',
      'note',
      'character',
      'dialogue',
      'action',
      'action',
      'scene_heading',
      'action',
      'action',
      'character',
      'dialogue'
    ])
  })
})
