// Étape 10bC : fenêtre « Exporter le générique » (menu Fichier et vue Générique). Sur « Le Dernier Bus »
// avec fiches, rubriques et logos : aperçu, taille et disposition mémorisées, cartons, export PNG
// (transparence, bords des lettres blancs : pas de halo sombre), texte brut, déroulant coupé en
// plusieurs parties sur un projet 4K. Les PNG d'exemple sont copiés dans out/generique-exemple/.

import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { dirname, join } from 'node:path'
import { sleep } from '../application.mjs'
import { decodePng, encodePng } from '../png.mjs'

const ROOT = join(import.meta.dirname, '..', '..', '..')
const EXAMPLE = join(ROOT, 'out', 'generique-exemple')

const CHARACTERS = [
  ['MADAME ROCHE', 'Tom Lambert', 'secondaire'],
  ['INÈS', 'Léa Dupont', 'principal'],
  ['ÉLIOTT', 'Hugo Martin', 'principal'],
  ['LE CAISSIER', 'Sam Petit', 'figurant'],
  ['MARC', 'Noé Durand', 'secondaire']
]

const NAMES = ['Zoé Martin', 'Yanis Benali', 'Clara Fontaine', 'Mehdi Laurent', 'Inès Moreau']

/** Logo large en couleur, aux bords adoucis (pour voir la transparence des logos). */
function wideLogo() {
  return encodePng(600, 200, (x, y) => {
    const edge = Math.min(x, y, 599 - x, 199 - y)
    const alpha = Math.min(255, edge * 25)
    return [40 + Math.round((x / 600) * 180), 120, 220 - Math.round((y / 200) * 120), alpha]
  })
}

function prepareProject(projectFile, { width, height, taille, disposition, thanks = 5 }) {
  const data = join(dirname(projectFile), 'neoscenar')
  const projet = JSON.parse(readFileSync(join(data, 'projet.json'), 'utf8'))
  projet.settings.resolution = { width, height }
  // Identifiant propre à chaque projet d'essai : deux projets au même identifiant partagent leurs sessions.
  projet.id = randomUUID()
  writeFileSync(join(data, 'projet.json'), JSON.stringify(projet))
  copyFileSync(
    join(ROOT, 'packages', 'fountain', 'tests', 'exemples', 'le-dernier-bus.fountain'),
    join(data, 'scenario.fountain')
  )
  mkdirSync(join(data, 'personnages'), { recursive: true })
  for (const [nom, interprete, role] of CHARACTERS)
    writeFileSync(
      join(data, 'personnages', `${nom}.md`),
      `---\ntype: personnage\nnom: ${JSON.stringify(nom)}\ninterprete: ${interprete}\nrole: ${role}\nauto: false\n---\n`
    )
  mkdirSync(join(data, 'generique', 'logos'), { recursive: true })
  copyFileSync(join(ROOT, 'build', 'icon.png'), join(data, 'generique', 'logos', 'neoscenar.png'))
  writeFileSync(join(data, 'generique', 'logos', 'partenaire.png'), wideLogo())
  const rubric = (id, count, start = 0) => ({
    id,
    intitule: null,
    noms: Array.from({ length: count }, (_, i) => NAMES[(start + i) % NAMES.length])
  })
  writeFileSync(
    join(data, 'generique.json'),
    JSON.stringify({
      version: 1,
      modele: 'saint-luc',
      options: { ordreActeurs: 'importance', taille, disposition, blocsAffiches: [] },
      acteurs: { nomsAffiches: {} },
      rubriques: [
        { id: 'realisation.realisation', intitule: null, noms: ['Zoé Martin'] },
        rubric('realisation.assistant-1', 1, 1),
        rubric('realisation.scripte', 1, 2),
        {
          id: 'production.production',
          intitule: null,
          noms: ['IES Saint Luc Liège', 'Léa Dupont']
        },
        rubric('production.regie-generale', 2, 3),
        { id: 'image.chef-op', intitule: 'Image', noms: ['Mehdi Laurent'] },
        rubric('image.cadre', 1, 4),
        rubric('image.electriciens', 3, 0),
        rubric('son.ingenieur', 1, 2),
        rubric('son.perchman', 2, 3),
        rubric('decors.costumes', 2, 1),
        rubric('postproduction.montage', 1, 0),
        rubric('postproduction.etalonnage', 1, 4),
        rubric('postproduction.mixage', 1, 2),
        {
          id: 'remerciements.particuliers',
          intitule: null,
          noms: Array.from({ length: thanks }, (_, i) => `${NAMES[i % NAMES.length]} ${i + 1}`)
        },
        {
          id: 'perso-1',
          bloc: 'image',
          intitule: 'Lumière d’appoint et accessoires de prise de vue empruntés',
          noms: ['Tom']
        }
      ],
      musiques: [
        {
          titre: 'La Mer',
          interprete: 'Charles Trenet',
          auteurs: 'Charles Trenet',
          autorisation: 'EMI'
        }
      ],
      mentions: {
        fiction: true,
        animaux: true,
        copyrightAnnee: 2026,
        copyrightTitulaire: 'IES Saint Luc Liège',
        tourneA: 'Liège',
        ligneEcole: null
      },
      logos: ['generique/logos/partenaire.png', 'generique/logos/neoscenar.png'],
      cartonsDebut: ['logos', 'presente', 'acteursPrincipaux', 'titre']
    })
  )
  return data
}

/** Statistiques des bords : pixels semi-transparents dont la couleur n'est pas blanche. */
function edgeStats(file, maxY = Infinity) {
  const png = decodePng(readFileSync(file))
  const end = Math.min(png.height, maxY) * png.width * 4
  let edges = 0
  let dark = 0
  let darkest = 255
  let opaque = 0
  for (let i = 0; i < end; i += 4) {
    const alpha = png.data[i + 3]
    if (alpha === 255) opaque++
    if (alpha === 0 || alpha === 255) continue
    edges++
    const min = Math.min(png.data[i], png.data[i + 1], png.data[i + 2])
    darkest = Math.min(darkest, min)
    if (min < 250) dark++
  }
  return { width: png.width, height: png.height, edges, dark, darkest, opaque }
}

export default async function ({ app, check, log, newProject }) {
  const projectFile = newProject()
  const data = prepareProject(projectFile, {
    width: 1920,
    height: 1080,
    taille: 'moyenne',
    disposition: 'centree'
  })
  const exportDir = join(dirname(projectFile), '08_Graphisme', 'Generique')
  const readCredits = () => JSON.parse(readFileSync(join(data, 'generique.json'), 'utf8'))
  const dialogText = () =>
    app.evaluate(`document.querySelector('.credits-export-dialog')?.textContent ?? ''`)
  const choose = (label) =>
    app.evaluate(`[...document.querySelectorAll('.credits-export-options label')]
      .find((l) => l.textContent.trim().startsWith(${JSON.stringify(label)}))?.querySelector('input')?.click()`)
  const waitSaved = async () => {
    for (let i = 0; i < 80; i++) {
      if (
        (await app.evaluate(`document.querySelector('.dialog h2')?.textContent`)) ===
        'Générique exporté'
      )
        return true
      await sleep(250)
    }
    return false
  }
  const waitPreview = async () => {
    for (let i = 0; i < 40; i++) {
      if (await app.evaluate(`!!document.querySelector('.credits-screen canvas')`)) return true
      await sleep(250)
    }
    return false
  }

  await app.openProject(projectFile)
  await app.module('Données du projet')
  await sleep(500)

  const labels = await app.menuLabels('Fichier')
  check(labels.includes('Exporter le générique…'), 'menu Fichier : « Exporter le générique… »')

  // Accès depuis la vue Générique.
  await app.evaluate(
    `[...document.querySelectorAll('.research-branch-title')].find((b) => b.textContent.trim() === 'Générique')?.click()`
  )
  await sleep(800)
  await app.evaluate(
    `[...document.querySelectorAll('.research-sheet-header button')].find((b) => b.textContent === 'Exporter…')?.click()`
  )
  check(await waitPreview(), 'la vue Générique ouvre la fenêtre, avec l’aperçu du déroulant')
  await sleep(800)
  const text1 = await dialogText()
  const duration = /Durée conseillée du défilement : ([^U]+?s)/.exec(text1)?.[1]
  const size1 = /Déroulant : 1920 × (\d+) px/.exec(text1)?.[1]
  log('    centrée moyenne :', size1, 'px, durée', duration)
  check(size1 !== undefined, `taille du déroulant affichée (${size1} px)`)
  check(duration !== undefined, `durée conseillée affichée (${duration})`)
  const thumbs = await app.evaluate(
    `[...document.querySelectorAll('.credits-card-thumb figcaption')].map((f) => f.textContent)`
  )
  check(
    JSON.stringify(thumbs) ===
      JSON.stringify([
        'debut_01_logos.png',
        'debut_02_presente.png',
        'debut_03_acteurs.png',
        'debut_04_titre.png'
      ]),
    `cartons en vignettes : ${thumbs.join(', ')}`
  )
  check(text1.includes('« Un film de … »'), 'cartons proposés à cocher')
  await app.screenshot('generique-centree.png')

  // Disposition deux colonnes : mémorisée dans generique.json, déroulant plus court.
  await choose('Deux colonnes')
  await sleep(1500)
  check(readCredits().options.disposition === 'deux-colonnes', 'disposition mémorisée')
  const size2 = /Déroulant : 1920 × (\d+) px/.exec(await dialogText())?.[1]
  check(Number(size2) < Number(size1), `deux colonnes plus court (${size2} < ${size1} px)`)
  // Lecture du défilement quelques instants.
  await app.evaluate(
    `[...document.querySelectorAll('.credits-preview button')].find((b) => b.textContent === 'Lire le défilement')?.click()`
  )
  await sleep(2500)
  const scrolled = await app.evaluate(`document.querySelector('.credits-screen').scrollTop`)
  check(scrolled > 20, `l’aperçu défile (${Math.round(scrolled)} px)`)
  await app.evaluate(`document.querySelector('.credits-screen').scrollTop = 640`)
  await app.evaluate(
    `[...document.querySelectorAll('.credits-preview button')].find((b) => b.textContent === 'Pause')?.click()`
  )
  await sleep(300)
  await app.screenshot('generique-deux-colonnes.png')

  // Carton « Un film de » coché : mémorisé, à sa place dans l'ordre fixe.
  await choose('« Un film de')
  await sleep(1000)
  check(
    JSON.stringify(readCredits().cartonsDebut) ===
      JSON.stringify(['logos', 'presente', 'unFilmDe', 'acteursPrincipaux', 'titre']),
    `cartons mémorisés dans l’ordre fixe : ${readCredits().cartonsDebut.join(', ')}`
  )

  // Export PNG ; un ancien fichier de carton disparu est retiré, un fichier de l'élève est gardé.
  mkdirSync(exportDir, { recursive: true })
  writeFileSync(
    join(exportDir, 'debut_09_titre.png'),
    encodePng(1, 1, () => [0, 0, 0, 0])
  )
  writeFileSync(
    join(exportDir, 'fond_eleve.png'),
    encodePng(1, 1, () => [0, 0, 0, 0])
  )
  await app.dialogButton('Exporter')
  check(await waitSaved(), 'message de fin d’export')
  const files = readdirSync(exportDir).sort()
  log('    exportés :', files.join(', '))
  check(
    JSON.stringify(files) ===
      JSON.stringify([
        'debut_01_logos.png',
        'debut_02_presente.png',
        'debut_03_un_film_de.png',
        'debut_04_acteurs.png',
        'debut_05_titre.png',
        'fond_eleve.png',
        'generique_fin.png'
      ]),
    'PNG exportés dans 08_Graphisme/Generique/, ancien carton retiré, fichier de l’élève gardé'
  )
  await app.screenshot('generique-exporte.png')

  // Le déroulant sans ses logos (en couleur, en bas) : seulement du texte blanc.
  const roll = edgeStats(join(exportDir, 'generique_fin.png'), Number(size2) - 300)
  log('    déroulant (sans les logos) :', JSON.stringify(roll))
  check(roll.width === 1920 && roll.height === Number(size2), 'déroulant à la largeur du projet')
  check(
    roll.edges > 1000 && roll.dark === 0,
    `déroulant : bords des lettres blancs (${roll.edges} pixels de bord)`
  )
  for (const name of ['debut_02_presente.png', 'debut_04_acteurs.png', 'debut_05_titre.png']) {
    const stats = edgeStats(join(exportDir, name))
    log(`    ${name} :`, JSON.stringify(stats))
    check(stats.width === 1920 && stats.height === 1080, `${name} au format du projet`)
    check(
      stats.edges > 100 && stats.dark === 0,
      `${name} : bords des lettres blancs (${stats.edges} pixels de bord, aucun sombre)`
    )
  }
  const logosCard = decodePng(readFileSync(join(exportDir, 'debut_01_logos.png')))
  check(logosCard.data[3] === 0, 'fond transparent (coin du carton des logos)')

  // Exemples pour David.
  rmSync(EXAMPLE, { recursive: true, force: true })
  mkdirSync(EXAMPLE, { recursive: true })
  for (const file of files.filter((name) => name !== 'fond_eleve.png'))
    copyFileSync(join(exportDir, file), join(EXAMPLE, file))
  await app.dialogButton('Fermer')
  await sleep(300)

  // Texte brut, présentation tabulée, copie et export.
  await app.menu('Fichier', 'Exporter le générique…')
  await waitPreview()
  await choose('Texte brut')
  await sleep(300)
  await choose('Intitulé et nom sur la même ligne')
  await sleep(300)
  const preview = await app.evaluate(`document.querySelector('.credits-text-preview')?.value ?? ''`)
  check(preview.includes('IMAGE\tMehdi Laurent'), 'aperçu du texte tabulé')
  await app.evaluate(
    `[...document.querySelectorAll('.credits-export-options button')].find((b) => b.textContent === 'Copier')?.click()`
  )
  await sleep(300)
  check((await dialogText()).includes('Texte copié.'), 'bouton « Copier »')
  const clipboard = await app.main.evaluate(
    `process.mainModule.require('electron').clipboard.readText()`
  )
  check(clipboard === preview, 'le presse-papiers contient le texte')
  await app.screenshot('generique-texte.png')
  await app.dialogButton('Exporter')
  await sleep(1000)
  check(
    readFileSync(join(exportDir, 'generique.txt'), 'utf8') === preview,
    'generique.txt écrit, identique à l’aperçu'
  )
  copyFileSync(join(exportDir, 'generique.txt'), join(EXAMPLE, 'generique.txt'))
  await app.dialogButton('Fermer')

  // Projet 4K, grande taille, centrée : plus de 16 384 px, message et export en parties.
  const big = newProject()
  prepareProject(big, {
    width: 3840,
    height: 2160,
    taille: 'grande',
    disposition: 'centree',
    thanks: 100
  })
  await app.openProject(big)
  await sleep(500)
  await app.menu('Fichier', 'Exporter le générique…')
  await waitPreview()
  await sleep(800)
  const bigText = await dialogText()
  const bigSize = /Déroulant : 3840 × (\d+) px/.exec(bigText)?.[1]
  log('    4K grande centrée :', bigSize, 'px')
  check(bigText.includes('plus que la limite de 16 384 px'), 'message au-delà de 16 384 px')
  await app.screenshot('generique-trop-haut.png')
  await app.dialogButton('Exporter')
  check(await waitSaved(), 'export 4K terminé')
  const bigDir = join(dirname(big), '08_Graphisme', 'Generique')
  const parts = readdirSync(bigDir).filter((name) => name.startsWith('generique_fin'))
  log('    parties :', parts.join(', '))
  check(parts.length >= 2 && !parts.includes('generique_fin.png'), 'déroulant en plusieurs parties')
  let total = 0
  for (const part of parts) {
    const { width, height } = decodePng(readFileSync(join(bigDir, part)))
    check(width === 3840 && height <= 16384, `${part} : ${width} × ${height}`)
    total += height
  }
  check(
    total === Number(bigSize),
    `les parties bout à bout font la hauteur du déroulant (${total})`
  )
  const card = decodePng(readFileSync(join(bigDir, 'debut_04_titre.png')))
  check(card.width === 3840 && card.height === 2160, 'cartons au format 4K du projet')
}
