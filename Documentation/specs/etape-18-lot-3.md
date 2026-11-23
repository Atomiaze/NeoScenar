# Étape 18 — Lot 3 (sous-étapes 18C-7 et 18C-8)

Rédigée le 22 novembre 2026. Deux ajouts avant 18E. Même méthode que les lots précédents : plan court, réalisation, essais, accord de David, commit, mise à jour de `etat-du-projet.md`.

## 18C-7 — Genre des personnages et crédits (à faire maintenant)

**Genre**
- Fiche personnage : champ « Genre », menu déroulant, liste fixe : Femme, Homme, Non-binaire, Genre Fluide, Agenre, Neutre, Non défini.
- Rangé dans l'en-tête (YAML) de la fiche : `genre:`, avec le libellé tel qu'affiché (lisible dans Obsidian).
- Absent = « Non défini ». Une fiche n'est pas réécrite tant que rien ne change (comportement actuel du moteur : texte inchangé si rien ne change). Choisir « Non défini » écrit `genre: ""`.
- Une valeur inconnue (écrite à la main ailleurs) reste affichée telle quelle dans le menu, comme pour le rôle.
- Place dans la fiche : sur la ligne Interprète / Âge / Rôle.
- Les nouvelles fiches contiennent `genre: ""` (comme les autres propriétés).

**Crédits** (« À propos » et accueil)
- Créé par David Delepinne
- Module Révision Gabriel Delepinne
- Soutien technique Mathilde Gossart
- Écrits une seule fois dans `src/shared/appInfo.ts` ; textes dans `fr.ts`. Aucune adresse e-mail.
- « À propos » : trois lignes. Accueil : la mention actuelle « Créé par … · version … » est gardée, les deux autres crédits s'y ajoutent.

**Critères de validation**
- [ ] Le menu « Genre » propose les 7 valeurs, dans cet ordre ; une fiche existante affiche « Non défini » et n'est pas réécrite à l'ouverture.
- [ ] Choisir une valeur écrit `genre:` dans le fichier `.md` ; une valeur inconnue écrite à la main reste affichée.
- [ ] Les trois crédits apparaissent dans « À propos » et sur l'accueil.
- [ ] Tests Vitest du moteur de fiches (lecture, écriture, absence) ; essais `recherches-personnages.mjs` et `a-propos.mjs` complétés.

## 18C-8 — Panneau des révisions (plus tard, en Opus)

Panneau à droite du scénario, pour le mode révision (étape 13E).

- Bouton Afficher / Masquer dans le bandeau de révision ; état gardé par projet.
- Une ligne par marque, dans l'ordre du texte : pastille de couleur, `S_00xx`, début du texte surligné, commentaire.
- Clic sur une ligne = défilement jusqu'à la marque + sélection.
- Mise à jour en direct (frappe, « Effacer toutes les marques »). Vide : « Aucune révision ».
- Le survol actuel des commentaires ne change pas.
- Largeur d'environ 280 px ; vérifier que la page A4 ne déborde pas sur un petit écran.
- **Hors champ en 18C-8** : filtre par couleur ; modifier un commentaire depuis le panneau (→ 18C-9).

## 18C-9 — Panneau des révisions : filtre, commentaire, couleur, effacement (demande de Gabriel)

Rédigée le 22 novembre 2026. Touche au panneau des révisions et à la fenêtre du commentaire. Le format des marques ne change pas : un retour à la ligne du commentaire s'écrit « ¶ » (voir plus bas).

**Filtre par couleur**
- En tête du panneau, sous le titre : 4 pastilles (jaune, vert, rose, bleu), chacune avec son nombre de marques. Ce sont des interrupteurs : clic = afficher / cacher cette couleur. Toutes allumées par défaut. Une pastille éteinte est en contour seul (pas seulement plus pâle : lisible sur les 7 thèmes).
- Une couleur sans marque : pastille grisée, non cliquable, « 0 ».
- Alt + clic (Option sur Mac) sur une pastille = n'afficher que cette couleur ; Alt + clic sur la seule allumée = tout rallumer.
- Titre : « Révisions (n) » sans filtre, « Révisions (affichées / total) » avec filtre.
- Liste vide à cause du filtre : « Aucune révision pour ces couleurs ». « Aucune révision » reste le message du document sans marque.
- Le filtre ne touche que la liste : les surlignages de l'éditeur restent tous visibles.
- État du filtre en mémoire seulement (pas enregistré) : remis à « tout » quand on quitte le mode révision ou qu'on change de projet.
- Calcul pur à côté de `buildRevisionList` (ex. `filterRevisionList(items, couleurs)` et `countByColor(items)`) dans `src/shared/revision/`.

**Modifier un commentaire depuis le panneau**
- Sur chaque ligne, un bouton crayon (« Modifier le commentaire », ou « Ajouter un commentaire » s'il est vide), visible au survol et au focus clavier (Tab).
- Il ouvre **la même fenêtre** que « Modifier le commentaire… » du menu contextuel, préremplie ; même nettoyage (`cleanComment`), vide = commentaire retiré.
- Validation par `setMarkComment` : la modification entre dans l'historique de l'éditeur (Cmd + Z l'annule). Avant d'écrire, retrouver la marque à sa position ; si elle n'existe plus, ne rien écrire.
- Le clic sur le crayon ne déclenche pas le clic de la ligne. Après validation, la ligne est mise à jour, le texte surligné est sélectionné dans l'éditeur (comme un clic sur la ligne), et le focus revient au crayon de la ligne.

**Changer la couleur depuis le panneau**
- Clic sur la pastille de la ligne = petit menu des 4 couleurs (la couleur actuelle cochée). Choisir une couleur réécrit seulement l'ouverture `[[R:couleur|…]]` (commentaire gardé), par une fonction pure à côté de `planComment` (ex. `planColor`).
- Annulable par Cmd + Z (historique de l'éditeur). Si le filtre cache la nouvelle couleur, la ligne disparaît de la liste (normal) et le nombre des pastilles se met à jour.

**Effacer une marque depuis le panneau**
- Bouton poubelle sur chaque ligne (visible au survol et au focus, comme le crayon) : retire la marque avec `removeMarks` (le texte reste identique au caractère près), **sans confirmation** car Cmd + Z annule ; info-bulle « Effacer la marque (Cmd + Z annule) ».
- Après effacement, le focus passe à la ligne suivante (ou précédente s'il n'y en a plus).

**Retour à la ligne dans le commentaire**
- Dans la fenêtre du commentaire (menu contextuel et panneau) : Maj + Entrée = retour à la ligne ; Entrée = valider ; Échap = annuler. Le champ devient une zone de texte de 3 lignes environ, qui grandit jusqu'à 6. Indication sous le champ : « Maj + Entrée pour aller à la ligne. Laissez vide pour retirer le commentaire. »
- Enregistrement (**décision du 23 novembre 2026**, après vérification) : un vrai retour à la ligne dans la note coupait la ligne imprimée (la mise en page lit le paragraphe ligne du fichier par ligne du fichier) et décalait la page suivante. Le commentaire reste donc **sur une seule ligne dans le fichier**, et chaque retour à la ligne devient « ¶ » entouré d'espaces : `[[R:jaune|ligne 1 ¶ ligne 2]]`. `cleanComment` : plusieurs retours à la suite = un seul « ¶ », jamais de « ¶ » en début ou en fin, espaces en trop retirés sur chaque ligne, crochets toujours remplacés.
- Lecture : « ¶ », avec ou sans espaces autour, s'affiche comme un retour à la ligne dans la bulle du survol, le panneau (limité à deux lignes visibles) et la fenêtre du commentaire.
- Vérifié par un test : la pagination, le PDF, les statistiques, le rapprochement et l'éditeur sont identiques avec et sans commentaire sur plusieurs lignes, y compris juste avant un trait de page.

- Hors champ : actions sur plusieurs marques à la fois (sauf « Effacer toutes les marques », qui existe déjà).

**Critères de validation**
- [ ] Les 4 pastilles affichent le bon nombre ; éteindre une couleur cache ses lignes et met à jour le titre ; Alt + clic isole une couleur, puis rallume tout.
- [ ] Taper dans le scénario ou « Effacer toutes les marques » met à jour liste et nombres sans perdre le filtre ; quitter le mode révision le remet à zéro.
- [ ] Le crayon modifie, ajoute et retire un commentaire ; le Fountain contient `[[R:couleur|texte]]` ; Cmd + Z annule ; le survol montre le nouveau commentaire.
- [ ] Changer la couleur d'une ligne garde le commentaire ; effacer une ligne retire seulement les notes ; Cmd + Z annule les deux.
- [ ] Maj + Entrée insère un retour à la ligne, Entrée valide ; le fichier contient « ¶ » sur une seule ligne, jamais en début ou en fin ni deux à la suite ; pagination, PDF et éditeur identiques avec et sans commentaire sur plusieurs lignes (y compris juste avant un trait de page) ; le fichier reste lisible dans Obsidian.
- [ ] Contraste des pastilles allumées / éteintes vérifié sur les 7 thèmes.
- [ ] Tests Vitest du filtre, du comptage, de `planColor` et de `cleanComment` (lignes) ; essai `revision-panneau.mjs` complété ; cases ajoutées dans `essais-mac.md` (section 12).
