// Étape 8D : l'élève tape dans Obsidian (enregistrement automatique toutes les 2 s) pendant que
// NeoScenar est ouvert. Une relecture qui ne change rien au lien ne fait aucune copie de sécurité.
// Pire cas : NeoScenar relit le fichier après chaque enregistrement (retour dans la fenêtre).

import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { sleep } from '../application.mjs'

export default async function ({ app, check, log, newProject }) {
  const projectFile = newProject()
  const data = join(dirname(projectFile), 'neoscenar')
  const scenarioFile = join(data, 'scenario.fountain')
  const copies = () =>
    readdirSync(join(data, 'sauvegardes')).filter((name) => name.startsWith('avant_rapprochement_'))
  await app.openProject(projectFile)
  await app.module('Scénario')
  await sleep(800)
  const before = copies().length

  // 30 s de frappe dans Obsidian : une phrase de plus sous S_0030, enregistrée toutes les 2 s.
  let text = readFileSync(scenarioFile, 'utf8')
  for (let i = 1; i <= 15; i++) {
    text = `${text.trimEnd()} Phrase ${i}.\n`
    writeFileSync(scenarioFile, text)
    await app.evaluate(`window.dispatchEvent(new Event('focus'))`)
    await sleep(2000)
  }
  const after = copies().length
  log(`    copies avant_rapprochement : ${before} avant, ${after} après`)
  check(after - before === 0, '30 s de frappe dans Obsidian : aucune nouvelle copie')
  check(
    (await app.scriptLines()).some((line) => line.includes('Phrase 15.')),
    'le texte tapé dans Obsidian est bien relu par NeoScenar'
  )
  check(
    (await app.evaluate(`document.querySelector('.link-banner')`)) === null,
    'aucun bandeau (rien à signaler)'
  )
  check((await app.dialog()) === null, 'aucune fenêtre (ni conflit, ni erreur)')

  // Contre-épreuve : une nouvelle scène sans numéro change le lien → une seule copie.
  writeFileSync(scenarioFile, `${text}\nEXT. RUE - NUIT\n\nQuatre.\n`)
  await app.evaluate(`window.dispatchEvent(new Event('focus'))`)
  await sleep(1500)
  check(copies().length - after === 1, 'nouvelle scène à numéroter : exactement une copie')
  await sleep(2000)
  check(
    readFileSync(scenarioFile, 'utf8').includes('EXT. RUE - NUIT #40#'),
    'numéro écrit dans le fichier'
  )
}
