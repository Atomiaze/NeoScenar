// Essai automatique de l'étape 10bA sur « Le Dernier Bus » : vrai modèle Saint Luc, vrai scénario,
// fiches Personnages avec et sans interprète, et generique.json sur le disque.

import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { assembleCredits, type CreditsCharacter } from '../../shared/credits/assembleCredits'
import { defaultCreditsData } from '../../shared/credits/creditsData'
import { creditsToText } from '../../shared/credits/creditsText'
import type { CreditsData, CreditsTemplate } from '../../shared/credits/types'
import type { ProjectType } from '../../shared/projectTypes'
import { makeTempDir, removeDir } from '../project/testHelpers'
import { readCreditsFile, writeCreditsFile, writeCreditsText } from './creditsFile'
import { loadCreditsTemplate, parseCreditsTemplate } from './creditsTemplate'

const ROOT = join(__dirname, '..', '..', '..')
const TEMPLATE_PATH = join(ROOT, 'resources', 'modeles', 'generique-saint-luc.json')
const SCRIPT_PATH = join(
  ROOT,
  'packages',
  'fountain',
  'tests',
  'exemples',
  'le-dernier-bus.fountain'
)
const TODAY = new Date(2026, 10, 18)

// Ordre d'apparition dans le scénario : MADAME ROCHE, INÈS, ÉLIOTT, LA MÈRE, LE CAISSIER.
const CHARACTERS: CreditsCharacter[] = [
  { nom: 'MADAME ROCHE', interprete: 'Tom Lambert', role: '' },
  { nom: 'INÈS', interprete: 'Léa Dupont', role: 'principal' },
  { nom: 'ÉLIOTT', interprete: 'Hugo Martin', role: 'principal' },
  { nom: 'LA MÈRE', interprete: '  ', role: 'secondaire' },
  { nom: 'LE CAISSIER', interprete: 'Sam Petit', role: 'figurant' },
  { nom: 'MARC', interprete: 'Noé Durand', role: 'principal' }
]

let template: CreditsTemplate
let script: string

beforeAll(async () => {
  template = await loadCreditsTemplate(TEMPLATE_PATH)
  script = await readFile(SCRIPT_PATH, 'utf8')
})

function filledData(): CreditsData {
  const data = defaultCreditsData()
  data.rubriques = [
    { id: 'realisation.realisation', intitule: null, noms: ['Nora Bensaïd'] },
    { id: 'production.production', intitule: null, noms: ['IES Saint Luc', 'Léa Dupont'] },
    { id: 'image.chef-op', intitule: 'Image', noms: ['Zoé Martin', ''] },
    { id: 'image.cadre', intitule: null, noms: ['', '  '] },
    { id: 'distribution.figuration', intitule: null, noms: ['Ana Roy'] },
    { id: 'animation.storyboard', intitule: null, noms: ['Eva Klein'] },
    { id: 'perso-1', bloc: 'image', intitule: 'Lumière d’appoint', noms: ['Tom', 'Max'] }
  ]
  data.musiques = [
    { titre: 'La Mer', interprete: 'Charles Trenet', auteurs: '', autorisation: 'EMI' },
    { titre: '', interprete: '', auteurs: '', autorisation: '' }
  ]
  data.mentions.tourneA = 'Liège'
  data.mentions.copyrightTitulaire = 'IES Saint Luc Liège'
  data.cartonsDebut = ['titre', 'presente', 'acteursPrincipaux', 'logos']
  return data
}

function assemble(data: CreditsData, projectType: ProjectType = 'film') {
  return assembleCredits({
    template,
    data,
    characters: CHARACTERS,
    script,
    projectType,
    today: TODAY
  })
}

function rubricIds(data: CreditsData, projectType: ProjectType = 'film'): string[] {
  return assemble(data, projectType).blocs.flatMap((block) =>
    block.sections.flatMap((section) => (section.kind === 'rubrique' ? [section.id] : []))
  )
}

function cast(data: CreditsData): string[] {
  const section = assemble(data).blocs[0].sections[0]
  if (section.kind !== 'rubrique') throw new Error('distribution absente')
  return section.entries.map((entry) => `${entry.personnage} = ${entry.nom}`)
}

describe('modèle de générique Saint Luc', () => {
  it('a les 12 blocs dans l’ordre conventionnel', () => {
    expect(template.blocs.map((block) => block.id)).toEqual([
      'distribution',
      'realisation',
      'production',
      'image',
      'son',
      'decors',
      'animation',
      'postproduction',
      'musique',
      'documentaire',
      'remerciements',
      'mentions'
    ])
  })

  it('refuse un modèle abîmé en nommant le champ', () => {
    expect(() => parseCreditsTemplate({ formatVersion: 1, id: 'x' }, 'modele.json')).toThrow(
      /textes/
    )
  })
})

describe('acteurs de « Le Dernier Bus »', () => {
  it('par importance : principaux, puis secondaires et sans rôle, à rang égal par apparition', () => {
    expect(cast(filledData())).toEqual([
      'Inès = Léa Dupont',
      'Éliott = Hugo Martin',
      'Marc = Noé Durand',
      'Madame Roche = Tom Lambert'
    ])
  })

  it('par ordre d’apparition (première réplique)', () => {
    const data = filledData()
    data.options.ordreActeurs = 'apparition'
    expect(cast(data)).toEqual([
      'Madame Roche = Tom Lambert',
      'Inès = Léa Dupont',
      'Éliott = Hugo Martin',
      'Marc = Noé Durand'
    ])
  })

  it('reprend le nom corrigé par l’élève', () => {
    const data = filledData()
    data.acteurs.nomsAffiches = { INÈS: 'Inès M.' }
    expect(cast(data)[0]).toBe('Inès M. = Léa Dupont')
  })

  it('regroupe les figurants sous « Figuration », avant les noms tapés', () => {
    const figuration = assemble(filledData()).blocs[0].sections.find(
      (section) => section.kind === 'rubrique' && section.id === 'distribution.figuration'
    )
    expect(figuration).toMatchObject({ entries: [{ nom: 'Sam Petit' }, { nom: 'Ana Roy' }] })
  })

  it('garde au générique un interprète sans réplique (MARC), après ceux qui parlent', () => {
    const data = filledData()
    data.options.ordreActeurs = 'apparition'
    expect(cast(data).at(-1)).toBe('Marc = Noé Durand')
  })

  it('signale les personnages sans interprète', () => {
    expect(assemble(filledData()).avertissements).toEqual([
      { personnage: 'LA MÈRE', raison: 'sans-interprete' }
    ])
  })
})

describe('rubriques', () => {
  it('n’exporte pas les rubriques vides ni les blocs facultatifs masqués', () => {
    expect(rubricIds(filledData())).toEqual([
      'distribution.acteurs',
      'distribution.figuration',
      'realisation.realisation',
      'production.production',
      'image.chef-op',
      'perso-1'
    ])
  })

  it('affiche le bloc Animation pour un projet d’animation ou si l’élève le demande', () => {
    expect(rubricIds(filledData(), 'mixte')).toContain('animation.storyboard')
    const data = filledData()
    data.options.blocsAffiches = ['animation']
    expect(rubricIds(data)).toContain('animation.storyboard')
  })

  it('n’exporte rien pour un générique vide sans acteurs', () => {
    const credits = assembleCredits({
      template,
      data: {
        ...defaultCreditsData(),
        mentions: { ...defaultCreditsData().mentions, fiction: false, ligneEcole: '' }
      },
      characters: [],
      script,
      projectType: 'film',
      today: TODAY
    })
    expect(credits.blocs).toEqual([])
    expect(creditsToText(credits, 'dessus')).toBe('')
  })
})

describe('export texte de « Le Dernier Bus »', () => {
  it('présentation « intitulé au-dessus des noms »', () => {
    const text = creditsToText(assemble(filledData()), 'dessus')
    expect(text).toBe(
      [
        'IES Saint Luc et Léa Dupont présentent',
        '',
        'Léa Dupont',
        'Hugo Martin',
        'Noé Durand',
        '',
        'LE DERNIER BUS',
        '',
        '',
        '',
        'DISTRIBUTION',
        '',
        'Inès',
        'Léa Dupont',
        '',
        'Éliott',
        'Hugo Martin',
        '',
        'Marc',
        'Noé Durand',
        '',
        'Madame Roche',
        'Tom Lambert',
        '',
        'FIGURATION',
        'Sam Petit',
        'Ana Roy',
        '',
        '',
        'RÉALISATION',
        'Nora Bensaïd',
        '',
        '',
        'PRODUCTION',
        'IES Saint Luc',
        'Léa Dupont',
        '',
        '',
        'IMAGE',
        'Zoé Martin',
        '',
        'LUMIÈRE D’APPOINT',
        'Tom',
        'Max',
        '',
        '',
        'La Mer',
        'Interprété par Charles Trenet',
        'Avec l’aimable autorisation de EMI',
        '',
        '',
        'Tourné à Liège',
        '',
        template.textes.fiction,
        '',
        'Réalisé à l’IES Saint Luc Liège — année scolaire 2026-2027',
        '',
        '© 2026 IES Saint Luc Liège',
        ''
      ].join('\n')
    )
  })

  it('présentation tabulée : intitulé seulement sur la première ligne', () => {
    const text = creditsToText(assemble(filledData()), 'tabulation')
    expect(text).toContain(
      'DISTRIBUTION\n\nInès\tLéa Dupont\nÉliott\tHugo Martin\nMarc\tNoé Durand\nMadame Roche\tTom Lambert\n'
    )
    expect(text).toContain('PRODUCTION\tIES Saint Luc\n\tLéa Dupont\n')
    expect(text).toContain('La Mer\nInterprété par\tCharles Trenet\n')
  })

  it('carton « présente » au singulier pour un seul nom en production', () => {
    const data = filledData()
    data.rubriques[1].noms = ['IES Saint Luc']
    expect(assemble(data).cartons).toContainEqual({
      kind: 'presente',
      lignes: ['IES Saint Luc présente']
    })
  })

  it('garde l’intitulé de la distribution choisi par l’élève', () => {
    const data = filledData()
    data.rubriques.push({ id: 'distribution.acteurs', intitule: 'Avec', noms: [] })
    expect(creditsToText(assemble(data), 'dessus')).toContain('\nAVEC\n\nInès\n')
  })
})

describe('generique.json et generique.txt sur le disque', () => {
  let folder: string
  beforeEach(async () => {
    folder = await makeTempDir()
  })
  afterEach(() => removeDir(folder))

  it('donne un générique vide si le fichier n’existe pas encore', async () => {
    expect((await readCreditsFile(folder)).data).toEqual(defaultCreditsData())
  })

  it('une clé ajoutée à la main survit à une réécriture', async () => {
    await writeCreditsFile(folder, filledData())
    const path = join(folder, 'generique.json')
    const edited = JSON.parse(await readFile(path, 'utf8'))
    edited.noteDuProf = 'Vérifier les droits de La Mer'
    edited.options.police = 'Inter'
    await writeFile(path, JSON.stringify(edited), 'utf8')

    const { data } = await readCreditsFile(folder)
    data.options.ordreActeurs = 'apparition'
    await writeCreditsFile(folder, data)

    const saved = JSON.parse(await readFile(path, 'utf8'))
    expect(saved.noteDuProf).toBe('Vérifier les droits de La Mer')
    expect(saved.options).toMatchObject({ police: 'Inter', ordreActeurs: 'apparition' })
    expect((await readCreditsFile(folder)).data).toEqual(data)
  })

  it('refuse un fichier d’une version plus récente', async () => {
    await writeFile(join(folder, 'generique.json'), '{"version": 2}', 'utf8')
    await expect(readCreditsFile(folder)).rejects.toThrow(/plus récente/)
  })

  it('écrit generique.txt dans 08_Graphisme/Generique/, et le remplace', async () => {
    await writeCreditsText(folder, 'ancien\n')
    const path = await writeCreditsText(folder, 'Léa Dupont\n')
    expect(path).toBe(join(folder, '08_Graphisme', 'Generique', 'generique.txt'))
    expect(await readFile(path, 'utf8')).toBe('Léa Dupont\n')
  })
})
