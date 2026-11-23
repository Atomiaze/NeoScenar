// Sous-étape 18C-11 : un symbole Fountain tapé en début de ligne (#, =, ~, ===, !, @, .X, >, > <)
// l'emporte sur le type choisi par Entrée ; « ... » et « .5 » restent des actions (« !.5 » dans le
// fichier), y compris après une transition.

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { sleep } from '../application.mjs'

const KEYS = { End: 35, Enter: 13 }

export default async function ({ app, check, log, newProject }) {
  const projectFile = newProject()
  const fountainFile = join(dirname(projectFile), 'neoscenar', 'scenario.fountain')
  // Une transition après « Deux. » pour essayer Entrée après une transition.
  writeFileSync(
    fountainFile,
    readFileSync(fountainFile, 'utf8').replace('Deux.\n', 'Deux.\n\nCUT TO:\n')
  )
  await app.openProject(projectFile)
  await app.module('Scénario')
  await sleep(800)

  const press = async (key) => {
    const params = { key, code: key, windowsVirtualKeyCode: KEYS[key] }
    await app.page.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...params })
    await app.page.send('Input.dispatchKeyEvent', { type: 'keyUp', ...params })
    await sleep(150)
  }
  const cursorLine = () => app.evaluate(`document.querySelector('.cm-activeLine')?.className ?? ''`)
  const lineClass = (text) =>
    app.evaluate(`[...document.querySelectorAll('.cm-line')]
      .find((l) => l.textContent.includes(${JSON.stringify(text)}))?.className ?? ''`)
  const saved = async () => {
    await sleep(1500)
    return readFileSync(fountainFile, 'utf8')
  }

  /** Entrée au bout de la ligne `after`, frappe de `text`, puis on quitte la ligne. */
  const typeAfter = async (after, text) => {
    await app.mouseClick('.cm-line', after)
    await press('End')
    await press('Enter')
    for (const char of text) await app.page.send('Input.insertText', { text: char })
    await sleep(300)
    const typing = await cursorLine()
    await app.mouseClick('.cm-line', 'Texte avant la première scène.')
    await sleep(500)
    return typing
  }

  // Après une action (Entrée → action).
  const cases = [
    ['# ACTE 1', 'fl-section', 'ACTE 1'],
    ['= Résumé de la scène.', 'fl-synopsis', 'Résumé de la scène.'],
    ['~la la la', 'fl-lyrics', 'la la la'],
    ['> trois ans plus tard <', 'fl-centered', 'trois ans plus tard'],
    ['@McClane', 'fl-character', 'MCCLANE'],
    ['> fondu au noir', 'fl-transition', 'FONDU AU NOIR'],
    ['.flashback', 'fl-scene_heading', 'FLASHBACK']
  ]
  for (const [text, cls, shown] of cases) {
    const typing = await typeAfter('Un.', text)
    const after = await lineClass(shown)
    log(`${text} : frappe « ${typing} », après « ${after} »`)
    check(typing.includes(cls), `« ${text} » : ${cls} pendant la frappe`)
    check(after.includes(cls), `« ${text} » : ${cls} après avoir quitté la ligne`)
  }
  let file = await saved()
  for (const line of [
    '# ACTE 1',
    '= Résumé de la scène.',
    '~la la la',
    '> trois ans plus tard <',
    '@MCCLANE',
    '> FONDU AU NOIR'
  ]) {
    check(file.split('\n').includes(line), `fichier : « ${line} »`)
  }
  // Un en-tête forcé ouvre une nouvelle scène : il reçoit son numéro.
  check(/^\.FLASHBACK #\d+#$/m.test(file), 'fichier : « .FLASHBACK », nouvelle scène numérotée')
  // Le bandeau d'acte et le navigateur.
  check(
    await app.evaluate(
      `[...document.querySelectorAll('.navigator-row')].some((r) => r.textContent.includes('ACTE 1'))`
    ),
    'ACTE 1 dans le navigateur de scènes'
  )
  await app.screenshot('symboles-actions.png')

  // Saut de page et action forcée.
  await typeAfter('Trois.', '===')
  await typeAfter('Trois.', '!BOUM')
  file = await saved()
  check(file.split('\n').includes('==='), 'fichier : « === » intact')
  check(file.split('\n').includes('!BOUM'), 'fichier : « !BOUM »')

  // « ... » et « .5 » après une action et après une transition.
  let typing = await typeAfter('Un.', '.5 seconde plus tard')
  check(typing.includes('fl-action'), '« .5 » après une action : action pendant la frappe')
  typing = await typeAfter('CUT TO:', '... et puis')
  check(typing.includes('fl-action'), '« ... » après une transition : action pendant la frappe')
  typing = await typeAfter('CUT TO:', '.5 plus tard')
  check(typing.includes('fl-action'), '« .5 » après une transition : action pendant la frappe')
  file = await saved()
  const lines = file.split('\n')
  check(lines.includes('!.5 seconde plus tard'), 'fichier : « !.5 seconde plus tard »')
  check(lines.includes('... et puis'), 'fichier : « ... et puis » en minuscules, sans point ajouté')
  check(lines.includes('!.5 plus tard'), 'fichier : « !.5 plus tard »')
  check(!/\.5[^\n]*#\d+#/.test(file), 'aucun numéro de scène sur les lignes « .5 »')
  check((await lineClass('.5 seconde plus tard')).includes('fl-action'), '« .5 » affiché en action')
  check(
    !(await app.evaluate(`[...document.querySelectorAll('.cm-line')]
      .find((l) => l.textContent.includes('.5 seconde plus tard')).textContent.startsWith('!')`)),
    '« ! » masqué à l’écran'
  )
  log(file)
  await app.screenshot('symboles-points.png')
}
