// Calendrier iCalendar (.ics, RFC 5545) : écriture pure, sans serveur. Seulement des événements
// « journée entière ». Chaque événement garde le même UID d'un export à l'autre : réimporter le
// fichier met à jour les événements au lieu de les dupliquer (SEQUENCE et DTSTAMP le permettent).

// Fichier autonome (aucun import de code) : l'outil `npm run pdf:planning:exemple` le charge
// directement avec Node pour écrire un calendrier d'essai.

/** Date au format AAAA-MM-JJ. */
type IsoDate = string

export interface IcsEvent {
  /** Identifiant permanent (« <id>@neoscenar »). */
  uid: string
  /** Jour de l'événement (journée entière). */
  date: IsoDate
  summary: string
  description: string
  location?: string
  categories?: string[]
}

export interface IcsCalendar {
  name: string
  events: IcsEvent[]
  /** Moment de l'export (DTSTAMP). */
  stamp: Date
  /** Dernière modification des données exportées (SEQUENCE, LAST-MODIFIED). */
  modifiedAt: Date
}

const CRLF = '\r\n'
/** Longueur maximale d'une ligne, en octets UTF-8, sans le CRLF. */
export const ICS_LINE_OCTETS = 75

/** Origine des numéros de SEQUENCE : 1er janvier 2024, en minutes. */
const SEQUENCE_EPOCH = Date.UTC(2024, 0, 1)

/**
 * SEQUENCE d'après la date de modification : un nombre qui grandit à chaque modification (minutes
 * écoulées depuis 2024). Calendrier (Mac) remplace un événement importé quand ce nombre augmente.
 */
export function icsSequence(modifiedAt: Date): number {
  return Math.max(0, Math.floor((modifiedAt.getTime() - SEQUENCE_EPOCH) / 60_000))
}

/** Texte protégé : « \ ; , » et retours à la ligne (RFC 5545, 3.3.11). Toujours en NFC. */
export function escapeIcsText(value: string): string {
  return value
    .normalize('NFC')
    .replace(/\r\n?/g, '\n')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

function octets(value: string): number {
  return new TextEncoder().encode(value).length
}

/**
 * Ligne coupée à 75 octets au plus (suite précédée d'une espace). On ne coupe jamais au milieu d'un
 * caractère UTF-8 (accents, émojis) ni d'une séquence protégée (« \n », « \, »).
 */
export function foldIcsLine(line: string): string {
  if (octets(line) <= ICS_LINE_OCTETS) return line
  const pieces = line.match(/\\.|[\s\S]/gu) ?? []
  const lines: string[] = []
  let current = ''
  let size = 0
  for (const piece of pieces) {
    const length = octets(piece)
    // La première ligne a 75 octets ; les suivantes, 74 après l'espace de continuation.
    const limit = lines.length === 0 ? ICS_LINE_OCTETS : ICS_LINE_OCTETS - 1
    if (size + length > limit) {
      lines.push(current)
      current = ''
      size = 0
    }
    current += piece
    size += length
  }
  lines.push(current)
  return lines.join(`${CRLF} `)
}

/** « 20261120 ». */
function icsDate(iso: IsoDate): string {
  return iso.replace(/-/g, '')
}

/** Lendemain (en UTC : pas d'heure d'été). */
function nextDay(iso: IsoDate): IsoDate {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10)
}

/** « 20261120T101500Z » (UTC). */
function icsTimestamp(date: Date): string {
  return `${date.toISOString().slice(0, 19).replace(/[-:]/g, '')}Z`
}

function eventLines(event: IcsEvent, calendar: IcsCalendar): string[] {
  const lines = [
    'BEGIN:VEVENT',
    `UID:${escapeIcsText(event.uid)}`,
    `DTSTAMP:${icsTimestamp(calendar.stamp)}`,
    `LAST-MODIFIED:${icsTimestamp(calendar.modifiedAt)}`,
    `SEQUENCE:${icsSequence(calendar.modifiedAt)}`,
    `DTSTART;VALUE=DATE:${icsDate(event.date)}`,
    // Fin exclue : un événement d'une journée finit le lendemain.
    `DTEND;VALUE=DATE:${icsDate(nextDay(event.date))}`,
    `SUMMARY:${escapeIcsText(event.summary)}`
  ]
  if (event.description) lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`)
  if (event.location) lines.push(`LOCATION:${escapeIcsText(event.location)}`)
  if (event.categories && event.categories.length > 0)
    lines.push(`CATEGORIES:${event.categories.map(escapeIcsText).join(',')}`)
  lines.push('TRANSP:TRANSPARENT', 'END:VEVENT')
  return lines
}

/** Fichier .ics complet (CRLF, lignes coupées), terminé par un CRLF. */
export function buildIcs(calendar: IcsCalendar): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//NeoScenar//Planning//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText(calendar.name)}`,
    ...calendar.events.flatMap((event) => eventLines(event, calendar)),
    'END:VCALENDAR'
  ]
  return lines.map(foldIcsLine).join(CRLF) + CRLF
}
