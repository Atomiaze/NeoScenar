// Outil de développement : écrit les planches et le storyboard du projet d'essai, dans les trois
// formats (16:9, 2,39:1, 9:16), avec leurs fichiers d'impression.
// Utilisation : npm run pdf:storyboard:exemple → out/storyboard-exemple/

import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { exportStoryboardPdf } from '../packages/pdf-storyboard/src/index.ts'
import { exampleInput, FORMATS } from '../packages/pdf-storyboard/tests/fixtures.ts'

const OUT = join(import.meta.dirname, '..', 'out', 'storyboard-exemple')
mkdirSync(OUT, { recursive: true })

for (const format of Object.keys(FORMATS)) {
  for (const kind of ['planches', 'storyboard']) {
    const result = await exportStoryboardPdf(exampleInput(format, kind))
    const name = `${kind}-${format}`
    writeFileSync(join(OUT, `${name}.pdf`), result.pdf)
    writeFileSync(
      join(OUT, `${name}-impression.json`),
      `${JSON.stringify(result.printRecord, null, 2)}\n`
    )
    console.log(`${name}.pdf : ${result.printRecord.pages.length} pages`)
  }
}
console.log(`Fichiers écrits dans ${OUT}`)
