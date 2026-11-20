import { Prec, type Extension } from '@codemirror/state'
import { keymap, type KeyBinding } from '@codemirror/view'
import {
  backspaceCommand,
  changeCase,
  enterCommand,
  lineBreakCommand,
  setElementType,
  tabCommand,
  toggleFormat
} from './commands'
import { editedLine, pendingTypes, settleLeftLines, uppercaseWhileTyping } from './pendingTypes'

/**
 * Raccourcis repris de KIT Scenarist. Ils passent avant ceux de CodeMirror : Cmd + ↑ / ↓ ne vont donc
 * plus au début ou à la fin du texte, Cmd + L ne sélectionne plus la ligne, Cmd + I ne sélectionne
 * plus le bloc.
 */
export const SCRIPT_KEYS: readonly KeyBinding[] = [
  { key: 'Enter', run: enterCommand },
  { key: 'Shift-Enter', run: lineBreakCommand },
  { key: 'Tab', run: tabCommand },
  { key: 'Backspace', run: backspaceCommand },
  { key: 'Mod-Enter', run: setElementType('scene_heading') },
  { key: 'Mod-j', run: setElementType('action') },
  { key: 'Mod-u', run: setElementType('character') },
  { key: 'Mod-h', run: setElementType('parenthetical') },
  { key: 'Mod-l', run: setElementType('dialogue') },
  // Aussi quand le panneau de recherche a le focus : Cmd + G n'y devient jamais « suivant ».
  { key: 'Mod-g', run: setElementType('transition'), scope: 'editor search-panel' },
  { key: 'Mod-ArrowUp', run: changeCase(true) },
  { key: 'Mod-ArrowDown', run: changeCase(false) },
  { key: 'Mod-b', run: toggleFormat('**') },
  { key: 'Mod-i', run: toggleFormat('*') },
  // Cmd + U est réservé au personnage, comme dans KIT : le souligné passe par Cmd + Maj + U.
  { key: 'Mod-Shift-u', run: toggleFormat('_') }
]

/** Enchaînement des éléments au clavier, types retenus et majuscules pendant la frappe. */
export function scriptEditing(): Extension {
  return [
    pendingTypes,
    editedLine,
    uppercaseWhileTyping,
    settleLeftLines,
    Prec.high(keymap.of(SCRIPT_KEYS))
  ]
}
