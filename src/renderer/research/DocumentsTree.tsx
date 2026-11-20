import { useState } from 'react'
import { countDocuments, type DocumentFolder } from '../../shared/research/documents'
import { Icon } from '../components/Icon'
import { fr } from '../i18n/fr'
import { useStore } from '../state/createStore'
import { researchStore, selectDocument } from './researchStore'

const t = fr.research

interface NodeProps {
  folder: DocumentFolder
  depth: number
  collapsed: ReadonlySet<string>
  toggle(path: string): void
}

/** Un dossier de l'arbre : sa ligne, puis ses sous-dossiers et ses notes. */
function FolderNode({ folder, depth, collapsed, toggle }: NodeProps) {
  const selection = useStore(researchStore, (state) =>
    state.section === 'documents' ? state.docSelected : null
  )
  const isCollapsed = collapsed.has(folder.path)
  const hasChildren = folder.folders.length > 0 || folder.notes.length > 0
  const current = selection?.type === 'folder' && selection.path === folder.path
  const indent = { paddingLeft: `${10 + depth * 14}px` }

  return (
    <li role="none">
      <div
        role="option"
        aria-selected={current}
        aria-expanded={hasChildren ? !isCollapsed : undefined}
        className={`sheet-row doc-folder-row${current ? ' selected' : ''}`}
        style={indent}
        title={t.docs.openFolder(folder.name)}
        onClick={() => selectDocument({ type: 'folder', path: folder.path })}
      >
        <button
          type="button"
          className="doc-chevron"
          tabIndex={-1}
          aria-hidden="true"
          style={hasChildren ? undefined : { visibility: 'hidden' }}
          onClick={(event) => {
            event.stopPropagation()
            toggle(folder.path)
          }}
        >
          <Icon name={isCollapsed ? 'chevronRight' : 'chevronDown'} size={14} />
        </button>
        <span className="sheet-row-text">
          <span className="sheet-row-name">{folder.name}</span>
        </span>
      </div>
      {!isCollapsed && hasChildren && (
        <ul role="group">
          {folder.folders.map((child) => (
            <FolderNode
              key={child.path}
              folder={child}
              depth={depth + 1}
              collapsed={collapsed}
              toggle={toggle}
            />
          ))}
          {folder.notes.map((note) => {
            const noteCurrent = selection?.type === 'note' && selection.path === note.path
            return (
              <li
                key={note.path}
                role="option"
                aria-selected={noteCurrent}
                className={`sheet-row doc-note-row${noteCurrent ? ' selected' : ''}`}
                style={{ paddingLeft: `${10 + (depth + 1) * 14 + 18}px` }}
                title={t.docs.openNote(note.name)}
                onClick={() => selectDocument({ type: 'note', path: note.path })}
              >
                <span className="sheet-row-text">
                  <span className="sheet-row-name">{note.name}</span>
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </li>
  )
}

/** Branche « Documents » de l'arbre : les vrais dossiers de neoscenar/documents/. */
export function DocumentsBranch() {
  const documents = useStore(researchStore, (state) => state.documents)
  const section = useStore(researchStore, (state) => state.section)
  const selection = useStore(researchStore, (state) => state.docSelected)
  const [open, setOpen] = useState(true)
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set())
  const isActive = section === 'documents'
  const rootSelected = isActive && selection === null

  const toggle = (path: string): void =>
    setCollapsed((previous) => {
      const next = new Set(previous)
      if (!next.delete(path)) next.add(path)
      return next
    })

  return (
    <li className="research-branch">
      <button
        className={`research-branch-title${rootSelected ? ' active' : ''}`}
        aria-expanded={open}
        onClick={() => {
          setOpen(!open || !isActive)
          // La racine : « Nouveau dossier » et « Nouvelle note » y créent.
          selectDocument(null)
        }}
      >
        <Icon name={open ? 'chevronDown' : 'chevronRight'} size={14} />
        {t.documents}
        <span className="research-count">{documents ? countDocuments(documents) : 0}</span>
      </button>
      {open && (
        <ul className="sheet-list" role="listbox" aria-label={t.documents}>
          {documents === null && <li className="sheet-list-empty muted">{t.loading}</li>}
          {documents && countDocuments(documents) === 0 && (
            <li className="sheet-list-empty muted">{t.docs.emptyDocuments}</li>
          )}
          {documents?.folders.map((folder) => (
            <FolderNode
              key={folder.path}
              folder={folder}
              depth={0}
              collapsed={collapsed}
              toggle={toggle}
            />
          ))}
          {documents?.notes.map((note) => {
            const current = selection?.type === 'note' && selection.path === note.path
            return (
              <li
                key={note.path}
                role="option"
                aria-selected={isActive && current}
                className={`sheet-row doc-note-row${isActive && current ? ' selected' : ''}`}
                style={{ paddingLeft: '28px' }}
                title={t.docs.openNote(note.name)}
                onClick={() => selectDocument({ type: 'note', path: note.path })}
              >
                <span className="sheet-row-text">
                  <span className="sheet-row-name">{note.name}</span>
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </li>
  )
}
