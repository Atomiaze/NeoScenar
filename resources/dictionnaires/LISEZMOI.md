# Dictionnaire français du correcteur orthographique

`fr-FR-3-0.bdic` est le dictionnaire français utilisé par NeoScenar sous Windows et Linux, sans aucun
accès réseau. Sur Mac, NeoScenar utilise le correcteur du système et ce fichier ne sert pas.

## Source

- Fichier : `fr-FR-3-0.bdic` (format binaire de Chromium, produit par l'outil `convert_dict` de
  Chromium à partir des fichiers Hunspell `fr_FR.aff` et `fr_FR.dic`).
- Dépôt : https://chromium.googlesource.com/chromium/deps/hunspell_dictionaries
  (dernière version de ce fichier : commit `62e19ad256c9b53f5f7e4c67e2e9779c4cc3ac40` du
  27 décembre 2012 ; présent sous ce nom jusqu'au commit `cee14e319bb7603a1157bb4d1e216be64ee82b77`).
- Les fichiers sources `fr_FR.aff` et `fr_FR.dic` se trouvent dans ce même dépôt et ce même commit.
- Téléchargé le 20 novembre 2026 depuis `https://redirector.gvt1.com/edgedl/chrome/dict/fr-fr-3-0.bdic`
  (serveur de dictionnaires de Chromium) : identique octet pour octet au fichier du dépôt ci-dessus.
- SHA-256 : `6cffc13b549c33d44180a3a7b13943fe0eadfbe80bcdbccc76f67c55c2012968`
- Nom de fichier : celui qu'attend Chromium 156 (Electron 45). Si une nouvelle version d'Electron
  attend un autre nom (par exemple `fr-FR-3-1.bdic`), il faudra changer ce fichier et la constante
  `DICTIONARY_FILE` de `src/main/spellcheckDictionary.ts`.

## Licence

Mention recopiée telle quelle du fichier `README_fr_FR.txt` du dépôt (commit ci-dessus) :

```
   DICTIONNAIRES ORTHOGRAPHIQUES FRANÇAIS
   version 4.8

   Olivier R. - dicollecte<at>free<dot>fr
   Dicollecte : http://www.dicollecte.org/

   Licence :
   * MPL : Mozilla Public License
     version 2.0  --  http://www.mozilla.org/MPL/2.0/
```

En-tête recopié tel quel du fichier `fr_FR.aff` du même commit :

```
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

# AFFIXES DU DICTIONNAIRE ORTHOGRAPHIQUE FRANÇAIS «MODERNE» v4.8
# par Olivier R. -- licence MPL 2.0
```

Le texte complet de la licence MPL 2.0 est dans `LICENCE-MPL-2.0.txt` (copie de
https://www.mozilla.org/media/MPL/2.0/index.txt). La MPL 2.0 est compatible avec la GPL-3.0 de
NeoScenar : le dictionnaire n'est pas marqué « Incompatible With Secondary Licenses ».
