# Étape 16 — Versions Windows et Linux

Rédigée le 20 novembre 2026 dans le projet Claude. À lire avec `etat-du-projet.md`. Une sous-étape = un plan court, la réalisation, des essais, l'accord de David, le commit.

## Contexte

- Code sans module natif (vérifié : `package.json`), empaquetage par electron-builder 26 (`electron-builder.yml`, Mac seulement aujourd'hui).
- Machines d'essai de David : un PC Windows (Lenovo) et un PC Ubuntu (Lenovo), où il peut installer Node, VS Code et Claude Code.
- **PC de l'école verrouillés** : aucun droit administrateur. Tout doit pouvoir s'installer et tourner dans le compte de l'élève.
- Le code part sur **GitHub en dépôt public** ; les installeurs y sont construits automatiquement (GitHub Actions).
- Ni signature Windows ni signature Apple (pas de budget) : l'avertissement à l'ouverture sera expliqué aux élèves (16E).
- Pas de mise à jour automatique (aucun serveur) : l'élève télécharge la nouvelle version.

## Décisions (20 nov.)

- **Windows** : installeur NSIS **par utilisateur** (installé dans le compte, sans droit administrateur, choix du dossier permis) + une version **portable** (un seul `.exe`, rien à installer). x64 seulement.
- **Linux** : `.deb` en version principale (Ubuntu, bac à sable de Chromium correct) + **AppImage** en secours (pas d'installation ; sur Ubuntu 22.04 et suivants il demande `libfuse2` et peut se heurter aux restrictions AppArmor de Ubuntu 24.04 : à vérifier et à documenter, pas à contourner par `--no-sandbox` sans en parler à David). x64 seulement.
- **Mêmes règles de noms de fichiers sur les trois systèmes** : un nom refusé par Windows est refusé partout (un projet créé sur Mac doit s'ouvrir sur un PC de l'école).
- **Fins de ligne** : lecture tolérante de CRLF (fichiers retouchés dans le Bloc-notes) ; NeoScenar écrit toujours LF.
- Raccourcis et textes : `Cmd` à l'écran sur Mac, `Ctrl` ailleurs ; « Finder » devient « Explorateur de fichiers » (Windows) ou « gestionnaire de fichiers » (Linux).

## 16A — Portabilité du code (sur le Mac)

Audit puis corrections, sans autre machine. Livrer d'abord la liste des points trouvés (courte), puis corriger.

1. Chemins : aucun `/` ou `\` écrit en dur, `path.join` partout ; protocole `neoscenar-image://` et tout passage chemin ↔ URL par `pathToFileURL` / `fileURLToPath` (lettres de lecteur, `\`, espaces, accents). Tests unitaires avec `path.win32` et `path.posix`.
2. Commandes système (`open`, `which`, `xdg-open`…) : remplacées par `shell.openPath` / `shell.showItemInFolder` d'Electron.
3. Noms de fichiers (fiches, documents, versions, exports, générique) : refuser `< > : " / \ | ? *`, les noms réservés (`CON`, `PRN`, `AUX`, `NUL`, `COM1`–`COM9`, `LPT1`–`LPT9`, avec ou sans extension), le point ou l'espace final ; message clair. Vérifier aussi la comparaison sans casse là où deux fichiers ne diffèrent que par la casse (Linux distingue, Windows et Mac non). Chemins de plus de 260 caractères : signalés par un message, pas de plantage.
4. CRLF : `scenario.fountain`, JSON, YAML des fiches lus correctement s'ils contiennent CRLF (et BOM UTF-8). Test : le scénario d'exemple converti en CRLF donne la même pagination et le même PDF.
5. Menus : sur Windows et Linux, pas de menu « NeoScenar » ; « Réglages… » dans Édition, « À propos de NeoScenar » dans Aide, « Quitter » dans Fichier. Raccourcis en `CmdOrCtrl`. Textes de `fr` qui citent `Cmd`, `⌘`, `Option` ou le Finder : choisis selon le système (fonction unique, testée).
6. Lancement de Blender : détection par système, ordre 4.5 d'abord puis la plus récente, choix manuel toujours possible et mémorisé.
   - Windows : `%ProgramFiles%\Blender Foundation\Blender 4.x\blender.exe`, puis `%LOCALAPPDATA%` et Steam (`steamapps\common\Blender`). Pas la version Microsoft Store (non lançable par chemin) : la signaler si c'est la seule.
   - Linux : `blender` dans le PATH, `/snap/bin/blender`, dossiers `blender-4.*` dans `~`, `~/Applications`, `/opt`. Flatpak (`org.blender.Blender`) : seulement si l'essai montre qu'il lit le JSON et écrit le `.blend` dans le dossier du film ; sinon message qui conseille la version de blender.org.
7. Toute autre particularité Mac trouvée (barre de titre, `app.dock`, glisser-déposer de fichiers, double-clic sur `.neoscenar` et ouverture par argument de ligne de commande sous Windows et Linux, une seule instance avec `requestSingleInstanceLock`).

*Décidé le 20 nov. (plan de 16A)* : NeoScenar écrit toujours LF, fiches comprises, sans réécrire un fichier qui n'a pas changé. Noms venus du scénario (fiches créées d'office) : caractères interdits et noms réservés remplacés en silence (`CON` → `CON_.md`) ; noms tapés par l'élève (documents, dossiers, renommage) : refusés avec un message. Blender : 4.5 d'abord ; sinon la plus récente trouvée, acceptée avec l'avertissement « non testée, 4.5 LTS conseillée », sans blocage. Le test CRLF passe sur le scénario d'exemple « Le Dernier Bus » (16C). La fenêtre « À propos de NeoScenar » (cahier des charges, section 10) est hors de 16A ; elle sera faite **avant 16C**. En 16A, « À propos » est seulement placé dans le menu Aide.

*Validé quand* : tests verts, application Mac inchangée (essais existants verts), liste des points traités dans le rapport.

## 16B — Correcteur hors ligne et police du scénario

1. Correcteur : vérifier dans la documentation d'Electron 45 ce qu'il utilise sous Windows (correcteur du système ou Hunspell) et sous Linux (Hunspell téléchargé). Livrer le dictionnaire français Hunspell avec l'application (`resources/dictionnaires/`, source et licence notées dans un `LISEZMOI`, licence compatible GPL-3.0) et l'utiliser sans aucun accès réseau. Langue forcée au français.
2. Police du scénario à l'écran : le Mac utilise Courier. Sur Windows (Courier New) et Linux (souvent Liberation Mono ou Nimbus Mono), vérifier par mesure que le caractère fait 0,6 em et que les traits de page tombent comme sur Mac. Si une police manque ou diffère, embarquer une police libre (OFL) aux mêmes mesures, seulement en secours dans la liste des polices. Les PDF ne changent pas (Courier de pdf-lib).

*Validé quand* : réseau coupé, un mot faux est souligné et corrigé en français sur Ubuntu et Windows ; même page du scénario d'exemple identique à l'écran sur les trois systèmes (traits de page aux mêmes lignes).

*Constaté en 16B (20 nov.)* : la page du scénario utilise déjà **Courier Prime** livrée avec l'application (OFL, 0,6 em mesuré, interligne fixe) : même police sur les trois systèmes, rien à ajouter. Dictionnaire `fr-FR-3-0.bdic` de Chromium (Dicollecte 4.8, MPL 2.0), déposé au lancement là où Chromium le cherche, adresse de téléchargement tournée vers le dossier de l'application. **Windows** : Chromium 156 n'offre plus de réglage pour imposer Hunspell ; il prend le correcteur de Windows si le français y est installé, sinon notre dictionnaire. Les deux sont hors ligne. Les vérifications sur PC (« Validé quand ») se font en 16D (décidé par David).

## 16C — Dépôt public, construction et installeurs

1. **Avant de publier** (décidé par David le 20 nov.) :
   - **Jamais publiés**, ni dans les fichiers ni dans l'historique : le tutoriel KIT du cours, le scénario de référence de KIT (Fountain, PDF, positions des lignes), toute adresse e-mail personnelle de David, les chemins de son dossier personnel. Son **nom** reste permis (À propos, `package.json`, `blender_manifest.toml`).
   - **Historique** : le dépôt public part d'un **historique neuf** (un seul commit de départ). L'historique actuel est gardé tel quel en local (copie du dossier `.git` avant toute opération).
   - **Commits** signés avec l'adresse noreply de GitHub de David (`git config user.email`), jamais une adresse personnelle.
   - **Tests qui utilisaient le scénario de référence** (une trentaine de fichiers) : écrire un scénario d'exemple original, inventé pour le projet et sans données personnelles, avec les mêmes cas (page de titre, actes, dialogues simultanés, suites, notes, numéros de scène…), et y passer ces tests. Les tests de référence contre le PDF de KIT (`reference.test.ts` et ses fichiers) restent **locaux** : listés dans `.git/info/exclude`, jamais envoyés ; les autres tests n'en dépendent plus, donc verts sur GitHub Actions.
   - Dernière vérification avant l'envoi : `git grep` sur tout l'historique avec la liste des mots interdits (gardée en local : `.git/info/mots-interdits.txt`) ne trouve rien ; images vérifiées à l'œil. Liste montrée à David ; rien n'est publié sans son accord.
2. `electron-builder.yml` : cibles `nsis` (par utilisateur : `perMachine: false`, `oneClick: false`, `allowToChangeInstallationDirectory: true`), `portable`, `deb`, `AppImage` ; noms `NeoScenar-<version>-<système>…` ; association `.neoscenar` (Windows et `.deb`) ; icône (`.ico` et PNG Linux tirés de `build/icon.png`). Ressources supplémentaires (`extraResources`) vérifiées sur les trois systèmes.
3. GitHub Actions :
   - à chaque envoi : `npm ci`, typecheck, tests, sur macOS, Windows et Ubuntu ;
   - sur une étiquette `v*` : construction des installeurs des trois systèmes et brouillon de « Release » GitHub avec les fichiers. David publie le brouillon lui-même.
4. Expliquer à David, en quelques lignes, comment créer le dépôt et le relier (il ne l'a pas encore fait).

*Validé quand* : une étiquette d'essai produit le `.dmg`, l'installeur et le portable Windows, le `.deb` et l'AppImage dans un brouillon de Release.

## Décision du 21 novembre : un système après l'autre

La suite de l'étape 16 attend que la **version Mac soit publiée** (étape 18, `specs/etape-18-version-mac.md`). Ensuite : Windows (16D, 16E), et seulement quand Windows est validé, Linux (16F, 16G). Les essais Windows et Ubuntu faits le 21 novembre (`essais-16D.md`, résultats gardés) servent de point de départ.

Au moment de commencer 16D : réactiver la construction Windows dans `installeurs.yml` (désactivée en 18A) ; pour 16F, la construction Linux.

## 16D — Windows : essais et corrections

Reprendre la section 1 de `essais-16D.md` avec la version Mac publiée comme base. **Déjà validé le 21 nov.** : installation sans mot de passe, menus, raccourcis, double-clic sur `.neoscenar`, projet aller-retour Mac, exports, police et traits de page, Blender, désinstallation, lot 1.

**Restant ou en défaut** :

- **SmartScreen** bloque le téléchargement dans Edge (« rarement téléchargé ») et le premier lancement. Contournement : Conserver ▸ Afficher plus ▸ Conserver quand même, puis « Informations complémentaires » ▸ « Exécuter quand même ». À documenter en 16E. Piste pour plus tard : signature gratuite pour logiciels libres (SignPath Foundation).
- **Correcteur réseau coupé** : le mot faux n'est **pas souligné** (le français est installé dans Windows). À corriger.
- **Compte standard** (sans droit administrateur) : pas encore essayé (seul un compte administrateur était disponible).
- **Version portable** : pas encore essayée.
- Défauts de 18B jugés propres à Windows, s'il y en a.
- Pilotage et `npm test` sur le PC (section 3) : facultatif.

*Validé quand* : toutes les cases de la section 1 sont cochées.

## 16E — Windows : guide d'installation et publication

Page en français simple (`Documentation/installation-windows.md` et `README.md`) : où télécharger, quel fichier (installeur ou portable), passage de SmartScreen dans le navigateur et au lancement, avec captures. Puis publication par David.

## 16F — Linux (Ubuntu) : essais et corrections

Reprendre la section 2 de `essais-16D.md`. **Déjà validé le 21 nov.** : `.deb`, menus, double-clic, projet aller-retour Mac, exports, correcteur réseau coupé, police, Blender, lot 1.

**Restant ou en défaut** :

- **Icône générique dans le dock** (carré gris avec roue dentée) au lieu du logo : à corriger (nom de classe de fenêtre / fichier `.desktop`).
- **AppImage** : double-clic sans effet et **sans aucun message**, même avec l'exécution autorisée. Le lancer dans un terminal pour lire l'erreur (`libfuse2`, AppArmor…) ; ne pas contourner avec `--no-sandbox` sans en parler à David.
- **Désinstallation** : pas encore essayée.
- Défauts de 18B jugés propres à Linux, s'il y en a.

*Validé quand* : toutes les cases de la section 2 sont cochées.

## 16G — Linux : guide d'installation et publication

Page en français simple (`Documentation/installation-linux.md` et `README.md`) : `.deb` par double-clic ou `sudo apt install ./fichier.deb`, AppImage en secours. Puis publication par David.
