import { useRef, useState, type KeyboardEvent } from 'react'
import {
  inlineParts,
  type HelpBlock,
  type HelpListItem,
  type HelpTab
} from '../../shared/helpContent'
import { fr } from '../i18n/fr'
import { Dialog } from './Dialog'

interface HelpDialogProps {
  title: string
  tabs: readonly HelpTab[]
  onClose(): void
}

/** Fenêtre « Aide » d'un module : une rubrique par onglet. Échap la ferme. */
export function HelpDialog({ title, tabs, onClose }: HelpDialogProps) {
  const [current, setCurrent] = useState(0)
  const tabButtons = useRef<(HTMLButtonElement | null)[]>([])
  const tab = tabs[current]

  // Flèches gauche / droite pour passer d'un onglet à l'autre, comme dans les onglets du système.
  const onTabKey = (event: KeyboardEvent): void => {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
    if (step === 0) return
    event.preventDefault()
    const next = (current + step + tabs.length) % tabs.length
    setCurrent(next)
    tabButtons.current[next]?.focus()
  }

  return (
    <Dialog
      title={title}
      onClose={onClose}
      className="help-dialog"
      actions={
        <button className="primary" onClick={onClose}>
          {fr.common.close}
        </button>
      }
    >
      <div className="help-tabs" role="tablist" aria-label={fr.script.help.tabsLabel}>
        {tabs.map((item, index) => (
          <button
            key={item.tab}
            ref={(element) => {
              tabButtons.current[index] = element
            }}
            role="tab"
            id={`help-tab-${index}`}
            aria-selected={index === current}
            aria-controls="help-panel"
            tabIndex={index === current ? 0 : -1}
            className={index === current ? 'help-tab active' : 'help-tab'}
            autoFocus={index === 0}
            onClick={() => setCurrent(index)}
            onKeyDown={onTabKey}
          >
            {item.tab}
          </button>
        ))}
      </div>
      <div
        className="help-panel"
        role="tabpanel"
        id="help-panel"
        aria-labelledby={`help-tab-${current}`}
        tabIndex={0}
      >
        <h3>{tab.title}</h3>
        {tab.blocks.map((block, index) => (
          <Block key={`${current}-${index}`} block={block} />
        ))}
      </div>
    </Dialog>
  )
}

function Block({ block }: { block: HelpBlock }) {
  switch (block.kind) {
    case 'paragraph':
      return (
        <p>
          <Inline text={block.text} />
        </p>
      )
    case 'example':
      return <pre className="help-example">{block.text}</pre>
    case 'list':
      return <List ordered={block.ordered} items={block.items} />
    case 'table':
      return (
        <table className="help-table">
          <thead>
            <tr>
              {block.head.map((cell) => (
                <th key={cell}>
                  <Inline text={cell} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex}>
                    <Inline text={cell} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )
  }
}

function List({ ordered, items }: { ordered?: boolean; items: readonly HelpListItem[] }) {
  const children = items.map((item, index) =>
    typeof item === 'string' ? (
      <li key={index}>
        <Inline text={item} />
      </li>
    ) : (
      <li key={index}>
        <Inline text={item.text} />
        <List items={item.items} />
      </li>
    )
  )
  return ordered ? <ol>{children}</ol> : <ul>{children}</ul>
}

function Inline({ text }: { text: string }) {
  return (
    <>
      {inlineParts(text).map((part, index) =>
        part.kind === 'bold' ? (
          <strong key={index}>{part.text}</strong>
        ) : part.kind === 'code' ? (
          <code key={index}>{part.text}</code>
        ) : (
          part.text
        )
      )}
    </>
  )
}
