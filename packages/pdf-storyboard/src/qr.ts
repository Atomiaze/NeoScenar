// Matrice du QR code (cœur pur de la bibliothèque « qrcode », licence MIT : ni DOM, ni Node).

import core from 'qrcode/lib/core/qrcode.js'

/** Cases noires du QR code : matrix[ligne][colonne]. Correction d'erreur M (15 %). */
export function qrMatrix(payload: string): boolean[][] {
  const { modules } = core.create(payload, { errorCorrectionLevel: 'M' })
  const rows: boolean[][] = []
  for (let row = 0; row < modules.size; row++) {
    const line: boolean[] = []
    for (let col = 0; col < modules.size; col++) line.push(Boolean(modules.get(row, col)))
    rows.push(line)
  }
  return rows
}
