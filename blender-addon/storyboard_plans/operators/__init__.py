# SPDX-License-Identifier: GPL-3.0-or-later
"""Opérateurs du plugin Storyboard."""

from . import navigation, plans, cameras, sound, export, check, neoscenar

classes = (navigation.classes + plans.classes + cameras.classes + sound.classes
           + export.classes + check.classes + neoscenar.classes)
