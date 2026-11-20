// Outil de développement : écrit le PDF d'un scénario, pour le comparer au PDF de KIT.
// Utilisation : npm run pdf:exemple [-- chemin/vers/scenario.fountain [--numeroter] [--suite] [--actes]]
// Par défaut : le scénario d'exemple « Le Dernier Bus » → out/le-dernier-bus-neoscenar.pdf

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, extname, join, resolve } from 'node:path'
import { paginate, parse, resolveLayout } from '../packages/fountain/src/index.ts'
import { exportScenarioPdf } from '../packages/pdf-scenario/src/index.ts'

const ROOT = join(import.meta.dirname, '..')
const FONTS = join(ROOT, 'resources', 'polices', 'courier-prime')
const args = process.argv.slice(2)
const file =
  args.find((arg) => !arg.startsWith('--')) ??
  join(ROOT, 'packages', 'fountain', 'tests', 'exemples', 'le-dernier-bus.fountain')

const font = (name) => new Uint8Array(readFileSync(join(FONTS, `CourierPrime-${name}.ttf`)))
const layout = resolveLayout(
  JSON.parse(readFileSync(join(ROOT, 'resources', 'mise-en-page', 'final-draft-a4.json'), 'utf8'))
)
const document = parse(readFileSync(resolve(file), 'utf8'))
const bytes = await exportScenarioPdf({
  document,
  pagination: paginate(document, layout, {
    continued: args.includes('--suite'),
    newPageForActs: args.includes('--actes')
  }),
  layout,
  fonts: {
    regular: font('Regular'),
    bold: font('Bold'),
    italic: font('Italic'),
    boldItalic: font('BoldItalic')
  },
  options: {
    pageDeTitre: true,
    numerotation: args.includes('--numeroter') ? 'continue' : 'fountain'
  }
})

// Nom sans accent ni espace : « Mon scénario.fountain » → « mon-scenario-neoscenar.pdf ».
const name = basename(file, extname(file))
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .replace(/[^A-Za-z0-9]+/g, '-')
  .toLowerCase()
const output = join(ROOT, 'out', `${name}-neoscenar.pdf`)
mkdirSync(join(ROOT, 'out'), { recursive: true })
writeFileSync(output, bytes)
console.log(`PDF écrit : ${output}`)
