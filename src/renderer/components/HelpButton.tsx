import { useState } from 'react'
import type { HelpTab } from '../../shared/helpContent'
import { HelpDialog } from './HelpDialog'

/** Textes de l'aide d'un module (dans `fr.ts`). */
export interface ModuleHelp {
  readonly button: string
  readonly buttonTitle: string
  readonly title: string
  readonly tabs: readonly HelpTab[]
}

/** Bouton « Aide » d'un module et sa fenêtre (même fenêtre que l'aide du Scénario). */
export function HelpButton({ help, className }: { help: ModuleHelp; className?: string }) {
  const [shown, setShown] = useState(false)
  return (
    <>
      <button
        type="button"
        className={className}
        title={help.buttonTitle}
        data-help-button
        onClick={() => setShown(true)}
      >
        {help.button}
      </button>
      {shown && <HelpDialog title={help.title} tabs={help.tabs} onClose={() => setShown(false)} />}
    </>
  )
}
