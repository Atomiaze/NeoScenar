import { useCallback, useEffect, useState } from 'react'
import type { ProjectSummary } from '../shared/api'
import { CompleteStructureDialog } from './components/CompleteStructureDialog'
import { AboutDialog } from './components/AboutDialog'
import { ErrorDialog } from './components/ErrorDialog'
import { HomeScreen } from './components/HomeScreen'
import { NewProjectDialog } from './components/NewProjectDialog'
import { ProjectSettingsDialog } from './components/ProjectSettingsDialog'
import { ProjectView } from './components/ProjectView'
import { SettingsDialog } from './components/SettingsDialog'
import { duplicateSceneAtCursor, duplicateSelection, handleUndoCommand } from './cards/actions'
import { zoomCommand } from './drawing/toolsStore'
import { BlenderExportDialog } from './blender/BlenderExportDialog'
import { blenderExportStore, closeBlenderExport, openBlenderExport } from './blender/exportStore'
import { PdfExportDialog } from './pdfExport/PdfExportDialog'
import { PlanningExportDialog } from './planningExport/PlanningExportDialog'
import {
  closePlanningExport,
  openPlanningExport,
  planningExportStore
} from './planningExport/planningExportStore'
import { StoryboardExportDialog } from './storyboardExport/StoryboardExportDialog'
import {
  closeStoryboardExport,
  openStoryboardExport,
  storyboardExportStore
} from './storyboardExport/storyboardExportStore'
import { CreditsExportDialog } from './credits/CreditsExportDialog'
import {
  closeCreditsExport,
  creditsExportStore,
  openCreditsExport
} from './credits/creditsExportStore'
import { closePdfExport, openPdfExport, pdfExportStore } from './pdfExport/pdfExportStore'
import { useStore } from './state/createStore'
import { handlePlanningUndo } from './planning/planningStore'
import { handleResearchUndo } from './research/researchStore'
import {
  checkLineWrapping,
  handleScriptUndo,
  exitFocusMode,
  getActiveView,
  openFind,
  openTitlePage,
  toggleElementBar,
  toggleFocusMode,
  zoomScript
} from './script/scriptStore'
import { toggleNavigatorShown } from './script/navigator/navigatorStore'
import { contextMenuInfo } from './script/editor/revision'
import {
  editCommentFromContextMenu,
  removeMarkFromContextMenu
} from './script/revision/revisionStore'
import { VersionsDialog } from './versions/VersionsDialog'
import { DraftEditorDialog, handleDraftUndo } from './script/draft/DraftEditorDialog'
import {
  clearRestoreError,
  openVersions,
  resetVersions,
  versionsStore
} from './versions/versionsStore'
import { fr } from './i18n/fr'

type OpenDialog =
  'none' | 'new-project' | 'complete-structure' | 'project-settings' | 'settings' | 'about'

export function App(): React.JSX.Element {
  const [project, setProject] = useState<ProjectSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dialog, setDialog] = useState<OpenDialog>('none')
  const blenderExportOpen = useStore(blenderExportStore, (state) => state.open)
  const pdfExportOpen = useStore(pdfExportStore, (state) => state.open)
  const storyboardExportOpen = useStore(storyboardExportStore, (state) => state.open)
  const planningExportOpen = useStore(planningExportStore, (state) => state.open)
  const creditsExportOpen = useStore(creditsExportStore, (state) => state.open)
  const versionsOpen = useStore(versionsStore, (state) => state.open)
  const reloading = useStore(versionsStore, (state) => state.reloading)
  const generation = useStore(versionsStore, (state) => state.generation)
  const restoreError = useStore(versionsStore, (state) => state.restoreError)

  useEffect(() => {
    window.neoscenar.getInitialState().then((state) => {
      setProject(state.project)
      if (state.error) setError(state.error)
    })
    const unsubscribers = [
      window.neoscenar.onProjectChanged((changed) => {
        // Un autre projet (ou aucun) : les versions et le bandeau de restauration ne valent plus.
        setProject((previous) => {
          if (previous?.location !== changed?.location) resetVersions()
          return changed
        })
        setDialog('none')
        closeBlenderExport()
        closePdfExport()
        closeStoryboardExport()
        closePlanningExport()
        closeCreditsExport()
      }),
      window.neoscenar.onError(setError),
      window.neoscenar.onRevisionContextQuery(() =>
        contextMenuInfo(getActiveView()?.state ?? null)
      ),
      window.neoscenar.onMenuCommand((command) => {
        if (command === 'undo' || command === 'redo') {
          if (
            !handleDraftUndo(command) &&
            !handlePlanningUndo(command) &&
            !handleResearchUndo(command) &&
            !handleScriptUndo(command)
          ) {
            handleUndoCommand(command)
          }
        } else if (command === 'duplicate') duplicateSelection()
        else if (command === 'duplicate-scene') duplicateSceneAtCursor()
        else if (command === 'export-blender') openBlenderExport()
        else if (command === 'export-pdf') openPdfExport()
        else if (command === 'export-storyboard') openStoryboardExport()
        else if (command === 'export-planning') openPlanningExport()
        else if (command === 'export-credits') openCreditsExport()
        else if (command === 'versions') void openVersions()
        else if (command === 'toggle-scene-navigator') void toggleNavigatorShown()
        else if (command === 'toggle-element-bar') void toggleElementBar()
        else if (command === 'check-line-wrapping') checkLineWrapping()
        else if (command === 'title-page') openTitlePage()
        else if (command === 'find') openFind()
        else if (command === 'toggle-focus-mode') toggleFocusMode()
        else if (command === 'exit-focus-mode') exitFocusMode()
        else if (command === 'revision-edit-comment') editCommentFromContextMenu()
        else if (command === 'revision-remove-mark') removeMarkFromContextMenu()
        else if (
          command === 'script-zoom-in' ||
          command === 'script-zoom-out' ||
          command === 'script-zoom-reset'
        ) {
          void zoomScript(command.replace('script-zoom-', '') as 'in' | 'out' | 'reset')
        } else if (
          command === 'drawing-zoom-in' ||
          command === 'drawing-zoom-out' ||
          command === 'drawing-zoom-reset'
        ) {
          zoomCommand(command.replace('drawing-zoom-', '') as 'in' | 'out' | 'reset')
        } else setDialog(command)
      })
    ]
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe())
  }, [])

  const closeDialog = useCallback((): void => setDialog('none'), [])

  return (
    <>
      {project && reloading ? (
        <p className="versions-reloading muted">{fr.versions.reloading}</p>
      ) : project ? (
        // La clé change à chaque restauration de version : la vue est recréée et tout est relu.
        <ProjectView
          key={generation}
          project={project}
          onOpenSettings={() => setDialog('project-settings')}
        />
      ) : (
        <HomeScreen
          onNewProject={() => setDialog('new-project')}
          onAbout={() => setDialog('about')}
          onError={setError}
        />
      )}
      {dialog === 'new-project' && <NewProjectDialog onClose={closeDialog} />}
      {dialog === 'complete-structure' && project && (
        <CompleteStructureDialog onClose={closeDialog} onError={setError} />
      )}
      {dialog === 'project-settings' && project && (
        <ProjectSettingsDialog project={project} onClose={closeDialog} />
      )}
      {blenderExportOpen && project && <BlenderExportDialog />}
      {pdfExportOpen && project && <PdfExportDialog />}
      {storyboardExportOpen && project && <StoryboardExportDialog />}
      {planningExportOpen && project && <PlanningExportDialog title={project.title} />}
      {creditsExportOpen && project && (
        <CreditsExportDialog resolution={project.settings.resolution} />
      )}
      {versionsOpen && project && <VersionsDialog />}
      {project && <DraftEditorDialog />}
      {dialog === 'settings' && <SettingsDialog onClose={closeDialog} />}
      {dialog === 'about' && <AboutDialog onClose={closeDialog} />}
      {restoreError && <ErrorDialog message={restoreError} onClose={clearRestoreError} />}
      {error && <ErrorDialog message={error} onClose={() => setError(null)} />}
    </>
  )
}
