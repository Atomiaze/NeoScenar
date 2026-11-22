# État du projet NeoScenar

Détail des décisions passées : decisions-archive.md (ne lire qu'en cas de besoin).

Page courte, à lire **en premier** au début de toute nouvelle conversation (projet Claude) ou session (Claude Code). Elle est tenue à jour par Claude Code à chaque commit d'étape ou de sous-étape. Le détail se trouve dans `cahier-des-charges.md` (référence complète) et `specs/` (une spécification par étape) : ne les lire qu'en cas de besoin.

Dernière mise à jour : 22 novembre 2026 (étapes 0 à 15, 16A à 16C, 17A à 17F terminées (lot 1 fini) ; « À propos » réalisée, en attente de validation ; **décision : version Mac d'abord** ; 18A réalisée (essai de l'étiquette en attente) ; 18B terminée ; 18C-1 à 18C-4 terminées ; prochaine : 18C-5).

## Où on en est

Les numéros de commit antérieurs au 20 novembre 2026 (par exemple `710449c`) renvoient à l'historique local, gardé hors du dépôt public dans `NeoScenar-historique-local/` ; le dépôt public part d'un historique neuf.

- **Terminé** (détail dans `decisions-archive.md`) :
  - 0 à 7 : squelette, projets, cartes, dessin, export Blender, analyseur Fountain, éditeur de scénario.
  - 8 : lien scénario ↔ cartes (rapprochement, orphelines, fichier modifié ailleurs).
  - 9 : export PDF du scénario.
  - 10A à 10E : Recherches (fiches Personnages et Lieux, liens avec le scénario, renommage, documents).
  - 10bA à 10bC : générique (moteur, formulaire, mise en page et export PNG).
  - 11 : planches et PDF du storyboard.
  - 13A à 13E : finitions, statistiques, versions, automatismes, mode révision.
  - 14A à 14C : thèmes, couleurs du scénario, écran d'accueil.
  - 15A à 15E : planning (moteur, liste, ligne du temps, plan de tournage, exports PDF et .ics).
  - 16A à 16C : portabilité, correcteur et police, dépôt public avec installeurs (brouillon de Release `v0.1.0` non publié).
  - Fenêtre « À propos » : réalisée, en attente de validation.
- **Ensuite — étape 18, version Mac complète et publiée** (`specs/etape-18-version-mac.md`) : 18A installeurs Mac seuls (réalisée, essai de l'étiquette en attente) ; 18B défauts relevés sur PC, vérifiés sur Mac (terminée : trait de page correct sur Mac, essai `trait-de-page-accents.mjs` ; numéros de scène du PDF = place dans le texte si pas de `#n#`, voulu, **à revérifier en 18D** ; PDF du scénario sans « 1. » sur la page 1 = convention Final Draft gardée ; storyboard : « N° de page : 1 / N » partout) ; 18C lot 2 des retours (spec `specs/etape-17-lot-2-retours.md`, sous-étapes 18C-1 à 18C-6) ; 18D essais sur l'iMac ; 18E chez la collègue puis sur les Mac de l'école ; 18F guide Mac ; 18G publication.
- **Puis Windows** (16D essais et corrections, 16E guide et publication), **puis Linux** (16F, 16G). Essais du 21 nov. gardés dans `essais-16D.md` (en pause) ; défauts restants listés dans `specs/etape-16-windows-linux.md`.
- **Non prioritaire** : mode plan de l'éditeur ; 12 import automatique des scans (reporté le 19 nov., seulement si les élèves le demandent ; marques, QR codes et JSON d'impression de l'étape 11 restent produits) ; imports Final Draft et KIT Scenarist ; plugin Obsidian. **Mis de côté** : retour Blender → NeoScenar.

## Décisions qui structurent tout

- **Fountain = source de vérité** pour le texte, l'existence et l'ordre des scènes, et leurs en-têtes. Le découpage (`decoupage.json`) garde les plans, les noms, les couleurs et les vignettes.
- **Lien scène ↔ carte = numéro de scène écrit dans le Fountain** : `#30#` ↔ S_0030. Le scénario est numéroté comme le découpage (10, 20, 25…), et `S_0030` est affiché partout : cartes, marge, navigateur, PDF, Blender.
- **Une carte qui a du contenu ne disparaît jamais en silence** : elle devient orpheline. Les modifications qui font perdre des données sont confirmées et annulables, et une sauvegarde est faite avant tout rapprochement qui change quelque chose.
- **Copie de sécurité `avant_rapprochement_…`** (dans `neoscenar/sauvegardes/`) : seulement si le rapprochement change quelque chose (numéros écrits, carte orpheline ou reconnectée, carte vide supprimée) ; les 10 dernières sont gardées. Les copies `avant_liaison_…` sont toutes gardées.
- **Relecture de `scenario.fountain` au retour dans NeoScenar**, dans tous les modules : s'il a été modifié ailleurs (Obsidian…), il est relu et rapproché des cartes. L'état « orpheline » est mémorisé dans `decoupage.json` : le bandeau de résumé ne signale que ce qui vient de changer.
- **Deux historiques d'annulation séparés** (éditeur et cartes). Les actions des cartes modifient le texte hors de l'historique de l'éditeur.
- **Une seule pagination** (`packages/fountain`), partagée par l'éditeur, le navigateur et le futur PDF. Elle est vérifiée sur le PDF de référence de KIT (gardé en local) : 218 lignes sur 219 identiques. Mise en page : `specs/mise-en-page-final-draft-a4.md`.
- **Principes non négociables** : gratuit, 100 % local, sans compte, fichiers ouverts, interface en français. **Un système après l'autre (21 nov.)** : Mac terminé et publié d'abord (étape 18), puis Windows, puis Linux ; le code reste portable et les tests automatiques tournent toujours sur les trois. Licence GPL-3.0. Blender 4.5 LTS.
- **Écarté** : envoi par e-mail depuis NeoScenar.
- **Retours d'usage (21 nov.)** :
  - *Lot 1 avant 16D, spec `specs/etape-17-lot-1-retours.md`* : **17A à 17F terminées, lot 1 fini** (17B : panneau indenté d'environ 30 px, rubrique active en couleur d'accent, contraste ≥ 4,5 sur les 7 thèmes ; barre : Données du projet, Planification, Cartes, Scénario, Statistiques ; icône dossier ; nouveau visuel d'accueil en place sous le nom `visuel-accueil.jpg` ; 17C : blocs du Générique repliés par défaut, état gardé dans les préférences de l'appli par projet (`creditsOpen`, 50 projets au plus), boutons Tout réduire / Tout déployer ; 17D : champ « En-tête » des cartes avec les mêmes propositions que l'éditeur, fusion des listes partagée dans `nameLists.ts`, en-tête écrit dans le Fountain seulement à la validation, tiret final jamais gardé dans un lieu ; 17E : Réglages > « Vocabulaire des plans », entrées personnelles par liste (ajout, renommage, suppression, doublon refusé sans casse ni accents) gardées dans les préférences de l'appli ; le cours d'abord dans les menus ; une valeur hors liste reste affichée, un renommage ne change pas les cartes). 17F : icône `build/icon.png` faite depuis `logo.png` (réduit à 80 %, marge transparente ; script provisoire `make-icon` supprimé) ; visuel d'accueil en `object-fit: contain` sur fond `#25252d` (jamais rogné). Installeurs du brouillon `v0.1.0` reconstruits (`ecb3ced`).
  - *Lot 2, dans l'étape 18 (18C)* : nouveaux documents (log line, tag line, synopsis, pitch, note d'intention) en Markdown dans `neoscenar/`, et fenêtre d'export avec cases à cocher (page de titre, scénario, synopsis, pitch, note d'intention) ; log line et tag line dans le PDF seulement, jamais dans le Fountain ; plan de tournage : personnages cités sans dialogue proposés comme suggestions, et interprètes ajoutés à la main par jour.
  - *18C-2 faite (22 nov.)* : synopsis, pitch et note d'intention = éditeur Markdown partagé (CodeMirror, sans `lang-markdown`), fichiers `neoscenar/synopsis.md`, `pitch.md`, `note-intention.md` créés à la première saisie, relus au retour dans l'appli ; sous-ensemble pur dans `src/shared/markdown/`. **Les versions (étape 13) n'incluent pas ces fichiers** (décision de David : une version = scénario + découpage, comme documents et générique) ; même règle pour log line et tag line (18C-3).
  - *18C-3 faite (22 nov.)* : log line et tag line = liste de versions (+, poubelle confirmée si non vide, case « retenue », une seule à la fois) dans `neoscenar/log-line.md` et `tag-line.md` ; format et lecture tolérante dans `src/shared/versionedTexts.ts` (`retainedText` servira au PDF en 18C-4) ; mêmes canaux que synopsis/pitch (`ProjectTexts`), relus au retour dans l'appli.
  - *18C-4 faite (22 nov.)* : fenêtre PDF avec cases Page de titre, Scénario, Synopsis, Pitch, Note d'intention (vide = grisée « Document vide » ; rien de coché = « Rien à exporter », Enregistrer grisé ; options du scénario grisées sans scénario) ; ordre : titre, synopsis, pitch, note, scénario (confirmé par David) ; titre automatique en titre 1 en tête de chaque document, annoncé dans l'éditeur ; tag line (italique) puis log line retenues centrées sur la page de titre ; plan des pages du scénario seul vérifié identique à avant ; essai `export-pdf-documents.mjs`.
  - *Écarté* : réglage des raccourcis.
- **Thèmes (19 nov.)** : Par défaut (l'actuel), Cobalt, Or, Matrix, PinkLady, Forest, Aqua. À l'écran, la page du scénario suit le thème (couleur du fond et du texte), toujours en Courier et au format Final Draft A4. Les couleurs des éléments du scénario (notes en vert, bandeaux d'actes…) sont réglables dans les préférences, pour l'écran seulement. Les exports (PDF) restent toujours en page blanche, texte noir, Courier, Final Draft A4 : les thèmes n'y touchent jamais.

## Points ouverts

- Windows et Linux : défauts relevés le 21 nov. (correcteur hors ligne sous Windows, icône du dock et AppImage sous Ubuntu, compte standard et portable non essayés) : voir `specs/etape-16-windows-linux.md`. Les trois remarques de 16D sont traitées en 18B (trait de page : propre à Windows, noté dans la spec 16).
- Essai `editeur-finitions.mjs` en échec, antérieur à 16A : la vérification « sans le réglage, le fond change » échoue (vérifié sur le code d'avant 16A).
- Essai `dupliquer-depuis-scenario.mjs` instable : un échec sur trois passages (copie sélectionnée et curseur hors scène), réussi sinon, avant comme après 16A.
- Essais avec l'aperçu PDF : de temps en temps (2 passages sur 10), un message interne de Chromium (« SharedImageManager… Invalid mailbox ») fait échouer « aucune erreur dans les consoles » ; sans lien avec NeoScenar.
- Trait de page « trop haut sur É/À » (13A) : non reproduit à l'écran, corrigé par construction.

## Méthode de travail

- **Projet Claude (conversation)** : rédaction des spécifications, choix d'architecture, déblocages. **Claude Code** : réalisation, tests, vérification dans l'application réelle avec l'outil de pilotage (`scripts/pilotage/`, voir `CLAUDE.md`).
- Une sous-étape = un plan court, la réalisation, des essais, puis l'accord de David avant le commit.
- **Rapports de Claude Code courts** : 10 à 15 lignes, plus les décisions prises seul, les questions et les essais à faire par David.
- **Jusqu'à la fin de 18C** : David ne tape aucune commande sauf `npm run dev` ; Claude Code lance les tests, les essais du pilote, les commits et les `git push` (après accord). Aucune étiquette ni Release GitHub avant 18D ; l'essai de l'étiquette `v0.1.0` est reporté au début de 18D.
- **Conversations courtes** : une nouvelle conversation par étape dans le projet Claude ; `/clear` dans Claude Code après chaque commit de sous-étape.
