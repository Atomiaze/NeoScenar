# Mise en page « Scénario Final Draft (A4) » — mesures de référence

Mesures relevées le 18 novembre 2026 sur un PDF de référence (scénario de David, gardé en local), exporté de KIT Scenarist avec le modèle « Scénario Final Draft (A4) » demandé au cours. Ce sont les valeurs du profil `resources/mise-en-page/final-draft-a4.json`, utilisé par l'éditeur (étape 7) et par l'export PDF (étape 9). Unités : points PDF (1 pt = 1/72 pouce), et caractères (`ch`) à partir de la marge gauche du texte.

## Page et police

- Page A4 : 595 × 842 pt.
- Police **Courier Prime** 12 pt : 1 caractère = 7,2 pt (10 caractères par pouce) ; interligne 12 pt (6 lignes par pouce ; le PDF de KIT donne 12,1 pt, arrondi de son moteur).
- **58 lignes de texte par page.**
- Marge gauche du texte : **108 pt** (1,5 pouce, 38,1 mm).
- Largeur du texte : **61 caractères** (bord droit du texte à 547 pt ; marge droite ≈ 48 pt, 17 mm).
- Première ligne de texte à environ 72 pt du haut (1 pouce) ; dernière ligne à environ 72 pt du bas.

## Éléments

| Élément | Retrait depuis la marge gauche | Largeur | Remarques |
|---|---|---|---|
| En-tête de scène | 0 (108 pt) | 61 ch | majuscules |
| Action | 0 (108 pt) | 61 ch | |
| Personnage | **20 ch** (252,4 pt ; 51 mm depuis la marge) | jusqu'au bord droit | majuscules |
| Didascalie | **14,2 ch** (210 pt ; 36 mm) | environ **25 ch** (à confirmer : « (levant les yeux au ciel) », 25 caractères, tient sur une ligne ; « (regardant Mélanie dans les » passe à la ligne) | |
| Dialogue | **10,2 ch** (181,6 pt ; 26 mm) | **35 ch** | |
| Transition | alignée à droite sur le bord droit du texte (547 pt) | | majuscules |
| Texte centré | centré sur la largeur du texte | | |

Les retraits de KIT sont visiblement définis en millimètres (26, 36 et 51 mm) : utiliser ces valeurs exactes dans le profil, et des `ch` fractionnaires à l'écran.

## Espacements

- **Deux lignes vides avant un en-tête de scène**, une ligne vide après.
- Une ligne vide entre deux paragraphes d'action, avant un personnage, avant une transition.
- Didascalie et dialogue directement sous le nom du personnage, sans ligne vide.
- Les lignes vides qui tomberaient en haut d'une page sont supprimées (une page commence directement par du texte).
- Ces espacements sont des règles de mise en page **par type d'élément** (à l'écran et dans le PDF). Dans le texte Fountain, une seule ligne vide sépare les éléments ; c'est l'affichage qui ajoute la ligne supplémentaire avant un en-tête de scène.

## Numéros

- **Numéro de scène** (« 1. », « 8. ») sur la ligne de l'en-tête, dans la marge gauche, aligné à droite et finissant 10 pt avant la marge du texte (bord droit à 98 pt).
- **Numéro de page** (« 2. ») en haut à droite, aligné sur le bord droit du texte (547 pt), à environ 0,5 pouce du haut (38 pt). La page de titre n'est pas comptée ; la première page du scénario porte le numéro 1, qui n'est pas affiché ; la suivante affiche « 2. ».

## Coupures de page (observées)

- Une scène dont l'en-tête, sa ligne vide et la première ligne qui suit ne tiennent pas en bas de page passe entièrement à la page suivante (page 6 → 7 du PDF).
- Un bloc de dialogue n'est pas coupé entre deux pages.

## Non imprimé

Notes (texte non imprimable), sections / actes et leurs bandeaux « FIN DE … », synopsis.

## Extensions de personnage

KIT colle l'extension au nom (`LE VOISIN(O.S.)`). NeoScenar l'écrit avec une espace, selon l'usage standard : `LE VOISIN (O.S.)`. Les deux formes sont lues correctement.

## Page de titre (page 1, non numérotée)

Sur la grille de 58 lignes (ligne 1 = première ligne de texte) :

- **Titre** centré, ligne 17 (« TITRE ») ;
- ligne vide ×3, puis **genre / information** centrée, ligne 21 (« Drame ») ;
- une ligne vide, **auteur(s)** centré, ligne 23 (« Prénom Nom ») ;
- une ligne vide, **mention** centrée, ligne 25 (« Scénario original ») ;
- **contact** aligné à gauche sur la marge du texte, ligne 40 (adresse de contact) ;
- **année / date** centrée sur la dernière ligne (ligne 58).

Correspondance avec les clés Fountain, **confirmée** le 18 novembre 2026 sur un export Fountain de KIT : `Title`, `Credit` (genre / information), `Author`, `Source` (mention), `Contact` (plusieurs lignes en retrait), `Draft date` (année).
