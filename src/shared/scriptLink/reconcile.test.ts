import { describe, expect, it } from 'vitest'
import { counterIds } from '../decoupage/testFixtures'
import { readScriptScenes } from './scriptScenes'
import { reconcile } from './reconcile'
import { cards, labels, run, script } from './testHelpers'

const numbersInText = (text: string): (string | null)[] =>
  readScriptScenes(text).map((scene) => scene.rawNumber)

describe('rapprochement : cas ordinaires', () => {
  it('rien à faire : même découpage, aucune modification du texte', () => {
    const decoupage = cards(['10', '20'])
    const result = reconcile(
      script('INT. A - JOUR #10#', 'INT. B - JOUR #20#'),
      decoupage,
      {},
      counterIds()
    )
    expect(result.textChanges).toEqual([])
    // Les en-têtes des cartes prennent ceux du texte : ici ils changent (vides au départ).
    expect(result.decoupage.scenes.map((scene) => scene.heading)).toEqual([
      'INT. A - JOUR',
      'INT. B - JOUR'
    ])
  })

  it('nouvel en-tête entre S_0020 et S_0030 : il devient S_0025, avec une carte à sa place', () => {
    const ids = counterIds('n')
    const text = script('INT. A #10#', 'INT. B #20#', 'INT. NOUVELLE - JOUR', 'INT. C #30#')
    const { text: next, result } = run(text, cards(['10', '20', '30']), ids)
    expect(numbersInText(next)).toEqual(['10', '20', '25', '30'])
    expect(next).toContain('INT. NOUVELLE - JOUR #25#\n')
    expect(labels(result.decoupage)).toEqual(['S_0010', 'S_0020', 'S_0025', 'S_0030'])
    const created = result.decoupage.scenes[2]
    expect(created.heading).toBe('INT. NOUVELLE - JOUR')
    expect(created.shots.map((shot) => [shot.number, shot.letter])).toEqual([[10, '']])
    expect(result.summary.numbered).toEqual(['S_0025'])
    expect(result.summary.created).toEqual(['S_0025'])
  })

  it('couper S_0020 et la recoller après S_0050 : la carte suit et devient S_0055', () => {
    const decoupage = cards(['10', '20*', '30', '40', '50', '60'])
    const text = script(
      'INT. A #10#',
      'INT. C #30#',
      'INT. D #40#',
      'INT. E #50#',
      'INT. B #20#',
      'INT. F #60#'
    )
    const { text: next, result } = run(text, decoupage, counterIds())
    expect(numbersInText(next)).toEqual(['10', '30', '40', '50', '55', '60'])
    const moved = result.decoupage.scenes[4]
    expect(moved.id).toBe('S20')
    expect(moved.shots[0].id).toBe('S20-P10')
    expect(labels(result.decoupage)).toEqual([
      'S_0010',
      'S_0030',
      'S_0040',
      'S_0050',
      'S_0055',
      'S_0060'
    ])
    expect(result.summary.moved).toEqual([{ from: 'S_0020', to: 'S_0055' }])
  })

  it('même chose avec les numéros verrouillés : la scène garde S_0020, hors de l’ordre', () => {
    const decoupage = cards(['10', '20*', '30', '40', '50', '60'], { locked: true })
    const text = script(
      'INT. A #10#',
      'INT. C #30#',
      'INT. D #40#',
      'INT. E #50#',
      'INT. B #20#',
      'INT. F #60#'
    )
    const { text: next, result } = run(text, decoupage, counterIds())
    expect(next).toBe(text)
    expect(labels(result.decoupage)).toEqual([
      'S_0010',
      'S_0030',
      'S_0040',
      'S_0050',
      'S_0020',
      'S_0060'
    ])
  })

  it('verrouillé : une nouvelle scène entre deux numéros hors de l’ordre prend une lettre libre', () => {
    const decoupage = cards(['10', '50', '20'], { locked: true })
    const text = script('INT. A #10#', 'INT. E #50#', 'INT. NOUVELLE', 'INT. B #20#')
    const { text: next } = run(text, decoupage, counterIds())
    expect(numbersInText(next)).toEqual(['10', '50', '50A', '20'])
  })

  it('copier-coller : la copie collée reçoit un nouveau numéro et une carte neuve', () => {
    const decoupage = cards(['10', '20*', '30'])
    const base = script('INT. A #10#', 'INT. B #20#', 'INT. C #30#')
    const copy = 'INT. B #20#\n\nAction 2.\n'
    const text = `${base}\n${copy}`
    const pasted = { from: base.length + 1, to: text.length }
    const ids = counterIds('n')
    const { text: next, result } = run(text, decoupage, ids, { insertedRanges: [pasted] })
    expect(numbersInText(next)).toEqual(['10', '20', '30', '40'])
    expect(result.decoupage.scenes[1].id).toBe('S20')
    const fresh = result.decoupage.scenes[3]
    expect(fresh.id).toMatch(/^n-/)
    expect(fresh.shots).toHaveLength(1)
    expect(fresh.name).toBe('')
    expect(result.summary.duplicates).toEqual([{ written: '20', number: 'S_0040' }])
  })

  it('copie collée avant l’original : c’est quand même la copie qui change de numéro', () => {
    const decoupage = cards(['10', '20*', '30'])
    const copy = 'INT. B #20#\n\nAction 2.\n\n'
    const base = script('INT. A #10#', 'INT. B #20#', 'INT. C #30#')
    const at = base.indexOf('INT. B')
    const text = base.slice(0, at) + copy + base.slice(at)
    const { text: next, result } = run(text, decoupage, counterIds(), {
      insertedRanges: [{ from: at, to: at + copy.length }]
    })
    expect(numbersInText(next)).toEqual(['10', '15', '20', '30'])
    expect(result.decoupage.scenes[2].id).toBe('S20')
  })

  it('doublon à l’ouverture d’un fichier : la première dans l’ordre du texte garde le numéro', () => {
    const text = script('INT. A #10#', 'INT. B #20#', 'INT. B BIS #20#', 'INT. C #30#')
    const { text: next, result } = run(text, cards(['10', '20*', '30']), counterIds())
    expect(numbersInText(next)).toEqual(['10', '20', '25', '30'])
    expect(result.decoupage.scenes[1].id).toBe('S20')
  })

  it('numéros invalides : remplacés et signalés', () => {
    const text = script('INT. A #10#', 'INT. B #3.1#', 'INT. C #0030#', 'INT. D #A2#')
    const { text: next, result } = run(text, cards(['10']), counterIds())
    expect(numbersInText(next)).toEqual(['10', '20', '30', '40'])
    expect(result.summary.corrected).toEqual([
      { written: '3.1', number: 'S_0020' },
      { written: '0030', number: 'S_0030' },
      { written: 'A2', number: 'S_0040' }
    ])
  })

  it('le champ en-tête de la carte suit le texte, et reste vide pour l’en-tête provisoire', () => {
    const { result } = run(
      script('.SCÈNE À ÉCRIRE #10#', '.CUISINE DE MARIE #20#'),
      cards(['10', '20']),
      counterIds()
    )
    expect(result.decoupage.scenes.map((scene) => scene.heading)).toEqual(['', 'CUISINE DE MARIE'])
  })
})

describe('rapprochement : scènes qui disparaissent', () => {
  const before = script('INT. A #10#', 'INT. B #20#', 'INT. C #30#')
  const without = script('INT. A #10#', 'INT. C #30#')

  it('carte vide : supprimée', () => {
    const { result } = run(without, cards(['10', '20', '30']), counterIds())
    expect(labels(result.decoupage)).toEqual(['S_0010', 'S_0030'])
    expect(result.summary.deleted).toEqual(['S_0020'])
    expect(result.orphanIds).toEqual([])
  })

  it('carte avec du contenu : orpheline, à sa place d’après son numéro ; elle se reconnecte', () => {
    const decoupage = cards(['10', '20*', '30'])
    const { result } = run(without, decoupage, counterIds())
    expect(labels(result.decoupage)).toEqual(['S_0010', 'S_0020', 'S_0030'])
    expect(result.orphanIds).toEqual(['S20'])
    expect(result.summary.orphaned).toEqual(['S_0020'])
    expect(result.decoupage.scenes[1].orphan).toBe(true)

    // Annuler dans l'éditeur : l'en-tête revient avec son numéro, la carte se reconnecte.
    const back = run(before, result.decoupage, counterIds())
    expect(back.result.orphanIds).toEqual([])
    const reconnected = back.result.decoupage.scenes[1]
    expect(reconnected.id).toBe('S20')
    expect(reconnected.shots).toBe(decoupage.scenes[1].shots)
    expect(reconnected.heading).toBe('INT. B')
    expect(reconnected.orphan).toBe(false)
    expect(back.result.summary.reconnected).toEqual(['S_0020'])
  })

  it('une carte déjà orpheline n’est plus signalée : seul ce qui vient de changer l’est', () => {
    const first = run(without, cards(['10', '20*', '30']), counterIds()).result
    const again = reconcile(without, first.decoupage, {}, counterIds())
    expect(again.decoupage).toBe(first.decoupage)
    expect(again.orphanIds).toEqual(['S20'])
    expect(again.summary.orphaned).toEqual([])
    expect(again.summary.reconnected).toEqual([])

    // Une autre carte devient orpheline : elle seule est signalée.
    const onlyA = script('INT. A #10#')
    const decoupage = {
      ...first.decoupage,
      scenes: first.decoupage.scenes.map((s) => (s.id === 'S30' ? { ...s, name: 'Nom 30' } : s))
    }
    const next = reconcile(onlyA, decoupage, {}, counterIds())
    expect(next.orphanIds).toEqual(['S20', 'S30'])
    expect(next.summary.orphaned).toEqual(['S_0030'])
  })

  it('en-tête en cours de frappe : la carte protégée garde son état orpheline ou non', () => {
    // L'élève retape le début de l'en-tête : la ligne n'est plus un en-tête pour l'instant.
    const text = 'INT. A #10#\n\nUn.\n\nI #20#\n\nINT. C #30#\n\nTrois.\n'
    const line = text.indexOf('I #20#')
    const editingLine = { from: line, to: line + 'I #20#'.length }
    const result = reconcile(text, cards(['10', '20*', '30']), { editingLine }, counterIds())
    expect(result.decoupage.scenes[1].orphan).toBe(false)
    expect(result.summary.orphaned).toEqual([])
  })

  it('un nouveau numéro ne prend jamais celui d’une carte orpheline', () => {
    const decoupage = cards(['20', '30*', '40'])
    const text = script('INT. A #20#', 'INT. NOUVELLE', 'INT. C #40#')
    const { text: next, result } = run(text, decoupage, counterIds())
    const [, added] = readScriptScenes(next)
    expect(added.rawNumber).not.toBe('30')
    expect(Number(added.rawNumber)).toBeGreaterThan(20)
    expect(Number(added.rawNumber)).toBeLessThan(40)
    expect(result.orphanIds).toEqual(['S30'])
  })
})

describe('rapprochement : plus de numéro libre', () => {
  it('plus de nombre libre : une lettre, même quand les numéros ne sont pas verrouillés', () => {
    const text = script('INT. A #20#', 'INT. NOUVELLE', 'INT. B #21#')
    const { text: next } = run(text, cards(['20', '21']), counterIds())
    expect(numbersInText(next)).toEqual(['20', '20A', '21'])
  })

  it('dernier recours : un numéro après le plus grand, hors de l’ordre, jamais renuméroté ensuite', () => {
    // Toutes les lettres de 20A à 20Z sont prises par des cartes orphelines.
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((letter) => `20${letter}*`)
    const decoupage = cards(['20', ...letters, '21'])
    const text = script('INT. A #20#', 'INT. NOUVELLE', 'INT. B #21#')
    const ids = counterIds()
    // run() vérifie déjà qu'un second rapprochement ne change rien.
    const first = run(text, decoupage, ids)
    expect(numbersInText(first.text)).toEqual(['20', '30', '21'])
    // Plusieurs passages, avec ou sans verrouillage : toujours rien.
    let current = first.result.decoupage
    for (const locked of [false, true, false]) {
      current = { ...current, numbersLocked: locked }
      const again = reconcile(first.text, current, {}, ids)
      expect(again.textChanges).toEqual([])
      expect(again.decoupage).toBe(current)
    }
  })
})

describe('rapprochement : stabilité', () => {
  it('un numéro libéré par une scène déplacée profite à une scène traitée avant elle', () => {
    // Les lettres 35C à 35Z sont prises par des orphelines. La nouvelle scène (entre 35A et 36)
    // n'a de place qu'en 35B, numéro de la scène déplacée plus loin, qui devient 55.
    const letters = 'CDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((letter) => `35${letter}*`)
    const decoupage = cards(['35', '35A', ...letters, '36', '50', '35B*', '60'])
    const text = script(
      'INT. A #35#',
      'INT. B #35A#',
      'INT. NOUVELLE',
      'INT. C #36#',
      'INT. D #50#',
      'INT. X #35B#',
      'INT. E #60#'
    )
    const { text: next } = run(text, decoupage, counterIds())
    expect(numbersInText(next)).toEqual(['35', '35A', '35B', '36', '50', '55', '60'])
  })
})

describe('rapprochement : pendant la frappe', () => {
  it('l’en-tête en cours de frappe n’est numéroté qu’une fois la ligne quittée', () => {
    const text = script('INT. A #10#', 'INT. CUIS', 'INT. B #20#')
    const line = readScriptScenes(text)[1].line
    const typing = reconcile(text, cards(['10', '20']), { editingLine: line }, counterIds())
    expect(typing.textChanges).toEqual([])
    expect(labels(typing.decoupage)).toEqual(['S_0010', 'S_0020'])

    const { text: next } = run(text, typing.decoupage, counterIds())
    expect(numbersInText(next)).toEqual(['10', '15', '20'])
  })

  it('une carte dont le numéro est sur la ligne du curseur n’est pas supprimée pendant la frappe', () => {
    // « INT. » effacé pour taper « EXT. » : la ligne n'est plus un en-tête pendant un instant.
    const text = 'INT. A #10#\n\nAction.\n\nE CUISINE #20#\n\nAction.\n'
    const from = text.indexOf('E CUISINE')
    const editingLine = { from, to: from + 'E CUISINE #20#'.length }
    const result = reconcile(text, cards(['10', '20']), { editingLine }, counterIds())
    expect(labels(result.decoupage)).toEqual(['S_0010', 'S_0020'])
    expect(result.summary.deleted).toEqual([])
    expect(result.orphanIds).toEqual([])
  })
})

describe('rapprochement : réserve de cartes', () => {
  it('une scène dont le numéro vient du texte reprend une carte connue juste avant', () => {
    const known = cards(['10', '20*']).scenes
    const { result } = run(script('INT. A #10#', 'INT. B #20#'), cards(['10']), counterIds(), {
      knownCards: known
    })
    expect(result.decoupage.scenes[1].id).toBe('S20')
    expect(result.decoupage.scenes[1].name).toBe('Nom 20')
  })

  it('un numéro nouvellement attribué ne reprend jamais une carte connue', () => {
    const known = cards(['10', '15*', '20']).scenes
    const { result } = run(
      script('INT. A #10#', 'INT. NOUVELLE', 'INT. B #20#'),
      cards(['10', '20']),
      counterIds('n'),
      { knownCards: known }
    )
    expect(labels(result.decoupage)).toEqual(['S_0010', 'S_0015', 'S_0020'])
    expect(result.decoupage.scenes[1].id).toMatch(/^n-/)
  })
})

describe('première liaison', () => {
  it('scènes et cartes liées dans l’ordre ; cartes en trop ajoutées à la fin du scénario', () => {
    const decoupage = cards(['10', '20', '30*'], { linked: false })
    decoupage.scenes[0].heading = 'INT. CUISINE - JOUR'
    decoupage.scenes[1].heading = 'INT. CHAMBRE - NUIT'
    decoupage.scenes[2].heading = 'EXT. JARDIN - JOUR'
    // Scénario importé de KIT, numéroté 1, 2.
    const text = script('INT. CUISINE - JOUR #1#', 'INT. SALON - NUIT #2#')
    const { text: next, result } = run(text, decoupage, counterIds())
    expect(next).toBe(
      script('INT. CUISINE - JOUR #10#', 'INT. SALON - NUIT #20#') + '\nEXT. JARDIN - JOUR #30#\n'
    )
    expect(result.decoupage.scriptLinked).toBe(true)
    expect(result.decoupage.scenes.map((scene) => scene.id)).toEqual(['S10', 'S20', 'S30'])
    expect(result.decoupage.scenes[1].heading).toBe('INT. SALON - NUIT')
    expect(result.orphanIds).toEqual([])
    expect(result.summary.firstLink).toEqual([
      { number: 'S_0010', heading: 'INT. CUISINE - JOUR' },
      { number: 'S_0020', heading: 'INT. SALON - NUIT' }
    ])
    expect(result.summary.headingDifferences).toEqual([
      { number: 'S_0020', card: 'INT. CHAMBRE - NUIT', script: 'INT. SALON - NUIT' }
    ])
    expect(result.summary.appended).toEqual(['S_0030'])
  })

  it('plus de scènes que de cartes : les scènes en trop reçoivent un numéro et une carte', () => {
    const text = script('INT. A', 'INT. B', 'INT. C')
    const { text: next, result } = run(text, cards(['10'], { linked: false }), counterIds())
    expect(numbersInText(next)).toEqual(['10', '20', '30'])
    expect(labels(result.decoupage)).toEqual(['S_0010', 'S_0020', 'S_0030'])
  })

  it('seules les cartes sont faites : leurs en-têtes apparaissent dans le scénario', () => {
    const decoupage = cards(['10', '20'], { linked: false })
    decoupage.scenes[1].heading = 'Cuisine  de Marie'
    const { text, result } = run('', decoupage, counterIds())
    expect(text).toBe('.SCÈNE À ÉCRIRE #10#\n\n.CUISINE DE MARIE #20#\n')
    expect(result.decoupage.scenes.map((scene) => scene.heading)).toEqual(['', 'CUISINE DE MARIE'])
  })

  it('texte avant la première scène et sans fin de ligne finale : conservé', () => {
    const { text } = run('Titre de travail', cards(['10'], { linked: false }), counterIds())
    expect(text).toBe('Titre de travail\n\n.SCÈNE À ÉCRIRE #10#')
  })
})

describe('rapprochement : après Annuler dans l’éditeur (texte figé)', () => {
  it('aucun numéro n’est écrit ; les scènes sans numéro attendent, sans carte', () => {
    const text = script('INT. A #10#', 'INT. B', 'INT. C #5#', 'INT. D #10#')
    const result = reconcile(text, cards(['10', '20*']), { freezeText: true }, counterIds())
    expect(result.textChanges).toEqual([])
    // 5 garde son numéro hors de l'ordre ; B et le doublon D attendent ; 20 devient orpheline.
    expect(labels(result.decoupage)).toEqual(['S_0010', 'S_0005', 'S_0020'])
    expect(result.orphanIds).toEqual(['S20'])
    expect(result.waiting).toBe(true)
  })

  it('la modification suivante numérote ce qui attendait', () => {
    const text = script('INT. A #10#', 'INT. B', 'INT. C #20#')
    const frozen = reconcile(text, cards(['10', '20']), { freezeText: true }, counterIds())
    const { text: next } = run(text, frozen.decoupage, counterIds())
    expect(numbersInText(next)).toEqual(['10', '15', '20'])
  })
})
