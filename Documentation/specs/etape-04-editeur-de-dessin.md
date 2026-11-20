# Étape 4 — Éditeur de dessin intégré

## Objectif

Permettre de dessiner rapidement la vignette d'un plan directement dans NeoScenar : un éditeur **volontairement simple** (pinceau net, gomme, pot de peinture, nuancier), en pixels, aux proportions du format du projet. Les images élaborées continuent de se faire sur papier ou dans Krita/Photoshop, puis s'importent (étape 3).

Références : `CLAUDE.md`, section 8 de `Documentation/cahier-des-charges.md` (bloc « Éditeur de dessin intégré » ; si la copie locale n'est pas à jour, cette spécification fait foi), et l'étape 3 (stockage des vignettes, annulation, aperçus).

Présente ton plan à David et propose un découpage en sous-étapes (par exemple : A. logique de dessin pure et tests ; B. fenêtre, toile et pinceau ; C. gomme, pot, nuancier, tailles ; D. annulation, enregistrement, navigation entre plans, finitions).

## 1. Ouvrir l'éditeur

- Fiche plan : bouton **Dessiner** (actif à partir de cette étape).
  - Plan sans vignette : toile blanche vierge.
  - Plan avec vignette (dessinée ou importée) : la vignette sert de point de départ ; on dessine par-dessus.
- Menu contextuel d'une carte plan : **Dessiner…**
- L'éditeur s'ouvre **par-dessus toute la fenêtre de NeoScenar** (pas une fenêtre séparée) ; le reste de l'application est inaccessible tant qu'il est ouvert.

## 2. Mise en page de l'éditeur

```
┌──────────────────────────────────────────────────────────────────┐
│ ◀ S_0010_P_0020 ▶   ↶ ↷   Tout effacer   Plan précédent   Grille │  Annuler  Terminer
├────┬─────────────────────────────────────────────────────────────┤
│ 🖌 │                                                             │
│ ⌫  │                    toile aux proportions                    │
│ 🪣 │                       du projet                             │
│────│                                                             │
│ •  │                                                             │
│ ●  │                                                             │
│ ⬤  │                                                             │
├────┴─────────────────────────────────────────────────────────────┤
│ ■■■■■■■■■■■■  (nuancier : 12 teintes × 3 nuances + noir + blanc) │
└──────────────────────────────────────────────────────────────────┘
```

- **Barre du haut** : identifiant du plan avec flèches ◀ ▶ pour passer au plan précédent / suivant dans l'ordre du film ; Annuler et Rétablir ; Tout effacer ; Partir de l'image du plan précédent ; Grille des tiers ; à droite **Annuler** (quitter sans enregistrer) et **Terminer** (enregistrer et quitter).
- **Barre d'outils à gauche** : Pinceau, Gomme, Pot de peinture ; en dessous, les tailles prédéfinies et un curseur d'épaisseur pour l'outil actif.
- **Toile** au centre, ajustée à la fenêtre par défaut.
- **Nuancier** en bas : la couleur active est clairement marquée.

## 3. La toile

- Proportions du format du projet ; **définition de travail : 1920 pixels sur le côté le plus long** (comme les vignettes de l'étape 3).
- Fond blanc opaque. Un seul calque.
- **Zoom** : `Cmd + +` / `Cmd + -`, `Cmd + 0` pour ajuster à la fenêtre ; avec le zoom, déplacement de la vue en maintenant la barre d'espace et en glissant.
- **Grille des tiers** (bouton bascule) : deux lignes verticales et deux horizontales en surimpression, pour travailler la composition. Elle n'est jamais enregistrée dans l'image.
- Le curseur de la souris montre un cercle de la taille de l'outil.

## 4. Les outils

### Pinceau

- **Trait net** : bord dur, **sans anticrénelage ni flou** (pixels entièrement colorés ou pas du tout). C'est ce qui garantit des remplissages propres au pot de peinture. Les traits sont donc dessinés par l'application elle-même dans les pixels (tampon circulaire répété le long du trajet), pas avec les traits lissés du canvas.
- **Trait continu** : même avec un mouvement rapide de la souris ou du stylet, le trait ne doit présenter aucun trou (interpolation entre les points reçus, utilisation des événements groupés du pointeur).
- **Ligne droite** : `Maj + clic` trace un trait droit depuis le dernier point dessiné.
- **Tailles** : boutons prédéfinis 2, 5, 10, 20 et 40 pixels, et curseur de 1 à 100 pixels (à la définition de travail). Touches `[` et `]` pour diminuer / augmenter. Chaque outil mémorise sa propre taille.

### Gomme

- Mêmes caractéristiques que le pinceau (nette, tailles, ligne droite), mais elle **peint en blanc**, la couleur du papier.

### Pot de peinture

- Remplit la zone **contiguë** de couleur proche du pixel cliqué avec la couleur active.
- Sur une toile vide (toute blanche), il remplit donc tout le fond.
- **Tolérance** : les pixels dont la couleur est proche de celle du pixel cliqué sont remplis aussi (tolérance fixe, à régler pour que le remplissage ne laisse pas de liseré autour des traits d'une image importée ou scannée). Pas de réglage de tolérance visible pour l'élève.
- Doit rester instantané sur toute la toile.

### Nuancier

- Les **36 couleurs de la palette des cartes** (12 teintes × pastel, vive, foncée), dans le même ordre, **plus le noir et le blanc**. Les couleurs viennent du même fichier que la palette des cartes : une seule source pour toute l'application.
- Un clic choisit la couleur. Pas de sélecteur RVB.
- Couleur par défaut à l'ouverture : noir.

### Raccourcis

`B` pinceau, `E` gomme, `G` pot de peinture, `[` et `]` taille, `Cmd + Z` annuler, `Cmd + Maj + Z` rétablir, `Cmd + Entrée` terminer, `Échap` quitter (avec confirmation s'il y a des modifications), `Alt + ←` / `Alt + →` plan précédent / suivant.

## 5. Annuler dans l'éditeur

- Historique propre à l'éditeur : au moins 50 étapes (un trait, un remplissage, « tout effacer », « partir du plan précédent » = une étape chacun).
- Attention à la mémoire : une image 1920 × 1080 pèse environ 8 Mo ; ne stocker que les zones modifiées ou compresser l'historique si nécessaire.
- Quand on termine, toute la séance de dessin compte pour **une seule** étape dans l'annulation générale du découpage (`Cmd + Z` dans le module Cartes rend la vignette précédente).

## 6. Fonctions pratiques

- **Tout effacer** : remet la toile en blanc (annulable).
- **Partir de l'image du plan précédent** : copie dans la toile la vignette du plan précédent dans l'ordre du film (même s'il est dans la scène précédente). Si la toile n'est pas vide, demander confirmation. Bouton grisé si le plan précédent n'a pas de vignette.
- **Plan précédent / suivant** (◀ ▶) : enregistre le dessin en cours (s'il a été modifié), puis ouvre le plan voisin dans l'éditeur. Permet de dessiner tout un storyboard à la suite sans fermer l'éditeur.

## 7. Enregistrement

- **Terminer** (ou passage au plan voisin) : si le dessin a été modifié, il est enregistré comme une **nouvelle vignette** selon les règles de l'étape 3 : nouveau fichier PNG `storyboard/vignettes/<idPlan>_<horodatage>.png`, l'ancien fichier n'est jamais écrasé.
- Après un dessin, l'image d'origine de la vignette devient le dessin lui-même : une copie est placée dans `storyboard/originaux/<idPlan>_<horodatage>.png`, `thumbnailSource` pointe vers elle et `thumbnailCrop` revient à `null`. Ainsi, **Recadrer…** reste possible (par exemple après un changement de format) sans perdre ce qui a été dessiné. L'ancienne image d'origine (scan importé) n'est plus référencée et sera rangée dans `sauvegardes/vignettes_retirees/` à la fermeture, comme prévu à l'étape 3 ; elle redevient active si l'on annule.
- **Annuler** / `Échap` avec des modifications non enregistrées : « Abandonner les modifications de ce dessin ? ».
- Les aperçus réduits des cartes se mettent à jour.
- Les règles de robustesse habituelles s'appliquent (écriture sûre, message clair en cas d'échec, aucune perte du dessin affiché si l'écriture échoue).

## 8. Tablette graphique

Le stylet d'une tablette fonctionne comme la souris (événements du pointeur). La pression n'est pas prise en compte à cette étape, mais l'architecture ne doit pas l'empêcher plus tard.

## 9. Architecture attendue

- Toute la logique de dessin qui ne dépend pas de l'écran est écrite sous forme de **fonctions pures** testées dans Vitest, sur un simple tableau de pixels (largeur, hauteur, données RGBA) : tampon circulaire, tracé d'un segment sans trou, remplissage avec tolérance, effacement, copie d'une image.
- Le composant React de l'éditeur ne fait qu'afficher la toile, transmettre les événements du pointeur et appeler ces fonctions.
- Fluide (aucun retard visible du trait) sur une toile 1920 × 1080 avec un pinceau de 100 pixels, sur l'iMac Intel de David.

## Hors périmètre

Calques, sélection, texte, formes géométriques (rectangles, flèches), pipette, flou et dégradés, pression du stylet, couleurs hors nuancier, plusieurs dessins par plan, import automatique des planches (étape 12).

## Tests automatiques attendus

- Tampon circulaire : nombre et position des pixels pour plusieurs tailles, bords nets (aucun pixel intermédiaire), découpage aux bords de la toile.
- Segment : aucun trou entre deux points éloignés, dans toutes les directions.
- Remplissage : toile vide entièrement remplie ; zone fermée remplie sans déborder ; zone ouverte qui déborde comme attendu ; tolérance sur un trait légèrement lissé (image importée) ; cliquer sur la couleur active ne fait rien ; grande toile en temps raisonnable.
- Gomme : peint en blanc.
- Historique : annuler / rétablir une suite de traits, limite de 50 étapes.
- Nuancier : 38 couleurs, issues de la même source que la palette des cartes.
- Enregistrement : nouveaux chemins, `thumbnailSource` = copie du dessin, `thumbnailCrop` = `null`, ancien fichier conservé.

## Critères de validation (à vérifier par David)

- [ ] Sur un plan sans vignette, Dessiner ouvre une toile blanche aux proportions du projet (essayer aussi dans un projet vertical).
- [ ] Dessiner vite avec la souris : le trait est continu, net, sans flou.
- [ ] `Maj + clic` trace une ligne droite.
- [ ] Changer de taille avec les boutons, le curseur, `[` et `]` ; le cercle du curseur suit la taille.
- [ ] Pot de peinture sur la toile vide : tout le fond se remplit ; dans une forme fermée : seule la forme se remplit, sans liseré blanc.
- [ ] Gomme : efface en blanc.
- [ ] Choisir des couleurs dans le nuancier ; noir et blanc sont présents.
- [ ] `Cmd + Z` / `Cmd + Maj + Z` dans l'éditeur.
- [ ] Grille des tiers visible pendant le dessin, absente de la vignette enregistrée.
- [ ] Terminer : la vignette apparaît dans la fiche et sur la carte ; `Cmd + Z` dans le module Cartes rend l'ancienne.
- [ ] Dessiner par-dessus une vignette importée (ajouter une flèche de mouvement), terminer, puis Recadrer… : le dessin est conservé.
- [ ] « Partir de l'image du plan précédent » puis modifier : le plan précédent n'est pas changé.
- [ ] Enchaîner 5 plans avec ▶ sans fermer l'éditeur : chacun garde son dessin.
- [ ] Annuler avec des modifications : demande de confirmation.
- [ ] Avec une tablette graphique (si disponible) : le stylet dessine.
- [ ] `npm test` et `npm run lint` passent.

À la fin, résume ce qui a été fait, signale tout écart et toute décision prise seul.
