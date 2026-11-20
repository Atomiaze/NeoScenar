# Étape 14 — Thèmes, couleurs du scénario, écran d'accueil

Rédigée le 19 novembre 2026. Trois sous-étapes, dans cet ordre. Pour chacune : plan court, réalisation, essais (outil de pilotage), accord de David, commit, mise à jour de `etat-du-projet.md`, `/clear`.

Règles communes (décidées le 19 nov.) :

- Les thèmes colorent **l'interface seulement**. Le contenu de l'élève ne change jamais : couleurs des cartes, page blanche de l'éditeur de dessin, vignettes, logos.
- **Les exports n'utilisent jamais le thème** : PDF du scénario et du storyboard, PNG du générique, export Blender. Un test le vérifie (PDF de « Le Dernier Bus » identique octet par octet avec le thème Matrix, à date fixée).
- À l'écran, la page du scénario suit le thème (fond et texte), mais reste en Courier et au format Final Draft A4. La pagination ne change pas (218/219 sur le scénario de référence de KIT).
- Tout est rangé dans les **préférences de l'application** (pas dans le projet) : le thème suit l'élève sur sa machine, pas le film.

---

## 14A — Moteur de thèmes (Sonnet)

1. **Inventaire** : relever toutes les couleurs écrites en dur dans `src/renderer/` (CSS, TSX, SVG des statistiques, CodeMirror) et les remplacer par des variables CSS (`--ns-fond`, `--ns-texte`, `--ns-accent`, `--ns-page-fond`, `--ns-page-texte`…). Un petit script de développement liste les couleurs restantes hors des fichiers de thèmes ; les exceptions voulues (palette des cartes, éditeur de dessin, palette des marques de révision) sont listées dans le script.
2. **Sept thèmes**, définis dans un seul fichier pur `src/shared/themes/themes.ts` (un objet par thème, mêmes clés) :

| Thème | Ton | Idée de couleurs (à ajuster) |
|---|---|---|
| Par défaut | l'actuel | inchangé, extrait tel quel |
| Cobalt | sombre | bleu nuit, accent jaune |
| Or | sombre | noir chaud, accent or |
| Matrix | sombre | noir, texte et accent vert |
| PinkLady | clair | rose très pâle, accent framboise |
| Forest | sombre | vert forêt, accent vert mousse |
| Aqua | clair | blanc bleuté, accent turquoise |

3. **Lisibilité** : un test calcule le contraste (formule WCAG) de chaque thème : texte de l'interface et texte de la page ≥ 7:1 sur leur fond, texte secondaire et accent ≥ 4,5:1.
4. **Choix** : liste « Thème » dans « Réglages… », appliqué tout de suite, sans redémarrage, à toutes les fenêtres ouvertes (y compris les fenêtres d'export, de versions…). `nativeTheme.themeSource` passe à `dark` ou `light` selon le ton, pour les barres de défilement et les fenêtres du système.

*Validé quand* : les 7 thèmes s'appliquent à chaque module sans couleur oubliée (le script ne liste plus que les exceptions) ; les cartes et le dessin gardent leurs couleurs ; le test du PDF identique passe.

---

## 14B — Couleurs des éléments du scénario (Sonnet)

1. **Éléments réglables**, à l'écran seulement : en-tête de scène, personnage, dialogue, didascalie, transition, notes `[[ ]]` (vert par défaut), bandeaux d'actes (fond et texte), numéro de scène et numéro de page dans la marge, traits de page, ligne du curseur, sélection.
2. **Par thème** (décidé le 19 nov.) : chaque thème fournit ses couleurs par défaut, et les réglages de l'élève sont gardés thème par thème. Seules les différences sont écrites dans les préférences (`scriptColors: { <thème>: { <élément>: "#rrggbb" } }`).
3. **Interface** : section « Couleurs du scénario » dans « Réglages… » : un sélecteur par élément, avec un petit extrait de scénario en aperçu en direct. Bouton « Couleurs d'origine du thème ». Si une couleur passe sous 4,5:1 sur le fond de la page, un avertissement s'affiche, sans bloquer le choix.
4. Les couleurs des marques de révision (jaune, vert, rose, bleu) ne sont pas réglables : chaque thème en donne une teinte lisible, qui garde le même nom.

*Validé quand* : changer une couleur dans Matrix ne change rien dans Cobalt ; « Couleurs d'origine » remet le thème ; le PDF ne change pas.

---

## 14C — Écran d'accueil (Sonnet)

Maquette : capture fournie par David, non publiée (esprit de l'écran de démarrage de Blender).

1. **Deux colonnes** : à gauche un visuel, à droite le contenu actuel de l'accueil, disposé comme sur la maquette :
   - « NeoScenar » en grand, avec la couleur d'accent, et « Version x.y.z » à côté (lue dans `package.json`) ;
   - « Bienvenue ! », « NeoScenar vous accompagne », puis la liste en accent : dans votre planification / dans l'écriture de votre scénario / dans votre découpage technique / dans la réalisation de votre storyboard / dans la centralisation de vos données / dans la création de votre générique ;
   - boutons « Nouveau projet… » (plein, accent) et « Ouvrir un projet… » (contour) ;
   - « Projets récents » : nom en gras, chemin en dessous, « Ouvert le … à … » à droite, bouton × à part pour retirer de la liste (le projet n'est pas supprimé).
2. **Visuel de gauche** : image par défaut `resources/accueil/visuel-accueil.jpg`. Provisoirement, la moitié gauche de la maquette, recadrée par Claude Code ; David la remplacera par le fichier définitif. Elle remplit la colonne sans être déformée (recadrée au besoin, centrée). Dans « Réglages… », « Image d'accueil : Choisir… / Image d'origine » : l'image choisie est copiée dans les données de l'application, jamais lue à son emplacement d'origine.
3. Les couleurs de la colonne de droite suivent le thème ; le visuel ne change jamais.
4. Fenêtre étroite (moins de 900 px de large) : le visuel disparaît, la colonne de droite prend toute la largeur.

*Validé quand* : l'accueil ressemble à la maquette dans le thème Par défaut et reste lisible dans les 7 thèmes ; changer d'image puis revenir à l'image d'origine fonctionne ; ouvrir un projet récent et le retirer de la liste fonctionnent comme avant.
