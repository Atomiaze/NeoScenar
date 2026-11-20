import { defineProject } from 'vitest/config'

export default defineProject({
  test: {
    name: 'pdf-scenario',
    include: ['tests/**/*.test.ts']
  }
})
