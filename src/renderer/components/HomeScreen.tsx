import { useEffect, useState } from 'react'
import type { HomeData, Result, ProjectSummary } from '../../shared/api'
import { APP_AUTHOR, APP_CREDITS } from '../../shared/appInfo'
import { fr } from '../i18n/fr'

/** Événement de la fenêtre : l'image d'accueil vient de changer (Réglages). */
export const WELCOME_IMAGE_EVENT = 'neoscenar:welcome-image-changed'

interface HomeScreenProps {
  onNewProject(): void
  onAbout(): void
  onError(message: string): void
}

export function HomeScreen({ onNewProject, onAbout, onError }: HomeScreenProps) {
  const [version, setVersion] = useState<string | null>(null)
  const [home, setHome] = useState<HomeData | null>(null)
  const [visual, setVisual] = useState<string | null>(null)

  useEffect(() => {
    window.neoscenar.getAppVersion().then(setVersion)
    const refresh = (): void => void window.neoscenar.getHomeData().then(setHome)
    refresh()
    const refreshVisual = (): void => void window.neoscenar.getWelcomeImage().then(setVisual)
    refreshVisual()
    // Les Réglages peuvent s'ouvrir par-dessus l'accueil : ils préviennent quand l'image change.
    window.addEventListener(WELCOME_IMAGE_EVENT, refreshVisual)
    // Une clé USB a pu être rebranchée ou un projet déplacé pendant que NeoScenar était en arrière-plan.
    window.addEventListener('focus', refresh)
    return () => {
      window.removeEventListener('focus', refresh)
      window.removeEventListener(WELCOME_IMAGE_EVENT, refreshVisual)
    }
  }, [])

  const handleResult = (result: Result<ProjectSummary> | null): void => {
    if (result && !result.ok) {
      onError(result.error)
      // Un projet devenu introuvable doit apparaître comme tel.
      window.neoscenar.getHomeData().then(setHome)
    }
  }

  const openRecent = async (filePath: string): Promise<void> => {
    handleResult(await window.neoscenar.openProject(filePath))
  }

  const removeRecent = async (filePath: string): Promise<void> => {
    setHome(await window.neoscenar.removeRecentProject(filePath))
  }

  return (
    <main className="home">
      <div className="home-visual" aria-hidden="true">
        {visual && <img src={visual} alt="" />}
      </div>
      <div className="home-content">
        <header className="home-header">
          <h1>{fr.app.name}</h1>
        </header>

        <div className="home-credit">
          <p>{fr.about.createdBy(APP_AUTHOR)}</p>
          {APP_CREDITS.map((credit) => (
            <p key={credit.role}>{fr.about.credit(credit.role, credit.name)}</p>
          ))}
          <p className="muted">
            {version ? fr.home.version(version) : fr.home.versionLoading} ·{' '}
            <button className="link-button" onClick={onAbout}>
              {fr.home.aboutLink}
            </button>
          </p>
        </div>

        <div className="home-actions">
          <button className="primary" onClick={onNewProject}>
            {fr.home.newProject}
          </button>
          <button onClick={async () => handleResult(await window.neoscenar.openProjectDialog())}>
            {fr.home.openProject}
          </button>
        </div>

        <section className="recent" aria-label={fr.home.recentTitle}>
          <h2>{fr.home.recentTitle}</h2>
          {home && home.recentProjects.length === 0 && (
            <p className="muted">{fr.home.recentEmpty}</p>
          )}
          <ul>
            {home?.recentProjects.map((recent) => (
              <li key={recent.filePath} className={recent.found ? '' : 'not-found'}>
                <button
                  className="recent-open"
                  disabled={!recent.found}
                  onClick={() => openRecent(recent.filePath)}
                >
                  <span className="recent-title">
                    {recent.title}
                    {!recent.found && <span className="badge">{fr.home.recentNotFound}</span>}
                  </span>
                  <span className="recent-location">{recent.location}</span>
                  <span className="recent-date">
                    {fr.home.recentOpenedOn(fr.common.formatDate(recent.lastOpenedAt))}
                  </span>
                </button>
                <button
                  className="recent-remove"
                  title={fr.home.recentRemove}
                  aria-label={fr.home.recentRemoveFor(recent.title)}
                  onClick={() => removeRecent(recent.filePath)}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  )
}
