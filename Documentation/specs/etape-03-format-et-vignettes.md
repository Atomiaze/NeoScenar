# Étape 3 — Format du projet et vignettes

## Objectif

1. Permettre de choisir le **format d'image** du film (Full HD horizontal, vertical, carré…) à la création du projet, et de le modifier ensuite.
2. Donner à chaque plan une **vignette** de storyboard, importée depuis une image (PNG ou JPEG : dessin Photoshop/Krita, photo ou scan d'un dessin papier), **recadrée aux proportions du projet**.
3. Afficher les vignettes dans la fiche plan et, sur demande, sur les cartes.

L'éditeur de dessin intégré viendra à l'étape 4 : cette étape-ci prépare tout ce dont il aura besoin (fichiers, affichage, annulation).

Références : `CLAUDE.md`, sections 3.1, 5 et 8 de `Documentation/cahier-des-charges.md` (si la copie locale n'est pas à jour, cette spécification fait foi), formats de l'étape 1 (`src/shared/projectTypes.ts` : `settings.resolution`, `settings.fps`, `Shot.thumbnail` existent déjà).

Présente ton plan à David avant de commencer et propose un découpage en sous-étapes (par exemple : A. format du projet ; B. import, recadrage et stockage ; C. affichage fiche et cartes ; D. import multiple, duplication, nettoyage).

## 1. Format du projet

### 1.1 À la création

Dans la fenêtre de création de projet, nouvelle section **Format de l'image**, après le type de projet :

- Liste des préréglages :

| Préréglage | Définition | Proportions |
|---|---|---|
| Paysage Full HD (par défaut) | 1920 × 1080 | 16:9 |
| Vertical Full HD | 1080 × 1920 | 9:16 |
| Carré | 1080 × 1080 | 1:1 |
| Paysage 4K UHD | 3840 × 2160 | 16:9 |
| Cinémascope | 1920 × 804 | 2,39:1 |
| Personnalisé… | largeur et hauteur saisies | — |

- **Personnalisé** : deux champs largeur / hauteur en pixels, nombres pairs entre 16 et 8192 (les formats vidéo exigent des dimensions paires). Les proportions calculées s'affichent en direct (« 1,85:1 »).
- **Cadence** : 24, 25 (par défaut), 30, 50 ou 60 images par seconde.
- Un petit rectangle d'aperçu montre la forme de l'image choisie.
- Les préréglages sont lus dans un fichier JSON livré avec l'application (comme le vocabulaire), pas écrits en dur.

Enregistrement dans `projet.json`, dans les champs existants `settings.resolution` et `settings.fps`. Le nom du préréglage n'est pas stocké : il est retrouvé à l'affichage en comparant la définition aux préréglages (sinon « Personnalisé »).

### 1.2 Après la création

- Nouvelle entrée **Réglages du projet…** dans le menu ☰ (et menu Fichier) : mêmes réglages de format et de cadence.
- Si des vignettes existent et que les nouvelles proportions diffèrent : avertissement avant de valider (« 12 vignettes n'auront plus les bonnes proportions. Elles seront signalées « à recadrer ». Continuer ? »). Les vignettes ne sont **jamais** modifiées automatiquement.
- Changer la cadence ne change pas les durées des plans (elles sont en secondes).
- Le format est rappelé discrètement dans la barre d'outils du module Cartes (« 16:9 · 1920 × 1080 · 25 i/s »).

## 2. Stockage des vignettes

- **Vignette** : `neoscenar/storyboard/vignettes/<idPlan>_<horodatage>.png`, toujours en PNG, aux proportions du projet, à la **définition de travail** : 1920 pixels sur le côté le plus long (l'autre côté selon les proportions). Le chemin relatif est enregistré dans `Shot.thumbnail` (champ existant).
- **Image d'origine** : copiée telle quelle (format et définition d'origine) dans `neoscenar/storyboard/originaux/<idPlan>_<horodatage>.<extension>`, pour pouvoir recadrer à nouveau plus tard. Le chemin relatif est enregistré dans un nouveau champ `Shot.thumbnailSource: string | null` (ajout compatible : absent → `null`). Dossier créé s'il n'existe pas.
- **Pourquoi un horodatage dans le nom** : chaque import ou recadrage crée un **nouveau** fichier au lieu d'écraser l'ancien. Ainsi, annuler (`Cmd + Z`) consiste simplement à revenir à l'ancien chemin dans `decoupage.json`, et l'ancien fichier existe toujours.
- **Nettoyage** : à la fermeture du projet (quand l'historique d'annulation disparaît), les fichiers de `vignettes/` et `originaux/` qui ne sont plus référencés par aucun plan sont **déplacés** (jamais supprimés) dans `neoscenar/sauvegardes/vignettes_retirees/`. Rien n'est jamais détruit.
- Tout le traitement d'image (lecture, rotation, recadrage, redimensionnement, encodage PNG) se fait **sans bibliothèque supplémentaire** si possible (outils intégrés à Electron/Chromium : `nativeImage`, canvas, `createImageBitmap`). Si une bibliothèque s'avère nécessaire, demande d'abord à David.
- **Photos de téléphone** : respecter l'orientation EXIF (une photo prise en portrait ne doit pas arriver couchée).
- Formats acceptés : PNG et JPEG. Autre format, fichier illisible ou image démesurée (plus de 50 Mo ou plus de 16 000 pixels de côté) : message clair, rien n'est modifié.

## 3. Importer une vignette

### 3.1 Points d'entrée

- **Fiche plan** : une zone vignette en haut de la fiche, aux proportions du projet.
  - Vide : bouton **Importer une image…** et texte « ou glissez une image ici ». Bouton **Dessiner** grisé (« Bientôt disponible », étape 4).
  - Remplie : la vignette, et les boutons **Remplacer…**, **Recadrer…**, **Retirer la vignette**.
- **Glisser un fichier image** depuis le Finder sur la zone vignette de la fiche, ou directement **sur une carte plan** : importe l'image dans ce plan.
- **Coller** (`Cmd + V`) une image du presse-papiers quand un plan est sélectionné et qu'aucun champ texte n'a le focus.
- Menu contextuel d'une carte plan : **Importer une image…**

### 3.2 Recadrage

- Si les proportions de l'image correspondent à celles du projet (tolérance de 1 %), elle est importée directement (redimensionnée à la définition de travail), sans fenêtre.
- Sinon, la **fenêtre de recadrage** s'ouvre :
  - l'image entière, avec par-dessus un cadre aux proportions du projet ; l'extérieur du cadre est assombri ;
  - au départ, le plus grand cadre possible, centré ;
  - on **déplace** le cadre en le glissant, on le **redimensionne** par ses coins (proportions toujours conservées), sans pouvoir sortir de l'image ;
  - boutons **Pivoter à gauche / à droite** (90°), utiles pour un scan ou une photo de travers ;
  - bouton **Ajuster sans recadrer** : toute l'image est conservée, centrée, avec des bandes blanches (blanc par défaut ; noir en option) ;
  - **Annuler** / **Valider**.
- **Recadrer…** (sur une vignette existante) rouvre cette fenêtre à partir de l'image d'origine, avec le dernier cadre utilisé. Le cadre (position, taille, rotation, mode « ajuster ») est enregistré dans un nouveau champ `Shot.thumbnailCrop` (ajout compatible, `null` par défaut), en coordonnées relatives à l'image d'origine.
- Une vignette sans image d'origine (cas futur des dessins de l'étape 4) n'a pas de bouton Recadrer.

### 3.3 Import de plusieurs images

- Menu contextuel quand **plusieurs plans** sont sélectionnés : **Importer des images…** → choix de plusieurs fichiers.
- Les images sont triées par nom de fichier (tri « naturel » : `plan2` avant `plan10`) et attribuées aux plans sélectionnés dans l'ordre du film.
- Moins d'images que de plans : les derniers plans restent sans vignette. Plus d'images que de plans : message, les images en trop sont ignorées.
- Pas de fenêtre de recadrage pour chaque image : les images aux mauvaises proportions sont recadrées automatiquement au centre et signalées « à vérifier » ; l'étudiant peut ensuite utiliser Recadrer… sur chacune.
- Avant de remplacer des vignettes existantes, demander confirmation (« 3 plans ont déjà une vignette. Les remplacer ? »).

### 3.4 Annulation

Importer, remplacer, recadrer, retirer une vignette ou importer plusieurs images : chacune de ces actions est **une** étape d'annulation, comme les autres modifications du découpage.

## 4. Afficher les vignettes

### 4.1 Fiche plan

La vignette en haut de la fiche, aux proportions du projet, sur toute la largeur du panneau. Clic sur la vignette : affichage en grand dans une fenêtre (Échap pour fermer).

### 4.2 Cartes : mode « avec vignettes »

- Bouton bascule dans la barre d'outils : **Afficher les vignettes**. Choix mémorisé dans les préférences de l'application.
- Dans ce mode, chaque carte plan montre sa vignette au-dessus du numéro, du nom et de l'en-tête, aux proportions du projet (une carte d'un projet vertical est donc plus haute). Un plan sans vignette montre un cadre vide de mêmes proportions, avec une icône discrète.
- Les cartes scène ne changent pas.
- Le zoom existant agrandit les vignettes.
- **Performance** : les cartes affichent des **aperçus réduits** (environ 400 pixels sur le côté le plus long), générés à la demande et mis en cache **hors du projet** (dossier de cache de l'application), pour ne pas encombrer le dossier de l'étudiant. Le défilement doit rester fluide avec 300 plans illustrés.

### 4.3 Vignettes « à recadrer »

Une vignette dont les proportions ne correspondent plus à celles du projet (après un changement de format, ou un import multiple recadré automatiquement) porte un petit badge orange sur la carte et dans la fiche (« À recadrer » ou « À vérifier »), avec une infobulle explicative. Le badge disparaît après un Recadrer… validé.

## 5. Duplication

Dupliquer un plan (étape 2b) copie aussi sa vignette et son image d'origine dans de **nouveaux fichiers**, nommés d'après l'identifiant de la copie, et copie le cadre de recadrage : les deux vignettes sont ensuite totalement indépendantes.

## 6. Format des données

Ajouts compatibles à `Shot` (absents → `null`, `formatVersion` reste à 1) :

- `thumbnailSource: string | null` — image d'origine, chemin relatif au dossier `neoscenar/` ;
- `thumbnailCrop` — cadre de recadrage (position et taille relatives à l'image d'origine, rotation en multiples de 90°, mode « recadrer » ou « ajuster » et couleur des bandes), ou `null`.

Propose les types exacts à David avant de les figer. Toujours des chemins relatifs.

## Hors périmètre

- Éditeur de dessin (étape 4) : le bouton Dessiner est visible mais grisé.
- Import automatique des planches scannées (étape 12), impression et PDF du storyboard (étape 11).
- Export Blender (étape 5).
- Plusieurs vignettes par plan.

## Tests automatiques attendus

- Préréglages : retrouver le préréglage à partir d'une définition ; « Personnalisé » sinon ; validation des dimensions personnalisées (paires, 16 à 8192).
- Calcul des proportions et comparaison avec tolérance de 1 %.
- Définition de travail : 1920 sur le côté le plus long pour chaque préréglage et pour des formats personnalisés extrêmes.
- Cadre de départ : le plus grand cadre centré, pour une image plus large et pour une image plus haute que le format.
- Contraintes du cadre : il ne sort jamais de l'image, garde ses proportions.
- Mode « ajuster » : position et taille de l'image et des bandes.
- Rotation : dimensions et cadre après 90°, 180°, 270°.
- Tri naturel des noms de fichiers ; attribution des images aux plans sélectionnés.
- Noms de fichiers générés : uniques, sans accent ni espace, préfixés par l'identifiant du plan.
- Détection des fichiers non référencés et déplacement vers `sauvegardes/vignettes_retirees/` (jamais de suppression).
- Duplication : nouveaux fichiers, contenus identiques, chemins différents.
- Lecture d'un `decoupage.json` sans les nouveaux champs.

## Critères de validation (à vérifier par David)

- [ ] Créer un projet en « Vertical Full HD » : `projet.json` contient 1080 × 1920 ; la barre d'outils affiche le format.
- [ ] Créer un projet personnalisé 2048 × 858 : proportions affichées en direct ; une dimension impaire est refusée.
- [ ] Importer une image 16:9 dans un projet 16:9 : pas de fenêtre de recadrage, la vignette apparaît dans la fiche.
- [ ] Importer une photo de téléphone en portrait dans un projet 16:9 : la fenêtre de recadrage s'ouvre, l'image n'est pas couchée ; déplacer et agrandir le cadre, valider.
- [ ] Recadrer… : la fenêtre se rouvre sur l'image d'origine avec le dernier cadre.
- [ ] Ajuster sans recadrer : toute l'image est visible avec des bandes blanches.
- [ ] Pivoter un scan posé de travers.
- [ ] Glisser une image du Finder directement sur une carte plan.
- [ ] Copier une image (par exemple depuis Aperçu) puis `Cmd + V` sur un plan sélectionné.
- [ ] Sélectionner 5 plans, importer 5 images numérotées `plan1` à `plan5` : chacune arrive sur le bon plan, dans l'ordre.
- [ ] Activer « Afficher les vignettes » : les cartes montrent les images ; le défilement reste fluide avec 300 plans illustrés.
- [ ] Passer le projet de 16:9 à 1:1 dans Réglages du projet : avertissement, puis badges « À recadrer » sur les vignettes.
- [ ] Remplacer une vignette puis `Cmd + Z` : l'ancienne revient.
- [ ] Dupliquer un plan illustré, recadrer la copie : l'original ne change pas.
- [ ] Retirer une vignette, fermer le projet : le fichier se retrouve dans `neoscenar/sauvegardes/vignettes_retirees/`, rien n'est supprimé.
- [ ] Copier le projet sur une clé USB, l'ouvrir depuis la clé : les vignettes s'affichent.
- [ ] `npm test` et `npm run lint` passent.

À la fin, résume ce qui a été fait, montre un extrait de `decoupage.json` avec un plan illustré, signale tout écart et toute décision prise seul.
