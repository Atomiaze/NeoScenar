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

- [x] **Préparer le projet d'essai.** ✅ 2026-11-22
  1. Dans NeoScenar : « Nouveau projet… », nom `Film essai Mac`. Voyez « Dossier créé : Film_essai_Mac ».
  2. Fermez NeoScenar.
  3. Copiez `packages/fountain/tests/exemples/le-dernier-bus.fountain` sur `Film_essai_Mac/neoscenar/scenario.fountain` (remplacez le fichier).
  4. Rouvrez le projet. Voyez : « Scènes : 9 · 6:16 » et « Page 1 / 7 ».
- [x] **Construire l'extension Blender** (si on ne l'a pas) : `dist/addon/storyboard_plans-<version>.zip` existe. Sinon, me le dire : je la construis. ✅ 2026-11-22
- [x] **Blender 4.5** est installé sur l'iMac (nécessaire pour la section 7). ✅ 2026-11-22

---

## 1. Installation et premier lancement

### 1.1 Le `.dmg`

- [x] **Double-clic sur `dist/NeoScenar-0.1.0-mac.dmg`.** Une fenêtre s'ouvre avec l'icône NeoScenar et le dossier Applications. ✅ 2026-11-22
- [x] **Glissez NeoScenar dans Applications.** La copie se termine sans erreur ni mot de passe. ✅ 2026-11-22
- [x] **Éjectez le disque** (bouton ⏏ dans le Finder). ✅ 2026-11-22

### 1.2 Premier lancement (avertissement d'Apple)

*Le `.dmg` vient d'être construit sur ce Mac : macOS ne le met pas en quarantaine, l'avertissement peut donc ne pas apparaître. Il sera vérifié sur un fichier téléchargé en 18E.*

- [x] **Ouvrez NeoScenar depuis Applications.** Notez ce que vous voyez : ouverture directe, ou avertissement d'Apple (message exact). ✅ 2026-11-22
- [ ] **Si avertissement** : passez-le (clic droit ▸ Ouvrir, ou Réglages Système ▸ Confidentialité et sécurité ▸ « Ouvrir quand même »). Notez quelle méthode a marché et si un mot de passe est demandé.

Remarque : Rien n'apparait, mais ce n'est pas la première fois que j'autorise un neoscenar, le programme démarre tout à fait normalement

### 1.3 Premier écran

- [x] **Icône** : l'icône du Dock, du Finder et de la fenêtre montre le logo « NS » (rond, orange et vert), pas l'icône d'Electron. ✅ 2026-11-22
- [x] **Écran d'accueil** : le visuel NS entier (jamais rogné) à gauche ; à droite « Nouveau projet… » et « Ouvrir un projet… » ; en bas « Créé par David Delepinne · version 0.1.0 ». Essayez en petite et en grande fenêtre. ✅ 2026-11-22
- [x] **Menus** : NeoScenar, Fichier, Édition, Affichage, Fenêtre, Aide. « Réglages… » et « À propos de NeoScenar » sont dans le menu **NeoScenar**. ✅ 2026-11-22
- [x] **Raccourcis** : les menus montrent `⌘`. Les textes parlent du « Finder ». ✅ 2026-11-22
- [x] **À propos** : nom, version 0.1.0, auteur, licence, lien GitHub. **Cliquez le lien** : le navigateur s'ouvre sur la page du dépôt. (Ce clic n'est jamais testé automatiquement.) ✅ 2026-11-22
- [x] **Cmd + Q** quitte complètement l'application (plus de point sous l'icône du Dock). ✅ 2026-11-22

Remarque : …

---

## 2. Créer, écrire, fermer, rouvrir

- [x] « Nouveau projet… », nom `Essai Mac` : voyez « Dossier créé : Essai_Mac ». Choisissez un emplacement dans Documents. ✅ 2026-11-22
- [x] **Écrivez** quelques scènes dans le Scénario, avec des accents (« été », « Éliott »). Voyez « Enregistré » en haut à droite. ✅ 2026-11-22
- [x] **Fermez le projet, puis l'application, puis rouvrez-la.** Le projet est dans « Projets récents ». Rouvrez-le : votre texte est là, accents compris. ✅ 2026-11-22
- [ ] **Les noms des fichiers créés** par l'application n'ont ni accent ni espace (dans le Finder, regardez le dossier `neoscenar/`). **Exception voulue : les fiches Personnages et Lieux** gardent le nom écrit dans le scénario (`ÉLIOTT.md`) ; le lien fiche ↔ personnage marche que le nom soit écrit en NFD (Mac) ou NFC (Windows).

Remarque  le fichier personnage ÉLIOTT.md a un accent.

---

## 3. Double-clic sur un `.neoscenar`

- [x] NeoScenar fermé, **double-clic sur `Essai_Mac.neoscenar`** dans le Finder : NeoScenar s'ouvre **directement sur ce projet**. ✅ 2026-11-22
- [x] NeoScenar déjà ouvert, double-clic sur un autre `.neoscenar` : **aucune deuxième fenêtre**, le projet s'ouvre dans la fenêtre existante. ✅ 2026-11-22
- [x] **Glisser un `.neoscenar` sur l'icône du Dock** : même résultat. ✅ 2026-11-22

Remarque : …

---

## 4. Les modules

Ouvrez `Film_essai_Mac` (9 scènes) et parcourez chaque module.

- [x] **Scénario** : écriture, saisie semi-automatique des personnages et lieux, saut de page (le trait ne coupe jamais une lettre ni un É), mode révision, recherche. Page 1 / 7. ✅ 2026-11-22
- [x] **Traits de page** : le trait de la page 2 est avant « LA MÈRE (V.O.) », puis INÈS (page 3), ÉLIOTT (4), LE CAISSIER (5), ÉLIOTT (6), « INT. MAISON D'INÈS - NUIT » (7). Essayez 2 thèmes et 2 tailles de texte. ✅ 2026-11-22
- [x] **Cartes** : S_0001 à S_0009 ; ajout d'un plan à S_0001 ; déplacement d'une carte ; annuler / rétablir. ✅ 2026-11-22
- [x] **Découpage / plans** : numérotation des plans, vignette dessinée (outil de dessin), fiche d'un plan. ✅ 2026-11-22
- [x] **En-tête dans une carte** (17D) : taper « INT. » dans « En-tête » propose les lieux ; Échap ferme la liste sans rien effacer ; rien n'est écrit dans le scénario avant la validation. ✅ 2026-11-22
- [x] **Storyboard** : planches, 3 plans par page au maximum. ✅ 2026-11-22
- [x] **Recherches** : fiches Personnages et Lieux, liens avec le scénario, renommage, Documents. ✅ 2026-11-22
- [x] **Planification** : liste, ligne du temps, plan de tournage ; ajouter une tâche « Tester Mac » avec une échéance. ✅ 2026-11-22
- [x] **Statistiques** : chiffres cohérents avec le scénario. ✅ 2026-11-22
- [x] **Générique** : formulaire, aperçu. ✅ 2026-11-22
- [x] **Thèmes** : changez dans Réglages ; les 7 thèmes s'appliquent, texte lisible. ✅ 2026-11-22
- [x] **Correcteur** : « maisonn » est souligné en rouge ; clic droit propose « maison » ; « Ajouter au dictionnaire » retient « Zorglubesque ». ✅ 2026-11-22
- [x] **Police** : la page du scénario est en Courier Prime, jamais en Times ou Arial. ✅ 2026-11-22
- [x] **Vocabulaire des plans** (17E) : Réglages ▸ « Vocabulaire des plans » : ajoutez « Plan drone » dans « Mouvement de caméra » ; la fiche d'un plan le propose. Supprimez l'entrée : les plans qui l'utilisaient l'affichent toujours. Un doublon est refusé. Redémarrez : les entrées sont toujours là. ✅ 2026-11-22

Remarque : dans scénario, le trait de saut de page passe sur les accents.

---

## 5. Versions

- [x] **Fichier ▸ Versions…** : enregistrez une version « Départ Mac ». ✅ 2026-11-22
- [x] Modifiez le scénario, puis **restaurez** « Départ Mac » : le texte d'avant revient, les plans aussi. ✅ 2026-11-22
- [x] Synopsis, pitch, note d'intention, log line et tag line **ne sont pas** dans les versions (décision voulue). ✅ 2026-11-22

Remarque : …

---

## 6. Exports

Faites chaque export, puis ouvrez le fichier dans Aperçu.

- [x] **Exporter en PDF…** (scénario seul) : l'aperçu s'affiche dans la fenêtre ; enregistrez ; le fichier est dans `neoscenar/exports`. 8 pages (titre + 7), Courier, titre « LE DERNIER BUS » souligné, numéros de page en haut à droite à partir de la page 2 du scénario. ✅ 2026-11-22
- [x] **Numéros de scène du PDF (à revérifier).** Dans la fenêtre d'export, **sans** cocher « Numéroter 1, 2, 3 » : une scène sans `#n#` écrit dans le scénario porte le numéro de **sa place dans le texte** (comportement voulu, spec 9). Avec la case cochée : 1, 2, 3 dans l'ordre. Dites-moi si ce comportement vous convient ou si une scène non numérotée doit apparaître sans numéro. ✅ 2026-11-22
- [x] **PDF du storyboard** : aperçu, puis enregistrement. « N° de page : 1 / N » partout, 3 plans par page au maximum, case dessin vide ou vignette. ✅ 2026-11-22
- [x] **Planning** : un PDF « Planning » et un fichier `.ics`. Ouvrez le `.ics` dans Calendrier : un événement « journée entière » à la date de l'échéance. ✅ 2026-11-22
- [x] **Plan de tournage** : PDF lisible. ✅ 2026-11-22
- [x] **Générique** : des PNG sur fond transparent dans `08_Graphisme/Generique`. Lettres blanches, sans halo sombre. ✅ 2026-11-22
- [x] **Les noms des fichiers exportés** n'ont ni accent ni espace. ✅ 2026-11-22

Remarque : …

---

## 7. Export vers Blender 4.5

- [x] **Dans Blender** : Édition ▸ Préférences ▸ Extensions ▸ ⌄ ▸ « Installer à partir du disque… », choisissez `dist/addon/storyboard_plans-<version>.zip`. « Storyboard – Gestion des plans » est activée. ✅ 2026-11-22
- [x] **Dans NeoScenar** : « Fichier ▸ Exporter vers Blender… », cochez « Ouvrir dans Blender après l'export ». ✅ 2026-11-22
- [x] **NeoScenar trouve Blender seul**, ou affiche « Choisir Blender 4.5… » (cherchez `Blender.app`) : le choix est mémorisé. ✅ 2026-11-22
- [x] **Blender s'ouvre** et l'import démarre seul. Les plans apparaissent. Un fichier `.blend` est créé dans `06_Blender`. ✅ 2026-11-22

Remarque : …

---

## 8. Copie du projet sur clé

- [x] **Copiez `Film_essai_Mac` sur une clé USB**, puis de la clé dans `Documents/Mes films été` (dossier avec espace et accent, exprès). ✅ 2026-11-22
- [x] **Ouvrez la copie.** Voyez « Scènes : 9 · 6:16 », « Page 1 / 7 », les cartes S_0001 à S_0009, le plan ajouté, la tâche « Tester Mac », la version « Départ Mac ». **Aucun message d'erreur.** ✅ 2026-11-22
- [x] **Modifiez la copie** (une phrase dans la scène 1) et fermez : l'original n'a pas changé. ✅ 2026-11-22

Remarque : …

---

## 9. Lot 1 des retours d'usage (17A à 17F)

- [x] **Panneau Données du projet** (17B) : panneau indenté, rubrique active en couleur d'accent, lisible sur les 7 thèmes. ✅ 2026-11-22
- [x] **Barre de modules** : Données du projet, Planification, Cartes, Scénario, Statistiques ; icône dossier. ✅ 2026-11-22
- [x] **Générique** (17C) : blocs repliés par défaut ; boutons « Tout réduire » / « Tout déployer » ; l'état est gardé après redémarrage. ✅ 2026-11-22
- [x] **Visuel d'accueil et icône** (17F) : voir 1.3. ✅ 2026-11-22

Remarque : …

---

## 10. Lot 2 des retours d'usage (18C-1 à 18C-5)

**Données du projet (18C-1)**

- [x] Les 10 rubriques sont dans l'ordre : Page de titre, Log line, Synopsis, Personnages, Lieux, Documents, Générique, Pitch, Tag line, Note d'intention. Essayez 3 thèmes. ✅ 2026-11-22
- [x] **Page de titre** modifiée dans Données du projet : visible dans l'éditeur du scénario et dans le PDF, et inversement. ✅ 2026-11-22
- [x] Un projet existant s'ouvre sans qu'aucun fichier ne change. ✅ 2026-11-22

**Synopsis, pitch, note d'intention (18C-2)**

- [x] Écrivez un synopsis avec un titre, du gras, de l'italique et une ligne (barre d'outils et `⌘B`, `⌘I`) : l'affichage est mis en forme ; `neoscenar/synopsis.md` contient le Markdown attendu. ✅ 2026-11-22
- [x] Ouvrez `pitch.md` dans Obsidian, modifiez, revenez dans NeoScenar : le changement est visible. ✅ 2026-11-22
- [x] Les trois documents sont indépendants ; rien n'est écrit tant que vous n'avez pas tapé. ✅ 2026-11-22


**Log line et tag line (18C-3)**

- [x] Ajoutez trois log lines, retenez la 2ᵉ : `neoscenar/log-line.md` a `## Version 2 (retenue)`. ✅ 2026-11-22
- [x] Retenez la 3ᵉ : la 2ᵉ est décochée. ✅ 2026-11-22
- [x] Supprimez une version : confirmation si elle n'est pas vide, renumérotation, la retenue reste la bonne. ✅ 2026-11-22
- [x] Un fichier écrit à la main dans Obsidian est relu sans perte. ✅ 2026-11-22

**Fenêtre d'export PDF (18C-4)**

- [x] Cases : Page de titre, Scénario, Synopsis, Pitch, Note d'intention. Un document vide est grisé (« Document vide »). Rien de coché : « Rien à exporter », Enregistrer grisé. ✅ 2026-11-22
- [x] **Scénario seul** : PDF identique à celui de la section 6. ✅ 2026-11-22
- [x] **Synopsis + note d'intention sans scénario** : deux documents, chacun sur une nouvelle page, titre en majuscules, gras / italique / ligne bien rendus. ✅ 2026-11-22
- [x] **Log line et tag line retenues** : tag line en italique puis log line, centrées sur la page de titre du PDF, **absentes** du fichier `.fountain`. ✅ 2026-11-22
- [x] Ordre dans le PDF : titre, synopsis, pitch, note d'intention, scénario. ✅ 2026-11-22
- [x] Les cases sont retrouvées à la réouverture de la fenêtre. ✅ 2026-11-22

**Plan de tournage : suggestions (18C-5)**

- [x] Une scène où l'action cite « Paul entre » sans dialogue de PAUL : PAUL est proposé dans « Suggestions » ; le bouton **+** l'ajoute aux muets, il disparaît des suggestions ; annulable. ✅ 2026-11-22
- [x] Un personnage qui parle dans la scène n'est jamais proposé ; « Paul » ne trouve pas « Paulette ». ✅ 2026-11-22

Remarque : …

---

## 11. Lot 2 : présents en plus (18C-6)

- [x] **« Présents en plus »** : j'ajoute « Marc — figurant » au jour 2 : visible dans la colonne (nom + rôle), dans le PDF du plan de tournage (ligne « Présents en plus : ») et dans l'`.ics` (description du jour : « Présents en plus : Marc — figurant »). ✅ 2026-11-22
- [x] Après redémarrage, la ligne est toujours là ; un ancien projet s'ouvre sans changement. ✅ 2026-11-22
- [x] Je modifie le nom ou le rôle (en quittant le champ), puis je supprime la ligne : chaque action s'annule avec Cmd + Z. ✅ 2026-11-22

Remarque : …

---

## 12. Lot 3 (18C-7 à 18C-11)

### Genre des personnages et crédits (18C-7)

- [ ] Fiche personnage : le menu « Genre » propose, dans l'ordre, Femme, Homme, Non-binaire, Genre Fluide, Agenre, Neutre, Non défini. Une fiche existante affiche « Non défini » et son fichier `.md` n'est pas réécrit à l'ouverture.
- [ ] Choisir « Femme » écrit `genre: Femme` dans le `.md` ; une valeur écrite à la main dans Obsidian (« Autre ») reste affichée dans le menu.
- [ ] « À propos » et l'accueil montrent les trois crédits : Créé par David Delepinne, Module Révision Gabriel Delepinne, Soutien technique Mathilde Gossart.

### Panneau des révisions (18C-8)

- [ ] Scénario > **Révision** : le panneau « Révisions (n) » s'ouvre à droite ; une ligne par marque, dans l'ordre du texte : pastille, `S_00xx`, début du texte surligné, commentaire (deux lignes au plus, texte complet au survol).
- [ ] Clic sur une ligne : le texte surligné est sélectionné et visible ; on peut taper aussitôt sans cliquer dans la page.
- [ ] Je surligne, je tape dans un texte surligné, puis « Effacer toutes les marques » : le panneau suit (« Aucune révision ») ; Cmd + Z fait revenir les lignes.
- [ ] « Masquer le panneau » : le choix est gardé pour ce projet après fermeture et réouverture ; un autre projet garde le panneau affiché.
- [ ] Fenêtre réduite à environ 1280 px de large : le navigateur de scènes se masque tout seul et la page A4 est entière ; en agrandissant la fenêtre, il revient. Rouvert à la main, il reste ouvert jusqu'à la fermeture du mode révision.
- [ ] Le survol d'un texte surligné montre toujours son commentaire.

### Filtre, commentaire, couleur, effacement depuis le panneau (18C-9)

- [ ] Sous le titre du panneau, 4 pastilles avec leur nombre de marques ; une couleur sans marque est grisée et ne réagit pas. Clic sur une pastille : elle s'éteint (contour barré), ses lignes disparaissent, le titre devient « Révisions (affichées / total) ». Les surlignages de la page restent tous visibles.
- [ ] Option + clic sur une pastille : seule cette couleur reste ; Option + clic de nouveau : tout revient. Tout éteint : « Aucune révision pour ces couleurs ».
- [ ] Le filtre reste quand je tape ou après « Effacer toutes les marques » puis Cmd + Z ; il est remis à zéro quand je quitte le mode révision.
- [ ] Au survol d'une ligne (ou avec Tab), un crayon et une poubelle apparaissent. Le crayon ouvre la fenêtre du commentaire préremplie (« Ajouter un commentaire » s'il est vide) ; Maj + Entrée va à la ligne, Entrée enregistre, Échap annule. Vide = commentaire retiré. Cmd + Z annule.
- [ ] Un commentaire sur trois lignes : la bulle du survol et le panneau (deux lignes au plus) montrent les retours à la ligne ; dans Obsidian, la ligne du scénario contient `[[R:jaune|ligne 1 ¶ ligne 2 ¶ ligne 3]]` sur une seule ligne. Le nombre de pages et les traits de page ne bougent pas.
- [ ] Clic sur la pastille d'une ligne : menu des 4 couleurs (l'actuelle cochée) ; une autre couleur garde le commentaire ; Cmd + Z annule.
- [ ] Poubelle : la marque disparaît sans question, le texte reste le même ; Cmd + Z la remet.
- [ ] Pastilles lisibles (allumées et éteintes) dans les 7 thèmes.

### Aide du module Scénario (18C-10)

- [ ] Scénario > **Aide** (à droite de « Révision ») : la fenêtre « Aide — Module Scénario » s'ouvre avec 8 onglets (Éléments, Clavier, Rédiger, Autres éléments, Mise en forme, Simultanés, Numéros, Révision) ; le texte est celui de `aide-scenario.md`, raccourcis avec ⌘. Échap ou « Fermer » la ferment. Lisible dans les 7 thèmes.

### Symboles Fountain au clavier (18C-11)

- [ ] Après une action, Entrée puis `# ACTE 1` : le bandeau d'acte apparaît tout de suite et reste en quittant la ligne ; ACTE 1 apparaît dans le navigateur. Même chose avec `= résumé` (synopsis), `~la la` (paroles), `===` (saut de page), `> FIN <` (centré), `> fondu au noir` (transition, en majuscules en quittant la ligne).
- [ ] Après une transition (`CUT TO:`), Entrée puis `... et puis` : la ligne reste une action en minuscules. Entrée puis `.5 seconde plus tard` : action ; dans Obsidian, la ligne est `!.5 seconde plus tard`, sans numéro de scène.

Remarque : …

## 13. Lot 4 (18C-12 et 18C-13)

### Déplacer les scènes dans le navigateur (18C-12)

- [ ] Dans le navigateur, je fais glisser une scène : un trait de couleur montre où elle va. Au dépôt, la scène change de place dans le navigateur et dans le texte (en-tête, résumé, texte, marques de révision) ; le curseur va sur son en-tête.
- [ ] Déposée entre deux scènes, elle prend un numéro libre (ex. S_0015 entre S_0010 et S_0020), comme une carte déplacée. Dans Cartes : même ordre, la carte a gardé son nom et ses plans, aucune orpheline.
- [ ] Déposée juste sous la ligne d'un acte : elle passe en tête de cet acte. Déposée juste au-dessus de la ligne d'un acte : elle va à la fin de l'acte précédent.
- [ ] Cmd + Z (dans l'éditeur) remet tout en place d'un seul coup, numéro compris.
- [ ] Avec les numéros verrouillés (Cartes), le déplacement est refusé avec le même message que dans les Cartes.
- [ ] Aide > Numéros : la ligne « Pour déplacer une scène… » est là.

Remarque : …

### Scène brouillon (18C-13)

- [ ] Clic droit sur une scène du navigateur > « Marquer comme brouillon » : elle disparaît de la page, reste grisée avec « Brouillon » dans le navigateur, sans durée ; le nombre de scènes et de pages baisse. Cmd + Z la remet.
- [ ] Avec les flèches, le curseur saute la scène brouillon ; taper sur la ligne vide au-dessus ne l'abîme pas.
- [ ] Double-clic sur la scène brouillon : une fenêtre s'ouvre avec son texte (sans la note `[[BROUILLON]]`). J'ajoute une ligne, Valider : la scène reste brouillon et invisible ; Cmd + Z défait la modification d'un coup. Effacer l'en-tête puis Valider : refus avec un message.
- [ ] Cmd + F sur un mot de la scène brouillon : un bandeau le signale, « Ouvrir le brouillon… » ouvre la fenêtre.
- [ ] Cartes : la carte est en pointillés avec « Brouillon » ; dans sa fiche, la case « Brouillon » est cochée et « Modifier le brouillon… » ouvre la fenêtre. Décocher puis Cmd + Z : la scène redevient brouillon.
- [ ] Plan de tournage : la scène est toujours là, avec « Brouillon », mais on ne peut pas la glisser dans un jour (l'infobulle explique pourquoi). Une scène déjà placée dans un jour puis marquée brouillon reste dans le jour avec « Brouillon », mais n'apparaît ni dans le PDF du plan de tournage ni dans le `.ics`. Statistiques et PDF du scénario : elle n'y est pas.
- [ ] Storyboard en PDF… : la scène brouillon n'est pas dans la liste des scènes ni dans le PDF.
- [ ] Bouton « Saut de page » : sur une ligne vide, « === » s'écrit à chaque fois ; sur une ligne écrite, le texte reste et « === » s'ajoute dessous.
- [ ] Dans Obsidian, la note `[[BROUILLON]]` est sous l'en-tête ; l'effacer là-bas et revenir dans NeoScenar : la scène réapparaît.
- [ ] Aide > Numéros : le paragraphe « Une scène brouillon… » est là.

Remarque : …

---
## 14. Lot 5 (sections, 18C-14 et 18C-15)

### Couleur d'une section (18C-14)

- [ ] Clic droit sur une section du navigateur > Couleur : la palette des plans s'ouvre, avec « Automatique ». Je choisis un bleu vif : le bandeau change dans le navigateur, dans l'éditeur et dans Statistiques.
- [ ] Les autres sections gardent leur couleur automatique. Dans Obsidian (ou un éditeur de texte), le fichier contient `[[COULEUR #2463EB]]` juste sous la ligne `# …`, et rien d'autre n'a changé.
- [ ] Cette note n'apparaît pas dans l'éditeur ; le curseur la saute ; elle n'est pas dans le PDF.
- [ ] Cmd + Z remet la couleur d'avant d'un seul coup. « Automatique » retire la note.
- [ ] Je ferme et rouvre le projet : la couleur est gardée.
- [ ] Une note `[[COULEUR #FF0000]]` tapée ailleurs (dans une action) reste une note ordinaire, visible.

### Ajouter, renommer, supprimer, imbriquer (18C-15)

- [ ] Clic droit sur une scène > « Insérer une section au-dessus… » : je tape un titre, Entrée. La section apparaît au-dessus, au niveau de la section qui contient la scène (dans un acte : nouvel acte).
- [ ] Bouton « + Section » en bas du navigateur : la section (niveau 1, `#`) s'ajoute à la fin. Valider est grisé tant que le titre est vide.
- [ ] Double-clic sur une section (ou clic droit > Renommer…) : le titre change ; sa couleur et sa description restent.
- [ ] Au survol d'une section, les flèches ← → remplacent la durée. → imbrique (un `#` de plus), ← désimbrique ; les sous-sections suivent. Pour la première section, ou au-delà de `###`, la flèche est grisée et l'infobulle dit pourquoi.
- [ ] Clic droit > Supprimer la section : les scènes restent ; avec une description, une question est posée d'abord. Les sous-sections gardent leur niveau (un `##` sans `#` au-dessus s'affiche bien).
- [ ] Après chaque action : bandeaux « FIN DE … » justes, numéros des scènes et cartes inchangés, un seul Cmd + Z annule.

Remarque : …


## Quand tout est coché

- Envoyez-moi les remarques et les captures. Je corrige.
- Quand toutes les cases sont cochées sur l'iMac (ou leurs défauts corrigés), **18D est validée**. Suite : 18E (chez la collègue, puis Mac de l'école).
