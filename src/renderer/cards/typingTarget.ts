/** Vrai si la touche est destinée à un champ de saisie ou à une fenêtre ouverte. */
export function isTypingTarget(target: EventTarget | null): boolean {
  // La cible peut aussi être la fenêtre ou le document, qui ne sont pas des éléments.
  if (!(target instanceof HTMLElement)) return false
  if (target.closest('.overlay')) return true
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}
