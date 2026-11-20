import type { SaveStatus } from '../../shared/api'
import { describeWriteError } from './errors'

/**
 * Erreur d'écriture qui demande une décision de l'élève (fichier modifié dans un autre logiciel) :
 * pas de nouvelle tentative automatique tant que `resume` n'est pas appelé.
 */
export class WriteBlockedError extends Error {}

/** État de l'enregistrement, avec l'attente d'une décision de l'élève. */
export type AutoSaveStatus = SaveStatus | { state: 'blocked' }

export interface AutoSaverOptions<T> {
  /** Écriture réelle sur le disque (écriture sûre dans l'application). */
  write(data: T): Promise<void>
  onStatus(status: AutoSaveStatus): void
  /** Délai de regroupement des écritures pendant une saisie. */
  delayMs?: number
  /** Délai avant une nouvelle tentative après un échec. */
  retryMs?: number
}

/**
 * Enregistrement automatique (découpage, scénario) : au plus une écriture toutes les ~500 ms,
 * nouvelles tentatives en cas d'échec, et `flush` pour tout écrire avant de fermer.
 */
export class AutoSaver<T> {
  private pending: T | null = null
  private writing: Promise<void> | null = null
  private timer: ReturnType<typeof setTimeout> | null = null
  private error: string | null = null
  private blocked = false
  private readonly delayMs: number
  private readonly retryMs: number

  constructor(private readonly options: AutoSaverOptions<T>) {
    this.delayMs = options.delayMs ?? 500
    this.retryMs = options.retryMs ?? 3000
  }

  /** Vrai tant que quelque chose n'est pas (encore) écrit sur le disque. */
  get hasUnsavedChanges(): boolean {
    return this.pending !== null || this.writing !== null || this.error !== null
  }

  get isBlocked(): boolean {
    return this.blocked
  }

  /** Nouvelle version à enregistrer (déjà validée). */
  update(data: T): void {
    this.pending = data
    this.report()
    // Le minuteur n'est pas relancé à chaque frappe : une saisie continue écrit quand même.
    if (!this.blocked) this.schedule(this.delayMs)
  }

  /** Écrit immédiatement ce qui est en attente. Vrai si tout est enregistré. */
  async flush(): Promise<boolean> {
    this.cancelTimer()
    if (!this.blocked) await this.writePending()
    return !this.hasUnsavedChanges
  }

  /** Abandonne ce qui n'a pas pu être enregistré (l'élève a choisi de fermer quand même). */
  discard(): void {
    this.cancelTimer()
    this.pending = null
    this.error = null
    this.blocked = false
    this.report()
  }

  /** Bloque les écritures en attendant une décision de l'élève (modification extérieure repérée). */
  block(): void {
    this.cancelTimer()
    this.blocked = true
    this.report()
  }

  /** L'élève a décidé : les écritures reprennent. */
  resume(): void {
    this.blocked = false
    this.error = null
    this.report()
    if (this.pending !== null) this.schedule(0)
  }

  private schedule(delay: number): void {
    if (this.timer) return
    this.timer = setTimeout(() => {
      this.timer = null
      void this.writePending()
    }, delay)
  }

  private cancelTimer(): void {
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
  }

  private async writePending(): Promise<void> {
    // Une seule écriture à la fois, dans l'ordre.
    while (this.writing) await this.writing
    const data = this.pending
    if (data === null || this.blocked) return
    this.pending = null
    const attempt = this.options.write(data)
    this.writing = attempt.then(
      () => undefined,
      () => undefined
    )
    try {
      await attempt
      this.error = null
    } catch (error) {
      if (error instanceof WriteBlockedError) this.blocked = true
      else this.error = describeWriteError(error)
      // Rien n'est perdu : une version plus récente éventuelle passe en priorité.
      this.pending ??= data
    } finally {
      this.writing = null
    }
    this.report()
    if (this.pending !== null && !this.blocked) {
      this.schedule(this.error ? this.retryMs : this.delayMs)
    }
  }

  private report(): void {
    if (this.blocked) this.options.onStatus({ state: 'blocked' })
    else if (this.error) this.options.onStatus({ state: 'error', message: this.error })
    else if (this.pending !== null || this.writing) this.options.onStatus({ state: 'saving' })
    else this.options.onStatus({ state: 'saved' })
  }
}
