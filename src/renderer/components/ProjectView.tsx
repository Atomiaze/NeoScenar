import { useEffect, useState } from 'react'
import type { ProjectSummary } from '../../shared/api'
import { CardsModule } from '../cards/CardsModule'
import { setSaveStatus, setSelection, unloadProject } from '../cards/cardsStore'
import { single } from '../cards/selection'
import { ResearchModule } from '../research/ResearchModule'
import { unloadCredits } from '../research/creditsStore'
import { researchStore, showSheet, unloadResearch } from '../research/researchStore'
import { resetSheetsLink, syncSheetsWithScript } from '../research/scriptSheetsLink'
import { refreshShootingAfterScript } from '../planning/shootingStore'
import { resetRename } from '../research/sheetRename'
import { ScriptModule } from '../script/ScriptModule'
import { StatsModule } from '../stats/StatsModule'
import { PlanningModule } from '../planning/PlanningModule'
import { unloadPlanning } from '../planning/planningStore'
import { unloadShooting } from '../planning/shootingStore'
import { goToLine } from '../script/navigator/navigatorStore'
import { openSheetByName } from '../research/researchStore'
import {
  checkScenario,
  scriptStore,
  setScenarioStatus,
  unloadScenario
} from '../script/scriptStore'
import { TitlePageDialog } from '../script/TitlePageDialog'
import { LinkDialogs } from '../scriptLink/LinkDialogs'
import { LinkBanner } from '../scriptLink/LinkBanner'
import { ScenarioConflictGate } from '../script/ScenarioConflictGate'
import { CardsDialogsLayer } from '../cards/CardsDialogs'
import { linkStore, openLink, unloadLink } from '../scriptLink/linkStore'
import { fr } from '../i18n/fr'
import { useStore } from '../state/createStore'
import { ModuleBar, type ModuleId } from './ModuleBar'
import { RestoreBanner } from '../versions/RestoreBanner'
import { watchChangesAfterRestore } from '../versions/versionsStore'

/** Fenêtre du projet ouvert : barre des modules à gauche, module actif à droite. */
export function ProjectView({
  project,
  onOpenSettings
}: {
  project: ProjectSummary
  onOpenSettings(): void
}) {
  const [module, setModule] = useState<ModuleId>('cards')
  const titlePageOpen = useStore(scriptStore, (state) => state.titlePageOpen)
  const focusMode = useStore(scriptStore, (state) => state.focusMode)
  const linkReady = useStore(linkStore, (state) => state.ready)
  // Le scénario et les cartes sont chargés et reliés dès l'ouverture, quel que soit le module affiché.
  useEffect(() => {
    void openLink(project.id)
  }, [project.id])
  // scenario.fountain a pu être modifié ailleurs (Obsidian…) : on vérifie dès que le lien est prêt et
  // à chaque retour dans NeoScenar, quel que soit le module affiché (les cartes suivent le texte).
  // Les fiches suivent le scénario aux mêmes moments (étape 10C), une fois le fichier relu.
  useEffect(() => {
    if (!linkReady) return
    const check = (): void =>
      void checkScenario().then(syncSheetsWithScript).then(refreshShootingAfterScript)
    check()
    window.addEventListener('focus', check)
    return () => window.removeEventListener('focus', check)
  }, [linkReady])
  // Après une restauration, l'annulation directe cesse dès que le projet est modifié.
  useEffect(() => (linkReady ? watchChangesAfterRestore() : undefined), [linkReady])
  // Le menu adapte Rechercher, le zoom et le mode concentration au module affiché.
  useEffect(() => {
    void window.neoscenar.setActiveModule(module)
  }, [module])
  useEffect(() => () => void window.neoscenar.setActiveModule(null), [])
  useEffect(() => window.neoscenar.onSaveStatus(setSaveStatus), [])
  useEffect(() => window.neoscenar.onScenarioStatus(setScenarioStatus), [])
  // Après chaque enregistrement du scénario (jamais à la frappe), les fiches suivent (étape 10C).
  useEffect(() => {
    let previous = scriptStore.get().status.state
    return scriptStore.subscribe(() => {
      const current = scriptStore.get().status.state
      if (current === 'saved' && previous !== 'saved' && linkStore.get().ready) {
        // Le plan de tournage suit aussi (étape 15D-3), une fois les fiches rapprochées.
        void syncSheetsWithScript().then(refreshShootingAfterScript)
      }
      previous = current
    })
  }, [])
  // Cmd + clic sur un nom, lien du bandeau : la fiche s'ouvre dans le module Recherches.
  useEffect(() => {
    let previous = researchStore.get().openRequest
    return researchStore.subscribe(() => {
      const current = researchStore.get().openRequest
      if (current !== previous) setModule('research')
      previous = current
    })
  }, [])
  // À la fermeture du projet, le découpage et le scénario sont retirés de la mémoire de l'interface.
  useEffect(() => unloadProject, [])
  useEffect(() => unloadScenario, [])
  useEffect(() => unloadLink, [])
  useEffect(
    () => () => {
      unloadResearch()
      unloadCredits()
    },
    []
  )
  // Le planning (et son historique d'annulation) appartient au projet : retiré avec lui.
  useEffect(() => unloadPlanning, [project.id])
  useEffect(() => unloadShooting, [project.id])
  useEffect(() => resetSheetsLink, [])
  useEffect(() => resetRename, [])

  // « Voir » dans le bandeau : la carte orpheline, sélectionnée dans les Cartes.
  const showCard = (id: string): void => {
    setSelection(single({ kind: 'scene', id }))
    setModule('cards')
  }

  // Clic sur une scène des statistiques : le Scénario s'affiche, puis l'éditeur (créé après le
  // changement de module) se place sur l'en-tête.
  const openScene = (line: number): void => {
    setModule('script')
    let attempts = 0
    const tryGo = (): void => {
      if (!goToLine(line) && ++attempts < 40) setTimeout(tryGo, 50)
    }
    setTimeout(tryGo, 0)
  }

  return (
    <div className="project-layout">
      {!focusMode && (
        <ModuleBar
          project={project}
          active={module}
          onSelect={setModule}
          onOpenSettings={onOpenSettings}
        />
      )}
      <div className="project-main">
        {linkReady && !focusMode && <RestoreBanner />}
        {linkReady && !focusMode && (
          <LinkBanner
            onShowCard={showCard}
            onOpenSheet={(sheet) => showSheet(sheet.kind, sheet.fileName)}
          />
        )}
        {!linkReady ? (
          <p className="cards-message muted">{fr.scriptLink.loading}</p>
        ) : module === 'research' ? (
          <ResearchModule />
        ) : module === 'cards' ? (
          <CardsModule projectId={project.id} settings={project.settings} />
        ) : module === 'stats' ? (
          <StatsModule
            onOpenScene={openScene}
            onOpenCharacter={(name) => void openSheetByName('personnages', name)}
          />
        ) : module === 'planning' ? (
          <PlanningModule />
        ) : (
          <ScriptModule projectId={project.id} />
        )}
      </div>
      {linkReady && <LinkDialogs />}
      {linkReady && <CardsDialogsLayer />}
      <ScenarioConflictGate />
      {titlePageOpen && <TitlePageDialog projectId={project.id} projectTitle={project.title} />}
    </div>
  )
}
