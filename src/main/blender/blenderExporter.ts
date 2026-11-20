import { join } from 'node:path'
import { fr } from '../../renderer/i18n/fr'
import type {
  BlenderExportInfo,
  BlenderExportRequest,
  BlenderLaunchStatus,
  BlendTarget
} from '../../shared/api'
import { EXCHANGE_FILE_NAME } from '../../shared/blender/exchange'
import { PROJECT_FILES } from '../../shared/projectTypes'
import { writeJsonSafely } from '../fs/safeWrite'
import { describeWriteError, ProjectError } from '../project/errors'
import type { LoadedProject } from '../project/readProject'
import { checkBlendTarget, defaultBlendName, defaultBlendTarget, fileExists } from './blendTarget'
import {
  findBlender,
  launchBlender,
  verifyChosenBlender,
  type BlenderEnvironment
} from './blenderService'
import { isSupportedVersion } from './blenderLocator'
import { exportFolder, writeExportPackage } from './exportPackage'

export interface BlenderExporterDeps {
  /** Projet ouvert (lève une erreur s'il n'y en a pas). */
  current(): LoadedProject
  /** Écrit les modifications du découpage en attente. */
  flush(): Promise<void>
  getBlenderPath(): Promise<string | null>
  setBlenderPath(path: string): Promise<void>
  appVersion: string
  env: BlenderEnvironment
  now?: () => Date
}

/** Export vers Blender du projet ouvert : paquet d'échange, puis lancement de Blender. */
export class BlenderExporter {
  constructor(private readonly deps: BlenderExporterDeps) {}

  async info(): Promise<BlenderExportInfo> {
    const { rootDir, project } = this.deps.current()
    return {
      target: await defaultBlendTarget(rootDir, project.folderName),
      blenderPath: await this.deps.getBlenderPath()
    }
  }

  /** Fichier proposé à l'ouverture du sélecteur d'enregistrement. */
  dialogDefaultPath(currentPath: string | null): string {
    const { rootDir, project } = this.deps.current()
    return currentPath ?? join(rootDir, defaultBlendName(project.folderName))
  }

  checkTarget(path: string): Promise<BlendTarget> {
    return checkBlendTarget(this.deps.current().rootDir, path)
  }

  /** Application choisie par l'élève : vérifiée, puis mémorisée dans les préférences. */
  async chooseBlender(appPath: string): Promise<string> {
    await verifyChosenBlender(appPath, this.deps.env)
    await this.deps.setBlenderPath(appPath)
    return appPath
  }

  async export(request: BlenderExportRequest): Promise<BlenderLaunchStatus> {
    const current = this.deps.current()
    const target = await checkBlendTarget(current.rootDir, request.blendPath)
    // Le fichier a pu apparaître depuis l'ouverture de la fenêtre : jamais d'écrasement.
    if (target.replacedExisting) throw new ProjectError(fr.blender.alreadyExists)
    await this.deps.flush()

    const now = this.deps.now?.() ?? new Date()
    let jsonPath: string
    try {
      jsonPath = await writeExportPackage({
        dataDir: current.dataDir,
        project: current.project,
        decoupage: current.decoupage,
        blendPath: target.path,
        neoscenarVersion: this.deps.appVersion,
        now
      })
      const project = {
        ...current.project,
        lastBlenderExport: { exportedAt: now.toISOString(), blendPath: target.relativePath }
      }
      await writeJsonSafely(join(current.dataDir, PROJECT_FILES.project), project)
      current.project = project
    } catch (error) {
      if (error instanceof ProjectError) throw error
      throw new ProjectError(describeWriteError(error))
    }
    return request.openInBlender ? this.open(jsonPath) : { state: 'not-requested' }
  }

  /** Relance Blender sur le dernier paquet (après que l'élève a choisi Blender). */
  async launchAgain(): Promise<BlenderLaunchStatus> {
    const jsonPath = join(exportFolder(this.deps.current().dataDir), EXCHANGE_FILE_NAME)
    if (!(await fileExists(jsonPath))) throw new ProjectError(fr.errors.missingFile(jsonPath))
    return this.open(jsonPath)
  }

  private async open(jsonPath: string): Promise<BlenderLaunchStatus> {
    const saved = await this.deps.getBlenderPath()
    const choice = await findBlender(saved, this.deps.env)
    if (!choice.found) return { state: 'need-choice', reason: choice.reason }
    // Un Blender trouvé seul n'est retenu que s'il est en 4.5 : une version non testée est
    // recherchée de nouveau la fois suivante (l'élève a peut-être installé 4.5 entre-temps).
    if (choice.path !== saved && isSupportedVersion(choice.version)) {
      await this.deps.setBlenderPath(choice.path).catch(() => undefined)
    }
    return launchBlender(choice, jsonPath, this.deps.env)
  }
}
