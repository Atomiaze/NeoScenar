// Contraste de deux couleurs (formule WCAG 2.x). Pur : sert au test des thèmes et, en 14B, à
// l'avertissement des couleurs du scénario.

export interface Rgba {
  r: number
  g: number
  b: number
  a: number
}

/** Lit « #rgb », « #rrggbb » ou « rgba(r, g, b, a) ». Renvoie null si le format est inconnu. */
export function parseColor(value: string): Rgba | null {
  const text = value.trim().toLowerCase()
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(text)
  if (hex) {
    const digits = hex[1].length === 3 ? [...hex[1]].map((c) => c + c).join('') : hex[1]
    const n = parseInt(digits, 16)
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 }
  }
  const rgba = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(text)
  if (rgba) {
    return { r: +rgba[1], g: +rgba[2], b: +rgba[3], a: rgba[4] === undefined ? 1 : +rgba[4] }
  }
  return null
}

/** Pose une couleur translucide sur un fond opaque. */
export function blend(top: Rgba, bottom: Rgba): Rgba {
  const mix = (t: number, b: number): number => Math.round(t * top.a + b * (1 - top.a))
  return { r: mix(top.r, bottom.r), g: mix(top.g, bottom.g), b: mix(top.b, bottom.b), a: 1 }
}

function luminance({ r, g, b }: Rgba): number {
  const channel = (v: number): number => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

/** Rapport de contraste entre deux couleurs opaques, de 1 à 21. */
export function contrastRatio(a: Rgba, b: Rgba): number {
  const la = luminance(a)
  const lb = luminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

/** Contraste entre deux textes de couleur (« #rrggbb »), nul si l'une est illisible. */
export function contrastOf(foreground: string, background: string): number {
  const fg = parseColor(foreground)
  const bg = parseColor(background)
  if (!fg || !bg) return 0
  return contrastRatio(blend(fg, bg), bg)
}
