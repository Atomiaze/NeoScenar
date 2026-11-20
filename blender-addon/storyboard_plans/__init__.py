# SPDX-License-Identifier: GPL-3.0-or-later
"""Storyboard – Gestion des plans.

Aide au storyboard puis à la production d'un film d'animation dans un seul
fichier .blend : un plan = une scène, une scène de montage avec le Sequencer,
aller-retour entre les deux, suivi de production, son, animatique.
"""

import traceback

import bpy

from bpy.app.handlers import persistent

from . import keymaps, overlay, prefs, properties, ui, utils
from .operators import classes as operator_classes


@persistent
def on_load_post(_dummy):
    """Fichier ouvert : migration des statuts v1.0.0 et couleurs selon les préférences."""
    try:
        bpy.data.scenes
    except AttributeError:  # données restreintes pendant le démarrage
        return
    try:
        utils.migrate_statuses()
        utils.refresh_all_colors()
    except Exception:
        traceback.print_exc()


_tries = [0]


def _deferred_init():
    _tries[0] += 1
    if prefs.ensure_defaults() or _tries[0] > 20:
        on_load_post(None)
        return None
    return 0.5


# ---------------------------------------------------------------------------
# Synchronisation automatique des durées (timer léger)
# ---------------------------------------------------------------------------

SYNC_INTERVAL = 0.5


def _is_busy():
    wm = bpy.context.window_manager
    if wm is None:
        return True
    for win in wm.windows:
        screen = win.screen
        if screen is not None and screen.is_animation_playing:
            return True
        # glissement de poignée en cours (opérateur modal) : on attend la fin
        if len(win.modal_operators):
            return True
    return False


def sync_timer():
    try:
        edit = utils.get_edit_scene()
        if edit is None or edit.sequence_editor is None or not edit.sb_settings.auto_sync:
            return SYNC_INTERVAL
        todo = [s for s in utils.plan_strips(edit) if utils.strip_needs_sync(s)]
        if todo and not _is_busy():
            for s in todo:
                try:
                    utils.sync_strip_to_plan(edit, s)
                except utils.SBError as e:
                    print("Storyboard :", e)
            utils.tag_redraw()
    except Exception:  # un timer ne doit jamais casser Blender
        traceback.print_exc()
    return SYNC_INTERVAL


classes = prefs.classes + operator_classes + ui.classes


def register():
    properties.register()
    for c in classes:
        bpy.utils.register_class(c)
    keymaps.register()
    overlay.register()
    if on_load_post not in bpy.app.handlers.load_post:
        bpy.app.handlers.load_post.append(on_load_post)
    if not prefs.ensure_defaults():
        bpy.app.timers.register(_deferred_init, first_interval=0.1)
    on_load_post(None)
    if not bpy.app.timers.is_registered(sync_timer):
        bpy.app.timers.register(sync_timer, first_interval=SYNC_INTERVAL, persistent=True)


def unregister():
    if bpy.app.timers.is_registered(sync_timer):
        bpy.app.timers.unregister(sync_timer)
    if bpy.app.timers.is_registered(_deferred_init):
        bpy.app.timers.unregister(_deferred_init)
    if on_load_post in bpy.app.handlers.load_post:
        bpy.app.handlers.load_post.remove(on_load_post)
    overlay.unregister()
    keymaps.unregister()
    for c in reversed(classes):
        bpy.utils.unregister_class(c)
    properties.unregister()
    utils.free_icons()
