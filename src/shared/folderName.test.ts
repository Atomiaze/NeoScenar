import { describe, expect, it } from 'vitest'
import { sanitizeFolderName } from './folderName'

describe('sanitizeFolderName', () => {
  it('reproduit l’exemple du cahier des charges', () => {
    expect(sanitizeFolderName('Mon Film d’été')).toBe('Mon_Film_d_ete')
    expect(sanitizeFolderName("Mon Film d'été")).toBe('Mon_Film_d_ete')
  })

  it('retire les accents et remplace les lettres liées', () => {
    expect(sanitizeFolderName('Ça, c’est Noël à Liège')).toBe('Ca_c_est_Noel_a_Liege')
    expect(sanitizeFolderName('Cœur Œuvre ÆSOP straße')).toBe('Coeur_OEuvre_AESOP_strasse')
  })

  it('réduit les espaces multiples et retire les « _ » au début et à la fin', () => {
    expect(sanitizeFolderName('   La    nuit   ')).toBe('La_nuit')
  })

  it('remplace la ponctuation et garde les tirets', () => {
    expect(sanitizeFolderName('Qui ? Quoi ! (2026) — fin.')).toBe('Qui_Quoi_2026_fin')
    expect(sanitizeFolderName('Court-métrage n°3')).toBe('Court-metrage_n_3')
  })

  it('conserve les majuscules et minuscules', () => {
    expect(sanitizeFolderName('LeGrand Soir')).toBe('LeGrand_Soir')
  })

  it('renvoie une chaîne vide quand il ne reste rien', () => {
    expect(sanitizeFolderName('')).toBe('')
    expect(sanitizeFolderName('  !!! ')).toBe('')
  })

  it('laisse intact un nom déjà propre', () => {
    expect(sanitizeFolderName('Projet_2026-final')).toBe('Projet_2026-final')
  })
})
