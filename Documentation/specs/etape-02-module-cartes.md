# Étape 2 — Module Cartes (découpage technique)

## Objectif

Construire le module Cartes : un grand tableau où l'étudiant organise son film en scènes et en plans, avec un panneau qui affiche la fiche de l'élément sélectionné. À cette étape, le module ne communique pas encore avec le scénario (ce sera l'étape 6). Toutes les modifications sont enregistrées automatiquement dans `neoscenar/decoupage.json`.

Références : `CLAUDE.md`, section 5 de `Documentation/cahier-des-charges.md` (si la copie locale n'est pas à jour, cette spécification fait foi), et les formats définis à l'étape 1 (`src/shared/projectTypes.ts`).

C'est l'étape la plus riche en interface. Présente ton plan à David et propose-lui de la découper en sous-étapes (par exemple : A. logique et tests ; B. affichage et sélection ; C. ajout, suppression, couleurs ; D. glisser-déposer ; E. fiche ; F. annulation et finitions), avec une validation de David entre chacune.

## 1. Mise en page de la fenêtre projet

```
┌────┬──────────────────────────────────────────────┬──────────────────┐
│ ☰  │ Barre d'outils                               │                  │
│ 📋 ├──────────────────────────────────────────────┤  Fiche de        │
│ 🃏 │ [S_0010 ] [P_0010] [P_0020] [P_0030]         │  l'élément       │
│ ✎  │ [S_0020 ] [P_0010] [P_0020]                  │  sélectionné     │
│ 📊 │ [S_0030 ] [P_0010] [P_0020] [P_0030] [P_0040]│                  │
│    │           [P_0050] [P_0060]                  │                  │
└────┴──────────────────────────────────────────────┴──────────────────┘
```

- **Barre de modules** à gauche (icônes, nom au survol) : Recherches, Cartes, Scénario, Statistiques. Seul Cartes est actif ; les autres sont grisés avec l'infobulle « Bientôt disponible ».
- **Barre d'outils** : Ajouter une scène, Ajouter un plan, Ajouter plusieurs…, Renuméroter…, bouton de verrouillage des numéros (cadenas ouvert/fermé), réglage du zoom, durée totale du film (mm:ss), indicateur d'enregistrement (« Enregistré », « Enregistrement… », ou erreur).
- **Tableau** au centre : une rangée par scène, la carte scène en tête de rangée, puis ses plans dans l'ordre de montage ; une rangée trop longue passe à la ligne (les plans suivants s'alignent sous les plans, pas sous la carte scène). Défilement vertical. Pas de placement libre.
- **Panneau de fiche** à droite, repliable. Sans sélection : « Sélectionnez une scène ou un plan ».
- Le réglage du zoom (taille des cartes) est mémorisé dans les préférences de l'application.

## 2. Les cartes

**Carte scène** (visuellement distincte des plans : plus large, bordure plus marquée) :
- numéro (S_0010) ;
- nom ;
- en-tête de scène (INT. CUISINE - JOUR) ;
- en petit : nombre de plans et durée totale de la scène (« 4 plans · 0:32 »).

**Carte plan** :
- numéro (P_0010) ;
- nom ;
- en-tête de la scène, rappelé en petit et en gris.

Couleur de fond : celle choisie par l'étudiant, sinon une couleur neutre par défaut. Le texte reste toujours lisible (contraste suffisant avec chaque couleur de la palette). Un texte trop long est coupé avec « … ».

## 3. Format : en-tête de scène

Ajouter à `Scene` un champ `heading: string` (en-tête de scène, « INT. CUISINE - JOUR »). C'est un **ajout compatible** : un `decoupage.json` sans ce champ est lu avec `heading: ""`, et `formatVersion` reste à 1. À l'étape 6, ce champ sera synchronisé avec le scénario. Mets en place, à cette occasion, le mécanisme général de valeurs par défaut à la lecture, pour les ajouts compatibles futurs.

## 4. Sélection et clavier

- Clic : sélectionne une carte (et affiche sa fiche).
- `Cmd + clic` : ajoute ou retire une carte de la sélection.
- `Maj + clic` : sélectionne une plage de plans.
- Clic dans le vide ou `Échap` : désélectionne.
- Flèches : passent d'une carte à la suivante (gauche/droite) ou à la rangée voisine (haut/bas).
- `Retour arrière` ou `Suppr` : supprime la sélection (voir § 7).
- Double-clic ou `Entrée` : place le curseur dans le champ « Nom » de la fiche.
- Clic droit sur une carte : menu contextuel (Insérer un plan avant, Insérer un plan après, Insérer une scène après, Couleur ▸, Supprimer).

## 5. Ajouter et insérer

- **Ajouter un plan** : après le plan sélectionné ; si une scène est sélectionnée, à la fin de cette scène ; sans sélection, à la fin de la dernière scène. S'il n'existe aucune scène, le bouton est désactivé.
- **Ajouter une scène** : après la scène sélectionnée (ou la scène du plan sélectionné) ; sans sélection, à la fin. Une nouvelle scène contient d'office un plan P_0010.
- **Ajouter plusieurs…** : fenêtre « Ajouter [N] [plans / scènes] [après la sélection / à la fin] », N entre 1 et 200. Chaque scène ajoutée contient un plan P_0010.
- **Insérer avant / après** (menu contextuel) : à l'emplacement exact.
- Le nouvel élément est sélectionné et visible à l'écran.

## 6. Numérotation (logique pure, très testée)

Toute la logique de numérotation est écrite sous forme de fonctions pures dans `src/shared/decoupage/`, sans dépendance à l'interface, et couverte par des tests.

Ordre : un numéro est le couple (nombre, lettre) ; P_0010 < P_0010A < P_0010B < P_0011 < P_0020. Les numéros sont uniques dans une scène ; les numéros de scène sont uniques dans le projet.

- **À la fin** : multiple de 10 suivant le dernier numéro (après P_0020 → P_0030 ; après P_0015 → P_0020). Premier élément d'une liste vide : 10.
- **Entre deux éléments** : un nombre entier libre entre les deux, de préférence au milieu (entre 10 et 20 → 15 ; entre 10 et 15 → 12). Avant le premier élément, l'intervalle commence à 0 (avant P_0010 → P_0005).
- **Plusieurs éléments entre deux** : répartis régulièrement si assez de nombres libres (3 plans entre 10 et 20 → 12, 15, 17 ou équivalent).
- **Plus de nombre libre** (entre P_0010 et P_0011) :
  - numéros non verrouillés : NeoScenar propose « Il n'y a plus de numéro libre à cet endroit. Renuméroter la scène ? ». Oui → renumérotation de la scène puis insertion ; Non → rien ne change ;
  - numéros verrouillés : une lettre est ajoutée au numéro précédent (P_0010A, puis P_0010B…), de A à Z. Au-delà, ou s'il n'y a aucune place (entre P_0010 et P_0010A), un message explique que l'insertion est impossible à cet endroit.
- **Déplacement** (numéros non verrouillés) : l'élément déplacé prend un numéro libre entre ses nouveaux voisins, avec les mêmes règles. Un plan déplacé vers une autre scène prend un numéro dans sa scène d'arrivée. Les autres éléments ne changent pas.
- **Renuméroter…** : fenêtre « Renuméroter [la scène sélectionnée / tout le projet] ». Remet 10, 20, 30… dans l'ordre actuel et supprime les lettres. Indisponible quand les numéros sont verrouillés.
- **Verrouiller les numéros** : bouton cadenas. Verrouiller : confirmation simple. Déverrouiller : confirmation avec avertissement (« Les fichiers déjà créés à partir de ce découpage, comme le storyboard Blender, pourraient ne plus correspondre »). Quand les numéros sont verrouillés, le glisser-déposer est désactivé (infobulle : « Déverrouillez les numéros pour réorganiser le découpage ») ; ajouter, insérer, supprimer et modifier les fiches restent possibles.
- Les identifiants internes (UUID) ne changent jamais, quoi qu'il arrive aux numéros.

## 7. Supprimer

- Un seul plan : suppression immédiate (l'annulation permet de revenir en arrière).
- Plusieurs éléments : confirmation (« Supprimer 5 plans ? »).
- Une scène qui contient des plans : confirmation (« Supprimer S_0020 et ses 4 plans ? »).
- On peut supprimer toutes les scènes : le tableau vide affiche alors un gros bouton « Ajouter une scène ».
- Supprimer ne renumérote rien.

## 8. Glisser-déposer

- Glisser un plan : dans sa scène, ou vers une autre scène, à n'importe quelle position.
- Glisser une scène (par sa carte scène) : déplace toute la rangée avec ses plans.
- Glisser une sélection de plusieurs plans : ils se déplacent ensemble, dans leur ordre.
- Un repère visuel clair montre l'endroit exact où l'élément sera déposé ; `Échap` annule le glissement.
- Défilement automatique quand on approche du bord du tableau.
- Bibliothèque conseillée : dnd-kit (à confirmer dans ton plan).

## 9. Couleurs

- Palette de 10 couleurs douces (lisibles avec un texte foncé) + « Couleur par défaut ».
- Accessible par le menu contextuel et dans la fiche ; s'applique à toute la sélection.
- Stockée en hexadécimal dans `color` (`null` = couleur par défaut).

## 10. Panneau de fiche

**Fiche plan** — titre : identifiant complet (S_0010_P_0020) :

- Nom (texte).
- Durée en secondes (nombre ≥ 0, décimales acceptées avec virgule ou point ; vide autorisé).
- Échelle de plan, Mouvement de caméra, Angle de prise de vue : listes déroulantes qui acceptent aussi une saisie libre (voir § 11).
- Sons, bruitages, dialogues (plusieurs lignes).
- Musique (texte).
- Description du plan (plusieurs lignes), avec en texte d'aide : « Le sujet (personnages, animaux, objets, leurs positions et mouvements), l'arrière-plan et l'éventuel premier plan ».
- Couleur.
- Pas encore de vignette (étape 9).

**Fiche scène** — titre : S_0010 :

- Nom.
- En-tête de scène (texte libre, mis automatiquement en majuscules, ex. « INT. CUISINE - JOUR »).
- Couleur.
- Informations : nombre de plans, durée totale.

Toute modification dans la fiche se voit immédiatement sur la carte.

## 11. Vocabulaire du cours

Les listes sont lues dans un fichier JSON livré avec l'application (`resources/vocabulaire/saint-luc.json` ou équivalent), pour pouvoir être modifiées plus tard sans toucher au code. Chaque terme a un libellé et une définition affichée en infobulle dans la liste déroulante.

**Échelles de plan** :
- Plan d'ensemble — le décor entier, les personnages y sont petits.
- Plan demi-ensemble — une partie du décor, les personnages sont reconnaissables.
- Plan moyen — le personnage en entier, de la tête aux pieds.
- Plan américain — le personnage coupé à mi-cuisses.
- Plan rapproché taille — le personnage coupé à la taille.
- Plan rapproché poitrine — le personnage coupé à la poitrine.
- Gros plan — le visage.
- Très gros plan — un détail du visage (les yeux, la bouche).

**Mouvements de caméra** :
- Plan fixe — la caméra ne bouge pas.
- Panoramique — la caméra tourne sur son axe.
- Zoom — on opère un zoom avec l'objectif.
- Traveling — la caméra se déplace.
- Traveling compensé — zoom (ou dézoom) compensé par un mouvement de caméra inverse.

**Angles de prise de vue** :
- Frontal — de face, sans inclinaison ; angle classique.
- Plongée — caméra en hauteur pointant vers le bas ; réduit l'importance du sujet, vulnérabilité.
- Contre-plongée — caméra en bas pointant vers le haut ; agrandit l'importance du sujet, puissance.
- Ras du sol — effet artistique, vue d'un petit animal.
- Vue plafond — vue du dessus ; perspective d'ensemble, effet artistique.
- Vue à la première personne — la caméra voit par les yeux d'un personnage ; immersion du spectateur.
- Plan débullé — en oblique ; tension, confusion, malaise.

## 12. Enregistrement automatique

- Chaque modification met à jour l'état puis déclenche l'écriture de `decoupage.json` via `writeFileSafely`, regroupée (une écriture au plus toutes les ~500 ms pendant une saisie).
- À la fermeture du projet ou de l'application, toute écriture en attente est terminée avant de fermer.
- Pas de `Cmd + S` nécessaire (le raccourci peut exister et forcer l'écriture immédiate, sans message).
- En cas d'échec d'écriture : bandeau d'erreur visible et explicite, nouvelles tentatives, aucune perte des données affichées ; la fermeture prévient si des modifications n'ont pas pu être enregistrées.
- Le processus principal valide les données reçues avant de les écrire.

## 13. Annuler et rétablir

- `Cmd + Z` / `Cmd + Maj + Z`, et menu Édition (« Annuler l'ajout du plan », etc. si simple à réaliser).
- Couvre toutes les modifications du découpage : ajout, insertion, suppression, déplacement, renumérotation, verrouillage, couleurs, champs des fiches (une saisie continue dans un champ compte pour une seule étape).
- Au moins 100 étapes, valables pendant la session (non enregistrées dans le projet).
- Dans un champ de texte en cours d'édition, `Cmd + Z` annule d'abord la frappe dans ce champ (comportement normal d'un champ de texte).

## 14. Architecture attendue

- `src/shared/decoupage/` : opérations pures (ajouter, insérer, supprimer, déplacer, renuméroter, verrouiller, modifier un champ) qui prennent un `Decoupage` et renvoient un nouveau `Decoupage` sans modifier l'original. Toute la logique métier est là et testée.
- Renderer : un état central du projet (par exemple avec zustand) qui applique ces opérations, gère l'historique d'annulation et déclenche l'enregistrement.
- Main : lecture/écriture via IPC typé, validation avant écriture.
- Fluide avec 300 plans.

## Hors périmètre

- Lien avec le scénario (étape 6) et création de scènes depuis le texte.
- Vignettes, storyboard, impression (étape 9).
- Export Blender (étape 3).
- Illustrations des échelles de plan (aide pédagogique illustrée, plus tard).
- Modification des listes de vocabulaire depuis l'interface.

## Tests automatiques attendus

- Numérotation : fin de liste, entre deux, avant le premier, répartition de plusieurs éléments, plus de place (non verrouillé → besoin de renuméroter signalé ; verrouillé → lettres A, B… ; Z dépassé → impossible), ordre (nombre, lettre).
- Ajout de scène : contient un plan P_0010.
- Déplacements : dans une scène, vers une autre scène (nouveau numéro dans la scène d'arrivée), scène entière, plusieurs plans ensemble ; refus quand verrouillé.
- Renumérotation d'une scène et du projet ; lettres supprimées ; identifiants internes inchangés.
- Suppression ; identifiants jamais réutilisés.
- Unicité des numéros après n'importe quelle suite d'opérations (test avec une suite aléatoire de plusieurs centaines d'opérations).
- Lecture d'un `decoupage.json` sans `heading` : valeur par défaut.
- Annuler / rétablir sur une suite d'opérations.

## Critères de validation (à vérifier par David)

- [ ] À l'ouverture d'un nouveau projet : barre de modules à gauche, tableau avec S_0010 et P_0010, panneau de fiche à droite.
- [ ] Ajouter 3 scènes et 25 plans d'un coup dans une scène ; les numéros sont corrects.
- [ ] Insérer un plan entre P_0010 et P_0020 donne P_0015 ; insérer entre P_0010 et P_0011 propose de renuméroter.
- [ ] Verrouiller les numéros : l'insertion entre P_0010 et P_0011 donne P_0010A ; le glisser-déposer est désactivé ; Renuméroter est indisponible.
- [ ] Déverrouiller : avertissement affiché.
- [ ] Glisser un plan dans sa scène, vers une autre scène ; glisser une scène entière ; glisser trois plans sélectionnés ensemble.
- [ ] Changer la couleur de plusieurs cartes en une fois.
- [ ] Supprimer une scène avec ses plans : confirmation, puis `Cmd + Z` la fait revenir avec les mêmes numéros.
- [ ] Remplir une fiche plan (durée, échelle choisie dans la liste, angle en saisie libre, description) : la carte et la durée totale se mettent à jour ; les infobulles du vocabulaire s'affichent.
- [ ] Renseigner l'en-tête d'une scène : il apparaît sur la carte scène et, en gris, sur ses plans.
- [ ] Fermer le projet, le rouvrir : tout est là, sans avoir jamais fait `Cmd + S`.
- [ ] Ouvrir `decoupage.json` dans un éditeur de texte : il est lisible et cohérent.
- [ ] Avec 300 plans, le défilement et le glisser-déposer restent fluides.
- [ ] `npm test` et `npm run lint` passent.

À la fin, résume ce qui a été fait, signale tout écart à cette spécification et toute décision prise seul.
