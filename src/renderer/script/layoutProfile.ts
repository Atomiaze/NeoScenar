import { PRINTED_TYPES, resolveLayout, type LayoutProfile } from '@neoscenar/fountain'
import profileJson from '../../../resources/mise-en-page/final-draft-a4.json'

/** Profil « Scénario Final Draft (A4) » livré avec l'application, partagé avec l'export PDF. */
export const scriptLayout = resolveLayout(profileJson as LayoutProfile)

/**
 * Mesures du profil en variables CSS (nombres de caractères, sans unité) : la police étant à chasse
 * fixe, les retraits et largeurs en « ch » rendent l'écran fidèle à la page.
 */
export function layoutCssVariables(): Record<string, string> {
  const variables: Record<string, string> = {
    '--text-width': String(scriptLayout.textWidthCh)
  }
  for (const type of PRINTED_TYPES) {
    const style = scriptLayout.styles[type]
    variables[`--indent-${type}`] = style.indentCh.toFixed(3)
    variables[`--width-${type}`] = String(style.wrapWidth)
  }
  return variables
}
