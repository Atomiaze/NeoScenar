# Étape 10b — Générique (fin + cartons de début)

Référence : cahier des charges, section 4.1. Décisions du 18 novembre 2026.

## Sous-étapes

| | Contenu | Modèle conseillé |
|---|---|---|
| 10bA | Modèle Saint Luc + `generique.json` + assemblage + export texte brut | Opus |
| 10bB | Interface de saisie dans Recherches | Sonnet |
| 10bC | Mise en page, aperçu, export PNG (déroulant de fin + cartons de début) | Opus |

Une sous-étape = plan court, réalisation, essais, accord de David, commit, `/clear`.

## Décisions

- **Portée** : déroulant de fin + quelques cartons de début fixes, calculés à partir des mêmes données (aucune saisie en plus).
- **Fichier** : `neoscenar/generique.json` (comme `projet.json`), avec `version`. Les clés inconnues sont conservées à la réécriture. Logos copiés dans `neoscenar/generique/logos/`.
- **Modèle Saint Luc complet** : toutes les rubriques du modèle de référence (12 blocs ci-dessous), dans l'ordre conventionnel. Les rubriques vides ne sont jamais exportées. Le modèle est un fichier JSON modifiable par l'enseignant, distribué comme le modèle de dossiers de l'étape 1. Il peut fournir des valeurs par défaut (nom de l'école, logo de l'école, ligne « Réalisé à l'IES Saint Luc Liège — année scolaire … »).
- **Blocs facultatifs** (Animation, Documentaire et archives) : masqués sauf si le type de projet est Animation ou Mixte (Animation) ou si l'élève les affiche (case « Afficher »).
- **Acteurs** : repris des fiches Personnages (champ `interprete`). Ordre au choix de l'élève : *par importance* (principal → secondaire → figurants) ou *par ordre d'apparition* (première réplique dans le Fountain). Figurants regroupés sous « Figuration ». Personnage sans interprète : non exporté, signalé (« 3 personnages sans interprète »). Nom du personnage affiché en casse de titre (MARIE → Marie), corrigeable ; la correction est gardée dans `generique.json`, la fiche n'est pas touchée.
- **Titre du film** : celui de la page de titre du Fountain (`Title:`).
- **Pas d'outil de mise en forme** : deux choix seulement, *taille du texte* (petite / moyenne / grande) et *disposition* (deux colonnes poste | nom, ou centrée).
- **Deux exports au choix**, dans une même fenêtre « Exporter le générique… », vers `08_Graphisme/Generique/` (créé si besoin) :
  1. **PNG mis en page** : `generique_fin.png` (+ `debut_01_….png`), mise en page automatique de NeoScenar.
  2. **Texte brut** : `generique.txt` (UTF-8) + bouton « Copier », sans mise en forme, pour que l'élève fasse sa propre mise en page dans le logiciel de montage (Premiere Pro : texte « Défilement » ; DaVinci Resolve : Text+). Deux présentations : *intitulé au-dessus des noms*, ou *intitulé et nom sur la même ligne séparés par une tabulation* (pour les taquets de tabulation du logiciel de montage). Les cartons de début y sont repris en tête, séparés du déroulant.
- Un fichier du même nom est remplacé. Pas d'export vidéo.

## Modèle Saint Luc (blocs et rubriques)

1. **Distribution** : acteurs (automatique), Doublures et cascades, Voix / Narration, Figuration.
2. **Réalisation** : Réalisation, 1er assistant réalisateur, 2e et 3e assistants, Scripte, Coach d'acteurs, Chaperon.
3. **Production** : Production, Direction de production, Administration, Régie générale, Régisseurs, Assistants de production, Cantine, Chauffeurs.
4. **Image** : Directeur de la photographie, Cadre, 1er assistant opérateur, 2e assistant opérateur, Steadicam / Grue / Drone, Data manager, Photographe de plateau, Chef électricien, Électriciens, Chef machiniste, Machinistes.
5. **Son** : Ingénieur du son, Perchman, Renfort son.
6. **Décors et costumes** : Chef décorateur, Ensemblier, Accessoiristes, Construction, Costumes, Habilleuses, Maquillage et coiffure, Maquillage effets spéciaux.
7. **Animation** *(facultatif)* : Direction de l'animation, Storyboard, Layout, Modélisation, Rigging, Textures, Animation, Lighting et rendu, Compositing.
8. **Post-production** : Montage, Assistants monteurs, Étalonnage, Effets visuels, Génériques et titrages, Montage son, Design sonore, Bruitage, Mixage, Studio de post-production.
9. **Musique** : Musique originale, Musiciens, Supervision musicale, puis **musiques préexistantes** (fiche structurée : Titre, Interprété par, Écrit et composé par, Avec l'aimable autorisation de).
10. **Documentaire et archives** *(facultatif)* : Recherches et documentation, Intervenants, Images d'archives, Photographies, Traduction et sous-titres.
11. **Remerciements** : particuliers, institutions et lieux, partenaires et prêts de matériel.
12. **Mentions et logos** : Avec le soutien de, Tourné à, clause de fiction (case), « Aucun animal n'a été blessé » (case), © année + titulaire, logos (le logo de l'école en dernier).

- Une rubrique = un intitulé + une liste de noms (un nom par ligne). L'intitulé du modèle est modifiable (ex. « Image » au lieu de « Directeur de la photographie »).
- L'élève peut **ajouter une rubrique** à un bloc et la monter / descendre dans son bloc. Les rubriques du modèle ne se suppriment pas : vides, elles disparaissent de l'export.

## Cartons de début (cochés par l'élève, tous facultatifs)

Logos · « [Production] présente » · « Un film de [Réalisation] » · acteurs principaux · Titre · « Réalisé par [Réalisation] ». Un PNG par carton, au format du projet (`projet.json`), fond transparent.

## Structure de `generique.json` (indicative)

```json
{
  "version": 1,
  "modele": "saint-luc",
  "options": { "ordreActeurs": "importance", "taille": "moyenne", "disposition": "deux-colonnes", "blocsAffiches": ["animation"] },
  "acteurs": { "nomsAffiches": { "MARIE": "Marie" } },
  "rubriques": [ { "id": "image.chef-op", "intitule": null, "noms": ["Léa Dupont"] },
                 { "id": "perso-1", "bloc": "image", "intitule": "Lumière d'appoint", "noms": ["Tom"] } ],
  "musiques": [ { "titre": "", "interprete": "", "auteurs": "", "autorisation": "" } ],
  "mentions": { "fiction": true, "animaux": false, "copyrightAnnee": 2026, "copyrightTitulaire": "", "tourneA": "" },
  "logos": ["generique/logos/saint-luc.png"],
  "cartonsDebut": ["presente", "unFilmDe", "titre"]
}
```

`intitule: null` = intitulé du modèle. L'ordre vient du modèle ; seules les rubriques ajoutées portent leur position.

## 10bA — Moteur et export texte

- Modèle Saint Luc en JSON, lecture et écriture de `generique.json` (enregistrement sûr, inconnu conservé).
- **Assemblage** (module pur, dans `src/shared/`) : modèle + données + fiches personnages + Fountain → liste ordonnée de blocs / lignes et de cartons. Rien d'interface.
- Export texte brut (les deux présentations, voir Décisions) : intitulé en capitales, une ligne vide entre rubriques, deux entre blocs ; en présentation tabulée, un nom par ligne, l'intitulé seulement sur la première.

*Validé quand* : essai automatique sur le scénario d'exemple « Le Dernier Bus » avec fiches et interprètes : ordre par importance et par apparition corrects, rubriques vides absentes, personnages sans interprète signalés, une clé ajoutée à la main dans `generique.json` survit à une réécriture.

## 10bB — Interface

- Entrée **Générique** dans l'arbre de Recherches (sous Documents).
- Formulaire par blocs repliables ; noms en zone de texte (un par ligne) ; bouton « Ajouter une rubrique » par bloc ; flèches haut / bas pour les rubriques ajoutées.
- Bloc Distribution : liste lue des fiches (non modifiable ici, sauf le nom affiché), lien vers la fiche, avertissement des interprètes manquants, choix de l'ordre.
- Musiques préexistantes : fiches à 4 champs, ajout / suppression.
- Logos : glisser-déposer ou bouton, ordre modifiable, retrait (fichier gardé).
- Enregistrement automatique ; relecture au retour dans l'appli.

*Validé quand* : on remplit un générique, on ferme et rouvre le projet, tout est là ; un interprète ajouté dans une fiche apparaît dans le générique.

## 10bC — Mise en page et PNG

- Calcul de la mise en page = module pur testable (positions, tailles relatives à la largeur du projet : un projet 4K donne la même mise en page en plus grand). Dessin sur un canvas, police libre embarquée (OFL), texte blanc, fond transparent.
- Déroulant : largeur du projet, hauteur selon le contenu, sans marge d'écran en haut ni en bas.
- **Limite** : au-delà de 16 384 px de haut, message proposant une taille plus petite ou les deux colonnes ; sinon export en plusieurs parties coupées entre deux rubriques (`generique_fin_1.png`, `_2`…), à poser bout à bout.
- Fenêtre d'export : choix **PNG mis en page** / **Texte brut** ; pour le PNG, aperçu qui défile, choix taille / disposition, cartons de début à cocher, **durée conseillée** du défilement (une ligne traverse l'écran en 8 s environ).

*Validé quand* : le PNG s'importe dans DaVinci Resolve et Premiere Pro avec la transparence, défile proprement en animant la position, logos nets ; les cartons de début sont au format du projet.

## Hors de cette étape

Génériques animés, export vidéo, polices au choix, fusion de rubriques, export PDF du générique.
