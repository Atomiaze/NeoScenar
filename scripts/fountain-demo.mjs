// Démonstration de l'analyseur Fountain dans le terminal.
// Utilisation : npm run fountain:demo -- chemin/vers/scenario.fountain
// Node 24 exécute directement le TypeScript du module, sans outil supplémentaire.

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  getCharacters,
  getLocations,
  getScenes,
  parse,
  serialize
} from '../packages/fountain/src/index.ts'

const LABELS = {
  action: 'Action',
  parenthetical: 'Didascalie',
  dialogue: 'Dialogue',
  lyrics: 'Paroles',
  transition: 'Transition',
  centered: 'Texte centré',
  page_break: 'Saut de page',
  synopsis: 'Synopsis',
  note: 'Note',
  boneyard: 'Texte mis de côté'
}

function shorten(text, max = 80) {
  const oneLine = text.replace(/\n/g, ' ⏎ ')
  return oneLine.length > max ? `${oneLine.slice(0, max - 1)}…` : oneLine
}

function describe(element, sceneOrder) {
  const forced = element.forced ? ' (forcé)' : ''
  switch (element.type) {
    case 'scene_heading': {
      const { location, time, number } = element.scene
      const parts = [`Scène ${sceneOrder} : ${element.text}${forced}`]
      if (number) parts.push(`numéro : ${number}`)
      parts.push(`lieu : ${location || '(aucun)'}`, `moment : ${time || '(aucun)'}`)
      return `\n${parts.join(' — ')}`
    }
    case 'character': {
      const dual = element.character.dual ? ' — dialogue simultané' : ''
      return `  Personnage : ${element.text}${forced}${dual}`
    }
    case 'section':
      return `\nSection (niveau ${element.section.level}) : ${element.text}`
    case 'parenthetical':
    case 'dialogue':
    case 'lyrics':
      return `    ${LABELS[element.type]} : ${shorten(element.text)}`
    case 'page_break':
      return '  Saut de page'
    default:
      return `  ${LABELS[element.type]}${forced} : ${shorten(element.text)}`
  }
}

const file = process.argv[2]
if (!file) {
  console.error('Indique un fichier : npm run fountain:demo -- chemin/vers/scenario.fountain')
  process.exit(1)
}

let text
try {
  text = readFileSync(resolve(file), 'utf8')
} catch {
  console.error(`Impossible de lire le fichier « ${file} ».`)
  process.exit(1)
}

const started = performance.now()
const doc = parse(text)
const duration = performance.now() - started

console.log(`Fichier : ${file}`)
if (doc.bom) console.log('(le fichier commence par une marque BOM)')
console.log(`Fins de ligne : ${JSON.stringify(doc.lineEnding)}`)

console.log('\n=== Page de titre ===')
if (!doc.titlePage) console.log('(aucune)')
else
  for (const entry of doc.titlePage.entries)
    console.log(`  ${entry.key} : ${entry.value.replace(/\n/g, ' / ')}`)

console.log('\n=== Éléments ===')
let sceneOrder = 0
for (const element of doc.elements) {
  if (element.type === 'scene_heading') sceneOrder++
  console.log(describe(element, sceneOrder))
}

const scenes = getScenes(doc)
console.log(`\n=== Résumé ===`)
console.log(`Nombre de scènes : ${scenes.length}`)
console.log('Personnages :')
for (const character of getCharacters(doc))
  console.log(`  ${character.name} — ${character.lines} réplique(s)`)
console.log('Lieux :')
for (const location of getLocations(doc))
  console.log(`  ${location.name} — ${location.scenes} scène(s)`)

const identical = serialize(doc) === text
console.log(`\nAnalyse en ${duration.toFixed(1)} ms.`)
console.log(
  identical
    ? 'Réécriture : IDENTIQUE à l’original, caractère pour caractère.'
    : 'Réécriture : DIFFÉRENTE de l’original (à signaler !).'
)
process.exitCode = identical ? 0 : 2
