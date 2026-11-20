// Outil de développement (jamais livré) : liste les couleurs écrites en dur dans src/renderer/,
// hors du fichier des thèmes. Les exceptions voulues sont listées ci-dessous, avec leur raison.
// Usage : npm run couleurs   (code de sortie 1 s'il reste des couleurs oubliées)

import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const racine = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const dossier = join(racine, 'src', 'renderer')

const COULEUR = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)/g

/** Ombres, voiles et filets : noir translucide, valable sur tous les thèmes. */
const NOIR_TRANSLUCIDE = /^rgba\(\s*0\s*,\s*0\s*,\s*0\s*,/

// Fichiers entiers : contenu de l'élève ou des exports, jamais thémé.
const FICHIERS = [
  ['drawing/drawingFiles.ts', 'éditeur de dessin : le papier est blanc'],
  ['cards/thumbnails/drawing.ts', "vignettes : contenu de l'élève, bandes noires ou blanches"],
  ['credits/creditsDrawing.ts', 'générique : PNG exporté, jamais thémé'],
  [
    'credits/creditsExport.css',
    'aperçu du générique : damier fixe qui figure la transparence du PNG'
  ],
  [
    'research/CharacterSheetView.tsx',
    "valeur de départ du sélecteur de couleur d'un personnage (donnée de la fiche)"
  ],
  ['script/editor/decorations.ts', "couleur de repli d'une section : palette des cartes"],
  [
    'components/ScriptColorsSettings.tsx',
    "aperçu des réglages : bandeau d'acte automatique (pastel)"
  ]
]

// Sélecteurs CSS (styles.css) : cartes, dessin, recadrage des images.
const SELECTEURS = [
  [
    /^\.card\.colored|^\.scene-card\.colored/,
    'cartes : la palette est toujours claire, texte foncé'
  ],
  [/^\.home-visual /, 'accueil : fond du visuel, qui ne change jamais avec le thème'],
  [/^\.crop-/, "recadrage d'image : repères blancs sur l'image de l'élève"],
  [/^\.drawing-/, 'éditeur de dessin : damier, grille et curseur sur le papier'],
  [/^\.thumbnail-badge/, "pastille orange (couleur d'avertissement du thème) : texte foncé fixe"]
]

function fichiers(base) {
  const resultat = []
  for (const entree of readdirSync(base, { withFileTypes: true })) {
    const chemin = join(base, entree.name)
    if (entree.isDirectory()) resultat.push(...fichiers(chemin))
    else if (/\.(css|tsx?)$/.test(entree.name) && !/\.test\.tsx?$/.test(entree.name)) {
      resultat.push(chemin)
    }
  }
  return resultat
}

const oublis = []
let exceptions = 0

for (const chemin of fichiers(dossier)) {
  const nom = relative(dossier, chemin).split(sep).join('/')
  if (FICHIERS.some(([f]) => f === nom)) continue
  let selecteur = ''
  readFileSync(chemin, 'utf8')
    .split('\n')
    .forEach((ligne, index) => {
      if (nom.endsWith('.css') && /\{\s*$/.test(ligne) && !/^\s*@/.test(ligne))
        selecteur = ligne.trim()
      for (const couleur of ligne.match(COULEUR) ?? []) {
        if (NOIR_TRANSLUCIDE.test(couleur)) continue
        if (nom.endsWith('.css') && SELECTEURS.some(([re]) => re.test(selecteur))) {
          exceptions++
          continue
        }
        oublis.push(`${nom}:${index + 1}  ${couleur}   ${ligne.trim()}`)
      }
    })
}

if (oublis.length === 0) {
  console.log(
    `Aucune couleur oubliée (${FICHIERS.length} fichiers et ${exceptions} lignes d'exceptions voulues).`
  )
} else {
  console.log(`${oublis.length} couleur(s) en dur hors des thèmes :\n`)
  console.log(oublis.join('\n'))
  process.exitCode = 1
}
