import { describe, expect, it } from 'vitest'
import {
  estimateDurations,
  paginate,
  parse,
  resolveLayout,
  type LayoutProfile
} from '@neoscenar/fountain'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { draftBlocks, draftHeadings, isDraftScene, setDraft, withoutDrafts } from './draftScene'
import { applyTextChanges } from './textChanges'

const layout = resolveLayout(
  JSON.parse(
    readFileSync(
      join(
        import.meta.dirname,
        '..',
        '..',
        '..',
        'resources',
        'mise-en-page',
        'final-draft-a4.json'
      ),
      'utf8'
    )
  ) as LayoutProfile
)
const parseBody = (text: string) => parse(text, { titlePage: false })

const SCRIPT = [
  '# ACTE 1',
  '',
  'INT. A - JOUR #10#',
  '',
  'Action A.',
  '',
  'INT. B - JOUR #20#',
  '[[BROUILLON]]',
  '',
  '= Une idée.',
  '',
  'Action B.',
  '',
  'MARIE',
  'Bonjour.',
  '',
  '# ACTE 2',
  '',
  'INT. C - JOUR #30#',
  '',
  'Action C.',
  ''
].join('\n')

const headingFrom = (text: string, heading: string): number => text.indexOf(heading)

describe('scènes brouillon', () => {
  it('reconnaît la note sous l’en-tête, sans tenir compte de la casse ni des espaces', () => {
    expect(draftHeadings(parseBody(SCRIPT)).size).toBe(1)
    const loose = SCRIPT.replace('[[BROUILLON]]', '[[ brouillon  ]]')
    expect(isDraftScene(loose, headingFrom(loose, 'INT. B'))).toBe(true)
    // Après le synopsis, ou après une ligne vide : toujours lue.
    const later = 'INT. B - JOUR #20#\n\n= Une idée.\n\n[[Brouillon]]\n\nAction B.\n'
    expect(isDraftScene(later, 0)).toBe(true)
  })

  it('ne confond pas une autre note ou une note au milieu de la scène', () => {
    expect(isDraftScene('INT. B - JOUR\n[[À revoir]]\n\nAction.\n', 0)).toBe(false)
    expect(isDraftScene('INT. B - JOUR\n\nAction.\n\n[[BROUILLON]]\n', 0)).toBe(false)
    expect(isDraftScene('INT. B - JOUR\n[[BROUILLON]] et la suite\n', 0)).toBe(false)
  })

  it('le bloc va de l’en-tête jusqu’à l’acte suivant', () => {
    const [block] = draftBlocks(parseBody(SCRIPT), SCRIPT.length)
    expect(SCRIPT.slice(block.from, block.to)).toBe(
      'INT. B - JOUR #20#\n[[BROUILLON]]\n\n= Une idée.\n\nAction B.\n\nMARIE\nBonjour.\n\n'
    )
    const last = SCRIPT.replace('INT. C - JOUR #30#', 'INT. C - JOUR #30#\n[[BROUILLON]]')
    const blocks = draftBlocks(parseBody(last), last.length)
    expect(blocks[1].to).toBe(last.length)
  })

  it('marquer puis démarquer rend le texte d’origine', () => {
    const plain = SCRIPT.replace('[[BROUILLON]]\n', '')
    const marked = applyTextChanges(plain, [setDraft(plain, headingFrom(plain, 'INT. B'), true)!])
    expect(marked).toBe(SCRIPT)
    expect(setDraft(marked, headingFrom(marked, 'INT. B'), true)).toBeNull()
    const unmarked = applyTextChanges(marked, [
      setDraft(marked, headingFrom(marked, 'INT. B'), false)!
    ])
    expect(unmarked).toBe(plain)
    expect(setDraft(plain, headingFrom(plain, 'INT. B'), false)).toBeNull()
  })

  it('démarquer une note écrite ailleurs entre deux lignes vides', () => {
    const text = 'INT. B - JOUR\n\n[[brouillon]]\n\nAction.\n'
    expect(applyTextChanges(text, [setDraft(text, 0, false)!])).toBe('INT. B - JOUR\n\nAction.\n')
  })

  it('marquer un en-tête sur la dernière ligne', () => {
    const text = 'INT. A - JOUR\n\nAction.\n\nINT. B - JOUR'
    const marked = applyTextChanges(text, [setDraft(text, headingFrom(text, 'INT. B'), true)!])
    expect(marked).toBe(`${text}\n[[BROUILLON]]`)
    expect(isDraftScene(marked, headingFrom(marked, 'INT. B'))).toBe(true)
  })

  it('sans brouillon, le document est le même', () => {
    const doc = parseBody(SCRIPT.replace('[[BROUILLON]]\n', ''))
    expect(withoutDrafts(doc)).toBe(doc)
  })

  it('pagination et durée = celles du texte sans la scène', () => {
    const doc = parseBody(SCRIPT)
    const printed = withoutDrafts(doc)
    const [block] = draftBlocks(doc, SCRIPT.length)
    const removed = parseBody(SCRIPT.slice(0, block.from) + SCRIPT.slice(block.to))
    const a = paginate(printed, layout)
    const b = paginate(removed, layout)
    expect(a.pages.map((page) => page.usedLines)).toEqual(b.pages.map((page) => page.usedLines))
    expect(estimateDurations(printed, a).totalSeconds).toBe(
      estimateDurations(removed, b).totalSeconds
    )
    expect(printed.elements.some((element) => element.text === 'Action B.')).toBe(false)
    expect(printed.elements.some((element) => element.text === 'Action C.')).toBe(true)
  })
})
