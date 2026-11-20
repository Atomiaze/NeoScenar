import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

// Points d'entrée par défaut d'electron-vite :
// src/main/index.ts, src/preload/index.ts et src/renderer/index.html
export default defineConfig({
  main: {},
  preload: {},
  renderer: {
    plugins: [react()]
  }
})
