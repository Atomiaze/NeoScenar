// Démonstration de la mise en page « Scénario Final Draft (A4) » dans le terminal :
// affiche les pages comme sur une machine à écrire, puis les durées estimées.
// Utilisation : npm run fountain:pages -- chemin/vers/scenario.fountain

import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import {
  estimateDurations,
  getSceneNumbers,
  getScenes,
  getSectionRanges,
  paginate,
  parse,
  resolveLayout
} from '../packages/fountain/src/index.ts'

const PROFILE = join(import.meta.dirname, '..', 'resources', 'mise-en-page', 'final-draft-a4.json')
// Marge gauche à l'écran, pour laisser la place au numéro de scène.
const MARGIN = 6

function formatDuration(seconds) {
  const total = Math.round(seconds)
  return `${Math.floor(total / 60)} min ${String(total % 60).padStart(2, '0')} s`
}

const file = process.argv[2]
if (!file) {
  console.error('Indique un fichier : npm run fountain:pages -- chemin/vers/scenario.fountain')
  process.exit(1)
}

let text
try {
  text = readFileSync(resolve(file), 'utf8')
} catch {
  console.error(`Impossible de lire le fichier « ${file} ».`)
  process.exit(1)
}

const layout = resolveLayout(JSON.parse(readFileSync(PROFILE, 'utf8')))
const doc = parse(text)
const started = performance.now()
const pagination = paginate(doc, layout)
const duration = performance.now() - started

const sceneNumbers = getSceneNumbers(doc)
const sceneOfHeading = new Map(getScenes(doc).map((scene, i) => [scene.index, sceneNumbers[i]]))
const width = 3 + MARGIN + layout.textWidthCh
const rule = '─'.repeat(width)

for (const page of pagination.pages) {
  const label = page.number === 1 ? '' : `${page.number}.`
  console.log(`${rule.slice(0, width - label.length - 1)} ${label}`)
  let lineNumber = 0
  for (const fragment of page.fragments) {
    for (let i = 0; i < fragment.spaceBefore; i++)
      console.log(`${String(++lineNumber).padStart(2)}`)
    const element = pagination.layouts[fragment.elementIndex]
    const lines = element.lines.slice(fragment.firstLine, fragment.firstLine + fragment.lineCount)
    lines.forEach((line, i) => {
      const number =
        fragment.firstLine + i === 0 ? sceneOfHeading.get(fragment.elementIndex) : undefined
      const margin = (number ? `${number}.` : '').padStart(MARGIN - 1)
      const indent = ' '.repeat(Math.round(line.column))
      console.log(`${String(++lineNumber).padStart(2)} ${margin} ${indent}${line.text}`)
    })
  }
  console.log(`   (${page.usedLines} lignes sur ${pagination.linesPerPage})`)
}

const durations = estimateDurations(doc, pagination)
console.log('\n=== Durées estimées (une page ≈ une minute) ===')
for (const range of getSectionRanges(doc)) {
  const seconds = durations.sections.find((section) => section.index === range.index).seconds
  console.log(`${'  '.repeat(range.level - 1)}${range.title} : ${formatDuration(seconds)}`)
}
getScenes(doc).forEach((scene, i) => {
  console.log(
    `  Scène ${sceneNumbers[i]}. ${scene.heading.text.toUpperCase()} : ${formatDuration(durations.scenes[i].seconds)}`
  )
})
console.log(`Total : ${pagination.pages.length} page(s), ${formatDuration(durations.totalSeconds)}`)
console.log(`Pagination calculée en ${duration.toFixed(1)} ms.`)
