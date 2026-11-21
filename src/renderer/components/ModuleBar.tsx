import { useEffect, useRef, useState } from 'react'
import type { ProjectSummary } from '../../shared/api'
import { fr } from '../i18n/fr'
import { Icon, type IconName } from './Icon'
import { openVersions } from '../versions/versionsStore'

/** Modules disponibles à cette étape. */
export type ModuleId = 'research' | 'cards' | 'script' | 'stats' | 'planning'

interface ModuleEntry {
  icon: IconName
  name: string
  id: ModuleId | null
}

// Les modules sans identifiant ne sont pas encore disponibles : visibles mais grisés.
const MODULES: ModuleEntry[] = [
  { icon: 'research', name: fr.modules.research, id: 'research' },
  { icon: 'planning', name: fr.modules.planning, id: 'planning' },
  { icon: 'cards', name: fr.modules.cards, id: 'cards' },
  { icon: 'script', name: fr.modules.script, id: 'script' },
  { icon: 'stats', name: fr.modules.stats, id: 'stats' }
]

/** Barre verticale des modules, avec en haut le menu du projet (☰). */
interface ModuleBarProps {
  project: ProjectSummary
  active: ModuleId
  onSelect(module: ModuleId): void
  onOpenSettings(): void
}

export function ModuleBar({ project, active, onSelect, onOpenSettings }: ModuleBarProps) {
  return (
    <nav className="module-bar" aria-label={fr.modules.project}>
      <ProjectMenu project={project} onOpenSettings={onOpenSettings} />
      {MODULES.map((module) => {
        const available = module.id !== null
        const current = module.id === active
        return (
          <button
            key={module.name}
            className={`module-button${current ? ' active' : ''}`}
            title={available ? module.name : fr.modules.comingSoon(module.name)}
            aria-label={module.name}
            aria-current={current ? 'page' : undefined}
            // aria-disabled plutôt que disabled : l'infobulle reste visible au survol.
            aria-disabled={!available}
            onClick={() => module.id && onSelect(module.id)}
          >
            <Icon name={module.icon} size={22} />
          </button>
        )
      })}
    </nav>
  )
}

function ProjectMenu({
  project,
  onOpenSettings
}: Pick<ModuleBarProps, 'project' | 'onOpenSettings'>) {
  const [open, setOpen] = useState(false)
  const container = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const closeOnOutsideClick = (event: MouseEvent): void => {
      if (!container.current?.contains(event.target as Node)) setOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('mousedown', closeOnOutsideClick)
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      window.removeEventListener('mousedown', closeOnOutsideClick)
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  return (
    <div className="project-menu" ref={container}>
      <button
        className="module-button"
        title={fr.modules.project}
        aria-label={fr.modules.project}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <Icon name="menu" size={22} />
      </button>
      {open && (
        <div className="project-menu-popover" role="menu">
          <p className="project-menu-title">{project.title}</p>
          <p className="muted path">{project.location}</p>
          <button
            role="menuitem"
            onClick={() => {
              setOpen(false)
              onOpenSettings()
            }}
          >
            {fr.project.settings}
          </button>
          <button
            role="menuitem"
            onClick={() => {
              setOpen(false)
              void openVersions()
            }}
          >
            {fr.versions.open}
          </button>
          <button role="menuitem" onClick={() => void window.neoscenar.closeProject()}>
            {fr.project.closeProject}
          </button>
        </div>
      )}
    </div>
  )
}
