// Outils de l'extension Blender (blender-addon/) :
//   npm run test:addon   → tests lancés par Blender 4.5 en arrière-plan
//   npm run build:addon  → zip installable dans dist/addon/
// Blender 4.5 est cherché comme dans NeoScenar (Applications sur Mac). Sinon, indiquer son
// chemin : npm run test:addon -- --blender "/chemin/vers/Blender.app"  (ou variable BLENDER).

import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const addonDir = join(root, 'blender-addon')

/** Programme à lancer : sur Mac, l'exécutable caché dans « Blender.app ». */
function executable(path) {
  return path.endsWith('.app') ? join(path, 'Contents', 'MacOS', 'Blender') : path
}

function version(exe) {
  try {
    const output = execFileSync(exe, ['--version'], { encoding: 'utf8', timeout: 60_000 })
    return /^Blender (\d+\.\d+)/m.exec(output)?.[1] ?? null
  } catch {
    return null
  }
}

function candidates() {
  if (process.platform !== 'darwin') return []
  return ['/Applications', join(homedir(), 'Applications')].flatMap((folder) => {
    if (!existsSync(folder)) return []
    return readdirSync(folder)
      .filter((name) => /^blender.*\.app$/i.test(name))
      .map((name) => join(folder, name))
  })
}

function findBlender(args) {
  const index = args.indexOf('--blender')
  const given = index >= 0 ? args[index + 1] : process.env.BLENDER
  if (given) {
    const exe = executable(given)
    const found = version(exe)
    if (found !== '4.5') fail(`${given} n'est pas Blender 4.5 (version trouvée : ${found ?? '?'}).`)
    return exe
  }
  const matching = candidates().filter((path) => version(executable(path)) === '4.5')
  if (matching.length === 0) {
    fail('Blender 4.5 introuvable. Indiquez son chemin : npm run test:addon -- --blender "…"')
  }
  if (matching.length > 1) console.log(`Plusieurs Blender 4.5 trouvés, utilisé : ${matching[0]}`)
  return executable(matching[0])
}

function fail(message) {
  console.error(message)
  process.exit(1)
}

function run(exe, args) {
  const result = spawnSync(exe, args, { stdio: 'inherit' })
  process.exit(result.status ?? 1)
}

const [command, ...args] = process.argv.slice(2)
if (command === 'test') {
  run(findBlender(args), [
    '-b',
    '--factory-startup',
    '--python-exit-code',
    '1',
    '--python',
    join(addonDir, 'tests', 'run.py')
  ])
} else if (command === 'build') {
  const output = join(root, 'dist', 'addon')
  mkdirSync(output, { recursive: true })
  run(findBlender(args), [
    '--factory-startup',
    '--command',
    'extension',
    'build',
    '--source-dir',
    join(addonDir, 'storyboard_plans'),
    '--output-dir',
    output
  ])
} else {
  fail('Usage : node scripts/addon.mjs test|build [--blender chemin]')
}
