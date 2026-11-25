// Lot 5 : bouton « Aide » des modules Cartes, Données du projet, Planification et Statistiques.
// Même fenêtre que l'aide du Scénario : onglets, Échap ferme, lisible dans les sept thèmes.
// Les libellés cités dans l'aide sont cherchés dans le module.

import { sleep } from '../application.mjs'

const THEMES = ['defaut', 'cobalt', 'or', 'matrix', 'pinklady', 'forest', 'aqua']

const MODULES = [
  {
    name: 'Cartes',
    slug: 'cartes',
    title: 'Aide — Module Cartes',
    tabs: ['Tableau', 'Scènes et plans', 'Fiche du plan', 'Vignettes', 'Numéros', 'Exporter'],
    labels: [
      'Ajouter une scène',
      'Ajouter un plan',
      'Ajouter plusieurs…',
      'Renuméroter…',
      'Afficher les vignettes',
      'Blender',
      'Storyboard en PDF…'
    ]
  },
  {
    name: 'Données du projet',
    slug: 'donnees',
    title: 'Aide — Données du projet',
    tabs: [
      'Vue d’ensemble',
      'Log line, tag line',
      'Synopsis, pitch, note',
      'Personnages, lieux',
      'Documents',
      'Générique'
    ],
    labels: [
      'Page de titre',
      'Log line',
      'Synopsis',
      'Personnages',
      'Lieux',
      'Documents',
      'Générique',
      'Pitch',
      'Tag line',
      'Note d’intention'
    ]
  },
  {
    name: 'Planification',
    slug: 'planification',
    title: 'Aide — Module Planification',
    tabs: ['Tâches', 'Liste et ligne du temps', 'Plan de tournage', 'Exporter'],
    labels: [
      'Nouvelle tâche',
      'Exporter…',
      'Liste',
      'Ligne du temps',
      'Plan de tournage',
      'Écriture',
      'Préproduction',
      'Tournage',
      'Postproduction',
      'Diffusion',
      'Nouvelle phase'
    ]
  },
  {
    name: 'Statistiques',
    slug: 'statistiques',
    title: 'Aide — Module Statistiques',
    tabs: ['Lire les statistiques', 'À quoi ça sert'],
    labels: [
      'Résumé',
      'Temps de parole',
      'Activité des personnages',
      'Dynamique des scènes',
      'Scènes par lieu'
    ]
  }
]

export default async function ({ app, check, log, newProject }) {
  await app.openProject(newProject())

  const press = async (key, code) => {
    const params = { key, code: key, windowsVirtualKeyCode: code }
    await app.page.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...params })
    await app.page.send('Input.dispatchKeyEvent', { type: 'keyUp', ...params })
    await sleep(200)
  }

  const dialog = () =>
    app.evaluate(`(() => {
      const d = document.querySelector('.help-dialog')
      return d && {
        title: d.querySelector('h2').textContent,
        tabs: [...d.querySelectorAll('[role="tab"]')].map((t) => t.textContent),
        selected: d.querySelector('[role="tab"][aria-selected="true"]')?.textContent,
        heading: d.querySelector('.help-panel h3')?.textContent,
        text: d.querySelector('.help-panel').innerText
      }
    })()`)

  for (const module of MODULES) {
    await app.module(module.name)
    await sleep(900)

    // 1. Libellés cités dans l'aide, présents dans le module.
    const shown = await app.evaluate(`document.querySelector('.app-main, main, #root').innerText`)
    const missing = module.labels.filter((label) => !shown.includes(label))
    check(
      missing.length === 0,
      `${module.name} : libellés de l’aide présents ${JSON.stringify(missing)}`
    )

    // 2. Un seul bouton « Aide », visible.
    const buttons = await app.evaluate(`[...document.querySelectorAll('[data-help-button]')]
      .filter((b) => b.offsetParent !== null).map((b) => b.textContent.trim())`)
    check(buttons.length === 1 && buttons[0] === 'Aide', `${module.name} : un bouton « Aide »`)
    await app.click('[data-help-button]')
    await sleep(400)

    // 3. Fenêtre, onglets, chaque rubrique.
    let state = await dialog()
    check(state !== null && state.title === module.title, `${module.name} : titre de la fenêtre`)
    check(
      JSON.stringify(state.tabs) === JSON.stringify(module.tabs),
      `${module.name} : ${module.tabs.length} onglets dans l’ordre`
    )
    for (const [index, name] of module.tabs.entries()) {
      await app.click(`.help-dialog [role="tab"]:nth-child(${index + 1})`)
      await sleep(200)
      state = await dialog()
      check(
        state.selected === name && state.heading && state.text.length > 80,
        `${module.name} : onglet « ${name} » rempli`
      )
      check(!/\*\*|`/.test(state.text), `${module.name} : « ${name} » sans balise visible`)
      await app.screenshot(`aide-${module.slug}-${index + 1}.png`)
    }

    // 4. Lisible dans les sept thèmes (fenêtre et bouton du module).
    await app.click('.help-dialog [role="tab"]:nth-child(1)')
    await sleep(200)
    for (const theme of THEMES) {
      await app.evaluate(`window.neoscenar.setTheme(${JSON.stringify(theme)})`)
      await sleep(350)
      const ratios = await app.evaluate(`(() => {
        const parse = (c) => c.match(/[\\d.]+/g).slice(0, 4).map(Number)
        const lum = ([r, g, b]) => {
          const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
          return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
        }
        const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05) }
        // Fond réel d'un élément : on remonte tant que le fond est transparent.
        const background = (el) => {
          for (let e = el; e; e = e.parentElement) {
            const c = parse(getComputedStyle(e).backgroundColor)
            if (c.length < 4 || c[3] > 0) return c.slice(0, 3)
          }
          return [255, 255, 255]
        }
        const pair = (s) => { const el = document.querySelector(s); return ratio(parse(getComputedStyle(el).color), background(el)) }
        const button = [...document.querySelectorAll('[data-help-button]')].find((b) => b.offsetParent !== null)
        return {
          text: pair('.help-panel td, .help-panel li, .help-panel p'),
          header: document.querySelector('.help-table th') ? pair('.help-table th') : 99,
          tab: pair('.help-tab.active'),
          otherTab: pair('.help-tab:not(.active)'),
          button: ratio(parse(getComputedStyle(button).color), background(button))
        }
      })()`)
      const rounded = Object.fromEntries(Object.entries(ratios).map(([k, v]) => [k, v.toFixed(1)]))
      check(
        Object.values(ratios).every((v) => v >= 4.5),
        `${module.name}, ${theme} : lisible (${JSON.stringify(rounded)})`
      )
      if (theme === 'matrix' || theme === 'pinklady') {
        await app.screenshot(`aide-${module.slug}-theme-${theme}.png`)
      }
    }
    await app.evaluate(`window.neoscenar.setTheme('defaut')`)
    await sleep(300)

    // 5. Échap ferme ; le module reste affiché.
    await press('Escape', 27)
    await sleep(200)
    check((await dialog()) === null, `${module.name} : Échap ferme la fenêtre`)
    await app.screenshot(`aide-${module.slug}-bouton.png`)
  }
  log('fin')
}
