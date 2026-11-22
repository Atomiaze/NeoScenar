import { describe, expect, it } from 'vitest'
import { layoutPlanning, layoutShootingPlan } from '../src/index.ts'
import { BODY, CONTENT, PAGE } from '../src/geometry.ts'
import { LABELS } from '../src/labels.ts'
import { lighten } from '../src/timeline.ts'
import type { PageLayout, PdfShootingDay } from '../src/index.ts'
import { DAYS, PHASES, planningInput, scene, shootingInput, task } from './fixtures.ts'
import { allText, interMeasure, intersects, textBox, texts, words } from './helpers.ts'

const measure = await interMeasure()

/** Tout le texte reste dans la page, et aucun texte n'en recouvre un autre. */
function expectClean(pages: PageLayout[]): void {
  for (const page of pages) {
    const boxes = texts(page).map((item) => ({ item, box: textBox(item, measure) }))
    for (const { item, box } of boxes) {
      expect(box.left, item.text).toBeGreaterThanOrEqual(CONTENT.left - 0.01)
      expect(box.right, item.text).toBeLessThanOrEqual(CONTENT.right + 0.01)
      expect(box.bottom, item.text).toBeLessThanOrEqual(PAGE.height)
    }
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++)
        expect(
          intersects(boxes[i].box, boxes[j].box),
          `« ${boxes[i].item.text} » recouvre « ${boxes[j].item.text} »`
        ).toBe(false)
  }
}

/** Rien n'est posé sous le bas de la zone de contenu (hors pied de page). */
function expectInsideBody(pages: PageLayout[]): void {
  for (const page of pages)
    for (const item of page.items) {
      if (item.type === 'text' && item.text.startsWith('Page ')) continue
      const bottom =
        item.type === 'text'
          ? item.baseline
          : item.type === 'rect'
            ? item.y + item.height
            : item.type === 'line'
              ? Math.max(item.y1, item.y2)
              : item.type === 'diamond'
                ? item.cy + item.radius
                : item.y + item.size
      expect(bottom).toBeLessThanOrEqual(BODY.bottom + 0.01)
    }
}

describe('PDF « Planning »', () => {
  const pages = layoutPlanning(planningInput(), measure)
  const text = allText(pages)

  it('a une ligne du temps puis la liste, avec en-tête et numéros de page', () => {
    expect(pages.length).toBeGreaterThanOrEqual(2)
    expect(texts(pages[0]).map((t) => t.text)).toEqual(
      expect.arrayContaining([
        'Le Dernier Bus',
        'Planning',
        '2026',
        '2027',
        'septembre',
        'juin',
        "Aujourd'hui"
      ])
    )
    pages.forEach((page, index) =>
      expect(texts(page).map((t) => t.text)).toContain(LABELS.page(index + 1, pages.length))
    )
  })

  it('reprend chaque tâche, chaque personne et chaque note en entier dans la liste', () => {
    const list = allText(pages.slice(1))
    for (const phase of PHASES)
      for (const t of phase.tasks) {
        for (const word of words(t.title)) expect(list).toContain(word)
        for (const word of words(t.note)) expect(list).toContain(word)
        for (const person of t.people)
          for (const word of words(person)) expect(list).toContain(word)
      }
    expect(list).toContain('Aucune tâche')
    expect(list).toContain('Validée')
    expect(list).toContain('En retard')
    expect(list).toContain('2 / 5 faites · 1 en retard')
  })

  it("n'a aucun texte qui déborde ou en recouvre un autre", () => {
    expectClean(pages)
    expectInsideBody(pages)
  })

  it('compte les tâches sans date et place la rangée des jours de tournage après « Tournage »', () => {
    expect(text).toContain('1 tâche sans date')
    const names = texts(pages[0])
      .filter((t) => t.face === 'bold' && t.x < CONTENT.left + 128)
      .map((t) => t.text)
    expect(names.indexOf(LABELS.shootingRow)).toBe(names.indexOf('Tournage') + 1)
  })

  it('met le filtre de personne dans la ligne d’information', () => {
    const filtered = layoutPlanning(planningInput({ person: 'Léa Martin' }), measure)
    expect(allText(filtered)).toContain('Tâches de : Léa Martin')
  })

  it('continue une phase trop longue sur la page suivante, avec « (suite) »', () => {
    const many = Array.from({ length: 70 }, (_, i) =>
      task(`Tâche numéro ${i + 1}`, {
        due: `2027-0${1 + (i % 6)}-${String(1 + (i % 27)).padStart(2, '0')}`
      })
    )
    const big = layoutPlanning(planningInput({ phases: [{ ...PHASES[0], tasks: many }] }), measure)
    expect(allText(big)).toContain('Écriture (suite)')
    for (let i = 1; i <= 70; i++) expect(allText(big)).toContain(`Tâche numéro ${i} `)
    expectClean(big)
    expectInsideBody(big)
  })

  it('ne dessine pas la rangée de tournage sans jour daté, ni le trait du jour hors de l’étendue', () => {
    const plain = layoutPlanning(
      planningInput({ shootingDays: [], exportDate: '2027-08-15' }),
      measure
    )
    expect(allText(plain)).not.toContain(LABELS.shootingRow)
    expect(allText(plain)).not.toContain("Aujourd'hui")
  })

  it('éclaircit une couleur vers le blanc', () => {
    expect(lighten('#000000', 0.5)).toBe('#808080')
    expect(lighten('#ff0000', 1)).toBe('#ffffff')
  })
})

describe('PDF « Plan de tournage »', () => {
  const pages = layoutShootingPlan(shootingInput(), measure)
  const text = allText(pages)

  it('a un tableau par jour avec date, total, lieux, convoqués et note', () => {
    expect(text).toContain('Jour 1 — lundi 1er mars 2027 · La maison')
    expect(text).toContain('Jour 2 — mardi 2 mars 2027')
    expect(text).toContain('Jour 3 — date à fixer · Plans de coupe')
    expect(text).toContain('Total : 1 7/8 pages · 3 scènes')
    expect(text).toContain('Total : 3/8 page · 2 scènes')
    expect(text).toContain('Lieux : CUISINE, SALON')
    expect(text).toContain('Convoqués : Léa Dupont (MARIE), Tom Leroy (PAUL)')
    expect(text).toContain('Présents en plus : Marc — figurant')
    expect(text).toContain('Sans interprète : MARIE')
    expect(text).toContain('Note : Rendez-vous à 8 h devant l’école.')
    expect(text).toContain('3 jours de tournage · 4 scènes à planifier')
  })

  it('montre les scènes à écrire et disparues sans les compter', () => {
    expect(text).toContain('Scène à écrire')
    expect(text).toContain('à écrire')
    expect(text).toContain('INT. GARAGE - NUIT')
    expect(text).toContain('disparue du scénario')
    expect(text).toContain('1 4/8')
    expect(text).toContain('EXT.')
    expect(text).toContain('NUIT')
  })

  it("n'a aucun texte qui déborde ou en recouvre un autre", () => {
    expectClean(pages)
    expectInsideBody(pages)
  })

  it('ne coupe pas un jour qui tient sur une page : il passe entier à la page suivante', () => {
    const day = (n: number): PdfShootingDay => ({
      ...DAYS[0],
      title: `Bloc ${n}`,
      scenes: Array.from({ length: 9 }, (_, i) => scene(n * 10 + i))
    })
    const layout = layoutShootingPlan(shootingInput({ days: [day(1), day(2), day(3)] }), measure)
    expect(allText(layout)).not.toContain('(suite)')
    // Chaque jour est entièrement sur une page : son titre et sa note sont sur la même page.
    for (const page of layout) {
      const t = allText([page])
      const titles = (t.match(/Bloc \d/g) ?? []).length
      const notes = (t.match(/Rendez-vous/g) ?? []).length
      expect(titles).toBe(notes)
    }
  })

  it('coupe un jour plus haut qu’une page et le reprend sous « (suite) »', () => {
    const scenes = Array.from({ length: 60 }, (_, i) => scene(i + 1))
    const layout = layoutShootingPlan(shootingInput({ days: [{ ...DAYS[0], scenes }] }), measure)
    expect(layout.length).toBeGreaterThan(1)
    expect(allText(layout)).toContain('Jour 1 — lundi 1er mars 2027 · La maison (suite)')
    for (const s of scenes) expect(allText(layout)).toContain(s.label)
    expectClean(layout)
    expectInsideBody(layout)
  })

  it('annonce un plan de tournage vide', () => {
    const layout = layoutShootingPlan(shootingInput({ days: [], unplanned: 0 }), measure)
    expect(allText(layout)).toContain('Aucun jour de tournage.')
    expect(allText(layout)).toContain('Toutes les scènes sont planifiées')
  })
})
