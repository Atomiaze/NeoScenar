// Étape 14C : écran d'accueil en deux colonnes. Disposition (≈ 48 % / 52 %), mention « Créé par… · version », liste, boutons,
// projets récents (ouvrir, retirer), 7 thèmes (colonne de droite lisible, visuel inchangé),
// image personnalisée (copie, remplacement, refus, retour à l'origine), fenêtre étroite.

import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { sleep } from '../application.mjs'

const electron = `process.mainModule.require('electron')`
const THEMES = ['defaut', 'cobalt', 'or', 'matrix', 'pinklady', 'forest', 'aqua']

export default async function ({ app, check, log, newProject }) {
  // Un projet récent : on l'ouvre puis on le ferme pour revenir à l'accueil.
  const projectFile = newProject()
  await app.openProject(projectFile)
  await app.menu('Fichier', 'Fermer le projet')
  await sleep(1000)

  const layout = () =>
    app.evaluate(`(() => {
      const box = (s) => { const e = document.querySelector(s); if (!e) return null
        const r = e.getBoundingClientRect(); return { x: r.x, w: r.width, h: r.height, display: getComputedStyle(e).display } }
      const img = document.querySelector('.home-visual img')
      return {
        width: innerWidth,
        visual: box('.home-visual'),
        content: box('.home-content'),
        img: img && { natural: img.naturalWidth, loaded: img.complete && img.naturalWidth > 0, src: img.src, fit: getComputedStyle(img).objectFit },
        title: document.querySelector('.home-header h1')?.textContent,
        version: document.querySelector('.home-credit span')?.textContent,
        welcome: [...document.querySelectorAll('.welcome')].map((e) => e.textContent),
        promises: [...document.querySelectorAll('.home-promises li')].map((e) => e.textContent),
        buttons: [...document.querySelectorAll('.home-actions button')].map((e) => e.textContent),
        recents: document.querySelectorAll('.recent li').length,
        scrollX: document.documentElement.scrollWidth > innerWidth
      }
    })()`)

  // 1. Disposition et textes.
  let l = await layout()
  log('  fenêtre', l.width, 'visuel', JSON.stringify(l.visual))
  check(
    l.title === 'NeoScenar' && /^Créé par David Delepinne · version \d+\.\d+\.\d+$/.test(l.version),
    'titre et mention en bas'
  )
  check(
    l.welcome[0] === 'Bienvenue !' && l.welcome[1] === 'NeoScenar vous accompagne',
    'Bienvenue / NeoScenar vous accompagne'
  )
  check(
    l.promises.length === 6 &&
      l.promises[3] === 'dans la réalisation de votre storyboard' &&
      l.promises[4] === 'dans la centralisation de vos données',
    'six lignes, textes corrigés'
  )
  check(
    l.buttons.join('|') === 'Nouveau projet…|Ouvrir un projet…',
    'boutons Nouveau projet… et Ouvrir un projet…'
  )
  const ratio = l.visual.w / l.width
  check(ratio > 0.47 && ratio < 0.49, `colonne image ≈ 48 % (${(ratio * 100).toFixed(1)} %)`)
  check(l.img?.loaded && l.img.fit === 'cover', 'visuel chargé, recadré sans déformation')
  check(l.img.src.includes('/defaut'), 'image d’origine par défaut')
  check(l.recents >= 1 && !l.scrollX, 'projet récent listé, pas de défilement horizontal')
  await app.screenshot('accueil-defaut.png')

  // 2. Sept thèmes : le visuel ne change pas, la colonne de droite suit.
  const before = l.img.src
  for (const id of THEMES) {
    await app.evaluate(`window.neoscenar.setTheme(${JSON.stringify(id)})`)
    await sleep(400)
    const s = await app.evaluate(`(() => {
      const c = (s) => getComputedStyle(document.querySelector(s))
      const root = getComputedStyle(document.documentElement)
      return {
        bg: root.getPropertyValue('--background').trim(),
        accent: root.getPropertyValue('--accent').trim(),
        h1: c('.home-header h1').color,
        promise: c('.home-promises').color,
        visualBg: c('.home-visual').backgroundColor,
        src: document.querySelector('.home-visual img').src
      }
    })()`)
    check(s.src === before && s.visualBg === 'rgb(29, 32, 38)', `${id} : visuel inchangé`)
    check(s.h1 !== '' && s.h1 === s.promise, `${id} : titre et liste en couleur d'accent`)
    await app.screenshot(`accueil-${id}.png`)
  }
  await app.evaluate(`window.neoscenar.setTheme('defaut')`)
  await sleep(300)

  // 3. Image personnalisée (le sélecteur natif est remplacé par un choix imposé).
  const work = join(tmpdir(), `accueil-essai-${Date.now()}`)
  execFileSync('mkdir', ['-p', work])
  const jpg = join(work, 'a.jpg')
  const png = join(work, 'b.png')
  const big = join(work, 'lourde.jpg')
  const fake = join(work, 'faux.png')
  const source = join(process.cwd(), 'resources', 'accueil', 'visuel-accueil.jpg')
  execFileSync('sips', ['-Z', '600', source, '--out', jpg], { stdio: 'ignore' })
  execFileSync('sips', ['-s', 'format', 'png', jpg, '--out', png], { stdio: 'ignore' })
  writeFileSync(
    big,
    Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(11 * 1024 * 1024)])
  )
  writeFileSync(fake, 'ceci n’est pas une image')
  const pickNext = (file) =>
    app.main.evaluate(
      `(() => { ${electron}.dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [${JSON.stringify(file)}] }) })()`
    )
  const userData = await app.main.evaluate(`${electron}.app.getPath('userData')`)
  const copies = () =>
    existsSync(join(userData, 'accueil')) ? readdirSync(join(userData, 'accueil')) : []

  await app.menu('NeoScenar', 'Réglages…')
  await sleep(500)
  const labels = await app.evaluate(
    `[...document.querySelectorAll('.dialog button')].map((b) => b.textContent)`
  )
  check(
    labels.includes('Choisir…') && labels.includes('Image d’origine'),
    'Réglages : Choisir… / Image d’origine'
  )
  const clickText = (text) =>
    app.evaluate(
      `[...document.querySelectorAll('.dialog button')].find((b) => b.textContent === ${JSON.stringify(text)}).click()`
    )
  const currentSrc = () => app.evaluate(`document.querySelector('.home-visual img').src`)

  await pickNext(jpg)
  await clickText('Choisir…')
  await sleep(800)
  const first = await currentSrc()
  check(/image-accueil-\d+\.jpg$/.test(first), 'image choisie affichée tout de suite (copie .jpg)')
  check(copies().length === 1, 'une copie dans les données de l’application')
  check(
    await app.evaluate(
      `(() => { const i = document.querySelector('.home-visual img'); return i.complete && i.naturalWidth > 0 })()`
    ),
    'la copie se charge'
  )
  await app.screenshot('accueil-image-choisie.png')

  await sleep(10)
  await pickNext(png)
  await clickText('Choisir…')
  await sleep(800)
  const second = await currentSrc()
  check(/image-accueil-\d+\.png$/.test(second) && second !== first, 'nouvelle image : remplacée')
  check(copies().length === 1 && copies()[0].endsWith('.png'), 'l’ancienne copie est supprimée')

  for (const [file, label] of [
    [big, 'trop lourde'],
    [fake, 'pas une image']
  ]) {
    await pickNext(file)
    await clickText('Choisir…')
    await sleep(600)
    const message = await app.evaluate(
      `document.querySelector('[role=alert]')?.textContent ?? null`
    )
    check(message !== null, `${label} : message d’erreur affiché (${message})`)
    check((await currentSrc()) === second && copies().length === 1, `${label} : image inchangée`)
  }
  await app.screenshot('accueil-refus.png')

  await clickText('Image d’origine')
  await sleep(800)
  check(
    (await currentSrc()).endsWith('/defaut') && copies().length === 0,
    'image d’origine : copie supprimée'
  )
  // Copie disparue du disque : retour silencieux à l'image d'origine.
  await pickNext(jpg)
  await clickText('Choisir…')
  await sleep(600)
  execFileSync('rm', ['-r', join(userData, 'accueil')])
  await app.evaluate(`window.dispatchEvent(new Event('focus'))`)
  await app.evaluate(`window.dispatchEvent(new Event('neoscenar:welcome-image-changed'))`)
  await sleep(600)
  check((await currentSrc()).endsWith('/defaut'), 'copie effacée du disque : image d’origine')
  await app.click('.dialog button.primary')
  await sleep(300)

  // 4. Projets récents : ouvrir, retirer.
  await app.click('.recent-remove')
  await sleep(500)
  l = await layout()
  check(l.recents === 0, 'récent retiré de la liste')
  const rf = newProject()
  await app.openProject(rf)
  await app.menu('Fichier', 'Fermer le projet')
  await sleep(1000)
  await app.click('.recent-open')
  await sleep(2500)
  check(
    await app.evaluate(`!document.querySelector('.home')`),
    'ouvrir un projet récent : le projet s’ouvre'
  )
  await app.menu('Fichier', 'Fermer le projet')
  await sleep(1000)

  // 5. Fenêtre étroite : le visuel disparaît.
  await app.main.evaluate(`${electron}.BrowserWindow.getAllWindows()[0].setMinimumSize(600, 400);
      ${electron}.BrowserWindow.getAllWindows()[0].setSize(820, 700)`)
  await sleep(500)
  l = await layout()
  check(
    l.visual.display === 'none' && l.content.w >= l.width - 1,
    `fenêtre ${l.width} px : visuel masqué, contenu pleine largeur`
  )
  await app.screenshot('accueil-etroit.png')
  await app.main.evaluate(`${electron}.BrowserWindow.getAllWindows()[0].setSize(1280, 800)`)
}
