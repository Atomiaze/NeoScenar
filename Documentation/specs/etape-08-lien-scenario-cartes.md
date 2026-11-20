# Étape 8 — Lien scénario ↔ cartes

## Objectif

Relier le module Scénario et le module Cartes **dans les deux sens**. Une scène du scénario et sa carte scène sont une seule et même scène, avec **le même numéro partout** : S_0030 dans les cartes, dans la marge du scénario, dans le navigateur et dans Blender.

Les élèves doivent pouvoir travailler dans les deux ordres : découper d'abord puis écrire, ou écrire d'abord puis découper.

Références : `CLAUDE.md`, section 5 du cahier des charges (règles du module Cartes), section 6 (module Scénario), `etape-02-module-cartes.md`, `etape-02b-dupliquer.md`, `etape-07-editeur-de-scenario.md` et ses sous-étapes.

C'est une étape délicate, presque autant que la 7. **Présente ton plan à David**, en particulier la structure de la fonction de rapprochement (§ 3) et la gestion de l'annulation (§ 6). Découpe-la impérativement en sous-étapes validées une à une (§ 9).

## 1. Décisions de David (18 novembre 2026)

- **Le lien est le numéro de scène écrit dans le Fountain**, avec la syntaxe standard : la carte S_0030 correspond à l'en-tête `INT. CUISINE - JOUR #30#`. Le numéro voyage avec le texte : couper et recoller une scène, la déplacer dans Obsidian ou annuler ne casse pas le lien.
- **Le scénario est numéroté comme le découpage** : 10, 20, 25, 30, 30A… Il n'y a plus de numérotation continue 1, 2, 3.
- **Affichage `S_0030` partout** : dans la marge de l'éditeur (à la place de « 30. »), dans le navigateur, sur les cartes. L'export PDF (étape 9) l'affichera aussi dans la marge.

## 2. Règles de base

### Correspondance des numéros

- `#30#` ↔ S_0030 ; `#30A#` ↔ S_0030A ; `#5#` ↔ S_0005.
- Un numéro est **valide** s'il est formé de 1 à 4 chiffres (sans zéro inutile en tête) et d'au plus une lettre majuscule. Tout autre numéro (`#3.1#`, `#A2#`, `#12-B#`, `#0030#`) compte comme absent : il est remplacé par un numéro attribué, et le résumé le signale.
- Le marqueur `#…#` reste masqué hors de la ligne du curseur, comme aujourd'hui.

### Le texte fait foi

Le scénario décide de l'existence des scènes, de leur ordre, de leur en-tête et de leur numéro. Le découpage garde tout le reste : le nom de la carte, sa couleur, ses plans et leurs fiches, et l'identifiant interne.

Après **toute** modification d'un côté ou de l'autre, la même fonction de rapprochement (§ 3) remet les deux en accord.

### Bloc d'une scène

Le bloc d'une scène va de son en-tête jusqu'à l'élément qui précède l'en-tête suivant **ou la section suivante** (`#`, `##`…), la plus proche des deux. Les lignes de section n'appartiennent à aucun bloc. Le texte placé avant le premier en-tête n'appartient à aucun bloc non plus.

### Une carte ne disparaît jamais en silence

Quand une scène disparaît du scénario (en-tête effacé, couper sans recoller, modification extérieure) :

- si sa carte est **vide**, elle est supprimée. Une carte est vide si elle a un seul plan sans aucun contenu, et si son nom et sa couleur sont ceux par défaut ;
- sinon, la carte devient **orpheline**. Elle est conservée, grisée et marquée « Absente du scénario » (voir § 7). Si l'en-tête revient avec le même numéro (annulation, recoller), elle se reconnecte d'elle-même.

## 3. Fonction de rapprochement (logique pure, testée)

Il y a une seule fonction, utilisée partout : à l'ouverture, après une frappe, après une action dans les cartes, après un rechargement du fichier. Par exemple :

```
reconcile(scènesDuScénario, découpage, contexte) → { découpage, modificationsDuTexte, résumé }
```

- **Entrées** : les scènes du Fountain (en-tête, numéro éventuel, position) et le découpage. Le contexte précise quelles scènes viennent d'être insérées (collées) dans l'éditeur, si c'est la première liaison du projet, et si les numéros sont verrouillés.
- **Rapprochement par numéro** : une scène du Fountain et une carte qui ont le même numéro sont liées.
- **Scène sans numéro valide** : elle reçoit un **numéro intermédiaire** entre ses voisines, avec les règles existantes (25 entre 20 et 30). S'il n'y a plus de numéro libre, elle reçoit une **lettre** (S_0020A), que les numéros soient verrouillés ou non : on ne propose pas de renuméroter en pleine écriture. Une nouvelle carte est créée, avec son premier plan P_0010.
- **Numéro en double** (une scène copiée au lieu d'être coupée) : la scène qui vient d'être collée reçoit un nouveau numéro et une nouvelle carte. À l'ouverture d'un fichier, c'est la première dans l'ordre du texte qui garde le numéro.
- **Ordre** : les cartes prennent l'ordre du scénario. Si une scène se retrouve entre deux numéros qui ne l'encadrent plus (scène déplacée) :
  - numéros **non verrouillés** : elle reçoit un numéro intermédiaire à sa nouvelle place, et le `#…#` du texte est mis à jour ;
  - numéros **verrouillés** : elle garde son numéro, même hors de l'ordre, comme sur un tournage.
- **En-tête** : le champ « en-tête » de la carte prend le texte de l'en-tête du scénario, sans le `#…#` ni les marqueurs de forçage.
- **Carte sans scène** : supprimée si elle est vide, orpheline sinon (§ 2). Exception : la première liaison (§ 8).
- **Sorties** :
  - le nouveau découpage ;
  - les modifications à appliquer au texte (numéros ajoutés ou changés), toujours limitées au marqueur `#…#` de la ligne d'en-tête ;
  - un résumé en français (« 2 scènes numérotées, 1 carte orpheline : S_0040 »).
- **Garanties, testées sur des milliers de suites d'opérations aléatoires** (taper, couper, coller, copier, supprimer, déplacer, annuler) :
  - chaque scène du Fountain a un numéro valide et unique ;
  - chaque carte non orpheline correspond à exactement une scène ;
  - l'ordre des cartes non orphelines est celui du scénario ;
  - aucun plan n'est jamais perdu : chaque plan est soit dans une carte liée, soit dans une carte orpheline ;
  - appliquer la fonction deux fois de suite ne change plus rien.

## 4. Du scénario vers les cartes

- **Attribution du numéro** : quand l'élève **quitte la ligne** d'un nouvel en-tête, comme pour la mise en majuscules des extensions. On n'écrit pas `#25#` pendant qu'il tape. Tant que la scène n'a pas de numéro, la marge et le navigateur n'affichent rien pour elle.
- **Modifier un en-tête** met à jour l'en-tête de la carte.
- **Couper et coller une scène** : la carte suit avec tous ses plans. Si les numéros ne sont pas verrouillés, la scène prend un numéro intermédiaire à sa nouvelle place.
- **Copier et coller une scène** : la copie reçoit un nouveau numéro et une nouvelle carte avec un seul plan P_0010. Les plans ne sont pas recopiés.
- **Effacer un en-tête** : la carte est supprimée si elle est vide, orpheline sinon. Annuler (`Cmd + Z`) dans l'éditeur la reconnecte.
- **Marge et navigateur** : `S_0030` au lieu de « 30. ». La marge gauche a la place (7 caractères au plus pour `S_0030A`). La fonction de numérotation continue de l'étape 7 n'est plus utilisée pour l'affichage.
- **Navigateur** : la durée du découpage (somme des durées des plans, quand elles sont renseignées) s'affiche à côté de la durée estimée, par exemple « 1:30 · ⏱ 1:12 », comme le prévoit le cahier des charges. Une scène sans aucune durée de plan n'affiche que la durée estimée.

## 5. Des cartes vers le scénario

Une action dans les cartes est traduite en modification du texte, puis le rapprochement s'applique. Les modifications du texte se repèrent par le **numéro de scène**, jamais par une position mémorisée, pour rester justes même si le texte a changé entre-temps.

- **Ajouter ou insérer une scène** : un en-tête est inséré dans le scénario, à la fin du bloc de la scène précédente (ou à la fin du scénario, ou avant la première scène). Son texte est l'en-tête de la carte s'il est rempli, sinon un en-tête à compléter : `.SCÈNE À ÉCRIRE #25#`. Ce texte provisoire ne doit **pas** apparaître dans les propositions de lieux de l'assistant d'en-tête. Le bloc est entouré des lignes vides nécessaires pour que tout le reste soit relu à l'identique.
- **Ajouter N scènes en lot** : N en-têtes, insérés en une seule modification.
- **Dupliquer une scène** : la copie de la carte et de ses plans reste celle de l'étape 2b. Dans le scénario, on insère **seulement l'en-tête** de la copie, juste après le bloc de l'original, sans recopier le texte (décision du cahier des charges, section 5).
- **Déplacer une scène** (glisser-déposer) : tout le bloc de texte est déplacé à la nouvelle place, sans les lignes de section. La scène prend un numéro intermédiaire selon les règles des cartes, et le `#…#` est mis à jour.
- **Supprimer une scène** : la confirmation précise que **le texte de la scène sera aussi supprimé du scénario**, en indiquant sa longueur (« 2 pages environ »). Le bloc est retiré du texte.
- **Modifier l'en-tête sur la carte** : l'en-tête est réécrit dans le texte, avec un forçage `.` seulement si nécessaire (fonction de l'étape 7). Le `#…#` est conservé.
- **Description de la scène** : la fiche de la carte scène gagne un champ **Description** sur plusieurs lignes. C'est le synopsis Fountain, le même que dans le navigateur, écrit avec la fonction `setSynopsis` existante. Le parcours type de l'élève y fait appel : « nom et description de chaque scène » dans le module Cartes.
- **Renuméroter** (une scène ou tout le projet) : tous les `#…#` concernés sont réécrits en une seule modification.
- **Verrouiller les numéros** : rien ne change dans le texte. Les règles d'ordre du § 3 changent seulement.
- **Plans** : ajouter, déplacer ou supprimer des plans ne touche pas au scénario.

Le module Scénario n'est pas forcément ouvert pendant ces actions. Le texte du scénario doit donc être chargé et modifiable même quand l'éditeur n'est pas affiché, avec le même enregistrement automatique.

## 6. Annulation : deux historiques, une règle simple

- **L'historique de l'éditeur** contient les frappes et les modifications de texte faites dans l'éditeur. Les effets sur les cartes en découlent et suivent automatiquement, par le rapprochement.
- **L'historique des cartes** contient les actions faites dans les cartes. Annuler une action des cartes annule aussi son effet sur le texte : remettre le bloc à sa place, recréer le texte supprimé, retirer l'en-tête ajouté.
- Une modification du texte venue des cartes **n'entre pas** dans l'historique de l'éditeur. `Cmd + Z` dans l'éditeur ne défait donc jamais un déplacement de carte.
- Si une annulation des cartes ne peut plus s'appliquer au texte (la scène a été effacée du scénario entre-temps), elle s'applique aux cartes seulement, sans erreur, et le rapprochement remet tout en accord.
- Une suppression de scène faite depuis les cartes garde le texte supprimé dans l'historique des cartes, pour que l'annulation le restitue à l'identique.

## 7. Cartes orphelines

- **Affichage** : la carte est grisée, avec la mention « Absente du scénario ». Elle reste à sa place dans l'ordre des cartes, d'après son numéro.
- **Fiche** : deux boutons.
  - **Recréer l'en-tête** : insère son en-tête dans le scénario, avec son numéro, à la place qui correspond à son numéro.
  - **Supprimer** : avec la confirmation habituelle, et annulable.
- **Export vers Blender** : les cartes orphelines sont exportées comme les autres (rien n'est perdu), mais la fenêtre d'export affiche un avertissement : « 1 scène est absente du scénario : S_0040 ».
- Le navigateur ne les montre pas.

## 8. Ouverture d'un projet, première liaison et modifications extérieures

### Première liaison

C'est le cas des projets existants, et de tout scénario dont aucune scène n'a de numéro : importé de KIT ou d'Obsidian, ou collé.

- Avant toute modification, une copie de `scenario.fountain` et de `decoupage.json` est enregistrée dans `sauvegardes/`.
- Les scènes sont liées aux cartes **dans l'ordre** : la 1re scène avec la 1re carte, et ainsi de suite. Les numéros des cartes sont écrits dans le texte.
- **Plus de scènes que de cartes** : les scènes en trop reçoivent un numéro et une carte.
- **Plus de cartes que de scènes** (l'élève a découpé avant d'écrire) : les en-têtes des cartes en trop sont **ajoutés à la fin du scénario**, avec l'en-tête de la carte ou `.SCÈNE À ÉCRIRE`. Il n'y a pas d'orphelines lors d'une première liaison.
- **Nouveau projet** : il contient toujours la carte S_0010. Son `scenario.fountain` contient donc `.SCÈNE À ÉCRIRE #10#`.
- Une fenêtre résume ce qui a été fait. Elle liste les paires « S_0010 ↔ INT. CUISINE - JOUR » et signale les en-têtes de carte différents de ceux du scénario (dans ce cas, c'est le scénario qui a été gardé). Elle mentionne aussi la sauvegarde.

### Ouvertures suivantes et modifications extérieures

- À l'ouverture, et après « Recharger le fichier » (dialogue existant de l'étape 7), le rapprochement s'applique.
- Si cela change quelque chose (numéros ajoutés ou corrigés, doublons, orphelines), une sauvegarde est faite d'abord, puis un résumé discret s'affiche.
- Si rien ne change, aucun message.

## 9. Sous-étapes

- **8A — Logique pure** :
  - numéros (lecture, validité, conversion `#30#` ↔ S_0030) ;
  - blocs de scène ;
  - fonction de rapprochement et résumé ;
  - opérations des cartes traduites en modifications du texte (insérer, déplacer, supprimer, réécrire un en-tête, renuméroter) ;
  - tests aléatoires avec les garanties du § 3.

  Rien ne change encore dans l'interface.
- **8B — Du scénario vers les cartes** : attribution du numéro en quittant la ligne, `S_0030` dans la marge et dans le navigateur, cartes qui suivent le texte, durée du découpage dans le navigateur, première liaison avec sauvegarde et résumé, nouveau projet.
- **8C — Des cartes vers le scénario** : ajout, insertion, ajout en lot, duplication, déplacement, suppression, en-tête, description, renumérotation ; texte modifiable même sans l'éditeur affiché ; historique des cartes.
- **8D — Orphelines et modifications extérieures** : affichage et fiche des orphelines, avertissement dans l'export Blender, rapprochement après rechargement, résumé.

## Hors périmètre

- Numérotation 1, 2, 3 à l'impression (une option pourra être étudiée à l'étape 9).
- Affichage des actes dans le module Cartes.
- Lien entre les plans et le texte (un plan rattaché à un passage du scénario).
- Fiches personnages et lieux (étape 10).

## Critères de validation (à vérifier par David)

- [ ] Ouvrir un projet existant (cartes et scénario remplis séparément) : une sauvegarde est faite, la fenêtre de première liaison liste les paires, et la marge montre S_0010, S_0020…
- [ ] Projet où seules les cartes sont faites : leurs en-têtes apparaissent dans le scénario, prêts à être écrits.
- [ ] Écrire un nouvel en-tête entre S_0020 et S_0030, puis quitter la ligne : il devient S_0025, et une carte S_0025 apparaît au bon endroit dans les cartes.
- [ ] Couper la scène S_0020 et la recoller après S_0050 : la carte se déplace avec ses plans et ses vignettes, et prend un numéro intermédiaire (S_0055).
- [ ] Même chose avec les numéros verrouillés : la scène garde S_0020.
- [ ] Copier et coller une scène : la copie reçoit un nouveau numéro et une carte neuve.
- [ ] Effacer l'en-tête d'une scène qui a des vignettes : la carte devient orpheline. `Cmd + Z` : elle se reconnecte.
- [ ] Dans les cartes : ajouter une scène, la déplacer, modifier son en-tête, écrire sa description, la dupliquer, la supprimer. Le scénario suit à chaque fois, et `Cmd + Z` dans les cartes défait chaque action, texte compris.
- [ ] Renuméroter le projet : les `#…#` du scénario suivent.
- [ ] Modifier `scenario.fountain` dans Obsidian (déplacer une scène, en supprimer une), puis recharger : le résumé est juste et rien n'est perdu.
- [ ] Export vers Blender avec une carte orpheline : l'avertissement s'affiche.
- [ ] `npm test` et `npm run lint` passent.

À la fin de chaque sous-étape : résume ce qui a été fait, signale tout écart et toute décision prise seul, puis attends l'accord de David avant le commit.
