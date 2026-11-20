import { useEffect, useState } from 'react'
import type { VersionScript } from '../../shared/api'

/** Lecture du scénario d'une version (`folder` null : scénario actuel). */
export type ScriptLoad =
  | { state: 'loading' }
  | { state: 'ready'; script: VersionScript }
  | { state: 'error'; message: string }

export function useVersionScript(folder: string | null): ScriptLoad {
  // Le résultat garde le dossier lu : tant qu'il ne correspond pas au choix, on est « en lecture ».
  const [load, setLoad] = useState<{ folder: string | null; load: ScriptLoad } | null>(null)
  useEffect(() => {
    let alive = true
    void window.neoscenar.readVersionScript(folder).then((result) => {
      if (!alive) return
      setLoad({
        folder,
        load: result.ok
          ? { state: 'ready', script: result.value }
          : { state: 'error', message: result.error }
      })
    })
    return () => {
      alive = false
    }
  }, [folder])
  return load !== null && load.folder === folder ? load.load : { state: 'loading' }
}
