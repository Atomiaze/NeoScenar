// Petites icônes dessinées en SVG (aucune image ni police externe).

const PATHS = {
  menu: 'M4 6h16M4 12h16M4 18h16',
  research: 'M3 6h6l2 2h10v11H3z',
  cards: 'M3 5h7v6H3zM14 5h7v6h-7zM3 14h7v6H3zM14 14h7v6h-7z',
  script: 'M6 3h9l4 4v14H6zM15 3v4h4M9 11h7M9 15h7',
  stats: 'M5 20V11M10 20V5M15 20v-7M20 20V8',
  planning: 'M4 6h16v14H4zM4 10h16M8 3v5M16 3v5M8 14h3M13 14h3M8 17h3',
  plus: 'M12 5v14M5 12h14',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6',
  plusMany: 'M9 4v10M4 9h10M15 10h5M15 15h5M10 20h10',
  renumber: 'M4 7h3v10M4 17h6M14 7h5l-4 5h2a2.5 2.5 0 1 1-2.5 3',
  lockClosed: 'M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3',
  lockOpen: 'M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 6.8-1.2',
  chevronRight: 'M9 5l7 7-7 7',
  chevronLeft: 'M15 5l-7 7 7 7',
  chevronDown: 'M6 9l6 6 6-6',
  check: 'M5 12.5l4.5 4.5L19 7',
  warning: 'M12 4 2.5 20h19zM12 10v4.5M12 17.5v.5',
  brush: 'M14.5 4.5l5 5L11 18l-5-5zM6 13c-2 0-3 1.5-3 3.5S2 20 2 20s3.5.5 5.5-.5S10 17 10 15',
  eraser: 'M8 20h12M5.5 14.5l8-8a2 2 0 0 1 2.8 0l2.2 2.2a2 2 0 0 1 0 2.8L12 18H9z',
  bucket: 'M5 11l7-7 7 7-7 7zM5 11h14M20 15c0 1.5-1 3-2 3s-2-1.5-2-3 2-3.5 2-3.5 2 2 2 3.5z',
  undo: 'M9 14 4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3',
  redo: 'M15 14l5-5-5-5M20 9H9a5 5 0 0 0 0 10h3',
  image: 'M3 5h18v14H3zM3 16l5-5 4 4 3-3 6 6M15.5 9.5a1 1 0 1 0 0-.01',
  export: 'M12 15V4M7.5 8.5 12 4l4.5 4.5M5 14v6h14v-6',
  sidebar: 'M3 4h18v16H3zM9 4v16',
  // Éléments du scénario (barre des éléments)
  elementHeading: 'M3 10h18v10H3zM3 10l1.2-5h16.6l-1 5M8.5 5l-1.5 5M13.5 5l-1.5 5M18.5 5l-1.5 5',
  elementAction: 'M4 6h16M4 10h16M4 14h16M4 18h10',
  elementCharacter:
    'M12 4a3.8 3.8 0 1 0 0 7.6a3.8 3.8 0 1 0 0-7.6zM4.5 20.5c0-4 3.4-6.8 7.5-6.8s7.5 2.8 7.5 6.8',
  elementParenthetical: 'M9.5 4c-3.5 3.5-3.5 12.5 0 16M14.5 4c3.5 3.5 3.5 12.5 0 16',
  elementDialogue: 'M4 5h16v11h-9l-4.5 4v-4H4z',
  elementTransition: 'M3 12h14M12.5 7.5 17 12l-4.5 4.5M21 5v14',
  elementLyrics:
    'M9 17.5a2.5 2.5 0 1 1-5 0a2.5 2.5 0 1 1 5 0zM9 17.5V5.5l11-2.5v12M20 15a2.5 2.5 0 1 1-5 0a2.5 2.5 0 1 1 5 0zM9 9l11-2.5',
  elementNote: 'M4 4h16v10l-6 6H4zM14 20v-6h6',
  elementSection: 'M6.5 3h11v18l-5.5-4.5L6.5 21z',
  elementSynopsis: 'M9 5h11M7.5 10h11M6 15h11M4.5 20h6',
  elementCentered: 'M4 6h16M8 10h8M4 14h16M8 18h8',
  elementPageBreak: 'M5 3v6h14V3M5 21v-6h14v6M3 12h2M7.5 12h2M12 12h2M16.5 12h2M21 12h0'
} as const

export type IconName = keyof typeof PATHS

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  )
}
