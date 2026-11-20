import { packRgb, pixels32, type PixelRect, type Raster, type Rgb } from './raster'

// Pot de peinture : remplit la zone contiguë (voisins haut, bas, gauche, droite) dont la couleur
// est proche de celle du pixel cliqué.

/**
 * Écart maximal accepté sur chaque composante (rouge, vert, bleu), de 0 à 255. Assez grand pour
 * remplir les pixels adoucis du bord d'un trait scanné (pas de liseré clair), assez petit pour ne
 * jamais traverser le cœur sombre du trait. Valeur réglée par les tests.
 */
export const FILL_TOLERANCE = 100

/** Remplit à partir du pixel (x, y). Renvoie la zone modifiée, ou null si rien ne change. */
export function floodFill(
  raster: Raster,
  x: number,
  y: number,
  color: Rgb,
  tolerance = FILL_TOLERANCE
): PixelRect | null {
  const { width, height, data } = raster
  const startX = Math.floor(x)
  const startY = Math.floor(y)
  if (startX < 0 || startY < 0 || startX >= width || startY >= height) return null
  const seed = (startY * width + startX) * 4
  const [sr, sg, sb] = [data[seed], data[seed + 1], data[seed + 2]]
  // Cliquer sur une zone qui a déjà exactement la couleur active ne fait rien.
  if (sr === color.r && sg === color.g && sb === color.b) return null

  const pixels = pixels32(raster)
  const value = packRgb(color)
  const visited = new Uint8Array(width * height)
  const matches = (index: number): boolean => {
    if (visited[index]) return false
    const i = index * 4
    return (
      Math.abs(data[i] - sr) <= tolerance &&
      Math.abs(data[i + 1] - sg) <= tolerance &&
      Math.abs(data[i + 2] - sb) <= tolerance
    )
  }

  let minX = startX
  let maxX = startX
  let minY = startY
  let maxY = startY
  // Remplissage par segments horizontaux : rapide même sur toute la toile.
  const stack: number[] = [startX, startY]
  while (stack.length > 0) {
    const py = stack.pop() as number
    const px = stack.pop() as number
    const row = py * width
    if (!matches(row + px)) continue
    let left = px
    while (left > 0 && matches(row + left - 1)) left--
    let right = px
    while (right < width - 1 && matches(row + right + 1)) right++
    for (let i = row + left; i <= row + right; i++) visited[i] = 1
    pixels.fill(value, row + left, row + right + 1)
    minX = Math.min(minX, left)
    maxX = Math.max(maxX, right)
    minY = Math.min(minY, py)
    maxY = Math.max(maxY, py)
    // Lignes voisines : un point de départ par portion à remplir.
    for (const ny of [py - 1, py + 1]) {
      if (ny < 0 || ny >= height) continue
      const nrow = ny * width
      let inRun = false
      for (let nx = left; nx <= right; nx++) {
        const ok = matches(nrow + nx)
        if (ok && !inRun) stack.push(nx, ny)
        inRun = ok
      }
    }
  }
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 }
}
