import { describe, expect, it } from 'vitest'
import { duplicateItems } from './duplicate'
import { counterIds, makeDecoupage } from './testFixtures'
import { newShotsWithImages, withShotFiles } from './thumbnailFiles'

describe('fichiers des vignettes dupliquées', () => {
  const start = makeDecoupage({ '10': ['10', '20'] })
  start.scenes[0].shots[0].thumbnail = 'storyboard/vignettes/S10-P10_1.png'
  start.scenes[0].shots[0].thumbnailSource = 'storyboard/originaux/S10-P10_1.jpg'

  it('repère les copies illustrées (qui partagent encore les fichiers de l’original)', () => {
    const result = duplicateItems(start, ['S10'], counterIds())
    if (!result.ok) throw new Error(result.problem)
    const copies = newShotsWithImages(start, result.decoupage)
    expect(copies.map((shot) => shot.id)).toEqual(['id-2'])
    expect(copies[0].thumbnail).toBe('storyboard/vignettes/S10-P10_1.png')
  })

  it('attribue ensuite aux copies leurs propres fichiers, sans toucher à l’original', () => {
    const result = duplicateItems(start, ['S10-P10'], counterIds())
    if (!result.ok) throw new Error(result.problem)
    const after = withShotFiles(result.decoupage, {
      'id-1': {
        thumbnail: 'storyboard/vignettes/id-1_2.png',
        thumbnailSource: 'storyboard/originaux/id-1_2.jpg'
      }
    })
    const [original, copy] = after.scenes[0].shots
    expect(original.thumbnail).toBe('storyboard/vignettes/S10-P10_1.png')
    expect(copy.thumbnail).toBe('storyboard/vignettes/id-1_2.png')
    expect(copy.thumbnailSource).toBe('storyboard/originaux/id-1_2.jpg')
    expect(copy.thumbnailCrop).toEqual(original.thumbnailCrop)
  })
})
