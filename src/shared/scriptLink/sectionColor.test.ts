import { describe, expect, it } from 'vitest'
import { paginate, parse, resolveLayout, type LayoutProfile } from '@neoscenar/fountain'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  chosenSectionColors,
  sectionColorNotes,
  sectionColorRanges,
  setSectionColor
} from './sectionColor'
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
const apply = (text: string, from: number, hex: string | null): string => {
  const change = setSectionColor(text, from, hex)
  return change ? applyTextChanges(text, [change]) : text
}

const SCRIPT =
  '# ACTE 1\n\nINT. A - JOUR #10#\n\nAction A.\n\n# ACTE 2\n= Résumé.\n\nINT. B - JOUR #20#\n\nAction B.\n'

describe('couleur d’une section', () => {
  it('lit la note, tolérante : casse, espaces, deux-points, hex en 3 ou 6 chiffres', () => {
    for (const note of [
      '[[COULEUR #2463EB]]',
      '[[ couleur : #2463eb ]]',
      '[[Couleur #26E]]'.replace('#26E', '#2463eb')
    ]) {
      const text = `# A\n${note}\n\nINT. X - JOUR\n`
      expect([...chosenSectionColors(parseBody(text)).values()]).toEqual(['#2463EB'])
    }
    const short = '# A\n[[COULEUR #26e]]\n'
    expect([...chosenSectionColors(parseBody(short)).values()]).toEqual(['#2266EE'])
  })

  it('lit la note avant ou après le synopsis ; une couleur illisible = automatique', () => {
    const after = '# A\n= Résumé.\n[[COULEUR #FF0000]]\n'
    expect([...chosenSectionColors(parseBody(after)).values()]).toEqual(['#FF0000'])
    const bad = '# A\n[[COULEUR rouge]]\n'
    expect(chosenSectionColors(parseBody(bad)).size).toBe(0)
    expect(sectionColorNotes(parseBody(bad)).size).toBe(0)
  })

  it('n’est pas masquée ailleurs que sous une ligne de section', () => {
    const text = 'INT. A - JOUR\n[[COULEUR #FF0000]]\n\nAction.\n'
    expect(sectionColorNotes(parseBody(text)).size).toBe(0)
    const orphan = '# A\n\nAction.\n\n[[COULEUR #FF0000]]\n'
    expect(sectionColorNotes(parseBody(orphan)).size).toBe(0)
  })

  it('écrit la note juste sous la ligne de section, en majuscules, et la retire', () => {
    const colored = apply(SCRIPT, SCRIPT.indexOf('# ACTE 2'), '#2463eb')
    expect(colored).toContain('# ACTE 2\n[[COULEUR #2463EB]]\n= Résumé.')
    expect(apply(colored, colored.indexOf('# ACTE 2'), null)).toBe(SCRIPT)
    // Changer remplace sans doubler.
    const changed = apply(colored, colored.indexOf('# ACTE 2'), '#FF4D4D')
    expect(changed.match(/COULEUR/g)).toHaveLength(1)
    expect(apply(changed, changed.indexOf('# ACTE 2'), null)).toBe(SCRIPT)
    // Rien à retirer, ou même couleur : aucun changement.
    expect(setSectionColor(SCRIPT, 0, null)).toBeNull()
    expect(setSectionColor(colored, colored.indexOf('# ACTE 2'), '#2463EB')).toBeNull()
  })

  it('fonctionne sur une section en fin de texte, sans fin de ligne', () => {
    const colored = apply('# A', 0, '#FF0000')
    expect(colored).toBe('# A\n[[COULEUR #FF0000]]')
    expect(apply(colored, 0, null)).toBe('# A')
  })

  it('remplace une note placée après le synopsis par une note sous la ligne de section', () => {
    const text = '# A\n= Résumé.\n[[COULEUR #FF0000]]\n'
    const result = apply(text, 0, '#00C46A')
    expect(result).toBe('# A\n[[COULEUR #00C46A]]\n= Résumé.\n')
  })

  it('ne change pas la pagination : une note ne prend aucune ligne', () => {
    const colored = apply(SCRIPT, SCRIPT.indexOf('# ACTE 2'), '#2463EB')
    // Mêmes pages, aux positions dans le texte et aux numéros d'éléments près (la note en ajoute un).
    const ignored = ['sourceLine', 'sourceOffset', 'elementIndex', 'elementPages', 'layouts']
    const pages = (text: string): string =>
      JSON.stringify(paginate(parseBody(text), layout).pages, (key, value) =>
        ignored.includes(key) ? undefined : value
      )
    expect(pages(colored)).toBe(pages(SCRIPT))
  })

  it('donne la plage à masquer : la ligne de la note, fin de ligne comprise', () => {
    const colored = apply(SCRIPT, SCRIPT.indexOf('# ACTE 2'), '#2463EB')
    const [range] = sectionColorRanges(parseBody(colored), colored)
    expect(colored.slice(range.from, range.to)).toBe('[[COULEUR #2463EB]]\n')
  })
})
