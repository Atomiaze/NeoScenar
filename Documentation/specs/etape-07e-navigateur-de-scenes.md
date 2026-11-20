# Étape 7E — Navigateur de scènes

Complète la section 6 de `etape-07-editeur-de-scenario.md`. En cas de différence, cette spécification fait foi.

## Objectif

Afficher à gauche de l'éditeur un **navigateur de scènes** comme celui de KIT Scenarist. Il montre la structure du scénario (actes, scènes), permet d'y aller d'un clic et de modifier la description (synopsis) de la scène courante.

Le navigateur est **entièrement dérivé du texte Fountain**. Il ne stocke rien et ne crée aucun fichier. La seule modification qu'il fait est la description, et il l'écrit directement dans le texte de l'éditeur.

Pas de plan préalable à présenter : la sous-étape est courte. Si quelque chose te bloque ou contredit ce qui existe déjà, demande à David avant de choisir.

## 1. Réutiliser l'existant, ne rien dupliquer

- Analyse : `packages/fountain` (`getScenes`, sections, notes, synopsis).
- **Numéro de scène** : la même fonction que celle de la marge de l'éditeur (numéro forcé `#…#`, sinon numérotation continue). Le navigateur et la marge doivent toujours afficher le même numéro.
- **Durées** : les fonctions de durée de la sous-étape A (une page ≈ une minute, au prorata des lignes).
- **Couleurs des actes** : la même attribution que les bandeaux de l'éditeur. Un acte a la même couleur dans les deux.

## 2. Construction de l'arbre (fonction pure, testée)

Écrire une fonction pure (par exemple `buildNavigator(document, pagination)`) qui renvoie l'arbre affiché.

- **Sections** `#`, `##`, `###` : des nœuds imbriqués selon leur niveau. Un `##` placé après un `#` est son enfant. Une section ferme toutes les sections ouvertes de niveau égal ou inférieur.
- **Scènes** placées avant la première section : au premier niveau, sans acte.
- **Texte placé avant le premier en-tête** (une action d'ouverture, par exemple) : il n'apparaît pas dans le navigateur.
- **Une section sans scène** apparaît quand même, avec une durée de 0:00.
- Pour chaque **scène** :
  - son numéro et son en-tête complet, sans les marqueurs de forçage ni le `#…#` ;
  - sa durée ;
  - la **première ligne** : le texte du premier élément qui n'est ni un synopsis ni une note (action, personnage, dialogue…), sans marqueurs de forçage ni de mise en forme, et avec les notes `[[…]]` retirées. Si la scène n'a rien de tel, la première ligne est vide ;
  - **contient une note** : vrai si un `[[…]]` apparaît n'importe où dans la scène, y compris dans l'en-tête. Le texte mis de côté `/* … */` ne compte pas ;
  - sa position dans le texte, pour y aller.
- Pour chaque **section** : son titre, son niveau, sa couleur, sa durée (la somme de ses scènes et de ses sous-sections), et « contient une note » (vrai si la ligne de section ou l'un de ses descendants en contient une).
- En haut : le **nombre de scènes** et la **durée totale**.

## 3. Affichage

- Le panneau se trouve entre la barre de modules et l'éditeur. Sa largeur est fixe (environ 260 px), il utilise la police de l'interface et non Courier, et il suit le thème de l'application.
- En haut : « Scènes : 9 · 12:30 ».
- **Acte** : un petit triangle pour replier, le bandeau de la couleur de l'acte avec son titre, et la durée alignée à droite. Les sous-sections sont en retrait.
- **Scène** : une icône (elle devient **rouge** s'il y a une note), le numéro, l'en-tête en majuscules coupé par « … » s'il est trop long, et la durée à droite. Dessous, la première ligne en plus petit et en gris, sur une seule ligne coupée par « … ». Au survol, une bulle montre l'en-tête et la première ligne en entier.
- **Format des durées** : `m:ss` (0:08, 1:30, 12:30). Au-delà d'une heure : `h:mm:ss`.
- Scénario sans scène : le message « Aucune scène pour l'instant. Cmd + Entrée pour écrire un en-tête. »
- Le panneau se met à jour pendant la frappe, au même rythme que l'analyse (regroupée). La frappe doit rester parfaitement fluide sur 120 pages, soit environ 150 scènes.

## 4. Scène courante et navigation

- Il n'y a **qu'une seule notion de scène sélectionnée : celle où se trouve le curseur**. Elle est mise en évidence dans le navigateur.
- Si cette scène est dans un acte replié, c'est l'acte qui est mis en évidence.
- Quand la scène courante change, le navigateur défile pour la garder visible, seulement si elle ne l'est pas déjà.
- **Clic sur une scène** : l'éditeur défile pour placer l'en-tête près du haut de la zone visible, le curseur se met au début de la ligne qui suit l'en-tête, et l'éditeur reprend le focus pour qu'on puisse taper aussitôt.
- **Clic sur un acte** : même chose, sur la ligne de section. Le triangle replie ou déplie sans déplacer le curseur.
- **Clavier**, quand le navigateur a le focus : `↑` et `↓` changent de ligne, `Entrée` va à la scène, `←` et `→` replient ou déplient un acte.
- Les actes repliés restent repliés pendant la session. Ils ne sont pas mémorisés d'une ouverture à l'autre.

## 5. Description (synopsis)

En bas du panneau, un champ **Description** sur plusieurs lignes affiche le synopsis de la scène courante, ou de l'acte courant si le curseur est sur une ligne de section.

**Lecture** : le synopsis d'une scène est formé des lignes `=` qui suivent directement son en-tête, avant tout autre élément. Les lignes vides et les notes entre elles sont ignorées. Une ligne `=` correspond à une ligne du champ. Pour un acte, la règle est la même, appliquée à la ligne de section.

**Écriture** (fonction pure, testée, par exemple `setSynopsis(texte, position, description)`, qui renvoie la modification à appliquer) :

- si le synopsis existe, ses lignes `=` sont remplacées ;
- sinon, les lignes sont insérées juste après l'en-tête, avec une ligne vide avant et une ligne vide après :

  ```
  INT. CUISINE - JOUR

  = Élodie apprend la nouvelle.

  Élodie entre.
  ```

- chaque ligne non vide du champ devient une ligne `= texte`, et les lignes vides du champ sont ignorées ;
- une description vidée supprime les lignes `=` et la ligne vide en trop. Le texte revient alors exactement à son état sans synopsis ;
- **garantie** : le reste de la scène est relu par `packages/fountain` exactement comme avant (mêmes types d'éléments).

**Comportement** :

- Le texte du scénario se met à jour au fil de la frappe, de façon regroupée : l'éditeur montre le synopsis en italique grisé sous l'en-tête en même temps qu'on l'écrit.
- Toute une séance de modification, de l'entrée dans le champ jusqu'à la sortie, compte pour **une seule étape d'annulation** dans l'historique de l'éditeur.
- Avant la première scène, ou quand il n'y a aucune scène, le champ est désactivé et affiche « Placez le curseur dans une scène ».

## 6. Repli du panneau

- Un bouton en haut du panneau, et l'entrée de menu **Présentation > Navigateur de scènes**, avec une coche, pour afficher ou masquer le panneau.
- L'état est mémorisé dans les préférences de l'application, pas dans le projet.
- Pas de raccourci clavier pour l'instant, pour éviter les collisions avec les raccourcis de KIT. Si tu en proposes un, vérifie qu'il est libre sur macOS et dans l'éditeur.
- Le mode concentration (sous-étape G) masquera aussi ce panneau. Prévois simplement qu'il puisse être masqué depuis l'extérieur.

## Hors périmètre

- Glisser-déposer de scènes, couleurs d'actes choisies par l'élève.
- Durée du découpage à côté de la durée estimée, et numéros S_0010 (étape 8).
- Mode plan de KIT (affichage réduit dans l'éditeur).
- Bandeaux « FIN DE … » dans le navigateur : ils restent dans l'éditeur seulement.

## Tests automatiques attendus

- Arbre : imbrication `#`, `##`, `###`, fermeture des sections, scènes avant le premier acte, section sans scène, texte avant le premier en-tête ignoré.
- Numéros identiques à ceux de la marge, y compris avec des numéros forcés mélangés à des numéros continus.
- Durées : par scène, la somme par acte (sous-sections comprises), le total, et le format `m:ss` et `h:mm:ss`.
- Première ligne : marqueurs, mise en forme et notes retirés ; scène dont le premier élément est un personnage ; scène vide.
- « Contient une note » : note dans l'action, dans l'en-tête, dans un dialogue ; remontée vers l'acte ; `/* */` ignoré.
- Synopsis : lecture (une ou plusieurs lignes, notes intercalées), ajout, remplacement, suppression qui revient au texte d'origine. Le reste de la scène est relu à l'identique dans tous les cas, y compris quand la scène commence par un personnage.
- Le scénario d'exemple de l'étape 6 donne un arbre stable (test d'instantané).

## Critères de validation (à vérifier par David)

- [ ] Le panneau affiche « Scènes : N · durée », les actes en bandeaux de la même couleur que dans l'éditeur, les scènes avec numéro, en-tête, durée et première ligne.
- [ ] Les numéros du navigateur sont les mêmes que ceux de la marge de l'éditeur.
- [ ] Ajouter une note `[[ … ]]` dans une scène : l'icône de la scène et celle de son acte deviennent rouges.
- [ ] Un clic sur une scène y amène et on peut taper aussitôt ; en déplaçant le curseur dans l'éditeur, la mise en évidence suit.
- [ ] Replier un acte, puis taper dans une de ses scènes : l'acte est mis en évidence.
- [ ] Écrire une description en bas : elle apparaît en italique grisé sous l'en-tête pendant la frappe. `Cmd + Z` dans l'éditeur l'annule en une fois. La vider la fait disparaître du texte.
- [ ] Ouvrir `scenario.fountain` dans un éditeur de texte : le synopsis est en lignes `= …` juste sous l'en-tête.
- [ ] Le panneau se masque et se réaffiche (bouton et menu Présentation), et l'état est retrouvé au redémarrage.
- [ ] Frappe fluide sur un scénario de 120 pages.
- [ ] `npm test` et `npm run lint` passent.

À la fin, résume ce qui a été fait, signale tout écart et toute décision prise seul, puis attends l'accord de David avant le commit.
