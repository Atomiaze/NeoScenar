import { parse } from '@neoscenar/fountain'
import { describe, expect, it } from 'vitest'
import {
  insertHeadings,
  moveSceneBlock,
  placeForNumber,
  removeSceneBlock,
  renumberHeadings,
  restoreSceneBlock,
  rewriteHeading,
  scenePlace,
  writtenLineCount
} from './cardTextEdits'
import { applyTextChanges, type TextChange } from './textChanges'

const n = (number: number, letter = ''): { number: number; letter: string } => ({ number, letter })

/** Éléments relus par Fountain : type et texte. */
const elements = (text: string): string[] =>
  parse(text, { titlePage: false }).elements.map((element) => `${element.type}:${element.text}`)

const apply = (text: string, change: TextChange | TextChange[] | null): string =>
  applyTextChanges(text, change === null ? [] : Array.isArray(change) ? change : [change])

const SCRIPT = [
  'INT. A - JOUR #10#',
  '',
  'Action A.',
  '',
  'INT. B - JOUR #20#',
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

describe('insérer des en-têtes', () => {
  it('à la fin du bloc de la scène précédente, avant la section suivante', () => {
    const next = apply(
      SCRIPT,
      insertHeadings(SCRIPT, { after: n(20) }, [{ heading: '', number: n(25) }])
    )
    expect(next).toContain('Bonjour.\n\n.SCÈNE À ÉCRIRE #25#\n\n# ACTE 2')
    // Tout le reste est relu à l'identique.
    expect(elements(next).filter((item) => !item.includes('SCÈNE À ÉCRIRE'))).toEqual(
      elements(SCRIPT)
    )
    expect(elements(next)).toContain('scene_heading:SCÈNE À ÉCRIRE')
  })

  it('point de forçage seulement si nécessaire ; en-tête mis en majuscules', () => {
    const change = insertHeadings(SCRIPT, 'end', [
      { heading: 'int. cuisine - jour', number: n(40) },
      { heading: 'Cuisine', number: n(50) }
    ])
    const next = apply(SCRIPT, change)
    expect(next.endsWith('Action C.\n\nINT. CUISINE - JOUR #40#\n\n.CUISINE #50#\n')).toBe(true)
    expect(elements(next).slice(-2)).toEqual([
      'scene_heading:INT. CUISINE - JOUR',
      'scene_heading:CUISINE'
    ])
  })

  it('avant la première scène, après le texte qui la précède', () => {
    const text = `Titre de travail.\n\n${SCRIPT}`
    const next = apply(text, insertHeadings(text, 'start', [{ heading: 'INT. X', number: n(5) }]))
    expect(next.startsWith('Titre de travail.\n\nINT. X #5#\n\nINT. A - JOUR #10#')).toBe(true)
  })

  it('scène de référence absente du texte : rien', () => {
    expect(insertHeadings(SCRIPT, { after: n(99) }, [{ heading: '', number: n(100) }])).toBeNull()
  })

  it('texte vide, et texte sans fin de ligne finale', () => {
    expect(apply('', insertHeadings('', 'end', [{ heading: '', number: n(10) }]))).toBe(
      '.SCÈNE À ÉCRIRE #10#\n'
    )
    const text = 'INT. A #10#\n\nAction.'
    expect(apply(text, insertHeadings(text, 'end', [{ heading: '', number: n(20) }]))).toBe(
      'INT. A #10#\n\nAction.\n\n.SCÈNE À ÉCRIRE #20#'
    )
  })

  it('place qui correspond à un numéro (recréer l’en-tête d’une orpheline)', () => {
    expect(placeForNumber(SCRIPT, n(25))).toEqual({ after: n(20) })
    expect(placeForNumber(SCRIPT, n(5))).toBe('start')
  })
})

describe('supprimer et restituer un bloc', () => {
  it.each([10, 20, 30])('S_00%i : retiré, puis restitué à l’identique', (number) => {
    const removed = removeSceneBlock(SCRIPT, n(number))!
    const without = apply(SCRIPT, removed.change)
    expect(without).not.toContain(`#${number}#`)
    // Ce qui reste est relu à l'identique, sans les éléments de la scène.
    const others = elements(without)
    expect(others.every((item) => elements(SCRIPT).includes(item))).toBe(true)
    expect(apply(without, restoreSceneBlock(without, removed))).toBe(SCRIPT)
  })

  it('le texte retiré est gardé pour l’annulation', () => {
    const removed = removeSceneBlock(SCRIPT, n(20))!
    expect(removed.text).toBe('INT. B - JOUR #20#\n\nMARIE\nBonjour.')
    expect(removed.place).toEqual({ beforeSection: { title: 'ACTE 2', occurrence: 0 } })
    expect(removeSceneBlock(SCRIPT, n(10))!.place).toEqual({ before: n(20) })
    expect(removeSceneBlock(SCRIPT, n(30))!.place).toBe('end')
  })

  it('en-tête forcé collé à la ligne précédente : une ligne vide reste entre les voisins', () => {
    const text = 'INT. A #10#\n\nAction.\n.FORCÉ #20#\n\nIci.\n\nINT. C #30#\n'
    const without = apply(text, removeSceneBlock(text, n(20))!.change)
    expect(without).toBe('INT. A #10#\n\nAction.\n\nINT. C #30#\n')
  })

  it('restitution quand la scène de référence a disparu entre-temps : à la fin', () => {
    const removed = removeSceneBlock(SCRIPT, n(20))!
    const text = 'INT. Z #90#\n\nAction.\n'
    expect(apply(text, restoreSceneBlock(text, removed))).toBe(
      'INT. Z #90#\n\nAction.\n\nINT. B - JOUR #20#\n\nMARIE\nBonjour.\n'
    )
  })

  it('scène absente : rien', () => {
    expect(removeSceneBlock(SCRIPT, n(99))).toBeNull()
  })
})

describe('déplacer un bloc', () => {
  it('S_0010 après S_0030, avec son nouveau numéro ; la section ne bouge pas', () => {
    const next = apply(SCRIPT, moveSceneBlock(SCRIPT, n(10), { after: n(30) }, n(40)))
    expect(next).toBe(
      [
        'INT. B - JOUR #20#',
        '',
        'MARIE',
        'Bonjour.',
        '',
        '# ACTE 2',
        '',
        'INT. C - JOUR #30#',
        '',
        'Action C.',
        '',
        'INT. A - JOUR #40#',
        '',
        'Action A.',
        ''
      ].join('\n')
    )
  })

  it('S_0030 au début, puis annulation : retour exact à sa place, après la section', () => {
    const place = scenePlace(SCRIPT, n(30))!
    const moved = apply(SCRIPT, moveSceneBlock(SCRIPT, n(30), 'start', n(5)))
    expect(moved.startsWith('INT. C - JOUR #5#\n\nAction C.\n\nINT. A - JOUR #10#')).toBe(true)
    expect(moved.endsWith('Bonjour.\n\n# ACTE 2\n')).toBe(true)
    expect(apply(moved, moveSceneBlock(moved, n(5), place, n(30)))).toBe(SCRIPT)
  })

  it('« après S_0020 » : à la fin du bloc de S_0020, donc avant la section suivante', () => {
    const moved = apply(SCRIPT, moveSceneBlock(SCRIPT, n(10), { after: n(20) }, n(25)))
    expect(moved).toContain('Bonjour.\n\nINT. A - JOUR #25#\n\nAction A.\n\n# ACTE 2')
  })

  it('scène seule dans son acte : supprimée puis restituée dans le même acte', () => {
    const text =
      '# ACTE 1\n\nINT. A #10#\n\nUn.\n\n# ACTE 2\n\nINT. B #20#\n\nDeux.\n\n# ACTE 3\n\nINT. C #30#\n'
    const removed = removeSceneBlock(text, n(20))!
    const without = apply(text, removed.change)
    expect(without).toBe('# ACTE 1\n\nINT. A #10#\n\nUn.\n\n# ACTE 2\n\n# ACTE 3\n\nINT. C #30#\n')
    expect(apply(without, restoreSceneBlock(without, removed))).toBe(text)
  })

  it('les deux modifications ne touchent pas au texte situé entre les deux', () => {
    const changes = moveSceneBlock(SCRIPT, n(10), 'end')
    expect(changes).toHaveLength(2)
    const middle = SCRIPT.indexOf('MARIE')
    expect(changes.every((change) => change.to <= middle || change.from > middle)).toBe(true)
  })

  it('même place : seul le numéro change, ou rien', () => {
    expect(moveSceneBlock(SCRIPT, n(20), { after: n(10) })).toEqual([])
    const renumbered = apply(SCRIPT, moveSceneBlock(SCRIPT, n(20), { after: n(10) }, n(15)))
    expect(renumbered).toBe(SCRIPT.replace('#20#', '#15#'))
  })
})

describe('en-têtes et numéros', () => {
  it('réécrire l’en-tête garde le numéro et retire le forçage devenu inutile', () => {
    const text = '.SCÈNE À ÉCRIRE #25#\n\nAction.\n'
    const next = apply(text, rewriteHeading(text, n(25), 'ext. jardin - nuit'))
    expect(next).toBe('EXT. JARDIN - NUIT #25#\n\nAction.\n')
    expect(rewriteHeading(next, n(25), 'EXT. JARDIN - NUIT')).toBeNull()
    expect(apply(next, rewriteHeading(next, n(25), 'Jardin'))).toBe('.JARDIN #25#\n\nAction.\n')
  })

  it('renuméroter tous les #…# en une seule fois', () => {
    const next = apply(
      SCRIPT,
      renumberHeadings(SCRIPT, [
        { from: n(10), to: n(10) },
        { from: n(20), to: n(30) },
        { from: n(30), to: n(40, 'A') }
      ])
    )
    expect(next).toContain('INT. B - JOUR #30#')
    expect(next).toContain('INT. C - JOUR #40A#')
  })

  it('compte les lignes écrites sous un en-tête', () => {
    expect(writtenLineCount(SCRIPT, n(20))).toBe(2)
    expect(writtenLineCount('.SCÈNE À ÉCRIRE #25#\n\n', n(25))).toBe(0)
  })
})
