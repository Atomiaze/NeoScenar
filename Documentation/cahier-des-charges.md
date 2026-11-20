# Cahier des charges – Éditeur de scénario Fountain (version de travail)

Document évolutif, à compléter au fil des analyses. Les points marqués « à définir » restent ouverts.

## 1. Contexte et objectifs

L'application est destinée aux étudiants en audio-visuel de l'IES Saint Luc Liège. Elle doit leur permettre d'écrire des scénarios, de préparer le découpage et le storyboard, puis de transférer ce travail vers Blender.

Objectifs principaux :

- Gratuité totale, sans abonnement ni compte en ligne.
- Fonctionnement entièrement local, sans dépendance à un serveur (les connexions à l'école sont peu fiables).
- Les étudiants restent maîtres de leurs fichiers, stockés en clair sur leur machine.
- Simplicité d'utilisation, adaptée à des étudiants du secondaire.
- Reprise des conventions de travail propres à l'école (à définir).
- Inspiration : KIT Scenarist, logiciel local et simple dont le développement a été arrêté, et dont le successeur est passé en ligne avec abonnement.

## 2. Plateformes et technologie

- Application de bureau installable sur macOS, Windows et Linux.
- Technologie retenue : **Electron + TypeScript** (décision du 17 novembre 2026).
  - Un seul langage pour toute l'application.
  - Affichage et comportement identiques sur les trois systèmes, grâce au navigateur Chromium embarqué.
  - Proximité avec l'écosystème Obsidian, lui-même construit avec Electron.
  - Contrepartie acceptée : applications plus lourdes (souvent plus de 100 Mo) et plus gourmandes en mémoire.
- Tauri a été envisagé puis écarté : moteur web différent selon le système (écarts possibles, surtout sous Linux) et partie système à écrire en Rust.
- L'analyseur Fountain est un module TypeScript indépendant, réutilisable ailleurs (par exemple dans un plugin Obsidian).
- Développement assisté par Claude Code, dans le dossier « NeoScenar ».

## 3. Format de fichier et organisation du projet

- Format natif : Fountain (texte brut, `.fountain`), lu et écrit intégralement. Le texte Fountain est la source de vérité : cartes, navigateur et statistiques en sont dérivés.
- Respect de la syntaxe Fountain : en-têtes de scène (INT./EXT.), personnages et extensions (V.O., O.S.…), dialogues, didascalies de jeu, transitions, paroles (`~`), dialogues simultanés (`^`), sauts de page (`===`), numéros de scène (`#3A#`), sections (`#`), synopsis (`=`), notes `[[ ]]`, texte mis de côté `/* */`, éléments forcés.
- Les données complémentaires (personnages, lieux, storyboard, découpage) sont stockées à côté du fichier Fountain, dans un dossier projet lisible (JSON et images), sans base de données opaque (KIT Scenarist utilisait un fichier SQLite `.kitsp`).
- Imports : Fountain ; Final Draft (`.fdx`) et import d'anciens projets KIT Scenarist à étudier (utile pour les projets des années précédentes).
- Exports : PDF au format standard de scénario ; Fountain ; Final Draft (`.fdx`) et Word (`.docx`) à étudier ; découpage en JSON pour Blender.

### 3.1 Création d'un projet et structure du film

NeoScenar ne se contente pas de créer ses propres fichiers : à la création d'un projet, il prépare aussi l'arborescence complète du futur film, pour que les étudiants rangent dès le départ leurs fichiers Blender, Premiere, sons, rushes, etc.

Fenêtre de création :

1. Nom du projet (nettoyé automatiquement : sans accents ni espaces, « Mon Film d'été » devient `Mon_Film_d_ete`).
2. Emplacement du projet sur le disque.
3. Type de projet, qui pré-coche les dossiers : *Film*, *Animation Blender*, *Mixte*, *Personnalisé*.
4. Liste des dossiers, chacun avec une case à cocher.

**Format de l'image** (choisi dans la même fenêtre, ajouté le 17 novembre 2026) :

- Préréglages courants : Paysage Full HD 16:9 (1920 × 1080), Vertical Full HD 9:16 (1080 × 1920), Carré 1:1 (1080 × 1080), 4K UHD 16:9 (3840 × 2160), Cinémascope 2,39:1 (1920 × 804).
- Format personnalisé : largeur et hauteur en pixels.
- Cadence : 25 images par seconde par défaut, modifiable (24, 25, 30…).
- Le format est enregistré dans `projet.json` et conditionne les proportions des vignettes, de la toile de dessin et de la caméra Blender.
- Il reste modifiable après la création, avec un avertissement : les vignettes existantes gardent leurs proportions et sont signalées comme « à recadrer ».

| Dossier | Contenu | Film | Animation |
| --- | --- | --- | --- |
| `01_Production` | note d'intention, planning, autorisations, droits | ✓ | ✓ |
| `02_References` | références, moodboard, vidéos de référence volumineuses | ✓ | ✓ |
| `03_Rushes` | vidéos tournées (option : un sous-dossier par jour de tournage) | ✓ |  |
| `04_Son` | `Prise_de_son`, `Voix_off`, `Bruitages`, `Musique` | ✓ | ✓ |
| `05_Images` | photos, illustrations, éléments importés | ✓ | ✓ |
| `06_Blender` | `Storyboard` (fichier .blend généré par NeoScenar), `Assets` (`Personnages`, `Decors`, `Accessoires`), `Textures`, `Plans` |  | ✓ |
| `07_Rendus` | séquences d'images et rendus Blender |  | ✓ |
| `08_Graphisme` | titrage, génériques, logos | ✓ | ✓ |
| `09_VFX` | compositing, After Effects |  |  |
| `10_Montage` | projet Premiere ou DaVinci | ✓ | ✓ |
| `11_Exports` | versions de travail et version finale | ✓ | ✓ |
| `12_Archives` | éléments abandonnés qu'on ne veut pas jeter |  |  |

Règles :

- Les numéros sont fixes, même quand un dossier est décoché : toute la classe a les mêmes repères.
- Aucun accent ni espace dans les noms de dossiers (compatibilité Blender, Linux, serveurs de l'école).
- Option : un fichier `LISEZMOI.txt` dans chaque dossier explique ce qu'il doit contenir.
- Modèle d'école : la liste des dossiers (noms, sous-dossiers, cases cochées par type de projet) est un fichier modifiable, que l'enseignant peut préparer et distribuer (« modèle Saint Luc »).
- Commande « Compléter la structure » pour ajouter plus tard un dossier oublié.
- Après la création, NeoScenar ne touche plus à ces dossiers, sauf pour y déposer ce qu'il génère (le fichier .blend du storyboard dans `06_Blender/Storyboard`).

### 3.2 Organisation du dossier `neoscenar`

```
Mon_Film/
├── Mon_Film.neoscenar      ← double-clic pour ouvrir le projet
├── neoscenar/
│   ├── scenario.fountain   ← le scénario, avec sa page de titre
│   ├── projet.json         ← nom, logline, synopsis, réglages (images/s, format), version du format
│   ├── decoupage.json      ← scènes, plans et leurs fiches
│   ├── personnages/        ← une fiche Markdown par personnage + images/
│   ├── lieux/              ← une fiche Markdown par lieu + images/
│   ├── documents/          ← notes et galeries libres
│   ├── storyboard/
│   │   ├── scans/          ← planches scannées, telles quelles
│   │   └── vignettes/      ← une image par plan
│   ├── blender/            ← fichiers d'échange avec Blender (envoi et retour)
│   ├── versions/           ← versions nommées par l'étudiant
│   ├── sauvegardes/        ← sauvegardes automatiques (seules les plus récentes sont gardées)
│   └── exports/            ← PDF du scénario, des cartes et du storyboard
├── 01_Production/
└── …
```

Principes :

- **Un fichier par élément** plutôt qu'un fichier unique : un fichier abîmé ne fait perdre qu'une fiche, et tout reste lisible et réparable à la main.
- **Fiches personnages et lieux en Markdown** avec propriétés en en-tête (format Obsidian) : le dossier `neoscenar` s'ouvre tel quel dans Obsidian.
- **Chemins relatifs uniquement** : un projet copié sur une clé USB ou d'un ordinateur à l'autre continue de fonctionner.
- **Vignettes nommées par l'identifiant interne du plan**, et non par son numéro : une renumérotation ne renomme aucun fichier.
- **Version du format** dans `projet.json`, pour pouvoir mettre à jour automatiquement les anciens projets.
- **Enregistrement sûr** : écriture dans un fichier temporaire, puis remplacement de l'ancien, pour qu'une coupure pendant la sauvegarde ne corrompe jamais le projet.
- Encodage UTF-8 pour tous les fichiers texte.

## 4. Module Recherches

Repris du module « Recherches » de KIT Scenarist, tel qu'il est utilisé au cours (d'après le tutoriel KIT Scenarist du cours).

- **Projet** : titre, logline, synopsis, informations de la page de titre (reprises dans l'en-tête Fountain `Title:`, `Author:`, etc.), accès aux versions du scénario.
- **Personnages** : fiches (nom, description, objectifs, relations, images de référence). Une fiche est créée automatiquement quand un nouveau personnage apparaît dans le scénario.
- **Décors (lieux)** : fiches avec description et photos de repérage. Les décors alimentent l'autocomplétion des en-têtes de scène, et une fiche est créée automatiquement quand un nouveau lieu apparaît dans le scénario (voir section 6).
- **Documents** : notes texte, galeries d'images (références, moodboard, repérages, casting), organisées en dossiers.
- Les mindmaps de KIT Scenarist ne sont pas reprises dans un premier temps.

### 4.1 Générique final (décidé le 18 novembre 2026, à faire après l'étape 10)

- Objectif : rassembler dès le départ tout ce qui doit apparaître dans le générique, pour ne plus le reconstituer au moment du montage.
- Contenu : rubriques de crédits (réalisation, scénario, image, son, montage, musique, remerciements…), avec des noms ; rubriques habituelles fournies par le modèle de l'école ; logos (école, partenaires) en images.
- Acteurs : repris du module Personnages, grâce à un champ « Interprète » dans la fiche personnage.
- Mise en page **automatique**, à partir d'un modèle fixe (comme le scénario) : l'élève saisit seulement les informations, sans outil de mise en forme du texte. Au plus deux ou trois choix simples (par exemple taille du texte, une ou deux colonnes).
- Exports :
  - texte à copier-coller dans le bloc de texte du logiciel de montage ;
  - image PNG haute, sur fond transparent, avec les logos, à faire défiler dans Premiere Pro ou DaVinci Resolve en animant sa position.
- Pas d'export vidéo.
- *Précisé le 18 nov.* : aussi des cartons de début (PNG au format du projet) tirés des mêmes données ; modèle Saint Luc complet ; données dans `neoscenar/generique.json` ; exports dans `08_Graphisme/Generique/`. Détail : `specs/etape-10b-generique.md`.

## 5. Module Cartes (découpage technique)

Le module Cartes sert à faire le découpage technique. C'est un grand tableau sur lequel chaque carte représente un **plan**, et où les plans sont regroupés dans des **scènes**. C'est le module prioritaire : il alimente directement le storyboard et l'export vers Blender.

**Éléments**

- Carte Scène : nom, couleur de fond ; contient des plans.
- Carte Plan : nom, couleur de fond. Champs complémentaires à définir (vignette, valeur de plan, mouvement de caméra, durée estimée, description courte).

**Nommage**

- Scènes : S\_0010, S\_0020, S\_0030… (pas de 10).
- Plans : P\_0010, P\_0020, P\_0030… La numérotation des plans recommence à P\_0010 dans chaque scène.
- Identifiant complet d'un plan, unique dans le projet : S\_0020\_P\_0030.
- Insertion entre deux éléments existants : numéro intermédiaire (P\_0015 entre P\_0010 et P\_0020, S\_0025 entre S\_0020 et S\_0030). Le pas de 10 laisse neuf places entre deux numéros. Un numéro ne dépasse pas 9999, et une seule lettre est possible (P\_0010A à P\_0010Z).

**Actions**

- Ajouter une scène ou un plan, à la fin ou juste après l'élément sélectionné.
- Insérer une scène ou un plan entre deux éléments existants.
- Ajouter en lot : « ajouter N plans » ou « ajouter N scènes » (par exemple 25 plans d'un coup).
- **Dupliquer** (clic droit, menu Édition, `Cmd/Ctrl + D`) un plan, une scène ou une sélection, utile quand un plan ou une scène se répète :
  - la copie est insérée juste après l'original (après le dernier élément de la sélection), avec un numéro intermédiaire selon les règles habituelles (P\_0015, ou P\_0010A si les numéros sont verrouillés) ;
  - tout est copié à l'identique (nom, couleur, champs de la fiche, et plus tard la vignette, copiée dans un fichier indépendant) ; seuls le numéro et l'identifiant interne changent ;
  - dupliquer une scène copie aussi tous ses plans, qui gardent leurs numéros P\_0010, P\_0020… dans la nouvelle scène ;
  - la duplication s'annule avec `Cmd/Ctrl + Z` ;
  - lien avec le scénario (étape 8) : à préciser, par exemple créer l'en-tête de la scène copiée sans recopier son texte.
- Déplacer par glisser-déposer : un plan dans sa scène, un plan d'une scène à une autre, une scène entière avec ses plans.
- Sélection multiple, pour déplacer, colorer ou supprimer plusieurs cartes à la fois.
- Supprimer une scène ou un plan, avec confirmation quand plusieurs éléments sont concernés, et annulation (`Cmd/Ctrl + Z`) toujours possible.
- Modifier la couleur de fond d'une carte (plan ou scène), à partir d'une palette de 36 couleurs : 12 teintes (rouge, orange, jaune, vert pomme, vert, turquoise, cyan, bleu, violet, magenta, rose, gris), chacune en pastel, vive et foncée ; le texte passe en blanc sur les couleurs foncées.

**Règles de fonctionnement** (décidées le 17 novembre 2026)

- **Disposition ordonnée** : une rangée par scène, plans dans l'ordre de montage. L'ordre de lecture du tableau est l'ordre du film ; pas de placement libre. Une rangée trop longue passe à la ligne.
- **Pas de plan hors scène** : tout plan appartient à une scène. Un nouveau projet contient d'office la scène S\_0010. Supprimer une scène supprime ses plans, après confirmation.
- **Numéros intermédiaires automatiques** : un élément inséré ou déplacé prend un numéro libre entre ses voisins (P\_0015 entre P\_0010 et P\_0020). Un plan déplacé vers une autre scène prend un numéro dans sa scène d'arrivée. S'il n'y a plus de numéro libre (entre P\_0010 et P\_0011), l'application propose de renuméroter ; si les numéros sont verrouillés, elle ajoute une lettre (P\_0010A), comme on le fait au cinéma.
- **Commande « Renuméroter »**, à la demande, pour une scène ou tout le projet : remet le pas de 10 dans l'ordre actuel.
- **Verrouillage des numéros** : activable à la main, et proposé automatiquement à la première génération du fichier Blender. Une fois verrouillés, les numéros existants ne changent plus.
- **Identifiant interne** : chaque scène et chaque plan a aussi un identifiant permanent et invisible, distinct de son nom. C'est lui qui fait le lien avec le scénario, le storyboard et Blender, pour qu'un renommage ne casse rien.
- **Lien avec le scénario, dans les deux sens** : créer une scène dans le module Cartes crée un en-tête de scène à compléter dans le scénario ; écrire un en-tête de scène dans le scénario crée la carte scène, avec un premier plan P\_0010. Déplacer ou supprimer une scène d'un côté la déplace ou la supprime de l'autre (avec confirmation pour la suppression). Les deux façons de travailler sont possibles : découper d'abord puis écrire, ou écrire d'abord puis découper.
- **Stockage** : les scènes restent dans le fichier Fountain ; les plans, qui n'existent pas en Fountain, sont enregistrés dans un fichier JSON du dossier projet. **Le lien est le numéro de scène écrit dans le Fountain** : `#30#` ↔ S\_0030 (décidé le 18 novembre 2026). Le scénario est donc numéroté comme le découpage (10, 20, 25…), et S\_0030 est affiché partout : cartes, marge du scénario, navigateur, PDF, Blender. Le texte fait foi pour l'existence, l'ordre et l'en-tête des scènes. Une carte qui a du contenu ne disparaît jamais en silence : si sa scène disparaît du scénario, elle devient « orpheline » (voir `specs/etape-08-lien-scenario-cartes.md`).
- **Noms dans Blender** : une scène Blender par plan, nommée avec l'identifiant complet (S\_0010\_P\_0010). Le plugin storyboard sera adapté à ce format si besoin.

**Affichage sur la carte** : le numéro (S\_0010 ou P\_0010), le nom (titre libre donné par l'étudiant, comme le champ « Name » de KIT Scenarist) et l'en-tête de scène tel qu'il apparaît dans le scénario (INT. CUISINE - JOUR). Sur la carte scène, l'en-tête est affiché normalement ; sur les cartes plan, il est rappelé en petit et en gris, pour se repérer en faisant défiler le découpage. Modifier l'en-tête sur la carte scène le modifie dans le scénario, et inversement.

**Fiche détaillée d'un plan** (ouverte par double-clic sur la carte), reprenant les champs de la planche de storyboard utilisée au cours :

- **Vignette** : image du plan (dessin scanné, photo, ou vignette renvoyée par Blender).
- **Durée** : en secondes, saisie numérique (nécessaire pour le montage et l'export Blender). La somme des durées donne la durée de la scène et du film.
- **Échelle de plan** (« type de plan » sur la planche, c'est le même champ) : plan d'ensemble, plan demi-ensemble, plan moyen, plan américain, plan rapproché taille, plan rapproché poitrine, gros plan, très gros plan.
- **Mouvement de caméra** : plan fixe, panoramique, zoom, traveling, traveling compensé.
- **Angle de prise de vue** : frontal, plongée, contre-plongée, ras du sol, vue plafond, vue à la première personne, plan débullé.
- **Sons, bruitages, dialogues** : texte sur plusieurs lignes.
- **Musique** : texte.
- **Description du plan** : texte sur plusieurs lignes. Une aide rappelle ce qu'elle doit contenir : le sujet (personnages, animaux, objets, leurs positions et mouvements) et l'arrière-plan, ainsi que l'éventuel premier plan.
- **Verso** : pas de champ dans l'application (sur papier, la case rappelle qu'on a écrit au dos de la feuille). La case est conservée sur les planches imprimées par NeoScenar.

Les listes déroulantes reprennent exactement le vocabulaire du cours (fiche « Les éléments importants d'un storyboard »). Elles acceptent aussi une saisie libre et restent modifiables dans les paramètres.

**Aide pédagogique intégrée** : chaque terme des listes est accompagné d'une courte explication, visible au survol ou dans un panneau d'aide. Pour les échelles de plan, une petite illustration montre le cadrage ; pour les angles, l'aide donne la position de la caméra et l'effet produit (par exemple plongée : caméra en hauteur pointant vers le bas, réduit l'importance du sujet). Les illustrations utilisées doivent être libres de droits ou dessinées pour le projet.

**Interface** (décidée le 17 novembre 2026) :

- Barre verticale à gauche avec une icône par module (Recherches, Cartes, Scénario, Statistiques…), comme dans KIT Scenarist.
- Le tableau des cartes au centre, la fiche de l'élément sélectionné (scène ou plan) dans un panneau à droite. Un clic sur une carte affiche sa fiche ; un double-clic y place directement le curseur.
- Quand les numéros sont verrouillés, le glisser-déposer est désactivé (on ne réorganise plus un découpage figé) ; l'insertion reste possible, avec une lettre (P\_0010A).

## 6. Module Scénario (éditeur)

- Éditeur avec mise en forme automatique et page au format scénario A4 (modèle de type Final Draft, comme celui demandé au cours).
- Navigateur de scènes : cliquer sur une scène y amène directement ; numéros de scène affichés.
- Types d'éléments : en-tête de scène, action, personnage, dialogue, didascalie, transition, texte non imprimable (note), paroles de chanson. Éléments propres à KIT Scenarist à étudier : « liste des personnages » et « plan » (shot), qui n'existent pas tels quels en Fountain.
- Assistant d'en-tête de scène : taper « i » ou « e » propose INT. / EXT., puis les lieux connus, puis `Tab` propose le moment (JOUR, NUIT…), puis `Entrée` passe à l'action.
- Touche `Tab` pour le formatage automatique (passage logique d'un élément au suivant).
- Extensions de dialogue proposées dans une liste : V.O. (voix off), O.S. (hors champ), O.C., SOUS-TITRE.
- Autocomplétion des personnages et des lieux à partir des fiches.
- Recherche dans le texte, annotations, correcteur orthographique en français.
- Confort de lecture : surlignage des blocs, surbrillance de la ligne en cours, zoom.
- Aperçu avant impression (`F12`).
- Raccourcis repris de KIT Scenarist, pour que les habitudes des étudiants restent valables : `Cmd/Ctrl + Entrée` en-tête, `Cmd/Ctrl + J` action, `Cmd/Ctrl + U` personnage, `Cmd/Ctrl + H` didascalie, `Cmd/Ctrl + L` dialogue, `Cmd/Ctrl + G` transition, `Cmd/Ctrl + flèche haut/bas` changer la casse, `Cmd/Ctrl + +/-` zoom.
- Mode concentration (plein écran).

**Automatismes d'écriture** (repris de KIT Scenarist, d'après sa documentation en ligne) :

- Enchaînement au clavier : après une action, `Tab` passe en Personnage ; `Entrée` après le nom passe en Dialogue ; `Entrée` après le dialogue revient à l'Action.
- Mode plan : affichage réduit aux dossiers, en-têtes et descriptions de scène, pour construire la structure directement dans l'éditeur. Chaque nouvelle scène reçoit un numéro intermédiaire (S\_0025 entre S\_0020 et S\_0030) et crée sa carte (étape 8). *Classé non prioritaire le 19 novembre 2026* (absent à l'étape 13D, à réaliser plus tard comme sous-étape à part).
- Ajout automatique de la mention de reprise, (SUITE) en français, quand un personnage reprend la parole après une action.
- Correction automatique des coupures de page : un nom de personnage ne reste jamais seul en bas de page.
- Verrouillage des numéros de scène, partagé avec les cartes : les numéros existants ne changent plus, et une scène ajoutée après coup reçoit un numéro intermédiaire ou une lettre (S\_0030A).
- Dialogues simultanés en deux colonnes (absent de KIT Scenarist).
- Saut de page forcé avant un acte ou une séquence (absent de KIT Scenarist).
- Mode révision : annotations et surlignages colorés, effaçables sans toucher au texte.

**Liens avec les fiches personnages et lieux** :

- Autocomplétion près du curseur : dès qu'on commence à taper un nom dans un élément Personnage, un menu déroulant apparaît à côté du curseur avec les personnages existants, filtrés au fil de la frappe ; `Entrée` ou `Tab` insère le nom complet. Même fonctionnement pour le lieu dans un en-tête de scène, après INT. ou EXT.
- Création automatique : quand un nom de personnage inconnu est validé, une fiche vide est créée dans le module Recherches, à compléter plus tard. Même fonctionnement pour un nouveau lieu dans un en-tête de scène. Une notification discrète l'indique, avec un lien vers la fiche.
- Ce qui n'est pas le nom : les extensions comme (V.O.), (O.S.) ou (SUITE) ne font pas partie du nom du personnage ; dans l'en-tête, le lieu est la partie entre INT./EXT. et le moment (JOUR, NUIT…). Un lieu composé forme un seul lieu : dans INT. MAISON - CUISINE - JOUR, le lieu est « MAISON - CUISINE ». Le moment est toujours le dernier segment après « - ».
- Fautes de frappe : si un nouveau nom ressemble fort à un nom existant (MARI / MARIE), l'application le signale avant de créer la fiche. Une fiche créée automatiquement, restée vide et qui n'apparaît plus dans le scénario est signalée et peut être supprimée en un clic.
- Renommage : renommer un personnage ou un lieu dans sa fiche propose de remplacer toutes ses occurrences dans le scénario.
- Navigation : `Cmd/Ctrl + clic` sur un nom dans le scénario ouvre sa fiche.

**Mise en page et affichage** (d'après le tutoriel KIT Scenarist du cours, ajouté le 18 novembre 2026) :

- **Modèle demandé au cours : « Scénario Final Draft (A4) »**, le modèle standard international. Page A4, police Courier 12 points (Courier Prime, libre), environ 6 lignes par pouce. Retraits standard : action et en-têtes sur toute la largeur du texte ; dialogues en retrait, sur environ 35 caractères ; didascalies un peu plus en retrait ; noms de personnages plus en retrait encore ; transitions alignées à droite. Les valeurs exactes sont calées sur un PDF de référence exporté de KIT Scenarist avec ce modèle.
- **Numéro de scène** affiché à gauche de l'en-tête sous la forme **S\_0030**, comme dans les cartes et dans Blender, à l'écran et à l'impression (décidé le 18 novembre 2026 ; il est écrit `#30#` dans le Fountain, voir section 5).
- **Actes et séquences** (sections Fountain `#`) : affichés comme des bandeaux colorés (« ACTE 1 - INTRO ») ; un bandeau « FIN DE ACTE 1 » est affiché automatiquement avant la section suivante (affichage seulement, rien n'est ajouté au fichier). Ils ne sont pas imprimés.
- **Texte non imprimable** (notes Fountain `[[ ]]`) : affiché en vert, jamais exporté dans le PDF. Il sert à laisser des remarques dans le scénario. Dans le navigateur, l'icône d'une scène ou d'un acte qui contient une note devient rouge.
- **Navigateur de scènes** à gauche : actes repliables avec leur couleur et leur durée ; pour chaque scène, son numéro, son en-tête, sa durée et le début de son texte ; en bas, la description (synopsis) de la scène sélectionnée, modifiable.
- **Durée** : estimée d'après la longueur du texte (une page ≈ une minute) ; quand les plans du découpage ont des durées, la durée du découpage est affichée à côté.
- **Limites de pages et numéros de page** visibles dans l'éditeur.
- **Correcteur orthographique** en français.

**Décisions de l'étape 7** (sous-étapes D à F, 18 novembre 2026) :

- **Autocomplétion** : si le texte tapé correspond exactement à une proposition (casse et accents ignorés), elle passe en tête et `Entrée` la garde. Si le texte n'est que le début d'un nom existant, une ligne « Échap : garder « LÉA » » le rappelle. Le découpage lieu / moment se fait sur « espace-tiret-espace » seulement (`ÉCOLE SAINT-LUC - APRÈS-MIDI`). Les moments sont lus dans le fichier de vocabulaire du cours (`sceneTimes`).
- **Navigateur** : une seule scène sélectionnée, celle où se trouve le curseur. La description d'une scène ou d'un acte est son synopsis Fountain (lignes `= …` juste sous l'en-tête). Elle s'écrit dans le texte au fil de la frappe et s'annule en une fois. La durée d'un acte compte tout ce qui se trouve entre sa ligne et la section suivante de même niveau ou supérieur. Le total est égal à la somme des actes, plus le texte placé avant le premier acte.
- **Coupure des mots** : entre les mots et après un trait d'union placé entre deux lettres, comme KIT (« rendez- / vous »). Vérifiée sur le PDF de référence de KIT (gardé en local) : 218 lignes sur 219 identiques, et les 6 pages commencent aux mêmes endroits. L'écart restant vient de lignes vides tapées avant le « FONDU AU NOIR » final : on garde une ligne vide avant une transition. L'écran et la pagination coupent les lignes aux mêmes endroits, et une commande de développement le vérifie.
- **Limites de pages** : un trait pointillé au caractère exact où commence la page, même au milieu d'un paragraphe, sans décaler le texte. Le numéro de page est dans la marge droite. La barre d'outils indique « Page 3 / 6 · 5:40 ». Une seule pagination sert à l'éditeur, au navigateur et à l'indicateur, et servira à l'export PDF.
- **Marqueurs de mise en forme** (`**`, `*`, `_`) : masqués hors de la ligne du curseur, comme les marqueurs de forçage.
- **Page de titre** : fenêtre Fichier > Page de titre… Les champs correspondent aux clés Fountain : Titre `Title`, Genre ou information `Credit`, Auteur(s) `Author`, Mention `Source`, Contact `Contact`, Date `Draft date`, Notes `Notes`. Les clés inconnues sont conservées telles quelles. Pour le titre, le Fountain fait foi : à l'ouverture, `projet.json` le suit. Le nom du dossier du projet ne change jamais.

## 7. Statistiques, versions, paramètres et parcours type

**Statistiques** : nombre de pages, durée estimée, activité des personnages (graphique), dynamique des scènes, temps de parole, scènes par lieu.

**Versions** : comparer deux versions du scénario et restaurer une version antérieure.

**Paramètres** (avec des valeurs par défaut adaptées au cours, pour que l'étudiant n'ait rien à régler) :

- enregistrement automatique à chaque modification (aucun Cmd + S à retenir, l'annulation permet de revenir en arrière), et sauvegardes de sécurité rangées dans le dossier du projet ;
- langue du dictionnaire : français ;
- numéros de scène, surlignage des blocs et de la ligne en cours activés.

**Emplacement du projet** : le choix du dossier est proposé clairement à la création (dans KIT Scenarist, il était caché derrière le bouton « Avancé »). Au cours, le projet se range dans le même dossier que le projet de montage.

**Parcours de travail type de l'étudiant** (l'interface doit le rendre évident) :

1. Créer le projet dans le dossier du film.
2. Remplir la page de titre, la logline et le synopsis.
3. Créer les fiches personnages et décors déjà connus.
4. Construire la structure dans le module Cartes (nom et description de chaque scène).
5. Rédiger le scénario.
6. Exporter en PDF.

**Exports PDF** : un PDF par module (Recherches, Cartes, Scénario), comme dans KIT Scenarist, avec en plus une option pour tout réunir dans un seul PDF (aujourd'hui, les étudiants doivent les combiner eux-mêmes).

## 8. Module Découpage et Storyboard

- Le découpage en scènes et en plans se fait dans le module Cartes (section 5) ; chaque plan y a une fiche (valeur de plan, mouvement de caméra, durée estimée, description).
- **Une vignette par plan**, aux proportions du format du projet. Trois façons de l'obtenir :
  - la dessiner dans l'éditeur de dessin intégré (voir plus bas) ;
  - importer une image PNG ou JPEG (réalisée dans Photoshop, Krita…, ou photo ou scan d'un dessin papier) ;
  - importer automatiquement des planches scannées (voir plus bas).
- **Recadrage à l'import** : si l'image n'a pas les proportions du projet, un cadre aux bonnes proportions s'affiche par-dessus ; l'étudiant le déplace et le redimensionne, puis valide. Option « Ajuster sans recadrer » (bandes de couleur). L'image d'origine est conservée dans `storyboard/originaux/` pour pouvoir recadrer à nouveau.
- **Affichage** : la vignette apparaît dans la fiche plan ; dans le module Cartes, un mode d'affichage « avec vignettes » montre l'image sur chaque carte plan (bouton dans la barre d'outils).
- Vue planche imprimable (PDF) avec vignettes, numéros et descriptions.

**Planche de storyboard Saint Luc** : la planche utilisée au cours (format A4 portrait, en-tête « Titre » et « N° de page », jusqu'à trois plans par page, chacun avec une case dessin à gauche et les champs de la fiche plan à droite, description en dessous) sert de modèle pour :

- l'**impression** : NeoScenar imprime des planches vierges, déjà pré-remplies avec le titre, les numéros de scène et de plan et les champs connus, que l'étudiant dessine à la main ;
- l'**import des scans** : comme la mise en page est fixe et générée par NeoScenar, les cases dessin sont retrouvées automatiquement et associées au bon plan (un repère imprimé, par exemple un petit code, identifie la page et les plans) ;
- l'**export PDF** du storyboard terminé, avec les vignettes.

**Un seul générateur pour les planches et l'export** (décidé le 18 novembre 2026) : chaque plan affiche le numéro de scène et de plan (S\_0030 · P\_0010), tous les champs de sa fiche et sa vignette (dessinée ou importée). Un plan sans vignette garde une case vide, à dessiner à la main. Les planches vierges et le PDF final ont donc exactement la même mise en page, ce qui garde possible l'import des scans.

**Texte long et repères d'impression** (décidé le 19 novembre 2026, voir `specs/etape-11-storyboard-pdf.md`) : le texte n'est jamais réduit ni coupé ; un champ prend autant de lignes que nécessaire, et chaque bloc plan a donc une hauteur variable (une page peut contenir 3, 2 ou 1 plan ; un bloc n'est jamais coupé entre deux pages, sauf un plan plus haut qu'une page entière, dont la description continue sur la page suivante). La case dessin a les proportions du format du projet, la plus grande possible dans sa zone. Dès l'étape 11, chaque page porte des repères pour l'import des scans (4 marques d'angle et un petit QR code), et chaque export écrit un fichier `storyboard/impressions/<idImpression>.json` qui donne, page par page, la position de la case dessin de chaque plan.

**Éditeur de dessin intégré** (ajouté le 17 novembre 2026) : volontairement simple, pour faire rapidement des croquis. Les images plus élaborées se font sur papier ou dans un logiciel dédié (Krita, Photoshop…), puis s'importent.

- Dessin en pixels (bitmap), pas de vectoriel. La toile a les proportions du format du projet (définition de travail : 1920 pixels sur le côté le plus long).
- **Pinceau net** : bord dur, sans flou ; quelques tailles prédéfinies et un réglage fin de l'épaisseur.
- **Gomme nette** : mêmes réglages ; elle efface vers le blanc du papier.
- **Pot de peinture** : remplit la zone de couleur cliquée ; sur une image vide, il remplit tout le fond. Une petite tolérance évite de laisser un liseré autour des traits.
- **Nuancier** : la même palette que les cartes (12 teintes, chacune en pastel, vive et foncée), plus le noir et le blanc. Pas de sélecteur RVB : un clic sur une case suffit.
- Annuler et rétablir (`Cmd/Ctrl + Z`), tout effacer.
- Raccourcis clavier habituels des logiciels de dessin : `B` pinceau, `E` gomme, `G` pot de peinture, `[` et `]` pour la taille.
- L'éditeur fonctionne aussi sur une image importée (retoucher un scan, ajouter une flèche de mouvement de caméra).
- Option « Partir de l'image du plan précédent », pratique pour une suite de plans proches.
- Utilisable avec une tablette graphique comme avec une souris (la pression du stylet n'est pas prise en compte dans un premier temps).
- Le dessin est lié à la carte du plan et enregistré en PNG dans `storyboard/vignettes/`, nommé par l'identifiant interne du plan.

## 9. Module d'export vers Blender

Principe (révisé le 17 novembre 2026) : NeoScenar ne crée pas le fichier .blend lui-même. Il exporte un paquet d'échange (découpage en JSON + vignettes) dans neoscenar/blender/export/, puis lance Blender 4.5. C'est le plugin storyboard de David (« Storyboard – Gestion des plans », rangé dans le dépôt sous blender-addon/) qui importe ce paquet avec ses propres fonctions, dans un nouveau fichier : le résultat est ainsi toujours conforme au plugin. Le plugin gagne un mode de nommage S\_0010\_P\_0010 (le mode Plan\_0010 reste disponible pour les fichiers existants) et garde les identifiants NeoScenar de chaque plan pour le futur aller-retour. Première version : création d'un nouveau .blend uniquement, jamais d'écrasement ; la mise à jour d'un .blend existant viendra avec l'aller-retour. Format d'échange : Documentation/specs/format-echange-blender.md.

Contenu du fichier .blend généré :

- Une scène Blender par plan, nommée avec l'identifiant complet du plan (S\_0010\_P\_0010, S\_0010\_P\_0020, etc.), avec caméra et calque Grease Pencil prêt à dessiner.
- Un montage dans le Video Sequence Editor : plans placés dans l'ordre avec leur durée.
- Marqueurs ou notes reprenant le texte du scénario (action, dialogues).
- Les vignettes du storyboard (dessinées, importées ou scannées) sont exportées et plaquées sur un plan 3D placé devant la caméra de chaque scène Blender, cadré pour remplir exactement le champ : le storyboard est visible dans Blender, dans le rendu et dans le montage du Video Sequence Editor. Le calque Grease Pencil reste par-dessus, pour dessiner sur la vignette. La résolution et la cadence de chaque scène Blender reprennent le format du projet.
- Compatibilité avec le plugin de storyboard Blender existant, adapté à ce nommage si nécessaire (boutons « Ouvrir le plan » / « Retour au montage »).

Retour Blender vers l'application (aller-retour, mis de côté le 19 novembre 2026, non essentiel) :

- Récupération des durées réelles des plans.
- Récupération de vignettes rendues pour chaque plan.
- Objectif : garder scénario, découpage et animatique synchronisés.

Prérequis : Blender installé sur la machine. Version cible : Blender 4.5 LTS (décidée le 17 novembre 2026).

## 10. Contraintes et exigences générales

- Interface en français.
- Aucune collecte de données, aucune connexion requise.
- Licence : GPL-3.0 (décidée le 17 novembre 2026), pour que toute version modifiée reste libre.
- Distribution simple : installeurs pour les trois systèmes.
- Prise en main rapide, documentation pour les étudiants.
- **Auteur et version** (décidé le 20 novembre 2026) : le nom « David Delepinne » apparaît dans une fenêtre « À propos de NeoScenar » (nom, version, licence GPL-3.0, lien vers le dépôt GitHub) et discrètement en bas de l'écran d'accueil (« Créé par David Delepinne · version x.y.z »). Le numéro vient de `package.json`, jamais écrit en dur. Numérotation sur trois chiffres : 0.x.y tant que l'application n'est pas jugée solide pour les élèves (publiée en « pre-release » sur GitHub), 1.0.0 ensuite.
- **Distribution** (décidé le 20 novembre 2026) : dépôt GitHub public ; installeurs construits par GitHub Actions et publiés dans les « Releases » ; README en français (présentation, installation, ouverture d'une appli Mac non signée, capture d'écran). Manuel d'utilisation complet rédigé à la fin du développement, quand l'interface ne bougera plus.

**Pièges à éviter** (tirés des retours d'utilisateurs de KIT Scenarist) :

- Un seul modèle de mise en page, partagé par l'écran et l'export : ce qu'on voit est ce qu'on imprime. Dans KIT Scenarist, deux réglages séparés donnaient des PDF différents de l'écran.
- Un export sans ambiguïté : on choisit explicitement ce qu'on exporte (scénario, cartes, recherches), avec aperçu. Beaucoup d'utilisateurs obtenaient un PDF presque vide en exportant le plan au lieu du scénario.
- Des cartes fiables : aucune suppression multiple sans confirmation, annulation (`Cmd/Ctrl + Z`) toujours sûre. Le module Cartes de KIT Scenarist perdait parfois des cartes.
- Des versions réellement utilisables : pouvoir rouvrir une ancienne version et la modifier (par exemple en la dupliquant), pas seulement la consulter ou l'écraser.
- Une interface lisible sur les écrans haute résolution, avec une taille de texte réglable.

## 11. Points à définir

- Conventions et mise en page propres à Saint Luc : déjà reçus la planche de storyboard, le vocabulaire des plans et le modèle de mise en page du scénario (« Scénario Final Draft (A4) », mesuré sur le PDF de référence de KIT, voir `specs/mise-en-page-final-draft-a4.md`).
- ~~Correspondance entre les champs de la page de titre de KIT et les clés Fountain~~ : **confirmée** le 18 novembre 2026 sur un export Fountain de KIT (`Credit` pour le genre, `Source` pour la mention, `Draft date` pour l'année, `Contact` sur plusieurs lignes en retrait).
- Correcteur orthographique sous Windows et Linux : Electron y télécharge ses dictionnaires sur internet. Il faudra livrer le dictionnaire français avec l'application (étape 16).
- Mise à jour d'un .blend existant à partir d'un nouvel export, sans perdre le travail fait dans Blender (avec l'aller-retour, mis de côté le 19 novembre 2026).

## 12. Étapes de développement

**Plateformes** : développement et tests sur macOS d'abord (machine de développement : iMac Intel) ; Windows et Linux à la fin. Le code reste portable dès le départ (chemins construits avec les fonctions de Node, aucun chemin propre au Mac écrit en dur, détection de Blender prévue par système), pour que le portage soit simple. L'application Mac est construite pour Intel et pour Apple Silicon. Elle n'est pas signée par Apple (pas de distribution publique, pas de budget) : la manipulation d'ouverture sera expliquée aux étudiants.

Chaque étape fait l'objet d'une spécification courte, avec ses critères de validation, rédigée dans le projet Claude puis donnée à Claude Code.

**Phase 1 — Fondations**

0. Squelette de l'application : Electron + TypeScript, organisation du code, tests automatiques, installeur Mac. *Validé quand* l'application vide s'installe et s'ouvre sur Mac.
1. Projet et stockage : écran d'accueil (projets récents), fenêtre de création avec la structure de dossiers, lecture et écriture du dossier `neoscenar`, enregistrement sûr. *Validé quand* on crée un projet, le ferme, le rouvre, puis le copie sur une clé et l'ouvre sur un autre Mac.

**Phase 2 — Première version utilisable en classe**

2. Module Cartes, sans lien avec le scénario : scènes, plans, nommage, insertion, ajout en lot, glisser-déposer, couleurs, annulation, renumérotation, verrouillage, fiche plan. *Terminé le 17 novembre 2026.*
3. Format du projet et vignettes : choix du format à la création (et modification ensuite), import d'images PNG/JPEG avec recadrage, vignette dans la fiche plan et mode « avec vignettes » sur les cartes.
4. Éditeur de dessin intégré.
5. Export vers Blender : 5a. côté NeoScenar, paquet d'échange et lancement de Blender 4.5 ; 5b. côté plugin storyboard, commande « Importer un découpage NeoScenar », mode de nommage S\_0010\_P\_0010 et vignettes plaquées devant les caméras. Création d'un nouveau .blend uniquement.

**Phase 3 — Écriture**

6. Analyseur Fountain : module TypeScript indépendant et testé ; lire puis réécrire un fichier sans rien perdre.
7. Éditeur de scénario (basé sur CodeMirror) : mise en forme, raccourcis, Tab/Entrée, navigateur, assistant d'en-tête, autocomplétion. Partie la plus difficile du projet. Sous-étapes A à G et barre des éléments, terminées le 18 novembre 2026.
8. Lien scénario ↔ cartes, dans les deux sens (spécification : `specs/etape-08-lien-scenario-cartes.md`) : numéro de scène écrit dans le Fountain (`#30#` ↔ S_0030), sous-étapes 8A à 8D.
9. Export PDF du scénario au format A4, avec aperçu.

**Phase 4 — Compléments**

10. Recherches : fiches personnages, lieux, documents, et leurs liens avec le scénario (création automatique, renommage).
11. Storyboard : impression des planches, PDF du storyboard.
12. Import automatique des scans grâce aux repères imprimés. *Reporté le 19 novembre 2026 (non prioritaire)* : à faire seulement si les élèves le demandent. Les repères, QR codes et JSON d'impression de l'étape 11 restent produits pour le permettre plus tard.
13. Statistiques, versions, mode révision, automatismes avancés ((SUITE), dialogues simultanés…), finitions de l'éditeur.
14. Thèmes de couleur de l'interface (Par défaut, Cobalt, Or, Matrix, PinkLady, Forest, Aqua), couleurs des éléments du scénario à l'écran (réglables dans les préférences), visuel de la page d'accueil (fourni par David). *Limite* : à l'écran, la page du scénario suit le thème, mais reste en Courier et au format Final Draft A4 ; les exports (PDF) sont toujours en page blanche, texte noir, Courier, Final Draft A4, quel que soit le thème.
15. Module de planification (spécification `specs/etape-15-planification.md`) : phases de production, tâches et échéances, ligne du temps, plan de tournage (dépouillement des scènes, jours de tournage), exports PDF et calendrier `.ics`. Pas de planning type.
16. Versions Windows et Linux.

10b. Générique final (section 4.1), après les fiches personnages.

**Non prioritaire** : mode plan de l'éditeur (vérifié absent en 13D, 19 nov.) ; imports Final Draft et KIT Scenarist ; plugin Obsidian.

**Mis de côté** (19 novembre 2026, non essentiel) : retour Blender → NeoScenar (durées réelles, vignettes).

**Écarté** (18 novembre 2026) : envoi du PDF par e-mail depuis NeoScenar. Un envoi direct demanderait un serveur ou les identifiants de messagerie des élèves, contraire au principe « 100 % local, sans compte ».
