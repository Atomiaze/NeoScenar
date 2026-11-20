import { findFolder, findNote } from '../../shared/research/documents'
import { researchStore, showResearchError, type DocSelection } from './researchStore'

// Actions de la branche Documents : chaque appel passe par le processus principal, puis l'arbre
// est relu sur le disque (il reflète toujours les vrais dossiers).

function stillThere(selection: DocSelection | null): boolean {
  const root = researchStore.get().documents
  if (!selection || !root) return false
  return selection.type === 'folder'
    ? findFolder(root, selection.path) !== null
    : findNote(root, selection.path) !== null
}

/** Relit l'arbre ; ce qui était choisi le reste s'il existe encore. */
export async function loadDocuments(): Promise<void> {
  const result = await window.neoscenar.listDocuments()
  if (!result.ok) {
    showResearchError(result.error)
    return
  }
  researchStore.set((state) => ({ documents: result.value, docSelected: state.docSelected }))
  if (!stillThere(researchStore.get().docSelected)) researchStore.set({ docSelected: null })
}

/** Crée un dossier ou une note et l'ouvre. Renvoie un message d'erreur, ou null. */
export async function createDocument(
  what: 'folder' | 'note',
  parent: string,
  name: string
): Promise<string | null> {
  const result =
    what === 'folder'
      ? await window.neoscenar.createDocumentFolder(parent, name)
      : await window.neoscenar.createDocumentNote(parent, name)
  if (!result.ok) return result.error
  await loadDocuments()
  researchStore.set({
    docSelected: { type: what, path: result.value },
    dialog: null,
    section: 'documents'
  })
  return null
}

/** Renomme ; la sélection suit (même quand c'est un dossier parent de la sélection). */
export async function renameDocument(entry: DocSelection, name: string): Promise<string | null> {
  const result = await window.neoscenar.renameDocument(entry.path, name)
  if (!result.ok) return result.error
  const newPath = result.value
  researchStore.set((state) => {
    const current = state.docSelected
    if (!current) return {}
    if (current.path === entry.path) return { docSelected: { ...current, path: newPath } }
    if (current.path.startsWith(`${entry.path}/`)) {
      return {
        docSelected: { ...current, path: newPath + current.path.slice(entry.path.length) }
      }
    }
    return {}
  })
  researchStore.set({ dialog: null })
  await loadDocuments()
  return null
}

export async function deleteDocument(entry: DocSelection): Promise<void> {
  const result = await window.neoscenar.deleteDocument(entry.path)
  researchStore.set({ dialog: null })
  if (!result.ok) showResearchError(result.error)
  await loadDocuments()
}

export async function addDocumentImages(folder: string, files: (string | File)[]): Promise<void> {
  const errors: string[] = []
  for (const file of files) {
    const result =
      typeof file === 'string'
        ? await window.neoscenar.storeDocumentImageFile(folder, file)
        : await window.neoscenar.storeDocumentImageBytes(
            folder,
            new Uint8Array(await file.arrayBuffer()),
            file.name
          )
    if (!result.ok) errors.push(result.error)
  }
  await loadDocuments()
  if (errors.length > 0) showResearchError([...new Set(errors)].join('\n'))
}

export async function removeDocumentImage(folder: string, fileName: string): Promise<void> {
  const result = await window.neoscenar.removeDocumentImage(folder, fileName)
  if (!result.ok) showResearchError(result.error)
  await loadDocuments()
}
