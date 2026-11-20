import { useEffect, type ReactNode } from 'react'

interface DialogProps {
  title: string
  onClose(): void
  children: ReactNode
  /** Boutons en bas de la fenêtre. */
  actions: ReactNode
  role?: 'dialog' | 'alertdialog'
  /** Classe en plus, pour une fenêtre plus large par exemple. */
  className?: string
}

/** Fenêtre posée au-dessus de l'écran. La touche Échap la ferme. */
export function Dialog({
  title,
  onClose,
  children,
  actions,
  role = 'dialog',
  className
}: DialogProps) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="overlay">
      <section
        className={className ? `dialog ${className}` : 'dialog'}
        role={role}
        aria-modal="true"
        aria-label={title}
      >
        <h2>{title}</h2>
        <div className="dialog-body">{children}</div>
        <div className="dialog-actions">{actions}</div>
      </section>
    </div>
  )
}
