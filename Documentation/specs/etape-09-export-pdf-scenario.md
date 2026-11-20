# Étape 9 — Export PDF du scénario

Rédigée le 18 novembre 2026. À lire avec `mise-en-page-final-draft-a4.md` (mesures) et `etape-07f-limites-de-pages-et-page-de-titre.md` (pagination, page de titre).

## Objectif

Produire, à partir de `scenario.fountain`, un PDF A4 identique au PDF de référence de KIT (gardé en local), avec un aperçu avant l'enregistrement. Cette étape termine la première version utilisable en classe.

**Principe** : ce qu'on voit est ce qu'on imprime. Le PDF utilise **la pagination existante** (`packages/fountain`, profil `final-draft-a4.json`) : aucun second calcul des lignes ni des pages.

## Décisions (18 novembre 2026)

- **Page de titre, clés KIT confirmées** sur un export Fountain de KIT : `Title`, `Credit` (genre), `Author`, `Source` (mention), `Contact` (plusieurs lignes en retrait), `Draft date`. La disposition est celle de `mise-en-page-final-draft-a4.md`. Le titre est **en majuscules et souligné**. `Notes` et les clés inconnues ne sont pas imprimées.
- **Numéros de scène** : par défaut, le numéro **écrit dans le Fountain** (`#30#` → « 30. »), comme les cartes et Blender. Une option « Numéroter 1, 2, 3 » numérote les scènes dans l'ordre du texte, **dans le PDF seulement** ; le fichier n'est pas modifié. Une scène sans numéro écrit reçoit le numéro de sa place dans le texte.
- **Technique** : le PDF est dessiné directement avec **pdf-lib** et **@pdf-lib/fontkit** (MIT, sans dépendance native). Les polices Courier Prime de `resources/polices/courier-prime/` (normale, gras, italique, gras italique) sont incorporées en sous-ensemble. On n'utilise pas `printToPDF` de Chromium : ses marges et sa mise à l'échelle pourraient décaler les lignes.

## 9A — Moteur PDF (modèle conseillé : Opus)

Nouveau module indépendant `packages/pdf-scenario` : il ne dépend ni d'Electron ni du DOM.

Entrée : le résultat de la pagination, le profil de mise en page, les octets des polices et les options (`pageDeTitre: boolean`, `numerotation: 'fountain' | 'continue'`). Sortie : un `Uint8Array`.

À imprimer :
- **page de titre** (si elle existe et que l'option est cochée), non numérotée ;
- en-têtes, actions, personnages (y compris l'extension, `(O.S.)` collé ou non), didascalies, dialogues, transitions alignées à droite (y compris `>` forcé), texte centré `> … <`, sauts de page forcés `===` ;
- **mises en valeur Fountain** : `**gras**`, `*italique*`, `_souligné_` et leurs combinaisons ;
- numéro de scène dans la marge gauche ; numéro de page en haut à droite à partir de la page 2 du scénario (« 2. »), selon `mise-en-page-final-draft-a4.md` ;
- **non imprimé** : notes `[[ ]]`, texte masqué `/* */`, sections ou actes `#`, résumés `=`.
- Métadonnées du PDF : titre, auteur, créateur « NeoScenar ».

Si la pagination traite le dialogue double (`^`), on le reprend tel quel. Sinon, les deux répliques s'impriment l'une sous l'autre, et ce cas est noté pour l'étape 13.

Tests (vitest) :
- le scénario de référence (local) donne **7 pages** (titre + 6), et chaque page commence par la même ligne que dans le PDF de référence ;
- le texte extrait de chaque page (avec pdfjs-dist en dépendance de test, ou une comparaison des appels de dessin) correspond ligne à ligne à la pagination ;
- les accents s'affichent (« VALÉRIE », « HÔPITAL ») ; les éléments non imprimés sont absents ; les numéros suivent l'option (« 30. » ou « 3. ») ;
- une commande de développement `npm run pdf:exemple` écrit `out/le-dernier-bus-neoscenar.pdf` (scénario d'exemple ; un autre fichier peut être donné), pour comparer visuellement au PDF de KIT.

## 9B — Fenêtre d'export et aperçu (modèle conseillé : Sonnet)

- Menu **Fichier > Exporter le scénario en PDF…** et un bouton dans la barre d'outils du module Scénario. Le libellé dit clairement « scénario », pour éviter le piège de KIT (un PDF presque vide quand on exportait le plan).
- La fenêtre contient : un **aperçu** du PDF réel (le fichier généré, affiché par la visionneuse PDF de Chromium), deux cases (« Inclure la page de titre », cochée ; « Numéroter les scènes 1, 2, 3 », décochée) et l'indication « 7 pages ». L'aperçu se met à jour quand on change une option.
- Bouton **Enregistrer** : fichier dans `exports/` du projet, nommé `<Titre>_scenario_AAAA-MM-JJ.pdf` (titre sans accents, espaces remplacés par `_`, caractères interdits retirés : comme tous les fichiers créés par l'application). Un fichier du même nom est remplacé, car un export se refait sans perte. Bouton « Enregistrer sous… » pour choisir un autre emplacement.
- Après l'enregistrement : un message « PDF enregistré » avec les boutons « Ouvrir » et « Afficher dans le dossier ».
- Les options choisies sont mémorisées dans `projet.json`.
- Le texte exporté est le texte **actuel** de l'éditeur, y compris les modifications pas encore enregistrées.

## Validation par David

- [ ] Exporter le scénario de référence et le comparer au PDF de KIT : même page de titre, mêmes 6 pages, mêmes coupures et mêmes retraits.
- [ ] Imprimer une page sur l'imprimante de l'école : les marges sont respectées et rien n'est réduit.
- [ ] Cocher « Numéroter 1, 2, 3 » : le PDF affiche 1, 2, 3, mais le scénario et les cartes gardent 10, 20, 30.
- [ ] Une note `[[ ]]`, un acte et un résumé n'apparaissent pas dans le PDF.
- [ ] Le PDF s'ouvre dans Aperçu, Acrobat et Firefox, et le texte est sélectionnable, accents compris.
