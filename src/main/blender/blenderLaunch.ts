import { spawn } from 'node:child_process'

// Lancement de Blender avec son interface, comme un programme indépendant : fermer NeoScenar
// ne ferme pas Blender. Aucun fichier .blend n'est passé : Blender démarre sur un nouveau fichier,
// puis un court script appelle l'import du plugin storyboard une fois l'interface prête.

/** Opérateur du plugin storyboard (étape 5b). */
export const IMPORT_OPERATOR = 'import_neoscenar'

/**
 * Chaîne Python entre guillemets. Tout ce qui n'est pas ASCII imprimable est écrit en \\uXXXX :
 * guillemets, apostrophes, accents et espaces passent sans risque, quel que soit le système.
 */
export function pythonString(value: string): string {
  let result = '"'
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0
    if (char === '"' || char === '\\') result += `\\${char}`
    else if (code >= 0x20 && code < 0x7f) result += char
    else if (code <= 0xffff) result += `\\u${code.toString(16).padStart(4, '0')}`
    else result += `\\U${code.toString(16).padStart(8, '0')}`
  }
  return `${result}"`
}

/** Script passé à « --python-expr ». */
export function buildImportScript(jsonPath: string, pluginMissingMessage: string): string {
  return [
    'import bpy, textwrap',
    `_NEOSCENAR_JSON = ${pythonString(jsonPath)}`,
    `_NEOSCENAR_MESSAGE = ${pythonString(pluginMissingMessage)}`,
    '',
    'def _neoscenar_popup(window, title, text):',
    '    def draw(menu, context):',
    '        for line in textwrap.wrap(text, 60):',
    '            menu.layout.label(text=line)',
    '    with bpy.context.temp_override(window=window, screen=window.screen):',
    "        bpy.context.window_manager.popup_menu(draw, title=title, icon='ERROR')",
    '',
    'def _neoscenar_import():',
    '    wm = bpy.context.window_manager',
    '    if wm is None or not wm.windows:',
    '        return 0.5',
    '    window = wm.windows[0]',
    '    try:',
    `        bpy.ops.sb.${IMPORT_OPERATOR}.get_rna_type()`,
    '    except Exception:',
    "        _neoscenar_popup(window, 'NeoScenar', _NEOSCENAR_MESSAGE)",
    '        return None',
    '    try:',
    '        with bpy.context.temp_override(window=window, screen=window.screen):',
    `            bpy.ops.sb.${IMPORT_OPERATOR}(filepath=_NEOSCENAR_JSON)`,
    '    except Exception as error:',
    "        _neoscenar_popup(window, 'NeoScenar', str(error))",
    '    return None',
    '',
    'bpy.app.timers.register(_neoscenar_import, first_interval=1.0)',
    ''
  ].join('\n')
}

/** Arguments de la ligne de commande de Blender. */
export function buildLaunchArgs(jsonPath: string, pluginMissingMessage: string): string[] {
  return ['--python-expr', buildImportScript(jsonPath, pluginMissingMessage)]
}

export type Spawner = typeof spawn

/**
 * Lance le programme détaché (son propre groupe de processus, sans lien avec NeoScenar).
 * Les arguments sont passés tels quels, sans interpréteur de commandes : aucun échappement n'est
 * à faire pour la ligne de commande. Échoue si le programme ne peut pas démarrer.
 */
export function launchDetached(
  executable: string,
  args: string[],
  spawner: Spawner = spawn
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawner(executable, args, { detached: true, stdio: 'ignore' })
    child.once('error', reject)
    child.once('spawn', () => {
      child.unref()
      resolve()
    })
  })
}
