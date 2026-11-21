import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  addRecentProject,
  loadPreferences,
  removeRecentProject,
  savePreferences,
  type RecentProject
} from './preferences'
import { makeTempDir, removeDir } from './project/testHelpers'

const entry = (n: number): RecentProject => ({
  filePath: `/projets/Film_${n}/Film_${n}.neoscenar`,
  title: `Film ${n}`,
  lastOpenedAt: '2026-11-17T15:40:12.000Z'
})

describe('projets récents', () => {
  it('place le dernier projet ouvert en tête, sans doublon', () => {
    const list = addRecentProject([entry(1), entry(2)], entry(2))
    expect(list.map((item) => item.title)).toEqual(['Film 2', 'Film 1'])
  })

  it('garde au maximum 10 projets', () => {
    let list: RecentProject[] = []
    for (let n = 1; n <= 12; n++) list = addRecentProject(list, entry(n))
    expect(list).toHaveLength(10)
    expect(list[0].title).toBe('Film 12')
  })

  it('retire un projet de la liste', () => {
    expect(removeRecentProject([entry(1), entry(2)], entry(1).filePath)).toEqual([entry(2)])
  })
})

describe('fichier des préférences', () => {
  let folder: string
  beforeEach(async () => {
    folder = await makeTempDir()
  })
  afterEach(() => removeDir(folder))

  it('relit ce qui a été enregistré', async () => {
    const prefs = {
      formatVersion: 1 as const,
      lastLocation: '/projets',
      recentProjects: [entry(1)],
      cardZoom: 1.3,
      showThumbnails: true,
      blenderPath: '/Applications/Blender.app',
      showSceneNavigator: false,
      showElementBar: false,
      scriptZoom: 1.25,
      highlightActiveLine: false,
      continuedMarks: true,
      theme: 'matrix' as const,
      scriptColors: { matrix: { note: '#ff00ff' } },
      welcomeImage: 'image-accueil-1700000000000.png',
      creditsOpen: { p1: ['equipe'] }
    }
    await savePreferences(folder, prefs)
    expect(await loadPreferences(folder)).toEqual(prefs)
  })

  it('couleurs du scénario : vides si absentes, nettoyées si abîmées', async () => {
    await writeFile(join(folder, 'preferences.json'), JSON.stringify({ recentProjects: [] }))
    expect((await loadPreferences(folder)).scriptColors).toEqual({})
    await writeFile(
      join(folder, 'preferences.json'),
      JSON.stringify({ scriptColors: { matrix: { note: 'rouge', dialogue: '#00ff00' }, x: {} } })
    )
    expect((await loadPreferences(folder)).scriptColors).toEqual({
      matrix: { dialogue: '#00ff00' }
    })
  })

  it('image d’accueil : absente = image livrée ; un nom suspect est ignoré', async () => {
    await writeFile(join(folder, 'preferences.json'), JSON.stringify({ recentProjects: [] }))
    expect((await loadPreferences(folder)).welcomeImage).toBeNull()
    await writeFile(
      join(folder, 'preferences.json'),
      JSON.stringify({ welcomeImage: '../../secret.png' })
    )
    expect((await loadPreferences(folder)).welcomeImage).toBeNull()
  })

  it('démarre avec des préférences vides si le fichier est absent ou abîmé', async () => {
    expect((await loadPreferences(folder)).recentProjects).toEqual([])
    await writeFile(join(folder, 'preferences.json'), 'abîmé')
    expect((await loadPreferences(folder)).recentProjects).toEqual([])
  })

  it('zoom absent ou hors limites : valeur ramenée dans les limites', async () => {
    await writeFile(join(folder, 'preferences.json'), JSON.stringify({ recentProjects: [] }))
    expect((await loadPreferences(folder)).cardZoom).toBe(1)
    await writeFile(join(folder, 'preferences.json'), JSON.stringify({ cardZoom: 12 }))
    expect((await loadPreferences(folder)).cardZoom).toBe(1.6)
  })

  it('mode « avec vignettes » désactivé par défaut', async () => {
    await writeFile(join(folder, 'preferences.json'), JSON.stringify({ recentProjects: [] }))
    expect((await loadPreferences(folder)).showThumbnails).toBe(false)
  })

  it('zoom du scénario : 100 % par défaut, palier le plus proche si la valeur est abîmée', async () => {
    await writeFile(join(folder, 'preferences.json'), JSON.stringify({ recentProjects: [] }))
    expect((await loadPreferences(folder)).scriptZoom).toBe(1)
    await writeFile(join(folder, 'preferences.json'), JSON.stringify({ scriptZoom: 'énorme' }))
    expect((await loadPreferences(folder)).scriptZoom).toBe(1)
    await writeFile(join(folder, 'preferences.json'), JSON.stringify({ scriptZoom: 1.6 }))
    expect((await loadPreferences(folder)).scriptZoom).toBe(1.5)
  })

  it('thème : « Par défaut » si absent ou abîmé, anciens réglages migrés', async () => {
    await writeFile(join(folder, 'preferences.json'), JSON.stringify({ recentProjects: [] }))
    expect((await loadPreferences(folder)).theme).toBe('defaut')
    await writeFile(join(folder, 'preferences.json'), JSON.stringify({ theme: 'fluo' }))
    expect((await loadPreferences(folder)).theme).toBe('defaut')
    for (const old of ['system', 'light', 'dark']) {
      await writeFile(join(folder, 'preferences.json'), JSON.stringify({ theme: old }))
      expect((await loadPreferences(folder)).theme).toBe('defaut')
    }
    await writeFile(join(folder, 'preferences.json'), JSON.stringify({ theme: 'aqua' }))
    expect((await loadPreferences(folder)).theme).toBe('aqua')
  })

  it('navigateur de scènes et barre des éléments affichés par défaut', async () => {
    await writeFile(join(folder, 'preferences.json'), JSON.stringify({ recentProjects: [] }))
    expect((await loadPreferences(folder)).showSceneNavigator).toBe(true)
    expect((await loadPreferences(folder)).showElementBar).toBe(true)
  })

  it('emplacement de Blender absent : recherche automatique (null)', async () => {
    await writeFile(join(folder, 'preferences.json'), JSON.stringify({ recentProjects: [] }))
    expect((await loadPreferences(folder)).blenderPath).toBeNull()
  })
})
