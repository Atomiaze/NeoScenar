# Aide — Module Scénario

*Brouillon du texte de la fenêtre « Aide ». Sur Windows et Linux, remplacer ⌘ par Ctrl.*

---

## 1. Les six éléments principaux

Un scénario s'écrit avec six éléments. Chacun a un raccourci et un bouton dans la barre des éléments, à gauche de la page.

| Élément | Raccourci | À quoi il sert |
|---|---|---|
| En-tête de scène | ⌘ + Entrée | Ouvre une nouvelle scène : intérieur ou extérieur, lieu, moment. |
| Action | ⌘ + J | Ce que l'on voit et ce que l'on entend. |
| Personnage | ⌘ + U | Le nom de celui qui parle, au-dessus de sa réplique. |
| Didascalie | ⌘ + H | Une courte indication de jeu, entre parenthèses, sous le nom. |
| Dialogue | ⌘ + L | Ce que dit le personnage. |
| Transition | ⌘ + G | Le passage d'une scène à l'autre (CUT, FONDU AU NOIR…). |

Le bouton de l'élément où se trouve le curseur est allumé. Le raccourci change le type de la ligne en cours.

## 2. Écrire au clavier

Avec Entrée et Tab, on enchaîne les éléments sans toucher à la souris :

| Vous êtes dans… | Entrée donne… | Tab donne… |
|---|---|---|
| En-tête de scène | Action | Action |
| Action | Action | Personnage |
| Personnage | Dialogue | Didascalie (ligne vide) ou Dialogue |
| Didascalie | Dialogue | Dialogue |
| Dialogue | Action | Didascalie (ligne vide) ou Personnage |
| Transition | En-tête de scène | En-tête de scène |

- **Maj + Entrée** : va à la ligne sans changer d'élément.
- **Propositions** : en tapant un en-tête ou un nom de personnage, NeoScenar propose ceux qui existent déjà. **Tab** accepte une proposition, **Échap** garde ce que vous avez tapé.
- Le scénario s'enregistre tout seul : pas de bouton « Enregistrer ».

## 3. Bien rédiger

- **En-tête de scène** : `INT.` ou `EXT.`, le lieu, un tiret entouré d'espaces (` - `), le moment. Exemple : `INT. CUISINE - NUIT`. Gardez toujours le même nom pour un même lieu.
- **Action** : au présent, courte, et seulement ce que la caméra peut montrer ou le micro enregistrer. Pas de pensées ni d'explications.
- **Personnage** : son nom s'écrit en majuscules, toujours le même nom. Extensions possibles entre parenthèses :
  - `(V.O.)` : voix off, le personnage n'est pas dans le lieu (narrateur, souvenir, pensée) ;
  - `(O.S.)` ou `(O.C.)` : le personnage est dans le lieu mais hors du cadre ;
  - `(SOUS-TITRE)` : la réplique est sous-titrée ;
  - `(SUITE)` : le personnage reprend sa réplique, interrompue par une action.
- **Didascalie** : quelques mots seulement (« en chuchotant », « à Marc »). Si c'est plus long, c'est une action.
- **Transition** : à utiliser rarement, quand le passage compte vraiment pour le récit.

Repère : une page de scénario correspond à environ une minute de film. Le compteur en haut de l'écran donne la page et la durée estimée.

## 4. Les autres éléments

Les six boutons du bas de la barre des éléments :

| Élément | Comment l'écrire | À quoi il sert |
|---|---|---|
| Paroles | `~` en début de ligne | Une chanson chantée par un personnage. |
| Texte non imprimable | `[[ texte ]]` | Une note pour vous : visible à l'écran, jamais imprimée. |
| Section | `#` en début de ligne | Découpe le scénario en actes ou en séquences. Un bandeau « FIN DE… » marque la fin de chaque section à l'écran. Jamais imprimée. |
| Synopsis | `=` en début de ligne | Résume la scène en une phrase, sous l'en-tête. Jamais imprimé. C'est aussi la **description de la carte** de la scène : écrire dans l'un modifie l'autre. Il apparaît dans le navigateur de scènes. Pratique pour écrire d'abord une ligne par scène, puis les rédiger. |
| Texte centré | `> texte <` | Un texte qui ressort, centré sur la page : FIN, un carton (« TROIS ANS PLUS TARD »), un titre de partie. À ne pas utiliser pour mettre une action en valeur. |
| Saut de page | `===` | Commence une nouvelle page à l'impression. |

## 5. Mise en forme

| Action | Raccourci |
|---|---|
| Gras | ⌘ + B |
| Italique | ⌘ + I |
| Souligné | ⌘ + Maj + U |
| Passer en majuscules / en minuscules | ⌘ + ↑ / ⌘ + ↓ |
| Rechercher dans le scénario | ⌘ + F |
| Mode concentration (page seule, plein écran) | F5 (Échap pour sortir) |

## 6. Dialogues simultanés

Quand deux personnages parlent en même temps, ajoutez `^` à la fin du nom du **second** personnage :

```
JULIE
Tu m'écoutes ?

MARC ^
Non, toi écoute-moi !
```

À l'écran, les deux répliques s'affichent l'une sous l'autre, reliées par une barre, avec le mot « simultané » dans la marge. Le `^` n'est pas imprimé.

## 7. Numéros de scène

Chaque scène porte un numéro (S_0010, S_0020…), le même dans le scénario, les cartes, le PDF et Blender. C'est lui qui relie une scène à sa carte. **Ne le modifiez pas à la main** : NeoScenar s'en occupe.

Pour **déplacer une scène**, faites-la glisser dans le navigateur de scènes, à gauche. Tout son texte la suit, elle peut changer d'acte, et sa carte change de place. Cmd + Z annule.

## 8. Le mode Révision

**À quoi il sert.** Une fois le premier jet écrit, on relit le scénario pour repérer ce qu'il faut reprendre : un dialogue trop long, une action pas claire, une remarque du professeur. Le mode Révision permet de surligner ces passages et d'y ajouter un commentaire, sans toucher au texte. Les marques ne sont **jamais imprimées** et ne changent ni la pagination ni la durée.

**Comment l'utiliser.**

1. Cliquez sur **Révision** : la palette de révision s'affiche.
2. Sélectionnez le texte à reprendre, puis cliquez sur une couleur : jaune, vert, rose ou bleu. On ne peut surligner que de l'action, du dialogue ou une didascalie.
3. Pour ajouter un commentaire, placez le curseur dans le texte surligné et cliquez sur **Commentaire…** (ou faites un clic droit). Maj + Entrée pour aller à la ligne. Le commentaire s'affiche au survol du texte surligné.
4. Le **panneau Révisions**, à droite, liste toutes les marques. Un clic sur une ligne amène au texte. Sur chaque ligne, on peut :
   - modifier le commentaire (crayon) ;
   - changer la couleur (clic sur la pastille) ;
   - effacer la marque (poubelle).
5. Les **pastilles en haut du panneau** filtrent la liste par couleur. Alt + clic (Option sur Mac) n'affiche que cette couleur ; un second Alt + clic les rallume toutes.
6. Une fois le passage corrigé, effacez sa marque. **Effacer toutes les marques** retire tout d'un coup : le texte reste identique.

Toutes ces actions s'annulent avec ⌘ + Z. Le bouton Afficher / Masquer de la palette range le panneau quand on veut plus de place.

**Une idée de code couleur** (à choisir en équipe) : jaune = à réécrire, rose = à couper, vert = idée à garder ou à développer, bleu = remarque du professeur.

**Bon à savoir.** Les marques sont enregistrées dans le fichier `scenario.fountain` comme des notes. Ouvert dans un autre logiciel (Obsidian, par exemple), il les montre sous la forme `[[R:jaune|commentaire]]texte[[/R]]`.
