# NeoScenar — consignes pour Claude Code

## Méthode de travail (à lire en premier)

- Au début d'une session, lis d'abord `Documentation/etat-du-projet.md` ; ne lis le cahier des charges et les specs qu'en cas de besoin.
- Tiens `Documentation/etat-du-projet.md` à jour à chaque commit d'étape ou de sous-étape, en restant sur une page.
- Rapports courts : 10 à 15 lignes, plus les décisions prises seul, les questions et les essais pour David.
- Pendant le travail, ne lance que les tests concernés ; la suite complète seulement avant le commit.
- Captures d'écran de l'outil de pilotage seulement quand elles sont utiles.

## Le projet

NeoScenar est une application de bureau gratuite et libre (GPL-3.0) d'écriture de scénarios pour les étudiants en audio-visuel de l'IES Saint Luc Liège (enseignement secondaire artistique). Elle s'inspire de KIT Scenarist (logiciel abandonné) et ajoute un découpage technique en plans, un storyboard et un export vers Blender.

Le cahier des charges complet se trouve dans `Documentation/cahier-des-charges.md`. Les spécifications de chaque étape sont dans `Documentation/specs/`. **On ne travaille que sur l'étape demandée**, en suivant sa spécification.

## Principes non négociables

- Gratuit, sans compte, sans abonnement.
- 100 % local : aucun serveur, aucune connexion réseau requise, aucune télémétrie.
- Les fichiers de l'étudiant restent lisibles et ouverts (Fountain, JSON, Markdown, images). Jamais de base de données opaque.
- Interface entièrement en français.
- Simple à prendre en main pour des élèves du secondaire.

## Avec qui tu travailles

David, enseignant en audio-visuel. Il n'est pas développeur de métier : il pratique Blender (et écrit des plugins Python), Unity, DaVinci Resolve, Obsidian.

- Réponds et explique **en français**, simplement, sans jargon inutile.
- Avant une tâche importante, présente un plan court et attends son accord.
- Quand une spécification est ambiguë ou incomplète, **pose la question** au lieu d'inventer.
- Ne fais rien qui sorte du périmètre de l'étape en cours, même si cela paraît utile : propose-le plutôt.
- À la fin d'une étape, donne la liste des critères de validation et explique comment David peut les vérifier lui-même (commandes exactes à taper, ce qu'il doit voir).
- S'il faut installer un outil (Node.js, Git…), explique comment et pourquoi.

## Technologie

- Electron + TypeScript (mode strict).
- Interface : React. Outil de construction : electron-vite. Empaquetage : electron-builder.
- Tests : Vitest.
- Qualité : ESLint + Prettier.
- Éditeur de scénario (plus tard) : CodeMirror 6.

## Architecture

```
src/main/        processus principal Electron : fichiers, dialogues système, lancement de Blender
src/preload/     pont sécurisé entre main et renderer (API typée, minimale)
src/renderer/    interface React
src/shared/      types et constantes partagés
packages/fountain/  analyseur Fountain, module TypeScript INDÉPENDANT (aucune dépendance à Electron, React ou Node)
```

Règles de sécurité Electron : `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`. Le renderer n'accède jamais directement au disque : tout passe par des appels IPC typés exposés par le preload.

## Plateformes

- On développe et teste **d'abord sur macOS** (iMac Intel). Windows et Linux viendront à la fin.
- Le code doit pourtant rester **portable dès le départ** :
  - chemins toujours construits avec `path.join` / `path.resolve`, jamais de `/` concaténé à la main, jamais de chemin propre au Mac écrit en dur ;
  - attention à la casse des noms de fichiers (le Mac l'ignore, Linux non) ;
  - tout ce qui dépend du système (emplacement de Blender, dossiers par défaut) est isolé dans une fonction prévue pour les trois systèmes.
- L'application Mac est construite pour Intel **et** Apple Silicon.
- L'application n'est pas signée par Apple (choix assumé).

## Données des projets

Voir la section 3 du cahier des charges. En résumé :

- Un projet = un dossier de film, avec un fichier `Nom.neoscenar` à la racine et un dossier `neoscenar/` (scenario.fountain, projet.json, decoupage.json, personnages/, lieux/, storyboard/…).
- **Chemins relatifs uniquement** dans les fichiers du projet (le projet doit fonctionner après copie sur une clé USB ou un autre ordinateur).
- **Enregistrement sûr** : écrire dans un fichier temporaire puis le renommer à la place de l'ancien.
- UTF-8 partout. Un numéro de version du format dans `projet.json`.
- Chaque scène et chaque plan a un identifiant interne permanent, distinct de son nom affiché (S_0010, P_0010).
- Aucun accent ni espace dans les noms de dossiers et fichiers créés par l'application.

## Conventions de code

- Noms de variables, fonctions et fichiers de code : en anglais.
- Commentaires : en français, et seulement là où ils aident à comprendre le « pourquoi ».
- Textes visibles par l'utilisateur : en français, regroupés dans un seul endroit (`src/renderer/i18n/fr.ts`) plutôt qu'éparpillés dans le code.
- Petites fonctions, petits fichiers, noms explicites.
- Toute logique qui ne dépend pas de l'interface (numérotation des plans, lecture/écriture des fichiers, Fountain) est testée avec Vitest.

## Vérifier dans l'application réelle

Les tests ne suffisent pas pour ce qui dépend de l'interface (menus, fenêtres, modules). L'outil `scripts/pilotage/` (outil de développement, jamais livré) lance NeoScenar réel sur un projet d'essai créé dans un dossier temporaire, avec des préférences séparées, puis le pilote : menus, clics, curseur dans l'éditeur, fenêtres, captures d'écran, erreurs des consoles.

- Lancer un essai : `npm run pilote -- scripts/pilotage/essais/<essai>.mjs` (construit l'application d'abord).
- Un essai est un petit fichier qui reçoit `app` (commandes : `openProject`, `module`, `menu`, `menuLabels`, `click`, `mouseClick`, `dialog`, `dialogButton`, `sceneCards`, `scriptLines`, `navigatorCurrent`, `screenshot`) et `check(condition, message)`. Voir `scripts/pilotage/essais/` pour des exemples.
- Après une correction qui touche l'interface, écrire ou relancer l'essai correspondant, regarder les captures, et le signaler à David.

## Git

- Un commit par tâche cohérente, message en français, à l'impératif (« Ajoute la fenêtre de création de projet »).
- Ne jamais committer `node_modules/`, `dist/`, `out/`, ni des fichiers de projets d'étudiants.
