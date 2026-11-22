// Informations affichées dans « À propos » et sur l'accueil.
// L'adresse est écrite ici une seule fois : le processus principal ouvre cette adresse-là, jamais une autre.

export const APP_AUTHOR = 'David Delepinne'
/** Autres crédits, dans l'ordre d'affichage. */
export const APP_CREDITS = [
  { role: 'Module Révision', name: 'Gabriel Delepinne' },
  { role: 'Soutien technique', name: 'Mathilde Gossart' }
] as const

export const APP_LICENSE = 'GPL-3.0'
export const REPOSITORY_URL = 'https://github.com/Atomiaze/NeoScenar'
