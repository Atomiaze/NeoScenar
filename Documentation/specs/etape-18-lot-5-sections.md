# Étape 18 — lot 5 : sections dans le navigateur (25 nov. 2026)

Sections Fountain (`#`, `##`, `###`) gérées depuis le navigateur de scènes du Scénario. **Pas de sections dans les Cartes.** Trois sous-étapes, dans cet ordre. Un commit par sous-étape, après accord de David.

Règles communes :
- Le Fountain reste la source de vérité : tout est écrit dans `scenario.fountain`, lisible ailleurs (Obsidian).
- Chaque action = **une seule étape d'annulation** de l'éditeur (Cmd + Z).
- Sans section colorée ni modifiée, texte, pagination, PDF et statistiques strictement identiques à aujourd'hui.
- Sections jamais imprimées (inchangé).
- Profondeur maximale : 3 niveaux (`###`).

## 18C-14 — Couleur d'une section

- Clic droit sur une section du navigateur > « Couleur » : même palette que les plans et scènes (`CARD_PALETTE`), plus « Automatique ».
- **Enregistrement (confirmé par David, 25 nov.)** : note `[[COULEUR #2463EB]]` seule sur la ligne juste sous la ligne de section (avant le synopsis `=` s'il y en a). Même principe que `[[BROUILLON]]` : lecture tolérante (casse, espaces, `:` facultatif, hex en 3 ou 6 chiffres) ; couleur illisible = Automatique. « Automatique » retire la note. **Écriture toujours juste sous la ligne `#`, hex en majuscules** (lecture tolérante aussi après le synopsis).
- Masquée dans l'éditeur comme `[[BROUILLON]]` (bloc atomique), **seulement si elle est juste sous une ligne de section** ; ailleurs (ligne `#` effacée à la main…), c'est une note ordinaire, affichée. Jamais imprimée.
- `sectionColorsOf` reste la seule source : couleur choisie si note, sinon rotation actuelle. **La rotation compte toutes les sections**, colorées ou non : colorer un acte ne change pas la couleur automatique des autres.
- Même couleur partout : bandeaux de l'éditeur, navigateur, Statistiques.
- Critères : couleur gardée après fermeture et réouverture du projet ; note suit la section quand on la déplace (18C-16) ; texte de la section dans Obsidian intact ; 7 thèmes : titre du bandeau lisible (contraste ≥ 4,5, texte foncé ou blanc comme sur les cartes).

## 18C-15 — Ajouter, renommer, supprimer, imbriquer

Renommer, Supprimer et « + Section » confirmés par David (25 nov.).

- **Ajouter** : clic droit sur une scène ou une section > « Insérer une section au-dessus… » ; bouton « + Section » en bas du navigateur (ajoute à la fin). Petite fenêtre : titre (obligatoire). Niveau = celui de la section qui contient l'endroit, ou 1 si aucune. La ligne est écrite avec une ligne vide avant et après.
- **Renommer** : double-clic ou clic droit > « Renommer… » (même fenêtre).
- **Supprimer** : clic droit > « Supprimer la section » : seules la ligne de section, sa note de couleur et son synopsis sont retirés ; **les scènes restent** (elles remontent dans la section précédente). Confirmation si la section a un synopsis.
- **Imbriquer / Désimbriquer** : clic droit, et boutons → / ← dans la ligne au survol. Imbriquer = un `#` de plus, refusé pour la première section ou si on dépasse 3 niveaux ; désimbriquer = un `#` de moins, refusé au niveau 1. **Les sous-sections suivent** (leur niveau bouge d'autant).
- Aucun numéro de scène ne change, aucune carte touchée.
- Critères : arbre du navigateur, bandeaux « FIN DE … » et durées des actes justes après chaque action ; Statistiques identiques au navigateur.

## 18C-16 — Déplacer une section avec ses scènes

- Glisser-déposer d'une section dans le navigateur : tout son bloc bouge (ligne, note, synopsis, scènes, sous-sections, jusqu'à la prochaine section de même niveau ou supérieur). Mêmes repères que 18C-12.
- **Places permises (décision de David, 25 nov.)** : seulement juste au-dessus d'une ligne de section, ou tout en bas. Ailleurs (entre deux scènes, sous une ligne de section), la section avalerait les scènes qui la suivent : repère rouge, refus.
- **Niveau (décision de David, 25 nov.)** : au-dessus d'une section, elle prend le niveau de cette section (elle devient sa sœur ; au-dessus de la première sous-section d'un acte, elle devient donc sous-section de cet acte) ; tout en bas, niveau 1 (nouvel acte à la fin). Ses sous-sections sont décalées d'autant ; refus si ça dépasse 3 niveaux.
- Interdit de déposer une section dans elle-même ou une de ses sous-sections (repère rouge, refus). Dépôt à sa propre place (même place, même niveau) : rien, aucune étape d'annulation.
- **Numérotation : réutiliser le chemin de 18C-12** (`moveScenes`, plusieurs scènes qui se suivent, pour la vérification, `input.drop`, rapprochement dans la même étape) : refus si numéros verrouillés, question « Renuméroter ? », aucune carte orpheline créée. Brouillons, marques de révision et synopsis suivent.
- **Rapprochement après un dépôt (`input.drop` seulement)** : les scènes qui n'ont pas bougé gardent leur numéro, seules celles du bloc déplacé sont renumérotées (sans cette règle, un bloc de 3 scènes faisait renuméroter les 2 autres). Hors navigateur (texte modifié ailleurs, collage), rien ne change.
- Critères : ordre identique éditeur / navigateur / Cartes ; numéros identiques à ceux qu'aurait donnés le déplacement des mêmes scènes depuis les Cartes ; glissé rapide sûr ; une seule étape d'annulation.

## Aide

Mettre à jour l'onglet du Scénario qui parle des actes (`aide-scenario.md` puis `fr.ts`) à la fin de 18C-16. Y dire aussi (décision de David, 25 nov.) : **dans les Statistiques, seules les sections `#` sont des actes** ; une scène sous un `##` sans `#` au-dessus y est « Hors acte ». Cases d'essai dans `essais-mac.md` (section 14).
