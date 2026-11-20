import { useEffect, useMemo, useState } from 'react'
import { assembleCredits, creditsCharacter } from '../../shared/credits/assembleCredits'
import {
  layoutCard,
  layoutRoll,
  type LayoutTools,
  type PlacedLayout,
  type RollLayout
} from '../../shared/credits/creditsLayout'
import {
  START_CARDS,
  type AssembledCredits,
  type CreditsData,
  type StartCard
} from '../../shared/credits/types'
import type { Sheet } from '../../shared/research/types'
import { useStore } from '../state/createStore'
import { creditsStore, loadCredits } from '../research/creditsStore'
import { fullScriptText } from '../script/scriptStore'
import { layoutTools, loadCreditsFonts, loadLogos } from './creditsDrawing'

// Données de la fenêtre d'export : générique assemblé, logos décodés, mises en page calculées.

export interface CreditsExportState {
  data: CreditsData
  assembled: AssembledCredits
  logos: Map<string, ImageBitmap>
  roll: RollLayout
  cards: { card: StartCard; layout: PlacedLayout }[]
  /** Cartons possibles avec les données actuelles (un carton vide ne peut pas être exporté). */
  available: Set<StartCard['kind']>
}

export function useCreditsExport(
  resolution: { width: number; height: number },
  onError: (message: string) => void
): CreditsExportState | null {
  const content = useStore(creditsStore, (state) => state.content)
  const diskScript = useStore(creditsStore, (state) => state.script)
  const [characters, setCharacters] = useState<Sheet[] | null>(null)
  const [tools, setTools] = useState<{
    tools: LayoutTools
    logos: Map<string, ImageBitmap>
  } | null>(null)
  // Le texte de l'éditeur est figé à l'ouverture : l'aperçu et les fichiers montrent la même chose.
  const [editorScript] = useState(() => fullScriptText())
  const script = editorScript ?? diskScript

  useEffect(() => {
    void loadCredits()
    window.neoscenar.listSheets('personnages').then((result) => {
      if (result.ok) setCharacters(result.value)
      else {
        onError(result.error)
        setCharacters([])
      }
    })
  }, [onError])

  // Tous les logos du générique (déroulant et carton), et la police, avant toute mise en page.
  const logoPaths = useMemo(() => {
    if (!content) return null
    const { template, data } = content
    return [...data.logos, ...(template.logoEcole ? [template.logoEcole] : [])]
  }, [content])
  const logoKey = JSON.stringify(logoPaths)
  useEffect(() => {
    if (logoPaths === null) return
    let cancelled = false
    void Promise.all([loadCreditsFonts(), loadLogos(logoPaths)]).then(([, logos]) => {
      if (!cancelled) setTools({ tools: layoutTools(logos), logos })
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- relu seulement si la liste change
  }, [logoKey])

  return useMemo(() => {
    if (!content || !characters || !tools) return null
    const { template, data, projectType } = content
    const sources = {
      template,
      data,
      characters: characters.map(creditsCharacter),
      script,
      projectType,
      today: new Date()
    }
    const assembled = assembleCredits(sources)
    const everyCard = assembleCredits({
      ...sources,
      data: { ...data, cartonsDebut: [...START_CARDS] }
    }).cartons
    const { taille, disposition } = data.options
    const roll = layoutRoll(
      assembled,
      { width: resolution.width, taille, disposition },
      tools.tools
    )
    const cards = assembled.cartons.map((card) => ({
      card,
      layout: layoutCard(card, { ...resolution, taille }, tools.tools)
    }))
    return {
      data,
      assembled,
      logos: tools.logos,
      roll,
      cards,
      available: new Set(everyCard.map((card) => card.kind))
    }
  }, [content, characters, tools, script, resolution])
}
