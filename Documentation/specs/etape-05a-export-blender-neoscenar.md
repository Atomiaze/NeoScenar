# Étape 5a — Export vers Blender (côté NeoScenar)

## Objectif

Depuis NeoScenar, exporter le découpage (scènes, plans, fiches, durées, vignettes) dans un **paquet d'échange**, puis lancer Blender 4.5 pour que le plugin storyboard construise le fichier .blend (étape 5b).

**Architecture décidée** : NeoScenar ne fabrique pas le .blend lui-même. Il écrit le paquet décrit dans `Documentation/specs/format-echange-blender.md` (à lire en premier) ; c'est le plugin Blender qui importe ce paquet avec ses propres fonctions. Cette première version **crée un nouveau fichier .blend** ; la mise à jour d'un .blend existant viendra avec l'aller-retour (étape 14).

Références : `CLAUDE.md`, section 9 du cahier des charges.

Présente ton plan à David avant de commencer.

## 1. Commande « Exporter vers Blender… »

- Menu **Fichier > Exporter vers Blender…** et bouton dans la barre d'outils du module Cartes.
- Fenêtre d'export :
  - **Fichier .blend à créer** : par défaut `06_Blender/Storyboard/<NomDossier>_storyboard.blend` dans le dossier du film ; si `06_Blender` n'existe pas, l'étudiant choisit l'emplacement. Bouton « Choisir… ».
  - Si ce fichier **existe déjà** : message « Ce fichier existe déjà. Pour ne pas écraser le travail fait dans Blender, choisissez un autre nom. », et proposition automatique d'un nom libre (`…_storyboard_v2.blend`). NeoScenar n'écrase jamais un .blend.
  - Case **Ouvrir dans Blender après l'export** (cochée par défaut).
  - Résumé : nombre de scènes, de plans, de vignettes ; avertissement s'il y a des plans sans durée (« 12 plans sans durée : ils prendront la durée par défaut dans Blender »).
  - Si les numéros ne sont **pas verrouillés** : « Verrouiller les numéros maintenant ? C'est recommandé : le fichier Blender utilise ces numéros. » avec les choix Verrouiller / Continuer sans verrouiller.
- L'export écrit le paquet `neoscenar/blender/export/` conformément au format d'échange (écriture dans un dossier temporaire puis remplacement, jamais de paquet à moitié écrit).
- Les vignettes exportées sont les vignettes actuelles des plans, copiées sous le nom `<fullLabel>.png`.
- Ajout compatible dans `projet.json` : `lastBlenderExport` (`null` par défaut) avec la date et le chemin relatif du .blend visé.

## 2. Trouver Blender

- Nouveau réglage de l'application (préférences, pas le projet) : **Emplacement de Blender 4.5**.
- Détection automatique au premier besoin : sur Mac, les applications dont le nom commence par « Blender » dans `/Applications` et `~/Applications`. Pour chaque candidat, lancer `<app>/Contents/MacOS/Blender --version` et ne retenir que la version **4.5.x**.
- Si rien n'est trouvé, ou si plusieurs versions 4.5 existent, l'étudiant choisit l'application dans le sélecteur de fichiers ; la version est vérifiée et un message clair s'affiche si ce n'est pas Blender 4.5.
- Toute la détection est isolée dans une fonction prévue pour les trois systèmes (sur Windows et Linux, elle pourra renvoyer « non trouvé » pour l'instant).

## 3. Lancer Blender

- Blender est lancé **avec son interface** (pas en arrière-plan), comme un programme indépendant : fermer NeoScenar ne ferme pas Blender.
- Arguments : un nouveau fichier vide, puis `--python-expr` avec un court script qui, une fois l'interface prête (via `bpy.app.timers`), appelle `bpy.ops.sb.import_neoscenar(filepath="<chemin absolu de decoupage.json>")`.
- Si l'opérateur n'existe pas (plugin absent, désactivé ou trop ancien), le script affiche dans Blender un message en français : « Pour importer un découpage NeoScenar, installez et activez l'extension « Storyboard – Gestion des plans » version 1.8 ou plus récente. »
- Le chemin est transmis de façon sûre (échappement correct des guillemets, accents et espaces).
- Si Blender ne peut pas être lancé : message clair dans NeoScenar ; le paquet reste exporté et l'étudiant peut l'importer à la main depuis Blender.

## Hors périmètre

- Le plugin Blender (étape 5b).
- Mise à jour d'un .blend existant, retour Blender → NeoScenar (étape 14).
- Windows et Linux.

## Tests automatiques attendus

- Génération de `decoupage.json` à partir d'un découpage : ordre, `label`, `fullLabel` avec et sans lettre, conversion secondes → images (arrondi, minimum 1, `null`), champs vides, couleurs, chemins relatifs, `targetBlend` relatif.
- Conformité à un exemple de référence (fichier de test) du format d'échange.
- Copie des vignettes sous le bon nom ; plans sans vignette.
- Remplacement complet du dossier `export/` (aucun fichier d'un export précédent ne subsiste).
- Refus d'un .blend existant et proposition d'un nom libre.
- Lecture de la version dans la sortie de `Blender --version` (4.5.x accepté, autres refusées).
- Construction des arguments de lancement, avec un chemin contenant espaces, accents et apostrophe.

## Critères de validation (à vérifier par David)

- [ ] Fichier > Exporter vers Blender… propose `06_Blender/Storyboard/<Nom>_storyboard.blend`.
- [ ] Le dossier `neoscenar/blender/export/` contient `decoupage.json` et les vignettes ; le JSON est lisible et conforme à l'exemple du format d'échange.
- [ ] Un plan de 3,5 s dans un projet à 25 i/s donne `durationFrames: 88`.
- [ ] Numéros non verrouillés : la proposition de verrouillage apparaît.
- [ ] Blender 4.5 est trouvé automatiquement ; sinon, on peut le choisir, et une autre version est refusée avec un message clair.
- [ ] Avec « Ouvrir dans Blender » : Blender s'ouvre. Tant que l'étape 5b n'est pas faite, il affiche le message demandant d'installer l'extension.
- [ ] Un .blend déjà présent n'est jamais écrasé.
- [ ] `npm test` et `npm run lint` passent.
