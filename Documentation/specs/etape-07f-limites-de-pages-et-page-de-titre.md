# Étape 7F — Limites de pages et page de titre

Complète les sections 3 et 9 de `etape-07-editeur-de-scenario.md`. En cas de différence, cette spécification fait foi.

## Objectif

1. Montrer dans l'éditeur **où tombent les pages**, exactement comme dans le PDF qui sera produit à l'étape 9 : un trait et le numéro de page.
2. Permettre de remplir la **page de titre** dans une petite fenêtre.

La pagination existe déjà (`packages/fountain/src/paginate.ts`, sous-étape A), ainsi que `pageStarts()`. Cette sous-étape commence par la **vérifier sur le PDF de référence**, puis l'affiche.

Présente un plan court à David avant de coder la partie 2 (affichage) : c'est la plus délicate.

## 1. Vérifier la pagination sur le PDF de référence (à faire en premier)

### 1.1 Coupure des mots après un trait d'union

**Écart constaté** : KIT coupe après un trait d'union. Dans une réplique du PDF de référence (gardé en local), sur le modèle de :

```
Je serai là demain matin au rendez-
vous, devant l'abri, avec ton
```

La première ligne fait exactement 35 caractères. `wrapLine` (`packages/fountain/src/wrap.ts`) ne coupe qu'aux espaces : il renverrait « rendez-vous, » entier à la ligne suivante. Le navigateur, lui, coupe après le trait d'union comme KIT. Aujourd'hui, l'écran, la pagination et KIT peuvent donc différer.

**Règle à appliquer dans `wrapLine`** : une coupure est possible après un trait d'union placé entre deux lettres (« peut-|être », « rendez-|vous », « APRÈS-|MIDI »). Le trait d'union reste en fin de ligne. Pas de coupure après un tiret isolé entouré d'espaces, ni avant un chiffre. Ajoute les tests correspondants.

### 1.2 Scénario de référence

- Reconstitue en Fountain le texte du PDF de référence exporté de KIT (un scénario original de David). Le fichier et son test restent **en local** (étape 16C : non publiés). Reprends la page de titre, les en-têtes, actions, personnages, didascalies et dialogues tels qu'ils sont.
- Test : la pagination de ce fichier avec le profil `final-draft-a4.json` doit donner **le même nombre de pages** que le PDF, et chaque page doit commencer par les mêmes lignes.

- Teste aussi le nombre de lignes de quelques répliques longues par rapport au PDF.
- Si un écart persiste, ne règle pas les valeurs au hasard : explique à David d'où il vient (largeur, espacement, règle de coupure) et propose la correction.

## 2. Limites de pages dans l'éditeur

### Ce qu'on voit

- Au début de chaque page, à partir de la page 2 : un **trait horizontal pointillé** sur la largeur de la page, avec le **numéro de page** (« 6. ») à droite, aligné sur le bord droit du texte, comme en haut d'une page imprimée. Pas de trait ni de numéro sur la première page.
- Le trait se place **exactement** à la ligne où commence la page, **y compris au milieu d'un paragraphe d'action** qui continue sur la page suivante (coupure à l'intérieur d'une ligne source qui s'affiche sur plusieurs lignes).
- Le trait **ne décale pas le texte** : il se dessine entre deux lignes, sans en ajouter. Le nombre de lignes à l'écran ne change pas quand une limite de page se déplace.
- **Saut de page forcé** (`===`) : la ligne `===` garde son affichage actuel, et le trait de la page suivante s'affiche normalement.
- Les éléments non imprimés (notes, sections, synopsis, texte mis de côté) restent visibles à l'écran mais ne comptent pas dans les pages, comme le calcule déjà la pagination.

### Indicateur dans la barre d'outils

« Page 3 / 6 · 5:40 » : la page où se trouve le curseur, le nombre total de pages et la durée estimée totale. La page du curseur tient compte de la ligne d'affichage où il se trouve dans un paragraphe coupé. Elle se met à jour quand le curseur bouge.

### Technique (suggestion, à confirmer dans ton plan)

- Une seule analyse et une seule pagination, regroupées, pour le navigateur, les traits et l'indicateur. Ne recalcule rien en double.
- Pour poser un trait au milieu d'un paragraphe, un décor de bloc de CodeMirror ne suffit pas, car il se place seulement entre deux lignes source. Un **calque** CodeMirror (`layer`, comme pour la sélection) positionné à partir de la position du caractère qui commence la ligne d'affichage convient : il ne modifie pas la mise en page et suit le zoom.
- Entre deux recalculs, les traits suivent le texte (positions reportées à chaque modification) pour éviter qu'ils sautent pendant la frappe.

### Accord entre l'écran et la pagination

C'est le point essentiel : **ce qu'on voit est ce qu'on imprime**. Les retours à la ligne faits par le navigateur doivent tomber aux mêmes endroits que ceux de `wrapLine`.

- Vérifie que les largeurs CSS (en `ch`) sont exactement celles du profil pour chaque élément, et que les longs mots se coupent net des deux côtés (`overflow-wrap: anywhere`).
- Ajoute un **contrôle en mode développement** : une commande (menu Développement, ou console) qui compare, pour chaque ligne source visible, le nombre de lignes affichées par CodeMirror au nombre calculé par `wrapLine`, et liste les écarts. Passe-la sur le scénario de référence et sur `exemple-complet.fountain`, et signale à David les écarts qui restent (ponctuation, guillemets « », barres obliques…).

## 3. Page de titre

### Fenêtre « Page de titre… »

On l'ouvre par un bouton dans la barre d'outils du module Scénario et par le menu **Fichier > Page de titre…**. Champs, dans cet ordre, avec la clé Fountain correspondante :

| Champ | Clé Fountain | Aide sous le champ |
|---|---|---|
| Titre | `Title` | |
| Genre ou information | `Credit` | ex. : Drame, Court métrage d'animation |
| Auteur(s) | `Author` | un nom par ligne |
| Mention | `Source` | ex. : Scénario original, D'après une idée de… |
| Contact | `Contact` | adresse e-mail, téléphone (plusieurs lignes possibles) |
| Date | `Draft date` | ex. : 2026 |
| Notes | `Notes` | |

- Cette correspondance reprend la page de titre du PDF de référence (voir `mise-en-page-final-draft-a4.md`). Si tu trouves un export Fountain de KIT, vérifie-la et signale tout écart.
- Les champs Auteur(s), Contact et Notes acceptent plusieurs lignes. Les autres tiennent sur une seule ligne.
- Boutons **Annuler** et **Valider**. Rien n'est écrit avant Valider.
- Les valeurs sont affichées telles qu'elles sont dans le fichier, marqueurs de mise en forme compris (`**…**`). Pas d'éditeur riche.

### Écriture (fonction pure dans `packages/fountain`, testée)

Écris une fonction (par exemple `updateTitlePage(texteDeLaPageDeTitre, valeurs)`) qui renvoie le nouveau texte de la page de titre :

- une clé dont la valeur n'a pas changé garde son **texte source exact** ;
- les **clés inconnues** (toute autre clé du fichier) sont conservées telles quelles, à leur place ;
- une clé modifiée est réécrite à sa place. Une valeur sur une ligne donne `Clé: valeur`. Une valeur sur plusieurs lignes donne `Clé:` seul sur sa ligne, suivi de chaque ligne en retrait de 3 espaces ;
- une clé nouvelle est ajoutée après les clés existantes, dans l'ordre du tableau ;
- un champ vidé supprime sa clé ;
- s'il n'y avait pas de page de titre, elle est créée en tête du fichier, suivie d'une ligne vide. Si tous les champs sont vides, aucune page de titre n'est écrite ;
- **garantie** : le corps du scénario est inchangé, caractère pour caractère, et la page de titre relue par `parse` donne exactement les valeurs saisies.

L'enregistrement passe par le chemin habituel : `joinScenario` avec la nouvelle page de titre, enregistrement automatique, détection des modifications extérieures. La page de titre ne fait pas partie de l'historique d'annulation de l'éditeur.

### Synchronisation du titre avec `projet.json`

- Valider la fenêtre avec un titre modifié met à jour `title` dans `projet.json` : titre de la fenêtre, projets récents. Le **nom du dossier** ne change jamais.
- À l'ouverture d'un projet, si `scenario.fountain` a un `Title` différent de celui de `projet.json` (modifié dans Obsidian, par exemple), le Fountain fait foi et `projet.json` est mis à jour.
- Si le Fountain n'a pas de `Title`, la fenêtre propose le titre de `projet.json` dans le champ Titre.
- Un titre écrit en Fountain avec des marqueurs (`_**LE DERNIER BUS**_`) est copié dans `projet.json` sans ces marqueurs.

## Hors périmètre

- Affichage de la page de titre mise en page, et impression (étape 9).
- Mention (SUITE) en bas et en haut des pages, coupure d'un dialogue entre deux pages (étape 13).
- Vue « pages séparées » avec des feuilles A4 visibles à l'écran.

## Tests automatiques attendus

- `wrapLine` : coupure après un trait d'union entre deux lettres, pas après un tiret isolé, pas avant un chiffre ; le cas « Je serai là demain matin au rendez- » sur 35 caractères.
- Scénario de référence (local) : réécriture à l'identique, même nombre de pages et mêmes débuts de page que le PDF, nombre de lignes de quelques répliques.
- Page du curseur : à l'intérieur d'un paragraphe coupé entre deux pages, avant et après le trait.
- Page de titre : clés inchangées gardées à l'octet près, clé inconnue conservée, ajout, modification, suppression, valeurs sur plusieurs lignes, création quand il n'y en a pas, aucune page de titre si tout est vide, corps inchangé, relecture par `parse`.
- Synchronisation du titre : Fountain → `projet.json` à l'ouverture, marqueurs retirés.

## Critères de validation (à vérifier par David)

- [ ] Coller le scénario de référence dans un projet : les traits de page tombent aux mêmes endroits que les pages du PDF de référence, et « rendez- / vous » est coupé comme dans KIT.
- [ ] Taper un long paragraphe d'action en bas d'une page : le trait se place au milieu du paragraphe, à la bonne ligne, sans décaler le texte.
- [ ] Ajouter une réplique avant un nom de personnage situé en bas de page : le nom passe à la page suivante avec sa réplique.
- [ ] La barre d'outils affiche « Page x / y · durée » et suit le curseur.
- [ ] La frappe reste fluide sur 120 pages, et les traits ne sautent pas pendant la frappe.
- [ ] Fichier > Page de titre… : remplir les champs, valider, ouvrir `scenario.fountain` dans un éditeur de texte. La page de titre est en tête, propre, et le reste du fichier n'a pas bougé.
- [ ] Changer le titre : le titre de la fenêtre et la liste des projets récents suivent. Le dossier du projet garde son nom.
- [ ] Ajouter à la main une clé inconnue (`Revision: 2`) dans le fichier, puis passer par la fenêtre : la clé est toujours là.
- [ ] `npm test` et `npm run lint` passent.

À la fin, résume ce qui a été fait, signale tout écart et toute décision prise seul, puis attends l'accord de David avant le commit.
