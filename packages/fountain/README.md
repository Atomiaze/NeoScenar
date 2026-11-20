# @neoscenar/fountain

Analyseur [Fountain](https://fountain.io/syntax) écrit pour NeoScenar : il **lit** un scénario au format Fountain, en donne une structure exploitable (page de titre, scènes, personnages, dialogues…) et sait le **réécrire**.

- **Aucune perte** : lire puis réécrire un fichier sans modification redonne exactement le même texte, caractère pour caractère, même pour un fichier mal formé (fins de ligne Windows ou Mac, marque BOM, tabulations, espaces en fin de ligne, notes non refermées…).
- **Aucune dépendance** : TypeScript pur. Fonctionne dans un navigateur, dans Node, dans Electron ou dans un plugin Obsidian.
- **Jamais d'erreur** : un texte bizarre est simplement classé du mieux possible.
- **Adapté au français** : lettres accentuées dans les noms (`ÉLODIE`, `FRANÇOIS`), extension `(SUITE)`, transitions françaises forcées par `>` (`>FONDU AU NOIR.`).

## Exemple d'utilisation

```ts
import { parse, serialize, getScenes, getCharacters, updateElement } from '@neoscenar/fountain'

const doc = parse(texte)

for (const scene of getScenes(doc)) {
  console.log(scene.order, scene.info.location, scene.info.time)
  // 1 « MAISON - CUISINE » « JOUR » pour « INT. MAISON - CUISINE - JOUR »
}

console.log(getCharacters(doc)) // [{ name: 'ÉLODIE', lines: 4 }, …]

serialize(doc) === texte // toujours vrai tant que rien n'a été modifié

// Modifier un élément : seul celui-ci sera réécrit, le reste du fichier est conservé à l'identique.
doc.elements[3] = updateElement(doc.elements[3], { text: 'Marie court vers la porte.' })
const nouveauTexte = serialize(doc)
```

## Structure de données

Un document (`FountainDocument`) contient :

- `titlePage` : la page de titre (paires clé/valeur dans l'ordre) ou `null` ;
- `elements` : la liste des éléments du scénario ;
- `bom`, `lineEnding`, `leading` : ce qu'il faut pour réécrire le fichier à l'identique.

Chaque élément (`FountainElement`) a :

| Champ                | Contenu                                                                                                                                                          |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `type`               | `scene_heading`, `action`, `character`, `parenthetical`, `dialogue`, `lyrics`, `transition`, `centered`, `page_break`, `section`, `synopsis`, `note`, `boneyard` |
| `text`               | texte utile, sans les marqueurs (`!`, `@`, `>`, `~`, `.`, `=`, `#`)                                                                                              |
| `forced`             | un marqueur de forçage (`!`, `@`, `.`, `>`) était présent                                                                                                        |
| `raw`                | texte source exact (lignes, fins de ligne et lignes vides qui suivent) ; absent si l'élément a été créé ou modifié                                               |
| `position`           | lignes de début et de fin (à partir de 1), décalages en caractères dans le texte d'origine                                                                       |
| `notes`, `boneyards` | notes `[[…]]` et textes mis de côté `/*…*/` repérés dans l'élément                                                                                               |
| `scene`              | en-tête : `prefix`, `location`, `time`, `number`                                                                                                                 |
| `character`          | personnage : `name`, `extensions`, `dual`                                                                                                                        |
| `section`            | section : `level`                                                                                                                                                |

**Règle du lieu et du moment** : le moment est le dernier segment après « - » (tiret entouré d'espaces), le lieu est tout ce qui se trouve entre le préfixe et ce dernier segment. `INT. MAISON - CUISINE - JOUR` donne le lieu « MAISON - CUISINE » et le moment « JOUR » ; `EXT. RUE SAINT-LUC - NUIT` donne le lieu « RUE SAINT-LUC ».

## Fonctions

| Fonction                                                            | Rôle                                                                                                                                                                 |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `parse(texte)`                                                      | analyse un texte Fountain                                                                                                                                            |
| `serialize(document)`                                               | réécrit le texte ; un élément non modifié redonne son texte source, un élément créé ou modifié est produit proprement (forçage ajouté seulement s'il est nécessaire) |
| `getScenes(document)`                                               | scènes, d'un en-tête au suivant, avec en-tête analysé, position et éléments                                                                                          |
| `getCharacters(document)`                                           | personnages distincts et nombre de répliques (`MARIE`, `MARIE (SUITE)` et `@Marie` sont regroupés)                                                                   |
| `getLocations(document)`                                            | lieux distincts et nombre de scènes                                                                                                                                  |
| `parseInline(texte)`                                                | découpe une ligne en morceaux : gras, italique, souligné, notes, texte mis de côté                                                                                   |
| `parseSceneHeading(ligne)`                                          | analyse une ligne seule comme un en-tête (ou `null`)                                                                                                                 |
| `parseCharacterLine(ligne)`                                         | analyse une ligne seule comme un personnage (ou `null`)                                                                                                              |
| `createElement(type, texte)`, `updateElement(élément, changements)` | créer ou modifier un élément par programme                                                                                                                           |

## Choix d'interprétation

- Un `/*` ou un `[[` jamais refermé reste du texte ordinaire (le reste du scénario n'est pas masqué).
- Une note ne traverse jamais une vraie ligne vide (une ligne de deux espaces est permise).
- Un en-tête de scène doit être précédé d'une ligne vide (ou forcé par un `.`).
- Une page de titre doit commencer par une clé qui a une valeur : `FADE IN:` seul en début de fichier n'est donc pas une page de titre.

## Mise en page et pagination

Le profil de mise en page (`resources/mise-en-page/final-draft-a4.json` dans NeoScenar) donne les mesures de la page et de chaque élément. Le module ne lit pas le fichier lui-même : il reçoit son contenu.

```ts
const layout = resolveLayout(profil) // retraits en caractères, largeurs de coupure, 58 lignes par page
const pagination = paginate(doc, layout) // lignes de chaque élément et découpage en pages
pageStarts(pagination) // où dessiner les limites de pages 2, 3… dans l'éditeur
estimateDurations(doc, pagination) // une page ≈ une minute : par scène, par section, au total
getSectionEnds(doc) // bandeaux « FIN DE ACTE 1 » (affichage seulement)
getSceneNumbers(doc) // « 1 », « 12A » (numéro forcé), « 3 »…
```

Chaque ligne imprimée indique aussi `sourceOffset`, la position dans le texte du caractère qui la commence : l'éditeur s'en sert pour dessiner une limite de page au milieu d'un paragraphe.

Coupure des mots : entre les mots, ou après un trait d'union placé entre deux lettres (« rendez-|vous »), comme KIT Scenarist. La pagination a été vérifiée ligne à ligne sur un PDF exporté de KIT (test de référence gardé hors du dépôt public).

Règles de coupure : pas de ligne vide en haut de page ; un en-tête de scène passe à la page suivante s'il ne tient pas avec sa ligne vide et la première ligne qui le suit ; un bloc de dialogue (personnage, didascalies, répliques, paroles collées) n'est pas coupé, sauf s'il dépasse une page entière ; une action peut être coupée entre deux lignes. Notes, sections, synopsis et texte mis de côté ne sont pas imprimés.

## Page de titre

```ts
readTitlePage(pageDeTitre) // { Title, Credit, Author, Source, Contact, 'Draft date', Notes }
updateTitlePage(pageDeTitre, valeurs) // nouveau texte : clés inchangées et inconnues gardées à l'octet près
plainTitle('_**LE DERNIER BUS**_') // « LE DERNIER BUS »
```

## Démonstration

Depuis la racine du dépôt NeoScenar :

```sh
npm run fountain:demo -- packages/fountain/tests/exemples/exemple-complet.fountain
npm run fountain:pages -- packages/fountain/tests/exemples/exemple-complet.fountain
```

## Licence

GPL-3.0-or-later, comme NeoScenar.
