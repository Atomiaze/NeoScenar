import {
  ipcMain,
  Menu,
  type BrowserWindow,
  type IpcMainEvent,
  type MenuItemConstructorOptions,
  type WebContents
} from 'electron'
import { fr } from '../renderer/i18n/fr'
import { IPC_CHANNELS, type RevisionContextInfo } from '../shared/api'

// Correcteur orthographique : celui d'Electron (activé par défaut dans la fenêtre ; l'éditeur de
// scénario le demande avec l'attribut « spellcheck »).
// Sur Mac, c'est le correcteur du système : il suit les langues réglées dans macOS et fonctionne hors
// ligne. Sous Windows et Linux, le dictionnaire français livré avec l'application est utilisé, sans
// téléchargement (voir spellcheckDictionary.ts).

/** Ce que le menu contextuel doit savoir de l'endroit cliqué (sous-ensemble de ContextMenuParams). */
export interface ContextMenuInfo {
  misspelledWord: string
  dictionarySuggestions: string[]
  isEditable: boolean
  selectionText: string
  editFlags: { canCut: boolean; canCopy: boolean; canPaste: boolean; canSelectAll: boolean }
}

export interface ContextMenuActions {
  replaceMisspelling(word: string): void
  addToDictionary(word: string): void
  editRevisionComment(): void
  removeRevisionMark(): void
}

const MAX_SUGGESTIONS = 6

/**
 * Menu du clic droit, en français : suggestions de correction, puis (sur un texte surligné du mode
 * révision) le commentaire et « Effacer cette marque », puis Couper, Copier, Coller.
 */
export function contextMenuTemplate(
  info: ContextMenuInfo,
  actions: ContextMenuActions,
  revision: RevisionContextInfo | null = null
): MenuItemConstructorOptions[] {
  const t = fr.menu
  const items: MenuItemConstructorOptions[] = []
  if (info.misspelledWord) {
    const suggestions = info.dictionarySuggestions.slice(0, MAX_SUGGESTIONS)
    if (suggestions.length === 0) items.push({ label: t.noSuggestion, enabled: false })
    for (const suggestion of suggestions) {
      items.push({ label: suggestion, click: () => actions.replaceMisspelling(suggestion) })
    }
    items.push(
      { type: 'separator' },
      { label: t.addToDictionary, click: () => actions.addToDictionary(info.misspelledWord) },
      { type: 'separator' }
    )
  }
  if (revision && info.isEditable) {
    items.push(
      {
        label: revision.hasComment ? t.editRevisionComment : t.addRevisionComment,
        click: () => actions.editRevisionComment()
      },
      { label: t.removeRevisionMark, click: () => actions.removeRevisionMark() },
      { type: 'separator' }
    )
  }
  if (info.isEditable) {
    items.push(
      { role: 'cut', label: t.cut, enabled: info.editFlags.canCut },
      { role: 'copy', label: t.copy, enabled: info.editFlags.canCopy },
      { role: 'paste', label: t.paste, enabled: info.editFlags.canPaste },
      { type: 'separator' },
      { role: 'selectAll', label: t.selectAll, enabled: info.editFlags.canSelectAll }
    )
  } else if (info.selectionText.trim() !== '') {
    items.push({ role: 'copy', label: t.copy })
  }
  return items
}

const REVISION_QUERY_TIMEOUT_MS = 300
let nextQueryId = 1

/**
 * Demande à l'interface si le clic droit visait une marque de révision. L'interface a déjà traité son
 * événement « contextmenu » quand le processus principal reçoit le sien : la réponse est à jour.
 */
function askRevisionContext(contents: WebContents): Promise<RevisionContextInfo | null> {
  const id = nextQueryId++
  return new Promise((resolve) => {
    const finish = (info: RevisionContextInfo | null): void => {
      clearTimeout(timer)
      ipcMain.removeListener(IPC_CHANNELS.revisionContextReply, onReply)
      resolve(info)
    }
    const onReply = (
      event: IpcMainEvent,
      replyId: number,
      info: RevisionContextInfo | null
    ): void => {
      if (event.sender === contents && replyId === id) finish(info)
    }
    const timer = setTimeout(() => finish(null), REVISION_QUERY_TIMEOUT_MS)
    ipcMain.on(IPC_CHANNELS.revisionContextReply, onReply)
    contents.send(IPC_CHANNELS.revisionContextQuery, id)
  })
}

/** Branche le menu du clic droit sur la fenêtre. */
export function setupContextMenu(window: BrowserWindow): void {
  const contents = window.webContents
  contents.on('context-menu', (_event, params) => {
    void (async () => {
      const revision = params.isEditable ? await askRevisionContext(contents) : null
      if (window.isDestroyed()) return
      const template = contextMenuTemplate(
        params,
        {
          replaceMisspelling: (word) => contents.replaceMisspelling(word),
          addToDictionary: (word) => contents.session.addWordToSpellCheckerDictionary(word),
          editRevisionComment: () =>
            contents.send(IPC_CHANNELS.menuCommand, 'revision-edit-comment'),
          removeRevisionMark: () => contents.send(IPC_CHANNELS.menuCommand, 'revision-remove-mark')
        },
        revision
      )
      if (template.length > 0) Menu.buildFromTemplate(template).popup({ window })
    })()
  })
}
