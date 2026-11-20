# Storyboard – Gestion des plans (Blender 4.5 LTS)

Extension pour faire le **storyboard** puis la **production** d'un film d'animation dans un seul fichier `.blend`. Chaque plan est une **scène** (`Plan_0010`, `Plan_0020`…). Une **scène de montage** (« Edit ») contient le Sequencer, avec un strip par plan. L'extension permet de passer de l'un à l'autre en un clic.

Elle peut aussi **importer un découpage NeoScenar** : tout le storyboard est alors construit d'un coup, avec les vignettes devant les caméras (voir la section 3).

> Compatible avec **Blender 4.5 LTS** uniquement.

---

## 1. Installation

1. Dans Blender : **Édition > Préférences > Extensions**.
2. Ouvrez le menu **⌄** (en haut à droite) puis choisissez **Installer depuis le disque…**
3. Sélectionnez le fichier `storyboard_plans-1.8.0.zip` (ne le décompressez pas). Il remplace une version précédente déjà installée ; vos fichiers existants continuent de fonctionner comme avant.
4. Vérifiez que **Storyboard – Gestion des plans** est coché.

Le panneau se trouve dans la **barre latérale (touche N)**, onglet **Storyboard**, dans le **Sequencer** et dans la **vue 3D**.

---

## 2. Préparer la scène modèle

La scène modèle est la base de tous les plans. Elle n'est jamais modifiée par l'extension.

1. Renommez la scène de départ, par exemple `Modele`.
2. Réglez une fois pour toutes :
   - la **résolution** et le **nombre d'images par seconde** ;
   - le **moteur de rendu** et la **gestion des couleurs** ;
   - la **plage d'images** : sa durée sert de durée par défaut d'un nouveau plan ;
   - les **collections** communes (décor, personnages…).
3. Vous pouvez y placer **une caméra de départ**, par exemple avec la focale habituelle du film. Chaque nouveau plan en reçoit sa propre copie, rangée dans la collection `Plan_XXXX_Cameras` et nommée `Plan_XXXX_CAM_01`. Elle devient la caméra active du plan. La caméra de la scène modèle n'est jamais modifiée.
   - Avec les modes **Collections liées** ou **Vide + collections liées**, mettez cette caméra directement dans la **Scene Collection** du modèle, pas dans une collection partagée. Sinon, la caméra du modèle restera visible dans tous les plans, à côté de la caméra propre au plan.

Ensuite, dans l'onglet Storyboard, cliquez sur **Créer la scène de montage** et choisissez `Modele`.

La scène de montage est créée avec une caméra `Edit_Camera`, et la vue 3D passe en vue caméra. Cette caméra ne sert pas au rendu. Elle garde la vue 3D en vue caméra quand vous passez du montage aux plans. Ne la supprimez pas. Si elle manque, par exemple dans un fichier créé avec une ancienne version, **Vérifier le projet** propose de la recréer.

### Réglages (panneau « Réglages »)

| Réglage | Rôle |
|---|---|
| Scène modèle | Scène copiée pour chaque nouveau plan |
| Mode de copie | **Copie complète** : tout est dupliqué. **Collections liées** : décors et personnages partagés entre les plans. **Vide + collections liées** : scène vide, plus les collections cochées dans la liste |
| Canal des plans / du son | Canaux du Sequencer utilisés |
| Poignées | Images supplémentaires avant et après chaque plan, masquées dans le montage (marge pour l'animation) |
| Durée d'un nouveau plan | Celle de la scène modèle, ou une durée personnalisée |
| Synchronisation automatique | Quand vous rallongez ou raccourcissez un strip de plan, le plan suit |
| Nommage des plans | `Plan_0010` ou `NeoScenar (S_0010_P_0010)`. Réglé par l'import NeoScenar, non modifiable à la main |

---

## 3. Importer un découpage NeoScenar

NeoScenar exporte le découpage (scènes, plans, fiches, durées, vignettes) dans le dossier `neoscenar/blender/export/` du film. L'extension construit à partir de lui un **nouveau** fichier storyboard.

### Depuis NeoScenar (le plus simple)
Dans NeoScenar : **Fichier > Exporter vers Blender…**, en gardant **Ouvrir dans Blender** coché. Blender s'ouvre et l'import démarre tout seul. Le fichier est enregistré sous le nom choisi dans NeoScenar, par défaut `06_Blender/Storyboard/<Nom>_storyboard.blend`.

### À la main
1. Dans Blender : **Fichier > Nouveau > Général**.
2. Onglet **Storyboard** > **Importer depuis NeoScenar…**
3. Choisissez le fichier `neoscenar/blender/export/decoupage.json` du film.

### Ce qui est construit
- La scène de départ devient la scène modèle **`Modele`**, au format et à la cadence du projet NeoScenar, avec une durée par défaut de 2 secondes. Le cube du fichier par défaut est supprimé.
- La **scène de montage**, comme avec **Créer la scène de montage**.
- **Un plan par carte NeoScenar**, dans l'ordre du film : `S_0010_P_0010`, `S_0010_P_0010A`… Chaque plan a sa durée (2 secondes s'il n'en a pas dans NeoScenar), le statut Storyboard et ses notes : **Action** (description), **Dialogue** (sons), **Caméra** (échelle · mouvement · angle). Les **Notes détaillées** ajoutent le nom du plan, la scène et la musique.
- Un **repère** au début de chaque scène dans le montage : `S_0010 — INT. CHAMBRE - JOUR`.
- Les **vignettes** : chaque image est copiée dans `vignettes/`, à côté du .blend, puis plaquée devant la caméra du plan. Elle remplit exactement son cadre, tout au fond : le dessin et les objets 3D passent toujours devant. Elle n'est pas sélectionnable, pour ne pas la déplacer par erreur. Elle s'affiche dans la vue caméra (mode Solid), au rendu, et donc dans le montage et l'animatique.

Le fichier est enregistré avec des **chemins relatifs** : vous pouvez déplacer ou copier le dossier du film, le .blend retrouve ses vignettes.

### Afficher ou masquer les vignettes
La case **Afficher les vignettes NeoScenar** du panneau Storyboard masque ou affiche toutes les vignettes d'un coup, par exemple pour voir l'animation seule.

### Couleurs
Pour que les vignettes s'affichent telles quelles, l'import règle la gestion des couleurs sur **Standard** (au lieu d'AgX) et l'aperçu Solid sur un éclairage **Plat** avec les **textures**. Vous pourrez revenir à AgX plus tard, au moment du rendu final.

### Nommage NeoScenar
Dans un fichier importé, les plans gardent les noms de NeoScenar :
- **Nouveau plan** : ajouté à la fin de la scène du strip sélectionné, par exemple `S_0010_P_0040` avant `S_0020_P_0010` ; sans sélection, à la fin de la dernière scène.
- **Insérer un plan** : numéro intermédiaire entre deux plans de la même scène (`S_0010_P_0015`), puis une lettre s'il n'y a plus de numéro libre (`S_0010_P_0010A`).
- **Renuméroter** : renumérote 10, 20, 30… à l'intérieur de chaque scène, sans changer les numéros de scène. Attention : les numéros ne correspondent alors plus à ceux de NeoScenar.
- **Vérifier le projet** signale les noms qui ne suivent pas la forme `S_0010_P_0010`.

### Bon à savoir
- L'import se fait toujours dans un **nouveau fichier**. Il refuse un fichier qui contient déjà un storyboard.
- Il n'écrase **jamais** un .blend existant. Pour un nouvel import, NeoScenar propose un autre nom (`…_v2.blend`).
- Mettre à jour un storyboard déjà commencé à partir d'un nouvel export n'est pas encore possible.
- Chaque plan garde en mémoire l'identifiant de sa carte NeoScenar, même après renumérotation, en vue d'un futur aller-retour avec NeoScenar.

---

## 4. Flux de travail type

### Créer les plans
- **Nouveau plan** : ajoute `Plan_0010`, `Plan_0020`… à la fin du montage.
- **Insérer un plan** : ajoute un plan juste après le strip sélectionné (par exemple `Plan_0015` entre 0010 et 0020). Les plans suivants sont décalés. Cochez l'icône 🔊 pour décaler aussi le son.
- **Renuméroter** : renomme tous les plans dans l'ordre du montage. Les scènes, strips, caméras, marqueurs et notes sont renommés en même temps.
- Dans un fichier importé de NeoScenar, ces trois boutons suivent le nommage `S_0010_P_0010` (voir la section 3).

### Dessiner et animer
- Chaque nouveau plan est prêt à dessiner : il contient un objet Grease Pencil `Plan_XXXX_Dessin` (calque « Lines », trait noir `Storyboard_Trait`) et s'ouvre en **mode Draw**. Si la scène modèle contient déjà un objet Grease Pencil, la **copie complète** réutilise sa copie. Avec les modes liés, un objet propre au plan est créé, pour ne jamais dessiner dans un objet partagé.
- Blender retient le mode de chaque plan : si vous passez un plan en mode Objet, il le restera à votre prochain passage. La scène de montage reste en mode Objet.
- Sélectionnez un strip puis cliquez sur **Ouvrir le plan** (**Ctrl+Alt+O**). Le plan s'ouvre à l'image où se trouvait la tête de lecture.
- Dessinez (Grease Pencil) ou animez dans le plan.
- Le **son du montage** est copié automatiquement dans le plan, calé à la bonne image, pour travailler le lip-sync.

### Caméras
- Cadrez dans la vue 3D, puis cliquez sur **Caméra depuis la vue** (**Ctrl+Alt+V**).
- La caméra `Plan_0010_CAM_01` est créée et liée à un **marqueur** placé à l'image courante.
- Pour changer de caméra en cours de plan, allez à une autre image, recadrez et recommencez. Le montage utilise les marqueurs automatiquement.

### Revenir au montage
- **Retour au montage** (**Ctrl+Alt+M**) : le montage s'ouvre à l'image correspondante, avec le strip du plan sélectionné.
- **Plan suivant / précédent** (**Ctrl+Alt+→ / ←**) : passe directement d'un plan à l'autre.

### Suivi de production
- **Liste des plans** : durée, nombre de caméras, statut et durée totale du film. La flèche de chaque ligne ouvre le plan.
- **Statut** : 9 statuts par défaut, un par couleur d'étiquette du thème : Storyboard (gris), Layout (bleu), Animation (orange), Rendu (violet), Validé (vert), Attention (jaune), À corriger (rouge), Indéterminé (brun) et Incomplet (rose). La couleur du strip suit le statut.
- **Notes** : champs Action, Dialogue et Caméra. Le bouton **Notes détaillées** ouvre un bloc texte dédié.

### Animatique
- Panneau **Animatique** > **Exporter l'animatique** : crée une vidéo MP4 du montage complet, son compris.
- Le nom du plan, le numéro d'image, le timecode et le nom du fichier sont incrustés dans l'image.
- Le fichier est enregistré dans `animatique/`, à côté du `.blend`. **Enregistrez votre fichier avant l'export.**

### Vérifier le projet
**Vérifier le projet** détecte :
- les réglages différents de la scène modèle ;
- les plans absents du montage ;
- les trous et chevauchements entre plans ;
- les noms non conformes ;
- les caméras forcées ;
- le son en double.

Chaque point a un bouton **Corriger**, et **Tout corriger** les traite tous d'un coup.

### Personnaliser les statuts
Cliquez sur la roue dentée **⚙** en haut du panneau Storyboard. Elle ouvre directement les préférences de l'extension, rubrique **Statuts de production** :
- **+ / −** : ajouter ou supprimer un statut (jusqu'à 24) ;
- **▲ / ▼** : changer l'ordre du menu ;
- cliquez sur un nom pour le modifier ;
- cliquez sur la pastille pour choisir n'importe quelle couleur (sélecteur RGB) ;
- **↺** : revenir aux 9 statuts d'origine, avec les couleurs exactes du thème.

Dans le montage, deux affichages de la couleur du statut se règlent dans **Storyboard > Réglages > Couleurs des statuts** :
- **Couleur de fond du strip** : le fond prend la plus proche des 9 couleurs d'étiquette de Blender. C'est une limite de Blender 4.5.
- **Bande de couleur exacte** : une bande de la couleur exacte est dessinée en bas de chaque strip.

Pour n'avoir que la couleur exacte, décochez la première case. Ces deux réglages sont enregistrés dans le fichier .blend.

Points à savoir :
- Cliquez sur **Enregistrer les préférences** pour garder votre liste.
- Les statuts sont propres à chaque ordinateur. Si vous ouvrez un fichier venant d'un autre ordinateur, un statut inconnu garde son nom, suivi de « (?) », mais n'a pas de couleur.

### Où sont stockées les notes ?
Les notes **Action**, **Dialogue** et **Caméra** sont enregistrées **dans le fichier .blend**, comme propriétés de la scène du plan. Les **Notes détaillées** sont un bloc texte `Notes_Plan_XXXX`, lui aussi dans le .blend : vous le retrouvez dans l'éditeur de texte. Les notes suivent donc le fichier quand vous l'enregistrez ou le copiez sur un autre ordinateur, et Renuméroter les renomme avec le plan.

---

## 5. Raccourcis clavier

| Action | Raccourci |
|---|---|
| Ouvrir le plan | **Ctrl+Alt+O** |
| Retour au montage | **Ctrl+Alt+M** |
| Plan suivant | **Ctrl+Alt+→** |
| Plan précédent | **Ctrl+Alt+←** |
| Caméra depuis la vue | **Ctrl+Alt+V** (souris au-dessus de la vue 3D) |

Vous pouvez modifier ces raccourcis dans **Préférences > Extensions > Storyboard – Gestion des plans**.

---

## 6. Conseils

- Ne renommez pas les plans à la main : utilisez **Renuméroter**.
- Ne forcez pas de caméra dans un strip de plan, sinon les marqueurs de caméra sont ignorés.
- Après avoir changé la durée d'un plan dans sa scène, utilisez **Appliquer la durée de la scène au strip**.
- Une scène de plan doit rester plus longue que ses deux poignées. Sinon, l'extension refuse de synchroniser et **Vérifier le projet** propose une réparation.
- L'extension ne supprime jamais de plan. Pour en retirer un, supprimez son strip et sa scène vous-même.
