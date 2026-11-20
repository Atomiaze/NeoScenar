# Étape 15 — Module Planification

Rédigée le 19 novembre 2026. Cinq sous-étapes, dans cet ordre. Pour chacune : plan court, réalisation, essais (outil de pilotage), accord de David, commit, mise à jour de `etat-du-projet.md`, `/clear`.

Règles communes (décidées le 19 nov.) :

- Le planning appartient **au projet** : `neoscenar/planning.json` (enregistrement sûr, automatique, version du format). Lisible à la main.
- **Échéances en dates fixes** (`AAAA-MM-JJ`), modifiables par l'élève. Pas de dates relatives.
- **Pas de planning type imposé** (abandonné le 19 nov.) : chaque projet part des cinq phases par défaut, vides ; l'élève crée ses tâches.
- **Dates modifiables partout** : dans la liste et directement dans la ligne du temps (Gantt).
- **Personnes = noms du générique** (`generique.json`, rubriques de l'équipe technique, distribution exclue). Aucune liste de personnes propre au planning.
- **Plan de tournage** : scènes lues dans le Fountain (source de vérité), repérées par **identifiant de carte** (comme « Comparer » en 13C), pour survivre aux renumérotations.
- Exports : **PDF** (pdf-lib, Inter, comme l'étape 11) et **calendrier `.ics`** (fichier, aucun serveur). Le thème n'y touche jamais.
- Hors périmètre : planning type de l'enseignant, feuilles de service, vue d'ensemble de la classe pour l'enseignant, rappels/notifications.

---

## 15A — Moteur du planning, sans interface (Sonnet)

1. **Format `planning.json`** :
   - `phases` : identifiant, nom, couleur (palette des cartes), ordre. Par défaut : Écriture, Préproduction, Tournage, Postproduction, Diffusion.
   - `taches` : identifiant, phase, titre, `debut` (facultatif), `echeance`, `faite`, `personnes` (noms), `validee` (vrai = validée par l'enseignant ; valider coche aussi `faite`, décocher `faite` retire la validation ; une tâche validée n'est jamais en retard), `note`.
   - `tournage` : voir 15D (vide ici).
2. **Nouveau planning** : créé à la première ouverture du module avec les cinq phases par défaut, sans tâche. Phases renommables, ajoutables, supprimables (confirmation si elles contiennent des tâches).
3. **Équipe** : fonction pure `crewMembers(generique)` → noms uniques + leurs rubriques. Un nom retiré du générique reste sur la tâche, signalé « plus au générique ».
4. **États calculés** (purs, date du jour passée en paramètre) : à faire, en retard (échéance passée, non faite), faite ; avancement par phase.

*Validé quand* : tests unitaires (lecture/écriture sans perte, planning par défaut, retard, nom disparu). *L'essai `planning-moteur.mjs` est déplacé en 15B (décidé le 19 nov.) : sans interface, il n'y a encore rien à piloter dans l'application réelle.*

---

## 15B — Module Planification : phases et tâches (Sonnet)

1. Icône **Planification** dans la barre des modules (activée).
2. Vue **Liste** : phases repliables avec barre d'avancement ; tâches avec case « faite », titre, échéance, personnes (pastilles), coche discrète si validée. En retard = rouge (variable de thème). Tri par échéance dans chaque phase.
3. Création/modification dans un panneau latéral (comme les fiches) ; personnes choisies dans la liste du générique ; lien « Ajouter quelqu'un au générique… » qui ouvre le formulaire du générique.
4. Filtres : « Tâches de : » (une personne ou tout le monde), « Masquer les tâches faites » et « Validées : Toutes / Masquer les validées / Seulement les validées ». Case « Tâche validée » dans le panneau.
5. Planning vide : message court qui invite à créer une première tâche (bouton « Nouvelle tâche »).
6. Glisser-déposer des tâches entre phases ; suppression confirmée ; annulation `Cmd/Ctrl + Z` (historique propre au module).

*Validé quand* : un élève crée des tâches, coche des tâches, s'en attribue, ferme et rouvre le projet sans rien perdre ; une tâche en retard apparaît en rouge. Essai `planning-moteur.mjs` (reporté de 15A) : planning créé à la première ouverture, tâches, retard, réouverture du projet.

---

## 15C — Ligne du temps (Sonnet)

1. Vue **Ligne du temps** (bascule Liste / Ligne du temps), une rangée par phase.
2. Tâche avec `debut` = barre ; sans `debut` = losange à l'échéance. Une tâche validée porte un liseret et une coche de la couleur de thème `--validee` (cyan vif en sombre, turquoise foncé en clair). En-tête à trois lignes : année, mois, jour. Jours de tournage (15D) affichés dans la rangée Tournage.
3. Trait « Aujourd'hui », graduation semaines/mois, défilement horizontal. **Zoom** : préréglages Semaine, Mois (par défaut, « Aujourd'hui » au quart de la largeur), Année scolaire (1er septembre → 30 juin), Année civile (1er janvier → 31 décembre) ; **molette** = zoom continu centré sur le pointeur, **pincement du trackpad** (Ctrl + molette) idem ; après un zoom libre, le menu affiche « Personnalisé ». Limites : de quelques jours à environ deux ans par écran (1,5 à 200 px par jour). Un glissé vertical à deux doigts arrive aussi comme une molette et zoome (accepté) ; le défilement vertical passe par la barre de défilement et le clic molette.
   - **Déplacement sans toucher aux tâches** : clic molette glissé (comme Blender, dans les deux sens) ; Maj + molette et glissé horizontal à deux doigts = défilement horizontal.
4. **Dates modifiables directement dans le Gantt** (décidé le 19 nov.), toutes annulables (`Cmd/Ctrl + Z`, même historique que la liste) :
   - glisser une barre la déplace (début et échéance ensemble) ; glisser son bord gauche ou droit change le début ou l'échéance ;
   - glisser un losange change l'échéance ; tirer sa poignée gauche le transforme en barre (ajoute un début) ;
   - glisser un jour de tournage change sa date ;
   - aimantation au jour ; info-bulle avec la date pendant le glissement ; un début ne peut pas dépasser l'échéance ;
   - double-clic = dates modifiables au clavier dans le panneau de la tâche ; clic = panneau de la tâche ;
   - glisser dans une rangée vide crée une tâche dans cette phase, avec ces dates.
5. Dessin en SVG avec les variables du thème.

*Validé quand* : un planning d'une année scolaire reste lisible ; déplacer, étirer ou créer une tâche dans le Gantt met aussitôt à jour la liste et `planning.json`, et `Cmd + Z` défait chaque geste.

---

## 15D — Plan de tournage (Opus)

1. **Dépouillement automatique** (calcul pur, `packages/fountain` + fiches) : pour chaque scène non orpheline : numéro affiché (S_0030), INT/EXT, lieu, JOUR/NUIT, longueur en **huitièmes de page** (même pagination que l'éditeur), personnages qui parlent + leurs interprètes (champ « Interprète » des fiches). Personnages muets ajoutables à la main dans le plan de tournage seulement (le Fountain n'est jamais modifié).
2. **Jours de tournage** : date, intitulé facultatif, liste ordonnée de scènes (par identifiant de carte), note. Stockés dans `planning.json` → `tournage`.
3. **Interface** (troisième vue « Tournage ») : colonne « Scènes à planifier » (filtrable par lieu, INT/EXT, JOUR/NUIT, personnage) ; colonnes des jours ; glisser-déposer. Par jour : total en pages, lieux, interprètes convoqués. Tri rapide « regrouper par lieu ».
4. **Avertissements, sans blocage** : scène planifiée deux fois ; scène disparue du scénario (retirée du jour au retour dans l'appli, bandeau « Annuler ») ; personnage sans interprète ; scène encore non planifiée (compteur).
5. Relecture au retour dans NeoScenar et après chaque enregistrement du scénario, comme les fiches (10C).

*Validé quand* : sur « Le Dernier Bus », toutes les scènes apparaissent avec la bonne longueur ; une renumérotation ne change pas les jours ; une scène supprimée est signalée.

---

## 15E — Exports PDF et calendrier (Sonnet)

1. **PDF** (fenêtre d'export avec aperçu, comme 9B/11B) : « Planning » (ligne du temps sur l'année + liste par phase, A4 paysage) et « Plan de tournage » (un tableau par jour : scènes, lieu, INT/EXT, J/N, pages, interprètes). Noms : `<Titre>_planning_AAAA-MM-JJ.pdf`, `<Titre>_plan_de_tournage_AAAA-MM-JJ.pdf`.
2. **Calendrier `.ics`** : échéances (événements « journée entière », mention « Validée » ajoutée à la description si `validee`) et jours de tournage (scènes et lieux en description). Option « Seulement les tâches de : <personne> ». UID stable (`<id>@neoscenar`) : réimporter met à jour au lieu de dupliquer. Nom : `<Titre>_planning.ics`.
3. Emplacement : `01_Production/Planning/` si `01_Production` existe, sinon `neoscenar/exports/`.

*Validé quand* : le `.ics` s'importe dans Calendrier (Mac) et Google Agenda sans erreur ; le PDF est identique quel que soit le thème.
