# SPDX-License-Identifier: GPL-3.0-or-later
"""Outils communs aux tests : fichier neuf, projet storyboard minimal, appels d'opérateurs."""

import unittest

import bpy

from storyboard_plans import utils

TEMPLATE_FRAMES = 48


def new_file():
    """Fichier neuf (fichier de démarrage d'usine : Cube, Light, Camera).
    Sans use_factory_startup, Blender en arrière-plan charge un fichier vide."""
    bpy.ops.wm.read_homefile(use_factory_startup=True)
    return bpy.context.scene


def call(op, scene, **kwargs):
    """Appelle un opérateur comme depuis cette scène ; renvoie son résultat."""
    with bpy.context.temp_override(scene=scene):
        return op(**kwargs)


def make_project(plans=0):
    """Scène modèle « Scene » (48 images), scène de montage, puis `plans` plans."""
    template = new_file()
    template.frame_start = 1
    template.frame_end = TEMPLATE_FRAMES
    assert call(bpy.ops.sb.create_edit_scene, template, template=template.name) == {'FINISHED'}
    edit = utils.get_edit_scene()
    for _ in range(plans):
        assert call(bpy.ops.sb.new_plan, edit) == {'FINISHED'}
    return edit


def make_neoscenar_project(names):
    """Projet en mode NeoScenar : un plan par nom, dans l'ordre du montage."""
    edit = make_project()
    edit.sb_settings.naming_mode = utils.NAMING_NEOSCENAR
    for name in names:
        scene = utils.create_plan_scene(bpy.context, edit, name)
        utils.add_plan_strip(edit, scene, utils.plans_end(edit))
    return edit


def strip_names(edit):
    return [s.name for s in utils.plan_strips(edit)]


def plan_names():
    return sorted(s.name for s in bpy.data.scenes if utils.is_plan(s))


def select_strip(edit, name):
    strip = edit.sequence_editor.strips[name]
    utils.select_only(edit, strip)
    return strip


class BlenderTestCase(unittest.TestCase):
    """Chaque test part d'un fichier neuf."""

    def setUp(self):
        new_file()
