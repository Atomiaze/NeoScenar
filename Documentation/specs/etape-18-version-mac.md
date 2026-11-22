# Étape 18 — Version Mac complète et publiée

Rédigée le 21 novembre 2026 dans le projet Claude. À lire avec `etat-du-projet.md`. Une sous-étape = un plan court, la réalisation, des essais, l'accord de David, le commit.

## Décision (21 nov.)

**On termine et on publie la version Mac d'abord.** Windows puis Linux viennent ensuite, chacun à son tour, seulement quand le système précédent est validé (voir `specs/etape-16-windows-linux.md`).

- Plus aucun essai manuel sur Windows ni Ubuntu pendant cette étape.
- Le code **reste portable** (règles de `CLAUDE.md` et de 16A inchangées) : on ne casse pas ce qui marche.
- La vérification automatique (`verification.yml`) continue sur les trois systèmes : elle ne coûte rien et signale tout recul de portabilité.
- Les premiers utilisateurs : David (iMac Intel), sa collègue (Mac), puis les Mac de l'école.

## Ordre des sous-étapes

| | Contenu | Spec |
|---|---|---|
| 18A | Installeurs : Mac seulement sur les étiquettes | ici |
| 18B | Défauts relevés pendant 16D, à vérifier sur Mac | ici |
| 18C | Lot 2 des retours d'usage | `specs/etape-17-lot-2-retours.md` |
| 18D | Essais complets sur l'iMac de David, avec le `.dmg` | ici |
| 18E | Essais chez la collègue, puis sur les Mac de l'école | ici |
| 18F | Guide d'installation Mac pour les élèves | ici |
| 18G | Publication de la version Mac | ici |

## 18A — Installeurs : Mac seulement

- `installeurs.yml` : sur une étiquette `v*`, ne construire **que** le `.dmg` (universel Intel + Apple Silicon). Garder les lignes Windows et Linux en commentaire, avec une note : « à réactiver à l'étape 16D (Windows) / 16F (Linux) ».
- Texte du brouillon de Release : uniquement le Mac, plus une phrase « Windows et Linux : plus tard ».
- `README.md` : l'installation ne présente que le Mac, avec la même phrase pour Windows et Linux.
- `verification.yml` (tests à chaque envoi) : **inchangé**, toujours sur les trois systèmes.

*Validé quand* : une étiquette d'essai donne un brouillon avec le seul `.dmg`.

## 18B — Défauts relevés pendant 16D, à vérifier d'abord sur Mac

Ces remarques viennent des essais Windows et Ubuntu du 21 novembre, mais elles ne dépendent probablement pas du système. Pour chacune : **reproduire sur Mac**, puis corriger si le défaut existe sur Mac ; sinon, la reporter dans `etape-16-windows-linux.md`.

1. **Trait de page qui traverse l'accent d'un É** (vu sous Windows ; point ouvert depuis 13A : « trait trop haut sur É/À »). Chercher sur le Mac avec un É en début de page, dans plusieurs thèmes et tailles de texte.
2. **Numéros de scène dans le PDF du scénario** : sous Ubuntu, les scènes portent les numéros 1, 2, 3 alors que la case « numéroter les scènes » n'est pas cochée. Vérifier le comportement attendu dans la spec 9 et sur Mac.
3. **Numéros de page du PDF du storyboard** : pas de numéro sur la première page, « 2 » sur la deuxième, numéros en haut à droite. Dire à David si c'est voulu (convention : pas de numéro sur la première page ?) ; s'il veut changer, il le dira.

*Validé quand* : chaque point est corrigé sur Mac, ou noté « propre à Windows/Linux » dans la spec 16, avec l'accord de David.

## 18C — Lot 2 des retours d'usage

Contenu décidé le 21 nov. (voir `etat-du-projet.md`, « Retours d'usage ») : documents log line, tag line, synopsis, pitch et note d'intention, en Markdown dans `neoscenar/` ; nouvel ordre des rubriques du panneau Données du projet ; fenêtre d'export avec cases à cocher ; plan de tournage (personnages sans dialogue proposés, interprètes ajoutés à la main par jour). Spec rédigée le 21 nov. : `specs/etape-17-lot-2-retours.md` (18C-1 à 18C-6).

## 18D — Essais complets sur l'iMac de David

- Claude Code prépare `Documentation/essais-mac.md`, sur le modèle de `essais-16D.md` : liste à cocher, ce qu'il faut voir, une ligne « Remarque » par bloc. On essaie **l'application installée depuis le `.dmg`** du brouillon, pas `npm run dev`.
- Contenu : téléchargement et premier lancement (avertissement d'Apple, voir 18F) ; tous les modules ; tous les exports ; export Blender ; versions ; double-clic sur un `.neoscenar` ; copie du projet sur clé ; lots 1 et 2 des retours.
- Reprendre les cases de `essais-16D.md` qui ont un sens sur Mac, sans ce qui est propre à Windows ou Linux.

*Validé quand* : toutes les cases sont cochées sur l'iMac, ou leurs défauts corrigés.

## 18E — Chez la collègue, puis sur les Mac de l'école

**Chez la collègue** : liste courte tirée de `essais-mac.md` (installation, premier lancement, un projet complet, exports). Noter le modèle du Mac (Intel ou Apple Silicon) et la version de macOS.

**Mac de l'école** : **David en est l'administrateur** (21 nov.). Il installe lui-même NeoScenar dans `/Applications` et lève l'avertissement d'Apple une fois par Mac (« Ouvrir quand même », ou retrait de l'attribut de quarantaine : `xattr -dr com.apple.quarantine /Applications/NeoScenar.app`). À vérifier : qu'une session **élève** ouvre ensuite NeoScenar sans aucun avertissement. Le guide 18F reste nécessaire pour les élèves qui installent chez eux.

Points à vérifier aussi, sur une session élève (utiles pour les Mac personnels des élèves) :

- l'élève peut-il installer l'application **sans mot de passe administrateur** ? Glisser dans `/Applications` le demande souvent sur un compte standard. Solution prévue : glisser NeoScenar dans un dossier `Applications` **de son propre dossier** (`~/Applications`), ou le lancer depuis un dossier personnel ;
- l'élève peut-il **ouvrir une application non signée** ? Sur macOS 15 et plus, le clic droit ▸ Ouvrir ne suffit plus : il faut passer par Réglages Système ▸ Confidentialité et sécurité ▸ « Ouvrir quand même ». Noter si un mot de passe est demandé, et lequel ;
- les Mac sont-ils gérés par l'école (profil, liste d'applications autorisées) ? Si les applications non signées sont bloquées, **on s'arrête et on en parle** : la seule solution est la signature Apple (compte développeur payant), à décider par David.

Noter : version de macOS, modèle, ce que l'élève voit à chaque étape (captures).

*Validé quand* : un élève installe et ouvre NeoScenar seul sur un Mac de l'école, en suivant le guide (18F).

## 18F — Guide d'installation Mac pour les élèves

- En français simple, une page : où télécharger, quel fichier, où glisser l'application (selon ce que 18E a montré), comment passer l'avertissement d'Apple (avec captures, versions récentes de macOS comprises), premier lancement.
- Dans `README.md` et `Documentation/installation-mac.md`. Mise en page PDF faite plus tard dans le projet Claude.
- Le guide est **relu pendant 18E** : on le corrige d'après ce que l'élève a vraiment vu.

## 18G — Publication

- Version : `0.1.0`, ou `0.2.0` si le lot 2 est dedans (à décider par David au moment de publier).
- David publie lui-même le brouillon de Release (toujours en « pre-release » tant que la version commence par 0).
- Mettre à jour `etat-du-projet.md` : version Mac publiée, prochaine étape 16D (Windows).
