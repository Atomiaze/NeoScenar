# Étape 0 — Squelette de l'application

## Objectif

Mettre en place une application Electron vide mais complète : elle se lance en mode développement, ses tests s'exécutent, et elle produit un installeur Mac qui s'installe et s'ouvre. Aucune fonctionnalité de NeoScenar n'est développée à cette étape : il s'agit des fondations sur lesquelles tout le reste sera construit.

Lis d'abord `CLAUDE.md` à la racine du projet.

## Avant de commencer

1. Vérifie que Node.js (version LTS actuelle) et Git sont installés sur le Mac. Sinon, explique à David comment les installer.
2. Le dossier contient déjà `CLAUDE.md` et `Documentation/` : ne les supprime pas, ne les déplace pas.
3. Présente à David ton plan (outils, structure des dossiers, commandes) et attends son accord.

## Ce qu'il faut faire

1. **Initialiser le dépôt Git** et un `.gitignore` adapté (Node, Electron, macOS : `.DS_Store`).
2. **Créer le projet Electron + React + TypeScript** avec electron-vite, en respectant la structure décrite dans `CLAUDE.md` (`src/main`, `src/preload`, `src/renderer`, `src/shared`).
3. **Configurer la sécurité Electron** : `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`. Le preload expose une API minimale, typée, avec un seul appel d'exemple (`getAppVersion()`), utilisé par l'interface.
4. **Fenêtre principale** :
   - titre « NeoScenar » ;
   - taille par défaut confortable (au moins 1280 × 800), redimensionnable, taille minimale raisonnable ;
   - contenu : le nom « NeoScenar », une phrase d'accueil en français et le numéro de version obtenu via `getAppVersion()`.
5. **Menu de l'application** en français (Fichier, Édition, Affichage, Fenêtre, Aide), avec les entrées standard du Mac (Annuler, Rétablir, Couper, Copier, Coller, Tout sélectionner, Quitter NeoScenar…). Les entrées propres à NeoScenar viendront plus tard.
6. **Textes de l'interface** regroupés dans `src/renderer/i18n/fr.ts`.
7. **Module Fountain vide** : créer `packages/fountain/` comme module TypeScript indépendant (espace de travail npm), avec un fichier d'entrée, une fonction factice et **un test Vitest** qui passe. Ce module ne doit dépendre ni d'Electron, ni de React, ni de Node.
8. **Tests** : Vitest configuré pour l'application et pour `packages/fountain`, avec au moins un test de chaque côté.
9. **Qualité** : ESLint et Prettier configurés ; le code existant passe sans erreur.
10. **Empaquetage Mac** avec electron-builder :
    - format `.dmg` ;
    - application universelle (Intel + Apple Silicon) ;
    - nom du produit « NeoScenar », identifiant `be.saintluc.neoscenar` ;
    - pas de signature ni de notarisation Apple ;
    - icône provisoire (un simple carré coloré avec « NS » suffit).
11. **Licence** : fichier `LICENSE` avec le texte de la GPL-3.0, et champ `license` du `package.json` à `GPL-3.0-or-later`.
12. **README.md** en français : présentation en deux phrases, commandes pour lancer, tester et construire l'application, et procédure d'ouverture d'une application non signée sur Mac (clic droit > Ouvrir, ou Réglages Système > Confidentialité et sécurité > « Ouvrir quand même »).
13. **Scripts npm** clairs, au minimum :
    - `npm run dev` : lance l'application en mode développement ;
    - `npm test` : lance tous les tests ;
    - `npm run lint` : vérifie le code ;
    - `npm run build:mac` : produit l'installeur Mac.
14. Premier commit : « Crée le squelette de l'application NeoScenar ».

## Hors périmètre

- Aucune fonctionnalité métier (projets, cartes, scénario, Blender).
- Pas de versions Windows ni Linux pour l'instant (mais rien dans le code ne doit les empêcher).
- Pas de mise à jour automatique, pas de connexion réseau.

## Critères de validation

David doit pouvoir vérifier lui-même chacun de ces points :

- [ ] `npm install` puis `npm run dev` ouvre une fenêtre « NeoScenar » avec le texte d'accueil en français et le numéro de version.
- [ ] Le menu de l'application est en français et Copier/Coller fonctionnent.
- [ ] `npm test` exécute les tests de l'application et de `packages/fountain`, et tous passent.
- [ ] `npm run lint` ne signale aucune erreur.
- [ ] `npm run build:mac` produit un fichier `.dmg`.
- [ ] Le `.dmg` s'ouvre, l'application se glisse dans Applications et s'ouvre (après la manipulation pour application non signée).
- [ ] Le fichier `LICENSE` contient la GPL-3.0 et le `README.md` explique comment lancer, tester et construire.
- [ ] Le dépôt Git contient un premier commit, sans `node_modules/` ni dossier de build.

À la fin, résume ce qui a été fait, signale tout écart par rapport à cette spécification et toute décision que tu as dû prendre seul.
