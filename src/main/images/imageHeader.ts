// Type et dimensions d'une image PNG ou JPEG, lus dans ses premiers octets, sans la décoder.

export interface ImageHeader {
  kind: 'png' | 'jpeg'
  width: number
  height: number
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

function readUint16(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] << 8) | bytes[offset + 1]
}

function readUint32(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset] << 24) >>> 0) +
    (bytes[offset + 1] << 16) +
    (bytes[offset + 2] << 8) +
    bytes[offset + 3]
  )
}

function readPng(bytes: Uint8Array): ImageHeader | null {
  if (bytes.length < 24 || !PNG_SIGNATURE.every((value, i) => bytes[i] === value)) return null
  // Premier bloc « IHDR » : largeur puis hauteur.
  if (String.fromCharCode(...bytes.subarray(12, 16)) !== 'IHDR') return null
  return { kind: 'png', width: readUint32(bytes, 16), height: readUint32(bytes, 20) }
}

/** Marqueurs « début d'image » (SOF) d'un JPEG, qui contiennent ses dimensions. */
const JPEG_SOF = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf
])

function readJpeg(bytes: Uint8Array): ImageHeader | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null
  let offset = 2
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) return null
    const marker = bytes[offset + 1]
    if (marker === 0xff) {
      offset += 1 // octet de remplissage
      continue
    }
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2
      continue
    }
    if (marker === 0xd9 || marker === 0xda) return null // fin, ou données avant les dimensions
    const length = readUint16(bytes, offset + 2)
    if (JPEG_SOF.has(marker)) {
      if (offset + 9 > bytes.length) return null
      return {
        kind: 'jpeg',
        height: readUint16(bytes, offset + 5),
        width: readUint16(bytes, offset + 7)
      }
    }
    offset += 2 + length
  }
  return null
}

/** Null si ce n'est ni un PNG ni un JPEG lisible. */
export function readImageHeader(bytes: Uint8Array): ImageHeader | null {
  const header = readPng(bytes) ?? readJpeg(bytes)
  return header && header.width > 0 && header.height > 0 ? header : null
}
