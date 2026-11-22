import { useEffect, useState } from 'react'
import { readTitlePage, type TitlePageField, type TitlePageValues } from '@neoscenar/fountain'
import { fr } from '../i18n/fr'
import { useStore } from '../state/createStore'
import { TitlePageFields } from '../script/TitlePageDialog'
import { loadScenario, saveTitlePage, scriptStore } from '../script/scriptStore'

/** Page de titre, éditée dans le module (mêmes champs et même écriture que la fenêtre du scénario). */
export function TitlePageView({
  projectId,
  projectTitle
}: {
  projectId: string
  projectTitle: string
}) {
  const parts = useStore(scriptStore, (state) => state.parts)
  const version = useStore(scriptStore, (state) => state.version)
  const t = fr.research.titlePage

  useEffect(() => {
    void loadScenario(projectId)
  }, [projectId])

  if (!parts) return <p className="panel-empty">{fr.script.titlePage.loading}</p>
  // Sans titre dans le scénario, celui du projet est proposé.
  const read = readTitlePage(parts.titlePage)
  return (
    <TitlePageEditor
      // Recréé si le scénario est relu : les champs montrent alors le fichier.
      key={version}
      initial={{ ...read, Title: read.Title || projectTitle }}
      intro={t.intro}
    />
  )
}

function TitlePageEditor({ initial, intro }: { initial: TitlePageValues; intro: string }) {
  const t = fr.research.titlePage
  const [values, setValues] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const set = (field: TitlePageField, value: string): void => {
    setSaved(false)
    setValues((current) => ({ ...current, [field]: value }))
  }
  return (
    <div className="research-form">
      <div className="research-sheet-header">
        <h2>{fr.script.titlePage.title}</h2>
      </div>
      <p className="muted">{intro}</p>
      <TitlePageFields values={values} onChange={set} />
      <div className="title-page-actions">
        <button
          className="primary"
          disabled={saving}
          onClick={() => {
            setSaving(true)
            void saveTitlePage(values).finally(() => {
              setSaving(false)
              setSaved(true)
            })
          }}
        >
          {t.save}
        </button>
        {saved && <span className="muted">{t.saved}</span>}
      </div>
    </div>
  )
}
