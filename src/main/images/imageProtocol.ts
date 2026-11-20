import { net, protocol } from 'electron'
import { pathToFileURL } from 'node:url'
import { IMAGE_PROTOCOL, isStoryboardImagePath } from '../../shared/thumbnail/files'
import { isSheetImagePath } from '../../shared/research/sheetImages'
import { WELCOME_IMAGE_HOST } from '../../shared/welcomeImage'
import { ensurePreview } from './previews'
import { resolveDataPath } from './thumbnailFiles'

/** À appeler avant que l'application soit prête. */
export function registerImageScheme(): void {
  protocol.registerSchemesAsPrivileged([
    { scheme: IMAGE_PROTOCOL, privileges: { standard: true, secure: true } }
  ])
}

/** Projet ouvert, pour retrouver ses images et le dossier de ses aperçus. */
export interface ImageSource {
  dataDir: string
  projectId: string
  previewsDir: string
}

const notFound = (): Response => new Response(null, { status: 404 })

/**
 * Sert les images du projet ouvert, et seulement elles :
 * - « neoscenar-image://projet/storyboard/… » : vignette ou image d'origine ;
 * - « neoscenar-image://apercu/storyboard/vignettes/… » : aperçu réduit pour les cartes ;
 * - « neoscenar-image://projet/personnages/images/… » : images des fiches du module Recherches ;
 * - « neoscenar-image://accueil/… » : image d'accueil (livrée ou copie choisie dans les Réglages).
 */
export function handleImageProtocol(
  currentSource: () => ImageSource | null,
  welcomeImagePath: (name: string) => string | null
): void {
  protocol.handle(IMAGE_PROTOCOL, async (request) => {
    const url = new URL(request.url)
    const path = decodeURIComponent(url.pathname).replace(/^\//, '')
    // L'image d'accueil n'appartient à aucun projet : elle se sert sans projet ouvert.
    if (url.host === WELCOME_IMAGE_HOST) {
      const file = welcomeImagePath(path)
      return file ? net.fetch(pathToFileURL(file).toString()) : notFound()
    }
    const source = currentSource()
    if (!source) return notFound()
    if (url.host === 'projet' && isSheetImagePath(path)) {
      return net.fetch(pathToFileURL(resolveDataPath(source.dataDir, path)).toString())
    }
    if (!isStoryboardImagePath(path)) return notFound()
    if (url.host === 'projet') {
      return net.fetch(pathToFileURL(resolveDataPath(source.dataDir, path)).toString())
    }
    if (url.host === 'apercu') {
      const preview = await ensurePreview(
        source.dataDir,
        source.previewsDir,
        source.projectId,
        path
      )
      return preview ? net.fetch(pathToFileURL(preview).toString()) : notFound()
    }
    return notFound()
  })
}
