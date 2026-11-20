import { readFile } from 'node:fs/promises'
import { fr } from '../../renderer/i18n/fr'
import { PROJECT_FORMAT_VERSION } from '../../shared/projectTypes'
import { isNotFoundError, ProjectError } from './errors'
import { parseJsonText } from '../../shared/lineEndings'

export type JsonObject = Record<string, unknown>

/** Lit un fichier JSON. Fichier absent ou contenu invalide → ProjectError au message clair. */
export async function readJsonFile(path: string, fileName: string): Promise<unknown> {
  let text: string
  try {
    text = await readFile(path, 'utf8')
  } catch (error) {
    if (isNotFoundError(error)) throw new ProjectError(fr.errors.missingFile(fileName))
    throw error
  }
  try {
    return parseJsonText(text)
  } catch {
    throw new ProjectError(fr.errors.unreadableJson(fileName))
  }
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Petites vérifications de champs pour un fichier donné. Chaque erreur nomme le fichier et le champ,
 * pour que l'élève (ou l'enseignant) puisse réparer le fichier à la main.
 */
export function createChecker(fileName: string) {
  const fail = (field: string): never => {
    throw new ProjectError(fr.errors.invalidField(fileName, field))
  }

  return {
    fail,

    root(value: unknown): JsonObject {
      if (!isObject(value)) throw new ProjectError(fr.errors.unreadableJson(fileName))
      return value
    },

    object(value: unknown, field: string): JsonObject {
      return isObject(value) ? value : fail(field)
    },

    string(value: unknown, field: string): string {
      return typeof value === 'string' ? value : fail(field)
    },

    nullableString(value: unknown, field: string): string | null {
      return value === null || typeof value === 'string' ? value : fail(field)
    },

    boolean(value: unknown, field: string): boolean {
      return typeof value === 'boolean' ? value : fail(field)
    },

    positiveInteger(value: unknown, field: string): number {
      return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : fail(field)
    },

    positiveNumber(value: unknown, field: string): number {
      return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fail(field)
    },

    nullableDuration(value: unknown, field: string): number | null {
      if (value === null) return null
      return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fail(field)
    },

    array(value: unknown, field: string): unknown[] {
      return Array.isArray(value) ? value : fail(field)
    },

    stringArray(value: unknown, field: string): string[] {
      if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) fail(field)
      return value as string[]
    },

    oneOf<T extends string>(value: unknown, allowed: readonly T[], field: string): T {
      return allowed.includes(value as T) ? (value as T) : fail(field)
    },

    /** Vérifie la version du format, en premier : un format plus récent peut avoir une autre forme. */
    formatVersion(data: JsonObject): number {
      const version = data['formatVersion']
      if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
        fail('formatVersion')
      }
      if ((version as number) > PROJECT_FORMAT_VERSION) {
        throw new ProjectError(fr.errors.tooRecent)
      }
      return version as number
    }
  }
}
