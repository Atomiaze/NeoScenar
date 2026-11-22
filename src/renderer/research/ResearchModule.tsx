import { useEffect } from 'react'
import { SaveIndicator } from '../components/SaveIndicator'
import { Icon } from '../components/Icon'
import { fr } from '../i18n/fr'
import { useStore } from '../state/createStore'
import { findFolder, findNote, parentPath } from '../../shared/research/documents'
import { loadDocuments } from './documentsActions'
import { DocumentFolderView, DocumentNoteView } from './DocumentViews'
import { CharacterSheetView } from './CharacterSheetView'
import { PlaceSheetView } from './PlaceSheetView'
import { ResearchDialogs } from './ResearchDialogs'
import { ResearchTree } from './ResearchTree'
import { CreditsView } from './CreditsView'
import { MarkdownDocumentView } from '../markdown/MarkdownDocumentView'
import { ComingSoonView, TitlePageView } from './ProjectSectionViews'
import { loadCredits } from './creditsStore'
import {
  currentSheet,
  loadSheets,
  openResearchDialog,
  researchStore,
  setResearchActive,
  setResearchStatus,
  showResearchError
} from './researchStore'

/** Module Recherches : arbre et liste des fiches à gauche, fiche ouverte à droite. */
export function ResearchModule({
  projectId,
  projectTitle
}: {
  projectId: string
  projectTitle: string
}) {
  const kind = useStore(researchStore, (state) => state.kind)
  const status = useStore(researchStore, (state) => state.status)
  const error = useStore(researchStore, (state) => state.error)
  const sheet = useStore(researchStore, currentSheet)
  const section = useStore(researchStore, (state) => state.section)
  const documents = useStore(researchStore, (state) => state.documents)
  const docSelected = useStore(researchStore, (state) => state.docSelected)

  useEffect(() => {
    setResearchActive(true)
    // Les fiches ont pu être modifiées ailleurs (Obsidian…) : relues à l'ouverture et au retour.
    void loadSheets()
    void loadDocuments()
    void loadCredits()
    const reload = (): void => {
      void loadSheets()
      void loadDocuments()
      void loadCredits()
    }
    window.addEventListener('focus', reload)
    const unsubscribe = window.neoscenar.onResearchStatus(setResearchStatus)
    return () => {
      window.removeEventListener('focus', reload)
      unsubscribe()
      setResearchActive(false)
      // En quittant le module, ce qui est en attente est écrit tout de suite.
      void window.neoscenar.flushSheets()
    }
  }, [])

  // « Nouveau » crée dans le dossier choisi (ou dans celui de la note ouverte) ; sinon à la racine.
  const parentFolder =
    docSelected?.type === 'folder'
      ? docSelected.path
      : docSelected
        ? parentPath(docSelected.path)
        : ''
  const docEntry = docSelected

  const docFolder =
    documents && docSelected?.type === 'folder' ? findFolder(documents, docSelected.path) : null
  const docNote =
    documents && docSelected?.type === 'note' ? findNote(documents, docSelected.path) : null
  const rootFolder = documents && docSelected === null ? documents : null

  return (
    <div className="research-module">
      <div className="toolbar" role="toolbar">
        {section === 'credits' ||
        (section !== 'sheets' && section !== 'documents') ? null : section === 'documents' ? (
          <div className="toolbar-group">
            <button
              className="tool-button"
              onClick={() =>
                openResearchDialog({ kind: 'docNew', what: 'folder', parent: parentFolder })
              }
            >
              <Icon name="plus" size={18} />
              <span>{fr.research.docs.newFolder}</span>
            </button>
            <button
              className="tool-button"
              onClick={() =>
                openResearchDialog({ kind: 'docNew', what: 'note', parent: parentFolder })
              }
            >
              <Icon name="plus" size={18} />
              <span>{fr.research.docs.newNote}</span>
            </button>
            <button
              className="tool-button"
              disabled={!docEntry}
              onClick={() => docEntry && openResearchDialog({ kind: 'docRename', entry: docEntry })}
            >
              <span>{fr.research.docs.rename}</span>
            </button>
            <button
              className="tool-button"
              disabled={!docEntry}
              onClick={() => docEntry && openResearchDialog({ kind: 'docDelete', entry: docEntry })}
            >
              <span>{fr.research.docs.delete}</span>
            </button>
          </div>
        ) : (
          <div className="toolbar-group">
            <button
              className="tool-button"
              title={kind === 'lieux' ? fr.research.newPlaceTitle : fr.research.newCharacterTitle}
              onClick={() => openResearchDialog({ kind: 'new' })}
            >
              <Icon name="plus" size={18} />
              <span>{fr.research.newSheet}</span>
            </button>
            <button
              className="tool-button"
              disabled={!sheet}
              onClick={() =>
                sheet && openResearchDialog({ kind: 'delete', fileName: sheet.fileName })
              }
            >
              <span>{fr.research.deleteSheet}</span>
            </button>
          </div>
        )}
        <div className="toolbar-group toolbar-status">
          <SaveIndicator status={status} />
        </div>
      </div>
      {error && (
        <div className="banner error research-error" role="alert">
          <span>{error}</span>
          <button onClick={() => showResearchError(null)}>{fr.common.close}</button>
        </div>
      )}
      <div className="research-body">
        <ResearchTree />
        <main className="research-sheet">
          {section === 'titlePage' ? (
            <TitlePageView projectId={projectId} projectTitle={projectTitle} />
          ) : section === 'synopsis' || section === 'pitch' || section === 'intention' ? (
            <MarkdownDocumentView
              key={section}
              name={section}
              title={fr.research.comingSoonViews[section].title}
            />
          ) : section === 'logLine' || section === 'tagLine' ? (
            <ComingSoonView section={section} />
          ) : section === 'credits' ? (
            <CreditsView />
          ) : section === 'documents' ? (
            docNote ? (
              <DocumentNoteView key={docNote.path} note={docNote} />
            ) : docFolder || rootFolder ? (
              <DocumentFolderView
                key={(docFolder ?? rootFolder)?.path}
                folder={(docFolder ?? rootFolder) as NonNullable<typeof rootFolder>}
              />
            ) : (
              <p className="panel-empty">{fr.research.docs.noSelection}</p>
            )
          ) : sheet ? (
            sheet.kind === 'lieux' ? (
              <PlaceSheetView key={`lieux/${sheet.fileName}`} sheet={sheet} />
            ) : (
              <CharacterSheetView key={`personnages/${sheet.fileName}`} sheet={sheet} />
            )
          ) : (
            <p className="panel-empty">{fr.research.noSelection}</p>
          )}
        </main>
      </div>
      <ResearchDialogs />
    </div>
  )
}
