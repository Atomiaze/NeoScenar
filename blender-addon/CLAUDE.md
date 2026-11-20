# Extension Blender « Storyboard – Gestion des plans » — consignes pour Claude Code

Ce dossier contient l'extension Blender de David (`storyboard_plans/`), qui importe les découpages exportés par NeoScenar. Les consignes générales du dépôt (`../CLAUDE.md`) s'appliquent aussi : réponses en français, plan avant une tâche importante, questions plutôt qu'inventions, travail limité à l'étape demandée.

## Cible

- **Blender 4.5 LTS uniquement** : API Python de Blender 4.5, format « extension » (`blender_manifest.toml`), pas l'ancien `bl_info`.
- Format d'échange lu depuis NeoScenar : `../Documentation/specs/format-echange-blender.md`.

## Principe essentiel

Des élèves ont des projets en cours (noms `Plan_0010`). **Tout ce qui marche aujourd'hui doit continuer de marcher à l'identique.** Les tests de `tests/test_plan_mode.py` décrivent ce comportement : ils ne doivent jamais être affaiblis pour faire passer une modification.

## Conventions du code existant

- Interface et messages entièrement en français.
- Fonctions partagées centralisées dans `utils.py` (identification des scènes, noms des plans, strips, durées). L'analyse et la fabrication des noms de plans n'existent **qu'à un seul endroit** : aucune expression régulière de nom ailleurs.
- Erreur prévisible : `utils.SBError("message en français")`, attrapée par l'opérateur et affichée avec `self.report`.
- L'extension ne supprime jamais un plan.
- Les opérateurs restent minces : la logique va dans `utils.py` (testable sans interface).
- Code Python : noms en anglais, commentaires en français.

## Tests

Lancés par Blender lui-même, en arrière-plan, avec l'extension chargée depuis ce dossier (et non celle installée dans Blender) :

```
npm run test:addon
npm run test:addon -- --blender "/Applications/Blender.app"   # si Blender n'est pas trouvé
```

- `tests/run.py` : lanceur (unittest). `tests/helpers.py` : outils communs.
- Chaque test part du fichier de démarrage d'usine (`read_homefile(use_factory_startup=True)`).
- En arrière-plan, appeler les opérateurs avec `helpers.call(op, scene)` (contexte de scène).
- Données d'exemple : `tests/donnees/`.

## Construire le zip installable

```
npm run build:addon        # → dist/addon/storyboard_plans-<version>.zip
```
