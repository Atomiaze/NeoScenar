# NeoScenar

NeoScenar est une application de bureau gratuite et libre pour écrire des scénarios, pensée pour les étudiants en audio-visuel de l’IES Saint-Luc Liège.
Elle fonctionne entièrement sur l’ordinateur, sans compte ni connexion, et ajoutera au scénario le découpage technique, le storyboard et l’export vers Blender.

## Installation

Pour l’instant, NeoScenar est disponible **sur Mac seulement** (Intel et Apple Silicon) : téléchargez le fichier `NeoScenar-…-mac.dmg` dans la page des Releases, puis suivez la section « Ouvrir NeoScenar sur Mac » ci-dessous.

Windows et Linux : plus tard.

## Prérequis

- [Node.js](https://nodejs.org/fr) en version LTS (24 ou plus récente)
- [Git](https://git-scm.com/)

## Commandes

À taper dans un terminal, depuis le dossier du projet :

| Commande            | Effet                                                          |
| ------------------- | -------------------------------------------------------------- |
| `npm install`       | Installe les dépendances (à faire une seule fois au départ).   |
| `npm run dev`       | Lance l’application en mode développement.                     |
| `npm test`          | Lance tous les tests (application et module Fountain).         |
| `npm run lint`      | Vérifie le code (ESLint, TypeScript, mise en forme).           |
| `npm run format`    | Remet en forme automatiquement le code.                        |
| `npm run build:mac` | Construit l’installeur Mac (`dist/NeoScenar-…-universal.dmg`). |

L’installeur Mac fonctionne sur les Mac Intel et Apple Silicon.

## Ouvrir NeoScenar sur Mac (application non signée)

NeoScenar n’est pas signée par Apple. Au premier lancement, macOS refuse de l’ouvrir. Pour l’autoriser, une seule fois :

1. Ouvrez le fichier `.dmg` et glissez **NeoScenar** dans le dossier **Applications**.
2. Dans **Applications**, faites un **clic droit** (ou Ctrl + clic) sur NeoScenar, puis choisissez **Ouvrir**, puis confirmez **Ouvrir**.
3. Si macOS ne propose pas ce bouton : ouvrez **Réglages Système > Confidentialité et sécurité**, descendez jusqu’au message concernant NeoScenar et cliquez sur **Ouvrir quand même**.

Les lancements suivants se font normalement.

## Licence

NeoScenar est un logiciel libre distribué sous licence [GNU GPL version 3 ou ultérieure](LICENSE).
