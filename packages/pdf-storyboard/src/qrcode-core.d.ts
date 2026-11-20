// Types du cœur de « qrcode » (non décrit par @types/qrcode).
declare module 'qrcode/lib/core/qrcode.js' {
  interface BitMatrix {
    size: number
    get(row: number, col: number): number | boolean
  }
  const core: {
    create(
      text: string,
      options: { errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H' }
    ): {
      modules: BitMatrix
      version: number
    }
  }
  export default core
}
