import { readFile } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import { resolveLayout, type ResolvedLayout } from '@neoscenar/fountain'
import { fr } from '../../renderer/i18n/fr'
import type { RestoredVersion, VersionList, VersionScript } from '../../shared/api'
import { PROJECT_FILES } from '../../shared/projectTypes'
import { sceneIdsOf } from '../../shared/versions/compareScripts'
import { scriptSummary } from '../../shared/versions/scriptSummary'
import {
  cleanVersionName,
  cleanVersionNote,
  duplicateFolderName,
  formatVersionDate,
  suggestVersionName,
  type VersionEntry
} from '../../shared/versions/versions'
import { recoverRetiredImages } from '../images/recoverImages'
import { ProjectError } from '../project/errors'
import { giveNewId } from '../project/projectCopy'
import { readProject, type LoadedProject } from '../project/readProject'
import { parseDecoupage } from '../project/validators'
import {
  deleteVersion,
  duplicateFromVersion,
  listVersions,
  readVersionFiles,
  saveVersion,
  writeVersionFiles
} from './versionFolder'
import { parseJsonText } from '../../shared/lineEndings'

export interface VersionServiceDeps {
  current(): LoadedProject
  /** Écrit tout ce qui est en attente ; faux si quelque chose n'a pas pu être écrit. */
  flushAll(): Promise<boolean>
  /** Relit entièrement le projet ouvert depuis le disque (après une restauration). */
  reload(): Promise<void>
  /** Profil de mise en page (le même que l'éditeur), pour les pages et la durée. */
  layoutPath: string
}

/** Versions du projet ouvert (étape 13C). */
export class VersionService {
  private layout: ResolvedLayout | null = null

  constructor(private readonly deps: VersionServiceDeps) {}

  private async getLayout(): Promise<ResolvedLayout> {
    this.layout ??= resolveLayout(JSON.parse(await readFile(this.deps.layoutPath, 'utf8')))
    return this.layout
  }

  private async flush(): Promise<LoadedProject> {
    const current = this.deps.current()
    if (!(await this.deps.flushAll())) throw new ProjectError(fr.versions.unsaved)
    return current
  }

  async list(): Promise<VersionList> {
    const versions = await listVersions(this.deps.current().dataDir)
    const names = versions.flatMap((entry) => (entry.broken ? [] : [entry.name]))
    return { versions, suggestedName: suggestVersionName(names) }
  }

  /** Enregistre l'état actuel (tout est d'abord écrit sur le disque). */
  async save(rawName: unknown, rawNote: unknown, now = new Date()): Promise<VersionEntry> {
    const name = cleanVersionName(rawName)
    if (name === null) throw new ProjectError(fr.versions.nameRequired)
    const { dataDir, project } = await this.flush()
    const text = await readFile(join(dataDir, PROJECT_FILES.scenario), 'utf8')
    const summary = scriptSummary(text, await this.getLayout(), {
      newPageForActs: project.exportPdf.nouvellePageParActe
    })
    return saveVersion(dataDir, { name, note: cleanVersionNote(rawNote), ...summary }, now)
  }

  /**
   * Remplace les trois fichiers par ceux d'une version, puis relit le projet. Sans `undo`, l'état
   * actuel est d'abord enregistré comme version « Avant restauration – <date> ». L'identifiant et
   * le nom du dossier du projet actuel sont gardés (la version peut venir d'avant une copie).
   */
  async restore(folder: unknown, undo: boolean): Promise<RestoredVersion> {
    const current = await this.flush()
    const files = await readVersionFiles(current.dataDir, folder)
    const now = new Date()
    const before = undo
      ? null
      : await this.save(fr.versions.beforeRestore(formatVersionDate(now)), '', now)
    await writeVersionFiles(current.dataDir, files, {
      id: current.project.id,
      folderName: current.project.folderName
    })
    // Vignettes de la version rangées depuis dans sauvegardes/ : remises en place.
    await recoverRetiredImages(current.dataDir, current.dataDir, files.decoupage, 'move')
    await this.deps.reload()
    return { name: files.data.name, beforeFolder: before?.folder ?? null }
  }

  /**
   * Scénario d'une version, ou le scénario actuel (`folder` null) une fois tout enregistré : c'est
   * le texte du disque qui est comparé, comme celui qu'une version enregistrerait.
   */
  async readScript(folder: unknown): Promise<VersionScript> {
    if (folder === null) {
      const { dataDir } = await this.flush()
      const decoupage = parseDecoupage(
        parseJsonText(await readFile(join(dataDir, PROJECT_FILES.decoupage), 'utf8'))
      )
      return {
        text: await readFile(join(dataDir, PROJECT_FILES.scenario), 'utf8'),
        sceneIds: sceneIdsOf(decoupage),
        version: null
      }
    }
    const { dataDir } = this.deps.current()
    const files = await readVersionFiles(dataDir, folder)
    return {
      text: files.scenario,
      sceneIds: sceneIdsOf(files.decoupage),
      version: { folder: folder as string, broken: false, ...files.data }
    }
  }

  remove(folder: unknown): Promise<string> {
    return deleteVersion(this.deps.current().dataDir, folder)
  }

  /** Dossier proposé pour le duplicata, à côté du dossier du film. */
  async duplicateDefaultPath(folder: unknown): Promise<string> {
    const { rootDir, dataDir } = this.deps.current()
    const files = await readVersionFiles(dataDir, folder)
    return join(dirname(rootDir), duplicateFolderName(basename(rootDir), files.data.name))
  }

  /**
   * Copie complète du projet dans `target`, avec les fichiers de la version, et un nouvel
   * identifiant. Renvoie le chemin du fichier .neoscenar de la copie, à ouvrir ensuite.
   */
  async duplicate(folder: unknown, target: string): Promise<string> {
    const current = await this.flush()
    const files = await readVersionFiles(current.dataDir, folder)
    const copyFile = await duplicateFromVersion(current, files, target)
    // sauvegardes/ n'est pas copié : les vignettes retirées utiles sont prises dans l'original.
    const copied = await readProject(copyFile)
    await recoverRetiredImages(current.dataDir, copied.dataDir, files.decoupage, 'copy')
    await giveNewId(copied)
    return copyFile
  }
}
