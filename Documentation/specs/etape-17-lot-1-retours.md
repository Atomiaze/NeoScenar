# Étape 17 — Lot 1 des retours d'usage (avant 16D)

Source : note de David du 21 novembre 2026 (`VaultObsidian/00_Inbox/NeoScenar - Mise à jour.md`) et `etat-du-projet.md`, section « Retours d'usage (21 nov.) ».

## Périmètre

Dans ce lot :

1. Barre de modules : nouvel ordre, « Recherches » devient « Données du projet », icône dossier.
2. Panneau « Données du projet » : indentation, rubrique active en couleur.
3. Générique : rubriques repliées par défaut, état gardé, boutons « Tout réduire » et « Tout déployer ».
4. Module Carte : autocomplétion de l'en-tête de scène.
5. Préférences : entrées personnelles pour les menus Échelle de plan, Mouvement de caméra et Angle de prise de vue.
6. Nouvelle icône de l'application et visuel d'accueil.

**Hors de ce lot** (après 16D, ne rien préparer) : nouveaux documents (log line, tag line, synopsis, pitch, note d'intention), nouvel ordre des rubriques qui les inclut, fenêtre d'export avec cases à cocher, plan de tournage (personnages sans dialogue, interprètes ajoutés à la main). **Écarté** : réglage des raccourcis de la barre d'outils du scénario.

Règle commune : on ne renomme **rien dans le code ni dans les fichiers du projet** (`research`, dossiers `personnages/`, `lieux/`, `documents/` restent tels quels). Seuls les textes affichés changent.

Une sous-étape = plan court, réalisation, essais, accord de David, commit, mise à jour de `etat-du-projet.md`, `/clear`.

---

## 17A — Barre de modules

**À faire**

- Ordre des boutons, de haut en bas : **Données du projet, Planification, Carte, Scénario, Statistiques**.
- Texte affiché « Recherches » → « Données du projet » partout où il apparaît à l'écran : infobulle du bouton, titre du panneau (`fr.ts` : `research`, `tree`), menus de l'application, messages, écran d'accueil, aide. Rechercher toutes les occurrences visibles.
- Icône du bouton : un **dossier** (même famille de trait que les autres icônes de la barre, même taille, même épaisseur) à la place de la loupe.
- Si des raccourcis clavier ou un ordre de cycle (module suivant / précédent) dépendent de la position des boutons, ils suivent le nouvel ordre. Le module ouvert par défaut à l'ouverture d'un projet ne change pas.

**Critères de validation**

- [ ] La barre montre, de haut en bas : dossier, planification, carte, scénario, statistiques.
- [ ] Le mot « Recherches » n'apparaît plus nulle part à l'écran (sauf texte du visuel d'accueil).
- [ ] L'icône dossier est lisible sur les 7 thèmes, active comme inactive.
- [ ] Un projet existant s'ouvre sans changement de ses fichiers.

## 17B — Panneau « Données du projet » : lisibilité

**À faire**

- **Indentation** : les éléments d'une rubrique (personnages, lieux, documents) sont décalés vers la droite par rapport au titre de la rubrique, comme sur l'image de référence (`Données Projet.jpg`, colonne « Nouveau menu ») : la pastille de couleur des personnages et le texte des lieux s'alignent en retrait, nettement sous le texte du titre de rubrique. Les sous-dossiers de Documents gardent leur décalage propre, en plus de ce retrait.
- **Rubrique active** : en plus du soulignement actuel, le texte prend la couleur d'accent du thème (`--accent`). Même règle pour l'élément sélectionné (fiche ou document ouvert), si ce n'est pas déjà le cas.
- L'ordre actuel des rubriques ne change pas dans ce lot.

**Critères de validation**

- [ ] Le retrait est visible et régulier dans Personnages, Lieux et Documents.
- [ ] La rubrique active est soulignée **et** colorée, sur les 7 thèmes, avec un contraste suffisant.
- [ ] Les noms longs passent toujours correctement (coupure ou points de suspension comme avant).

## 17C — Générique : rubriques repliables

**À faire**

- Chaque rubrique du formulaire du Générique (distribution, équipe, musiques, mentions, logos…) peut être repliée ou déployée en cliquant sur son titre (flèche comme dans le panneau des données).
- **Projet neuf, ou projet dont l'état n'a jamais été enregistré : toutes les rubriques sont repliées.**
- L'état (rubriques ouvertes) est **gardé** : quand on quitte le Générique et qu'on y revient, et aussi après fermeture et réouverture de l'application. Il est enregistré dans les **préférences de l'application, par projet** (pas dans les fichiers du projet : c'est un réglage d'affichage). Clé : identifiant du projet si `projet.json` en a un, sinon son chemin.
- En haut, à côté du titre « Générique du film » : deux boutons texte **« Tout réduire »** et **« Tout déployer »**.
- L'aperçu du générique n'est pas touché.

**Critères de validation**

- [ ] Nouveau projet → Générique : toutes les rubriques sont repliées.
- [ ] J'ouvre deux rubriques, je vais dans Carte, je reviens : les deux sont toujours ouvertes.
- [ ] Même chose après avoir quitté et relancé NeoScenar.
- [ ] « Tout déployer » puis « Tout réduire » font ce qu'ils disent, et l'état est gardé ensuite.
- [ ] Un champ rempli dans une rubrique repliée n'est pas perdu.

## 17D — Carte : autocomplétion de l'en-tête de scène

**À faire**

- Le champ « En-tête » du panneau de détail d'une scène (`DetailPanel.tsx`, `HeadingField`) propose la même aide à la frappe que l'éditeur de scénario pour un en-tête : préfixes (INT. / EXT. / INT./EXT.), lieux déjà utilisés et fiches Lieux, puis moments après « - » (`sceneTimes` du vocabulaire).
- **Réutiliser** la logique de `src/renderer/script/completion/proposals.ts` (ne pas la recopier). Si elle dépend de CodeMirror, extraire la partie qui calcule les propositions en fonction pure, utilisée par les deux.
- Comportement de la liste : flèches haut / bas, Entrée ou Tab pour accepter, Échap pour fermer sans annuler la saisie. Aspect proche de `TermCombobox.tsx`.
- La validation de l'en-tête (enregistrement, écriture dans le Fountain) ne change pas.

**Critères de validation**

- [ ] Je tape « IN » : INT. est proposé ; après « INT. », les lieux du projet sont proposés ; après « - », JOUR, NUIT… sont proposés.
- [ ] Les propositions sont les mêmes que dans l'éditeur de scénario pour la même saisie.
- [ ] Échap ferme la liste sans effacer ; Entrée accepte ; une saisie libre reste possible.
- [ ] Tests de `proposals` toujours verts, plus un test pour la fonction partagée.

## 17E — Préférences : entrées personnelles des menus de plan

**À faire**

- Dans les Préférences, une section « Vocabulaire des plans » avec trois listes : **Échelle de plan, Mouvement de caméra, Angle de prise de vue**.
- Chaque liste montre d'abord les entrées du cours (fichier `resources/vocabulaire/saint-luc.json`), **non modifiables**, puis les entrées personnelles, qu'on peut **ajouter, renommer, supprimer**. Une entrée personnelle = un libellé (obligatoire) et une définition (facultative, affichée en infobulle comme les autres).
- Pas de doublon : un libellé déjà présent (même casse ignorée) est refusé avec un message clair.
- Les entrées personnelles sont gardées dans les préférences de l'application (`src/main/preferences.ts`), pour tous les projets.
- Dans le module Carte, les menus proposent les entrées du cours puis les entrées personnelles.
- **Une valeur hors liste reste affichée** : si une carte contient une valeur qui n'est plus (ou pas) dans la liste (entrée supprimée, projet venu d'un autre ordinateur), elle est montrée telle quelle dans le champ, et n'est jamais effacée ni modifiée en silence.
- Le format des projets ne change pas : la carte garde le libellé, comme aujourd'hui.

**Critères de validation**

- [ ] J'ajoute « Plan drone » dans Mouvement de caméra : il apparaît dans le menu des plans, avec sa définition en infobulle.
- [ ] Je supprime cette entrée : les plans qui l'utilisaient l'affichent toujours.
- [ ] Les entrées du cours ne peuvent être ni renommées ni supprimées.
- [ ] Un doublon est refusé avec un message.
- [ ] Les entrées restent après redémarrage.

## 17F — Icône de l'application et visuel d'accueil

**Fichiers fournis par David** : `resources/accueil/logo.png` (1024 × 1024, logo « NS » rond) et `resources/accueil/visuel-accueil.jpeg` (nouveau visuel, déjà en place : David a remplacé le fichier directement).

**À faire**

- **Icône** : produire `build/icon.png` à partir de `resources/accueil/logo.png`, en 1024 × 1024, fond transparent. Si le logo touche les bords, réduire légèrement pour laisser une marge d'environ 10 % (convention des icônes macOS), sans le déformer.
  - Vérifier que electron-builder produit bien l'icône macOS, Windows (.ico) et Linux à partir de ce fichier.
  - Vérifier aussi l'icône de la fenêtre (Linux, Windows), celle du Dock en mode développement si elle est réglée dans le code, et le logo de la fenêtre « À propos » s'il en utilise un.
- **Visuel d'accueil** : rien à remplacer. Vérifier seulement l'affichage dans l'écran d'accueil (image en portrait : pas de déformation, pas de recadrage qui coupe le logo ou les textes, rendu correct en petite et grande fenêtre). Si un réglage d'affichage est nécessaire, proposer avant de changer.

**Critères de validation**

- [ ] `npm run build` puis l'application empaquetée Mac montre la nouvelle icône dans le Finder et le Dock.
- [ ] Le Windows et le Linux du brouillon de Release auront la nouvelle icône (à revérifier en 16D ; ajouter une ligne dans `essais-16D.md`).
- [ ] L'écran d'accueil montre le visuel entier et net, sur les 7 thèmes.

---

## Fin du lot

- Suite complète des tests et lint verts.
- Mettre à jour `etat-du-projet.md` : « Retours d'usage, lot 1 » passe en **Terminé** ; prochaine étape : 16D. Ajouter à `essais-16D.md` : icône, autocomplétion de l'en-tête, entrées personnelles des préférences.
- Les installeurs du brouillon de Release `v0.1.0` sont à **reconstruire** avant 16D pour inclure ce lot.
