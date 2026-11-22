// Étape 18C-4 : parties du PDF (page de titre, scénario, synopsis, pitch, note d'intention),
// cases grisées pour un document vide, log line et tag line retenues sur la page de titre.

import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { sleep } from '../application.mjs'

async function pdfPages(path) {
  const doc = await getDocument({ data: new Uint8Array(readFileSync(path)), verbosity: 0 }).promise
  const pages = []
  for (let n = 1; n <= doc.numPages; n++) {
    const content = await (await doc.getPage(n)).getTextContent()
    pages.push(content.items.map((item) => item.str).join(' '))
  }
  return pages
}

export default async function ({ app, check, log, newProject }) {
  const projectFile = newProject()
  const data = join(dirname(projectFile), 'neoscenar')
  const exportsDir = join(data, 'exports')
  writeFileSync(
    join(data, 'synopsis.md'),
    '## Le départ\n\nLéa attend le **dernier** bus, *seule*.\n\n---\n\nIl ne vient pas.\n'
  )
  writeFileSync(join(data, 'note-intention.md'), 'Filmer l’attente.\n')
  writeFileSync(
    join(data, 'log-line.md'),
    '## Version 1\n\nPremière idée.\n\n## Version 2 (retenue)\n\nUne femme attend un bus qui ne vient pas.\n'
  )
  writeFileSync(join(data, 'tag-line.md'), '## Version 1 (retenue)\n\nLe dernier bus est passé.\n')

  await app.openProject(projectFile)
  await app.module('Scénario')
  await sleep(800)

  const state = () =>
    app.evaluate(`(() => {
      const box = (p) => document.querySelector('.pdf-options input[data-part="' + p + '"]')
      const parts = ['pageDeTitre', 'scenario', 'synopsis', 'pitch', 'noteIntention']
      return {
        count: document.querySelector('.pdf-page-count')?.textContent ?? null,
        frame: !!document.querySelector('.pdf-preview iframe'),
        empty: document.querySelector('.pdf-preview .muted')?.textContent ?? null,
        checked: Object.fromEntries(parts.map((p) => [p, box(p)?.checked])),
        disabled: Object.fromEntries(parts.map((p) => [p, box(p)?.disabled])),
        pitchTitle: box('pitch')?.closest('label')?.title,
        scriptOptionsOff: document.querySelector('.pdf-script-options')?.disabled,
        save: [...document.querySelectorAll('.dialog-actions button, .dialog button')].find((b) => b.textContent === 'Enregistrer')?.disabled
      }
    })()`)
  // Aperçu prêt : nombre de pages affiché, ou « Rien à exporter ». Un aperçu est regénéré à chaque case.
  const waitReady = async () => {
    for (let i = 0; i < 40; i++) {
      const s = await state()
      if (s.count || s.empty?.startsWith('Rien')) return s
      await sleep(250)
    }
    return state()
  }
  const waitChange = async () => {
    await sleep(1200)
    return waitReady()
  }
  const toggle = async (part) => {
    await app.click(`.pdf-options input[data-part="${part}"]`)
    return waitChange()
  }

  await app.menu('Fichier', 'Exporter le scénario en PDF…')
  let s = await waitChange()
  log('    ouverture :', JSON.stringify(s))
  check(
    s.checked.pageDeTitre && s.checked.scenario,
    'par défaut : page de titre et scénario cochés'
  )
  check(!s.checked.synopsis && !s.checked.noteIntention, 'par défaut : documents décochés')
  check(
    s.disabled.pitch && s.pitchTitle === 'Document vide',
    'pitch vide : case grisée, « Document vide »'
  )
  check(!s.disabled.synopsis && !s.disabled.noteIntention, 'synopsis et note : cases actives')
  const base = parseInt(s.count)

  await toggle('synopsis')
  s = await toggle('noteIntention')
  check(parseInt(s.count) === base + 2, `synopsis + note : ${base} → ${s.count}`)
  await sleep(1200)
  await app.screenshot('export-pdf-documents-tout.png')

  s = await toggle('scenario')
  check(s.scriptOptionsOff === true, 'scénario décoché : options du scénario grisées')
  s = await toggle('pageDeTitre')
  check(s.count === '2 pages', `documents seuls : ${s.count}`)
  await sleep(1200)
  await app.screenshot('export-pdf-documents-seuls.png')

  await toggle('synopsis')
  s = await toggle('noteIntention')
  log('    rien :', JSON.stringify(s))
  check(
    s.empty?.startsWith('Rien à exporter') && s.save === true,
    'rien de coché : message et Enregistrer grisé'
  )
  await app.screenshot('export-pdf-documents-rien.png')

  // Synopsis + note d'intention sans scénario : enregistré et relu.
  await toggle('synopsis')
  await toggle('noteIntention')
  await app.dialogButton('Enregistrer')
  await sleep(1500)
  const files = existsSync(exportsDir) ? readdirSync(exportsDir) : []
  const pages = files.length === 1 ? await pdfPages(join(exportsDir, files[0])) : []
  log('    PDF :', JSON.stringify(pages))
  check(pages.length === 2, 'PDF : deux pages')
  check(
    pages[0]?.startsWith('SYNOPSIS') && pages[0].includes('LE DÉPART') === false,
    'page 1 : SYNOPSIS (titre 2 non mis en majuscules)'
  )
  check(
    pages[0]?.includes('Le départ') && !pages[0].includes('**'),
    'page 1 : texte sans marqueurs'
  )
  check(pages[1]?.startsWith('NOTE D’INTENTION'), 'page 2 : NOTE D’INTENTION')
  await app.dialogButton('Fermer')

  // Réouverture : cases retrouvées ; page de titre avec log line et tag line.
  await app.menu('Fichier', 'Exporter le scénario en PDF…')
  s = await waitChange()
  check(
    !s.checked.pageDeTitre && !s.checked.scenario && s.checked.synopsis && s.checked.noteIntention,
    'réouverture : cases retrouvées'
  )
  await toggle('pageDeTitre')
  await toggle('scenario')
  await sleep(1200)
  await app.screenshot('export-pdf-documents-titre.png')
  await app.dialogButton('Enregistrer')
  await sleep(1500)
  const all = await pdfPages(join(exportsDir, readdirSync(exportsDir)[0]))
  log('    page de titre :', all[0])
  const tag = all[0]?.indexOf('Le dernier bus est passé.') ?? -1
  const logLine = all[0]?.indexOf('Une femme attend un bus qui ne vient pas.') ?? -1
  check(tag > 0 && logLine > tag, 'page de titre : tag line puis log line')
  check(
    all[1]?.startsWith('SYNOPSIS') && all[2]?.startsWith('NOTE'),
    'ordre : titre, synopsis, note, scénario'
  )
  check(all.length > 3, `scénario après les documents (${all.length} pages)`)
  const fountain = readFileSync(join(data, 'scenario.fountain'), 'utf8')
  check(
    !fountain.includes('Une femme attend') && !fountain.includes('dernier bus est'),
    'rien dans le Fountain'
  )
  await app.dialogButton('Fermer')

  // Le titre automatique est annoncé dans l'éditeur du document.
  await app.module('Données du projet')
  await sleep(600)
  await app.evaluate(
    `[...document.querySelectorAll('.research-tree .research-branch-title')].find((b) => b.textContent.trim() === 'Synopsis')?.click()`
  )
  await sleep(600)
  const hint = await app.evaluate(`document.querySelector('.md-pdf-title')?.textContent`)
  log('    aide :', hint)
  check(hint?.includes('« SYNOPSIS »'), 'l’éditeur annonce le titre SYNOPSIS du PDF')
  await app.screenshot('export-pdf-documents-aide.png')
}
