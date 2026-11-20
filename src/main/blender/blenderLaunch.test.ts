import { execFileSync } from 'node:child_process'
import { EventEmitter } from 'node:events'
import { describe, expect, it } from 'vitest'
import {
  buildImportScript,
  buildLaunchArgs,
  launchDetached,
  pythonString,
  type Spawner
} from './blenderLaunch'

const TRICKY_PATH =
  '/Users/élève/Mes films/L\'été "chaud" \\ 🎬/neoscenar/blender/export/decoupage.json'

function hasPython(): boolean {
  try {
    execFileSync('python3', ['--version'])
    return true
  } catch {
    return false
  }
}

describe('chaîne Python', () => {
  it('échappe guillemets, barres obliques inverses, accents et émojis', () => {
    expect(pythonString('a"b\\c')).toBe('"a\\"b\\\\c"')
    expect(pythonString("L'été")).toBe('"L\'\\u00e9t\\u00e9"')
    expect(pythonString('🎬')).toBe('"\\U0001f3ac"')
    expect(pythonString('a\nb')).toBe('"a\\u000ab"')
  })

  it.skipIf(!hasPython())('Python relit exactement le chemin d’origine', () => {
    const printed = execFileSync('python3', [
      '-c',
      `import sys; sys.stdout.buffer.write(${pythonString(TRICKY_PATH)}.encode("utf-8"))`
    ])
    expect(printed.toString('utf8')).toBe(TRICKY_PATH)
  })
})

describe('arguments de lancement', () => {
  it('pas de fichier .blend, puis --python-expr avec le chemin absolu du JSON', () => {
    const args = buildLaunchArgs(TRICKY_PATH, 'Installez l’extension')
    expect(args).toHaveLength(2)
    expect(args[0]).toBe('--python-expr')
    expect(args[1]).toContain(`_NEOSCENAR_JSON = ${pythonString(TRICKY_PATH)}`)
    expect(args[1]).toContain('bpy.ops.sb.import_neoscenar(filepath=_NEOSCENAR_JSON)')
    expect(args[1]).toContain('bpy.app.timers.register(_neoscenar_import')
    // Le script reste en ASCII : aucun souci d'encodage de la ligne de commande.
    expect(args[1]).toMatch(/^[\x20-\x7e\n]*$/)
  })

  it.skipIf(!hasPython())('le script est du Python valide', () => {
    const script = buildImportScript(TRICKY_PATH, 'Message « test »')
    expect(() =>
      execFileSync('python3', ['-c', 'import sys; compile(sys.stdin.read(), "s", "exec")'], {
        input: script
      })
    ).not.toThrow()
  })
})

describe('lancement détaché', () => {
  function fakeSpawner(event: 'spawn' | 'error'): { spawner: Spawner; calls: unknown[][] } {
    const calls: unknown[][] = []
    const spawner = ((...args: unknown[]) => {
      calls.push(args)
      const child = Object.assign(new EventEmitter(), { unref: () => undefined })
      setTimeout(() => child.emit(event, new Error('EACCES')), 0)
      return child
    }) as unknown as Spawner
    return { spawner, calls }
  }

  it('lance sans interpréteur de commandes, détaché de NeoScenar', async () => {
    const { spawner, calls } = fakeSpawner('spawn')
    await launchDetached('/A/Blender', ['--python-expr', 'x'], spawner)
    expect(calls).toEqual([
      ['/A/Blender', ['--python-expr', 'x'], { detached: true, stdio: 'ignore' }]
    ])
  })

  it('signale un programme qui ne peut pas démarrer', async () => {
    const { spawner } = fakeSpawner('error')
    await expect(launchDetached('/A/Blender', [], spawner)).rejects.toThrow('EACCES')
  })
})
