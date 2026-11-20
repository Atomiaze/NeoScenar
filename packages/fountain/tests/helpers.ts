import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse, type ElementType, type LayoutProfile } from '../src/index.ts'

const EXAMPLES_DIR = join(import.meta.dirname, 'exemples')

export function exampleNames(): string[] {
  return readdirSync(EXAMPLES_DIR).filter((name) => name.endsWith('.fountain'))
}

export function readExample(name: string): string {
  return readFileSync(join(EXAMPLES_DIR, name), 'utf8')
}

/** Types des éléments d'un texte, pour des tests de classification lisibles. */
export function types(text: string): ElementType[] {
  return parse(text).elements.map((element) => element.type)
}

/** Générateur pseudo-aléatoire reproductible (même graine = mêmes textes à chaque lancement). */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const PROFILE_PATH = join(
  import.meta.dirname,
  '..',
  '..',
  '..',
  'resources',
  'mise-en-page',
  'final-draft-a4.json'
)

/** Profil « Scénario Final Draft (A4) » livré avec l'application. */
export function readProfile(): LayoutProfile {
  return JSON.parse(readFileSync(PROFILE_PATH, 'utf8')) as LayoutProfile
}
