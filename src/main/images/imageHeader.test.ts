import { describe, expect, it } from 'vitest'
import { readImageHeader } from './imageHeader'
import { fakeJpeg, fakePng } from './testImages'

describe('en-tête des images', () => {
  it('lit les dimensions d’un PNG', () => {
    expect(readImageHeader(fakePng(1920, 1080))).toEqual({ kind: 'png', width: 1920, height: 1080 })
  })

  it('lit les dimensions d’un JPEG, même après un gros bloc EXIF', () => {
    expect(readImageHeader(fakeJpeg(4032, 3024, 30000))).toEqual({
      kind: 'jpeg',
      width: 4032,
      height: 3024
    })
  })

  it('refuse les autres formats et les fichiers tronqués', () => {
    expect(readImageHeader(new TextEncoder().encode('GIF89a……'))).toBeNull()
    expect(readImageHeader(fakePng(10, 10).subarray(0, 20))).toBeNull()
    expect(readImageHeader(fakeJpeg(10, 10).subarray(0, 50))).toBeNull()
    expect(readImageHeader(new Uint8Array())).toBeNull()
  })
})
