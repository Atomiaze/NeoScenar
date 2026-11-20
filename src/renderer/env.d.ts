/// <reference types="vite/client" />
import type { NeoScenarApi } from '../shared/api'

declare global {
  interface Window {
    neoscenar: NeoScenarApi
  }
}

export {}
