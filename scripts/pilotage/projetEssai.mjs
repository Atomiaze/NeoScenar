// Projet NeoScenar d'essai, créé dans un dossier temporaire (jamais dans les projets de l'utilisateur).

import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dirname, '..', '..')

function shot(id, thumbnail = null) {
  return {
    id,
    number: 10,
    letter: '',
    name: '',
    color: null,
    thumbnail,
    thumbnailSource: null,
    thumbnailCrop: null,
    duration: null,
    shotSize: null,
    cameraMovement: null,
    cameraAngle: null,
    sound: '',
    music: '',
    description: ''
  }
}

/**
 * Projet « Film essai » : trois scènes S_0010, S_0020 (avec une vignette), S_0030, reliées au
 * scénario. Renvoie le chemin du fichier .neoscenar.
 */
export function createTestProject(directory, { locked = false } = {}) {
  const film = join(directory, 'Film_essai')
  const data = join(film, 'neoscenar')
  mkdirSync(join(data, 'storyboard', 'vignettes'), { recursive: true })
  mkdirSync(join(data, 'sauvegardes'), { recursive: true })
  copyFileSync(
    join(ROOT, 'build', 'icon.png'),
    join(data, 'storyboard', 'vignettes', 'S20-P10.png')
  )
  const projectFile = join(film, 'Film_essai.neoscenar')
  writeFileSync(
    projectFile,
    JSON.stringify({ type: 'neoscenar-projet', formatVersion: 1, dataFolder: 'neoscenar' })
  )
  writeFileSync(
    join(data, 'projet.json'),
    JSON.stringify({
      formatVersion: 1,
      id: '11111111-1111-4111-8111-111111111111',
      title: 'Film essai',
      folderName: 'Film_essai',
      projectType: 'film',
      template: 'saint-luc',
      createdAt: '2026-11-18T10:00:00.000Z',
      modifiedAt: '2026-11-18T10:00:00.000Z',
      logline: '',
      synopsis: '',
      settings: { fps: 25, resolution: { width: 1920, height: 1080 } },
      filmFolders: [],
      lastBlenderExport: null
    })
  )
  const scenes = [
    [10, 'INT. A - JOUR'],
    [20, 'INT. GRENIER - NUIT'],
    [30, 'INT. C - JOUR']
  ].map(([number, heading]) => ({
    id: `S${number}`,
    number,
    letter: '',
    name: `Scène ${number}`,
    heading,
    color: null,
    shots: [shot(`S${number}-P10`, number === 20 ? 'storyboard/vignettes/S20-P10.png' : null)]
  }))
  writeFileSync(
    join(data, 'decoupage.json'),
    JSON.stringify({ formatVersion: 1, numbersLocked: locked, scriptLinked: true, scenes }, null, 2)
  )
  writeFileSync(
    join(data, 'scenario.fountain'),
    'Title: Film essai\n\nTexte avant la première scène.\n\nINT. A - JOUR #10#\n\nUn.\n\nINT. GRENIER - NUIT #20#\n\nDeux.\n\nINT. C - JOUR #30#\n\nTrois.\n'
  )
  return projectFile
}
