import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { APP_AUTHOR, APP_LICENSE, REPOSITORY_URL } from './appInfo'

describe('informations de l’application', () => {
  it('l’adresse du dépôt est une adresse GitHub https fixe', () => {
    expect(REPOSITORY_URL).toBe('https://github.com/Atomiaze/NeoScenar')
  })

  it('l’auteur et la licence suivent package.json', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as {
      author: string
      license: string
    }
    expect(pkg.author).toBe(APP_AUTHOR)
    expect(pkg.license.startsWith(APP_LICENSE)).toBe(true)
  })
})
