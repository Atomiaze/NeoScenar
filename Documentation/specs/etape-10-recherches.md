# Étape 10 — Recherches : personnages, lieux, documents

Référence : cahier des charges, sections 3.2, 4 et 6 (« Liens avec les fiches personnages et lieux »). Décisions du 18 novembre 2026.

## Sous-étapes

| | Contenu | Modèle conseillé |
|---|---|---|
| 10A | Moteur des fiches Markdown + module Recherches + fiches Personnages | Opus |
| 10B | Fiches Lieux (même moteur) | Sonnet |
| 10C | Liens avec le scénario : création au rapprochement, ressemblances, fiches inutilisées, autocomplétion, `Cmd/Ctrl + clic` | Opus |
| 10D | Renommage depuis la fiche | Opus |
| 10E | Documents : dossiers, notes, galeries d'images | Sonnet |

Une sous-étape = plan court, réalisation, essais, accord de David, commit, `/clear`.

## Décisions

- **Fichiers** : une fiche = un fichier Markdown avec propriétés YAML (format Obsidian), dans `neoscenar/personnages/` et `neoscenar/lieux/`.
- **Nom du fichier = nom tel qu'il est écrit dans le scénario** : `MARIE.md`, `MAISON - CUISINE.md`. Caractères interdits dans un nom de fichier (`/ \ : * ? " < > |`) remplacés par `_`. Le vrai nom est la propriété `nom` : c'est elle qui sert à la comparaison avec le scénario (insensible à la casse).
- **Création automatique au rapprochement** (enregistrement et retour dans l'appli, comme à l'étape 8), pas à la frappe. Elle voit donc aussi les modifications faites dans Obsidian.
- **Aucune donnée perdue** : NeoScenar conserve à la lecture puis réécrit tel quel tout ce qu'il ne connaît pas (propriétés ajoutées dans Obsidian, sections supplémentaires, texte libre). Une fiche qui a du contenu n'est jamais supprimée automatiquement.
- **Images** : copiées dans `personnages/images/` (ou `lieux/images/`), nom d'origine conservé, suffixe `-2`, `-3` en cas de doublon. Elles sont référencées dans la section `## Images` du corps en Markdown standard (`![](images/marie-1.jpg)`), donc visibles aussi dans Obsidian.
- Enregistrement sûr (déjà en place), enregistrement automatique, relecture d'une fiche modifiée ailleurs au retour dans l'appli.

## Format des fiches

Personnage :

```markdown
---
type: personnage
nom: MARIE
interprete: Léa Dupont
age: 16
role: principal        # principal | secondaire | figurant
couleur: "#E07A5F"
resume: Lycéenne qui veut quitter sa ville.
auto: false            # true = créée automatiquement et jamais complétée
---

## Description

Description longue, texte libre.

## Objectifs

## Relations

## Images

![](images/marie-1.jpg)
```

Lieu :

```markdown
---
type: lieu
nom: MAISON - CUISINE
resume: Cuisine étroite, années 70.
auto: false
---

## Description

## Repérage

## Images
```

- `couleur` : proposée automatiquement dans une palette fixe de couleurs bien distinctes, modifiable.
- `resume` = description courte (une ligne), affichée dans la liste ; la description longue est la section `## Description`.

## 10A — Moteur et Personnages

- Module **Recherches** accessible par son icône dans la barre verticale de gauche.
- Colonne de gauche : arbre **Personnages / Lieux / Documents** ; zone de droite : la fiche ouverte.
- Liste des personnages : pastille de couleur, nom, résumé ; tri par rôle puis par nom. Boutons Nouveau / Supprimer (suppression confirmée, avec copie dans `sauvegardes/`).
- Fiche : champs ci-dessus, zones de texte simples (pas d'éditeur riche), galerie d'images (glisser-déposer ou bouton, aperçu en grand au clic, retrait d'une image).
- Le moteur (lecture et écriture des fiches, conservation de l'inconnu) est un module à part, testé automatiquement.

*Validé quand* : on crée, modifie, ferme et rouvre une fiche avec des images ; on ajoute une propriété et une section dans Obsidian, on modifie la fiche dans NeoScenar, et rien n'est perdu ; le dossier s'ouvre proprement dans Obsidian, images visibles.

## 10B — Lieux

- Même moteur, même interface ; liste triée par nom.
- Un lieu composé forme un seul lieu : dans `INT. MAISON - CUISINE - JOUR`, le lieu est « MAISON - CUISINE » (le moment est toujours le dernier segment).

*Validé quand* : mêmes essais que 10A, pour les lieux.

## 10C — Liens avec le scénario

- **Au rapprochement**, l'appli liste les personnages (éléments Personnage) et les lieux (en-têtes de scène) du Fountain grâce à `packages/fountain`. Pour chaque nom sans fiche : fiche vide créée avec `auto: true`.
- Ce qui n'est pas le nom : extensions `(V.O.)`, `(O.S.)`, `(SUITE)`…, marque de dialogue simultané `^`, `@` des éléments forcés.
- **Bandeau de résumé** (celui de l'étape 8) : « 2 nouvelles fiches : MARIE, CUISINE », avec lien vers chaque fiche.
- **Ressemblance** : si un nouveau nom ressemble fort à une fiche existante (une lettre de différence, ou l'un contient l'autre : MARI / MARIE), la fiche n'est pas créée. Le bandeau propose : « Créer la fiche MARI » ou « Remplacer MARI par MARIE dans le scénario » (annulable).
  - *Précisé le 18 nov.* : seulement pour les noms d'au moins 4 lettres (ni LÉA / LÉO, ni A / C). « L'un contient l'autre » vaut pour les personnages seulement : pour les lieux, MAISON et MAISON - CUISINE sont voulus.
- **Fiches inutilisées** : une fiche `auto: true`, restée vide et absente du scénario, apparaît grisée avec un bouton « Supprimer ». Une fiche qui a du contenu et n'apparaît plus dans le scénario est simplement marquée « absente du scénario ».
- **Autocomplétion** de l'éditeur : noms des fiches + noms déjà présents dans le scénario.
- `Cmd/Ctrl + clic` sur un nom de personnage ou un lieu d'en-tête ouvre sa fiche. *Précisé le 18 nov.* : si la fiche n'existe pas encore, elle est créée vide puis ouverte.
- *Précisé le 18 nov.* : les fiches sont aussi relues à chaque retour dans l'appli ; une fiche supprimée dans le Finder alors que le nom reste dans le scénario est recréée vide.
- Une fiche complétée par l'élève passe à `auto: false`.

*Validé quand* : écrire une scène avec deux nouveaux personnages et un nouveau lieu crée trois fiches à l'enregistrement ; MARI à côté de MARIE est signalé et non créé ; la même chose fonctionne après une modification du Fountain dans Obsidian ; `Cmd + clic` ouvre la bonne fiche.

## 10D — Renommage

- Changer le nom dans la fiche ouvre une fenêtre : « Remplacer MARIE par MARION dans le scénario ? » avec le nombre d'occurrences :
  - éléments Personnage et en-têtes de scène : toujours remplacés ;
  - texte des actions et dialogues : option cochée par défaut, mot entier, en respectant la casse (MARIE → MARION, Marie → Marion).
- Copie de sécurité `avant_renommage_…` dans `sauvegardes/` ; le remplacement est annulable.
- Le fichier de la fiche est renommé (les images ne bougent pas).
- Si le nouveau nom existe déjà : refus avec un message clair (la fusion de deux fiches est pour plus tard).

- *Précisé le 18 nov.* :
  - renommer un **personnage** ne modifie jamais les en-têtes : la fenêtre signale seulement ceux qui contiennent le nom (« 2 en-têtes contiennent MARIE : à renommer depuis la fiche du lieu ») ; renommer un **lieu** remplace ses en-têtes ;
  - les notes `[[ ]]` et le texte en commentaire `/* */` ne sont pas touchés ;
  - aucune occurrence dans le scénario : renommage direct, sans fenêtre, bandeau avec « Annuler » ;
  - le remplacement se fait hors de l'historique de l'éditeur (comme les actions des cartes) : seul le bouton « Annuler » du bandeau le défait (scénario, fiche et nom du fichier) ;
  - deux boutons seulement : « Remplacer » / « Annuler » ;
  - casse : MARIE → MARION, Marie → Marion, marie → marion ; une autre écriture reçoit le nom tel que tapé ;
  - copies `avant_renommage_…` (scénario, découpage, fiche) toutes gardées.

*Validé quand* : le renommage met à jour scénario, fiche et nom du fichier ; l'annulation remet tout comme avant ; la copie de sécurité existe.

## 10E — Documents

- `neoscenar/documents/` reflète l'arbre : de vrais dossiers, créables, renommables, supprimables (confirmation).
- Un dossier contient des notes (fichiers `.md`, éditées en texte simple) et des images, affichées en galerie (glisser-déposer pour importer).
- Pas de mindmap.
- *Décidé le 18 nov.* :
  - noms de dossiers et de notes : accents et espaces conservés (comme les fiches), seuls les caractères interdits sont remplacés par `_` ; comparaison en Unicode NFC et sans tenir compte de la casse (le Mac peut écrire les accents en NFD) ;
  - galerie : les images sont posées directement dans le dossier (pas de sous-dossier `images/`) ; tous les fichiers image du dossier forment la galerie ; retirer une image la déplace dans `sauvegardes/` (jamais supprimée) ;
  - sous-dossiers à plusieurs niveaux ; suppression d'un dossier ou d'une note confirmée, avec copie dans `sauvegardes/` ;
  - l'arbre est relu au retour dans NeoScenar (dossier ou note ajouté dans le Finder) ;
  - les notes n'ont pas de galerie dans Obsidian : accepté.

*Validé quand* : on crée dossiers, notes et galeries, on les retrouve tels quels dans le Finder et dans Obsidian.

## Hors de cette étape

Générique final (10b), export PDF des Recherches, statistiques par personnage, alias de personnages, fusion de fiches.
