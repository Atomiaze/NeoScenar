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
- **Hors champ** : filtre par couleur ; modifier un commentaire depuis le panneau.
