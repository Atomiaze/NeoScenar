# Étape 11 — Planches et PDF du storyboard

Décidé le 19 novembre 2026. Référence visuelle : `Documentation/exemple StoryBoard.jpg` (planche Saint Luc, A4 portrait). Cahier des charges : section 8.

## Principe

Un seul générateur produit deux PDF à la mise en page identique :
- **Planches à dessiner** : sans vignettes, pour dessiner à la main puis scanner ;
- **Storyboard** : avec les vignettes existantes. Un plan sans vignette garde sa case vide.

Réutiliser pdf-lib (comme `packages/pdf-scenario`) et la police Inter (`resources/polices/inter/`). Logique de mise en page **pure et testée**, séparée du dessin.

## Planche

- **En-tête de page** (cadre) : « Titre : » + titre du projet ; « N° de page : 3 / 12 ».
- **Bloc plan**, dans l'ordre de la planche :
  - ligne du haut : « Scène : S_0030 », « Plan : P_0010 » (+ nom du plan s'il existe), « Verso : ☐ » (case toujours vide) ;
  - à gauche, **case dessin aux proportions du format du projet**, la plus grande possible dans la zone de la planche (2,39:1 plus basse, 9:16 étroite et haute, centrée dans la zone) ;
  - *décidé le 19 nov. après 11A* : format plus haut que large (largeur < hauteur, 9:16…) → zone dessin de **hauteur double** et **2 plans au plus par page** ; le format carré (1:1) et les formats larges gardent la zone normale (3 plans au plus) ;
  - à droite : Durée (« 4 s »), Mvt de cam, Musique, **Échelle de plan** (libellé unique, la planche papier dit parfois « Type de plan »), Sons, bruitages, dialogues (3 lignes minimum), Angle PV (2 lignes minimum) ;
  - en dessous : Description du plan (4 lignes minimum).
- L'en-tête de scène (INT. CUISINE - JOUR) en petit gris au-dessus du premier plan de chaque scène.
- Lignes fines grises sous chaque champ, comme sur le papier. Un champ vide garde ses lignes pour écrire à la main.

## Texte long (règle de David)

- **Jamais de réduction de police, jamais de coupure.**
- Le texte passe à la ligne ; un champ prend autant de lignes que nécessaire (au moins le minimum ci-dessus).
- La hauteur d'un bloc = max(case dessin, colonne de droite) + description. Les blocs sont placés à la suite : une page peut contenir 3, 2 ou 1 plan.
- Un bloc n'est jamais coupé entre deux pages. Seul cas : un plan plus haut qu'une page entière → la description continue sur la page suivante, sous « S_0030 · P_0010 (suite) ». *Décidé le 19 nov. après 11A* : si les champs de droite (sons…) dépassent eux aussi, leurs lignes continuent de la même façon sous « (suite) ».

## Options de la fenêtre d'export

- Type : Planches à dessiner / Storyboard avec vignettes.
- Plans : tout le film / scènes choisies (cases à cocher). Les scènes et plans orphelins sont exclus.
- « Commencer chaque scène sur une nouvelle page » : décochée par défaut.
- Options mémorisées dans `projet.json` (`exportStoryboard`), comme `exportPdf`.
- Aperçu du vrai PDF, comme en 9B. Entrée « Exporter le storyboard en PDF… » dans le menu Fichier et dans la barre d'outils des Cartes.
- Fichiers dans `neoscenar/exports/` : `<Titre>_planches_AAAA-MM-JJ.pdf` et `<Titre>_storyboard_AAAA-MM-JJ.pdf` (mêmes règles de nom qu'en 9B ; un fichier du même nom est remplacé).

## Repères pour l'import des scans (préparés pour l'étape 12)

- 4 marques d'angle pleines (carrés noirs) sur chaque page, hors des zones de texte.
- Un petit QR code par page (bibliothèque `qrcode`, licence MIT) contenant : identifiant du projet, identifiant d'impression, numéro de page.
- À chaque export (planches **et** storyboard), écrire `neoscenar/storyboard/impressions/<idImpression>.json` : date, format du projet, et pour chaque page la liste des plans (identifiant interne) avec le rectangle de leur case dessin en millimètres, mesuré depuis les marques d'angle. C'est indispensable puisque la mise en page varie avec le texte.
- On garde tous ces fichiers (petits). Rien n'est lu à l'étape 11.

## Sous-étapes

- **11A — Moteur** : mise en page pure (blocs à hauteur variable, pages, case aux proportions du projet) + dessin pdf-lib + marques, QR et fichier d'impression. Script `npm run pdf:storyboard:exemple` sur un projet de test (formats 16:9, 2,39:1, 9:16 ; un plan à très longue description ; plans avec et sans vignette).
- **11B — Fenêtre d'export** : options, aperçu, menus, enregistrement, mémorisation.

## Critères de validation

- Planche vierge comparée à `exemple StoryBoard.jpg` : mêmes champs, même ordre, aspect proche.
- Aucun texte réduit ni coupé ; une longue description donne une page à 1 ou 2 plans.
- La case dessin respecte les proportions du projet dans les trois formats d'essai.
- Les vignettes remplissent exactement la case.
- Le QR code se lit avec un téléphone ; le JSON d'impression correspond aux cases dessinées (vérifié en comparant les rectangles et le PDF).
- Le PDF s'imprime à 100 % sur A4 sans rien perdre dans les marges.
