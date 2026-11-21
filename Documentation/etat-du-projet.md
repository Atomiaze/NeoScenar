# État du projet NeoScenar

Détail des décisions passées : decisions-archive.md (ne lire qu'en cas de besoin).

Page courte, à lire **en premier** au début de toute nouvelle conversation (projet Claude) ou session (Claude Code). Elle est tenue à jour par Claude Code à chaque commit d'étape ou de sous-étape. Le détail se trouve dans `cahier-des-charges.md` (référence complète) et `specs/` (une spécification par étape) : ne les lire qu'en cas de besoin.

Dernière mise à jour : 21 novembre 2026 (étapes 0 à 15, 16A à 16C et 17A terminées ; « À propos » réalisée, en attente de validation ; prochaine : 17B, puis 16D).

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
- **Ensuite** : 16D (essais sur Windows et Ubuntu avec les installeurs du brouillon ; liste à cocher dans `essais-16D.md`), puis 16E (guide d'installation pour les élèves).
- **Non prioritaire** : mode plan de l'éditeur ; 12 import automatique des scans (reporté le 19 nov., seulement si les élèves le demandent ; marques, QR codes et JSON d'impression de l'étape 11 restent produits) ; imports Final Draft et KIT Scenarist ; plugin Obsidian. **Mis de côté** : retour Blender → NeoScenar.

## Décisions qui structurent tout

- **Fountain = source de vérité** pour le texte, l'existence et l'ordre des scènes, et leurs en-têtes. Le découpage (`decoupage.json`) garde les plans, les noms, les couleurs et les vignettes.
- **Lien scène ↔ carte = numéro de scène écrit dans le Fountain** : `#30#` ↔ S_0030. Le scénario est numéroté comme le découpage (10, 20, 25…), et `S_0030` est affiché partout : cartes, marge, navigateur, PDF, Blender.
- **Une carte qui a du contenu ne disparaît jamais en silence** : elle devient orpheline. Les modifications qui font perdre des données sont confirmées et annulables, et une sauvegarde est faite avant tout rapprochement qui change quelque chose.
- **Copie de sécurité `avant_rapprochement_…`** (dans `neoscenar/sauvegardes/`) : seulement si le rapprochement change quelque chose (numéros écrits, carte orpheline ou reconnectée, carte vide supprimée) ; les 10 dernières sont gardées. Les copies `avant_liaison_…` sont toutes gardées.
- **Relecture de `scenario.fountain` au retour dans NeoScenar**, dans tous les modules : s'il a été modifié ailleurs (Obsidian…), il est relu et rapproché des cartes. L'état « orpheline » est mémorisé dans `decoupage.json` : le bandeau de résumé ne signale que ce qui vient de changer.
- **Deux historiques d'annulation séparés** (éditeur et cartes). Les actions des cartes modifient le texte hors de l'historique de l'éditeur.
- **Une seule pagination** (`packages/fountain`), partagée par l'éditeur, le navigateur et le futur PDF. Elle est vérifiée sur le PDF de référence de KIT (gardé en local) : 218 lignes sur 219 identiques. Mise en page : `specs/mise-en-page-final-draft-a4.md`.
- **Principes non négociables** : gratuit, 100 % local, sans compte, fichiers ouverts, interface en français, macOS d'abord, puis Windows et Linux (étape 16). Licence GPL-3.0. Blender 4.5 LTS.
- **Écarté** : envoi par e-mail depuis NeoScenar.
- **Retours d'usage (21 nov.)** :
  - *Lot 1 avant 16D, spec `specs/etape-17-lot-1-retours.md`* : **17A terminée** (barre : Données du projet, Planification, Cartes, Scénario, Statistiques ; icône dossier ; nouveau visuel d'accueil en place sous le nom `visuel-accueil.jpg`). *Reste à faire* : 17B panneau indenté, rubrique active en couleur ; 17C Générique replié par défaut, état gardé, boutons Tout réduire / Tout déployer ; 17D carte : autocomplétion de l'en-tête de scène ; 17E préférences : entrées des menus échelle, mouvement et angle (une valeur hors liste reste affichée) ; 17F nouvelle icône de l'appli (`logo.png`) et vérification de l'accueil.
  - *Après 16D* : nouveaux documents (log line, tag line, synopsis, pitch, note d'intention) en Markdown dans `neoscenar/`, et fenêtre d'export avec cases à cocher (page de titre, scénario, synopsis, pitch, note d'intention) ; log line et tag line dans le PDF seulement, jamais dans le Fountain ; plan de tournage : personnages cités sans dialogue proposés comme suggestions, et interprètes ajoutés à la main par jour.
  - *Écarté* : réglage des raccourcis.
- **Thèmes (19 nov.)** : Par défaut (l'actuel), Cobalt, Or, Matrix, PinkLady, Forest, Aqua. À l'écran, la page du scénario suit le thème (couleur du fond et du texte), toujours en Courier et au format Final Draft A4. Les couleurs des éléments du scénario (notes en vert, bandeaux d'actes…) sont réglables dans les préférences, pour l'écran seulement. Les exports (PDF) restent toujours en page blanche, texte noir, Courier, Final Draft A4 : les thèmes n'y touchent jamais.

## Points ouverts

- 16B, à vérifier en 16D : correcteur réseau coupé sur Windows et Ubuntu ; sous Windows, Chromium prend le correcteur de Windows si le français y est installé (Hunspell impossible à imposer), notre dictionnaire sinon. Si Electron change de version, vérifier le nom de fichier attendu (`fr-FR-3-0.bdic`).
- 16A, à vérifier en 16D sur les vrais PC : dossier `Packages` du Microsoft Store, Blender de Steam, Flatpak, double-clic sur `.neoscenar`, fermeture de la fenêtre sous Windows.
- Essai `editeur-finitions.mjs` en échec, antérieur à 16A : la vérification « sans le réglage, le fond change » échoue (vérifié sur le code d'avant 16A).
- Essai `dupliquer-depuis-scenario.mjs` instable : un échec sur trois passages (copie sélectionnée et curseur hors scène), réussi sinon, avant comme après 16A.
- Trait de page « trop haut sur É/À » (13A) : non reproduit à l'écran, corrigé par construction.

## Méthode de travail

- **Projet Claude (conversation)** : rédaction des spécifications, choix d'architecture, déblocages. **Claude Code** : réalisation, tests, vérification dans l'application réelle avec l'outil de pilotage (`scripts/pilotage/`, voir `CLAUDE.md`).
- Une sous-étape = un plan court, la réalisation, des essais, puis l'accord de David avant le commit.
- **Rapports de Claude Code courts** : 10 à 15 lignes, plus les décisions prises seul, les questions et les essais à faire par David.
- **Conversations courtes** : une nouvelle conversation par étape dans le projet Claude ; `/clear` dans Claude Code après chaque commit de sous-étape.
