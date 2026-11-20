import { defineProject } from 'vitest/config'

export default defineProject({
  test: {
    name: 'pdf-planning',
    include: ['tests/**/*.test.ts']
  }
})
