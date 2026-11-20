// Lance un essai dans NeoScenar réel (outil de développement, jamais livré avec l'application).
//
// Utilisation : npm run pilote -- scripts/pilotage/essais/<essai>.mjs
//
// L'application est construite (out/), lancée avec des préférences séparées sur un projet d'essai
// créé dans un dossier temporaire, puis l'essai la pilote. Les captures d'écran et le résumé sont
// rangés dans ce dossier temporaire. Code de sortie 1 si une vérification échoue ou si la console
// contient une erreur.

import { execSync } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { launch } from './application.mjs'
import { createTestProject } from './projetEssai.mjs'

const essayPath = process.argv[2]
if (!essayPath) {
  console.log('Utilisation : npm run pilote -- scripts/pilotage/essais/<essai>.mjs')
  process.exit(2)
}

execSync('npx electron-vite build', { stdio: 'ignore', cwd: join(import.meta.dirname, '..', '..') })
const essay = (await import(pathToFileURL(resolve(essayPath)).href)).default
const work = mkdtempSync(join(tmpdir(), 'neoscenar-pilote-'))
console.log(`Dossier de l'essai : ${work}`)

let failures = 0
const check = (condition, message) => {
  console.log(`${condition ? '  ✓' : '  ✗'} ${message}`)
  if (!condition) failures++
}

const app = await launch({ userData: join(work, 'preferences'), screenshots: work })
try {
  await essay({
    app,
    check,
    log: (...parts) => console.log(...parts),
    newProject: (options) => createTestProject(join(work, `projet-${Date.now()}`), options)
  })
  const problems = app.problems()
  check(problems.length === 0, 'aucune erreur dans les consoles')
  for (const line of problems) console.log(`    ${line}`)
} catch (error) {
  failures++
  console.log('ESSAI INTERROMPU :', error)
} finally {
  app.close()
}
console.log(failures === 0 ? '\nEssai réussi.' : `\nEssai en échec : ${failures} vérification(s).`)
process.exit(failures === 0 ? 0 : 1)
