# Étape 1 — Projet et stockage

## Objectif

Permettre de créer, ouvrir, fermer et rouvrir un projet NeoScenar. À la création, NeoScenar prépare toute l'arborescence du film (dossiers de production) et son propre dossier `neoscenar/`. Cette étape pose les formats de fichiers sur lesquels reposeront tous les modules suivants : elle doit être particulièrement soignée et testée.

Références : `CLAUDE.md` et sections 3, 3.1 et 3.2 de `Documentation/cahier-des-charges.md`.

Présente ton plan à David avant de commencer, en particulier les formats JSON proposés.

## 1. Écran d'accueil

Affiché au lancement, et quand on ferme un projet.

- Titre « NeoScenar » et numéro de version.
- Bouton **Nouveau projet…**
- Bouton **Ouvrir un projet…** (sélection d'un fichier `.neoscenar`).
- Liste des **projets récents** (10 au maximum), du plus récent au plus ancien : titre du projet, emplacement, date de dernière ouverture. Un clic ouvre le projet.
  - Un projet introuvable (déplacé, clé USB retirée) est affiché grisé avec la mention « introuvable » ; un bouton permet de le retirer de la liste.
  - La liste est enregistrée dans les données de l'application (dossier `userData` d'Electron), jamais dans les projets.

## 2. Fenêtre de création de projet

Champs, dans cet ordre :

1. **Nom du projet** (texte libre, ex. « Mon Film d'été »). Sous le champ, afficher en direct le nom de dossier qui sera créé (ex. `Mon_Film_d_ete`).
2. **Emplacement** : bouton « Choisir… » ouvrant le sélecteur de dossier du système. Par défaut, le dernier emplacement utilisé, sinon le dossier Documents.
3. **Type de projet** : *Film*, *Animation Blender*, *Mixte*, *Personnalisé*. Le choix coche les dossiers par défaut (voir tableau) ; *Mixte* coche l'union de Film et Animation ; *Personnalisé* ne coche rien.
4. **Dossiers du film** : liste avec une case à cocher par dossier et une courte description. L'étudiant peut cocher et décocher librement après avoir choisi le type.
5. Case **« Ajouter un fichier LISEZMOI dans chaque dossier »**, cochée par défaut.
6. Boutons **Annuler** et **Créer le projet**.

Validation :

- Le nom ne peut pas être vide.
- Si un dossier du même nom existe déjà à cet emplacement, afficher un message clair et ne rien créer.
- Le bouton « Créer le projet » reste désactivé tant que les champs ne sont pas valides.

### Nettoyage du nom de dossier

Fonction pure et testée :

- accents retirés (é → e, ç → c, œ → oe…) ;
- espaces, apostrophes et ponctuation remplacés par `_` ;
- plusieurs `_` consécutifs réduits à un seul, pas de `_` au début ni à la fin ;
- majuscules et minuscules conservées ;
- seuls restent lettres sans accent, chiffres, `_` et `-`.

Exemple : « Mon Film d'été » → `Mon_Film_d_ete`. Le titre d'origine, avec ses accents, est conservé dans `projet.json`.

### Modèle de dossiers

La liste des dossiers n'est pas écrite en dur dans le code : elle est lue dans un fichier JSON de modèle livré avec l'application (`resources/modeles/saint-luc.json` ou équivalent). Pour chaque dossier : nom, sous-dossiers, description (utilisée dans la fenêtre et dans le LISEZMOI), et types de projet pour lesquels il est coché par défaut.

| Dossier | Sous-dossiers | Description | Film | Animation |
|---|---|---|---|---|
| `01_Production` | — | Note d'intention, planning, autorisations, droits | ✓ | ✓ |
| `02_References` | — | Références, moodboard, vidéos de référence volumineuses | ✓ | ✓ |
| `03_Rushes` | — | Vidéos tournées | ✓ | |
| `04_Son` | `Prise_de_son`, `Voix_off`, `Bruitages`, `Musique` | Tous les fichiers son du film | ✓ | ✓ |
| `05_Images` | — | Photos, illustrations, éléments importés | ✓ | ✓ |
| `06_Blender` | `Storyboard`, `Assets/Personnages`, `Assets/Decors`, `Assets/Accessoires`, `Textures`, `Plans` | Fichiers Blender du film | | ✓ |
| `07_Rendus` | — | Séquences d'images et rendus Blender | | ✓ |
| `08_Graphisme` | — | Titrage, génériques, logos | ✓ | ✓ |
| `09_VFX` | — | Compositing, After Effects | | |
| `10_Montage` | — | Projet Premiere ou DaVinci | ✓ | ✓ |
| `11_Exports` | — | Versions de travail et version finale | ✓ | ✓ |
| `12_Archives` | — | Éléments abandonnés qu'on ne veut pas jeter | | |

L'édition du modèle depuis l'interface et la distribution d'un modèle personnalisé sont hors périmètre, mais le code doit déjà charger le modèle depuis ce fichier.

## 3. Ce que crée « Créer le projet »

```
Mon_Film_d_ete/
├── Mon_Film_d_ete.neoscenar
├── neoscenar/
│   ├── scenario.fountain
│   ├── projet.json
│   ├── decoupage.json
│   ├── personnages/images/
│   ├── lieux/images/
│   ├── documents/
│   ├── storyboard/scans/
│   ├── storyboard/vignettes/
│   ├── blender/
│   ├── versions/
│   ├── sauvegardes/
│   └── exports/
└── (dossiers du film cochés, avec leurs sous-dossiers et LISEZMOI.txt)
```

Contenu initial :

- **`Mon_Film_d_ete.neoscenar`** : petit fichier JSON qui identifie le projet (type de fichier, version du format, nom du dossier de données `neoscenar`). C'est le fichier qu'on ouvre.
- **`scenario.fountain`** : page de titre Fountain avec `Title:` (titre d'origine, accents compris) et `Author:` vide, puis une ligne vide. Pas encore de scène.
- **`projet.json`** : version du format (1), identifiant unique du projet, titre, nom de dossier, type de projet, dates de création et de modification, logline et synopsis vides, réglages (images par seconde : 25 ; définition : 1920 × 1080), liste des dossiers du film créés.
- **`decoupage.json`** : version du format (1), numéros non verrouillés, et une scène S_0010 contenant un plan P_0010 (règle « un nouveau projet contient d'office la scène S_0010 »). Chaque scène et chaque plan a un identifiant interne permanent (UUID). Les numéros sont stockés comme des nombres (10, 20…) avec une éventuelle lettre (« A ») ; l'affichage S_0010 / P_0010 est produit par une fonction partagée et testée. Prévoir dès maintenant les champs de la fiche plan (cahier des charges, section 5), vides.
- **`LISEZMOI.txt`** (si l'option est cochée) : dans chaque dossier du film, deux ou trois lignes en français expliquant ce qu'on y range.

Les types TypeScript de ces fichiers sont définis dans `src/shared/` et documentés. Propose-les à David avant de les figer.

## 4. Ouvrir et fermer un projet

- Ouverture par : la liste des projets récents, « Ouvrir un projet… », le menu **Fichier > Ouvrir…** (`Cmd + O`), ou un double-clic sur le fichier `.neoscenar` dans le Finder (association de fichier dans electron-builder ; à vérifier sur l'application construite).
- Un seul projet ouvert à la fois. Ouvrir un autre projet ferme le premier.
- Une fois ouvert, la fenêtre affiche provisoirement : le titre du projet, son emplacement, le nombre de scènes et de plans lus dans `decoupage.json`. Les vrais modules viendront aux étapes suivantes.
- **Fichier > Fermer le projet** (`Cmd + W`) revient à l'écran d'accueil.
- Le titre de la fenêtre indique le projet ouvert : « NeoScenar — Mon Film d'été ».

## 5. Compléter la structure

Menu **Fichier > Compléter la structure du projet…** : affiche la liste des dossiers du modèle ; ceux qui existent déjà sont cochés et grisés ; l'étudiant coche ceux à ajouter. Rien n'est jamais supprimé ni déplacé. `projet.json` est mis à jour.

## 6. Robustesse (essentiel)

- **Enregistrement sûr** : une fonction utilitaire unique écrit dans un fichier temporaire du même dossier puis le renomme à la place de l'ancien. Tous les fichiers du projet passent par elle.
- **Chemins relatifs uniquement** dans les fichiers du projet. Seule la liste des projets récents (côté application) contient des chemins absolus.
- **Lecture prudente** : fichier manquant, JSON invalide ou champ inattendu → message clair en français (« Le fichier decoupage.json est illisible… »), jamais de plantage ni de fenêtre blanche. Ne jamais écraser un fichier qu'on n'a pas réussi à lire.
- **Version du format** : un projet dont la version est plus récente que celle gérée par l'application affiche « Ce projet a été créé avec une version plus récente de NeoScenar » et n'est pas modifié.
- Tout accès disque se fait dans le processus principal ; l'interface passe par des appels IPC typés du preload.
- UTF-8 partout ; fins de ligne `\n`.

## Hors périmètre

- Modules Cartes, Scénario, Recherches, Storyboard, Blender.
- Sauvegardes automatiques et versions (seuls les dossiers sont créés).
- Édition du modèle de dossiers depuis l'interface.
- Windows et Linux (mais aucun choix ne doit les empêcher).

## Tests automatiques attendus

- Nettoyage du nom de dossier : accents, apostrophes, espaces multiples, ponctuation, chaîne vide, nom déjà propre.
- Formatage des numéros : 10 → S_0010, 15 → P_0015, 10 + « A » → P_0010A.
- Enregistrement sûr : le fichier final est complet ; un échec d'écriture laisse l'ancien fichier intact.
- Création d'un projet dans un dossier temporaire : arborescence et contenus conformes, selon le type de projet et les cases cochées, avec et sans LISEZMOI.
- Relecture du projet créé : les données lues sont identiques à celles écrites.
- Projet abîmé : JSON invalide, fichier manquant, version de format trop récente → erreur claire, aucun fichier modifié.
- Aucun chemin absolu dans les fichiers du projet.

## Critères de validation (à vérifier par David)

- [ ] Au lancement, l'écran d'accueil s'affiche avec « Nouveau projet… », « Ouvrir un projet… » et la liste des projets récents.
- [ ] La création de « Mon Film d'été », type *Animation Blender*, produit le dossier `Mon_Film_d_ete` avec la structure attendue, les bons dossiers du film et les LISEZMOI.
- [ ] Le nom de dossier nettoyé s'affiche en direct pendant la saisie du nom.
- [ ] Créer un projet dont le dossier existe déjà affiche un message et ne crée rien.
- [ ] Le projet ouvert affiche son titre (avec accents), son emplacement, 1 scène et 1 plan.
- [ ] Fermer le projet ramène à l'accueil ; le projet apparaît dans les récents et se rouvre d'un clic.
- [ ] Double-cliquer sur `Mon_Film_d_ete.neoscenar` dans le Finder ouvre le projet (application construite avec `npm run build:mac`).
- [ ] « Compléter la structure » ajoute un dossier oublié sans toucher aux autres.
- [ ] Copier le dossier du projet ailleurs (ou sur une clé USB) puis l'ouvrir depuis ce nouvel emplacement : tout fonctionne.
- [ ] Renommer ou déplacer le projet le fait apparaître « introuvable » dans les récents, sans plantage.
- [ ] Remplacer le contenu de `decoupage.json` par du texte quelconque puis ouvrir le projet : message clair, aucun plantage, fichier non écrasé.
- [ ] `npm test` et `npm run lint` passent.

À la fin, résume ce qui a été fait, montre à David un exemple réel de `projet.json` et de `decoupage.json` créés, et signale toute décision prise seul.
