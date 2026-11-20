import { addLogos, moveLogo, removeLogo } from '../../shared/credits/creditsEdit'
import type { CreditsData } from '../../shared/credits/types'
import { fr } from '../i18n/fr'
import { changeCredits } from './creditsStore'
import { showResearchError } from './researchStore'
import { ImageGallery } from './SheetGallery'

const t = fr.research.credits.logos

async function importLogos(files: (string | File)[]): Promise<void> {
  const stored: string[] = []
  const errors: string[] = []
  for (const file of files) {
    const result =
      typeof file === 'string'
        ? await window.neoscenar.storeCreditsLogoFile(file)
        : await window.neoscenar.storeCreditsLogoBytes(
            new Uint8Array(await file.arrayBuffer()),
            file.name
          )
    if (result.ok) stored.push(result.value)
    else errors.push(result.error)
  }
  if (stored.length > 0) changeCredits((data) => addLogos(data, stored))
  if (errors.length > 0) showResearchError([...new Set(errors)].join('\n'))
}

/** Logos du film, dans l'ordre du générique : ajout, ordre, retrait du lien (fichier gardé). */
export function CreditsLogos({ data }: { data: CreditsData }) {
  return (
    <section className="credits-rubric">
      <h4>{t.heading}</h4>
      <ImageGallery
        images={data.logos.map((path) => ({
          key: path,
          label: path.split('/').pop() ?? path,
          path
        }))}
        removeTitle={t.remove}
        dropHint={t.drop}
        moveLabels={{ before: t.moveLeft, after: t.moveRight }}
        onAdd={(files) => void importLogos(files)}
        onRemove={(path) => changeCredits((data) => removeLogo(data, data.logos.indexOf(path)))}
        onMove={(path, step) =>
          changeCredits((data) => moveLogo(data, data.logos.indexOf(path), step))
        }
      />
    </section>
  )
}
