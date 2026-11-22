// Pilotage de NeoScenar réel (outil de développement, jamais livré avec l'application).
// L'application est lancée avec les accès de débogage intégrés à Electron : le processus principal
// (--inspect) et la fenêtre (--remote-debugging-port). Aucune bibliothèque à installer.

import { spawn } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dirname, '..', '..')
const ELECTRON =
  process.platform === 'darwin'
    ? join(ROOT, 'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron')
    : join(ROOT, 'node_modules/electron/dist/electron')

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Ferme le bandeau du lien scénario ↔ cartes/fiches (« 3 nouvelles fiches… ») dès qu'il paraît.
 * Il se ferme seul après 10 s et toute la page remonte alors : un geste à la souris mesuré juste
 * avant tomberait à côté. Attend jusqu'à `wait` ms qu'il apparaisse ; vrai s'il n'y en a plus.
 */
export async function closeLinkBanner(app, wait = 3000) {
  for (let elapsed = 0; elapsed < wait; elapsed += 150) {
    const closed = await app.evaluate(`(() => {
      const banner = document.querySelector('.link-banner')
      if (!banner) return false
      ;[...banner.querySelectorAll(':scope > button')].at(-1).click()
      return true
    })()`)
    if (closed) break
    await sleep(150)
  }
  await sleep(200)
  return app.evaluate(`document.querySelector('.link-banner') === null`)
}

/** Connexion au protocole de débogage (Chrome DevTools Protocol), avec le WebSocket de Node. */
async function connect(url) {
  const socket = new WebSocket(url)
  await new Promise((resolve, reject) => {
    socket.onopen = resolve
    socket.onerror = reject
  })
  let lastId = 0
  const pending = new Map()
  const events = []
  socket.onmessage = (message) => {
    const data = JSON.parse(message.data)
    if (data.id && pending.has(data.id)) {
      pending.get(data.id)(data)
      pending.delete(data.id)
    } else if (data.method) events.push(data)
  }
  const send = (method, params = {}) =>
    new Promise((resolve) => {
      const id = ++lastId
      pending.set(id, resolve)
      socket.send(JSON.stringify({ id, method, params }))
    })
  const evaluate = async (expression) => {
    const answer = await send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true
    })
    const exception = answer.result?.exceptionDetails
    if (exception) throw new Error(exception.exception?.description ?? exception.text)
    return answer.result?.result?.value
  }
  return { send, evaluate, events, close: () => socket.close() }
}

async function debugTargets(port) {
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      return await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
    } catch {
      await sleep(500)
    }
  }
  throw new Error(`L'application ne répond pas sur le port de débogage ${port}.`)
}

/**
 * Lance NeoScenar (déjà construit dans out/) avec des préférences séparées, pour ne jamais toucher
 * aux préférences ni aux projets récents de l'utilisateur.
 */
export async function launch({ userData, screenshots }) {
  const inspectPort = 9300 + Math.floor(Math.random() * 300)
  const pagePort = inspectPort + 300
  // Un terminal lancé depuis VS Code définit ELECTRON_RUN_AS_NODE : Electron démarrerait sans fenêtre.
  const env = { ...process.env }
  delete env.ELECTRON_RUN_AS_NODE
  const child = spawn(
    ELECTRON,
    [
      ROOT,
      `--inspect=${inspectPort}`,
      `--remote-debugging-port=${pagePort}`,
      `--user-data-dir=${userData}`
    ],
    { stdio: ['ignore', 'pipe', 'pipe'], env }
  )
  const mainOutput = []
  child.stdout.on('data', (data) => mainOutput.push(String(data)))
  child.stderr.on('data', (data) => mainOutput.push(String(data)))

  const main = await connect((await debugTargets(inspectPort))[0].webSocketDebuggerUrl)
  await main.send('Runtime.enable')
  await sleep(3000)
  const electron = `process.mainModule.require('electron')`

  let page = null
  const app = {
    main,
    get page() {
      return page
    },

    /** Ouvre un projet comme un double-clic dans le Finder, puis se connecte à la fenêtre. */
    async openProject(projectFile) {
      await main.evaluate(
        `${electron}.app.emit('open-file', { preventDefault() {} }, ${JSON.stringify(projectFile)})`
      )
      await sleep(3000)
      const target = (await debugTargets(pagePort)).find(
        (item) => item.type === 'page' && !item.url.startsWith('devtools')
      )
      // Une réouverture garde les messages des consoles déjà reçus (vérifiés à la fin de l'essai).
      const earlier = page?.events ?? []
      page?.close()
      page = await connect(target.webSocketDebuggerUrl)
      page.events.push(...earlier)
      await page.send('Runtime.enable')
      await page.send('Log.enable')
      await page.send('Page.enable')
    },

    /** Évalue du JavaScript dans la fenêtre (le document affiché). */
    evaluate: (expression) => page.evaluate(expression),

    /** Libellés d'un menu de la barre des menus (« Édition »). */
    menuLabels: (menu) =>
      main.evaluate(`${electron}.Menu.getApplicationMenu().items
        .find((item) => item.label === ${JSON.stringify(menu)})
        .submenu.items.filter((item) => item.type !== 'separator')
        .map((item) => item.label + (item.enabled ? '' : ' (désactivé)'))`),

    /**
     * Choisit une entrée de menu (« Édition », « Dupliquer »), exactement comme la souris ou son
     * raccourci clavier. Renvoie « ok », « désactivé » ou « introuvable ».
     */
    menu: (menu, entry) =>
      main.evaluate(`(() => {
        const { Menu, BrowserWindow } = ${electron}
        const top = Menu.getApplicationMenu().items.find((item) => item.label === ${JSON.stringify(menu)})
        const item = top?.submenu.items.find((i) => i.label === ${JSON.stringify(entry)})
        if (!item) return 'introuvable'
        if (!item.enabled) return 'désactivé'
        item.click(undefined, BrowserWindow.getAllWindows()[0])
        return 'ok'
      })()`),

    /** Clic du DOM sur le premier élément qui correspond au sélecteur CSS. */
    click: (selector) =>
      page.evaluate(`(() => {
        const element = document.querySelector(${JSON.stringify(selector)})
        if (!element) return 'introuvable'
        element.click()
        return 'ok'
      })()`),

    /**
     * Vrai clic de souris au milieu d'un élément (nécessaire dans l'éditeur, qui place le curseur
     * d'après la position de la souris). `text` : élément dont le texte contient ce texte.
     */
    async mouseClick(selector, text) {
      const box = await page.evaluate(`(() => {
        const all = [...document.querySelectorAll(${JSON.stringify(selector)})]
        const element = ${text ? `all.find((e) => e.textContent.includes(${JSON.stringify(text)}))` : 'all[0]'}
        if (!element) return null
        element.scrollIntoView({ block: 'center' })
        const r = element.getBoundingClientRect()
        return { x: r.left + Math.min(r.width / 2, 40), y: r.top + r.height / 2 }
      })()`)
      if (!box) return 'introuvable'
      for (const type of ['mousePressed', 'mouseReleased']) {
        await page.send('Input.dispatchMouseEvent', { type, ...box, button: 'left', clickCount: 1 })
      }
      return 'ok'
    },

    /**
     * Glisser à la souris d'un point à l'autre (coordonnées de la fenêtre), par petites étapes,
     * comme une vraie main : appui, déplacements, relâchement.
     */
    async mouseDrag(from, to, steps = 8, button = 'left') {
      const held = { left: 1, right: 2, middle: 4 }[button]
      const send = (type, point) =>
        page.send('Input.dispatchMouseEvent', {
          type,
          x: point.x,
          y: point.y,
          button: type === 'mouseMoved' ? 'none' : button,
          buttons: type === 'mouseReleased' ? 0 : held,
          clickCount: type === 'mouseMoved' ? 0 : 1
        })
      await send('mouseMoved', from)
      await send('mousePressed', from)
      for (let i = 1; i <= steps; i++) {
        await send('mouseMoved', {
          x: from.x + ((to.x - from.x) * i) / steps,
          y: from.y + ((to.y - from.y) * i) / steps
        })
      }
      await send('mouseReleased', to)
    },

    /**
     * Cran de molette au point donné. `modifiers` : 2 = Ctrl (pincement du trackpad), 8 = Maj.
     * `deltaX` seul = glissé horizontal à deux doigts.
     */
    mouseWheel: (point, { deltaX = 0, deltaY = 0, modifiers = 0 } = {}) =>
      page.send('Input.dispatchMouseEvent', {
        type: 'mouseWheel',
        x: point.x,
        y: point.y,
        deltaX,
        deltaY,
        modifiers
      }),

    /** Change de module par la barre de gauche (« Cartes », « Scénario »). */
    module: (name) => app.click(`.module-bar [aria-label="${name}"]`),

    /** Fenêtre ouverte (titre et texte), ou null. */
    dialog: () =>
      page.evaluate(`(() => {
        const dialog = document.querySelector('.dialog')
        if (!dialog) return null
        return {
          title: dialog.querySelector('h2')?.textContent ?? '',
          text: dialog.querySelector('.dialog-body')?.textContent ?? '',
          buttons: [...dialog.querySelectorAll('.dialog-actions button')].map((b) => b.textContent)
        }
      })()`),

    /** Clique un bouton de la fenêtre ouverte, d'après son texte. */
    dialogButton: (label) =>
      page.evaluate(`(() => {
        const button = [...document.querySelectorAll('.dialog .dialog-actions button')]
          .find((b) => b.textContent === ${JSON.stringify(label)})
        if (!button) return 'introuvable'
        button.click()
        return 'ok'
      })()`),

    /** Cartes scène du tableau : « S_0020 », avec « [sélectionnée] » le cas échéant. */
    sceneCards: () =>
      page.evaluate(`[...document.querySelectorAll('[data-card-kind="scene"]')].map((card) =>
        card.querySelector('.card-number').textContent +
        (card.className.includes('selected') ? ' [sélectionnée]' : ''))`),

    /** Texte de l'éditeur de scénario affiché (lignes visibles). */
    scriptLines: () =>
      page.evaluate(`[...document.querySelectorAll('.cm-line')].map((line) => line.textContent)`),

    /** Scène mise en évidence dans le navigateur. */
    navigatorCurrent: () =>
      page.evaluate(`document.querySelector('.navigator-row.current')?.textContent ?? null`),

    /** `clip` facultatif : { x, y, width, height, scale } en pixels de la fenêtre (zoom sur un détail). */
    async screenshot(file, clip) {
      const shot = await page.send('Page.captureScreenshot', {
        format: 'png',
        ...(clip ? { clip: { scale: 1, ...clip } } : {})
      })
      writeFileSync(join(screenshots, file), Buffer.from(shot.result.data, 'base64'))
      return join(screenshots, file)
    },

    /** Erreurs et avertissements de la console de la fenêtre et du processus principal. */
    problems() {
      const lines = []
      for (const event of page?.events ?? []) {
        if (event.method === 'Runtime.exceptionThrown') {
          const details = event.params.exceptionDetails
          lines.push(`EXCEPTION ${details.exception?.description ?? details.text}`)
        }
        if (
          event.method === 'Runtime.consoleAPICalled' &&
          ['error', 'warning'].includes(event.params.type)
        ) {
          lines.push(
            `${event.params.type} ${event.params.args.map((a) => a.value ?? a.description).join(' ')}`
          )
        }
      }
      for (const line of mainOutput.join('').split('\n')) {
        if (/error|exception/i.test(line) && !/codesign_util/.test(line))
          lines.push(`principal ${line}`)
      }
      return lines
    },

    close() {
      page?.close()
      main.close()
      child.kill()
    }
  }
  return app
}
