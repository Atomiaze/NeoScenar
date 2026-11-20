import { avoidReservedName } from './fileNameRules'

// Lettres qui ne se décomposent pas en « lettre + accent » et doivent être remplacées à la main.
const SPECIAL_LETTERS: Record<string, string> = {
  œ: 'oe',
  Œ: 'OE',
  æ: 'ae',
  Æ: 'AE',
  ß: 'ss',
  ø: 'o',
  Ø: 'O',
  ł: 'l',
  Ł: 'L',
  đ: 'd',
  Đ: 'D'
}

/**
 * Transforme un titre libre en nom de dossier sûr pour tous les systèmes et pour Blender :
 * « Mon Film d'été » → « Mon_Film_d_ete ». Renvoie une chaîne vide s'il ne reste rien.
 */
export function sanitizeFolderName(title: string): string {
  const name = title
    .replace(/[œŒæÆßøØłŁđĐ]/g, (letter) => SPECIAL_LETTERS[letter] ?? '')
    .normalize('NFD')
    .replace(/\p{Mark}/gu, '')
    .replace(/[^A-Za-z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
  // « Con » ou « Aux » seraient refusés par Windows : « Con_ ».
  return name === '' ? '' : avoidReservedName(name)
}
