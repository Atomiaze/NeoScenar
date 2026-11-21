# Essais 16D — Windows et Ubuntu

Liste à cocher, à faire à côté du PC, dans l'ordre. Chaque case dit **ce que vous devez voir**.

- Cochez une case seulement si vous voyez exactement cela.
- Si ce n'est pas le cas, notez ce que vous voyez à la ligne « Remarque » et prenez une capture d'écran (Windows : touche Windows + Maj + S ; Ubuntu : touche Impr. écran).
- À la fin, envoyez-moi les remarques et les captures. Je corrige, et on refait seulement les cases en échec.
- L'application n'est pas signée. Un avertissement au premier lancement est **normal** : c'est la case 1.2 / 2.2.

Version essayée : **0.1.0** (brouillon de Release `v0.1.0`, non publié).

---

## 0. Avant de partir (sur le Mac)

- [ ] **Préparer le projet d'essai.**
  1. Dans NeoScenar : « Nouveau projet… », nom `Film essai 16D`. Voyez « Dossier créé : Film_essai_16D ».
  2. Fermez NeoScenar.
  3. Copiez `packages/fountain/tests/exemples/le-dernier-bus.fountain` sur `Film_essai_16D/neoscenar/scenario.fountain` (remplacez le fichier).
  4. Rouvrez le projet. Voyez : « Scènes : 9 · 6:16 » et « Page 1 / 7 ».
  5. Dans Cartes, ajoutez un plan à la scène S_0001. Dans Planification, ajoutez une tâche « Tester Windows » avec une échéance. Faites « Fichier ▸ Versions… » et enregistrez une version « Départ Mac ».
  6. Fermez le projet.
- [ ] **Copier le dossier `Film_essai_16D` entier sur une clé USB.**
- [ ] **Construire l'extension Blender** : `npm run build:addon`. Copiez `dist/addon/storyboard_plans-<version>.zip` sur la clé.
- [ ] **Relever les traits de page sur le Mac** : ouvrez le projet, parcourez le Scénario. Le trait de la page 2 est avant « LA MÈRE (V.O.) », puis INÈS (page 3), ÉLIOTT (4), LE CAISSIER (5), ÉLIOTT (6), « INT. MAISON D'INÈS - NUIT » (7). Le PC doit donner **la même liste**.

---

## 1. Windows

Idéalement dans un **compte standard** (sans droit administrateur), comme à l'école.

### 1.1 Téléchargement

- [ ] **Ouvrir `https://github.com/Atomiaze/NeoScenar/releases`**, connecté à votre compte GitHub. Voyez le brouillon « NeoScenar v0.1.0 » avec 5 fichiers. Un brouillon n'est visible que de vous : sans connexion, la page est vide.
- [ ] **Télécharger** `NeoScenar-0.1.0-windows-installation.exe` et `NeoScenar-0.1.0-windows-portable.exe`.
- [ ] **Si le navigateur dit que le fichier est « rarement téléchargé »** : choisissez « Conserver ». Notez le message exact.

Remarque : …

### 1.2 Installation (sans droit administrateur)

- [ ] **Double-clic sur `…-windows-installation.exe`.** Voyez « Windows a protégé votre ordinateur » (SmartScreen). Cliquez « Informations complémentaires », puis « Exécuter quand même ».
- [ ] **Aucune demande de mot de passe administrateur**, aucun bouclier jaune et bleu.
- [ ] **L'installeur est en français.** Il ne propose pas « pour tous les utilisateurs ». Il propose de choisir le dossier.
- [ ] **Dossier proposé** : un dossier de votre compte (normalement `C:\Users\<vous>\AppData\Local\Programs\NeoScenar`). Notez-le.
- [ ] **Terminer l'installation.** Voyez un raccourci « NeoScenar » sur le Bureau et dans le menu Démarrer.
- [ ] **Version portable** : copiez `…-windows-portable.exe` sur le Bureau, double-clic. Même avertissement SmartScreen. Le premier affichage prend **quelques secondes de plus** : c'est normal. NeoScenar s'ouvre sans rien installer.

Remarque : …

### 1.3 Premier lancement

- [ ] **Écran d'accueil** : le visuel NS à gauche ; à droite « Nouveau projet… » et « Ouvrir un projet… » ; en bas « Créé par David Delepinne · version 0.1.0 ».
- [ ] **Menus** : Fichier, Édition, Affichage, Fenêtre, Aide. **Pas de menu « NeoScenar ».**
  - « Réglages… » est dans **Édition**.
  - « À propos de NeoScenar » est dans **Aide**.
  - « Quitter » est dans **Fichier**.
- [ ] **Raccourcis** : les menus montrent `Ctrl`, jamais `Cmd` ni `⌘`. Les textes parlent de l'« Explorateur de fichiers », jamais du Finder.
- [ ] **Aide ▸ À propos de NeoScenar** : nom, version 0.1.0, auteur, licence, lien GitHub. **Cliquez le lien** : le navigateur s'ouvre sur la page du dépôt. (Ce clic n'est jamais testé automatiquement.)
- [ ] **Fermer avec la croix** : la fenêtre se ferme et NeoScenar disparaît de la barre des tâches (aucun processus ne reste dans le Gestionnaire des tâches).

Remarque : …

### 1.4 Les essais

**A. Créer, écrire, fermer, rouvrir**

- [ ] « Nouveau projet… », nom `Essai Windows` : voyez « Dossier créé : Essai_Windows ». Choisissez un emplacement dans Documents.
- [ ] **Écrivez** quelques scènes dans le Scénario, avec des accents (« été », « Éliott »). Voyez « Enregistré » en haut à droite.
- [ ] **Fermez le projet, puis l'application, puis rouvrez-la.** Le projet est dans « Projets récents ». Rouvrez-le : votre texte est là, accents compris.

**B. Double-clic sur un `.neoscenar`**

- [ ] Fermez NeoScenar. Dans l'Explorateur de fichiers, **double-clic sur `Essai_Windows.neoscenar`** : NeoScenar s'ouvre **directement sur ce projet**. (Version installée seulement : le portable ne crée pas cette association.)
- [ ] NeoScenar étant **déjà ouvert**, double-clic sur un autre `.neoscenar` : **aucune deuxième fenêtre**. Le projet s'ouvre dans la fenêtre existante.

**C. Projet venu du Mac (clé USB)**

- [ ] Copiez `Film_essai_16D` de la clé dans `Documents\Mes films été` (un dossier avec espace et accent, exprès).
- [ ] Ouvrez-le. Voyez « Scènes : 9 · 6:16 » et « Page 1 / 7 », la même liste de cartes S_0001 à S_0009, le plan de S_0001, la tâche « Tester Windows », la version « Départ Mac ». **Aucun message d'erreur.**
- [ ] **Traits de page** : mêmes débuts de page que sur le Mac (INÈS en page 3, ÉLIOTT en 4 et 6…). Le trait ne coupe jamais une lettre ni un É.
- [ ] **Modifiez** : ajoutez une phrase d'action dans la scène 1, un deuxième plan à S_0001, une tâche « Fait sous Windows ». Fermez le projet.
- [ ] **Rendez-le au Mac** : copiez le dossier modifié sur la clé (sous le nom `Film_essai_16D_retour`) → étape H.

**D. Exports**

- [ ] **Fichier ▸ Exporter le scénario en PDF…** : l'aperçu du vrai PDF s'affiche dans la fenêtre. Enregistrez. Le fichier est dans `neoscenar\exports`. Ouvrez-le : 8 pages (titre + 7), police Courier, titre « LE DERNIER BUS » souligné.
- [ ] **Exporter le storyboard en PDF…** : aperçu, puis enregistrement. 3 plans par page au maximum, case dessin vide ou vignette.
- [ ] **Exporter le planning…** : un PDF « Planning » et un fichier `.ics`. Ouvrez le `.ics` dans votre agenda (Outlook, Google Agenda…) : un événement « journée entière » à la date de l'échéance.
- [ ] **Exporter le générique…** : des PNG sur fond transparent, dans `08_Graphisme\Generique`. Ouvrez-en un : les lettres sont blanches, sans halo sombre.
- [ ] **Les noms des fichiers** n'ont ni accent ni espace, sauf le dossier de projet que vous avez choisi vous-même.

**E. Correcteur, réseau coupé (16B)**

- [ ] **Notez d'abord** : le français est-il installé dans Windows ? (Paramètres ▸ Heure et langue ▸ Langue et région.) Réponse : oui / non.
- [ ] **Coupez le réseau** : Wi-Fi coupé et câble débranché (mode Avion).
- [ ] **Relancez NeoScenar.** Dans le Scénario, tapez « maisonn » dans une action. Le mot est **souligné en rouge**.
- [ ] **Clic droit sur le mot** : la correction « maison » est proposée. Cliquez-la : le mot est corrigé.
- [ ] **Tapez « Zorglubesque »**, clic droit ▸ « Ajouter au dictionnaire ». Le mot n'est plus souligné.
- [ ] **Fermez et relancez NeoScenar** (réseau toujours coupé). « Zorglubesque » n'est toujours pas souligné, « maisonn » l'est encore.
- [ ] **Rebranchez le réseau.**

**F. Police et traits de page (16B)**

- [ ] **La page du scénario est en Courier Prime** (lettres à chasse fixe, ressemblant à une machine à écrire), jamais en Times ou Arial.
- [ ] **Les 6 traits de page** tombent aux mêmes lignes que sur le Mac (voir 0.). Notez toute différence, même d'une ligne.

**G. Export vers Blender 4.5** (si Blender 4.5 est installé sur ce PC)

- [ ] **Dans Blender** : Édition ▸ Préférences ▸ Extensions ▸ menu ⌄ ▸ « Installer à partir du disque… », choisissez le `.zip` de la clé. L'extension « Storyboard – Gestion des plans » est activée.
- [ ] **Dans NeoScenar** : « Fichier ▸ Exporter vers Blender… ». Cochez « Ouvrir dans Blender après l'export ».
- [ ] **NeoScenar trouve Blender seul**, ou affiche « Choisir Blender 4.5… ». Cherchez `blender.exe` : le choix est ensuite mémorisé.
- [ ] **Blender s'ouvre** et l'import démarre seul. Les plans apparaissent. Un fichier `.blend` est créé dans `06_Blender`.
- [ ] **Si Blender vient du Microsoft Store** : NeoScenar le dit et conseille l'installeur de blender.org. **Si Blender vient de Steam** : il est trouvé quand même. Notez ce que vous avez.

**H. Retour au Mac** (plus tard, sur le Mac)

- [ ] **Copiez `Film_essai_16D_retour`** sur le Mac, à côté de l'original.
- [ ] **Ouvrez-le.** La phrase, le deuxième plan et la tâche « Fait sous Windows » sont là. La barre de titre affiche « Film_essai_16D_retour — NeoScenar ». Aucun message d'erreur. (NeoScenar lui donne en silence un nouvel identifiant : c'est voulu, c'est une copie.)

**I. Désinstallation** (en dernier)

- [ ] **Paramètres ▸ Applications ▸ NeoScenar ▸ Désinstaller.** Aucun mot de passe administrateur. Vos projets restent intacts.

**J. Autocomplétion de l'en-tête de scène** (retours d'usage, lot 1, 17D)

- [ ] **Dans « Cartes »**, sélectionnez une scène et tapez « in » dans « En-tête de scène » : INT. et INT./EXT. sont proposés. Entrée accepte, puis les lieux du projet s'ouvrent. Après « - », les moments (JOUR, NUIT…) sont proposés, jamais un lieu terminé par un tiret.
- [ ] **Échap** ferme la liste sans rien effacer. **Rien n'est écrit dans le scénario avant la validation** (perte du focus, ou Entrée liste fermée) : aucune fiche Lieux parasite (« IN »…) n'apparaît pendant la frappe.

**K. Vocabulaire des plans** (retours d'usage, lot 1, 17E)

- [ ] **Menu NeoScenar ▸ Réglages**, section « Vocabulaire des plans » : ajoutez « Plan drone » (avec une définition) dans « Mouvement de caméra ». Dans « Cartes », la fiche d'un plan le propose après les entrées du cours, avec sa définition en infobulle.
- [ ] **Supprimez l'entrée** : les plans qui l'utilisaient l'affichent toujours. Un doublon (« plan DRONE ») est refusé avec un message. Les entrées du cours n'ont ni Renommer ni Supprimer.
- [ ] **Fermez puis rouvrez NeoScenar** : les entrées personnelles sont toujours là.

Remarque : …

---

## 2. Ubuntu

### 2.1 Téléchargement

- [ ] **Ouvrir `https://github.com/Atomiaze/NeoScenar/releases`**, connecté à votre compte GitHub. Voyez le brouillon « NeoScenar v0.1.0 ».
- [ ] **Télécharger** `NeoScenar-0.1.0-linux.deb` et `NeoScenar-0.1.0-linux.AppImage`.

Remarque : …

### 2.2 Installation du `.deb` (version principale)

- [ ] **Double-clic sur le `.deb`.** Une fenêtre d'installation s'ouvre (« Installer » ou App Center). Installez.
- [ ] **Si le double-clic ne marche pas**, dans un terminal, dans le dossier Téléchargements :
  ```
  sudo apt install ./NeoScenar-0.1.0-linux.deb
  ```
  Voyez la fin de l'installation sans erreur. (Le `.deb` demande le mot de passe administrateur : c'est normal sur Ubuntu. Sur un PC verrouillé, c'est l'AppImage qui servira.)
- [ ] **NeoScenar apparaît dans « Afficher les applications »** avec l'icône NS bleue. Cliquez : il s'ouvre.
- [ ] **Dans le dock**, la fenêtre porte **l'icône NS**, pas une icône générique.

Remarque : …

### 2.3 L'AppImage (secours, sans installation)

- [ ] **Clic droit sur le fichier ▸ Propriétés ▸ Permissions ▸ « Autoriser l'exécution »**, ou dans un terminal : `chmod +x NeoScenar-0.1.0-linux.AppImage`.
- [ ] **Double-clic.** NeoScenar s'ouvre. (Fermez d'abord la version installée.)
- [ ] **S'il ne s'ouvre pas**, notez le **message exact**. Deux cas connus sur Ubuntu 22.04 et suivants :
  - un message parle de `libfuse2` : tapez `sudo apt install libfuse2t64` (ou `libfuse2` sur Ubuntu 22.04) et recommencez ;
  - un message parle du « sandbox » ou d'AppArmor (Ubuntu 24.04) : **ne contournez pas**, ne tapez pas `--no-sandbox`. Envoyez-moi le message, on le règlera ensemble.

Remarque : …

### 2.4 Premier lancement

- [ ] **Écran d'accueil** : le visuel NS à gauche ; « Nouveau projet… », « Ouvrir un projet… » à droite ; en bas « Créé par David Delepinne · version 0.1.0 ».
- [ ] **Menus** : Fichier, Édition, Affichage, Fenêtre, Aide. **Pas de menu « NeoScenar ».** « Réglages… » est dans Édition, « À propos de NeoScenar » dans Aide, « Quitter » dans Fichier.
- [ ] **Raccourcis** : `Ctrl`, jamais `Cmd` ni `⌘`. Les textes parlent du « gestionnaire de fichiers », jamais du Finder.
- [ ] **À propos** : le lien GitHub ouvre le navigateur.
- [ ] **Fermer avec la croix** : l'application se ferme complètement (rien ne reste dans le moniteur système).

Remarque : …

### 2.5 Les essais

Faites les mêmes essais A à I que sous Windows (voir 1.4), avec ces différences :

- [ ] **A. Créer, écrire, fermer, rouvrir** : comme sous Windows.
- [ ] **B. Double-clic sur un `.neoscenar`** (version `.deb` seulement) : le gestionnaire de fichiers « Fichiers » ouvre NeoScenar sur ce projet. Si Ubuntu propose « Ouvrir avec », choisissez NeoScenar et notez-le. NeoScenar déjà ouvert : **aucune deuxième fenêtre**.
- [ ] **C. Projet venu du Mac** : copiez `Film_essai_16D` dans `~/Documents/Mes films été`. Mêmes vérifications que sous Windows (9 scènes, 7 pages, traits de page identiques au Mac, plan, tâche, version). Sous Linux, **les majuscules comptent** : notez tout fichier « introuvable » ou en double.
- [ ] **D. Exports** : PDF du scénario (8 pages), du storyboard, du planning, `.ics`, générique PNG. Les mêmes fichiers qu'ailleurs, dans les mêmes dossiers.
- [ ] **E. Correcteur, réseau coupé** (Paramètres ▸ Wi-Fi coupé, câble débranché) : « maisonn » est souligné, le clic droit propose « maison », « Ajouter au dictionnaire » retient « Zorglubesque » après relance. Rebranchez le réseau ensuite.
- [ ] **F. Police et traits de page** : Courier Prime, mêmes traits de page que sur le Mac.
- [ ] **G. Blender 4.5** (téléchargé sur blender.org, ou installé par snap) : « Exporter vers Blender… » le trouve, ou « Choisir Blender 4.5… » fonctionne et le choix est mémorisé. Si Blender vient de **Flatpak**, NeoScenar le signale et conseille la version de blender.org. L'extension s'installe comme sous Windows.
- [ ] **H. Retour au Mac** : même vérification qu'au 1.4 (H) avec le dossier modifié sous Ubuntu.
- [ ] **I. Désinstallation** : `sudo apt remove neoscenar` (ou « Logiciels » ▸ Désinstaller). Vos projets restent intacts.
- [ ] **J. Autocomplétion de l'en-tête de scène** : comme sous Windows (voir 1.4, J).
- [ ] **K. Vocabulaire des plans** : comme sous Windows (voir 1.4, K).

Remarque : …

---

## 3. Facultatif : les tests de développement (deuxième séance)

Sur chaque PC, il faut d'abord installer **Node.js 24** (nodejs.org, version LTS) et **Git**. Puis, dans un terminal :

```
git clone https://github.com/Atomiaze/NeoScenar.git
cd NeoScenar
npm ci
npm test
npm run pilote -- scripts/pilotage/essais/correcteur-police.mjs
```

- [ ] **`npm test`** : voyez « Tests 1628 passed » (ou un peu plus si on a ajouté des tests).
- [ ] **`correcteur-police.mjs`** : voyez « Essai réussi. » et « traits de page relevés : pages 2 à 7 ».
- [ ] **Autres essais, au choix** : `export-pdf`, `storyboard-export`, `statistiques`, `versions`, `generique-export`, `planning-export`, `projet-copie`. Voyez « Essai réussi. » à la fin de chacun.

Remarque : …

---

## Quand tout est coché

- Envoyez-moi les remarques et les captures. Je corrige.
- Quand toutes les cases des deux PC sont cochées, **16D est validée**. Il restera 16E (guide d'installation pour les élèves), puis la publication du brouillon `v0.1.0`, que vous ferez vous-même.
