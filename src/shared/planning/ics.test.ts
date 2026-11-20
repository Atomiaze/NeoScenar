import { describe, expect, it } from 'vitest'
import { buildIcs, escapeIcsText, foldIcsLine, icsSequence, ICS_LINE_OCTETS } from './ics'

const octets = (value: string): number => new TextEncoder().encode(value).length
const unfold = (text: string): string => text.replace(/\r\n /g, '')

const STAMP = new Date('2026-11-20T10:15:30.000Z')
const MODIFIED = new Date('2026-11-19T08:00:00.000Z')

describe('format .ics', () => {
  it('protège \\ ; , et les retours à la ligne, et passe le texte en NFC', () => {
    expect(escapeIcsText('a\\b;c,d\ne\r\nf')).toBe('a\\\\b\\;c\\,d\\ne\\nf')
    expect(escapeIcsText('Céline')).toBe('Céline')
  })

  it('coupe à 75 octets sans jamais couper un caractère accentué ni une séquence protégée', () => {
    const title =
      'SUMMARY:' +
      escapeIcsText(
        'Écrire la première version du scénario : scènes à l’école, à la gare, élèves, étés, éclairs, ' +
          'à côté de la rivière où Léa et Noé s’étaient promis de revenir ; « Ça ira », dit-elle 🎬 ' +
          'puis réécrire les dialogues, relire, corriger, réécrire encore\net rendre à l’enseignant.'
      )
    const folded = foldIcsLine(title)
    const lines = folded.split('\r\n')
    expect(lines.length).toBeGreaterThan(3)
    lines.forEach((line, index) => {
      expect(octets(line)).toBeLessThanOrEqual(ICS_LINE_OCTETS)
      if (index > 0) expect(line.startsWith(' ')).toBe(true)
      // Aucun demi-caractère : chaque ligne se réencode à l'identique (pas de surrogat isolé).
      expect(new TextDecoder().decode(new TextEncoder().encode(line))).toBe(line)
      expect(line).not.toMatch(/(^|[^\\])\\$/)
    })
    expect(unfold(folded)).toBe(title)
  })

  it('remplit les lignes autant que possible', () => {
    const line = `DESCRIPTION:${'é'.repeat(100)}`
    const lines = foldIcsLine(line).split('\r\n')
    // 12 octets d'ASCII + 31 « é » (62 octets) = 74 ; un « é » de plus dépasserait 75.
    expect(octets(lines[0])).toBe(74)
    expect(octets(lines[1])).toBe(75)
  })

  it('SEQUENCE grandit avec la date de modification', () => {
    expect(icsSequence(new Date('2024-01-01T00:00:00Z'))).toBe(0)
    expect(icsSequence(new Date('2024-01-01T01:00:00Z'))).toBe(60)
    expect(icsSequence(MODIFIED)).toBeLessThan(icsSequence(new Date('2026-11-19T08:01:00Z')))
    expect(icsSequence(new Date('2020-01-01T00:00:00Z'))).toBe(0)
  })

  it('écrit un calendrier complet, en CRLF, avec événements journée entière', () => {
    const text = buildIcs({
      name: 'Le Dernier Bus — planning',
      stamp: STAMP,
      modifiedAt: MODIFIED,
      events: [
        {
          uid: 'abc@neoscenar',
          date: '2026-12-31',
          summary: '✓ Synopsis',
          description: 'Phase : Écriture\nFaite · Validée',
          categories: ['Écriture']
        }
      ]
    })
    expect(text.endsWith('\r\n')).toBe(true)
    expect(text.replace(/\r\n/g, '')).not.toMatch(/\n/)
    const lines = unfold(text).split('\r\n')
    expect(lines).toEqual([
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//NeoScenar//Planning//FR',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Le Dernier Bus — planning',
      'BEGIN:VEVENT',
      'UID:abc@neoscenar',
      'DTSTAMP:20261120T101530Z',
      'LAST-MODIFIED:20261119T080000Z',
      `SEQUENCE:${icsSequence(MODIFIED)}`,
      'DTSTART;VALUE=DATE:20261231',
      'DTEND;VALUE=DATE:20270101',
      'SUMMARY:✓ Synopsis',
      'DESCRIPTION:Phase : Écriture\\nFaite · Validée',
      'CATEGORIES:Écriture',
      'TRANSP:TRANSPARENT',
      'END:VEVENT',
      'END:VCALENDAR',
      ''
    ])
  })
})
