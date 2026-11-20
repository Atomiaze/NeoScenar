# Format d'échange NeoScenar → Blender (version 1)

Document de référence partagé par l'étape 5a (NeoScenar écrit le paquet) et l'étape 5b (le plugin Blender le lit). Toute modification de ce format doit être faite ici d'abord, puis des deux côtés.

## Emplacement du paquet

```
Mon_Film/neoscenar/blender/export/
├── decoupage.json
└── vignettes/
    ├── S_0010_P_0010.png
    └── …
```

Le dossier `export/` est entièrement régénéré à chaque export (écriture dans un dossier temporaire, puis remplacement). Les vignettes y sont des copies, nommées d'après l'identifiant complet du plan.

## `decoupage.json`

```json
{
  "format": "neoscenar-blender",
  "formatVersion": 1,
  "exportedAt": "2026-11-18T10:00:00Z",
  "neoscenarVersion": "0.5.0",
  "project": { "id": "uuid", "title": "Mon Film d'été", "folderName": "Mon_Film_d_ete" },
  "settings": { "width": 1920, "height": 1080, "fps": 25 },
  "numbersLocked": true,
  "targetBlend": "../../../06_Blender/Storyboard/Mon_Film_d_ete_storyboard.blend",
  "scenes": [
    {
      "id": "uuid",
      "label": "S_0010",
      "number": 10,
      "letter": "",
      "name": "Le réveil",
      "heading": "INT. CHAMBRE - JOUR",
      "color": "#AECBFA",
      "shots": [
        {
          "id": "uuid",
          "label": "P_0010",
          "fullLabel": "S_0010_P_0010",
          "number": 10,
          "letter": "",
          "name": "Le réveil sonne",
          "durationSeconds": 3.5,
          "durationFrames": 88,
          "scale": "Gros plan",
          "movement": "Plan fixe",
          "angle": "Plongée",
          "sounds": "Sonnerie du réveil",
          "music": "",
          "description": "Le réveil sur la table de nuit…",
          "color": null,
          "thumbnail": "vignettes/S_0010_P_0010.png"
        }
      ]
    }
  ]
}
```

## Règles

- Encodage UTF-8. Tous les chemins sont **relatifs au fichier `decoupage.json`**, avec `/` comme séparateur.
- `scenes` et `shots` sont dans **l'ordre du film**.
- `label` : `S_0010`, `P_0010`, `P_0010A` ; `fullLabel` : `S_0010_P_0010` ou `S_0010_P_0010A`. Ce sont les noms utilisés dans Blender.
- `durationFrames` = `durationSeconds × fps` arrondi à l'entier le plus proche, au minimum 1 ; les deux valent `null` si le plan n'a pas de durée (Blender utilise alors sa durée par défaut).
- Champs texte vides : chaîne vide `""`, jamais absents. `color` : `"#RRGGBB"` ou `null`. `thumbnail` : chemin relatif ou `null`.
- `targetBlend` : fichier .blend à créer, choisi dans NeoScenar.
- Un lecteur qui rencontre un `formatVersion` supérieur à celui qu'il connaît refuse le fichier avec un message clair.
