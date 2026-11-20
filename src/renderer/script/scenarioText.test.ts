import { describe, expect, it } from 'vitest'
import { joinScenario, splitScenario } from './scenarioText'

describe('scénario découpé pour l’éditeur', () => {
  it('l’éditeur ne reçoit que le corps ; la page de titre est conservée telle quelle', () => {
    const parts = splitScenario('Title: Essai\nAuthor:\n\nINT. CUISINE - JOUR\n')
    expect(parts.titlePage).toBe('Title: Essai\nAuthor:\n\n')
    expect(parts.body).toBe('INT. CUISINE - JOUR\n')
  })

  it('un nouveau projet donne un corps vide', () => {
    expect(splitScenario('Title: Essai\nAuthor:\n\n').body).toBe('')
  })

  it('réécrit exactement un fichier non modifié écrit avec « \\n »', () => {
    for (const text of ['Title: Essai\n\nAction.\n', '\uFEFFINT. A - JOUR\n\nAction.', '']) {
      const parts = splitScenario(text)
      expect(joinScenario(parts, parts.body)).toBe(text)
    }
  })

  it('écrit toujours « \\n », même pour un fichier de Windows ou mélangé (étape 16A)', () => {
    const parts = splitScenario('Title: Essai\r\n\r\nAction.\r\n')
    expect(parts.body).toBe('Action.\n')
    expect(joinScenario(parts, 'Action.\nSuite.\n')).toBe('Title: Essai\n\nAction.\nSuite.\n')
    const mixed = splitScenario('Title: Essai\r\nAuthor: Moi\r\n\r\nUn.\r\nDeux.\rTrois.\n')
    expect(joinScenario(mixed, mixed.body)).toBe(
      'Title: Essai\nAuthor: Moi\n\nUn.\nDeux.\nTrois.\n'
    )
  })
})
