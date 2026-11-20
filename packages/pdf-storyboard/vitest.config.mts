import { defineProject } from 'vitest/config'

export default defineProject({
  test: {
    name: 'pdf-storyboard',
    include: ['tests/**/*.test.ts']
  }
})
