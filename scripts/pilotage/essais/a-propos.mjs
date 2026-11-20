// « À propos de NeoScenar » : fenêtre ouverte par le menu (sans projet, puis avec un projet),
// nom, version, licence, lien, aucune adresse e-mail ; mention en bas de l'accueil.
import { sleep } from '../application.mjs'

export default async function ({ app, check, log, newProject }) {
  // Comme l'essai de l'accueil : on ouvre un projet puis on le ferme pour revenir à l'accueil.
  const projectFile = newProject()
  await app.openProject(projectFile)
  await app.menu('Fichier', 'Fermer le projet')
  await sleep(1000)

  const aboutText = () =>
    app.evaluate(`(() => {
      const d = document.querySelector('.about-dialog')
      return d && { text: d.innerText, repo: !!d.querySelector('.about-repository') }
    })()`)

  // Accueil : mention discrète et lien « À propos ».
  await sleep(800)
  const credit = await app.evaluate(`document.querySelector('.home-credit')?.innerText`)
  log(`accueil : ${credit}`)
  check(
    /Créé par David Delepinne · version \d+\.\d+\.\d+/.test(credit ?? ''),
    'mention en bas de l’accueil'
  )
  await app.click('.home-credit .link-button')
  await sleep(400)
  let about = await aboutText()
  check(about !== null, 'le lien « À propos » de l’accueil ouvre la fenêtre')
  await app.screenshot('a-propos.png')
  check(/David Delepinne/.test(about.text), 'auteur')
  check(/Version \d+\.\d+\.\d+/.test(about.text), 'version')
  check(/GPL-3\.0/.test(about.text), 'licence')
  check(about.repo, 'lien vers le dépôt')
  check(!/@/.test(about.text), 'aucune adresse e-mail')
  await app.evaluate(`window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`)
  await sleep(300)
  check((await aboutText()) === null, 'Échap ferme la fenêtre')

  // Par le menu, avec un projet ouvert.
  await app.openProject(projectFile)
  const labels = await app.menuLabels('Aide')
  log(`menu Aide : ${JSON.stringify(labels)}`)
  await app.menu('Aide', 'À propos de NeoScenar')
  await sleep(400)
  about = await aboutText()
  check(
    about !== null && /GPL-3\.0/.test(about.text),
    'le menu Aide ouvre la fenêtre avec un projet'
  )
  await app.dialogButton('Fermer')
  await sleep(300)
  check((await aboutText()) === null, 'le bouton Fermer ferme la fenêtre')
}
