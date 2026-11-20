# Étape 7G — Recherche, correcteur, zoom, thème, mode concentration

Complète la section 8 de `etape-07-editeur-de-scenario.md`. En cas de différence, cette spécification fait foi. C'est la **dernière sous-étape de l'étape 7**.

## Objectif

Rendre l'éditeur confortable pour écrire tout un scénario : rechercher et remplacer, voir les fautes d'orthographe, régler la taille du texte, choisir un thème clair ou sombre, et écrire en plein écran sans rien autour.

Ces cinq parties sont indépendantes. Fais-les dans l'ordre, et teste chacune dans l'application avant de passer à la suivante.

**Aucune nouvelle dépendance** : `@codemirror/search` est déjà installé, et le correcteur est celui d'Electron.

## 1. Rechercher et remplacer

- `Cmd + F` ouvre le panneau de recherche de CodeMirror, en haut de l'éditeur. L'entrée **Édition > Rechercher…** (`Cmd + F`) n'est active que dans le module Scénario.
- **Panneau en français**, grâce aux traductions de CodeMirror (`EditorState.phrases`) : Rechercher, Remplacer, Suivant, Précédent, Tout sélectionner, Remplacer, Tout remplacer, Respecter la casse, Mot entier, Expression régulière, Fermer. Le panneau suit le thème de l'application.
- **Clavier** : `Entrée` dans le champ passe au résultat suivant, `Maj + Entrée` au précédent, `Échap` ferme le panneau et rend la main au texte. **`Cmd + G` reste réservé à la transition** (raccourci de KIT) et ne doit pas lancer « Rechercher le suivant ».
- Le panneau affiche le nombre de résultats (« 3 sur 12 ») si c'est simple à obtenir. Sinon, rien.
- **Tout remplacer** compte pour une seule étape d'annulation.
- Après un remplacement, la mise en forme et la pagination se recalculent comme après une frappe. Un remplacement qui change le type d'un élément est accepté : le texte fait foi.

## 2. Correcteur orthographique

- Correcteur d'Electron, activé dans l'éditeur de scénario (`spellcheck` sur la zone de texte de CodeMirror). Sur Mac, c'est le correcteur du système. Il suit les langues réglées dans macOS, et c'est normal. Vérifie qu'un Mac réglé en français souligne bien les fautes françaises.
- **Menu contextuel** (clic droit) en français. Electron n'en fournit aucun par défaut, il faut le construire :
  - les suggestions de correction en tête, quand on clique sur un mot souligné ;
  - « Ajouter au dictionnaire » ;
  - puis Couper, Copier, Coller, Tout sélectionner.
- **Pas de soulignement** sur les lignes d'en-tête de scène et de personnage (lieux, noms propres, `INT.`, `EXT.`) : l'attribut `spellcheck="false"` est posé par décoration de ligne. Vérifie dans l'application que Chromium le respecte à l'intérieur de la zone modifiable. Si ce n'est pas le cas simplement, renonce et signale-le.
- Pas de correcteur dans les champs à une seule ligne (recherche, page de titre). Il est actif dans la description du navigateur et dans les champs Auteur(s) et Notes.
- **Aucune connexion** : sur Mac, le correcteur du système fonctionne hors ligne. Sous Windows et Linux, Electron télécharge ses dictionnaires sur internet : c'est **hors périmètre ici** (étape 15), mais ajoute un commentaire dans le code à l'endroit où le correcteur est configuré.

## 3. Zoom de l'éditeur

- Dans le module Scénario, `Cmd + +`, `Cmd + -` et `Cmd + 0` agrandissent, réduisent et remettent à 100 % **le texte du scénario** : la page, le navigateur et les barres d'outils ne bougent pas. Utilise les entrées existantes du menu Présentation, qui transmettent déjà la commande au module actif.
- Paliers : 70, 80, 90, 100, 110, 125, 150, 175 et 200 %.
- Le zoom est **mémorisé** dans les préférences de l'application (`scriptZoom`), indépendamment du zoom des cartes.
- La page reste centrée. Si elle devient plus large que la fenêtre, une barre de défilement horizontale apparaît.
- Les traits de page, les numéros dans les marges et la liste d'autocomplétion suivent le zoom.
- Repasse « Vérifier les coupures de lignes » à 70 %, 100 % et 200 % : il ne doit y avoir aucun écart.

## 4. Thème clair ou sombre

- Nouvelle fenêtre **Réglages** : **NeoScenar > Réglages…** (`Cmd + ,`), l'emplacement standard sur Mac. Pour l'instant, elle ne contient qu'un réglage, **Thème** : Automatique, Clair, Sombre. Elle accueillera d'autres réglages plus tard.
- Le choix est mémorisé dans les préférences de l'application (`theme`, Automatique par défaut) et appliqué tout de suite, sans redémarrage.
- **Technique suggérée** : `nativeTheme.themeSource` (`'system'`, `'light'`, `'dark'`). La CSS actuelle en `prefers-color-scheme` suit alors automatiquement, sans rien réécrire. Le thème doit être appliqué avant l'affichage de la fenêtre, pour éviter un éclair blanc au démarrage.
- **Ce qui ne change jamais de couleur** : la toile de l'éditeur de dessin et les vignettes restent sur fond blanc (c'est du papier), et les 36 couleurs des cartes restent les mêmes.
- **Revue du thème sombre** dans toute l'application : accueil, création de projet, cartes, fiche plan, éditeur de dessin (autour de la toile), export vers Blender, module Scénario. Dans l'éditeur, la page est gris foncé avec du texte clair, comme dans KIT. Vérifie la lisibilité des notes vertes, du texte mis de côté, des bandeaux d'actes, des traits de page, de la liste d'autocomplétion, du panneau de recherche et du soulignement du correcteur. Corrige ce qui est illisible et signale-le à David.

## 5. Mode concentration

- `F5` (comme dans KIT) et **Présentation > Mode concentration**, avec une coche, pour activer ou désactiver. L'entrée de menu est indispensable : sur les portables Mac, `F5` demande souvent la touche `fn`.
- Actif seulement dans le module Scénario. Ailleurs, l'entrée de menu est désactivée.
- **En mode concentration** : la fenêtre passe en plein écran. La barre de modules, le navigateur, la barre d'outils et la barre d'état sont masqués. Il ne reste que la page, centrée, avec le fond autour.
- Ce qui continue de fonctionner : la frappe, l'enchaînement au clavier, l'autocomplétion, la recherche (`Cmd + F`), le zoom, l'enregistrement automatique. **Un échec d'enregistrement s'affiche toujours** : le bandeau d'erreur n'est jamais masqué.
- **Sortie** : `F5`, le menu, ou `Échap` quand aucune liste d'autocomplétion ni panneau de recherche n'est ouvert. Dans ces deux cas, `Échap` ferme d'abord la liste ou le panneau.
- En sortant, chaque élément retrouve son état d'avant : le navigateur reste masqué s'il l'était, et la fenêtre reste en plein écran si elle y était avant d'entrer.
- Le mode concentration n'est pas mémorisé : un projet s'ouvre toujours en mode normal.
- Pas de bouton dans la barre d'outils, pour ne pas la charger.

## Hors périmètre

- Dictionnaires hors ligne pour Windows et Linux (étape 15).
- Recherche dans tout le projet (cartes, fiches) ; recherche qui ignore les accents.
- Couleurs d'actes ou de page choisies par l'élève.
- Aperçu avant impression `F12` (étape 9).

## Tests automatiques attendus

- Traductions du panneau de recherche : toutes les phrases utilisées par `@codemirror/search` ont une traduction française. Le test échoue si une phrase est oubliée.
- Le raccourci `Cmd + G` donne toujours une transition quand le panneau de recherche est ouvert.
- Tout remplacer : une seule étape d'annulation.
- Paliers de zoom : suivant, précédent, limites, remise à 100 %, lecture d'une préférence absente ou abîmée.
- Préférence de thème : valeur par défaut, lecture d'une valeur abîmée, correspondance avec `themeSource`.
- Menu : entrées Rechercher, Réglages et Mode concentration, leurs raccourcis, et leur état actif ou non selon le module.
- Mode concentration : état d'entrée et de sortie (navigateur, plein écran) rétabli tel qu'il était.
- Décorations : les lignes d'en-tête et de personnage reçoivent `spellcheck="false"`, et les autres non.

## Critères de validation (à vérifier par David)

- [ ] `Cmd + F` : rechercher un nom, passer d'un résultat à l'autre avec `Entrée`, tout remplacer, puis annuler en une fois. Panneau en français.
- [ ] Le panneau ouvert, `Cmd + G` transforme toujours la ligne en transition.
- [ ] Une faute dans une action est soulignée ; clic droit : suggestions en français, puis Couper, Copier, Coller. Les en-têtes et les noms de personnages ne sont pas soulignés.
- [ ] `Cmd + +` et `Cmd + -` changent la taille du scénario seulement, et la taille est retrouvée au redémarrage.
- [ ] NeoScenar > Réglages… : passer en Sombre, puis Clair, puis Automatique. Tout change aussitôt, dans tous les modules. La toile de dessin reste blanche.
- [ ] Thème sombre : la page est lisible, ainsi que les notes vertes, les bandeaux, les traits de page, l'autocomplétion et la recherche.
- [ ] `F5` (ou Présentation > Mode concentration) : il ne reste que la page en plein écran. On peut écrire, chercher, zoomer. `F5` ou `Échap` revient à l'état d'avant.
- [ ] `npm test` et `npm run lint` passent.

À la fin, résume ce qui a été fait, signale tout écart et toute décision prise seul, puis attends l'accord de David avant le commit. Indique aussi ce qui reste éventuellement à faire de l'étape 7 par rapport à sa spécification d'ensemble.
