import type { TemplateFolder } from '../../shared/folderTemplate'

interface FolderChecklistProps {
  folders: TemplateFolder[]
  checked: ReadonlySet<string>
  onToggle(name: string): void
  /** Dossiers cochés et grisés (déjà présents), avec la mention à afficher. */
  locked?: ReadonlySet<string>
  lockedNote?: string
}

/** Liste des dossiers du film, une case à cocher et une description par dossier. */
export function FolderChecklist(props: FolderChecklistProps) {
  const { folders, checked, onToggle, locked, lockedNote } = props
  return (
    <ul className="folder-list">
      {folders.map((folder) => {
        const isLocked = locked?.has(folder.name) ?? false
        return (
          <li key={folder.name} className={isLocked ? 'locked' : ''}>
            <label>
              <input
                type="checkbox"
                checked={isLocked || checked.has(folder.name)}
                disabled={isLocked}
                onChange={() => onToggle(folder.name)}
              />
              <span className="folder-name">{folder.name}</span>
              <span className="folder-description">
                {folder.description}
                {folder.subfolders.length > 0 && (
                  <span className="folder-subfolders"> ({folder.subfolders.join(', ')})</span>
                )}
                {isLocked && lockedNote && <span className="badge">{lockedNote}</span>}
              </span>
            </label>
          </li>
        )
      })}
    </ul>
  )
}

/** Ajoute ou retire un nom d'un ensemble, sans modifier l'original. */
export function toggleInSet(set: ReadonlySet<string>, name: string): Set<string> {
  const next = new Set(set)
  if (next.has(name)) next.delete(name)
  else next.add(name)
  return next
}
