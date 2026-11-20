import { configDefaults, defineConfig } from 'vitest/config'

// Un seul « npm test » lance les tests de l'application et ceux du module Fountain.
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'app',
          include: ['src/**/*.test.ts'],
          // L'extension Blender a ses propres tests, lancés par Blender (npm run test:addon).
          exclude: [...configDefaults.exclude, 'blender-addon/**'],
          environment: 'node'
        }
      },
      'packages/fountain',
      'packages/pdf-scenario',
      'packages/pdf-storyboard',
      'packages/pdf-planning'
    ]
  }
})
