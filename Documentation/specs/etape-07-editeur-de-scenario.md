# Étape 7 — Éditeur de scénario

## Objectif

Activer le module **Scénario** : un éditeur où l'étudiant écrit son scénario avec une mise en forme automatique au modèle « Scénario Final Draft (A4) » demandé au cours, un enchaînement au clavier repris de KIT Scenarist, un navigateur de scènes, des limites de pages visibles et un enregistrement automatique dans `neoscenar/scenario.fountain`.

C'est **la partie la plus difficile du projet**. Présente ton plan à David et découpe impérativement en sous-étapes validées une à une (par exemple : A. mise en page et pagination (logique pure) ; B. éditeur, affichage des éléments, enregistrement ; C. clavier : Entrée, Tab, raccourcis, sélecteur d'élément ; D. assistant d'en-tête et autocomplétion ; E. navigateur de scènes ; F. limites de pages, page de titre, recherche, correcteur, thème, finitions).

Références : `CLAUDE.md` ; section 6 du cahier des charges (si la copie locale n'est pas à jour, cette spécification fait foi) ; module `packages/fountain` (étape 6), à utiliser pour toute l'analyse ; le tutoriel KIT Scenarist du cours, non publié (le comportement de KIT que les élèves connaissent).

**Dépendance à installer** : CodeMirror 6 (`@codemirror/state`, `@codemirror/view`, `@codemirror/commands`, `@codemirror/search` et ce qui est strictement nécessaire). Demande à David d'accepter l'installation. Aucune autre bibliothèque sans son accord.

## 1. Principe : l'éditeur travaille directement sur le texte Fountain

- Le contenu de l'éditeur **est** le texte Fountain du corps du scénario (sans la page de titre, voir § 9). Il n'y a pas de seconde représentation à synchroniser : enregistrer, c'est écrire ce texte (avec la page de titre devant). La fidélité est donc garantie par construction.
- La mise en forme est un **habillage** : chaque ligne reçoit, selon l'élément reconnu par `packages/fountain`, des retraits, une largeur et un style. Les lignes vides du Fountain correspondent naturellement aux lignes vides d'un scénario Final Draft.
- Les **marqueurs de forçage** (`!`, `@`, `>`, `.` initial, `<` final, `~`) sont masqués à l'affichage quand le curseur n'est pas sur la ligne (affichés en discret quand il y est), mais restent dans le texte.
- Les éléments qui doivent être en majuscules (en-tête, personnage, transition) sont **réellement** mis en majuscules pendant la frappe (c'est le texte majuscule qui permet à Fountain de les reconnaître), sauf les extensions entre parenthèses.
- L'analyse complète du texte prend quelques millisecondes : la refaire à chaque modification (regroupée si nécessaire) est acceptable. La frappe doit rester parfaitement fluide sur 120 pages.

## 2. Mise en page « Scénario Final Draft (A4) »

- Les mesures sont dans un fichier de profil livré avec l'application (`resources/mise-en-page/final-draft-a4.json`), lu par l'éditeur **et** par le futur export PDF (étape 9). **Leurs valeurs sont celles de `Documentation/specs/mise-en-page-final-draft-a4.md`**, relevées sur le PDF de référence de KIT (gardé en local) : à lire avant de commencer. En résumé : A4, **Courier Prime** 12 points (police libre, licence OFL, **livrée avec l'application**, aucune connexion), marge gauche 1,5 pouce, texte sur 61 caractères, 58 lignes par page ; dialogue à 26 mm de la marge sur 35 caractères, didascalie à 36 mm, personnage à 51 mm, transitions alignées à droite ; deux lignes vides avant un en-tête de scène.
- Les espacements sont des règles de mise en page par type d'élément : dans le texte Fountain, une seule ligne vide sépare les éléments, c'est l'affichage qui ajoute la ligne supplémentaire avant un en-tête de scène.
- Police à chasse fixe : les retraits et largeurs s'expriment en unités `ch`, ce qui rend l'écran fidèle à la page.
- **Numéro de scène** affiché dans la marge gauche, devant l'en-tête (« 8. ») : numéro forcé `#…#` s'il existe, sinon numérotation continue 1, 2, 3… (le lien avec les numéros S_0010 du découpage sera traité à l'étape 8).
- **Notes** `[[ … ]]` (le « texte non imprimable » de KIT) : affichées en vert, comme dans KIT.
- **Texte mis de côté** `/* … */` : grisé.
- **Sections** `#` (actes, séquences) : bandeau coloré sur toute la largeur (« ACTE 1 - INTRO »), et un bandeau « FIN DE ACTE 1 » ajouté **à l'affichage seulement** avant la section suivante de même niveau ou plus haut, et à la fin du scénario. Rien n'est ajouté au fichier. Couleurs : attribuées automatiquement dans la palette de l'application (choix des couleurs par l'élève plus tard).
- **Synopsis** `=` : affiché en italique grisé sous l'en-tête.
- Gras, italique, souligné (`**`, `*`, `_`) affichés comme tels, marqueurs discrets.

## 3. Pagination et limites de pages

- Module de **pagination pur** (dans `packages/fountain`, sans dépendance, réutilisé par le PDF à l'étape 9) : à partir du document analysé et du profil de mise en page, il calcule les lignes occupées par chaque élément (coupure des mots selon la largeur en caractères) et le découpage en pages.
- Règles de coupure de page (version simple) : un en-tête de scène n'est jamais seul en bas de page (il passe à la page suivante avec la première ligne qui le suit) ; un nom de personnage n'est jamais séparé de sa première ligne de dialogue ; un bloc de dialogue qui ne tient pas passe entièrement à la page suivante (les mentions « (SUITE) » de part et d'autre d'une coupure viendront plus tard).
- Dans l'éditeur : à chaque changement de page, un **trait de séparation** avec le **numéro de page** à droite (« 6. »), comme dans KIT. Pas de numéro sur la première page.
- Durée estimée : **une page ≈ une minute**, au prorata des lignes. Affichée par scène, par acte et pour tout le scénario.

## 4. Enchaînement au clavier (comme dans KIT Scenarist)

Toute la logique « quel élément vient ensuite » est une **table de transitions** écrite comme fonction pure et testée :

| Élément courant | `Entrée` (en fin de ligne) | `Tab` (sur une ligne vide) | `Tab` (sur une ligne non vide) |
|---|---|---|---|
| En-tête de scène | Action | — | Action (et passe à la ligne) |
| Action | Action (nouveau paragraphe) | Personnage | Personnage (nouvelle ligne) |
| Personnage | Dialogue | Didascalie | Dialogue (nouvelle ligne) |
| Didascalie | Dialogue | — | Dialogue (nouvelle ligne) |
| Dialogue | Action | Didascalie | Personnage (nouvelle réplique) |
| Transition | En-tête de scène | — | En-tête de scène |

- `Entrée` insère ce qu'il faut de lignes vides pour que le nouvel élément soit bien reconnu par Fountain (par exemple une ligne vide avant un personnage, aucune entre un personnage et son dialogue).
- `Entrée` sur un élément vide le transforme en Action (pour sortir facilement d'un dialogue, par exemple).
- `Maj + Entrée` : simple retour à la ligne dans le même élément (dialogue sur plusieurs paragraphes).
- La table est définie dans un seul fichier, pour pouvoir être ajustée après les essais de David.

### Raccourcis (repris de KIT)

| Raccourci | Effet |
|---|---|
| `Cmd + Entrée` | En-tête de scène |
| `Cmd + J` | Action |
| `Cmd + U` | Personnage |
| `Cmd + H` | Didascalie |
| `Cmd + L` | Dialogue |
| `Cmd + G` | Transition |
| `Cmd + ↑` / `Cmd + ↓` | Majuscules / minuscules sur la sélection ou le mot |
| `Cmd + B` / `Cmd + I` | Gras / italique |
| `Cmd + Maj + U` | Souligné (car `Cmd + U` est réservé au personnage, comme dans KIT) |
| `Cmd + F` | Rechercher / remplacer |
| `Cmd + +` / `Cmd + -` | Zoom |

Conflits avec macOS à régler : `Cmd + H` sert normalement à « Masquer NeoScenar » et `Cmd + G` à « Rechercher le suivant ». Dans le module Scénario, ces raccourcis sont attribués à KIT (retirer le raccourci de « Masquer NeoScenar » dans le menu ; « suivant » de la recherche par `Entrée` dans le champ de recherche). Signale à David toute autre collision rencontrée.

### Sélecteur d'élément

Dans la barre d'outils, une liste déroulante affiche le type de l'élément où se trouve le curseur (« En-tête de scène », « Action », « Personnage », « Didascalie », « Dialogue », « Transition », « Paroles », « Texte non imprimable », « Section », « Synopsis », « Texte centré », « Saut de page ») et permet de le changer. **Changer de type garantit que le texte sera relu avec ce type** : l'éditeur ajuste la casse, les lignes vides et ajoute un marqueur de forçage **seulement si nécessaire** (fonction pure testée, appuyée sur `packages/fountain`). Exemple : choisir « Transition » sur « fondu au noir » donne `> FONDU AU NOIR`.

## 5. Assistant d'en-tête de scène et autocomplétion

- Menu déroulant **près du curseur**, filtré au fil de la frappe ; `Entrée` ou `Tab` valide, `Échap` ferme.
- **En-tête de scène** :
  1. sur une ligne d'en-tête vide, taper `i` ou `e` propose `INT.`, `EXT.`, `INT./EXT.` ;
  2. après le préfixe et une espace : les **lieux** déjà utilisés dans le scénario (règle du lieu : tout ce qui est entre le préfixe et le dernier « - », par exemple « MAISON - CUISINE ») ;
  3. après ` - ` : les **moments** (JOUR, NUIT, MATIN, SOIR, AUBE, CRÉPUSCULE, PLUS TARD, CONTINU…, liste lue dans un fichier JSON de vocabulaire, comme à l'étape 2) ;
  4. `Entrée` passe à l'action.
- **Personnage** : les personnages déjà présents dans le scénario ; après `(` : les extensions V.O., O.S., O.C., SOUS-TITRE.
- Les fiches personnages et lieux du module Recherches s'ajouteront à ces listes à l'étape 10 : prévoir une source de propositions extensible.

## 6. Navigateur de scènes

Panneau à gauche de l'éditeur (dans la zone du module, à côté de la barre de modules), comme dans KIT :

- en haut : « Scènes : 9 » ;
- **actes** (sections) repliables, avec leur bandeau de couleur et leur durée ;
- pour chaque **scène** : numéro, en-tête, durée estimée, début du texte de la scène sur une ligne ;
- l'icône d'une scène ou d'un acte devient **rouge** quand il contient une note (texte non imprimable) ;
- clic : l'éditeur défile jusqu'à la scène et y place le curseur ; la scène où se trouve le curseur est mise en évidence ;
- en bas : **Description** de la scène sélectionnée = son synopsis Fountain (lignes `=` sous l'en-tête), modifiable directement ici (le texte du scénario est mis à jour) ;
- le panneau est repliable.

Réorganiser les scènes par glisser-déposer n'est pas demandé ici (ce sera possible par les cartes à l'étape 8).

## 7. Enregistrement et annulation

- Enregistrement automatique de `neoscenar/scenario.fountain`, comme pour le découpage : écriture sûre, regroupée, terminée avant fermeture, bandeau en cas d'échec, aucune perte. Indicateur d'enregistrement dans la barre d'outils.
- Annuler / rétablir (`Cmd + Z` / `Cmd + Maj + Z`) : historique propre à l'éditeur (indépendant de celui des cartes), pendant la session.
- Si `scenario.fountain` a été modifié hors de NeoScenar depuis son ouverture (par exemple dans Obsidian), NeoScenar ne l'écrase pas sans prévenir : message proposant de recharger le fichier ou de garder la version de NeoScenar.

## 8. Confort

- Recherche et remplacement (`Cmd + F`), panneau en français.
- **Correcteur orthographique** en français (correcteur intégré à Electron ; suggestions au clic droit ; sur Mac il suit les langues du système, à vérifier). Les préfixes `INT.`, `EXT.` ne doivent pas être soulignés si c'est possible simplement.
- Zoom mémorisé.
- **Thème** : clair ou sombre selon le réglage du Mac, avec un choix « Automatique / Clair / Sombre » dans les préférences de l'application, appliqué à toute l'application (cartes comprises). Dans l'éditeur, la « page » reste lisible dans les deux thèmes (en sombre : fond gris foncé, texte clair, comme dans KIT).
- Mode concentration (`F5`, comme dans KIT) : seul l'éditeur reste visible, en plein écran.

## 9. Page de titre

La page de titre Fountain (Title, Credit, Author, Contact, Draft date…) n'apparaît pas dans l'éditeur. Bouton et menu **Page de titre…** : petite fenêtre avec les champs Titre, Auteur(s), Contact, Date, Notes. Les autres clés éventuelles du fichier sont conservées telles quelles. Le titre reste synchronisé avec `projet.json`.

## Hors périmètre

- Lien scénario ↔ cartes et numéros S_0010 (étape 8).
- Export PDF et impression (étape 9) — mais la pagination et le profil de mise en page sont déjà partagés.
- Fiches personnages et lieux, création automatique de fiches (étape 10).
- Mention (SUITE) automatique, dialogues simultanés en deux colonnes, mode révision, statistiques (étape 13) : un dialogue simultané (`^`) s'affiche pour l'instant comme un dialogue normal.
- Glisser-déposer de scènes dans le navigateur, couleurs d'actes choisies par l'élève.

## Tests automatiques attendus

- Table de transitions `Entrée` / `Tab` pour chaque élément, y compris les lignes vides insérées et le résultat relu par `packages/fountain`.
- Changement de type d'élément : pour chaque type, le texte produit est relu avec ce type ; forçage ajouté seulement si nécessaire ; majuscules.
- Pagination : coupure des mots selon la largeur, nombre de lignes par élément, règles de coupure (en-tête, personnage + dialogue, bloc de dialogue), numéros de page ; stabilité sur le scénario d'exemple de l'étape 6.
- Durées estimées par scène, par acte, totale.
- Assistant d'en-tête : propositions à chaque étape (préfixe, lieux, moments) ; extraction des lieux et personnages ; extensions.
- Bandeaux « FIN DE … » : positions calculées selon les niveaux de section.
- Fidélité : après une suite de frappes simulées, le fichier enregistré est relu par `packages/fountain` sans perte et sans élément mal classé.

## Critères de validation (à vérifier par David)

- [ ] Le module Scénario s'ouvre depuis la barre de modules ; la page a l'aspect d'un scénario Final Draft A4 en Courier.
- [ ] Écrire une scène entière au clavier seulement : `Cmd + Entrée`, `i`, choisir INT., taper un lieu, ` - `, choisir JOUR, `Entrée`, action, `Tab`, personnage, `Entrée`, dialogue, `Tab` pour une didascalie… Tout se met en forme sans souris.
- [ ] Les raccourcis KIT (`Cmd + J`, `Cmd + U`, `Cmd + H`, `Cmd + L`, `Cmd + G`) fonctionnent ; `Cmd + H` ne masque pas l'application.
- [ ] Choisir « Transition » sur « fondu au noir » l'aligne à droite en majuscules.
- [ ] Une deuxième scène dans un lieu déjà utilisé : le lieu est proposé ; un personnage déjà présent : son nom est proposé.
- [ ] Une note `[[ … ]]` s'affiche en vert et la scène devient rouge dans le navigateur.
- [ ] Des actes (`# ACTE 1 - INTRO`) s'affichent en bandeaux, avec « FIN DE ACTE 1 » ; ils sont repliables dans le navigateur avec leur durée.
- [ ] La description d'une scène se modifie en bas du navigateur.
- [ ] Les limites de pages et numéros de page apparaissent ; un nom de personnage n'est jamais seul en bas de page.
- [ ] Ouvrir le `scenario.fountain` d'un projet dans TextEdit : c'est du Fountain propre ; `npm run fountain:demo` le relit sans perte.
- [ ] Importer (copier dans `neoscenar/scenario.fountain`) un vrai scénario exporté de KIT : il s'affiche correctement.
- [ ] Modifier `scenario.fountain` dans un autre éditeur pendant que le projet est ouvert : NeoScenar prévient au lieu d'écraser.
- [ ] Thème clair / sombre selon le Mac, et choix forcé dans les préférences.
- [ ] Correcteur orthographique en français, suggestions au clic droit.
- [ ] Frappe fluide sur un scénario de 120 pages.
- [ ] `npm test` et `npm run lint` passent.

À la fin, résume ce qui a été fait, signale tout écart et toute décision prise seul (en particulier sur les raccourcis et la table de transitions).
