# SPDX-License-Identifier: GPL-3.0-or-later
"""Lance les tests de l'extension dans Blender 4.5, en arrière-plan.

    blender -b --factory-startup --python-exit-code 1 --python blender-addon/tests/run.py
    (ou : npm run test:addon)

L'extension est chargée depuis le dossier du dépôt, pas depuis celle installée dans Blender.
"""

import os
import sys
import unittest

TESTS_DIR = os.path.dirname(os.path.abspath(__file__))
ADDON_PARENT = os.path.dirname(TESTS_DIR)

for path in (ADDON_PARENT, TESTS_DIR):
    if path not in sys.path:
        sys.path.insert(0, path)

import storyboard_plans  # noqa: E402

storyboard_plans.register()

suite = unittest.defaultTestLoader.discover(TESTS_DIR, pattern="test_*.py")
result = unittest.TextTestRunner(verbosity=2).run(suite)
if not result.wasSuccessful():
    # --python-exit-code 1 : Blender quitte avec le code 1 si le script lève une exception
    raise SystemExit("Des tests de l'extension ont échoué.")
