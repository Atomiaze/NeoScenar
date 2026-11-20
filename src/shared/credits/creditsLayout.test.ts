import { describe, expect, it } from 'vitest'
import {
  advisedDuration,
  cardFileName,
  isCreditsPngName,
  layoutCard,
  layoutRoll,
  rollFileName,
  splitRoll,
  wrapText,
  type LayoutItem,
  type LayoutTools
} from './creditsLayout'
import type { AssembledCredits } from './types'

// Police fictive : chaque caractère fait une demi-fois le corps (un peu plus en gras).
const tools: LayoutTools = {
  measure: (text, weight, size) => text.length * size * (weight === 'bold' ? 0.55 : 0.5),
  logoSize: (path) =>
    path.endsWith('large.png') ? { width: 400, height: 100 } : { width: 100, height: 100 }
}

const credits: AssembledCredits = {
  titre: 'Film',
  cartons: [],
  avertissements: [],
  blocs: [
    {
      id: 'distribution',
      sections: [
        {
          kind: 'rubrique',
          id: 'distribution.acteurs',
          intitule: 'Distribution',
          entries: [
            { personnage: 'Marie', nom: 'Léa Dupont' },
            { personnage: 'Tom', nom: 'Hugo Martin' }
          ]
        }
      ]
    },
    {
      id: 'image',
      sections: [
        {
          kind: 'rubrique',
          id: 'image.chef-op',
          intitule: 'Image',
          entries: [{ nom: 'Zoé' }, { nom: 'Yann' }]
        }
      ]
    },
    {
      id: 'mentions',
      sections: [
        { kind: 'mention', texte: 'Ceci est une fiction.' },
        { kind: 'logos', chemins: ['generique/logos/a.png', 'generique/logos/large.png'] }
      ]
    }
  ]
}

const texts = (items: LayoutItem[]) =>
  items.filter((item): item is Extract<LayoutItem, { kind: 'text' }> => item.kind === 'text')

describe('layoutRoll', () => {
  it('met la distribution en deux colonnes et l’intitulé en capitales centrées', () => {
    const layout = layoutRoll(
      credits,
      { width: 1920, taille: 'moyenne', disposition: 'centree' },
      tools
    )
    const items = texts(layout.items)
    expect(items[0]).toMatchObject({
      text: 'DISTRIBUTION',
      align: 'center',
      weight: 'bold',
      x: 960
    })
    expect(items[1]).toMatchObject({ text: 'Marie', align: 'right' })
    expect(items[2]).toMatchObject({ text: 'Léa Dupont', align: 'left' })
    expect(items[1]!.y).toBe(items[2]!.y)
    expect(items[1]!.x).toBeLessThan(960)
    expect(items[2]!.x).toBeGreaterThan(960)
  })

  it('centre intitulé et noms en disposition centrée', () => {
    const layout = layoutRoll(
      credits,
      { width: 1920, taille: 'moyenne', disposition: 'centree' },
      tools
    )
    const image = texts(layout.items).filter((item) => ['IMAGE', 'Zoé', 'Yann'].includes(item.text))
    expect(image.map((item) => item.align)).toEqual(['center', 'center', 'center'])
    expect(image[0]!.y).toBeLessThan(image[1]!.y)
  })

  it('met l’intitulé à gauche du premier nom en deux colonnes', () => {
    const layout = layoutRoll(
      credits,
      { width: 1920, taille: 'moyenne', disposition: 'deux-colonnes' },
      tools
    )
    const items = texts(layout.items)
    const heading = items.find((item) => item.text === 'IMAGE')!
    const first = items.find((item) => item.text === 'Zoé')!
    const second = items.find((item) => item.text === 'Yann')!
    expect(heading).toMatchObject({ align: 'right' })
    expect(first).toMatchObject({ align: 'left', y: heading.y })
    expect(second.y).toBeGreaterThan(first.y)
  })

  it('est proportionnelle à la largeur du projet', () => {
    const hd = layoutRoll(
      credits,
      { width: 1920, taille: 'moyenne', disposition: 'deux-colonnes' },
      tools
    )
    const uhd = layoutRoll(
      credits,
      { width: 3840, taille: 'moyenne', disposition: 'deux-colonnes' },
      tools
    )
    expect(uhd.height).toBeCloseTo(hd.height * 2, -1)
    expect(uhd.items.length).toBe(hd.items.length)
    hd.items.forEach((item, index) => {
      const big = uhd.items[index]!
      expect(big.x).toBeCloseTo(item.x * 2, 5)
      expect(big.y).toBeCloseTo(item.y * 2, 5)
    })
  })

  it('grandit avec la taille du texte', () => {
    const height = (taille: 'petite' | 'moyenne' | 'grande') =>
      layoutRoll(credits, { width: 1920, taille, disposition: 'centree' }, tools).height
    expect(height('petite')).toBeLessThan(height('moyenne'))
    expect(height('moyenne')).toBeLessThan(height('grande'))
  })

  it('commence en haut et finit en bas de l’image, sans marge d’écran', () => {
    const layout = layoutRoll(
      credits,
      { width: 1920, taille: 'moyenne', disposition: 'centree' },
      tools
    )
    const first = texts(layout.items)[0]!
    expect(first.y).toBeLessThan(first.size * 2)
    const logos = layout.items.filter((item) => item.kind === 'logo')
    const bottom = Math.max(
      ...logos.map((item) => item.y + (item.kind === 'logo' ? item.height : 0))
    )
    expect(layout.height).toBe(Math.ceil(bottom))
  })

  it('donne aux logos une hauteur commune et garde leurs proportions', () => {
    const layout = layoutRoll(
      credits,
      { width: 1920, taille: 'moyenne', disposition: 'centree' },
      tools
    )
    const logos = layout.items.filter((item) => item.kind === 'logo')
    expect(logos).toHaveLength(2)
    expect(logos[0]!.height).toBe(logos[1]!.height)
    expect(logos[1]!.width).toBeCloseTo(logos[1]!.height * 4)
    expect(logos[0]!.y).toBe(logos[1]!.y)
  })

  it('passe à la rangée suivante quand les logos ne tiennent plus', () => {
    const many = Array.from({ length: 20 }, (_, index) => `generique/logos/${index}.png`)
    const layout = layoutRoll(
      { ...credits, blocs: [{ id: 'mentions', sections: [{ kind: 'logos', chemins: many }] }] },
      { width: 1920, taille: 'moyenne', disposition: 'centree' },
      tools
    )
    const rows = new Set(layout.items.map((item) => item.y))
    expect(rows.size).toBeGreaterThan(1)
    for (const item of layout.items) {
      expect(item.x).toBeGreaterThanOrEqual(0)
      expect(item.x + (item.kind === 'logo' ? item.width : 0)).toBeLessThanOrEqual(1920)
    }
  })

  it('ignore un logo illisible', () => {
    const layout = layoutRoll(
      {
        ...credits,
        blocs: [{ id: 'm', sections: [{ kind: 'logos', chemins: ['a.png', 'x.png'] }] }]
      },
      { width: 1920, taille: 'moyenne', disposition: 'centree' },
      { ...tools, logoSize: (path) => (path === 'x.png' ? null : { width: 10, height: 10 }) }
    )
    expect(layout.items).toHaveLength(1)
  })

  it('propose des coupures entre les sections', () => {
    const layout = layoutRoll(
      credits,
      { width: 1920, taille: 'moyenne', disposition: 'centree' },
      tools
    )
    expect(layout.cuts).toHaveLength(3)
    expect(layout.lineCuts.length).toBeGreaterThan(5)
    for (const cut of layout.cuts)
      for (const item of texts(layout.items))
        expect(item.y < cut - item.size * 0.2 || item.y - item.size > cut).toBe(true)
  })
})

describe('wrapText', () => {
  it('coupe entre les mots', () => {
    expect(wrapText('un deux trois quatre', 'normal', 10, 50, tools)).toEqual([
      'un deux',
      'trois',
      'quatre'
    ])
  })
  it('garde un mot trop long entier', () => {
    expect(wrapText('anticonstitutionnellement', 'normal', 10, 20, tools)).toEqual([
      'anticonstitutionnellement'
    ])
  })
})

describe('splitRoll', () => {
  it('garde une seule partie sous la limite', () => {
    expect(splitRoll(16384, [100])).toEqual([{ top: 0, height: 16384 }])
  })
  it('coupe le plus bas possible entre deux sections', () => {
    expect(splitRoll(30000, [5000, 16000, 17000, 25000])).toEqual([
      { top: 0, height: 16000 },
      { top: 16000, height: 14000 }
    ])
  })
  it('coupe une section trop haute entre deux lignes', () => {
    expect(splitRoll(20000, [100], [15000, 16000, 17000])).toEqual([
      { top: 0, height: 16000 },
      { top: 16000, height: 4000 }
    ])
  })
  it('coupe net une section trop haute sans ligne', () => {
    expect(splitRoll(20000, [])).toEqual([
      { top: 0, height: 16384 },
      { top: 16384, height: 3616 }
    ])
  })
})

describe('advisedDuration', () => {
  it('compte 8 s par hauteur d’écran, entrée et sortie comprises', () => {
    expect(advisedDuration(1080, 1080)).toBe(16)
    expect(advisedDuration(4320, 1080)).toBe(40)
  })
})

describe('layoutCard', () => {
  it('centre le titre dans l’image, en gras et plus grand', () => {
    const card = layoutCard(
      { kind: 'titre', lignes: ['Film'] },
      { width: 1920, height: 1080, taille: 'moyenne' },
      tools
    )
    const presents = layoutCard(
      { kind: 'presente', lignes: ['Léa présente'] },
      { width: 1920, height: 1080, taille: 'moyenne' },
      tools
    )
    const [title] = texts(card.items)
    const [line] = texts(presents.items)
    expect(card).toMatchObject({ width: 1920, height: 1080 })
    expect(title).toMatchObject({ align: 'center', x: 960, weight: 'bold' })
    expect(title!.size).toBeGreaterThan(line!.size)
    expect(Math.abs(title!.y - title!.size * 0.35 - 540)).toBeLessThan(title!.size)
  })

  it('centre les logos verticalement', () => {
    const card = layoutCard(
      { kind: 'logos', chemins: ['a.png', 'b.png'] },
      { width: 1920, height: 1080, taille: 'moyenne' },
      tools
    )
    const logos = card.items.filter((item) => item.kind === 'logo')
    expect(logos).toHaveLength(2)
    const logo = logos[0]!
    expect(logo.kind === 'logo' && logo.y + logo.height / 2).toBeCloseTo(540)
  })
})

describe('noms des fichiers', () => {
  it('numérote les cartons et les parties du déroulant', () => {
    expect(cardFileName('unFilmDe', 1)).toBe('debut_02_un_film_de.png')
    expect(rollFileName(0, 1)).toBe('generique_fin.png')
    expect(rollFileName(1, 3)).toBe('generique_fin_2.png')
  })
  it('reconnaît seulement les PNG du générique', () => {
    expect(isCreditsPngName('generique_fin_3.png')).toBe(true)
    expect(isCreditsPngName('debut_01_logos.png')).toBe(true)
    expect(isCreditsPngName('fond.png')).toBe(false)
    expect(isCreditsPngName('../generique_fin.png')).toBe(false)
    // Noms proches choisis par un élève : jamais supprimés.
    for (const name of [
      'generique_fin_v2.png',
      'generique_fin_0.png',
      'generique_fin.PNG',
      'Generique_fin.png',
      'generique_fin_final.png',
      'debut_ma_version.png',
      'debut_01_titre_v2.png',
      'debut_1_titre.png',
      'debut_00_titre.png',
      'debut_01_titre.jpg'
    ])
      expect(isCreditsPngName(name), name).toBe(false)
  })
})
