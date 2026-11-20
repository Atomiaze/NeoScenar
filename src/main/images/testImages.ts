// Fausses images pour les tests : seuls les octets lus par readImageHeader sont réalistes.

export function fakePng(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(33)
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13])
  bytes.set(
    [...'IHDR'].map((c) => c.charCodeAt(0)),
    12
  )
  new DataView(bytes.buffer).setUint32(16, width)
  new DataView(bytes.buffer).setUint32(20, height)
  return bytes
}

/** JPEG avec un bloc EXIF de `exifLength` octets avant les dimensions, comme une photo. */
export function fakeJpeg(width: number, height: number, exifLength = 100): Uint8Array {
  const exif = [
    0xff,
    0xe1,
    (exifLength + 2) >> 8,
    (exifLength + 2) & 0xff,
    ...new Array(exifLength).fill(0)
  ]
  const sof = [
    0xff,
    0xc0,
    0,
    17,
    8,
    height >> 8,
    height & 0xff,
    width >> 8,
    width & 0xff,
    3,
    ...new Array(9).fill(0)
  ]
  return new Uint8Array([0xff, 0xd8, ...exif, ...sof, 0xff, 0xda, 0, 2, 0xff, 0xd9])
}
