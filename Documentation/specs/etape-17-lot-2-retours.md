# Étape 17 — Lot 2 des retours d'usage (sous-étape 18C)

Rédigée le 21 novembre 2026 dans le projet Claude. Source : note de David du 21 novembre 2026 (`VaultObsidian/00_Inbox/NeoScenar - Mise à jour.md`, image `Données Projet.jpg`), `etat-du-projet.md` (« Retours d'usage ») et `specs/etape-18-version-mac.md` (18C). Le lot 1 (`etape-17-lot-1-retours.md`) est terminé.

## Périmètre

1. Panneau « Données du projet » : nouvelles rubriques et nouvel ordre ; la page de titre s'y édite.
2. Synopsis, pitch et note d'intention : documents Markdown avec mise en forme simple.
3. Log line et tag line : plusieurs versions, une version retenue pour la page de titre du PDF.
4. Fenêtre d'export PDF avec cases à cocher (page de titre, scénario, synopsis, pitch, note d'intention).
5. Plan de tournage : personnages cités sans dialogue proposés comme suggestions ; interprètes ajoutés à la main par jour.

**Hors lot** : réglage des raccourcis (écarté) ; export de ces documents vers Blender, Obsidian ou les statistiques.

## Règles communes

- **Rien ne va dans le Fountain**, sauf la page de titre qui y est déjà. Log line et tag line n'apparaissent que dans le PDF.
- Fichiers ouverts et lisibles dans Obsidian, dans le dossier `neoscenar/` du projet, en UTF-8 :
  - `neoscenar/synopsis.md`, `neoscenar/pitch.md`, `neoscenar/note-intention.md` ;
  - `neoscenar/log-line.md`, `neoscenar/tag-line.md` (format en 18C-3).
- Un fichier absent = document vide. Il n'est créé qu'à la première saisie (un projet existant ne change pas tant qu'on n'écrit rien). Écriture sûre (`writeFileSafely`), comme le reste.
- Un fichier modifié ailleurs (Obsidian) est relu au retour dans NeoScenar, comme `scenario.fountain`.
- Ces fichiers suivent le projet partout : copie sur clé, versions (étape 13), « Enregistrer sous ». Vérifier que les versions les incluent.
- Le correcteur orthographique (16B) est actif dans tous ces champs.
- Textes affichés dans `fr.ts`. On ne renomme rien dans le code existant (`research` reste `research`).

Une sous-étape = plan court, réalisation, essais, accord de David, commit, mise à jour de `etat-du-projet.md`, `/clear`.

---

## 18C-1 — Panneau : nouvel ordre, page de titre

**À faire**

- Ordre des rubriques, de haut en bas (l'image de référence montre le look, pas l'ordre) :
  1. Page de titre · 2. Log line · 3. Synopsis · 4. Personnages · 5. Lieux · 6. Documents · 7. Générique · 8. Pitch · 9. Tag line · 10. Note d'intention
- Les nouvelles rubriques sont des entrées simples, comme « Générique » (pas de flèche, pas de compteur), avec les règles du lot 1 : rubrique active soulignée et en couleur d'accent.
- Pendant cette sous-étape, Log line, Synopsis, Pitch, Tag line et Note d'intention ouvrent une vue provisoire « À venir » (remplie en 18C-2 et 18C-3).
- **Page de titre** : ouvre le formulaire actuel (`TitlePageDialog`) dans la zone de droite du module, en vue normale au lieu d'une fenêtre. Mêmes champs, même écriture dans le Fountain. Réutiliser le composant : extraire le contenu du formulaire, utilisé par la vue et par la fenêtre. La fenêtre reste accessible depuis le module Scénario comme aujourd'hui.

**Critères de validation**

- [ ] Les 10 rubriques apparaissent dans l'ordre ci-dessus, sur les 7 thèmes.
- [ ] Page de titre modifiée dans Données du projet → visible dans l'éditeur et dans le PDF, et inversement.
- [ ] Un projet existant s'ouvre sans qu'aucun fichier ne change.

## 18C-2 — Synopsis, pitch, note d'intention

**À faire**

- Un **éditeur Markdown partagé** pour les trois documents : le texte est enregistré en Markdown, et affiché mis en forme pendant la frappe (titres plus grands, gras, italique, ligne), à la façon d'Obsidian en mode « aperçu en direct » léger.
- Barre d'outils : **Titre 1, Titre 2, Titre 3, Gras, Italique, Ligne horizontale**. Raccourcis : Cmd/Ctrl+B (gras), Cmd/Ctrl+I (italique). La syntaxe tapée à la main (`# `, `**…**`, `*…*`, `---`) marche aussi.
- Seul ce sous-ensemble est pris en charge (plus les paragraphes). Le reste de Markdown tapé à la main est gardé tel quel dans le fichier et affiché comme du texte.
- Technique : CodeMirror (déjà utilisé). `@codemirror/lang-markdown` est acceptable ; **toute autre dépendance : demander d'abord**.
- Enregistrement automatique, comme les notes de Documents. Police de l'interface, pas Courier.

**Critères de validation**

- [ ] J'écris un synopsis avec un titre, du gras, de l'italique et une ligne : l'affichage est mis en forme, le fichier `neoscenar/synopsis.md` contient le Markdown attendu et s'ouvre proprement dans Obsidian.
- [ ] Je modifie `pitch.md` dans Obsidian, je reviens dans NeoScenar : le changement est visible.
- [ ] Les trois documents sont indépendants ; rien n'est écrit tant que je n'ai pas tapé.
- [ ] Tests de l'analyse du sous-ensemble Markdown (fonction pure dans `src/shared/`).

## 18C-3 — Log line et tag line

**À faire**

- Chaque rubrique montre une liste de **versions** (un bloc de texte court chacune, sans mise en forme), un bouton **+** pour en ajouter une, et une poubelle par version (confirmée si le bloc n'est pas vide).
- Une **case « Retenue pour la page de titre »** par version : une seule cochée à la fois (cocher l'une décoche l'autre) ; on peut n'en cocher aucune.
- Format du fichier, lisible et modifiable à la main :

  ```markdown
  ## Version 1

  Un père cherche…

  ## Version 2 (retenue)

  Un homme seul…
  ```

  Lecture tolérante : un texte sans titre `## Version` = une seule version ; plusieurs « (retenue) » = la première l'emporte. À l'enregistrement, les versions sont renumérotées 1, 2, 3.
- Parseur et écrivain : fonctions pures dans `src/shared/`, avec tests (aller-retour, fichier écrit à la main, cas tolérés).

**Critères de validation**

- [ ] J'ajoute trois log lines, je retiens la 2ᵉ : le fichier correspond au format ci-dessus.
- [ ] Je retiens la 3ᵉ : la 2ᵉ est décochée.
- [ ] Je supprime une version : confirmation, renumérotation, la version retenue reste la bonne.
- [ ] Un fichier écrit à la main dans Obsidian est relu sans perte.

## 18C-4 — Fenêtre d'export PDF

**À faire**

- Dans la fenêtre « Exporter le scénario en PDF », cases à cocher : **Page de titre, Scénario, Synopsis, Pitch, Note d'intention**. Les options du scénario (numérotation, nouvelle page par acte) sont grisées si « Scénario » n'est pas coché.
- Une case dont le document est vide est grisée, avec l'infobulle « Document vide ». Au moins une case doit être cochée, sinon le bouton Enregistrer est grisé.
- Les choix sont gardés comme les options actuelles (`PdfExportOptions`, avec valeurs par défaut pour les anciens réglages : page de titre et scénario cochés, le reste décoché).
- **Ordre dans le PDF** : page de titre, synopsis, pitch, note d'intention, scénario. *(À confirmer par David au premier essai.)*
- **Page de titre** : si une log line et/ou une tag line sont retenues, elles sont imprimées sous le titre et l'auteur, centrées : la tag line en italique, puis la log line. Rien n'est écrit dans le Fountain. Si aucune n'est retenue, la page de titre ne change pas.
- **Documents** : chacun commence sur une nouvelle page. A4, mêmes marges que le scénario, Courier 12 (cohérent avec le reste du PDF). Titre 1 : gras, majuscules ; Titre 2 : gras ; Titre 3 : gras italique ; ligne horizontale : trait fin sur la largeur du texte. Pages des documents non numérotées ; la numérotation du scénario ne change pas.
- L'aperçu montre exactement le fichier enregistré. Le nom du fichier ne change pas.
- La pagination du scénario (`packages/fountain`) n'est **pas touchée** : les documents sont ajoutés autour.

**Critères de validation**

- [ ] Scénario seul : PDF identique à avant (comparer avec un export d'avant 18C).
- [ ] Synopsis + note d'intention sans scénario : deux documents, pages bien mises en forme.
- [ ] Log line et tag line retenues : visibles sur la page de titre du PDF, absentes du Fountain.
- [ ] Les cases sont retrouvées à la réouverture de la fenêtre.
- [ ] Tests de mise en page des documents (`packages/pdf-scenario` ou à côté).

## 18C-5 — Plan de tournage : suggestions de personnages muets

**À faire**

- Dans le détail d'une scène du plan de tournage (`ShootingScenePanel`), sous les personnages muets : **« Suggestions »** = personnages qui **ont une fiche ou parlent ailleurs dans le scénario**, dont le nom apparaît dans les **lignes d'action** de la scène, mais qui n'y parlent pas et ne sont pas déjà muets.
- Recherche du nom : mot entier, sans tenir compte des majuscules ni des accents (« Léa » trouve LÉA).
- Chaque suggestion a un bouton **+** qui l'ajoute aux muets (même action que l'ajout à la main, annulable). Rien n'est ajouté automatiquement ; les suggestions ne sont pas enregistrées.
- Calcul pur, testé, à côté du dépouillement existant.

**Critères de validation**

- [ ] Une scène où l'action cite « Paul entre » sans dialogue de PAUL : PAUL est proposé ; un clic l'ajoute aux muets, il disparaît des suggestions.
- [ ] Un personnage qui parle dans la scène n'est jamais proposé.
- [ ] Pas de faux positif sur une partie de mot (« Paul » ne trouve pas « Paulette »).

## 18C-6 — Plan de tournage : interprètes ajoutés par jour

**À faire**

- Dans la fiche d'un jour de tournage : rubrique **« Présents en plus »** — une liste de lignes libres (nom + rôle facultatif, ex. « Marc — figurant ») ajoutées à la main, modifiables et supprimables. Pour les figurants, doublures, interprètes sans fiche…
- Enregistré dans le planning, dans le jour (`ShootingDay`, nouveau champ facultatif). Un ancien fichier sans ce champ s'ouvre sans erreur.
- Affiché dans la colonne du jour avec les interprètes calculés (marqué à part), et dans les exports du plan de tournage (PDF ; `.ics` : dans la description).

**Critères de validation**

- [ ] J'ajoute « Marc — figurant » au jour 2 : visible dans la colonne, dans le PDF du plan de tournage et dans l'`.ics`.
- [ ] Après redémarrage, la ligne est toujours là ; un ancien projet s'ouvre sans changement.
- [ ] Ajout, modification et suppression sont annulables comme les autres actions du planning.

---

## Fin du lot

- Suite complète des tests et lint verts, sur les trois systèmes (`verification.yml`).
- `etat-du-projet.md` : lot 2 terminé, prochaine sous-étape 18D. Ajouter les cases du lot 2 à la future liste `essais-mac.md` (18D).
- Version de publication : `0.2.0` conseillée, puisque le lot 2 est dedans (décision de David en 18G).
