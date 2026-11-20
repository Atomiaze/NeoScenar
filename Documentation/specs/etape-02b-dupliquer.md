# Étape 2b — Dupliquer des plans et des scènes

## Objectif

Ajouter au module Cartes une commande **Dupliquer**, utile quand un plan ou une scène se répète (champ/contrechamp, plan de coupe récurrent, scène qui revient). Petite étape, qui complète l'étape 2.

Références : `CLAUDE.md`, `Documentation/specs/etape-02-module-cartes.md` (règles de numérotation, § 6).

## Où trouver la commande

- Menu contextuel (clic droit) d'une carte plan ou scène : **Dupliquer**.
- Menu **Édition > Dupliquer**.
- Raccourci **`Cmd + D`**.
- Fonctionne sur la sélection courante : un plan, une scène, ou plusieurs éléments.

## Règles

1. **Emplacement** : la copie est insérée juste après l'original. Pour une sélection de plusieurs plans, les copies sont insérées ensemble, dans leur ordre, juste après le dernier plan sélectionné de chaque scène concernée. Pour plusieurs scènes, même principe après la dernière scène sélectionnée.
2. **Numéro** : la copie reçoit un numéro selon les règles habituelles d'insertion (§ 6 de l'étape 2) : P_0015 entre P_0010 et P_0020 ; proposition de renumérotation s'il n'y a plus de place ; lettre (P_0010A) si les numéros sont verrouillés. La duplication reste possible quand les numéros sont verrouillés.
3. **Contenu** : tout est copié à l'identique — nom, couleur, durée, échelle, mouvement, angle, sons, musique, description ; pour une scène, en-tête et couleur. Seuls le numéro et l'identifiant interne (nouvel UUID) changent. Le nom n'est pas modifié (pas de « copie » ajouté).
4. **Scène dupliquée** : elle contient une copie de tous les plans de l'originale, avec de nouveaux identifiants internes et les mêmes numéros (P_0010, P_0020…), puisque la numérotation des plans recommence dans chaque scène.
5. **Sélection** : après la duplication, ce sont les copies qui sont sélectionnées et visibles à l'écran.
6. **Annulation** : une duplication (même de plusieurs éléments) est une seule étape d'annulation (« Annuler la duplication »).
7. **Pour plus tard** (à ne pas réaliser maintenant, mais à garder possible) : quand les vignettes existeront (étape 3), dupliquer un plan copiera son image dans un **nouveau fichier** nommé d'après le nouvel identifiant, pour que les deux vignettes restent indépendantes.

## Tests automatiques attendus

- Dupliquer un plan au milieu, en fin de scène, quand il n'y a plus de numéro libre, quand les numéros sont verrouillés.
- Dupliquer plusieurs plans d'une même scène, et de scènes différentes.
- Dupliquer une scène : plans copiés, nouveaux identifiants, mêmes numéros de plans, numéro de scène intermédiaire.
- Les identifiants internes des copies sont tous nouveaux et uniques ; l'original n'est pas modifié.
- Annuler / rétablir une duplication.

## Critères de validation (à vérifier par David)

- [ ] Clic droit sur P_0010 → Dupliquer : un P_0015 identique (nom, couleur, fiche) apparaît juste après.
- [ ] `Cmd + D` sur une scène : une nouvelle scène identique apparaît juste après, avec tous ses plans.
- [ ] Sélectionner 3 plans au `Cmd + clic` puis `Cmd + D` : les 3 copies apparaissent ensemble et sont sélectionnées.
- [ ] Numéros verrouillés : la copie de P_0010 (suivi de P_0011) devient P_0010A.
- [ ] Modifier la copie ne modifie pas l'original.
- [ ] `Cmd + Z` annule toute la duplication en une fois.
- [ ] `npm test` et `npm run lint` passent.
