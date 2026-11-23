# Étape 18 — lot 4 : navigateur de scènes (23 nov. 2026)

Deux ajouts au module Scénario, avant 18E. Une sous-étape chacun, dans cet ordre.

## 18C-12 — Déplacer les scènes dans le navigateur

- Glisser-déposer d'une scène dans le navigateur de scènes (panneau de gauche). Repère d'insertion visible pendant le glissement.
- Le bloc entier de la scène (en-tête, synopsis, texte, jusqu'à la scène suivante) est déplacé dans le Fountain. **Réutiliser la logique des Cartes** (`moveSceneBlock`, `src/shared/scriptLink/`) : mêmes règles de numérotation et de rapprochement que quand on déplace une carte. L'ordre des cartes suit donc tout seul.
- Une scène peut changer d'acte (être déposée sous une autre section).
- Une seule étape d'annulation (Cmd + Z dans l'éditeur).
- Critères : ordre identique dans l'éditeur, le navigateur et les Cartes ; numéros S_00xx cohérents avec un déplacement fait depuis les Cartes ; aucune carte orpheline créée ; marques de révision et synopsis déplacés avec la scène.

## 18C-13 — Scène « brouillon »

- **Clic droit** sur une scène du navigateur : « Marquer comme brouillon » / « Retirer le statut brouillon ». Même réglage sur la carte (menu ou case dans le panneau de détail).
- **Enregistrement dans le Fountain** : une note `[[BROUILLON]]` seule sur la ligne juste sous l'en-tête. Fichier toujours lisible ailleurs (Obsidian), et le statut suit la scène quand on la déplace. Lecture tolérante (casse, espaces).
- **Repère visuel** : scène grisée + étiquette « Brouillon » dans le navigateur et sur la carte.
- **Absente de l'éditeur** (décision de David) : une scène brouillon n'apparaît pas du tout dans l'éditeur. Elle reste dans le Fountain, mais elle est masquée et non paginée. Le curseur, la sélection et la suppression ne peuvent pas l'entamer (plage atomique). La page à l'écran = le PDF.
- **Fenêtre d'édition** : on la modifie dans une petite fenêtre, ouverte depuis le navigateur (double-clic ou clic droit > « Modifier le brouillon… ») ou depuis la carte. La fenêtre a le même éditeur de scénario (éléments, raccourcis, propositions, Entrée / Tab) limité au texte de cette scène. Boutons Valider / Annuler. Valider = une seule étape d'annulation dans l'éditeur principal.
- **Décidé par David (corrigé le 23 nov.)** : la recherche (⌘ + F) trouve aussi le texte des scènes brouillon ; un résultat dans un brouillon est signalé (la scène n'est pas à l'écran) et sa fenêtre d'édition est proposée. Le panneau des révisions ne montre pas leurs marques (les marques restent dans le fichier).
- **Hors du PDF et des comptes** : ni imprimée, ni comptée dans les pages et la durée (compteur du haut, navigateur, statistiques). Son numéro reste réservé (pas de renumérotation).
- **Pagination** : les scènes brouillon sont retirées *avant* l'appel à la pagination partagée (`packages/fountain`), qui n'est pas modifiée. Sans scène brouillon, résultat strictement identique à aujourd'hui (PDF de référence de KIT).
- **Décidé par David (23 nov.)** : gardées dans le storyboard et le plan de tournage, avec l'étiquette « Brouillon ». Les statistiques ne les comptent pas (scènes, personnages, lieux).
- Annulable (Cmd + Z), une seule étape.
- Ajouter une ligne dans l'aide (onglet « Autres éléments » ou « Numéros »).
