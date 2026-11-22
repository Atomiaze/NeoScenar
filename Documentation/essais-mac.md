# Essais Mac (18D) — sur l'iMac de David

Liste à cocher, dans l'ordre. Chaque case dit **ce que vous devez voir**.

- Cochez une case seulement si vous voyez exactement cela.
- Sinon, notez ce que vous voyez à la ligne « Remarque » et prenez une capture (Cmd + Maj + 4).
- À la fin, envoyez-moi les remarques et les captures. Je corrige, et on refait seulement les cases en échec.
- On essaie **l'application installée depuis le `.dmg`**, pas `npm run dev`.
- L'application n'est pas signée par Apple. Un avertissement au premier lancement est **normal** (case 1.2).

Version essayée : **0.1.0**, `.dmg` construit en local (aucune étiquette ni Release GitHub avant 18G). Le fichier est `dist/NeoScenar-0.1.0-mac.dmg`.

> Le `.dmg` contient les sous-étapes 18C-1 à 18C-5. **18C-6** (« Présents en plus » du plan de tournage) n'est pas faite : la section 11 reste à cocher après un nouveau `.dmg`.

---

## 0. Avant de commencer

- [ ] **Préparer le projet d'essai.**
  1. Dans NeoScenar : « Nouveau projet… », nom `Film essai Mac`. Voyez « Dossier créé : Film_essai_Mac ».
  2. Fermez NeoScenar.
  3. Copiez `packages/fountain/tests/exemples/le-dernier-bus.fountain` sur `Film_essai_Mac/neoscenar/scenario.fountain` (remplacez le fichier).
  4. Rouvrez le projet. Voyez : « Scènes : 9 · 6:16 » et « Page 1 / 7 ».
- [ ] **Construire l'extension Blender** (si on ne l'a pas) : `dist/addon/storyboard_plans-<version>.zip` existe. Sinon, me le dire : je la construis.
- [ ] **Blender 4.5** est installé sur l'iMac (nécessaire pour la section 7).

---

## 1. Installation et premier lancement

### 1.1 Le `.dmg`

- [ ] **Double-clic sur `dist/NeoScenar-0.1.0-mac.dmg`.** Une fenêtre s'ouvre avec l'icône NeoScenar et le dossier Applications.
- [ ] **Glissez NeoScenar dans Applications.** La copie se termine sans erreur ni mot de passe.
- [ ] **Éjectez le disque** (bouton ⏏ dans le Finder).

### 1.2 Premier lancement (avertissement d'Apple)

*Le `.dmg` vient d'être construit sur ce Mac : macOS ne le met pas en quarantaine, l'avertissement peut donc ne pas apparaître. Il sera vérifié sur un fichier téléchargé en 18E.*

- [ ] **Ouvrez NeoScenar depuis Applications.** Notez ce que vous voyez : ouverture directe, ou avertissement d'Apple (message exact).
- [ ] **Si avertissement** : passez-le (clic droit ▸ Ouvrir, ou Réglages Système ▸ Confidentialité et sécurité ▸ « Ouvrir quand même »). Notez quelle méthode a marché et si un mot de passe est demandé.

Remarque : …

### 1.3 Premier écran

- [ ] **Icône** : l'icône du Dock, du Finder et de la fenêtre montre le logo « NS » (rond, orange et vert), pas l'icône d'Electron.
- [ ] **Écran d'accueil** : le visuel NS entier (jamais rogné) à gauche ; à droite « Nouveau projet… » et « Ouvrir un projet… » ; en bas « Créé par David Delepinne · version 0.1.0 ». Essayez en petite et en grande fenêtre.
- [ ] **Menus** : NeoScenar, Fichier, Édition, Affichage, Fenêtre, Aide. « Réglages… » et « À propos de NeoScenar » sont dans le menu **NeoScenar**.
- [ ] **Raccourcis** : les menus montrent `⌘`. Les textes parlent du « Finder ».
- [ ] **À propos** : nom, version 0.1.0, auteur, licence, lien GitHub. **Cliquez le lien** : le navigateur s'ouvre sur la page du dépôt. (Ce clic n'est jamais testé automatiquement.)
- [ ] **Cmd + Q** quitte complètement l'application (plus de point sous l'icône du Dock).

Remarque : …

---

## 2. Créer, écrire, fermer, rouvrir

- [ ] « Nouveau projet… », nom `Essai Mac` : voyez « Dossier créé : Essai_Mac ». Choisissez un emplacement dans Documents.
- [ ] **Écrivez** quelques scènes dans le Scénario, avec des accents (« été », « Éliott »). Voyez « Enregistré » en haut à droite.
- [ ] **Fermez le projet, puis l'application, puis rouvrez-la.** Le projet est dans « Projets récents ». Rouvrez-le : votre texte est là, accents compris.
- [ ] **Les noms des fichiers créés** par l'application n'ont ni accent ni espace (dans le Finder, regardez le dossier `neoscenar/`).

Remarque : …

---

## 3. Double-clic sur un `.neoscenar`

- [ ] NeoScenar fermé, **double-clic sur `Essai_Mac.neoscenar`** dans le Finder : NeoScenar s'ouvre **directement sur ce projet**.
- [ ] NeoScenar déjà ouvert, double-clic sur un autre `.neoscenar` : **aucune deuxième fenêtre**, le projet s'ouvre dans la fenêtre existante.
- [ ] **Glisser un `.neoscenar` sur l'icône du Dock** : même résultat.

Remarque : …

---

## 4. Les modules

Ouvrez `Film_essai_Mac` (9 scènes) et parcourez chaque module.

- [ ] **Scénario** : écriture, saisie semi-automatique des personnages et lieux, saut de page (le trait ne coupe jamais une lettre ni un É), mode révision, recherche. Page 1 / 7.
- [ ] **Traits de page** : le trait de la page 2 est avant « LA MÈRE (V.O.) », puis INÈS (page 3), ÉLIOTT (4), LE CAISSIER (5), ÉLIOTT (6), « INT. MAISON D'INÈS - NUIT » (7). Essayez 2 thèmes et 2 tailles de texte.
- [ ] **Cartes** : S_0001 à S_0009 ; ajout d'un plan à S_0001 ; déplacement d'une carte ; annuler / rétablir.
- [ ] **Découpage / plans** : numérotation des plans, vignette dessinée (outil de dessin), fiche d'un plan.
- [ ] **En-tête dans une carte** (17D) : taper « INT. » dans « En-tête » propose les lieux ; Échap ferme la liste sans rien effacer ; rien n'est écrit dans le scénario avant la validation.
- [ ] **Storyboard** : planches, 3 plans par page au maximum.
- [ ] **Recherches** : fiches Personnages et Lieux, liens avec le scénario, renommage, Documents.
- [ ] **Planification** : liste, ligne du temps, plan de tournage ; ajouter une tâche « Tester Mac » avec une échéance.
- [ ] **Statistiques** : chiffres cohérents avec le scénario.
- [ ] **Générique** : formulaire, aperçu.
- [ ] **Thèmes** : changez dans Réglages ; les 7 thèmes s'appliquent, texte lisible.
- [ ] **Correcteur** : « maisonn » est souligné en rouge ; clic droit propose « maison » ; « Ajouter au dictionnaire » retient « Zorglubesque ».
- [ ] **Police** : la page du scénario est en Courier Prime, jamais en Times ou Arial.
- [ ] **Vocabulaire des plans** (17E) : Réglages ▸ « Vocabulaire des plans » : ajoutez « Plan drone » dans « Mouvement de caméra » ; la fiche d'un plan le propose. Supprimez l'entrée : les plans qui l'utilisaient l'affichent toujours. Un doublon est refusé. Redémarrez : les entrées sont toujours là.

Remarque : …

---

## 5. Versions

- [ ] **Fichier ▸ Versions…** : enregistrez une version « Départ Mac ».
- [ ] Modifiez le scénario, puis **restaurez** « Départ Mac » : le texte d'avant revient, les plans aussi.
- [ ] Synopsis, pitch, note d'intention, log line et tag line **ne sont pas** dans les versions (décision voulue).

Remarque : …

---

## 6. Exports

Faites chaque export, puis ouvrez le fichier dans Aperçu.

- [ ] **Exporter en PDF…** (scénario seul) : l'aperçu s'affiche dans la fenêtre ; enregistrez ; le fichier est dans `neoscenar/exports`. 8 pages (titre + 7), Courier, titre « LE DERNIER BUS » souligné, numéros de page en haut à droite à partir de la page 2 du scénario.
- [ ] **Numéros de scène du PDF (à revérifier).** Dans la fenêtre d'export, **sans** cocher « Numéroter 1, 2, 3 » : une scène sans `#n#` écrit dans le scénario porte le numéro de **sa place dans le texte** (comportement voulu, spec 9). Avec la case cochée : 1, 2, 3 dans l'ordre. Dites-moi si ce comportement vous convient ou si une scène non numérotée doit apparaître sans numéro.
- [ ] **PDF du storyboard** : aperçu, puis enregistrement. « N° de page : 1 / N » partout, 3 plans par page au maximum, case dessin vide ou vignette.
- [ ] **Planning** : un PDF « Planning » et un fichier `.ics`. Ouvrez le `.ics` dans Calendrier : un événement « journée entière » à la date de l'échéance.
- [ ] **Plan de tournage** : PDF lisible.
- [ ] **Générique** : des PNG sur fond transparent dans `08_Graphisme/Generique`. Lettres blanches, sans halo sombre.
- [ ] **Les noms des fichiers exportés** n'ont ni accent ni espace.

Remarque : …

---

## 7. Export vers Blender 4.5

- [ ] **Dans Blender** : Édition ▸ Préférences ▸ Extensions ▸ ⌄ ▸ « Installer à partir du disque… », choisissez `dist/addon/storyboard_plans-<version>.zip`. « Storyboard – Gestion des plans » est activée.
- [ ] **Dans NeoScenar** : « Fichier ▸ Exporter vers Blender… », cochez « Ouvrir dans Blender après l'export ».
- [ ] **NeoScenar trouve Blender seul**, ou affiche « Choisir Blender 4.5… » (cherchez `Blender.app`) : le choix est mémorisé.
- [ ] **Blender s'ouvre** et l'import démarre seul. Les plans apparaissent. Un fichier `.blend` est créé dans `06_Blender`.

Remarque : …

---

## 8. Copie du projet sur clé

- [ ] **Copiez `Film_essai_Mac` sur une clé USB**, puis de la clé dans `Documents/Mes films été` (dossier avec espace et accent, exprès).
- [ ] **Ouvrez la copie.** Voyez « Scènes : 9 · 6:16 », « Page 1 / 7 », les cartes S_0001 à S_0009, le plan ajouté, la tâche « Tester Mac », la version « Départ Mac ». **Aucun message d'erreur.**
- [ ] **Modifiez la copie** (une phrase dans la scène 1) et fermez : l'original n'a pas changé.

Remarque : …

---

## 9. Lot 1 des retours d'usage (17A à 17F)

- [ ] **Panneau Données du projet** (17B) : panneau indenté, rubrique active en couleur d'accent, lisible sur les 7 thèmes.
- [ ] **Barre de modules** : Données du projet, Planification, Cartes, Scénario, Statistiques ; icône dossier.
- [ ] **Générique** (17C) : blocs repliés par défaut ; boutons « Tout réduire » / « Tout déployer » ; l'état est gardé après redémarrage.
- [ ] **Visuel d'accueil et icône** (17F) : voir 1.3.

Remarque : …

---

## 10. Lot 2 des retours d'usage (18C-1 à 18C-5)

**Données du projet (18C-1)**

- [ ] Les 10 rubriques sont dans l'ordre : Page de titre, Log line, Synopsis, Personnages, Lieux, Documents, Générique, Pitch, Tag line, Note d'intention. Essayez 3 thèmes.
- [ ] **Page de titre** modifiée dans Données du projet : visible dans l'éditeur du scénario et dans le PDF, et inversement.
- [ ] Un projet existant s'ouvre sans qu'aucun fichier ne change.

**Synopsis, pitch, note d'intention (18C-2)**

- [ ] Écrivez un synopsis avec un titre, du gras, de l'italique et une ligne (barre d'outils et `⌘B`, `⌘I`) : l'affichage est mis en forme ; `neoscenar/synopsis.md` contient le Markdown attendu.
- [ ] Ouvrez `pitch.md` dans Obsidian, modifiez, revenez dans NeoScenar : le changement est visible.
- [ ] Les trois documents sont indépendants ; rien n'est écrit tant que vous n'avez pas tapé.

**Log line et tag line (18C-3)**

- [ ] Ajoutez trois log lines, retenez la 2ᵉ : `neoscenar/log-line.md` a `## Version 2 (retenue)`.
- [ ] Retenez la 3ᵉ : la 2ᵉ est décochée.
- [ ] Supprimez une version : confirmation si elle n'est pas vide, renumérotation, la retenue reste la bonne.
- [ ] Un fichier écrit à la main dans Obsidian est relu sans perte.

**Fenêtre d'export PDF (18C-4)**

- [ ] Cases : Page de titre, Scénario, Synopsis, Pitch, Note d'intention. Un document vide est grisé (« Document vide »). Rien de coché : « Rien à exporter », Enregistrer grisé.
- [ ] **Scénario seul** : PDF identique à celui de la section 6.
- [ ] **Synopsis + note d'intention sans scénario** : deux documents, chacun sur une nouvelle page, titre en majuscules, gras / italique / ligne bien rendus.
- [ ] **Log line et tag line retenues** : tag line en italique puis log line, centrées sur la page de titre du PDF, **absentes** du fichier `.fountain`.
- [ ] Ordre dans le PDF : titre, synopsis, pitch, note d'intention, scénario.
- [ ] Les cases sont retrouvées à la réouverture de la fenêtre.

**Plan de tournage : suggestions (18C-5)**

- [ ] Une scène où l'action cite « Paul entre » sans dialogue de PAUL : PAUL est proposé dans « Suggestions » ; le bouton **+** l'ajoute aux muets, il disparaît des suggestions ; annulable.
- [ ] Un personnage qui parle dans la scène n'est jamais proposé ; « Paul » ne trouve pas « Paulette ».

Remarque : …

---

## 11. Lot 2 : présents en plus (18C-6)

- [ ] **« Présents en plus »** : j'ajoute « Marc — figurant » au jour 2 : visible dans la colonne (nom + rôle), dans le PDF du plan de tournage (ligne « Présents en plus : ») et dans l'`.ics` (description du jour : « Présents en plus : Marc — figurant »).
- [ ] Après redémarrage, la ligne est toujours là ; un ancien projet s'ouvre sans changement.
- [ ] Je modifie le nom ou le rôle (en quittant le champ), puis je supprime la ligne : chaque action s'annule avec Cmd + Z.

Remarque : …

---

## Quand tout est coché

- Envoyez-moi les remarques et les captures. Je corrige.
- Quand toutes les cases sont cochées sur l'iMac (ou leurs défauts corrigés), **18D est validée**. Suite : 18E (chez la collègue, puis Mac de l'école).
