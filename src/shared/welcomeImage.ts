// Image d'accueil (étape 14C) : règles communes au processus principal et à l'interface.

export const WELCOME_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'] as const
export const WELCOME_IMAGE_MAX_BYTES = 10 * 1024 * 1024
export const WELCOME_IMAGE_HOST = 'accueil'
/** Nom réservé à l'image livrée avec l'application. */
export const WELCOME_IMAGE_DEFAULT = 'defaut'

/** Les copies faites par NeoScenar : un horodatage dans le nom évite tout souci de cache. */
const COPY_NAME = /^image-accueil-\d+\.(jpg|jpeg|png|webp)$/

export function isWelcomeImageCopyName(name: unknown): boolean {
  return typeof name === 'string' && COPY_NAME.test(name)
}

export function welcomeImageExtension(fileName: string): string | null {
  const match = /\.([^./\\]+)$/.exec(fileName)
  const extension = match?.[1].toLowerCase() ?? ''
  return (WELCOME_IMAGE_EXTENSIONS as readonly string[]).includes(extension) ? extension : null
}

/** Reconnaît le vrai format d'après les premiers octets (le nom du fichier peut mentir). */
export function sniffImageExtension(bytes: Uint8Array): 'jpg' | 'png' | 'webp' | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpg'
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  if (bytes.length >= 8 && png.every((value, index) => bytes[index] === value)) return 'png'
  const ascii = (from: number): string => String.fromCharCode(...bytes.slice(from, from + 4))
  if (bytes.length >= 12 && ascii(0) === 'RIFF' && ascii(8) === 'WEBP') return 'webp'
  return null
}

export function welcomeImageUrl(name: string): string {
  return `neoscenar-image://${WELCOME_IMAGE_HOST}/${name}`
}
