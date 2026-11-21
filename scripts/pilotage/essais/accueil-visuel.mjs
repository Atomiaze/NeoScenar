// Étape 17F : le visuel d'accueil en petite, moyenne et grande fenêtre (captures à regarder).
import { sleep } from '../application.mjs'

const electron = `process.mainModule.require('electron')`

export default async function ({ app, check, newProject }) {
  await app.openProject(newProject())
  await app.menu('Fichier', 'Fermer le projet')
  await sleep(1000)
  for (const [w, h] of [
    [960, 600],
    [1280, 800],
    [1800, 1000]
  ]) {
    await app.main.evaluate(`${electron}.BrowserWindow.getAllWindows()[0].setSize(${w}, ${h})`)
    await sleep(600)
    const path = await app.screenshot(`visuel-${w}x${h}.png`)
    console.log(path)
  }
  check(true, 'captures prises')
}
