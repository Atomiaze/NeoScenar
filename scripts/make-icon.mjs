// Génère l'icône provisoire build/icon.png (1024 × 1024) : un carré arrondi bleu avec « NS ».
// Aucun outil externe : le dessin est fait pixel par pixel, puis encodé en PNG avec zlib.
import { writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync } from 'node:zlib'

const SIZE = 1024
const BACKGROUND = [47, 93, 138]
const LETTER = [255, 255, 255]

// Carré arrondi, avec une marge comme les icônes macOS.
function insideRoundedSquare(x, y) {
  const margin = 100
  const radius = 180
  const min = margin
  const max = SIZE - margin
  if (x < min || x >= max || y < min || y >= max) return false
  const cx = Math.min(Math.max(x, min + radius), max - radius)
  const cy = Math.min(Math.max(y, min + radius), max - radius)
  return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2
}

function rect(x, y, left, top, width, height) {
  return x >= left && x < left + width && y >= top && y < top + height
}

// Lettres dessinées avec des rectangles et une diagonale.
const TOP = 340
const HEIGHT = 344
const STROKE = 64

function insideN(x, y) {
  const left = 230
  const width = 260
  if (rect(x, y, left, TOP, STROKE, HEIGHT)) return true
  if (rect(x, y, left + width - STROKE, TOP, STROKE, HEIGHT)) return true
  if (y < TOP || y >= TOP + HEIGHT) return false
  const progress = (y - TOP) / HEIGHT
  const diagonalX = left + progress * (width - STROKE)
  return x >= diagonalX && x < diagonalX + STROKE
}

function insideS(x, y) {
  const left = 540
  const width = 254
  const middle = TOP + (HEIGHT - STROKE) / 2
  return (
    rect(x, y, left, TOP, width, STROKE) ||
    rect(x, y, left, TOP, STROKE, middle - TOP + STROKE) ||
    rect(x, y, left, middle, width, STROKE) ||
    rect(x, y, left + width - STROKE, middle, STROKE, TOP + HEIGHT - middle) ||
    rect(x, y, left, TOP + HEIGHT - STROKE, width, STROKE)
  )
}

function pixelColor(x, y) {
  if (!insideRoundedSquare(x, y)) return [0, 0, 0, 0]
  if (insideN(x, y) || insideS(x, y)) return [...LETTER, 255]
  return [...BACKGROUND, 255]
}

function crc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) {
    crc ^= byte
    for (let k = 0; k < 8; k++) crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, crc])
}

function encodePng() {
  const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1))
  for (let y = 0; y < SIZE; y++) {
    const rowStart = y * (SIZE * 4 + 1)
    raw[rowStart] = 0 // aucun filtre
    for (let x = 0; x < SIZE; x++) {
      Buffer.from(pixelColor(x, y)).copy(raw, rowStart + 1 + x * 4)
    }
  }
  const header = Buffer.alloc(13)
  header.writeUInt32BE(SIZE, 0)
  header.writeUInt32BE(SIZE, 4)
  header[8] = 8 // 8 bits par canal
  header[9] = 6 // RVBA
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  return Buffer.concat([
    signature,
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0))
  ])
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const output = join(root, 'build', 'icon.png')
mkdirSync(dirname(output), { recursive: true })
writeFileSync(output, encodePng())
console.log(`Icône créée : ${output}`)
