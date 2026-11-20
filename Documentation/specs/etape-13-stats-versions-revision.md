# Étape 13 — Statistiques, versions, automatismes, mode révision, finitions

Rédigée le 19 novembre 2026. Cinq sous-étapes, dans cet ordre. Pour chacune : plan court, réalisation, essais (outil de pilotage), accord de David, commit, mise à jour de `etat-du-projet.md`, `/clear`.

Règles communes : calculs purs dans `src/shared/…` avec tests ; rien n'est écrit dans le Fountain sauf mention contraire ; toute modification qui fait perdre des données est confirmée et annulable ; essais sur le scénario d'exemple « Le Dernier Bus ».

---

## 13A — Finitions de l'éditeur (Sonnet)

1. **Ligne en cours** : surbrillance discrète de la ligne du curseur, activée par défaut, réglable dans les préférences.
2. **Trait de page** : il passe trop haut sur les majuscules accentuées (É, À…) ; le placer entre les lignes, sans toucher au texte.
3. **Note retirée** : supprimer une note `[[ ]]` au milieu d'une ligne ne doit pas laisser deux espaces (un seul espace gardé ; aucun espace en début ou fin de ligne). Cette fonction servira aussi en 13E.

*Validé quand* : les trois points se vérifient à l'écran ; la pagination du scénario de référence de KIT est inchangée (218/219).

---

## 13B — Module Statistiques (Sonnet)

Nouvelle icône « Statistiques » dans la barre de gauche. Tout est dérivé du Fountain (et des durées des plans quand elles existent), recalculé à l'ouverture du module. Calcul pur dans `src/shared/stats/`, graphiques en SVG maison (pas de grosse bibliothèque).

- **Résumé** : pages, durée estimée (même pagination que l'éditeur), durée du découpage si des plans ont une durée, nombre de scènes, de personnages qui parlent, de lieux.
- **Temps de parole** : par personnage, nombre de répliques, de mots et durée estimée (part des lignes de dialogue dans la pagination). Barres horizontales triées.
- **Activité des personnages** : grille scènes (en colonnes, dans l'ordre) × personnages (en lignes) ; case pleine = parle dans la scène, case claire = seulement nommé dans une action.
- **Dynamique des scènes** : une barre par scène, hauteur = durée, couleur = acte ; repères INT/EXT et JOUR/NUIT.
- **Scènes par lieu** : nombre de scènes et durée totale par lieu.
- Clic sur une scène ou un personnage : ouvre la scène dans le Scénario ou la fiche dans Recherches.
- Personnages : nom sans extension (V.O.), (SUITE)… comme en 10C. Scènes orphelines ignorées.

*Validé quand* : sur « Le Dernier Bus », les totaux concordent avec le navigateur (pages, durée, nombre de scènes) ; un test vérifie le temps de parole sur un petit Fountain écrit à la main.

---

## 13C — Versions (Opus)

**Contenu d'une version** (décidé le 19 nov.) : `scenario.fountain`, `decoupage.json`, `projet.json`, plus `version.json` (nom, note, date, pages, durée). Fiches, documents et images ne sont pas copiés.

Rangement : `neoscenar/versions/<AAAAMMJJ-HHMMSS>_<nom sans accent>/`. Jamais supprimées automatiquement.

Accès : menu Fichier > Versions… et bouton dans Recherches > Projet. La fenêtre liste les versions (nom, date, pages, durée, note) avec :

- **Enregistrer une version** : nom obligatoire (proposé : « Version N »), note facultative.
- **Consulter** : lecture seule, dans la mise en page du scénario.
- **Comparer** : une version avec le scénario actuel, ou deux versions entre elles. Liste des scènes ajoutées, supprimées, déplacées, modifiées ; pour une scène modifiée, mots ajoutés en vert et retirés en rouge barré. Petite bibliothèque de diff permise (jsdiff). *Précisé le 19 nov.* : les scènes sont associées par l'**identifiant permanent de leur carte** (`decoupage.json` de chaque côté ; pour « Scénario actuel », le découpage lu après l'enregistrement des cartes en attente), car le rapprochement de l'étape 8 renumérote une scène remontée. Secours, pour une scène sans carte d'un côté : le numéro (`S_0030`), puis un en-tête identique ; deux cartes d'identifiants différents ne sont jamais associées. Le numéro de l'en-tête n'est pas comparé : une scène seulement renumérotée n'est ni déplacée ni modifiée. Étiquette « S_0004 → S_0002 » dès que le numéro d'une scène listée change. Page de titre modifiée : ligne à part ; notes `[[ ]]` comparées comme du texte ; marques de révision de la 13E ignorées (filtre `comparisonText`).
- **Restaurer** : confirmation ; l'état actuel est d'abord enregistré comme version « Avant restauration – <date> », puis les trois fichiers sont remplacés et le rapprochement de l'étape 8 tourne (copie de sécurité habituelle). Le titre suit le Fountain.
- **Dupliquer en nouveau projet** : copie complète du projet actuel dans un dossier voisin `<Dossier>_<nom de version>` (choix de l'emplacement proposé), où les trois fichiers sont remplacés par ceux de la version ; nouvel identifiant (logique de `projectCopy.ts`). Ouvert ensuite.
- **Supprimer** : confirmée, la version est déplacée dans `sauvegardes/versions_supprimees/`.

Écriture sûre (temporaire puis remplacement). Une version abîmée est signalée, jamais bloquante pour les autres.

*Validé quand* : enregistrer → modifier → comparer montre les bons changements ; restaurer puis annuler par la version « Avant restauration » retrouve exactement le texte et les cartes ; le duplicata s'ouvre comme projet distinct, l'original intact.

---

## 13D — Automatismes (Opus)

1. **(SUITE)** (décidé le 19 nov.) : jamais écrite dans le fichier. Affichée à l'écran et dans le PDF quand le même personnage reparle dans la même scène avec seulement de l'action entre les deux répliques. Ajoutée après une extension existante (`MARIE (V.O.) (SUITE)`). Pas d'ajout si (SUITE) ou (CONT'D) est déjà écrit. Préférence, activée par défaut. Pagination, écran et PDF utilisent la même règle.
2. **Coupures de page** : vérifier qu'un nom de personnage ne reste jamais seul en bas de page et ce qui se passe pour un dialogue coupé entre deux pages ; signaler à David ce qui existe avant d'ajouter quoi que ce soit.
3. **Dialogues simultanés** (`^`) : côte à côte dans la pagination et le PDF (deux colonnes, la plus longue compte). À l'écran : l'un sous l'autre, avec une barre verticale et la mention « simultané » dans la marge ; les traits de page suivent la pagination côte à côte. Corrige le défaut noté (impression l'un sous l'autre).
4. **Nouvelle page à chaque acte** : option du projet (`projet.json`), désactivée par défaut, appliquée dans la pagination et le PDF, rien dans le fichier. Les sauts `===` du Fountain sont respectés s'ils ne le sont pas déjà.
5. **Mode plan** : vérifier s'il existe déjà. S'il manque, faire un rapport et attendre l'accord de David avant de le réaliser (il pourrait devenir une sous-étape à part).

*Validé quand* : le scénario de référence de KIT garde 218/219 lignes identiques sans dialogue simultané ni option d'acte ; un petit Fountain d'essai couvre (SUITE), `^` et les sauts d'acte, à l'écran et dans le PDF.

---

## 13E — Mode révision (Opus)

**Usage** (décidé le 19 nov.) : l'élève qui se relit marque ce qu'il doit reprendre, puis efface tout avant de rendre.

**Stockage** (décidé le 19 nov.) : dans le Fountain, sous forme de notes, donc jamais imprimées et résistantes aux modifications faites ailleurs.

- Surlignage : `[[R:jaune]]texte[[/R]]` ; avec commentaire : `[[R:jaune|Revoir ce dialogue]]texte[[/R]]`.
- Couleurs : jaune, vert, rose, bleu. À l'intérieur d'un seul paragraphe (élément).
- Marques mal formées (fermeture manquante…) : traitées comme des notes ordinaires, jamais d'erreur.

Interface :

- Bouton « Révision » dans la barre d'outils du Scénario : affiche la palette. Sélection + couleur = surligne ; commentaire ajouté ou modifié dans une petite bulle (survol pour le lire).
- À l'écran : marqueurs masqués (comme `**`), texte surligné ; ces notes ne s'affichent pas en vert et ne rendent pas l'icône du navigateur rouge (petite icône à part, avec le nombre de marques).
- **Effacer cette marque** (clic droit) et **Effacer toutes les marques** (confirmation, annulable) : retirent seulement les notes `R`, le texte reste identique au caractère près (règle des espaces de 13A).
- Pagination, statistiques, PDF, fiches (10C) et rapprochement ignorent ces notes.

*Validé quand* : surligner, commenter, puis tout effacer redonne un fichier identique à l'original (test octet par octet) ; le PDF est identique avec ou sans marques.
