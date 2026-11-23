import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parse } from '@neoscenar/fountain'
import { applyTextChanges } from '../scriptLink/textChanges'
import {
  findRevisionMarks,
  markAt,
  cleanComment,
  commentLines,
  displayedComment,
  planColor,
  planComment,
  planHighlight,
  planRemoveMarks,
  removeAllRevisionMarks,
  revisionMarkerStarts,
  type RevisionColor
} from './revisionMarks'

const EXAMPLE = readFileSync(
  join(
    import.meta.dirname,
    '..',
    '..',
    '..',
    'packages',
    'fountain',
    'tests',
    'exemples',
    'le-dernier-bus.fountain'
  ),
  'utf8'
)

const SMALL = `INT. CUISINE - JOUR #10#

Marie prépare le café.  Paul entre.

MARIE
(doucement)
Bonjour Paul. Tu as bien dormi ?

> COUPE FRANCHE.
`

/** Surligne le texte `target` (première occurrence, ou la n-ième) et renvoie le nouveau texte. */
function highlight(text: string, target: string, color: RevisionColor = 'jaune', from = 0): string {
  const start = text.indexOf(target, from)
  const plan = planHighlight(
    text,
    parse(text, { titlePage: false }),
    { from: start, to: start + target.length },
    color
  )
  if ('error' in plan) throw new Error(plan.error)
  return applyTextChanges(text, plan.changes)
}

function marksOf(text: string) {
  return findRevisionMarks(parse(text, { titlePage: false }))
}

describe('lecture des marques', () => {
  it('reconnaît couleur, commentaire et texte marqué', () => {
    const text = 'Il [[R:rose|Revoir | vite]]pleut[[/R]] fort.\n'
    const [mark] = marksOf(text)
    expect(mark.color).toBe('rose')
    expect(mark.comment).toBe('Revoir | vite')
    expect(text.slice(mark.open.to, mark.close.from)).toBe('pleut')
  })

  it('traite les marques mal formées comme des notes ordinaires', () => {
    expect(marksOf('Il [[R:jaune]]pleut fort.\n')).toEqual([])
    expect(marksOf('Il pleut[[/R]] fort.\n')).toEqual([])
    expect(marksOf('Il [[R:violet]]pleut[[/R]] fort.\n')).toEqual([])
    expect(marksOf('Il [[R:jaune]]pleut\n\nfort[[/R]].\n')).toEqual([])
    // Ouverture orpheline puis marque complète : seule la seconde compte.
    const marks = marksOf('[[R:vert]]Il [[R:bleu]]pleut[[/R]].\n')
    expect(marks.map((mark) => mark.color)).toEqual(['bleu'])
  })

  it('distingue les marqueurs des vraies notes', () => {
    const text = 'Il [[R:jaune]]pleut [[à vérifier]][[/R]].\n'
    const doc = parse(text, { titlePage: false })
    const starts = revisionMarkerStarts(findRevisionMarks(doc))
    const ordinary = doc.elements[0].notes.filter((note) => !starts.has(note.start))
    expect(ordinary.map((note) => note.text)).toEqual(['à vérifier'])
  })
})

describe('surligner', () => {
  it('pose une marque sans les espaces du bord', () => {
    expect(highlight('Il pleut fort.\n', ' pleut ')).toBe('Il [[R:jaune]]pleut[[/R]] fort.\n')
  })

  it('pose une marque par paragraphe autorisé et saute les autres en silence', () => {
    const text = highlight(SMALL, SMALL.slice(0, SMALL.indexOf('COUPE')))
    expect(text).toBe(`INT. CUISINE - JOUR #10#

[[R:jaune]]Marie prépare le café.  Paul entre.[[/R]]

MARIE
[[R:jaune]](doucement)[[/R]]
[[R:jaune]]Bonjour Paul. Tu as bien dormi ?[[/R]]

> COUPE FRANCHE.
`)
  })

  it('refuse une sélection sans paragraphe autorisé', () => {
    const doc = parse(SMALL, { titlePage: false })
    expect(planHighlight(SMALL, doc, { from: 0, to: 10 }, 'jaune')).toEqual({
      error: 'noAllowedParagraph'
    })
    expect(planHighlight(SMALL, doc, { from: 30, to: 30 }, 'jaune')).toEqual({
      error: 'emptySelection'
    })
  })

  it('ne change le type d’aucun élément (Action, Dialogue, Didascalie)', () => {
    const cases = [
      SMALL,
      EXAMPLE,
      'EXT. RUE - NUIT\n\nBANG !\n\nMARIE\n(bas)\nChut.\n(plus fort)\nChut !\n',
      'INT. SALON - JOUR\n\n!SILENCE TOTAL.\n\nPAUL ^\nOui.\n'
    ]
    for (const text of cases) {
      const before = parse(text).elements.map((element) => element.type)
      let marked = text
      // Chaque paragraphe autorisé est surligné en entier, l'un après l'autre.
      for (;;) {
        const doc = parse(marked)
        const element = doc.elements.find(
          (item) =>
            ['action', 'dialogue', 'parenthetical'].includes(item.type) &&
            !item.notes.some((note) => note.text.startsWith('R:'))
        )
        if (!element?.position) break
        const plan = planHighlight(
          marked,
          doc,
          { from: element.position.startOffset, to: element.position.endOffset },
          'vert'
        )
        if ('error' in plan || plan.changes.length === 0) break
        marked = applyTextChanges(marked, plan.changes)
      }
      expect(marked).not.toBe(text)
      expect(parse(marked).elements.map((element) => element.type)).toEqual(before)
    }
  })

  it('ne coupe jamais une note ou un texte mis de côté', () => {
    const text = 'Il [[une note]] pleut /*vieux*/ fort.\n'
    const start = text.indexOf('note')
    const end = text.indexOf('vieux')
    const plan = planHighlight(text, parse(text), { from: start, to: end }, 'bleu')
    if ('error' in plan) throw new Error(plan.error)
    expect(applyTextChanges(text, plan.changes)).toBe(
      'Il [[R:bleu]][[une note]] pleut /*vieux*/[[/R]] fort.\n'
    )
  })

  it('change seulement la couleur d’une sélection entièrement marquée, commentaire gardé', () => {
    const text = 'Il [[R:jaune|À revoir]]pleut fort[[/R]] ce soir.\n'
    expect(highlight(text, 'fort', 'rose')).toBe(
      'Il [[R:rose|À revoir]]pleut fort[[/R]] ce soir.\n'
    )
    // Curseur seul dans la marque : même chose.
    const doc = parse(text)
    const plan = planHighlight(text, doc, { from: 26, to: 26 }, 'vert')
    if ('error' in plan) throw new Error(plan.error)
    expect(applyTextChanges(text, plan.changes)).toContain('[[R:vert|À revoir]]')
  })

  it('fusionne les marques touchées en gardant le premier commentaire', () => {
    const text =
      'Un [[R:jaune]]deux[[/R]] trois [[R:vert|B]]quatre[[/R]] cinq [[R:rose|C]]six[[/R]].\n'
    expect(highlight(text, 'deux[[/R]] trois [[R:vert|B]]qua', 'bleu')).toBe(
      'Un [[R:bleu|B]]deux trois quatre[[/R]] cinq [[R:rose|C]]six[[/R]].\n'
    )
  })
})

describe('commenter et effacer', () => {
  it('ajoute, modifie et retire un commentaire sur une ligne du fichier, sans crochets', () => {
    const text = 'Il [[R:jaune]]pleut[[/R]].\n'
    const [mark] = marksOf(text)
    const commented = applyTextChanges(text, [planComment(mark, ' Trop  [court]\nici ')])
    expect(commented).toBe('Il [[R:jaune|Trop (court) ¶ ici]]pleut[[/R]].\n')
    const [again] = marksOf(commented)
    expect(applyTextChanges(commented, [planComment(again, '')])).toBe(text)
  })

  it('efface une marque et garde la règle des espaces de 13A', () => {
    const text = 'Il [[R:jaune]]pleut[[/R]] fort.\n\nIl [[R:rose]] [[/R]] neige.\n'
    const doc = parse(text)
    const marks = findRevisionMarks(doc)
    expect(applyTextChanges(text, planRemoveMarks(text, doc, [marks[0]]))).toBe(
      'Il pleut fort.\n\nIl [[R:rose]] [[/R]] neige.\n'
    )
    expect(removeAllRevisionMarks(text)).toBe('Il pleut fort.\n\nIl neige.\n')
    expect(markAt(marks, text.indexOf('pleut'))).toBe(marks[0])
  })

  it('surligner, commenter puis tout effacer redonne le fichier à l’octet près', () => {
    for (const original of [EXAMPLE, SMALL, EXAMPLE.replace(/\n/g, '\r\n'), '﻿' + SMALL]) {
      let text = original
      const body = text.indexOf('INT.')
      // Plusieurs sélections au hasard (mais reproductibles) dans tout le texte, puis des commentaires.
      for (let i = 0; i < 40; i++) {
        const from = body + ((i * 7919) % (text.length - body))
        const to = Math.min(text.length, from + 5 + ((i * 104729) % 60))
        const doc = parse(text)
        const plan = planHighlight(
          text,
          doc,
          { from, to },
          (['jaune', 'vert', 'rose', 'bleu'] as const)[i % 4]
        )
        if (!('error' in plan)) text = applyTextChanges(text, plan.changes)
      }
      const marks = findRevisionMarks(parse(text))
      expect(marks.length).toBeGreaterThan(original.length > 1000 ? 10 : 2)
      for (const mark of [...marks].reverse().filter((_, i) => i % 2 === 0)) {
        text = applyTextChanges(text, [planComment(mark, `Commentaire ${mark.open.from}`)])
      }
      expect(removeAllRevisionMarks(text)).toBe(original)
    }
  })
})

describe('commentaire sur plusieurs lignes (18C-9)', () => {
  it('chaque retour à la ligne devient « ¶ », jamais de ligne vide ni de « ¶ » au bord', () => {
    expect(cleanComment('ligne 1\nligne 2')).toBe('ligne 1 ¶ ligne 2')
    expect(cleanComment('\n\n  un  \n\n\n  deux \r\n trois\n')).toBe('un ¶ deux ¶ trois')
    expect(cleanComment('a\r\rb')).toBe('a ¶ b')
    expect(cleanComment(' \n \n ')).toBe('')
    expect(cleanComment('voir [p. 3]\n[ici]')).toBe('voir (p. 3) ¶ (ici)')
    // Un « ¶ » tapé à la main compte comme un retour à la ligne.
    expect(cleanComment('a¶¶ b ¶')).toBe('a ¶ b')
    expect(cleanComment('une seule ligne')).toBe('une seule ligne')
  })

  it('« ¶ », avec ou sans espaces, se lit comme un retour à la ligne', () => {
    expect(commentLines('a ¶ b')).toEqual(['a', 'b'])
    expect(commentLines('a¶b  ¶c')).toEqual(['a', 'b', 'c'])
    expect(commentLines('¶ a ¶¶ ')).toEqual(['a'])
    expect(displayedComment('Revoir ¶ le ton')).toBe('Revoir\nle ton')
    expect(displayedComment('')).toBe('')
    // Aller-retour : ce qu'affiche la fenêtre, une fois enregistré, redonne le même texte.
    expect(cleanComment(displayedComment('a ¶ b ¶ c'))).toBe('a ¶ b ¶ c')
  })

  it('le commentaire écrit reste sur une ligne du fichier et se relit', () => {
    const text = 'Il [[R:vert]]pleut[[/R]].\n'
    const [mark] = marksOf(text)
    const commented = applyTextChanges(text, [planComment(mark, 'Trop court\n\nà revoir')])
    expect(commented).toBe('Il [[R:vert|Trop court ¶ à revoir]]pleut[[/R]].\n')
    expect(commented.split('\n')).toHaveLength(2)
    expect(marksOf(commented)[0].comment).toBe('Trop court ¶ à revoir')
  })
})

describe('changer la couleur (18C-9)', () => {
  it('réécrit seulement le mot de la couleur, commentaire gardé', () => {
    const text = 'Il [[R:jaune|Revoir ¶ le ton]]pleut[[/R]] et [[R:bleu]]vente[[/R]].\n'
    const [first, second] = marksOf(text)
    const change = planColor(text, first, 'rose')
    expect(change).toEqual({
      from: text.indexOf('jaune'),
      to: text.indexOf('jaune') + 5,
      insert: 'rose'
    })
    const recolored = applyTextChanges(text, [change!])
    expect(recolored).toBe('Il [[R:rose|Revoir ¶ le ton]]pleut[[/R]] et [[R:bleu]]vente[[/R]].\n')
    expect(marksOf(recolored).map((mark) => [mark.color, mark.comment])).toEqual([
      ['rose', 'Revoir ¶ le ton'],
      ['bleu', '']
    ])
    expect(applyTextChanges(text, [planColor(text, second, 'vert')!])).toBe(
      'Il [[R:jaune|Revoir ¶ le ton]]pleut[[/R]] et [[R:vert]]vente[[/R]].\n'
    )
  })

  it('rien à faire pour la même couleur', () => {
    const text = 'Il [[R:jaune]]pleut[[/R]].\n'
    expect(planColor(text, marksOf(text)[0], 'jaune')).toBeNull()
  })
})
