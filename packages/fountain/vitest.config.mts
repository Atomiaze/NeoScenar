import { defineProject } from 'vitest/config'

export default defineProject({
  test: {
    name: 'fountain',
    include: ['tests/**/*.test.ts']
  }
})
