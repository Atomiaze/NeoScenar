import { describe, expect, it } from 'vitest'
import { FocusMode, type FullScreenWindow } from './focusMode'

function fakeWindow(fullScreen: boolean): FullScreenWindow & { fullScreen: boolean } {
  return {
    fullScreen,
    isFullScreen() {
      return this.fullScreen
    },
    setFullScreen(value: boolean) {
      this.fullScreen = value
    }
  }
}

describe('mode concentration', () => {
  it('passe en plein écran, puis revient en fenêtre normale', () => {
    const window = fakeWindow(false)
    const mode = new FocusMode()
    mode.enter(window)
    expect(mode.isActive).toBe(true)
    expect(window.fullScreen).toBe(true)
    mode.exit(window)
    expect(mode.isActive).toBe(false)
    expect(window.fullScreen).toBe(false)
  })

  it('une fenêtre déjà en plein écran y reste en sortant', () => {
    const window = fakeWindow(true)
    const mode = new FocusMode()
    mode.enter(window)
    mode.exit(window)
    expect(window.fullScreen).toBe(true)
  })

  it('quitter le plein écran par le système arrête le mode', () => {
    const window = fakeWindow(false)
    const mode = new FocusMode()
    mode.enter(window)
    window.fullScreen = false
    expect(mode.leftFullScreen()).toBe(true)
    expect(mode.isActive).toBe(false)
    expect(new FocusMode().leftFullScreen()).toBe(false)
  })

  it('entrer deux fois ne change pas l’état retenu', () => {
    const window = fakeWindow(false)
    const mode = new FocusMode()
    mode.enter(window)
    mode.enter(window)
    mode.exit(window)
    expect(window.fullScreen).toBe(false)
  })
})
