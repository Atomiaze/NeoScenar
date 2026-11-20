// Mode concentration (F5, comme dans KIT) : la fenêtre passe en plein écran, et retrouve en sortant
// l'état qu'elle avait avant (elle reste en plein écran si elle y était déjà).

export interface FullScreenWindow {
  isFullScreen(): boolean
  setFullScreen(fullScreen: boolean): void
}

export class FocusMode {
  private active = false
  private wasFullScreen = false

  get isActive(): boolean {
    return this.active
  }

  enter(window: FullScreenWindow): void {
    if (this.active) return
    this.active = true
    this.wasFullScreen = window.isFullScreen()
    if (!this.wasFullScreen) window.setFullScreen(true)
  }

  exit(window: FullScreenWindow | null): void {
    if (!this.active) return
    this.active = false
    if (window && !this.wasFullScreen && window.isFullScreen()) window.setFullScreen(false)
  }

  /** La fenêtre a quitté le plein écran par le système (bouton vert…) : le mode s'arrête aussi. */
  leftFullScreen(): boolean {
    if (!this.active) return false
    this.active = false
    return true
  }
}
