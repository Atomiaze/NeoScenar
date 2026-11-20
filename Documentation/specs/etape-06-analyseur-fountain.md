# Étape 6 — Analyseur Fountain

## Objectif

Écrire notre propre module TypeScript qui **lit** un scénario au format Fountain, en donne une structure exploitable (page de titre, scènes, personnages, dialogues…), et sait le **réécrire**. C'est la fondation de tout le module Scénario (étapes 7 et 8) ; il sera aussi réutilisable ailleurs, par exemple dans un plugin Obsidian.

**Critère numéro un : aucune perte.** Lire un fichier puis le réécrire sans modification doit redonner **exactement** le même texte, caractère pour caractère, quel que soit le fichier, y compris un fichier mal formé.

Pourquoi ne pas utiliser une bibliothèque existante : celles qui existent (fountain-js…) servent surtout à transformer un scénario en page HTML et ne garantissent pas une réécriture à l'identique.

Références : `CLAUDE.md`, section 3 du cahier des charges, et la spécification officielle de la syntaxe Fountain (https://fountain.io/syntax), qui fait foi pour les règles.

Présente ton plan à David avant de commencer, en particulier la structure de données proposée.

## 1. Emplacement et contraintes

- Dans `packages/fountain/` (le module vide créé à l'étape 0).
- **Aucune dépendance** : TypeScript pur, sans Electron, React, Node ni bibliothèque externe. Doit fonctionner dans un navigateur, dans Node et dans Obsidian.
- Ne lève jamais d'exception sur un texte d'entrée, quel qu'il soit : un texte bizarre est simplement classé du mieux possible.
- `README.md` propre au module (en français) : à quoi il sert, exemple d'utilisation, licence GPL-3.0.
- Rapide : un scénario de 120 pages s'analyse en moins de 50 ms sur l'iMac de David (test de performance indicatif).

## 2. Éléments à reconnaître

Suivre la spécification Fountain, notamment :

| Élément | Règle principale |
|---|---|
| Page de titre | paires `Clé: valeur` au tout début du fichier, valeurs sur plusieurs lignes indentées ; se termine à la première ligne vide |
| En-tête de scène | ligne commençant par `INT`, `EXT`, `EST`, `INT./EXT`, `INT/EXT`, `I/E` (majuscules ou minuscules) suivi d'un point ou d'une espace, précédée d'une ligne vide ; forcé par un `.` initial (mais pas `..`) |
| Numéro de scène | `#…#` en fin d'en-tête |
| Action | tout le reste ; forcée par `!` ; espaces et tabulations conservés |
| Personnage | ligne entièrement en majuscules (au moins une lettre), précédée d'une ligne vide et suivie d'une ligne non vide ; les extensions entre parenthèses peuvent contenir des minuscules ; forcé par `@` ; `^` final = dialogue simultané |
| Didascalie | ligne entre parenthèses dans un bloc de dialogue |
| Dialogue | lignes qui suivent un personnage ou une didascalie, jusqu'à une ligne vide ; une ligne de deux espaces garde une ligne vide dans le dialogue |
| Paroles | ligne commençant par `~` |
| Transition | ligne en majuscules finissant par `TO:`, entourée de lignes vides ; forcée par `>` |
| Texte centré | `> texte <` |
| Saut de page | ligne de trois `=` ou plus |
| Section | `#`, `##`, `###`… |
| Synopsis | ligne commençant par `=` |
| Note | `[[ … ]]`, dans une ligne ou sur plusieurs lignes |
| Texte mis de côté | `/* … */`, sur plusieurs lignes |
| Mise en forme | `*italique*`, `**gras**`, `***gras italique***`, `_souligné_`, échappement par `\` |

**Lettres accentuées** : la détection des majuscules (personnages, transitions) doit gérer les lettres accentuées (`ÉLODIE`, `FRANÇOIS`, `CHLOÉ`).

**Particularités françaises** :

- Les transitions françaises (« FONDU AU NOIR », « COUPE : ») ne finissent pas par `TO:` : elles ne sont reconnues que forcées par `>`. C'est normal ; l'éditeur (étape 7) les forcera automatiquement.
- L'extension de reprise française est `(SUITE)`, l'équivalent de `(CONT'D)`.

## 3. Structure de données

À proposer à David, dans cet esprit :

- Un document = la page de titre (liste de paires clé/valeur, dans l'ordre) + une liste d'éléments.
- Chaque élément a : son **type**, son **texte utile** (sans les marqueurs comme `!`, `@`, `>`), un indicateur « forcé », sa position dans le fichier (ligne de début et de fin, décalages en caractères) et le **texte source exact** dont il provient (y compris lignes vides, espaces et fins de ligne).
- Informations supplémentaires selon le type :
  - en-tête de scène : préfixe (`INT.`, `EXT.`, `INT./EXT.`…), **lieu**, **moment**, numéro de scène. Règle de NeoScenar : le moment est le **dernier** segment après « - » ; le lieu est tout ce qui se trouve entre le préfixe et ce dernier segment. Exemple : `INT. MAISON - CUISINE - JOUR` → lieu « MAISON - CUISINE », moment « JOUR ». Sans « - », le moment est vide ;
  - personnage : **nom** (sans les extensions), liste des **extensions** (`V.O.`, `O.S.`, `SUITE`…), dialogue simultané oui/non ;
  - section : niveau ;
  - note et texte mis de côté : où qu'ils apparaissent (y compris au milieu d'une ligne), ils doivent être repérés et conservés.

## 4. Fonctions publiques

- `parse(texte)` → document.
- `serialize(document)` → texte. Pour un élément non modifié, le texte source exact est réutilisé tel quel. Pour un élément créé ou modifié par programme, le texte est produit proprement (forçage ajouté seulement quand il est nécessaire).
- `getScenes(document)` → liste des scènes, chacune avec son en-tête analysé, sa position et ses éléments.
- `getCharacters(document)` → noms de personnages distincts, avec le nombre de répliques.
- `getLocations(document)` → lieux distincts (selon la règle du lieu ci-dessus).
- `parseInline(texte)` → découpe d'une ligne en morceaux avec leur mise en forme (gras, italique, souligné, notes), pour l'affichage futur.
- Fonctions d'aide pour l'éditeur : analyser un en-tête de scène seul, analyser une ligne de personnage seule.

## 5. Fichiers d'exemple et tests

- Écrire **nos propres** fichiers d'exemple dans `packages/fountain/tests/exemples/` (ne pas copier de scénarios existants, protégés par le droit d'auteur) :
  - un court scénario en français couvrant **tous** les éléments du tableau ;
  - un scénario « piège » : lignes en majuscules suivies d'une ligne vide (action, pas personnage), transition non précédée d'une ligne vide, en-tête en minuscules, notes sur plusieurs lignes, texte mis de côté non refermé, note non refermée, tabulations, espaces en fin de ligne ;
  - variantes de fins de ligne (`\n`, `\r\n`), fichier avec marque d'ordre des octets (BOM), fichier vide, fichier avec seulement une page de titre.
- **Tests de réécriture à l'identique** sur tous ces fichiers, plus un test sur des **textes aléatoires** (des milliers de textes générés à partir de lignes Fountain mélangées) : `serialize(parse(t)) === t` dans tous les cas.
- Tests de classification élément par élément, en suivant les exemples de la spécification Fountain.
- Tests des en-têtes (préfixes, lieux composés, moment, numéro de scène), des personnages (extensions, `^`, `@`, accents), de `parseInline`, de `getScenes`, `getCharacters`, `getLocations`.
- Test de performance indicatif (120 pages).

## 6. Petit outil de démonstration

Script `npm run fountain:demo -- <fichier.fountain>` qui affiche dans le terminal, en français, la page de titre puis la liste des éléments reconnus (« Scène 3 : INT. MAISON - CUISINE - JOUR — lieu : MAISON - CUISINE — moment : JOUR », « Personnage : MARIE (V.O.) », « Dialogue : … »), le nombre de scènes, la liste des personnages et des lieux, et indique si la réécriture est identique à l'original.

## Hors périmètre

- Éditeur de scénario et mise en page (étape 7), lien avec les cartes (étape 8), export PDF (étape 9).
- Import Final Draft ou KIT Scenarist.

## Critères de validation (à vérifier par David)

- [ ] `npm test` passe, y compris les tests de réécriture à l'identique et sur textes aléatoires.
- [ ] `npm run fountain:demo` sur le scénario d'exemple français affiche correctement scènes, personnages, dialogues, lieux.
- [ ] Exporter en Fountain un vrai scénario d'élève depuis KIT Scenarist et le passer dans `fountain:demo` : les éléments sont bien reconnus et la réécriture est identique.
- [ ] `INT. MAISON - CUISINE - JOUR` donne le lieu « MAISON - CUISINE » et le moment « JOUR ».
- [ ] `ÉLODIE (V.O.)` est reconnu comme personnage « ÉLODIE » avec l'extension « V.O. ».
- [ ] Le module ne dépend de rien (vérifier `packages/fountain/package.json`) et a son README.
- [ ] `npm run lint` passe.
