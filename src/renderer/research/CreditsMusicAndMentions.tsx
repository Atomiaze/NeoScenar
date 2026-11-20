import { addMusic, patchMusic, removeMusic } from '../../shared/credits/creditsEdit'
import type { CreditsData, CreditsTemplate } from '../../shared/credits/types'
import { fr } from '../i18n/fr'
import { Check, TextField } from './CreditsFields'
import { changeCredits } from './creditsStore'

const music = fr.research.credits.music
const mentions = fr.research.credits.mentions

/** Musiques préexistantes : une fiche à quatre champs par musique. */
export function CreditsMusic({ data }: { data: CreditsData }) {
  return (
    <section className="credits-rubric">
      <h4>{music.heading}</h4>
      {data.musiques.length === 0 && <p className="field-help">{music.empty}</p>}
      {data.musiques.map((item, index) => (
        <div className="credits-music" key={index}>
          <TextField
            label={music.title}
            value={item.titre}
            onChange={(titre) => changeCredits((d) => patchMusic(d, index, { titre }))}
          />
          <TextField
            label={music.performer}
            value={item.interprete}
            onChange={(interprete) => changeCredits((d) => patchMusic(d, index, { interprete }))}
          />
          <TextField
            label={music.authors}
            value={item.auteurs}
            onChange={(auteurs) => changeCredits((d) => patchMusic(d, index, { auteurs }))}
          />
          <TextField
            label={music.permission}
            value={item.autorisation}
            onChange={(autorisation) =>
              changeCredits((d) => patchMusic(d, index, { autorisation }))
            }
          />
          <button
            type="button"
            className="tool-button"
            onClick={() => changeCredits((d) => removeMusic(d, index))}
          >
            {music.remove}
          </button>
        </div>
      ))}
      <button
        type="button"
        className="tool-button"
        onClick={() => changeCredits((d) => addMusic(d))}
      >
        {music.add}
      </button>
    </section>
  )
}

/** Mentions : lieu de tournage, clauses, copyright et ligne de l'école. */
export function CreditsMentions({
  data,
  template
}: {
  data: CreditsData
  template: CreditsTemplate
}) {
  const m = data.mentions
  const setMentions = (patch: Partial<CreditsData['mentions']>): void =>
    changeCredits((d) => ({ ...d, mentions: { ...d.mentions, ...patch } }))
  return (
    <section className="credits-rubric">
      <h4>{mentions.heading}</h4>
      <TextField
        label={mentions.tourneA}
        value={m.tourneA}
        onChange={(tourneA) => setMentions({ tourneA })}
      />
      <Check
        label={mentions.fiction}
        checked={m.fiction}
        onChange={(fiction) => setMentions({ fiction })}
      />
      <Check
        label={mentions.animals}
        checked={m.animaux}
        onChange={(animaux) => setMentions({ animaux })}
      />
      <div className="research-row">
        <label className="field">
          <span className="field-label">{`${mentions.copyright} — ${mentions.year}`}</span>
          <input
            type="number"
            className="research-age"
            value={m.copyrightAnnee ?? ''}
            placeholder={String(new Date().getFullYear())}
            title={mentions.yearHint}
            onChange={(event) => {
              const year = Number.parseInt(event.target.value, 10)
              setMentions({ copyrightAnnee: Number.isInteger(year) ? year : null })
            }}
          />
        </label>
        <TextField
          label={mentions.holder}
          value={m.copyrightTitulaire}
          onChange={(copyrightTitulaire) => setMentions({ copyrightTitulaire })}
        />
      </div>
      {template.textes.ligneEcole !== '' && (
        <div className="field">
          <Check
            label={mentions.schoolLine}
            checked={m.ligneEcole !== ''}
            onChange={(on) => setMentions({ ligneEcole: on ? null : '' })}
          />
          <span className="field-help">{mentions.schoolLineHint(template.textes.ligneEcole)}</span>
        </div>
      )}
    </section>
  )
}
