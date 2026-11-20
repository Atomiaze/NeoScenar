# Étape 5b — Import NeoScenar dans le plugin storyboard Blender

## Objectif

Faire évoluer l'extension Blender « Storyboard – Gestion des plans » (version 1.7.1, Blender 4.5 LTS) pour qu'elle **importe un découpage NeoScenar** et construise tout le projet storyboard avec ses propres fonctions : scène modèle au bon format, scène de montage, un plan par carte NeoScenar, caméras, Grease Pencil, notes, vignettes plaquées devant les caméras.

Références : `Documentation/specs/format-echange-blender.md` (format lu par l'import, à lire en premier), `LISEZMOI.md` du plugin, section 9 du cahier des charges.

**Principe essentiel** : tout ce qui marche aujourd'hui dans le plugin doit continuer de marcher à l'identique pour les fichiers existants (mode `Plan_0010`). Les élèves ont des projets en cours.

Présente ton plan à David et propose un découpage en sous-étapes (par exemple : A. rangement, outillage et tests ; B. mode de nommage NeoScenar ; C. import des scènes, plans, notes, durées ; D. vignettes ; E. finitions et documentation).

## 0. Rangement dans le dépôt

1. Déplacer le dossier `storyboard_plans-1.7.1/` vers `blender-addon/storyboard_plans/` avec `git mv` (ou ajout dans Git s'il n'est pas encore suivi), dans un commit à part : « Ajoute l'extension Blender storyboard_plans 1.7.1 au dépôt ».
2. Créer `blender-addon/CLAUDE.md` : extension Python pour **Blender 4.5 LTS uniquement** (API 4.5, manifeste d'extension), interface en français, conventions du code existant à respecter (fonctions centralisées dans `utils.py`, erreurs `SBError` avec messages en français, aucun plan supprimé par l'extension), comment lancer les tests.
3. Exclure `blender-addon/` d'ESLint, de Prettier, de Vitest et de l'empaquetage Electron.
4. Script `npm run build:addon` : construit le zip installable avec `blender --command extension build` (Blender 4.5 trouvé comme à l'étape 5a, ou chemin passé en paramètre), dans `dist/addon/`.
5. Version de l'extension : **1.8.0**. Mettre à jour `LISEZMOI.md` (nouvelle section « Importer un découpage NeoScenar »).

## 1. Tests automatiques sans interface

Mettre en place des tests lancés par Blender 4.5 en arrière-plan (`blender -b --factory-startup --python blender-addon/tests/run.py`), qui chargent l'extension depuis le dossier du dépôt. Script `npm run test:addon`. Les tests existants du plugin, s'il y en avait, sont repris. Les tests d'import utilisent un petit paquet d'exemple (2 scènes, 5 plans dont un avec lettre, 2 vignettes PNG minuscules) placé dans `blender-addon/tests/donnees/`.

## 2. Mode de nommage « NeoScenar »

Nouveau réglage dans `SB_Settings` : `naming_mode` = `PLAN` (par défaut, comportement actuel) ou `NEOSCENAR` (réglé par l'import ; visible mais non modifiable à la main dans le panneau Réglages).

En mode `NEOSCENAR` :

- Noms des plans : `S_0010_P_0010`, avec lettre facultative `S_0010_P_0010A`. Tri par (scène, plan, lettre).
- Tous les noms dérivés suivent : `S_0010_P_0010_Cameras`, `S_0010_P_0010_CAM_01`, `S_0010_P_0010_Dessin`, `Notes_S_0010_P_0010`, marqueurs, strips.
- **Nouveau plan** : à la fin de la scène NeoScenar du strip sélectionné (sans sélection : à la fin de la dernière scène), numéro = multiple de 10 suivant dans cette scène.
- **Insérer un plan** : entre deux plans **de la même scène** : numéro intermédiaire ; s'il n'y a plus de numéro libre, une lettre (P_0010A…), comme dans NeoScenar. Insertion après le dernier plan d'une scène : multiple de 10 suivant.
- **Renuméroter** : renumérote les plans à l'intérieur de chaque scène (10, 20, 30…), sans toucher aux numéros de scène ; confirmation préalable : « Les numéros ne correspondront plus à ceux de NeoScenar. Continuer ? ».
- **Vérifier le projet** : accepte les noms du mode en cours et signale les noms non conformes à ce mode.
- Toute l'analyse et la fabrication des noms reste **centralisée** (fonctions de `utils.py` qui tiennent compte du mode) : aucune expression régulière de nom ne doit être dupliquée ailleurs.

En mode `PLAN`, rien ne change.

## 3. Identifiants NeoScenar

Ajouts aux propriétés (cachées) :

- `SB_PlanProps` : `neoscenar_shot_id`, `neoscenar_scene_id`.
- `SB_Settings` : `neoscenar_project_id`, `neoscenar_source` (chemin du `decoupage.json` importé).

Ils servent au futur aller-retour : ils ne changent jamais, même après renumérotation. Un plan créé dans Blender a des identifiants vides.

## 4. Opérateur « Importer un découpage NeoScenar »

`sb.import_neoscenar`, avec une propriété `filepath` ; accessible dans le panneau Storyboard (bouton « Importer depuis NeoScenar… » qui ouvre le sélecteur de fichiers sur un `decoupage.json`) et appelable par NeoScenar (étape 5a, via `--python-expr` et un timer, interface présente).

### 4.1 Vérifications

- Fichier lisible, `format` = `neoscenar-blender`, `formatVersion` ≤ 1 ; sinon message clair.
- Le fichier Blender courant ne doit contenir **ni scène de montage ni plan** ; sinon : « Importez dans un nouveau fichier (Fichier > Nouveau > Général). ».
- Le .blend visé (`targetBlend`, relatif au JSON) ne doit pas exister ; sinon message, rien n'est fait.

### 4.2 Construction

1. **Scène modèle** : la scène courante est renommée `Modele` ; résolution = `settings.width` × `settings.height`, échelle 100 %, cadence = `settings.fps` (`fps_base` = 1) ; durée par défaut : 2 secondes. Si la scène contient exactement les objets du fichier par défaut (Cube, Light, Camera), le cube est supprimé. Elle doit contenir une caméra dans la Scene Collection (créée si absente).
2. **Scène de montage** : créée avec la même logique que « Créer la scène de montage » (caméra `Edit_Camera` comprise), modèle = `Modele`, `naming_mode` = `NEOSCENAR`, identifiant du projet et chemin source enregistrés. Autres réglages : valeurs par défaut du plugin.
3. **Plans** : pour chaque plan, dans l'ordre du film, création avec la fonction existante de création de plan (scène copiée du modèle, caméra `…_CAM_01`, Grease Pencil, poignées, strip ajouté à la suite dans le montage), avec :
   - nom = `fullLabel` ;
   - durée = `durationFrames`, ou la durée par défaut si `null` ;
   - statut = premier statut (Storyboard) ;
   - identifiants NeoScenar ;
   - **notes** : Action ← `description` ; Dialogue ← `sounds` ; Caméra ← `scale`, `movement`, `angle` non vides, séparés par « · » ; **Notes détaillées** (bloc texte) ← nom du plan, en-tête et nom de la scène, musique, sous forme lisible.
4. **Repères de scène** : dans la scène de montage, un marqueur au début du premier plan de chaque scène NeoScenar, nommé `S_0010 — INT. CHAMBRE - JOUR` (ou le nom de la scène si l'en-tête est vide).
5. **Enregistrement** : création des dossiers manquants, enregistrement sous `targetBlend`, chemins rendus relatifs ; affichage final de la scène de montage dans le Sequencer.
6. Barre de progression pendant l'import, puis rapport : « 32 plans importés dans 6 scènes. ».

### 4.3 Vignettes

Pour chaque plan qui a une vignette :

- l'image est copiée dans `vignettes/` **à côté du .blend** (`<fullLabel>.png`) et chargée avec un chemin relatif ;
- un plan 3D `<fullLabel>_Vignette` portant l'image, dans une collection `<fullLabel>_Vignette` de la scène du plan, est **rattaché à la caméra du plan** et dimensionné pour **remplir exactement le champ** de la caméra (en tenant compte de la focale, du capteur, de son ajustement et des proportions de l'image) ;
- matériau non éclairé (l'image s'affiche telle quelle, quelle que soit la lumière) ;
- non sélectionnable dans la vue, pour ne pas être déplacé par erreur ;
- visible **dans la vue caméra en mode Solid** (réglage d'affichage du plan adapté pour montrer les textures), **au rendu** et donc dans le montage du Sequencer ;
- le dessin Grease Pencil du plan reste **toujours devant** la vignette, vu depuis la caméra ;
- une case « Afficher les vignettes NeoScenar » dans le panneau Storyboard masque ou affiche toutes les vignettes d'un coup.

## Hors périmètre

- Mise à jour d'un .blend existant à partir d'un nouvel export, et retour Blender → NeoScenar (étape 14) — mais les identifiants doivent le permettre.
- Création de nouvelles scènes NeoScenar depuis Blender.
- Couleurs des cartes NeoScenar (le strip garde la couleur du statut).

## Tests automatiques attendus (Blender en arrière-plan)

- Mode `PLAN` : comportement identique à la 1.7.1 (création, insertion, renumérotation, vérification).
- Mode `NEOSCENAR` : analyse et fabrication des noms (avec et sans lettre), tri, nouveau plan dans la bonne scène, insertion avec numéro intermédiaire puis lettre, renumérotation par scène, noms dérivés.
- Import du paquet d'exemple : scène `Modele` au bon format et à la bonne cadence ; scène de montage marquée ; 5 plans dans l'ordre, bons noms, bonnes durées (y compris la durée par défaut) ; notes ; identifiants ; marqueurs de scène ; vignettes (fichier copié, chemin relatif, objet rattaché à la caméra, taille qui remplit le champ) ; fichier enregistré.
- Refus : fichier non vide, .blend existant, format inconnu, version trop récente.

## Critères de validation (à vérifier par David)

- [ ] `npm run build:addon` produit le zip ; il s'installe dans Blender 4.5 et remplace la 1.7.1.
- [ ] Un ancien projet `Plan_0010` s'ouvre et fonctionne exactement comme avant.
- [ ] Depuis NeoScenar, Exporter vers Blender avec « Ouvrir dans Blender » : Blender s'ouvre, importe et enregistre `06_Blender/Storyboard/<Nom>_storyboard.blend`.
- [ ] Le montage contient un strip par plan, dans l'ordre, avec les bonnes durées et un marqueur au début de chaque scène.
- [ ] Ouvrir un plan : la vignette remplit le cadre de la caméra, le dessin Grease Pencil passe devant, les notes Action / Dialogue / Caméra sont remplies.
- [ ] Lecture du montage : les vignettes s'enchaînent comme une animatique.
- [ ] La case « Afficher les vignettes NeoScenar » masque toutes les vignettes.
- [ ] Nouveau plan, Insérer et Renuméroter respectent les noms `S_0010_P_0010`.
- [ ] Déplacer le dossier du film ailleurs : le .blend retrouve ses vignettes.
- [ ] `npm run test:addon` passe.
