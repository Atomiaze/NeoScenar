// Export texte brut du générique (generique.txt et bouton « Copier ») : sans mise en forme, pour que
// l'élève fasse sa mise en page dans son logiciel de montage. Deux présentations :
// - « dessus » : intitulé en capitales, puis un nom par ligne ;
// - « tabulation » : intitulé et premier nom sur la même ligne, séparés par une tabulation
//   (taquets de tabulation de Premiere Pro ou de DaVinci Resolve).

import type { AssembledCredits, CreditsSection, StartCard, TextPresentation } from './types'

const TAB = '\t'

function heading(intitule: string): string {
  return intitule.toLocaleUpperCase('fr')
}

function sectionLines(section: CreditsSection, presentation: TextPresentation): string[] {
  const tabbed = presentation === 'tabulation'
  switch (section.kind) {
    case 'rubrique': {
      const title = heading(section.intitule)
      const isCast = section.entries.some((entry) => entry.personnage !== undefined)
      if (isCast) {
        // Acteurs : le personnage tel qu'affiché (jamais en capitales), puis son interprète.
        const pairs = section.entries.map((entry) =>
          tabbed
            ? `${entry.personnage ?? ''}${TAB}${entry.nom}`
            : `${entry.personnage ?? ''}\n${entry.nom}`
        )
        return [title, '', ...(tabbed ? pairs : pairs.join('\n\n').split('\n'))]
      }
      const names = section.entries.map((entry) => entry.nom)
      if (!tabbed) return [title, ...names]
      return names.map((name, index) => `${index === 0 ? title : ''}${TAB}${name}`)
    }
    case 'musique':
      return [
        ...(section.titre === '' ? [] : [section.titre]),
        ...section.lignes.map((line) =>
          tabbed ? `${line.libelle}${TAB}${line.valeur}` : `${line.libelle} ${line.valeur}`
        )
      ]
    case 'mention':
      return [section.texte]
    case 'logos':
      // Les logos sont des images : l'élève les pose lui-même dans son montage.
      return []
  }
}

function cardLines(card: StartCard): string[] {
  return card.kind === 'logos' ? [] : card.lignes
}

/** Groupes de lignes séparés par `gap` lignes vides ; les groupes vides sont ignorés. */
function joinGroups(groups: string[][], gap: number): string[] {
  const kept = groups.filter((group) => group.length > 0)
  return kept.flatMap((group, index) => (index === 0 ? group : [...Array(gap).fill(''), ...group]))
}

/**
 * Texte du générique : cartons de début en tête (un par paragraphe), puis le déroulant de fin. Une
 * ligne vide entre rubriques, deux entre blocs, trois entre les cartons et le déroulant.
 */
export function creditsToText(credits: AssembledCredits, presentation: TextPresentation): string {
  const cards = joinGroups(credits.cartons.map(cardLines), 1)
  const roll = joinGroups(
    credits.blocs.map((block) =>
      joinGroups(
        block.sections.map((section) => sectionLines(section, presentation)),
        1
      )
    ),
    2
  )
  const lines = joinGroups([cards, roll], 3)
  return lines.length === 0 ? '' : `${lines.join('\n')}\n`
}
