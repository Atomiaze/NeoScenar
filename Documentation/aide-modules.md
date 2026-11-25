# Aide — Cartes, Données du projet, Planification, Statistiques

*Textes de la fenêtre « Aide » de quatre modules (lot 5), branchés dans `fr.ts` (`cardsHelp`, `researchHelp`, `planningHelp`, `statsHelp`) et vérifiés dans l'application le 25 nov. Même présentation que `aide-scenario.md` : un titre `##` = un onglet. Sur Windows et Linux, ⌘ devient Ctrl et Option devient Alt (`platformText.ts`).*

---

# Partie A — Cartes

## 1. Le tableau

Le module Cartes montre le **découpage** du film : une rangée par scène, avec ses plans à la suite. Chaque carte porte un numéro : `S_0010` pour une scène, `P_0010` pour un plan.

- Le scénario et les cartes sont reliés : une scène écrite dans le scénario a sa carte, et une carte de scène ajoutée ici crée son en-tête dans le scénario.
- En haut à droite, la **durée totale du film** additionne les durées des plans.
- Le curseur **Taille des cartes** agrandit ou réduit le tableau. **Afficher les vignettes** montre les dessins sur les cartes.
- Tout s'enregistre tout seul. **⌘ + Z** annule, **⌘ + Maj + Z** rétablit.

## 2. Scènes et plans

| Action | Comment |
|---|---|
| Ajouter une scène ou un plan | Boutons **Ajouter une scène**, **Ajouter un plan** |
| En ajouter plusieurs d'un coup | **Ajouter plusieurs…** (après la sélection ou à la fin) |
| Insérer un plan avant / après, insérer une scène après, dupliquer, changer la couleur, supprimer | Clic droit sur une carte |
| Dupliquer la sélection | ⌘ + D |
| Déplacer | Faites glisser la carte (un plan peut changer de scène) |

**Sélectionner** : un clic choisit une carte ; ⌘ + clic en ajoute une ; Maj + clic prend toutes les cartes entre deux. Au clavier : les **flèches** passent d'une carte à l'autre, **Entrée** va au nom, **Suppr** (⌫) supprime, **Échap** désélectionne.

Avec plusieurs cartes choisies, la fiche à droite donne leur nombre et change leur couleur d'un coup.

## 3. La fiche d'un plan

Cliquez sur un plan : sa fiche s'ouvre à droite.

| Champ | À quoi il sert |
|---|---|
| Nom | Un titre court pour reconnaître le plan. |
| Durée | En secondes (3 ou 3,5). Elle sert à la durée du film et au montage dans Blender. |
| Échelle de plan | Plan large, plan moyen, gros plan… |
| Mouvement de caméra | Fixe, panoramique, travelling… |
| Angle de prise de vue | Plongée, contre-plongée… |
| Sons, bruitages, dialogues | Ce que l'on entend. |
| Musique | La musique du plan, s'il y en a une. |
| Description du plan | Le sujet (qui, quoi, où il est, comment il bouge), l'arrière-plan et l'éventuel premier plan. |

Les trois menus reprennent le vocabulaire du cours ; une définition s'affiche dans la liste. On peut aussi écrire un autre mot. Pour ajouter vos propres termes à tous vos projets : **Réglages > Vocabulaire des plans**.

La fiche d'une **scène** contient son en-tête (`INT. CUISINE - JOUR`) : le modifier ici le modifie dans le scénario. Sa description est le **synopsis** de la scène (la ligne `=` du scénario).

## 4. Vignettes et dessin

Chaque plan peut avoir une image : sa **vignette**.

- **Importer une image…** ou glissez une image sur la fiche. Avec plusieurs plans choisis, **Importer des images…** (clic droit) en place une par plan, dans l'ordre.
- **Recadrer…** : déplacez le cadre ou tirez sur ses coins ; **Ajuster sans recadrer** garde toute l'image avec des bandes.
- **Dessiner** ouvre la toile : pinceau, gomme, pot de peinture, nuancier, grille des tiers.

| Dans la toile | Raccourci |
|---|---|
| Pinceau / gomme / pot de peinture | B / E / G |
| Taille de l'outil | [ et ] |
| Plan précédent / suivant | Option + ← / Option + → |
| Zoomer / ajuster | ⌘ + + / ⌘ + - / ⌘ + 0 |
| Déplacer la vue | Barre d'espace + glisser |
| Annuler / rétablir | ⌘ + Z / ⌘ + Maj + Z |
| Terminer / abandonner | ⌘ + Entrée / Échap |

**Partir de l'image du plan précédent** est pratique pour un plan qui ressemble au précédent. **Terminer** enregistre le dessin.

Une étiquette sur la carte demande d'ouvrir **Recadrer…** : **À recadrer** si le format du projet a changé, **À vérifier** si l'image a été recadrée au centre pendant un import de plusieurs images.

## 5. Les numéros

Les numéros vont de 10 en 10 (10, 20, 30…) pour laisser de la place : un plan inséré entre `P_0010` et `P_0020` reçoit `P_0015`. S'il n'y a plus de place, NeoScenar propose de renuméroter ; si les numéros sont verrouillés, il ajoute une lettre (`P_0010A`).

- **Renuméroter…** remet 10, 20, 30… dans l'ordre, pour une scène ou tout le projet.
- **Verrouiller les numéros** (le cadenas) quand le découpage est prêt, surtout avant l'export vers Blender : les numéros ne changent plus. On peut encore ajouter, insérer et supprimer, mais plus glisser ni renuméroter.
- Une carte **Absente du scénario** (orpheline) : sa scène a été effacée du texte. Elle n'est pas perdue : dans sa fiche, **Recréer l'en-tête** la remet dans le scénario, **Supprimer la carte** l'efface.
- Une carte en **pointillés** avec l'étiquette **Brouillon** : la scène est mise de côté (case **Brouillon** de sa fiche). Elle n'est pas imprimée et ne compte ni dans la durée totale du film ni dans les statistiques.

## 6. Exporter

| Bouton | Ce qu'il fait |
|---|---|
| **Storyboard en PDF…** | Des **planches à dessiner** (cases vides, à imprimer puis scanner) ou le **storyboard avec vignettes**. Tout le film ou des scènes choisies. |
| **Blender** | Ouvre Blender, qui crée un fichier `.blend` (proposé dans `06_Blender/Storyboard`) : une scène par plan, caméra, calque de dessin, montage. Il faut **Blender 4.5** et l'extension « Storyboard – Gestion des plans ». |

Conseil : verrouillez les numéros avant l'export vers Blender. NeoScenar n'écrase jamais un fichier `.blend` déjà travaillé : il propose un autre nom.

---

# Partie B — Données du projet

## 1. Vue d'ensemble

Ici se trouve tout ce qui accompagne le scénario. La liste de gauche donne accès à :

| Rubrique | À quoi elle sert |
|---|---|
| Page de titre | Titre, auteurs, contact : imprimés sur la première page du PDF. |
| Log line | Le film en une ou deux phrases. |
| Synopsis | Le résumé de l'histoire. |
| Personnages, Lieux | Une fiche par personnage, par lieu. |
| Documents | Vos notes, dossiers et images de recherche. |
| Générique | Les noms du générique de fin. |
| Pitch | La présentation du projet pour convaincre. |
| Tag line | La phrase d'accroche, comme sur une affiche. |
| Note d'intention | Pourquoi ce film, et comment vous voulez le faire. |

Tout s'enregistre tout seul, dans des fichiers texte du projet, lisibles aussi dans Obsidian. Seule la **page de titre** demande de cliquer sur **Enregistrer**.

## 2. Log line et tag line

- On écrit **plusieurs versions** (bouton **+**) pour comparer, puis on coche **Retenue pour la page de titre** sur la meilleure. Une seule est retenue à la fois.
- La version retenue est imprimée sur la page de titre du PDF, jamais dans le scénario.

**La log line** résume toute l'histoire en une ou deux phrases. Elle dit qui est le héros, ce qu'il veut, et ce qui l'en empêche. Elle sert à présenter le film en quelques secondes, et à vérifier que l'histoire tient debout. Exemple : « Une lycéenne timide doit chanter au concert de l'école pour sauver le club de musique. »

**La tag line** est une phrase d'accroche, comme sur une affiche de film. Elle ne raconte pas l'histoire : elle donne envie de voir le film, en jouant sur son ton, son mystère ou sa promesse. Courte et facile à retenir. Exemple : « Certaines voix méritent d'être entendues. »

Ne les confondez pas : la log line **explique** l'histoire, la tag line **intrigue** le spectateur.

## 3. Synopsis, pitch, note d'intention

| Document | Définition |
|---|---|
| Synopsis | Le résumé de toute l'histoire, du début à la fin, **fin comprise**. Au présent, à la troisième personne, sans dialogues. Il présente le héros, son but, les obstacles, les moments clés et la résolution. Quelques lignes pour un court métrage, une page au plus. |
| Pitch | La présentation orale ou écrite du projet, pour convaincre (un jury, un producteur, l'équipe). Il donne envie : l'idée de départ, le héros, l'enjeu, le genre et le ton. Contrairement au synopsis, il peut **garder la fin secrète**. Il doit se dire en une ou deux minutes. |
| Note d'intention | Le texte personnel de l'auteur ou du réalisateur : **pourquoi** ce film (ce qui vous touche dans ce sujet, ce que vous voulez faire ressentir) et **comment** vous voulez le faire (ambiance, images, sons, rythme, références). Écrite à la première personne (« je », « nous »). |

En résumé : le synopsis dit **ce qui se passe**, le pitch **donne envie**, la note d'intention dit **pourquoi et comment**.

Trois textes libres, avec une petite barre de mise en forme : titres, **gras**, italique, ligne horizontale (⌘ + B, ⌘ + I).

- Inutile d'écrire le titre du document : il est ajouté tout seul dans le PDF.
- On les imprime avec le scénario : dans le module Scénario, **Exporter en PDF…** puis cochez les documents voulus.

## 4. Personnages et lieux

- **Nouveau** crée une fiche. Écrivez le nom **comme dans le scénario** : `MARIE`, ou `MAISON - CUISINE` pour un lieu. C'est ce nom qui relie la fiche au texte.
- Quand un nouveau personnage ou un nouveau lieu apparaît dans le scénario, NeoScenar crée sa fiche et le signale.
- Fiche personnage : interprète, âge, rôle (principal, secondaire, figurant), genre, résumé, couleur, description, objectifs, relations, images.
- Fiche lieu : résumé, description, repérage, images.
- **Renommer** (clic sur le nom) propose de remplacer l'ancien nom dans le scénario. Une copie de sécurité est faite avant.
- L'**interprète** sert au générique et au plan de tournage : pensez à le remplir.

## 5. Documents

Un classeur libre : **Nouveau dossier**, **Nouvelle note**, puis **Renommer** et **Supprimer** dans la barre du haut. Une note est un texte simple. Dans un dossier, on peut glisser des images (PNG ou JPEG). Idéal pour les recherches, les références, les repérages.

## 6. Générique

- Remplissez les rubriques, **un nom par ligne**. Une rubrique vide n'apparaît pas.
- La distribution vient des fiches Personnages (interprète) : par importance ou par ordre d'apparition.
- On peut ajouter des rubriques, des musiques, des mentions (lieu de tournage, copyright…) et des logos.
- **Tout réduire / Tout déployer** pour s'y retrouver. **Exporter…** crée les images PNG à poser sur le film, ou un texte brut.

---

# Partie C — Planification

## 1. Phases et tâches

Le planning organise le travail de l'équipe en **phases** (Écriture, Préproduction, Tournage, Postproduction, Diffusion) et en **tâches**.

- **Nouvelle tâche** : titre, phase, début (facultatif), échéance, personnes, note.
- **Nouvelle phase** (en bas de la liste) en ajoute une ; double-cliquez sur son nom pour la renommer.
- Les **personnes** sont celles du générique : ajoutez d'abord l'équipe au générique.
- Cochez une tâche quand elle est **faite**. L'enseignant peut cocher **Validée**.
- Une tâche passée son échéance et non faite est marquée **En retard**.
- **⌘ + Z** annule.

## 2. Liste et ligne du temps

| Affichage | Pour quoi faire |
|---|---|
| **Liste** | Voir les tâches par phase. Glissez une tâche pour la changer de phase. Filtres : « Tâches de : », masquer les faites ou les validées. |
| **Ligne du temps** | Voir les tâches dans le temps. Glissez une barre pour la déplacer, ses bords pour changer les dates, une rangée vide pour créer une tâche. Les jours de tournage y ont leur rangée. |

Dans la ligne du temps : la molette zoome, **Maj + molette** déplace. Zoom : semaine, mois, année scolaire, année civile. Une tâche sans date n'y apparaît pas.

## 3. Plan de tournage

On répartit les scènes du scénario en **jours de tournage**.

1. **Nouveau jour** : choisissez sa date et un intitulé si besoin.
2. Glissez des scènes de la colonne **Scènes à planifier** vers le jour. Pour retirer une scène, glissez-la de nouveau dans cette colonne.
3. Filtrez les scènes par lieu, intérieur / extérieur, jour / nuit ou personnage. **Regrouper par lieu** aide à tourner au même endroit le même jour.

Chaque jour indique sa durée en pages, ses lieux et les **interprètes convoqués**. Ajoutez dans **Présents en plus** les figurants ou doublures sans fiche.

Cliquez sur une scène pour voir ses personnages. Un personnage présent **sans parler** s'ajoute comme **muet** ; les **Suggestions** proposent ceux qui sont cités dans l'action.

Les **avertissements** signalent une scène planifiée deux fois, disparue du scénario, ou un personnage sans interprète. Une scène **brouillon** ne peut pas être planifiée.

## 4. Exporter

**Exporter…** propose trois fichiers :

| Type | Contenu |
|---|---|
| Planning (PDF) | La ligne du temps, puis les tâches par phase. On peut ne garder que les tâches d'une personne. |
| Plan de tournage (PDF) | Un tableau par jour : scènes, lieu, INT/EXT, jour/nuit, pages, interprètes. |
| Calendrier (.ics) | Les échéances et les jours de tournage, à importer dans Calendrier ou Google Agenda. |

---

# Partie D — Statistiques

## 1. Lire les statistiques

Les statistiques sont calculées à partir du scénario, sans les scènes brouillon. Elles se mettent à jour à chaque visite.

| Bloc | Ce qu'il montre |
|---|---|
| Résumé | Pages, durée estimée (environ une minute par page), durée du découpage (somme des plans), scènes, personnages qui parlent, lieux. |
| Temps de parole | La part de dialogue de chaque personnage, avec son nombre de répliques et de mots. |
| Activité des personnages | Une colonne par scène : le personnage parle, est seulement nommé dans une action, ou est absent. |
| Dynamique des scènes | Une barre par scène : sa hauteur = sa durée, sa couleur = l'acte. Dessous : intérieur / extérieur et jour / nuit. |
| Scènes par lieu | Le nombre de scènes qui se passent dans chaque lieu. |

Un clic sur une scène l'ouvre dans le Scénario ; un clic sur un nom ouvre sa fiche.

## 2. À quoi ça sert

Quelques questions à se poser :

- **La durée estimée** est-elle proche de la durée voulue ? Si le découpage est fait, les deux durées se ressemblent-elles ?
- **Le temps de parole** : le héros parle-t-il le plus ? Un personnage secondaire prend-il trop de place ?
- **L'activité** : un personnage disparaît-il trop longtemps ? Apparaît-il assez tôt ?
- **La dynamique** : le rythme varie-t-il ? Une suite de longues scènes peut ralentir le film.
- **Les lieux** : beaucoup de lieux différents = un tournage plus compliqué. Peut-on en regrouper ?
